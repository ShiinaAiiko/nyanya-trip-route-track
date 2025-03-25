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
import { Debounce, AsyncQueue, deepCopy } from '@nyanyajs/utils'
import { t } from 'i18next'
import { nominatimUrl, toolApiUrl } from '../config'

// import { AsyncQueue } from "./asyncQueue";



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
  cities: [] as protoRoot.city.ICityItem[],
  cityInfo: {
    country: "",
    state: "",
    region: "",
    city: "",
    town: "",
    road: "",
    address: "",
    lat: 0,
    lng: 0
  }
}


export const ethnicReg = /傣族|布朗族|独龙族|佤族|怒族|景颇族|普米族|德昂族|拉祜族|阿昌族|纳西族|哈尼族|藏族|蒙古族|回族|维吾尔族|壮族|苗族|彝族|布依族|朝鲜族|满族|侗族|瑶族|白族|土家族|哈萨克族|黎族|傈僳族|东乡族|仡佬族|拉祜族|佤族|水族|土族|羌族|达斡尔族|仫佬族|锡伯族|柯尔克孜族|景颇族|撒拉族|布朗族|毛南族|塔吉克族|普米族|阿昌族|怒族|乌孜别克族|俄罗斯族|鄂温克族|崩龙族|裕固族|保安族|京族|独龙族|赫哲族|高山族/g

export const ethnicZHTWReg = /傣族|布朗族|獨龍族|佤族|怒族|景頗族|普米族|德昂族|拉祜族|阿昌族|納西族|哈尼族|藏族|蒙古族|回族|維吾爾族|壯族|苗族|彝族|布依族|朝鮮族|滿族|侗族|瑤族|白族|土家族|哈薩克族|黎族|傈僳族|東鄉族|仡佬族|拉祜族|佤族|水族|土族|羌族|達斡爾族|仫佬族|錫伯族|柯爾克孜族|景頗族|撒拉族|布朗族|毛南族|塔吉克族|普米族|阿昌族|怒族|烏孜別克族|俄羅斯族|鄂溫克族|崩龍族|裕固族|保安族|京族|獨龍族|赫哲族|高山族/g
export const cityType = /省|自治区|直辖市|特别行政区|市|自治州|盟|地区|县|自治县|旗|自治旗|特区|林区|区|镇|乡|街道|村|社区/g
export const cityZHTWType = /省|自治區|直轄市|特別行政區|市|自治州|盟|地區|縣|自治縣|旗|自治旗|特區|林區|區|鎮|鄉|街道|村|社區/g

export const ethnicGroups = [
  "蒙古族", "回族", "藏族", "维吾尔族", "苗族", "彝族", "壮族", "布依族",
  "朝鲜族", "满族", "侗族", "瑶族", "白族", "土家族", "哈尼族", "哈萨克族",
  "傣族", "黎族", "傈僳族", "佤族", "畲族", "高山族", "拉祜族", "水族",
  "东乡族", "纳西族", "景颇族", "柯尔克孜族", "土族", "达斡尔族", "仫佬族",
  "羌族", "布朗族", "撒拉族", "毛南族", "仡佬族", "锡伯族", "阿昌族", "普米族",
  "塔吉克族", "怒族", "乌孜别克族", "俄罗斯族", "鄂温克族", "德昂族", "保安族",
  "裕固族", "京族", "塔塔尔族", "独龙族", "鄂伦春族", "赫哲族", "门巴族",
  "珞巴族", "基诺族"
];

export const getSimpleCityName = (cityName: string, type: string) => {


  cityName = cityName?.replace(ethnicReg, '')
    ?.replace(ethnicZHTWReg, '')

  if (type === 'city') {
    cityName = cityName?.replace(
      /(?<=..)(自治县|县|市|旗|自治旗|区|新区)/,
      ''
    )?.replace(
      /(?<=..)(自治縣|縣|市|旗|自治旗|區|新區)/,
      ''
    )
  }
  if (type === 'town') {
    cityName = cityName?.replace(/镇|街道/g, '')
      ?.replace(/鎮|街道/g, '')
  }
  if (type === 'state' || type === 'region') {
    cityName = cityName?.replace(cityType, '')
      ?.replace(cityZHTWType, '')
  }

  return cityName
}


import area from '@turf/area';

export const calculateArea = (boundary: GeoJSON): number => {
  // 使用 @turf/area 计算面积（返回平方米）
  const areaInSquareMeters = area(boundary);
  // 转换为平方公里
  const areaInSquareKilometers = areaInSquareMeters / 1_000_000;
  return Number(areaInSquareKilometers.toFixed(2)); // 保留两位小数
};

