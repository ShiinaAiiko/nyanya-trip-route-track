import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'

import Leaflet from 'leaflet'
import { protoRoot, ForEachLongToNumber } from '../protos'
import { formatPositionsStr, getDistance } from '../plugins/methods'
import { eventListener, R, TabsTripType } from './config'
import { httpApi } from '../plugins/http/api'
import store, { layoutSlice, methods, tripSlice } from '.'
import { isLinearGradient } from 'html2canvas/dist/types/css/types/image'
import i18n from '../plugins/i18n/i18n'
import { snackbar } from '@saki-ui/core'
import { AsyncQueue, Debounce, deepCopy } from '@nyanyajs/utils'
import { t } from 'i18next'
import { toolApiUrl } from '../config'


export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export type GeoJSON = GeoJSONPolygon | GeoJSONMultiPolygon;

interface Address {
  town: string;
  city: string;
  state: string;
  'ISO3166-2-lvl4': string;
  country: string;
  country_code: string;
}

interface ReverseGeocode {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  address: Address;
  boundingbox: string[];
  geojson: GeoJSON;
}


const modelName = 'city'


export const state = {

  cityInfo: {
    country: "",
    state: "",
    region: "",
    city: "",
    town: "",
    road: "",
    address: ""
  }
}



const cityMarkerMap: {
  [key: string]: {
    [id: string]: Leaflet.Marker<any>
  }
} = {}

export const deleteCityMarker = (cityId: string, key: string) => {
  let marker = cityMarkerMap?.[key]?.[cityId]
  if (!marker) return

  marker?.remove()
  delete cityMarkerMap[key][cityId]
}
export const deleteAllCityMarker = (key: string) => {

  cityMarkerMap?.[key] && Object.keys(cityMarkerMap?.[key]).forEach(k => {
    deleteCityMarker(k, key)
  })

  delete cityMarkerMap?.[key]
}

export const createCityMarker = (map: Leaflet.Map, cityName: string, [lat, lng]: number[], level: number, cityId: string, key: string) => {
  let marker = cityMarkerMap?.[key]?.[cityId]
  if (marker) return marker

  const L: typeof Leaflet = (window as any).L

  let iconSize = 10
  if (level === 4) {
    iconSize = 11
  }
  if (level === 3) {
    iconSize = 13
  }
  if (level === 2) {
    iconSize = 15
  }
  if (level === 1) {
    iconSize = 16
  }

  marker = L.marker([lat, lng], {
    icon: L.divIcon({
      html: `<div class='map-city-marker-wrap h${level}'>
        <span class="h${level}">${cityName}</span>
      </div>`,
      className:
        'map-city-marker ',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    }),
  })
    .addTo(map)
    .openPopup()

  if (!cityMarkerMap[key]) {
    cityMarkerMap[key] = {}
  }

  cityMarkerMap[key][cityId] = marker

  return marker
}

const cityGeojsonMap: {
  [key: string]: {
    [id: string]: Leaflet.GeoJSON<any, any>
  }
} = {}
export const deleteCityGeojsonMap = (cityId: string, key: string) => {
  let marker = cityGeojsonMap?.[key]?.[cityId]
  if (!marker) return

  marker?.remove()
  delete cityGeojsonMap[key][cityId]
}
export const deleteAllCityGeojsonMap = (key: string) => {

  cityGeojsonMap?.[key] && Object.keys(cityGeojsonMap?.[key]).forEach(k => {
    deleteCityGeojsonMap(k, key)
  })

  delete cityGeojsonMap?.[key]
}
export const createCityBoundaries = (map: Leaflet.Map, cityGeojson: GeoJSON, cityId: string, key: string) => {
  let geojson = cityGeojsonMap?.[key]?.[cityId]
  console.log("tempCityBoundaries", geojson)
  if (geojson) return geojson


  const L: typeof Leaflet = (window as any).L

  const boundaryData: any = {
    type: "Feature",
    geometry: cityGeojson,
    properties: {
      name: "茶山竹海街道",
    },
  };

  // 使用 L.geoJSON 添加边界到地图
  geojson = L.geoJSON(boundaryData, {
    style: {
      color: "#f29cb2", // 边界颜色
      weight: 2,        // 边界粗细
      opacity: 0.65,    // 透明度
      fillColor: "#f29cb2", // 填充颜色
      fillOpacity: 0.05,     // 填充透明度
    },
  }).addTo(map);


  if (!cityGeojsonMap[key]) {
    cityGeojsonMap[key] = {}
  }

  cityGeojsonMap[key][cityId] = geojson

  return geojson
}


const getFullCities = (cities: protoRoot.city.ICityItem[], id: string) => {
  let cCities = cities.filter(v => v.id === id)

  if (cCities?.[0]?.parentCityId) {
    cCities = getFullCities(cities, cCities?.[0]?.parentCityId).concat(cCities)
  }

  // console.log("cRes2", cCities)

  return cCities

}


