import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { protoRoot, ForEachLongToNumber } from '../protos'
import {
  formatPositionsStr,
  getDistance,
  getLatLng,
  getSpeedColor,
  getZoom,
  isPointInPolygon,
} from '../plugins/methods'
import { eventListener, R, TabsTripType, tripTypes } from './config'
import { httpApi } from '../plugins/http/api'
import store, { layoutSlice, methods } from '.'
import { isLinearGradient } from 'html2canvas/dist/types/css/types/image'
import i18n from '../plugins/i18n/i18n'
import { snackbar } from '@saki-ui/core'
import { Debounce, deepCopy, Wait } from '@nyanyajs/utils'
import { AsyncQueue } from '@nyanyajs/utils'
// import { AsyncQueue } from "./asyncQueue"
import { t } from 'i18next'
import { toolApiUrl } from '../config'
import { cityMethods, GeoJSON, regeo } from './city'
import moment from 'moment'
import { updateRoadTime } from './geo'
import { createBins } from '@turf/turf'

export interface Statistics {
  speed: number
  maxSpeed: number
  maxAltitude: number
  minAltitude: number
  climbAltitude: number
  descendAltitude: number
  averageSpeed: number
  distance: number
}

const modelName = 'trip'

export const state = {
  startTrip: false,

  detailPage: {
    cityBoundaries: [] as {
      cityId: string
      geojson: GeoJSON
    }[],
    trip: undefined as protoRoot.trip.ITrip | null | undefined,
    is404: false,
  },
  replayTrip: {
    id: '',
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
    ipv4: '',
    ipv6: '',
    lon: 0,
    lat: 0,
    timezone: '',
    isp: '',
    org: '',
    temperature: -273.15,
    humidity: 0,
    weatherCode: '',
    weather: '',
    daysTemperature: [-273.15, -273.15] as number[],
    apparentTemperature: -273.15,
    windSpeed: 0,
    windDirection: '',
    windDirectionNum: 0,
    visibility: 0,
    precipitation: 0,
  },

  historicalStatistics: Object.fromEntries(
    ['All', ...tripTypes].map((type) => [
      type,
      {
        loadStatus: 'loaded',
        statistics: {
          count: 0,
          distance: 0,
          time: 0,
        },
      } as {
        loadStatus: 'loading' | 'loaded' | 'noMore'
        statistics: protoRoot.trip.ITripHistoricalStatistics
      },
    ])
  ),

  privacyGeofencePoints:
    [] as protoRoot.privacyGeofence.IPrivacyGeofencePointsItem[],
  privacyGeofencePointsPolygon: [] as number[][][],
}

export type WeatherInfoType = typeof state.weatherInfo
export type TripStatisticsType = (typeof state.tripStatistics)[0]

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

const aq = new AsyncQueue({
  maxQueueConcurrency: 5,
})
const wa = new Wait()

let connectLength = 0
let total = 0
let ids: string[] = []

export const initTripCity = async () => {
  const trips = await getTrips({
    pageNum: 1,
    type: 'All',
    startTime: 1540915200,
  })

  console.log('initTripCity', trips)

  // setInterval(() => {
  //   console.log("initTripCity wa.dispatch", total, total > 100, ids, connectLength, connectLength === 0)
  //   if (connectLength === 0) {
  //     ids = []
  //     wa.dispatch("initTripCity")

  //   }
  // }, 2 * 1000)

  for (let i = 0; i < trips.trips.length; i++) {
    // break

    if (total > 300) {
      break
    }

    const trip = trips.trips[i]

    // if (trip.cities?.length) continue

    const ct = Number(trip.createTime || 0)

    // 1739602982
    // 1710486182
    if (ct > 173519324 && ct <= 1714102241) {
      // if (ct > 1734246182 && ct <= 1737788582) {
      // if ((ct > 1742637273 && ct <= 1734246182) || (ct > 1737788582 && ct <= 1743058982)) {

      aq.increase(async () => {
        console.log(
          'initTripCity',
          trip.id,
          trip,
          moment(ct * 1000).format('YYYY-MM-DD HH:mm:ss')
        )

        const posRes = await httpApi.v1.GetTripPositions({
          id: trip.id,
        })
        console.log('initTripCity GetTripPositions posRes1111', posRes)

        const _trip = deepCopy(trip)
        _trip.positions = formatPositionsStr(
          Number(posRes.data.tripPositions?.startTime) || 0,
          posRes.data.tripPositions?.positions || []
        )

        connectLength += 1
        await initTripItemCity(_trip, true, false)
        ids.push(_trip.id || '')
        // total++

        console.log(
          '进度中',
          moment(Number(_trip.startTime) * 1000).format('YYYY-MM-DD HH:mm'),
          Number(_trip.startTime) - 10000,
          total,
          ids.length
        )
        // if (connectLength >= 3) {
        //   console.log("initTripCity wa.dispatch 开始等待", total, connectLength, connectLength < 3)
        //   await wa.waiting("initTripCity")
        // }

        // break
      })
    }
  }

  await aq.wait.waiting()
  console.log('进度中y 结束')
}

// let data = {
//   pageNum: 0,
//   loadCount: 0
// }

