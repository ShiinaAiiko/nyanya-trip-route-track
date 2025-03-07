import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { protoRoot, ForEachLongToNumber } from '../protos'
import { formatPositionsStr, getDistance } from '../plugins/methods'
import { eventListener, R, TabsTripType } from './config'
import { httpApi } from '../plugins/http/api'
import store, { layoutSlice, methods } from '.'
import { isLinearGradient } from 'html2canvas/dist/types/css/types/image'
import i18n from '../plugins/i18n/i18n'
import { snackbar } from '@saki-ui/core'
import { AsyncQueue, Debounce, deepCopy } from '@nyanyajs/utils'
import { t } from 'i18next'
import { toolApiUrl } from '../config'
import { GeoJSON } from './city'

export interface Statistics {
  speed: number;
  maxSpeed: number;
  maxAltitude: number;
  minAltitude: number;
  climbAltitude: number;
  descendAltitude: number;
  averageSpeed: number;
  distance: number;
}

const modelName = 'trip'


export const ethnicReg = /傣族|布朗族|独龙族|佤族|怒族|景颇族|普米族|德昂族|拉祜族|阿昌族|纳西族|哈尼族|藏族|蒙古族|回族|维吾尔族|壮族|苗族|彝族|布依族|朝鲜族|满族|侗族|瑶族|白族|土家族|哈萨克族|黎族|傈僳族|东乡族|仡佬族|拉祜族|佤族|水族|土族|羌族|达斡尔族|仫佬族|锡伯族|柯尔克孜族|景颇族|撒拉族|布朗族|毛南族|塔吉克族|普米族|阿昌族|怒族|乌孜别克族|俄罗斯族|鄂温克族|崩龙族|裕固族|保安族|京族|独龙族|赫哲族|高山族/g
export const cityType = /省|自治区|直辖市|特别行政区|市|自治州|盟|地区|县|自治县|旗|自治旗|特区|林区|区|镇|乡|街道|村|社区/g

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


export const state = {
  startTrip: false,

  detailPage: {
    cityBoundaries: [] as {
      cityId: string,
      geojson: GeoJSON

    }[],
    trip: undefined as protoRoot.trip.ITrip | null | undefined,
  },
  replayTrip: {
    id: "",
    shareKey: ""
  },
  tripStatistics: [] as {
    type: TabsTripType
    count: number
    distance: number
    uselessData: string[]
    time: number
    list: protoRoot.trip.ITrip[]
  }[],

  weatherInfo: {
    ipv4: "",
    ipv6: "",
    lon: 0,
    lat: 0,
    timezone: "",
    isp: "",
    org: "",
    temperature: -273.15,
    humidity: 0,
    weatherCode: "",
    weather: "",
    daysTemperature: [-273.15, -273.15] as number[],
    apparentTemperature: -273.15,
    windSpeed: 0,
    windDirection: "",
    visibility: 0
  }
}


export type WeatherInfoType = typeof state.weatherInfo
export type TripStatisticsType = typeof state.tripStatistics[0]

// export const isCorrectedData = async (trip: protoRoot.trip.ITrip) => {
// 	let tDistance = 0
// 	const tripPositions = await storage.tripPositions.get(trip?.id || '')

// 	if (!tripPositions) return -1
// 	if (tripPositions.correctedData) return tripPositions.correctedData

// 	const positions = formatPositionsStr(
// 		Number(tripPositions.startTime),
// 		tripPositions.positions || []
// 	)
// 	positions?.forEach((v, i) => {
// 		if (i > 0) {
// 			const lv = positions?.[i - 1]
// 			if (lv) {
// 				// console.log(
// 				// 	'distance',
// 				// 	getDistance(
// 				// 		v.latitude || 0,
// 				// 		v.longitude || 0,
// 				// 		lv.latitude || 0,
// 				// 		lv.longitude || 0
// 				// 	)
// 				// )
// 				tDistance += getDistance(
// 					v.latitude || 0,
// 					v.longitude || 0,
// 					lv.latitude || 0,
// 					lv.longitude || 0
// 				)

// 				tDistance = Math.round(tDistance * 10000) / 10000
// 			}
// 		}
// 	})

// 	console.log(
// 		'isCorrectedData',
// 		positions,
// 		tDistance,
// 		trip.statistics?.distance
// 	)

// 	trip.id &&
// 		(await storage.tripPositions.set(trip.id, {
// 			...tripPositions,
// 			correctedData: tDistance !== trip.statistics?.distance ? 1 : -1,
// 		}))