const asyncQueue = new AsyncQueue()

export const initTripCity = async (trip: protoRoot.trip.ITrip) => {

  let nextPosTime = 0
  let count = 1

  trip.positions?.forEach(v => {

    if (Number(v.timestamp) > nextPosTime) {
      // console.log('initCity', count, v.latitude, v.timestamp)
      nextPosTime = Number(v.timestamp) + 120
      count++


      asyncQueue.increase(async () => {

        const lat = v.latitude
        const lng = v.longitude

        const res = await R.request({
          method: "GET",
          url:
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            toolApiUrl + `/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}`
          // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`
        })
        const data = res?.data?.data as any
        console.log("initCity cityinfo", data)
        if (!data?.country || res?.data?.code !== 200) return
        let newCi = {
          country: data.country,
          state: data.state,
          region: data.region,
          city: data.city,
          town: data.town,
          road: data.road,
          address: [data.country, data.state, data.region, data.city, data.town].filter(v => v).join("·")
        }

        // console.log('initCity', count, v.latitude, v.timestamp)
        const nres = await httpApi.v1.UpdateCity({
          tripId: trip.id,
          // tripId: trip?.id || 'wKod7r4LS',
          city: {
            country: newCi.country,
            state: newCi.state,
            region: newCi.region,
            city: newCi.city,
            town: newCi.town,
            address: newCi.address,
          },
          entryTime: v.timestamp,
        })
        console.log('initCity', nres, newCi)
        if (nres.code === 200) {
        }
      }, "initTripCity")

    }
  })

  console.log('initCity', trip.positions)
}

export const citySlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setCityInfo: (
      state,
      params: {
        payload: (typeof state.cityInfo)
        type: string
      }
    ) => {
      state.cityInfo = params.payload
    },
  },
})