export const getTripHistoryPositions = async ({
  ids,
  fullData,
  authorId,
  jmId = '',
  cache = true,
}: {
  ids: string[]
  fullData: boolean
  authorId: string
  jmId?: string
  cache?: boolean
}) => {
  try {
    const { user } = store.getState()
    const res = await getAllTripPositions({
      // ids: allIds,
      ids: ids,
      pageSize: 15,
      onload(totalCount, loadCount) {
        console.log('getAllTripPositions', totalCount, loadCount)
      },
      loadingSnackbar: true,
      fullData,
      jmId,
      cache,
    })
    console.log(
      'getAllTripPositions allres',
      // trip.tripStatistics,
      // allIds,
      res
    )

    const tripPositions = (await storage.tripPositions.mget(ids)).filter(
      (v) => v.value.authorId === authorId
    )

    return tripPositions.map((v) => {
      const positions = formatPositionsStr(
        Number(v.value.startTime),
        v.value.positions || []
      )
      v.value.positionList = positions || []
      return v.value
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getAllTripPositions = async ({
  ids,
  shareKey = '',
  jmId,
  pageNum = 1,
  pageSize = 5,
  fullData = false,
  totalCount = 0,
  // loadCount = 0,
  loadingSnackbar = false,
  _snackbar,
  asyncQueue,
  data,
  maxQueueConcurrency = 5,
  cache = true,
  onload,
}: {
  ids: string[]
  shareKey?: string
  jmId?: string
  pageNum?: number
  pageSize?: number
  fullData?: boolean
  totalCount?: number
  // loadCount?: number
  loadingSnackbar?: boolean
  _snackbar?: ReturnType<typeof snackbar>
  asyncQueue?: AsyncQueue
  data?: {
    // pageNum: number
    loadCount: number
    list: protoRoot.trip.ITripPositions[]
  }
  maxQueueConcurrency?: number
  cache?: boolean
  onload?: (totalCount: number, loadCount: number) => void
}): Promise<protoRoot.trip.ITripPositions[]> => {
  ids = ids.filter((v) => !!v)

  // let pageNum = data.pageNum

  if (!asyncQueue) {
    asyncQueue = new AsyncQueue({
      maxQueueConcurrency,
    })
  }

  let isInit = false
  if (!data) {
    data = {
      loadCount: 0,
      list: [],
    }
    isInit = true
  }

  if (loadingSnackbar && !_snackbar) {
    _snackbar = snackbar({
      message: t('loadingData', {
        ns: 'prompt',
      }),
      vertical: 'top',
      horizontal: 'center',
      backgroundColor: 'var(--saki-default-color)',
      color: '#fff',
    })
    _snackbar.open()
  }

  // console.log("getAllTripPositions mget", ids)
  // await storage.tripPositions.delete("dywT0Wz1o")

  totalCount = isInit ? ids.length : totalCount

  let loadCount = data?.loadCount || 0

  if (isInit && cache) {
    let localTrips = await storage.tripPositions.mget(ids)

    if (fullData) {
      localTrips = localTrips.filter((v) => {
        return (v.value.positions?.[0]?.split('_').length || 0) > 2
      })
    }

    data.list = data?.list.concat(localTrips.map((v) => v.value))

    const localTripIdsMap = localTrips.reduce(
      (idsMap, v) => {
        idsMap[v.key] = true
        return idsMap
      },
      {} as {
        [id: string]: boolean
      }
    )
    loadCount = localTrips.length

    ids = ids.reduce((newIds, v) => {
      if (!localTripIdsMap[v]) {
        newIds.push(v)
      }

      return newIds
    }, [] as string[])

    totalCount = ids.length

    console.log('getAllTripPositions mget', ids, localTrips)
  }
  // console.log("getAllTripPositions mget",
  //   ids.length, isInit, data.list.length)

  if (!isInit) {
    if (ids.length) {
      const res = await httpApi.v1.GetTripHistoryPositions({
        // shareKey,
        // pageNum,
        pageNum: 1,
        pageSize,
        type: 'All',
        ids: ids.slice((pageNum - 1) * pageSize, pageNum * pageSize),
        // ids: [],
        timeLimit: [0, 32503651200],
        fullData,
        jmId,
        // timeLimit: [localLastTripStartTime + 1, 32503651200],
      })

      console.log(
        'getAllTripPositions',
        res,
        fullData,
        pageNum,
        ids.slice((pageNum - 1) * pageSize, pageNum * pageSize),
        ids.length,
        pageNum,
        loadCount,
        totalCount
      )

      if (res.code === 200 && res.data?.list?.length) {
        for (let i = 0; i < res.data?.list?.length; i++) {
          const v = res.data.list[i]

          await storage.tripPositions.set(v?.id || '', v)
        }

        const list = res.data?.list || []
        data.list = data?.list.concat(list)

        data.loadCount = data.loadCount + Number(res.data.total || 0)

        loadCount = data.loadCount

        onload?.(totalCount, loadCount)

        _snackbar?.setMessage(
          t('loadedData', {
            ns: 'prompt',
            percentage:
              String(
                loadCount && totalCount
                  ? Math.min(
                      100,
                      Math.floor((loadCount / totalCount || 0) * 100)
                    )
                  : 0
              ) + '%',
          })
        )

        if (Number(res.data.total || 0) === pageSize) {
          // let tempPageNum = data.pageNum
          // for (let i = 1; i <= maxQueueConcurrency; i++) {
          //   data.pageNum = tempPageNum + i
          //   console.log("getAllTripPositions ", data.pageNum, i, Math.ceil(totalCount / pageSize))
          //   if (data.pageNum > Math.ceil(totalCount / pageSize)) {
          //     break
          //   }

          //   asyncQueue.increase(() => {
          //     return getAllTripPositions({
          //       ids,
          //       shareKey,
          //       // pageNum,
          //       // pageNum: pageNum + 1 + i,
          //       pageSize,
          //       totalCount: totalCount,
          //       // loadCount: loadCount,
          //       fullData,
          //       loadingSnackbar,
          //       _snackbar, asyncQueue,
          //       data,
          //       onload
          //     })
          //   })
          // }

          // await asyncQueue.wait.waiting()

          return data.list
        }
      }
    } else {
      _snackbar?.setMessage(
        t('loadedData', {
          ns: 'prompt',
          percentage:
            String(
              loadCount && totalCount
                ? Math.min(100, Math.floor((loadCount / totalCount || 0) * 100))
                : 0
            ) + '%',
        })
      )
      onload?.(totalCount, loadCount)
    }
    return data?.list || []
  }

  if (ids.length) {
    for (let i = 1; i <= Math.ceil(totalCount / pageSize); i++) {
      // data.pageNum = tempPageNum + i
      // console.log("getAllTripPositions ", data.pageNum, i, Math.ceil(totalCount / pageSize))
      // if (data.pageNum > Math.ceil(totalCount / pageSize)) {
      //   break
      // }

      asyncQueue.increase(async () => {
        return await getAllTripPositions({
          ids,
          shareKey,
          jmId,
          pageNum: i,
          // pageNum: pageNum + 1 + i,
          pageSize,
          totalCount: totalCount,
          // loadCount: loadCount,
          fullData,
          loadingSnackbar,
          _snackbar,
          asyncQueue,
          data,
          onload,
        })
      })
    }
  } else {
    asyncQueue.increase(async () => {})
  }

  // console.log("getAllTripPositions aq", aq)
  await asyncQueue.wait.waiting()
  // console.log("getAllTripPositions allRes", aq)
  setTimeout(() => {
    // console.log(" getAllTripPositions _snackbar?.close()", _snackbar?.close())
    _snackbar?.close()
  }, 1000)

  return data?.list || []
}

let count = 1
export const initTripItemCity = async (
  trip: protoRoot.trip.ITrip,
  init: boolean,
  isSnackbar: boolean
) => {
  console.log('initTripItemCity', trip.cities?.length && !init)
  if (trip.cities?.length && !init) return

  console.log('initTripItemCity', trip.cities?.length && !init)
  if (init) {
    const res = await httpApi.v1.ClearTripCities({
      tripId: trip.id,
    })
    console.log('initTripCity ClearTripCities', res)
    if (res.code !== 200) {
      return
    }
  }
  let _snackbar: ReturnType<typeof snackbar> | undefined

  if (isSnackbar) {
    _snackbar = snackbar({
      message: t('loadedData', {
        ns: 'prompt',
        percentage: 0 + '%',
      }),
      vertical: 'top',
      horizontal: 'center',
      backgroundColor: 'var(--saki-default-color)',
      color: '#fff',
    })
    _snackbar.open()
  }

  let nextPosTime = 0

  console.log('initTripCity', trip.positions, trip.positions?.length)

  if (trip.positions?.length) {
    for (let i = 0; i < trip.positions?.length; i++) {
      const v = trip.positions[i]

      // console.log(Number(v.timestamp) > nextPosTime)

      if (Number(v.timestamp) > nextPosTime) {
        // console.log('initCity', count, v.latitude, v.timestamp)
        nextPosTime = Number(v.timestamp) + 120
        count++

        // console.log("initTripCity  cityinfo", count)

        const lat = v.latitude
        const lng = v.longitude

        let baseUrl = toolApiUrl
        // baseUrl = 'http://127.0.0.1:23201'

        const res = await R.request({
          method: 'GET',
          url:
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            `${baseUrl}/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`,
          // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`
        })
        const data = res?.data?.data as any

        console.log('initTripCity', data)
        if (!data?.country || res?.data?.code !== 200) continue
        let newCi = {
          country: data.country,
          state: data.state,
          region: data.region,
          city: data.city,
          town: data.town,
          road: data.road,
          address: [data.country, data.state, data.region, data.city, data.town]
            .filter((v) => v)
            .join('·'),
        }

        // console.log('initCity', newCi, v.timestamp)
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
        // console.log("initTripCity  cityinfo", count, data, data.platform, newCi, [lat, lng], nres,
        //   moment(Number(v.timestamp) * 1000).format("YYYY-MM-DD HH:mm:ss"))
        // console.log('initTripCity', nres, newCi)
        console.log('initTripCity', i)
        _snackbar?.setMessage(
          t('loadedData', {
            ns: 'prompt',
            percentage:
              ((i / (trip.positions?.length - 1)) * 100).toFixed(0) + '%',
          })
        )
      }
    }
  }

  console.log('initTripCity  cityinfo', ids, connectLength, total, count)

  connectLength -= 1
  total += 1
  ids = ids.filter((v) => v !== trip.id)
  console.log('initTripCity  cityinfo', ids, connectLength, total, count)

  _snackbar?.close()
  // console.log('initCity', trip.positions)
}

// let count = 1

export interface GpsPoint {
  lat: number
  lng: number
  heading: number // 航向角(0-359度)
  timestamp: number // 时间戳(毫秒)
}

export function detectTurns(gpsPoints: GpsPoint[]) {
  const tempGPSPoints = gpsPoints.slice(gpsPoints.length - 7, gpsPoints.length)

  const tempGPSPoints2 = gpsPoints.slice(0, gpsPoints.length - 7)

  const minHeading = Math.min(
    ...tempGPSPoints2.map((v) => Number(v.heading) + 360)
  )
  const maxHeading = Math.max(
    ...tempGPSPoints2.map((v) => Number(v.heading) + 360)
  )
  const minLast5Heading = Math.min(
    ...tempGPSPoints.map((v) => Number(v.heading) + 360)
  )
  const maxLast5Heading = Math.max(
    ...tempGPSPoints.map((v) => Number(v.heading) + 360)
  )

  if (gpsPoints.length >= 15) {
    // console.log(
    //   'tempGPSPoints',
    //   gpsPoints.length,
    //   Math.abs(maxHeading - minHeading),
    //   Math.abs(maxLast5Heading - minLast5Heading),
    //   minHeading,
    //   maxHeading
    // )
    if (
      Math.abs(maxHeading - minHeading) > 10 &&
      Math.abs(maxLast5Heading - minLast5Heading) <= 5
    ) {
      return true
    }
  }
  return false
}

// 使用示例
let gpsPoints: GpsPoint[] = [
  // 直线行驶
  // { lat: 39.9042, lng: 116.4074, heading: 90, timestamp: 1000 },
  // { lat: 39.9043, lng: 116.4076, heading: 90, timestamp: 2000 },
  // { lat: 39.9044, lng: 116.4078, heading: 91, timestamp: 3000 },
  // // 开始右转
  // { lat: 39.9045, lng: 116.4079, heading: 100, timestamp: 4000 },
  // { lat: 39.9046, lng: 116.408, heading: 120, timestamp: 5000 },
  // { lat: 39.9047, lng: 116.4081, heading: 140, timestamp: 6000 },
  // // 开始拉直
  // { lat: 39.9048, lng: 116.4082, heading: 160, timestamp: 7000 },
  // { lat: 39.9049, lng: 116.4083, heading: 170, timestamp: 8000 },
  // { lat: 39.905, lng: 116.4084, heading: 170, timestamp: 9000 }, // 第3个直线点
  // // 确认直线
  // { lat: 39.9051, lng: 116.4085, heading: 170, timestamp: 10000 },
  // { lat: 39.9042, lng: 116.4074, heading: 90, timestamp: 1000 },
  // { lat: 39.9043, lng: 116.4076, heading: 90, timestamp: 2000 },
  // // 开始右转
  // { lat: 39.9044, lng: 116.4077, heading: 100, timestamp: 3000 },
  // { lat: 39.9045, lng: 116.4078, heading: 120, timestamp: 4000 },
  // // 结束转弯
  // { lat: 39.9046, lng: 116.4079, heading: 180, timestamp: 5000 },
  // // 直线行驶
  // { lat: 39.9047, lng: 116.4079, heading: 180, timestamp: 6000 },
]

// const turnResults = detectTurnsWithStraight(gpsPoints, {
//   minStraightPoints: 3,
//   straightHeadingThreshold: 5,
// })
// // const turnResults = detectTurns(gpsPoints)
// console.log('turnResults', turnResults)

const initTripItemRoadAQ = new AsyncQueue({
  maxQueueConcurrency: 2,
})

export const initTripItemRoad = async (
  trip: protoRoot.trip.ITrip,
  init: boolean,
  isSnackbar: boolean
) => {
  if (trip.roads?.length && !init) return

  console.log(
    'initRoad initTripRoad',
    trip.roads,
    trip.positions,
    trip.positions?.length
  )
  if (init) {
    const res = await httpApi.v1.ClearTripRoads({
      tripId: trip.id,
    })
    console.log('initTripRoad ClearTripRoads', res)
    if (res.code !== 200) {
      return
    }
  }
  let _snackbar: ReturnType<typeof snackbar> | undefined

  if (isSnackbar) {
    _snackbar = snackbar({
      message: t('loadedData', {
        ns: 'prompt',
        percentage: 0 + '%',
      }),
      vertical: 'top',
      horizontal: 'center',
      backgroundColor: 'var(--saki-default-color)',
      color: '#fff',
    })
    _snackbar.open()
  }

  let nextPosTime = 0
  let totalCount = 0
  let count = 0

  if (trip.positions?.length) {
    for (let i = 0; i < trip.positions?.length; i++) {
      const v = trip.positions[i]
      // if (totalCount > 20) {
      //   return
      // }

      const turnResults = detectTurns(gpsPoints)
      // console.log(
      //   'initRoad heading turnResults',
      //   v.heading,
      //   moment(Number(v.timestamp) * 1000).format('HH:mm:ss')
      // )
      // 179 286
      // 71 154
      if (Number(v.timestamp) > nextPosTime || turnResults) {
        totalCount++
        // console.log(
        //   'initRoad turnResults',
        //   moment(Number(v.timestamp) * 1000).format('HH:mm:ss'),
        //   totalCount,
        //   Number(v.timestamp) > nextPosTime,
        //   gpsPoints.length,
        //   // gpsPoints,
        //   turnResults,
        //   v.heading
        // )
        gpsPoints = []
        nextPosTime = Number(v.timestamp) + 60
        // continue
        initTripItemRoadAQ.increase(async () => {
          count++
          // console.log(
          //   'initRoad timestamp',
          //   count,
          //   moment(Number(v.timestamp) * 1000).format('HH:mm:ss'),
          //   Number(v.timestamp),
          //   nextPosTime
          // )

          // console.log('initCity', count, v.latitude, v.timestamp)

          // console.log("initTripCity  cityinfo", count)

          const lat = v.latitude
          const lng = v.longitude

          const res = await store
            .dispatch(
              methods.geo.GetRoadInfo({
                position: {
                  coords: {
                    latitude: lat,
                    longitude: lng,
                  },
                  timestamp: 0,
                } as any,
                runNow: true,
              })
            )
            .unwrap()
          console.log('initRoad res', count, res, res.riList?.[0]?.code)

          // .then((res) => {
          //   if (res.status === 'loaded') {
          //     roadInfoList.current = res.riList || []
          //   }
          // })
          // console.log('initCity', newCi, v.timestamp)

          if (res.status === 'loaded') {
            const nres = await httpApi.v1.UpdateRoad({
              tripId: trip.id,
              // tripId: trip?.id || 'wKod7r4LS',
              roads: res.riList,
              entryTime: v.timestamp,
            })
            console.log('initRoad nres', count, nres)
          }
          // console.log("initTripCity  cityinfo", count, data, data.platform, newCi, [lat, lng], nres,
          //   moment(Number(v.timestamp) * 1000).format("YYYY-MM-DD HH:mm:ss"))
          // console.log('initTripCity', nres, newCi)
          _snackbar?.setMessage(
            t('loadedData', {
              ns: 'prompt',
              percentage:
                ((i / ((trip.positions?.length || 0) - 1)) * 100).toFixed(0) +
                '%',
            })
          )
        })
      } else {
        gpsPoints.push({
          lat: v.latitude || 0,
          lng: v.latitude || 0,
          heading: v.heading || 0,
          timestamp: Number(v.timestamp) * 1000 || 0,
        })
      }
    }
  }

  await initTripItemRoadAQ.wait.waiting()
  console.log('进度中y 结束', count)

  _snackbar?.close()
  // console.log('initCity', trip.positions)
}

let loadStatus = {
  GetTripStatistics: 'loaded',
}

export const formartAddrName = (
  v: protoRoot.trip.ITripAddresses | undefined
) => {
  const roadTypes = [
    'road',
    'highway',
    'motorway',
    'primary',
    'secondary',
    'tertiary',
    'residential',
    'unclassified',
    'town',
    'amenity',
  ]

  return roadTypes.includes(v?.address?.type || '')
    ? (v?.address?.fullName || '')
        .split('·')
        .reverse()
        .filter((v, i) => {
          return !Number(v) && i !== 0
        })
        .join('')
    : v?.address?.name
}

export const tripSlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setPrivacyGeofencePoints: (
      state,
      params: {
        payload: typeof state.privacyGeofencePoints
        type: string
      }
    ) => {
      state.privacyGeofencePoints = params.payload
      state.privacyGeofencePointsPolygon = (params.payload.map((sv) => {
        return sv.coords?.map((ssv) => {
          return [Number(ssv.latitude), Number(ssv.longitude)]
        })
      }) || []) as any

      // console.log(
      //   'isPointInPolygon privacyGeofencePointsPolygon',
      //   state.privacyGeofencePointsPolygon,
      //   isPointInPolygon(
      //     [29.874569, 106.383489],
      //     state.privacyGeofencePointsPolygon as any
      //   )
      // )
    },
    setHistoricalStatistics: (
      state,
      params: {
        payload: typeof state.historicalStatistics
        type: string
      }
    ) => {
      state.historicalStatistics = params.payload

      storage.global.setSync('historicalStatistics', params.payload)
    },
    setWeatherInfo: (
      state,
      params: {
        payload: typeof state.weatherInfo
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
      console.log('setTripForDetailPage', params)
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
      // console.log('getTDistance1', params.payload)
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

export const getTrips = async ({
  pageNum,
  type,
  startTime,
}: {
  pageNum: number
  type: string
  startTime?: number
}): Promise<{
  trips: protoRoot.trip.ITrip[]
  startTime: number
}> => {
  let pageSize = 10 * 10000
  // pageSize = 10 * 20

  // let startTime =  1540915200
  let tempStartTime = 1540915200

  console.log('getTrips start getTrips')
  const res = await httpApi.v1.GetTrips({
    type,
    lastUpdateTimeLimit: [startTime || 1540915200, 32503651200],
    distanceLimit: [
      // distanceRange?.minDistance || 0,
      // distanceRange?.maxDistance || 0,
      0, 500,
    ],
    pageNum,
    pageSize,
  })
  console.log(
    'getTrips res',
    res,
    (new TextEncoder().encode(JSON.stringify(res)).length / 1024).toFixed(2) +
      ' KB'
  )
  if (res.code === 200 && res.data?.list) {
    const promiseAll: Promise<any>[] = []
    res.data?.list.forEach((v) => {
      // storage.trips.delete(v.id || "")
      promiseAll.push(
        storage.trips.getAndSet(v.id || '', async (sv) => {
          if (!sv) {
            sv = v
          } else {
            sv = {
              ...sv,
              ...v,
              statistics: v.statistics,
            }
          }
          tempStartTime = Math.max(
            tempStartTime,
            Number(sv.lastUpdateTime || 0)
          )
          // console.log(
          //   'tempStartTime getTripsCloud',
          //   tempStartTime,
          //   tempStartTime,
          //   sv.lastUpdateTime,
          //   sv,
          //   Number(sv.lastUpdateTime || 0)
          // )
          // tempStartTime = tempStartTime < Number(sv.createTime) ? Number(sv.createTime) : tempStartTime
          return ForEachLongToNumber(sv)
        })
      )
    })

    const promiseAllRes = await Promise.all(promiseAll)

    if (promiseAllRes) {
      // console.log("promiseAllRes", promiseAllRes, res, startTime)

      if (res.data.list?.length === pageSize) {
        // return res.data?.list.concat([])
        const ts = await getTrips({
          pageNum: pageNum + 1,
          type,
          startTime,
        })

        return {
          trips: res.data?.list.concat(ts.trips),
          startTime: Math.max(tempStartTime, Number(ts.startTime)),
        }
      }
    }

    return {
      trips: res.data?.list,
      startTime: tempStartTime,
    }
  }

  console.log('GetTripStatistics res loaded', res)
  return {
    trips: [],
    startTime: tempStartTime,
  }
}

export const FilterTrips = ({
  selectedTripTypes,
  distanceRange,
  speedRange,
  altitudeRange,
  showCustomTrip,
  selectedVehicleIds,
  selectedJmIds,
  startDate,
  endDate,
  selectedTripIds,
}: {
  selectedTripTypes: string[]
  distanceRange: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
  speedRange?: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
  altitudeRange?: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
  showCustomTrip: boolean
  selectedVehicleIds: string[]
  selectedJmIds: string[]
  startDate: string
  endDate: string
  selectedTripIds: string[]
}) => {
  const { trip, journeyMemory } = store.getState()

  const trips = trip.tripStatistics
    ?.filter((v) =>
      selectedTripTypes?.length === 0
        ? v.type === 'All'
        : selectedTripTypes?.includes(v.type)
    )
    .reduce((list, v) => list.concat(v.list), [] as protoRoot.trip.ITrip[])
    .filter((v) => {
      const _shortestDistance = (distanceRange?.min || 0) * 1000
      const _longestDistance = (distanceRange?.max || 0) * 1000
      return (
        Number(v.statistics?.distance) >= _shortestDistance &&
        (_longestDistance >= 500 * 1000
          ? true
          : Number(v.statistics?.distance) <= _longestDistance)
      )
    })

  const jmTripIds: string[] = selectedJmIds.length
    ? journeyMemory.jmBaseDataList.reduce((t, v) => {
        if (!selectedJmIds.includes(v.id || '')) return t

        const ids =
          v.timeline?.reduce((t, v) => {
            return t.concat(...(v?.tripIds || []))
          }, [] as string[]) || []
        return t.concat(ids)
      }, [] as string[])
    : []
  console.log(
    'FilterTrips onload jmBaseDataList',
    jmTripIds,
    journeyMemory.jmBaseDataList
  )

  const list =
    trips
      .filter((v) => (showCustomTrip ? v.permissions?.customTrip : true))
      .filter((v) => {
        let b = true
        if (selectedVehicleIds?.length) {
          b = selectedVehicleIds.includes(v.vehicle?.id || '')
        }

        if (selectedJmIds?.length) {
          b = jmTripIds.includes(v?.id || '')
        }
        // console.log('filterList', b)

        return b
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

  if (selectedTripIds?.length) {
    return list.filter((v) => selectedTripIds.includes(v.id || ''))
  }
  return list
}

export const filterTripsForTrackRoutePage = () => {
  const { config, trip } = store.getState()
  const { configure } = config

  return FilterTrips({
    selectedTripTypes: configure.filter?.trackRoute?.selectedTripTypes || [],
    distanceRange: configure.filter?.trackRoute?.distanceRange || {
      min: 0,
      max: 500,
    },
    speedRange: configure.filter?.trackRoute?.distanceRange || {
      min: 0,
      max: 380,
    },
    altitudeRange: configure.filter?.trackRoute?.distanceRange || {
      min: 0,
      max: 8848,
    },
    showCustomTrip: configure.filter?.trackRoute?.showCustomTrip || false,
    selectedVehicleIds: configure.filter?.trackRoute?.selectedVehicleIds || [],
    selectedJmIds: configure.filter?.trackRoute?.selectedJmIds || [],
    startDate: configure.filter?.trackRoute?.startDate || '',
    endDate: configure.filter?.trackRoute?.endDate || '',
    selectedTripIds: [],
  })
}

export const filterTrips = ({
  list,
  startDate,
  endDate,
  types,
}: {
  list: protoRoot.trip.ITrip[]
  startDate: string
  endDate: string
  types: string[]
}) => {
  const { trip } = store.getState()

  return (
    (list.length
      ? list
      : trip.tripStatistics
          ?.filter((v) =>
            types?.length === 0 ? v.type === 'All' : types?.includes(v.type)
          )
          .reduce(
            (list, v) => list.concat(v.list),
            [] as protoRoot.trip.ITrip[]
          )
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
  )
}

export const reupdateTripPositions = async ({
  id,
  positions,
}: {
  id: string
  positions: protoRoot.trip.ITripPosition[]
}) => {
  const loadDataSnackbar = snackbar({
    message: i18n.t('reupdateTripPositions', {
      ns: 'prompt',
      num: 0,
    }),
    vertical: 'center',
    horizontal: 'center',
    backgroundColor: 'var(--saki-default-color)',
    color: '#fff',
  })

  loadDataSnackbar.open()

  const asyncQueue = new AsyncQueue({
    maxQueueConcurrency: 1,
  })

  const sLength = 200
  // const sLength = 10

  let count = 0

  // for (let i = 0; i < 3; i++) {
  for (let i = 0; i < Math.ceil(positions.length / sLength); i++) {
    const posAll = positions.slice(sLength * i, sLength * (i + 1))

    asyncQueue.increase(async () => {
      const params: protoRoot.trip.UpdateTripPosition.IRequest = {
        id: id,
        distance: posAll?.[posAll.length - 1]?.distance || 0,
        vehicleId: '',
        positions: posAll.map((v): protoRoot.trip.ITripPosition => {
          return {
            latitude: v.latitude,
            longitude: v.longitude,
            altitude: v.altitude,
            altitudeAccuracy: v.altitudeAccuracy,
            accuracy: v.accuracy,
            heading: v.heading,
            speed: v.speed,
            timestamp: v.timestamp,
          }
        }),
      }

      const res = await httpApi.v1.UpdateTripPosition(params)

      count += posAll.length
      loadDataSnackbar.setMessage(
        i18n.t('reupdateTripPositions', {
          ns: 'prompt',
          num: count,
        })
      )

      // console.log('UpdateTripPositionres', posAll, res)
      if (res.code === 200) {
      } else {
        // snackbar({
        //   message: res.error + '; ' + res.msg + '; ' + res.cnMsg,
        //   horizontal: 'center',
        //   vertical: 'top',
        //   backgroundColor: 'var(--saki-default-color)',
        //   color: '#fff',
        //   autoHideDuration: 2000,
        // }).open()
      }

      return res
    })
  }

  await asyncQueue.wait.waiting()
  loadDataSnackbar.close()
}

export const tripMethods = {
  GetTrip: createAsyncThunk(
    modelName + '/GetTrip',
    async (
      {
        tripId,
      }: {
        tripId: string
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch
      const { user } = store.getState()

      console.log('getTrip1', tripId)

      let v = await storage.trips.get(tripId)
      console.log('getTrip1', v)
      if (v) {
        // setTrip(res?.data?.trip)
        if (v.statistics && v?.positions?.length) {
          v.statistics.minAltitude = Math.min(
            ...(v.positions?.map((v) => v.altitude || 0) || [0])
          )
        }
        const tp = await storage.tripPositions.get(tripId)

        if (tp?.positions) {
          const positions = formatPositionsStr(
            Number(tp.startTime),
            tp.positions || []
          )
          v.positions = positions
        }

        dispatch(tripSlice.actions.setTripForDetailPage(v))
        v = deepCopy(v)
      }
      if (tripId.indexOf('IDB_') >= 0 || !user.isLogin) {
        if (v) {
          return v
        }
        return undefined
      }

      const res = await httpApi.v1.GetTrip({
        id: tripId,
      })
      console.log('getTrip1', res)
      if (res.code !== 200) {
        dispatch(
          tripSlice.actions.setTripForDetailPage({
            id: '404',
          })
        )
        return
      }

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
        const cities = await store
          .dispatch(
            methods.city.GetCityDetails({
              trip: res.data?.trip,
            })
          )
          .unwrap()

        console.log('GetCityDetails', cities)
        if (cities?.length) {
          res.data.trip.cities = cities

          // const cityBoundaries = await store.dispatch(methods.city.GetCityBoundaries(
          //   {
          //     cities: cities.reduce((tv, cv) => {

          //       if (tv.filter(sv => {
          //         return sv.cityId === cv.cityId
          //       })?.length === 0) {
          //         tv.push({
          //           cityId: cv.cityId || "",
          //           level: cv.cityDetails?.filter(v => v.id === cv.cityId)?.[0]?.level || 5,
          //           name: cv.cityDetails?.filter(sv => Number(sv.level) <= 4).map(sv => sv.name?.zhCN).join(",") || "",
          //         })
          //       }

          //       return tv
          //     }, [] as {
          //       cityId: string,
          //       level: number
          //       name: string
          //     }[])
          //   }
          // )).unwrap()
          // console.log("GetCityBoundaries", cityBoundaries)

          // store.dispatch(tripSlice.actions.setCityBoundariesForDetailPage(cityBoundaries))
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
        if (!res?.data?.trip.addresses?.length) {
          const tempTrip = await dispatch(
            tripMethods.GetTripAddresses({
              trips: [res?.data?.trip],
            })
          ).unwrap()

          if (tempTrip?.[0]?.addresses) {
            res.data.trip.addresses = tempTrip[0].addresses
          }
        }

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
        await storage.trips.set(tripId, res?.data?.trip)
        console.log('getTrip1 setTripForDetailPage', res?.data?.trip)
        dispatch(tripSlice.actions.setTripForDetailPage(res?.data?.trip))

        // dispatch(
        // 	layoutSlice.actions.setEditTripModal({
        // 		visible: true,
        // 		trip: res.data.trip,
        // 	})
        // )
      }
      return res.data?.trip
    }
  ),
  GetTripsBaseData: createAsyncThunk(
    modelName + '/GetTripsBaseData',
    async (
      {
        loadCloudData,
        alert = true,
      }: {
        loadCloudData?: boolean
        alert?: boolean
      },
      thunkAPI
    ) => {
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

        console.log('alert', alert, loadBaseData)

        loadBaseData?.open()

        console.time('GetTripStatistics')

        const k = 'getTripStatisticsStartTime'
        // storage.trips.deleteAll()
        // await storage.global.delete(k)

        let getTripsLocal = (await storage.trips.getAll()).map(
          (v): protoRoot.trip.ITrip => {
            return ForEachLongToNumber(v.value)
          }
        )

        const localTime =
          getTripsLocal.length === 0
            ? 1540915200
            : Number(await storage.global.get(k)) || 1540915200

        const getTripsCloud = await getTrips({
          pageNum: 1,
          type: 'All',
          startTime: localTime,
          // startTime: loadCloudData ? 1540915200 : Number(await storage.global.get(k)) || 1540915200,
        })

        console.log(
          'getTrips getTripsCloud',
          getTripsCloud,
          localTime,
          getTripsCloud.startTime
          // loadCloudData ? 1540915200 : Number(await storage.global.get(k)) || 1540915200
        )
        if (getTripsCloud.startTime >= localTime) {
          await storage.global.set(k, getTripsCloud.startTime + 1)
        }

        const getTripsCloudIds = getTripsCloud.trips.map((v) => v.id || '')

        console.log('baseTrips getTripsLocal', getTripsCloudIds, getTripsLocal)

        getTripsLocal = getTripsLocal
          .filter((v) => !getTripsCloudIds.includes(v.id || ''))
          .concat(getTripsCloud.trips)
        console.log('baseTrips getTripsLocal', getTripsCloudIds, getTripsLocal)

        loadBaseData?.close()
        console.timeEnd('GetTripStatistics')

        return getTripsLocal
      } catch (error) {
        console.error(error)
        return []
      }
    }
  ),
  GetTripHistoryData: createAsyncThunk(
    modelName + '/GetTripHistoryData',
    async (
      {
        loadCloudData,
        alert = true,
        cityDetails = false,
      }: {
        loadCloudData?: boolean
        alert?: boolean
        cityDetails?: boolean
      },
      thunkAPI
    ) => {
      console.log('GetTripHistoryData load')
      const dispatch = thunkAPI.dispatch
      const { trip, config, user } = store.getState()

      try {
        let ts = deepCopy(trip.tripStatistics)

        // console.log('tsts ts', ts)
        if (!ts.length) {
          ts = [
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

          const tempTS: typeof trip.tripStatistics = await storage.global.get(
            'getTripHistoryDataTS'
          )
          // console.log(
          //   'tsts tempTS1',
          //   tempTS.filter((v) => v),
          //   config.tripTypes.length + 1,
          //   tempTS.filter((v) => v)?.length >= config.tripTypes.length + 1
          // )
          if (tempTS?.filter((v) => v)?.length >= config.tripTypes.length + 1) {
            ts = tempTS
            dispatch(tripSlice.actions.setTripStatistics(ts))
            ts = deepCopy(ts)
          }
        }

        // console.log('tsts listlist getTripHistoryDataTS tempTS', ts)

        const baseTrips = await dispatch(
          methods.trip.GetTripsBaseData({
            loadCloudData,
            alert,
          })
        ).unwrap()

        // console.log('tsts baseTrips', cityDetails, baseTrips, ts)

        if (cityDetails) {
          const cities = await dispatch(
            cityMethods.GetAllCitiesVisitedByUser({
              tripIds: [],
              // tripIds: baseTrips.map((v) => v.id || ''),
            })
          ).unwrap()
          console.log('GetAllCitiesVisitedByUser gcv', cities)

          const cityDetailsMap = cities?.reduce(
            (results, v, i) => {
              v.cities?.forEach((sv) => {
                sv.cities?.forEach((ssv) => {
                  ssv.cities?.forEach((sssv) => {
                    if (sssv.level === 5) {
                      results[sssv?.id || ''] = [v, sv, ssv, sssv]
                    }
                    sssv.cities?.forEach((ssssv) => {
                      if (ssssv.level === 5) {
                        results[ssssv?.id || ''] = [v, sv, ssv, sssv, ssssv]
                      }
                    })
                  })
                })
              })

              return results
            },
            {} as {
              [cityId: string]: protoRoot.city.ICityItem[]
            }
          )

          // console.log('gcv cityDetailsMap', cityDetailsMap)
          baseTrips.forEach((v) => {
            v.cities?.forEach((sv) => {
              sv.cityDetails = cityDetailsMap?.[sv?.cityId || '']
            })
          })
          // console.log(
          //   'gcv baseTrips',
          //   baseTrips.filter((v) => v.id === 'VnMTKbvWU')
          // )
        }

        const tripsTemp = Object.fromEntries(
          baseTrips
            .filter((v) => {
              return Number(v.status) >= 0 && v.authorId === user.userInfo.uid
            })
            .map((v) => [v?.id || '', v])
        )

        const trips: protoRoot.trip.ITrip[] = Object.keys(tripsTemp).map(
          (v) => {
            return tripsTemp[v]
          }
        )

        trips?.forEach((v) => {
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
              trips?.filter((v) => {
                if (ts[sv].type === 'All') {
                  return true
                }
                return ts[sv].type === v.type
              }) || []

            ts[sv].list.sort(
              (a, b) => Number(b.createTime) - Number(a.createTime)
            )

            ts[sv].time += Number(v.endTime) - Number(v.createTime)
          })
        })

        // tripStatistics.forEach((v) => {
        //   if (v.cities?.length || v.id === 'JxoX2UrkU') {
        //     // console.log('cccccc', v)
        //   }
        // })

        console.log('tsts listlist', deepCopy(ts))

        await storage.global.set('getTripHistoryDataTS', ts)

        dispatch(tripSlice.actions.setTripStatistics(ts))
      } catch (error) {
        console.error(error)
      }
    }
  ),
  GetWeather: createAsyncThunk(
    modelName + '/GetWeather',
    async (
      {
        lat,
        lon,
      }: {
        lat: number
        lon: number
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch

      const t = i18n.t

      try {
        console.log('GetWeather', lat, lon)
        const res = await R.request({
          method: 'GET',
          url: `${toolApiUrl}/api/v1/net/httpProxy?method=GET&url=${encodeURIComponent(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${[
              'temperature_2m',
              'weather_code',
              'relative_humidity_2m',
              'wind_speed_10m',
              'apparent_temperature',
              'dew_point_2m',
              'wind_speed_10m',
              'wind_direction_10m',
              'visibility',
              'precipitation',
            ].join(',')}&hourly=temperature_2m&forecast_days=2&past_days=1`
          )}`,
        })
        const data = res?.data?.data as any
        console.log('GetWeather weatherdata', data)
        if (res?.data?.code !== 200 || !data) return

        const { trip, config, user } = store.getState()
        const wi: typeof state.weatherInfo = {
          ...trip.weatherInfo,
          temperature: data?.current?.temperature_2m || -273.15,
          apparentTemperature: data?.current?.apparent_temperature || -273.15,
          windSpeed:
            Number((data?.current?.wind_speed_10m / 3.6).toFixed(1)) || 0,
          windDirection: data?.current?.wind_direction_10m || 0,
          windDirectionNum: data?.current?.wind_direction_10m || 0,
          humidity: data?.current?.relative_humidity_2m || 0,
          visibility: data?.current?.visibility || 0,
          weatherCode: data?.current?.weather_code || '',
          weather: t('weather' + (data?.current?.weather_code || 0), {
            ns: 'sakiuiWeather',
          }),
          daysTemperature: [
            Math.min(...data.hourly?.temperature_2m),
            Math.max(...data.hourly?.temperature_2m),
          ],
          precipitation: data?.current?.precipitation || 0,
        }
        let temp = data.hourly.temperature_2m.slice(12, 36)
        const h = new Date().getUTCHours()
        if (h >= 0 && h < 12) {
          temp = data.hourly.temperature_2m.slice(0, 24)
        }
        wi.daysTemperature = [Math.min(...temp), Math.max(...temp)]

        const wd = data?.current?.wind_direction_10m || 0

        if (wd >= 337.5 || wd < 22.5) {
          wi.windDirection = t('windDirection1', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 22.5 && wd < 67.5) {
          wi.windDirection = t('windDirection2', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 67.5 && wd < 112.5) {
          wi.windDirection = t('windDirection3', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 112.5 && wd < 157.5) {
          wi.windDirection = t('windDirection4', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 157.5 && wd < 202.5) {
          wi.windDirection = t('windDirection5', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 202.5 && wd < 247.5) {
          wi.windDirection = t('windDirection6', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 247.5 && wd < 292.5) {
          wi.windDirection = t('windDirection7', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd >= 292.5 && wd < 337.5) {
          wi.windDirection = t('windDirection8', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd === -999) {
          wi.windDirection = t('windDirection9', {
            ns: 'sakiuiWeather',
          })
        }
        if (wd === -1) {
          wi.windDirection = t('windDirection10', {
            ns: 'sakiuiWeather',
          })
        }

        dispatch(tripSlice.actions.setWeatherInfo(wi))

        console.log('GetWeather', wi)
      } catch (error) {
        console.error(error)
      }
    }
  ),
  ResumeTrip: createAsyncThunk(
    modelName + '/ResumeTrip',
    async (
      {
        trip,
      }: {
        trip: protoRoot.trip.ITrip
      },
      thunkAPI
    ) => {
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
        console.log('ResumeTrip', dis)

        // if (dis > 100) {
        //   snackbar({
        //     message: t('resumeTripDistanceLimit', {
        //       ns: 'tripPage',
        //     }),
        //     autoHideDuration: 2000,
        //     vertical: 'top',
        //     horizontal: 'center',
        //   }).open()

        //   return
        // }

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
    }
  ),

  GetPrivacyGeofence: createAsyncThunk(
    modelName + '/GetPrivacyGeofence',
    async (_, thunkAPI) => {
      const dispatch = thunkAPI.dispatch

      try {
        const { user } = store.getState()

        if (!user.isLogin) return
        const res = await httpApi.v1.GetPrivacyGeofence({})
        console.log('GetPrivacyGeofence', res)

        if (res.code === 200) {
          dispatch(
            tripSlice.actions.setPrivacyGeofencePoints(res.data?.points || [])
          )
        }
      } catch (error) {
        console.error(error)
      }
    }
  ),

  GetTripHistoricalStatistics: createAsyncThunk(
    modelName + '/GetTripHistoricalStatistics',
    async (
      {
        type,
      }: {
        type: string
      },
      thunkAPI
    ) => {
      if (!type) return
      const dispatch = thunkAPI.dispatch

      const { user, trip, config } = store.getState()

      let tempStats = deepCopy(trip.historicalStatistics)

      console.log(
        'getTripStatistics111 type',
        type,
        tempStats,
        tempStats[type],
        tempStats[type].loadStatus === 'loading' ||
          tempStats[type].loadStatus == 'noMore',
        user.isLogin
      )
      try {
        if (!tempStats[type]?.statistics?.count) {
          const stoStats = await storage.global.get('historicalStatistics')

          if (stoStats?.[type]?.statistics?.count) {
            tempStats[type].statistics = stoStats[type]?.statistics
          }
        }

        if (!user.isLogin || type === 'Local') {
          const trips = await storage.trips.getAll()
          console.log('getLocalTrips', trips)

          tempStats[type].statistics = {
            count: 0,
            distance: 0,
            time: 0,
          }

          // const obj: (typeof tempStats)['All'] = {}
          // let distance = 0
          // let time = 0
          trips.forEach((v) => {
            if (!v.value.type) return
            tempStats[v.value.type].statistics.count! += 1
            tempStats[v.value.type].statistics.distance! +=
              v.value.statistics?.distance || 0
            const time =
              (Number(v.value.endTime) || 0) - (Number(v.value.startTime) || 0)

            if (time > 0) {
              const currentTime = Number(
                tempStats[v.value.type].statistics.time ?? 0
              )
              const increment = Number(time)

              tempStats[v.value.type].statistics.time = currentTime + increment
            }
          })

          tempStats[type].loadStatus = 'loaded'
          dispatch(tripSlice.actions.setHistoricalStatistics(tempStats))

          return
        }
        if (
          tempStats[type].loadStatus === 'loading' ||
          tempStats[type].loadStatus == 'noMore'
        ) {
          return
        }

        tempStats[type].loadStatus = 'loading'

        dispatch(tripSlice.actions.setHistoricalStatistics(tempStats))

        tempStats = deepCopy(tempStats)
        // const tripStatisticsCloud = await getTripStatistics(1, 'All')

        const res = await httpApi.v1.GetTripStatistics({
          type: type,
          timeLimit: [1540915200, 32503651200],
          distanceLimit: [0, 500],
        })
        console.log('getTripStatistics111', res, tempStats[type], user.isLogin)
        if (res.code === 200) {
          tempStats[type].statistics = {
            ...tempStats[type].statistics,
            ...res.data.statistics,
          }
        }
        tempStats[type].loadStatus = 'loaded'
        console.log('getTripStatistics111', deepCopy(tempStats[type]))
        dispatch(tripSlice.actions.setHistoricalStatistics(tempStats))
      } catch (error) {
        console.error(error)
      }
    }
  ),

  GetTripAddresses: createAsyncThunk(
    modelName + '/GetTripAddresses',
    async (
      {
        trips,
        isSnackbar = true,
      }: {
        trips: protoRoot.trip.ITrip[]
        isSnackbar?: boolean
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch

      const { user, trip, config } = store.getState()

      try {
        console.log('GetTripAddresses', trips)

        let _snackbar: ReturnType<typeof snackbar> | undefined

        if (isSnackbar) {
          _snackbar = snackbar({
            message: t('loadingTripAddresses', {
              ns: 'prompt',
            }),
            vertical: 'top',
            horizontal: 'center',
            backgroundColor: 'var(--saki-default-color)',
            color: '#fff',
          })
          _snackbar.open()
        }
        let loadCount = 0
        let totalCount = 0

        const aq = new AsyncQueue({
          maxQueueConcurrency: 1,
        })
        const tripsData: protoRoot.trip.UpdateTripAddresses.Request.ITripItem[] =
          []
        trips.forEach((v, i) => {
          // ?.filter(sv=>sv.address?.fullName)
          if (v.addresses?.length) return
          totalCount++

          aq.increase(async () => {
            let isAdd = true
            const addresses: protoRoot.trip.ITripAddresses[] = []

            // 获取起点和终点的定位
            const res = await httpApi.v1.GetTripPositions({
              id: v.id,
            })

            if (
              res.code !== 200 ||
              !res.data.tripPositions?.positions?.length
            ) {
              isAdd = false
              return
            }

            const positions = formatPositionsStr(
              Number(res.data.tripPositions?.startTime) || 0,
              res.data.tripPositions?.positions || []
            )

            ;[positions[0], positions[positions.length - 1]].forEach(
              (sv, si) => {
                addresses.push({
                  latitude: sv.latitude,
                  longitude: sv.longitude,
                  altitude: sv.altitude,
                  entryTime: sv.timestamp,
                })
              }
            )

            for (let i = 0; i < addresses.length; i++) {
              console.log('GetTripAddresses addresses', i)
              const res = await regeo({
                lat: Number(addresses[i].latitude),
                lng: Number(addresses[i].longitude),
              })
              if (res) {
                addresses[i].city = {
                  country: res.country,
                  state: res.state,
                  region: res.region,
                  city: res.city,
                  town: res.town,
                  road: res.road,
                }
              } else {
                isAdd = false
                return
              }
              console.log('GetTripAddresses addresses regeo', i, res, addresses)

              const res1 = await httpApi.v1.Regeo({
                lat: Number(addresses[i].latitude),
                lng: Number(addresses[i].longitude),
                lang: config.lang,
              })
              console.log('GetTripAddresses res1', res1)

              if (res1) {
                addresses[i].address = {
                  fullName: res1?.display_name
                    ?.split(',')
                    ?.map((v: string) => v.trim())
                    .join('·'),
                  type: res1?.addresstype,
                  name: res1?.name,
                }
              } else {
                isAdd = false
                return
              }
            }

            // console.log(
            //   'GetTripAddresses res',
            //   res,
            //   positions.length,
            //   addresses
            // )

            isAdd &&
              tripsData.push({
                id: v.id,
                addresses: addresses,
              })

            loadCount += 1

            isSnackbar &&
              _snackbar?.setMessage(
                t('loadedTripAddresses', {
                  ns: 'prompt',
                  percentage:
                    String(
                      loadCount && totalCount
                        ? Math.min(
                            100,
                            Math.floor((loadCount / totalCount || 0) * 100)
                          )
                        : 0
                    ) + '%',
                })
              )
          })
        })
        aq.increase(async () => {})

        await aq.wait.waiting()

        isSnackbar &&
          _snackbar?.setMessage(
            t('loadedTripAddresses', {
              ns: 'prompt',
              percentage: '100%',
            })
          )

        console.log('GetTripAddresses tripsData', tripsData)
        if (!tripsData.length) {
          isSnackbar && _snackbar?.close()
          return []
        }
        const res2 = await httpApi.v1.UpdateTripAddresses({
          trips: tripsData,
        })
        console.log('GetTripAddresses UpdateTripAddresses', res2, tripsData)

        isSnackbar && _snackbar?.close()

        if (res2.code === 200) {
          return tripsData
        }
        return []
      } catch (error) {
        console.error(error)
      }
    }
  ),
}