// 	return tDistance !== trip.statistics?.distance ? 1 : -1
// }


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
            toolApiUrl + `/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`
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

export const tripSlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setWeatherInfo: (
      state,
      params: {
        payload: (typeof state.weatherInfo)
        type: string
      }
    ) => {
      state.weatherInfo = params.payload
    },
    setStartTrip: (
      state,
      params: {
        payload: (typeof state)['startTrip']
        type: string
      }
    ) => {
      state.startTrip = params.payload
    },
    setCityBoundariesForDetailPage: (
      state,
      params: {
        payload: (typeof state)['detailPage']['cityBoundaries']
        type: string
      }
    ) => {
      state.detailPage.cityBoundaries = params.payload
    },
    setTripForDetailPage: (
      state,
      params: {
        payload: (typeof state)['detailPage']['trip']
        type: string
      }
    ) => {
      if (!params.payload) {
        state.detailPage.trip = {}
        return
      }

      let tDistance = 0

      // params.payload.positions?.sort((a, b) => {
      // 	return Number(a.timestamp) - Number(b.timestamp)
      // })

      params.payload.positions = params.payload.positions
        // ?.filter((v, i) => {
        // 	if (i > 0 && params.payload) {
        // 		const lv = params.payload.positions?.[i - 1]
        // 		if (lv) {
        // 			const speed =
        // 				getDistance(
        // 					v.latitude || 0,
        // 					v.longitude || 0,
        // 					lv.latitude || 0,
        // 					lv.longitude || 0
        // 				) /
        // 				(Number(v.timestamp) - Number(lv.timestamp))

        // 			return speed > 0
        // 		}
        // 	}
        // })
        ?.map((v, i) => {
          if (i > 0 && params.payload) {
            const lv = params.payload.positions?.[i - 1]
            if (lv) {
              // console.log(
              // 	'distance',
              // 	getDistance(
              // 		v.latitude || 0,
              // 		v.longitude || 0,
              // 		lv.latitude || 0,
              // 		lv.longitude || 0
              // 	),
              // )
              tDistance += getDistance(
                v.latitude || 0,
                v.longitude || 0,
                lv.latitude || 0,
                lv.longitude || 0
              )
              tDistance = Math.round(tDistance * 10000) / 10000
            }
          }
          return {
            ...v,
            distance: tDistance,
          }
        })

      state.detailPage.trip = {
        ...params.payload,
      }
    },
    setTripStatistics: (
      state,
      params: {
        payload: (typeof state)['tripStatistics']
        type: string
      }
    ) => {
      console.log('getTDistance1', params.payload)
      state.tripStatistics = params.payload
    },
    setReplayTripId: (
      state,
      params: {
        payload: (typeof state)['replayTrip']
        type: string
      }
    ) => {
      state.replayTrip = params.payload
    },
  },
})

export const getTrips = async (
  { pageNum, type, startTime }:
    { pageNum: number, type: string, startTime?: number }
): Promise<{
  trips: protoRoot.trip.ITrip[],
  startTime: number
}> => {
  const pageSize = 100

  // let startTime =  1540915200
  let tempStartTime = startTime || 1540915200

  const res = await httpApi.v1.GetTrips({
    type,
    timeLimit: [tempStartTime, Math.floor(new Date().getTime() / 1000)],
    distanceLimit: [
      // distanceRange?.minDistance || 0,
      // distanceRange?.maxDistance || 0,
      0, 500,
    ],
    pageNum,
    pageSize
  })
  console.log("GetTripStatistics res", res)
  if (res.code === 200 && res.data?.list) {
    const promiseAll: Promise<any>[] = []
    res.data?.list.forEach(v => {
      // storage.trips.delete(v.id || "")
      promiseAll.push(storage.trips.getAndSet(v.id || "", async (sv) => {
        if (!sv) {
          sv = v
        } else {
          sv = {
            ...sv,
            statistics: v.statistics,
          }
        }

        tempStartTime = tempStartTime < Number(sv.createTime) ? Number(sv.createTime) : tempStartTime
        return ForEachLongToNumber(sv)
      }))
    })

    const promiseAllRes = await Promise.all(promiseAll)

    if (promiseAllRes) {
      // console.log("promiseAllRes", promiseAllRes, res, startTime)

      if (res.data.list?.length === pageSize) {
        // return res.data?.list.concat([])
        const ts = await getTrips({
          pageNum: pageNum + 1, type, startTime
        })

        return {
          trips: res.data?.list.concat(ts.trips),
          startTime: tempStartTime < (ts.startTime) ? (ts.startTime) : tempStartTime,
        }
      }

    }

    return {
      trips: res.data?.list,
      startTime: tempStartTime,
    }
  }

  console.log("GetTripStatistics res loaded", res)
  return {
    trips: [],
    startTime: tempStartTime,
  }
}