export const cityMethods = {
  GetCity: createAsyncThunk(modelName + '/GetCity', async (
    { lat, lng, zoom, customGPS = false }: {
      lat: number
      lng: number
      zoom?: number
      customGPS?: boolean
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    const t = i18n.t


    zoom = (!zoom ? 14 : zoom)

    try {
      console.log("GetCity", lat, lng)

      // lat = 29.411715
      // lon = 105.615387
      const res = await R.request({
        method: "GET",
        url:
          // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
          // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
          // `https://nominatim.aiiko.club/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&accept-language=zh-CN`,
          toolApiUrl + `/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`
        // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lon}&platform=Amap`
      })
      if (!res?.data) {
        return
      }
      // const data: ReverseGeocode = res.data as any
      // if (!((data.addresstype === "town" && data.name.lastIndexOf("镇") === data.name.length - 1) || (data.addresstype === "suburb" && data.name.lastIndexOf("街道") === data.name.length - 2)) && zoom > 12) {
      //   dispatch(
      //     methods.city.GetCity({
      //       lat: lat,
      //       lng: lng,
      //       zoom: zoom - 1
      //     })
      //   )
      //   return
      // }
      const data = res.data.data as any
      console.log("GetCity", data,)
      if (!data?.country || res?.data?.code !== 200) return
      const { city, config, user } = store.getState()
      let ci: typeof state.cityInfo = {
        ...city.cityInfo,
      }
      let newCi = {
        country: data.country,
        state: data.state,
        region: data.region,
        city: data.city,
        town: data.town,
        road: data.road,
        address: [data.country, data.state, data.region, data.city, data.town].filter(v => v).join("·")
      }


      if (!customGPS) {

        // 不包括国家
        let msg = ""
        if (ci.state && newCi.state && newCi.state !== ci.state) {
          msg = `${newCi.state}·${newCi.region || newCi.city} `
        } else if (ci.region && newCi.region && newCi.region !== ci.region) {
          msg = `${newCi.region || newCi.state}·${newCi.city} `
        } else if (
          (ci.city && newCi.city && newCi.city !== ci.city)
          ||
          (ci.town && newCi.town && newCi.town !== ci.town)) {
          msg = `${newCi.city}·${newCi.town} `
        }

        // msg = "贵州省安顺市镇宁布依族苗族自治县黄果树瀑布景区"

        // 缺乏i18n
        if (msg) {
          const text = `祝贺汝喵进入「${msg}」！`
          const msgSnackbar = snackbar({
            message: text,
            vertical: 'center',
            horizontal: 'center',
            backgroundColor: 'var(--saki-default-color)',
            color: '#fff',
            autoHideDuration: 12000,
          })

          msgSnackbar.open();

          (window as any).responsiveVoice.speak(
            text,
            'Chinese Female', // 中文女声
            {
              pitch: 1, // 音调
              rate: 1, // 语速
              volume: 2, // 音量
              onend: () => {
                msgSnackbar.close();
                console.log('播放完成！')
              },
            }
          )


          if ("speechSynthesis" in window) {
            // 清空队列
            window.speechSynthesis.cancel();

            // 创建语音对象
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "zh-TW";
            utterance.pitch = 1;
            utterance.rate = 1;

            // 等待语音加载
            window.speechSynthesis.onvoiceschanged = () => {
              const voices = window.speechSynthesis.getVoices();
              utterance.voice = voices.find(voice => voice.lang === "zh-TW") ||
                voices.find(voice => voice.lang.startsWith("zh")) ||
                voices[0]; // 回退到第一个可用语音
            };

            // 添加事件监听
            utterance.addEventListener("end", () => {
              console.log("Speech synthesis finished.");
              msgSnackbar.close();
            });
            utterance.addEventListener("error", (err) => {
              console.error("Speech synthesis error:", err);
            });

            // 开始播放
            if (window.speechSynthesis.speaking) {
              console.warn("Speech synthesis is already speaking. Cancelling...");
              window.speechSynthesis.cancel();
            }
            window.speechSynthesis.speak(utterance);
          } else {
            console.error("Sorry, your browser does not support speech synthesis.");
          }
        }

      }



      console.log("GetCityData", data, ci)



      dispatch(
        citySlice.actions.setCityInfo({
          ...ci,
          ...newCi
        })
      )



    } catch (error) {
      console.error(error)
    }
  }),
  GetCityDetails: createAsyncThunk(modelName + '/GetCityDetails', async (
    { trip }: {
      trip: protoRoot.trip.ITrip
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    try {

      const ids = trip?.cities?.map(v => v.cityId || "") || []

      if (!ids.length) return trip.cities

      const cRes = await httpApi.v1.GetCityDetails({
        ids
      })
      console.log("cRes", cRes)
      if (cRes.code === 200) {
        // const promiseAll: any[] = []
        // ids?.forEach(v => {

        //   trip.cities?.some(sv => {
        //     if (v === sv.cityId) {

        //       return true
        //     }
        //   })
        //   // const fullCities = getFullCities(cRes.data?.cities || [], v || "")
        //   // promiseAll.push(storage.cityDetails.set(v, {
        //   //   cityDetails: fullCities,
        //   //   city: fullCities.filter((_, i) => i >= 1).map(v => v.name?.["zhCN"] || "").join("·"),
        //   //   cityId: v
        //   // }))
        // })

        // await Promise.all(promiseAll)


        trip.cities?.forEach(v => {

          const fullCities = getFullCities(cRes.data?.cities || [], v.cityId || "")

          v.city = fullCities.filter((_, i) => i >= 1).map(v => v.name?.["zhCN"] || "").join("·")

          v.cityDetails = fullCities


          // const cityInfo = storage.cityDetails.getSync(v.cityId || "")
          // // console.log("cityInfo", cityInfo, v.cityId, res.data?.trip?.cities)
          // if (cityInfo) {
          //   v.city = cityInfo.city
          //   v.cityDetails = cityInfo.cityDetails
          // }
        })
        // dispatch(tripSlice.actions.setTripForDetailPage(tripDetail))

      }
      return trip.cities
    } catch (error) {
      console.error(error)
    }

  }),
  GetCityBoundaries: createAsyncThunk(modelName + '/GetCityBoundaries', async (
    { cities }: {
      cities?: protoRoot.trip.ITripCity[]
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    try {

      const tempCities = [...new Set(cities?.map(v => {
        return {
          name: v.cityDetails?.filter(sv => Number(sv.level) <= 4).map(sv => sv.name?.zhCN).join(","),
          id: v.cityId
        }
      }))]

      console.log("GetCityBoundaries", tempCities)

      const cityBoundaries: {
        cityId: string,
        geojson: GeoJSON

      }[] = []


      for (let i = 0; i < tempCities.length; i++) {
        const res = await R.request({
          method: "GET",
          url:
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            `https://nominatim.aiiko.club/search?q=${tempCities[i].name
            }&format=jsonv2&addressdetails=1&polygon_geojson=1&accept-language=zh-CN`,
          // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lon}&platform=Amap`
        })

        const data: ReverseGeocode[] = res.data as any

        const geojson = data.filter(v => v.geojson.type === "Polygon" || v.geojson.type === "MultiPolygon")?.[0]

        console.log("GetCityBoundaries", geojson.geojson, tempCities[i])

        cityBoundaries.push({
          cityId: tempCities[i].id || "",
          geojson: geojson.geojson
        })

      }
      return cityBoundaries
    } catch (error) {
      console.error(error)
      return []
    }

  }),
}