export const getAllCityAreas = (cityBoundaries: GeoJSON[]): number => {
  let cityArea = 0
  cityBoundaries.forEach((city) => {
    cityArea += calculateArea(city);
  });
  return cityArea
};


const cityMarkerMap: {
  [key: string]: {
    [id: string]: Leaflet.Marker<any>
  }
} = {}

export const convertCityLevelToTypeString = (level: number) => {
  if (level === 1) {
    return "country"
  } else if (level === 2) {
    return "state"
  } else if (level === 3) {
    return "region"
  } else if (level === 4) {
    return "city"
  } else {
    return "town"
  }
}

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


export interface CityInfo {
  id: string
  name: string
  lat: number
  lng: number
  coordinates: number[],
  level: number
  levelStr: string
  parentCityId: string
  parentCity?: CityInfo
}

const levelMap: { [key: number]: string[] } = {
  0: ['country'],
  4: ['state'],
  5: ['region'],
  9: ['region', 'city'],
  11: ['region', 'city', 'town'],
}

function isInSameHierarchy(
  city1: CityInfo,
  city2: CityInfo,
  allCities: CityInfo[]
): boolean {
  // console.log(
  // 	`检查层级关系：${city1.name} (${city1.id}) 和 ${city2.name} (${city2.id})`
  // )
  let current = city1
  while (current.parentCityId) {
    if (current.parentCityId === city2.id) {
      // console.log(`${city1.name} 的父级是 ${city2.name}`)
      return true
    }
    current = allCities.find((c) => c.id === current.parentCityId) || current
    if (current === city1) break
  }
  current = city2
  while (current.parentCityId) {
    if (current.parentCityId === city1.id) {
      // console.log(`${city2.name} 的父级是 ${city1.name}`)
      return true
    }
    current = allCities.find((c) => c.id === current.parentCityId) || current
    if (current === city2) break
  }
  // console.log(`${city1.name} 和 ${city2.name} 不在同一层级链`)
  return false
}

export const formartCities = (cities: protoRoot.city.ICityItem[]) => {
  const citiesArr =
    cities.map((v): CityInfo => {
      return {
        id: v.id || '',
        name: getSimpleCityName(
          getCityName(v.name) || '',
          convertCityLevelToTypeString(v.level || 1)
        ),
        lat: v.coords?.latitude || 0,
        lng: v.coords?.longitude || 0,
        coordinates: [v.coords?.latitude || 0, v.coords?.longitude || 0],
        level: v.level || 0,
        levelStr: convertCityLevelToTypeString(v.level || 1),
        parentCityId: v.parentCityId || '',
      }
    })

  // 直辖市单独处理
  cities.forEach(v => {
    if (v.level === 2 && v.cities?.[0]?.level === 4) {
      // console.log("ucm 直辖市单独处理", v)

      citiesArr.unshift({
        id: v.id || '',
        name: getSimpleCityName(
          getCityName(v.name) || '',
          convertCityLevelToTypeString(v.level || 1)
        ),
        lat: v.coords?.latitude || 0,
        lng: v.coords?.longitude || 0,
        coordinates: [v.coords?.latitude || 0, v.coords?.longitude || 0],
        level: v.level || 0,
        levelStr: convertCityLevelToTypeString(v.level + 1 || 1),
        parentCityId: v.parentCityId || '',
      })
    }
  })

  citiesArr.forEach((v) => {
    if (v.parentCityId) {
      v.parentCity = citiesArr.filter(
        (sv) => sv.id === v.parentCityId
      )?.[0]
    }
  })

  return citiesArr
}