export const filterTripsForTrackRoutePage = () => {
  const { config, trip } = store.getState()
  const { configure } = config


  const startDate = configure.filter?.trackRoute?.startDate || ''
  const endDate = configure.filter?.trackRoute?.endDate || ''

  const trips = trip.tripStatistics
    ?.filter((v) =>
      configure.filter?.trackRoute?.selectedTripTypes?.length === 0
        ? v.type === 'All'
        : configure.filter?.trackRoute?.selectedTripTypes?.includes(
          v.type
        )
    )
    .reduce((list, v) => list.concat(v.list), [] as protoRoot.trip.ITrip[])
    .filter((v) => {
      const shortestDistance =
        Number(configure.filter?.trackRoute?.shortestDistance) * 1000
      const longestDistance =
        Number(configure.filter?.trackRoute?.longestDistance) * 1000
      return (
        Number(v.statistics?.distance) >= shortestDistance &&
        (longestDistance >= 500 * 1000
          ? true
          : Number(v.statistics?.distance) <= longestDistance)
      )
    })

  const list =
    trips
      .filter(v => configure.filter?.trackRoute?.showCustomTrip ? v.permissions?.customTrip : true)
      .filter((v) => {
        return configure.filter?.trackRoute?.selectedVehicleIds?.length
          ? configure.filter?.trackRoute?.selectedVehicleIds.includes(
            v.vehicle?.id || ''
          )
          : true
      })
      .filter((v) => {
        const ct = Number(v.createTime)
        const st = Math.floor(
          new Date(
            (startDate ? startDate + ' 0:0:0' : '') || '2018-10-31'
          ).getTime() / 1000
        )
        const et = Math.floor(
          new Date(
            (endDate ? endDate + ' 23:59:59' : '') || '5055-5-5'
          ).getTime() / 1000
        )
        // console.log('ct,st,et', ct, st, et)
        return ct >= st && ct <= et
      }) || []
  // console.log('filterList', list, trip.tripStatistics)
  return list
}

export const filterTrips = ({
  list,
  startDate, endDate, types
}: {
  list: protoRoot.trip.ITrip[],
  startDate: string,
  endDate: string,
  types: string[]
}) => {
  const { trip } = store.getState()

  return (list.length ? list : (trip.tripStatistics
    ?.filter((v) =>
      types?.length === 0
        ? v.type === 'All'
        : types?.includes(
          v.type
        )
    )
    .reduce((list, v) => list.concat(v.list), [] as protoRoot.trip.ITrip[]))
  ).filter((v) => {
    const ct = Number(v.createTime)
    const st = Math.floor(
      new Date(
        (startDate ? startDate + ' 0:0:0' : '') || '2018-10-31'
      ).getTime() / 1000
    )
    const et = Math.floor(
      new Date(
        (endDate ? endDate + ' 23:59:59' : '') || '5055-5-5'
      ).getTime() / 1000
    )
    return ct >= st && ct <= et && v.status === 1
  }) || []
}


export const tripMethods = {
  GetTrip: createAsyncThunk(modelName + '/GetTrip', async ({ tripId, shareKey }: {
    tripId: string
    shareKey: string
  }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch


    console.log('getTrip', tripId)

    if (tripId.indexOf('IDB_') >= 0) {
      const v = await storage.trips.get(tripId)
      console.log('getTrip', v)
      if (v) {
        // setTrip(res?.data?.trip)
        if (v.statistics && v?.positions?.length) {
          v.statistics.minAltitude = Math.min(
            ...(v.positions?.map((v) => v.altitude || 0) || [0])
          )
        }
        return v
      }
      return undefined
    }

    const res = await httpApi.v1.GetTrip({
      id: tripId,
      shareKey: shareKey,
    })
    console.log('getTrip', res.data)
    let tripPositions = await storage.tripPositions.get(tripId)


    let startTime = Number(tripPositions?.startTime) || 0

    console.log(
      'storage tripPositions',
      tripPositions,
      (tripPositions?.positions?.[0]?.split('_') || [])?.length <= 2,
      !tripPositions,
      !tripPositions?.status,
      !tripPositions ||
      (tripPositions?.positions?.[0]?.split('_') || [])?.length <= 2 ||
      !tripPositions?.status
    )


    if (res.data?.trip?.cities?.length) {
      const cities = await store.dispatch(methods.city.GetCityDetails(
        {
          trip: res.data?.trip
        }
      )).unwrap()

      console.log("cities", cities)
      if (cities?.length) {
        res.data.trip.cities = cities


        const cityBoundaries = await store.dispatch(methods.city.GetCityBoundaries(
          {
            cities
          }
        )).unwrap()
        console.log("GetCityBoundaries", cityBoundaries)

        store.dispatch(tripSlice.actions.setCityBoundariesForDetailPage(cityBoundaries))
      }

      // res.data?.trip?.cities.forEach(v => {
      //   const cityInfo = storage.cityDetails.getSync(v.cityId || "")
      //   // console.log("cityInfo", cityInfo, v.cityId, res.data?.trip?.cities)
      //   if (cityInfo) {
      //     v.city = cityInfo.city
      //     v.cityDetails = cityInfo.cityDetails
      //   }
      // })
    }

    if (
      true ||
      !tripPositions ||
      (tripPositions?.positions?.[0]?.split('_') || [])?.length <= 2 ||
      !tripPositions?.status
    ) {
      const posRes = await httpApi.v1.GetTripPositions({
        id: tripId,
        shareKey: shareKey,
      })
      console.log('GetTripPositions posRes1111', posRes)
      if (posRes.code === 200 && posRes.data?.tripPositions?.positions) {
        startTime = Number(posRes.data?.tripPositions?.startTime || 0)
        // res.data.trip &&
        // 	(res.data.trip.status =
        // 		Number(posRes.data?.tripPositions.status) || 0)
        tripPositions = posRes.data.tripPositions
        if (posRes.data?.tripPositions.status) {
          await storage.tripPositions.set(tripId, posRes.data.tripPositions)
        }
      }
    }

    console.log('GetTripPositions pospos', tripPositions, startTime)
    if (res.code === 200 && res?.data?.trip) {
      if (tripPositions) {
        res.data.trip.positions = formatPositionsStr(
          startTime,
          tripPositions.positions || []
        )
        console.log('pospos1', res.data.trip.positions)

        // if (pos) {
        // 	console.log('getTrip', pos[0].timestamp)
        // 	console.log('getTrip', pos[pos.length - 1].timestamp)
        // }
        // setTrip(res?.data?.trip)
        if (res.data.trip?.statistics) {
          res.data.trip.statistics.minAltitude = Math.min(
            ...(res?.data?.trip?.positions?.map((v) => v.altitude || 0) || [
              0,
            ])
          )

          // console.log(
          // 	'res.data.trip.statistics?.climbAltitude',
          // 	res.data.trip.statistics?.climbAltitude,
          // 	res.data.trip?.positions
          // )
          if (
            !res.data.trip.statistics?.climbAltitude ||
            !res.data.trip.statistics?.descendAltitude
          ) {
            let climbAltitude = 0
            let descendAltitude = 0
            res.data.trip?.positions?.forEach((v, i) => {
              if (i === 0) return
              let lv = res.data.trip?.positions?.[i - 1]
              if (lv?.altitude && Number(v.altitude) > lv.altitude) {
                climbAltitude =
                  Math.floor(
                    (climbAltitude +
                      (Number(v.altitude) - Number(lv.altitude))) *
                    1000
                  ) / 1000
              }
              if (lv?.altitude && Number(v.altitude) < lv.altitude) {
                descendAltitude =
                  Math.floor(
                    (descendAltitude +
                      (Number(lv.altitude) - Number(v.altitude))) *
                    1000
                  ) / 1000
              }
            })

            res.data.trip.statistics.climbAltitude = climbAltitude
            res.data.trip.statistics.descendAltitude = descendAltitude
          }
        }
      }

      dispatch(tripSlice.actions.setTripForDetailPage(res?.data?.trip))

      // dispatch(
      // 	layoutSlice.actions.setEditTripModal({
      // 		visible: true,
      // 		trip: res.data.trip,
      // 	})
      // )
    }
    return res.data?.trip
  }),
  GetTripStatistics: createAsyncThunk(modelName + '/GetTripStatistics', async (
    { loadCloudData, alert = true }: {
      loadCloudData?: boolean
      alert?: boolean
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch
    const { trip, config, user } = store.getState()

    try {


      let loadBaseData: ReturnType<typeof snackbar> | undefined
      if (alert) {
        loadBaseData = snackbar({
          message: i18n.t('loadBaseData', {
            ns: 'prompt',
          }),
          vertical: 'top',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
        })

      }

      console.log("alert", alert, loadBaseData)


      loadBaseData?.open()


      const ts: typeof trip.tripStatistics = [
        {
          type: 'All',
          count: 0,
          distance: 0,
          uselessData: [],
          time: 0,
          list: [],
          // list: res?.data?.list || [],
        },
      ]
      config.tripTypes.forEach((v) => {
        ts.push({
          type: v as any,
          count: 0,
          distance: 0,
          uselessData: [],
          time: 0,
          list: [],
          // list: res?.data?.list || [],
        })
      })

      console.time("GetTripStatistics")

      const k = "getTripStatisticsStartTime"
      // storage.trips.deleteAll()
      // await storage.global.delete(k)

      const getTripsCloud = await getTrips({
        pageNum: 1,
        type: "All",
        startTime:
          !loadCloudData ? (Number(await storage.global.get(k)) || 1540915200) : 1540915200
      })
      await storage.global.set(k, getTripsCloud.startTime + 1)

      const getTripsLocal = (await storage.trips.getAll()).map(v => ForEachLongToNumber(v))
      const tripsTemp = Object.fromEntries(
        (getTripsLocal.map(v => v.value)
          .concat(getTripsCloud.trips)).filter(v => {
            return Number(v.status) >= 0 && v.authorId === user.userInfo.uid
          }).map((v) => [
            v?.id || "",
            v,
          ])
      )

      const tripStatistics: protoRoot.trip.ITrip[] = Object.keys(tripsTemp).map(v => {
        return tripsTemp[v]
      })

      console.timeEnd("GetTripStatistics")

      console.log("GetTripStatistics c",
        getTripsCloud, getTripsLocal, tripStatistics)

      tripStatistics?.forEach((v) => {
        let i = [0]
        if (v.type === 'Running') {
          i.push(1)
        }
        if (v.type === 'Bike') {
          i.push(2)
        }
        if (v.type === 'Drive') {
          i.push(3)
        }
        if (v.type === 'Walking') {
          i.push(4)
        }
        if (v.type === 'PowerWalking') {
          i.push(5)
        }
        if (v.type === 'Motorcycle') {
          i.push(6)
        }
        if (v.type === 'Train') {
          i.push(7)
        }
        if (v.type === 'PublicTransport') {
          i.push(8)
        }
        if (v.type === 'Plane') {
          i.push(9)
        }
        i.forEach((sv) => {
          ts[sv].distance += Number(v.statistics?.distance) || 0
          ts[sv].count += 1
          ts[sv].list =
            tripStatistics?.filter((v) => {
              if (ts[sv].type === 'All') {
                return true
              }
              return ts[sv].type === v.type
            }) || []

          ts[sv].list.sort((a, b) => Number(b.createTime) - Number(a.createTime))

          ts[sv].time += Number(v.endTime) - Number(v.createTime)
        })
      })

      tripStatistics.forEach(v => {
        if (v.cities?.length || v.id === 'JxoX2UrkU') {
          console.log('cccccc', v)
        }
      })

      console.log('tsts listlist', ts)

      dispatch(tripSlice.actions.setTripStatistics(ts))

      loadBaseData?.close()

    } catch (error) {
      console.error(error)
    }
  }),
  GetWeather: createAsyncThunk(modelName + '/GetWeather', async (
    { lat, lon }: {
      lat: number
      lon: number
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    const t = i18n.t

    try {
      console.log("GetWeather", lat, lon)
      const res = await R.request({
        method: "GET",
        url:

          `${toolApiUrl}/api/v1/net/httpProxy?method=GET&url=${encodeURIComponent(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${[
            "temperature_2m", "weather_code",
            "relative_humidity_2m", "wind_speed_10m",
            "apparent_temperature", "dew_point_2m",
            "wind_speed_10m", "wind_direction_10m",
            'visibility'
          ].join(",")
            }&hourly=temperature_2m&forecast_days=2&past_days=1`)
          }`


      })
      const data = res?.data?.data as any
      console.log("weatherdata", data)
      if (res?.data?.code !== 200 || !data) return

      const { trip, config, user } = store.getState()
      const wi: typeof state.weatherInfo = {
        ...trip.weatherInfo,
        temperature: data?.current?.temperature_2m || -273.15,
        apparentTemperature: data?.current?.apparent_temperature || -273.15,
        windSpeed: Number((data?.current?.wind_speed_10m / 3.6).toFixed(1)) || 0,
        windDirection: data?.current?.wind_direction_10m || 0,
        humidity: data?.current?.relative_humidity_2m || 0,
        visibility: data?.current?.visibility || 0,
        weatherCode: data?.current?.weather_code || "",
        weather:
          t("weather" + (data?.current?.weather_code || 0),
            {
              ns: "weather"
            }
          ),
        daysTemperature:
          [Math.min(...data.hourly?.temperature_2m),
          Math.max(...data.hourly?.temperature_2m)]
      }
      let temp = data.hourly.temperature_2m.slice(12, 36)
      const h = new Date().getUTCHours()
      if (h >= 0 && h < 12) {
        temp = data.hourly.temperature_2m.slice(0, 24)
      }
      wi.daysTemperature = [Math.min(...temp),
      Math.max(...temp)]


      const wd = data?.current?.wind_direction_10m || 0


      if (wd >= 337.5 || wd < 22.5) {
        wi.windDirection = t("windDirection1", {
          ns: "weather"
        })
      }
      if (wd >= 22.5 && wd < 67.5) {
        wi.windDirection = t("windDirection2", {
          ns: "weather"
        })
      }
      if (wd >= 67.5 && wd < 112.5) {
        wi.windDirection = t("windDirection3", {
          ns: "weather"
        })
      }
      if (wd >= 112.5 && wd < 157.5) {
        wi.windDirection = t("windDirection4", {
          ns: "weather"
        })
      }
      if (wd >= 157.5 && wd < 202.5) {
        wi.windDirection = t("windDirection5", {
          ns: "weather"
        })
      }
      if (wd >= 202.5 && wd < 247.5) {
        wi.windDirection = t("windDirection6", {
          ns: "weather"
        })
      }
      if (wd >= 247.5 && wd < 292.5) {
        wi.windDirection = t("windDirection7", {
          ns: "weather"
        })
      }
      if (wd >= 292.5 && wd < 337.5) {
        wi.windDirection = t("windDirection8", {
          ns: "weather"
        })
      }
      if (wd === -999) {
        wi.windDirection = t("windDirection9", {
          ns: "weather"
        })
      }
      if (wd === -1) {
        wi.windDirection = t("windDirection10", {
          ns: "weather"
        })
      }

      dispatch(
        tripSlice.actions.setWeatherInfo(wi)
      )

      console.log("GetWeather", wi)

    } catch (error) {
      console.error(error)
    }
  }),
  ResumeTrip: createAsyncThunk(modelName + '/ResumeTrip', async (
    { trip }: {
      trip: protoRoot.trip.ITrip
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    try {
      const { geo } = store.getState()

      if (!trip?.id || !trip.positions) return


      // 检测距离
      const cLat = geo.position.coords.latitude
      const cLng = geo.position.coords.longitude
      const lPos = trip.positions[trip.positions?.length - 1]
      const lLat = lPos.latitude || 0
      const lLng = lPos.longitude || 0

      const dis = getDistance(cLat, cLng, lLat, lLng)
      console.log("ResumeTrip", dis)

      if (dis > 100) {
        snackbar({
          message: t("resumeTripDistanceLimit", {
            ns: "tripPage"
          }),
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
        }).open()

        return
      }


      const res = await httpApi.v1.ResumeTrip({
        id: trip?.id,
      })
      console.log('resumeTrip', res, trip, res.code === 200)
      if (res.code === 200) {

        dispatch(
          layoutSlice.actions.setOpenTripItemModal({
            visible: false,
            id: '',
          })
        )
        dispatch(layoutSlice.actions.setOpenTripHistoryModal(false))

        const tempTrip = deepCopy(trip)
        tempTrip.status = 0
        console.log('resumeTrip', tempTrip)
        eventListener.dispatch('resumeTrip', tempTrip)
        return
      }

      snackbar({
        message: res.error || res.msg,
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
      }).open()
    } catch (error) {
      console.error(error)
    }

  }),
}