export function updateCityMarkers(map: Leaflet.Map, citiesArr: CityInfo[], zoom: number) {
  if (!map) return

  // console.log("ucm updateCityMarkers", citiesArr, zoom)

  // 移除不在视图内的标记


  let displayLevels: string[] = []
  for (const [zoomLevel, levels] of Object.entries(levelMap)) {
    if (zoom >= parseInt(zoomLevel)) {
      displayLevels = levels
    } else {
      break
    }
  }
  // console.log(`ucm 当前 zoom=${zoom}, 显示级别：${displayLevels.join(', ')}`)

  const citiesToDisplay: CityInfo[] = []
  const addedNames = new Set<string>()


  // console.log(
  //   `ucm 需要显示的城市`, deepCopy(citiesToDisplay)
  // )

  citiesArr.forEach((city) => {
    if (!displayLevels.includes(city.levelStr)) {
      return
    }
    // console.log('ucm', displayLevels.includes(city.levelStr), city.name)
    if (!addedNames.has(city.name)) {
      citiesToDisplay.push(city)
      addedNames.add(city.name)
    }
    let parentId = city.parentCityId
    while (parentId) {
      const parentCity = citiesArr.find((c) => c.id === parentId)
      if (displayLevels.includes(parentCity?.levelStr || "") &&
        parentCity && !addedNames.has(parentCity.name)) {
        citiesToDisplay.push(parentCity)
        addedNames.add(parentCity.name)
      }
      parentId = parentCity?.parentCityId || ''
    }
  })
  // console.log(
  //   `ucm 需要显示的城市`, deepCopy(citiesToDisplay)
  // )

  // 网格过滤：初步分组
  const gridSize = 1 / Math.pow(2, zoom - 5) // 调整网格大小
  const grid: { [key: string]: CityInfo[] } = {}
  citiesToDisplay.forEach((city) => {
    const [lat, lng] = city.coordinates
    const gridKey = `${Math.floor(lat / gridSize)}-${Math.floor(
      lng / gridSize
    )}`
    if (!grid[gridKey]) {
      grid[gridKey] = []
    }
    grid[gridKey].push(city)
    // console.log(`城市 ${city.name} (${city.levelStr}) 分配到网格 ${gridKey}`)
  })

  // 网格内过滤：保留不在同一层级链的多个城市
  const filteredGrid: { [key: string]: CityInfo[] } = {} // 改为数组

  // console.log("ucm filteredGrid grid", deepCopy(grid))
  // console.log("ucm filteredGrid", deepCopy(filteredGrid))


  for (const gridKey in grid) {
    const gridCities = grid[gridKey]
    // console.log(
    // 	`网格 ${gridKey} 包含城市数量：${gridCities.length}, 城市：${gridCities
    // 		.map((c) => `${c.name} (${c.levelStr})`)
    // 		.join(', ')}`
    // )

    if (gridCities.length === 1) {
      filteredGrid[gridKey] = [gridCities[0]]
      // console.log(
      // 	`网格 ${gridKey} 只有 1 个城市，选择：${gridCities[0].name}`
      // )
    } else {
      // console.log(`网格 ${gridKey} 有多个城市，开始过滤...`)
      gridCities.sort(
        (a, b) =>
          levelPriority(a.levelStr, displayLevels) -
          levelPriority(b.levelStr, displayLevels)
      )
      const selectedCities: CityInfo[] = [gridCities[0]]
      // console.log(
      // 	`初始选择：${selectedCities[0].name} (${selectedCities[0].levelStr})`
      // )

      for (let i = 1; i < gridCities.length; i++) {
        const currentCity = gridCities[i]
        const isRelatedToAny = selectedCities.some((selected) =>
          isInSameHierarchy(selected, currentCity, citiesArr)
        )
        if (!isRelatedToAny) {
          selectedCities.push(currentCity)
          // console.log(
          // 	`添加 ${currentCity.name}，因为与已有城市不在同一层级链`
          // )
        } else {
          const currentPriority = levelPriority(
            currentCity.levelStr,
            displayLevels
          )
          const replaceIndex = selectedCities.findIndex(
            (selected) =>
              isInSameHierarchy(selected, currentCity, citiesArr) &&
              currentPriority <
              levelPriority(selected.levelStr, displayLevels)
          )
          if (replaceIndex !== -1) {
            // console.log(
            // 	`替换 ${selectedCities[replaceIndex].name} 为 ${currentCity.name}，因为优先级更低`
            // )
            selectedCities[replaceIndex] = currentCity
          } else {
            // console.log(`${currentCity.name} 被跳过，因优先级不优`)
          }
        }
      }
      filteredGrid[gridKey] = selectedCities
      // console.log(
      // 	`网格 ${gridKey} 最终选择：${selectedCities
      // 		.map((c) => `${c.name} (${c.levelStr})`)
      // 		.join(', ')}`
      // )
    }
  }


  // console.log("ucm filteredGrid", deepCopy(filteredGrid))

  // 屏幕像素距离过滤：避免标签重叠
  const minPixelDistance = 50 // 最小像素间距
  const finalCities: CityInfo[] = []
  const usedPositions: { x: number; y: number }[] = []
  Object.values(filteredGrid)
    .flat()
    .forEach((city) => {
      const L: typeof Leaflet = (window as any).L
      const point = map.latLngToLayerPoint(L.latLng(city.coordinates as any))
      const isTooClose = usedPositions.some((pos) => {
        const dx = point.x - pos.x
        const dy = point.y - pos.y
        return Math.sqrt(dx * dx + dy * dy) < minPixelDistance
      })
      // console.log('ucm filteredGrid foreach', city.name, point)
      if (!isTooClose) {
        finalCities.push(city)
        usedPositions.push({ x: point.x, y: point.y })
        // console.log(`保留 ${city.name}，屏幕坐标 (${point.x}, ${point.y})`)
      } else {
        // console.log(`移除 ${city.name}，因与已有标记太近`)
      }
    })

  // 清空并添加标记

  // 获取当前地图的边界
  const bounds = map.getBounds();

  finalCities.forEach((city) => {
    const L: typeof Leaflet = (window as any).L

    // console.log("finalCities1", markerCache[key][city.id])
    if (bounds.contains(city.coordinates as any)) {
      const marker = L.marker(city.coordinates as any, {
        icon: getIconByLevel(city),
      }).bindPopup(city.id + city.name)
      map.addLayer(marker)
    }
  })

  const ids = finalCities.map(v => v.id + v.name)
  // console.log(
  //   `ucm finalCities`, deepCopy(finalCities)
  // )

  map.eachLayer((layer) => {
    const L: typeof Leaflet = (window as any).L

    if (layer instanceof L.Marker) {
      const icon = layer.getIcon()
      if ((icon.options.className || "").indexOf("icon-marker") >= 0) {
        return
      }
      const cityId = layer.getPopup()?.getContent()?.toString() || ""

      // map.removeLayer(layer)


      const cityLatLng = layer.getLatLng();
      if (!bounds.contains(cityLatLng) || !ids.includes(cityId)) {
        // console.log("layer 删除了的", layer.getLatLng, cityId)
        map.removeLayer(layer)
      }
    }
  })

  // console.log("finalCities", finalCities)

}

function levelPriority(level: string, displayLevels: string[]): number {
  const basePriorities: any = {
    country: 0,
    state: 1,
    region: 2,
    city: 3,
    town: 4,
  }
  const priority = basePriorities[level] ?? 10
  const targetLevel = displayLevels[displayLevels.length - 1]
  return level === targetLevel ? -1 : priority
}

function getIconByLevel(cityInfo: CityInfo): L.DivIcon {
  const { level, name } = cityInfo
  let iconSize = 8
  if (level === 4) iconSize = 9
  if (level === 3) iconSize = 10
  if (level === 2) iconSize = 12
  if (level === 1) iconSize = 14

  const L: typeof Leaflet = (window as any).L
  return L.divIcon({
    html: `<div class='map-city-marker-wrap h${level}'>
        <span class="h${level}">${name}</span>
      </div>`,
    className: 'map-city-marker',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  })
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
export const createCityBoundaries = ({
  map, cityGeojson, style = {
    color: "#f29cb2", // 边界颜色
    weight: 2,        // 边界粗细
    opacity: 0.65,    // 透明度
    fillColor: "#f29cb2", // 填充颜色
    fillOpacity: 0.05,     // 填充透明度
  }, cityId, key

}: {
  map: Leaflet.Map, cityGeojson: GeoJSON,
  style?: {
    color: string;
    weight: number;
    opacity: number;
    fillColor: string;
    fillOpacity: number;
  }, cityId: string, key: string
}) => {
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
    style: style,
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


const getCenterCityD = new Debounce()

export const getCenterCity = async (lat: number, lng: number, f: (cityInfo: typeof state["cityInfo"]) => void) => {
  const res = await regeo({
    lat,
    lng
  })
  console.log("center", res)

  res && f(res)
}


export const watchCenterCity = async (map: Leaflet.Map, f: (cityInfo: typeof state["cityInfo"]) => void) => {

  const center: L.LatLng = map.getCenter();
  getCenterCity(center.lat, center.lng, f)

  map.on('moveend', () => {
    getCenterCityD.increase(async () => {
      try {
        if (!map?.getCenter) return
        const center: L.LatLng = map.getCenter();
        getCenterCity(center.lat, center.lng, f)
      } catch (error) {
        console.error(error)

      }
    }, 1000)
  });

};


export const citySlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setCities: (
      state,
      params: {
        payload: (typeof state.cities)
        type: string
      }
    ) => {
      state.cities = params.payload
    },
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



export const regeo = async ({ lat, lng, }: {
  lat: number
  lng: number
}) => {

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
  let newCi: typeof state["cityInfo"] = {
    country: data.country,
    state: data.state,
    region: data.region,
    city: data.city,
    town: data.town,
    road: data.road,
    address: [data.country, data.state, data.region, data.city, data.town].filter(v => v).join("·"),
    lat,
    lng
  }


  return newCi

}


export const getCityName = (cityName: protoRoot.city.ICityName | null | undefined): string => {
  if (!cityName) return ""
  let lang = ""
  switch (i18n.language) {
    case "en-US":
      lang = "en"
      break;
    case "zh-CN":
      lang = "zhHans"

      break;
    case "zh-TW":
      lang = "zhHant"

      break;

    default:
      lang = "en"
      break;
  }

  let name = (cityName as any)[lang]
  // console.log("getCityName", cityName, name, lang)
  return name
}



const asyncQueue = new AsyncQueue({
  maxQueueConcurrency: 5,
})


export const cityMethods = {
  GetCity: createAsyncThunk(modelName + '/GetCity', async (
    { lat, lng, customGPS = false }: {
      lat: number
      lng: number
      customGPS?: boolean
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    const t = i18n.t



    try {
      const { city, config, user } = store.getState()
      let ci: typeof state.cityInfo = {
        ...city.cityInfo,
      }
      let newCi = await regeo({
        lat, lng,
      })

      if (!newCi) return


      if (!customGPS && config.turnOnCityVoice) {

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


          // if ("speechSynthesis" in window) {
          //   // 清空队列
          //   window.speechSynthesis.cancel();

          //   // 创建语音对象
          //   const utterance = new SpeechSynthesisUtterance(text);
          //   utterance.lang = "zh-TW";
          //   utterance.pitch = 1;
          //   utterance.rate = 1;

          //   // 等待语音加载
          //   window.speechSynthesis.onvoiceschanged = () => {
          //     const voices = window.speechSynthesis.getVoices();
          //     utterance.voice = voices.find(voice => voice.lang === "zh-TW") ||
          //       voices.find(voice => voice.lang.startsWith("zh")) ||
          //       voices[0]; // 回退到第一个可用语音
          //   };

          //   // 添加事件监听
          //   utterance.addEventListener("end", () => {
          //     console.log("Speech synthesis finished.");
          //     msgSnackbar.close();
          //   });
          //   utterance.addEventListener("error", (err) => {
          //     console.error("Speech synthesis error:", err);
          //   });

          //   // 开始播放
          //   if (window.speechSynthesis.speaking) {
          //     console.warn("Speech synthesis is already speaking. Cancelling...");
          //     window.speechSynthesis.cancel();
          //   }
          //   window.speechSynthesis.speak(utterance);
          // } else {


          //   console.error("Sorry, your browser does not support speech synthesis.");
          // }
        }

      }





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
  GetAllCitiesVisitedByUser: createAsyncThunk(modelName + '/GetAllCitiesVisitedByUser', async (
    { tripIds }: {
      tripIds: string[]
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    try {

      const res = await httpApi.v1.GetAllCitiesVisitedByUser({
        tripIds,
      })
      console.log("res", res)
      if (res.code === 200) {
        dispatch(citySlice.actions.setCities(res.data?.cities || []))

      }
      return res.data?.cities || []
    } catch (error) {
      console.error(error)
      return []
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

          v.city = fullCities.filter((_, i) => i >= 1).map(v => getCityName(v.name) || "").join("·")

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
      cities: {
        cityId: string,
        level: number,
        name: string
      }[]
    }, thunkAPI) => {

    try {

      console.log("cityBoundariesaq", cities, cities)

      const cityBoundaries: {
        cityId: string,
        level: number
        geojson: GeoJSON
      }[] = []


      const posAll: any[] = []



      for (let i = 0; i < cities.length; i++) {
        asyncQueue.increase(async () => {
          const cityId = cities[i].cityId || ""
          let geojson = await storage.cityBoundaries.get(cityId)

          console.log("cityBoundariesaq1", geojson)
          if (!geojson) {
            const res = await R.request({
              method: "GET",
              url:
                // nominatimUrl
                // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
                // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
                `${nominatimUrl}/search?q=${cities[i].name
                }&format=jsonv2&addressdetails=1&polygon_geojson=1&accept-language=zh-CN`,
              // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lon}&platform=Amap`
            })

            const data: ReverseGeocode[] = res.data as any

            console.log("gcv", data)
            if (data) {
              const geoRes = data.filter(v => v.geojson.type === "Polygon" || v.geojson.type === "MultiPolygon")?.[0]

              geojson = geoRes?.geojson
              if (geojson) {


                await storage.cityBoundaries.set(cityId, geojson)

              }
              console.log("cityBoundariesaq555", geojson, cities[i].name)
            }
          }
          geojson && cityBoundaries.push({
            cityId: cityId,
            level: cities[i]?.level || 0,
            geojson: geojson
          })
        })
      }

      await asyncQueue.wait.waiting()

      console.log("cityBoundariesaq3", cityBoundaries.length, cities.length)


      return cityBoundaries
    } catch (error) {
      console.error(error)
      return []
    }

  }),
}
