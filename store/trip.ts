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
} from '../plugins/methods'
import { eventListener, R, TabsTripType } from './config'
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
import { cityMethods, GeoJSON } from './city'
import moment from 'moment'

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
    visibility: 0,
  },

  historicalStatistics: {} as {
    [type: string]: {
      distance: 0
      time: 0
      count: 0
      days: 0
    }
  },
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
}: {
  ids: string[]
  fullData: boolean
  authorId: string
  jmId?: string
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

  if (isInit) {
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
  if (trip.cities?.length && !init) return

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
        nextPosTime = Number(v.timestamp) + 90
        count++

        // console.log("initTripCity  cityinfo", count)

        const lat = v.latitude
        const lng = v.longitude

        const res = await R.request({
          method: 'GET',
          url:
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
            toolApiUrl +
            `/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}`,
          // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`
        })
        const data = res?.data?.data as any

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

let loadStatus = {
  GetTripStatistics: 'loaded',
}

export const tripSlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setHistoricalStatistics: (
      state,
      params: {
        payload: typeof state.historicalStatistics
        type: string
      }
    ) => {
      state.historicalStatistics = params.payload
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
  const pageSize = 10 * 10000

  // let startTime =  1540915200
  let tempStartTime = 1540915200

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
  console.log('GetTripStatistics res', res)
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
          dispatch(tripSlice.actions.setTripForDetailPage(v))
          return v
        }
        return undefined
      }

      const res = await httpApi.v1.GetTrip({
        id: tripId,
      })
      console.log('getTrip', res)
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
          'baseTrips getTripsCloud',
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
      const dispatch = thunkAPI.dispatch
      const { trip, config, user } = store.getState()

      try {
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

        const baseTrips = await dispatch(
          methods.trip.GetTripsBaseData({
            loadCloudData,
            alert,
          })
        ).unwrap()

        console.log('baseTrips', baseTrips)

        if (cityDetails) {
          const cities = await dispatch(
            cityMethods.GetAllCitiesVisitedByUser({
              tripIds: [],
            })
          ).unwrap()
          console.log('gcv', cities)

          const cityDetailsMap = cities.reduce(
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

          // console.log("gcv cityDetailsMap", cityDetailsMap)
          baseTrips.forEach((v) => {
            v.cities?.forEach((v) => {
              v.cityDetails = cityDetailsMap[v?.cityId || '']
            })
          })
        }

        const tripsTemp = Object.fromEntries(
          baseTrips
            .filter((v) => {
              return Number(v.status) >= 0 && v.authorId === user.userInfo.uid
            })
            .map((v) => [v?.id || '', v])
        )

        const tripStatistics: protoRoot.trip.ITrip[] = Object.keys(
          tripsTemp
        ).map((v) => {
          return tripsTemp[v]
        })

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

            ts[sv].list.sort(
              (a, b) => Number(b.createTime) - Number(a.createTime)
            )

            ts[sv].time += Number(v.endTime) - Number(v.createTime)
          })
        })

        tripStatistics.forEach((v) => {
          if (v.cities?.length || v.id === 'JxoX2UrkU') {
            // console.log('cccccc', v)
          }
        })

        console.log('tsts listlist', ts)

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
            ].join(',')}&hourly=temperature_2m&forecast_days=2&past_days=1`
          )}`,
        })
        const data = res?.data?.data as any
        console.log('weatherdata', data)
        if (res?.data?.code !== 200 || !data) return

        const { trip, config, user } = store.getState()
        const wi: typeof state.weatherInfo = {
          ...trip.weatherInfo,
          temperature: data?.current?.temperature_2m || -273.15,
          apparentTemperature: data?.current?.apparent_temperature || -273.15,
          windSpeed:
            Number((data?.current?.wind_speed_10m / 3.6).toFixed(1)) || 0,
          windDirection: data?.current?.wind_direction_10m || 0,
          humidity: data?.current?.relative_humidity_2m || 0,
          visibility: data?.current?.visibility || 0,
          weatherCode: data?.current?.weather_code || '',
          weather: t('weather' + (data?.current?.weather_code || 0), {
            ns: 'weather',
          }),
          daysTemperature: [
            Math.min(...data.hourly?.temperature_2m),
            Math.max(...data.hourly?.temperature_2m),
          ],
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
            ns: 'weather',
          })
        }
        if (wd >= 22.5 && wd < 67.5) {
          wi.windDirection = t('windDirection2', {
            ns: 'weather',
          })
        }
        if (wd >= 67.5 && wd < 112.5) {
          wi.windDirection = t('windDirection3', {
            ns: 'weather',
          })
        }
        if (wd >= 112.5 && wd < 157.5) {
          wi.windDirection = t('windDirection4', {
            ns: 'weather',
          })
        }
        if (wd >= 157.5 && wd < 202.5) {
          wi.windDirection = t('windDirection5', {
            ns: 'weather',
          })
        }
        if (wd >= 202.5 && wd < 247.5) {
          wi.windDirection = t('windDirection6', {
            ns: 'weather',
          })
        }
        if (wd >= 247.5 && wd < 292.5) {
          wi.windDirection = t('windDirection7', {
            ns: 'weather',
          })
        }
        if (wd >= 292.5 && wd < 337.5) {
          wi.windDirection = t('windDirection8', {
            ns: 'weather',
          })
        }
        if (wd === -999) {
          wi.windDirection = t('windDirection9', {
            ns: 'weather',
          })
        }
        if (wd === -1) {
          wi.windDirection = t('windDirection10', {
            ns: 'weather',
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

        if (dis > 100) {
          snackbar({
            message: t('resumeTripDistanceLimit', {
              ns: 'tripPage',
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
      const dispatch = thunkAPI.dispatch

      const { user, trip } = store.getState()

      const { historicalStatistics } = trip

      try {
        if (
          loadStatus.GetTripStatistics === 'loading' ||
          loadStatus.GetTripStatistics == 'noMore'
        )
          return
        loadStatus.GetTripStatistics = 'loading'
        console.log(!user.isLogin || type === 'Local')
        if (!user.isLogin || type === 'Local') {
          const trips = await storage.trips.getAll()
          console.log('getLocalTrips', trips)

          const obj: any = {}
          // let distance = 0
          // let time = 0
          trips.forEach((v) => {
            if (!v.value.type) return
            !obj[v.value.type] &&
              (obj[v.value.type] = {
                count: 0,
                distance: 0,
                time: 0,
              })

            obj[v.value.type].count += 1
            obj[v.value.type].distance += v.value.statistics?.distance || 0
            const time =
              (Number(v.value.endTime) || 0) - (Number(v.value.startTime) || 0)

            if (time > 0) {
              obj[v.value.type].time += time
            }
          })

          dispatch(
            tripSlice.actions.setHistoricalStatistics({
              ...historicalStatistics,
              ...obj,
            })
          )

          loadStatus.GetTripStatistics = 'loaded'
          return
        }

        // const tripStatisticsCloud = await getTripStatistics(1, 'All')

        const res = await httpApi.v1.GetTripStatistics({
          type: type,
          timeLimit: [1540915200, 32503651200],
          distanceLimit: [0, 500],
        })
        console.log('getTripStatistics', res)
        if (res.code === 200) {
          const obj: any = {}
          obj[type] = {
            count: res?.data?.statistics?.count || 0,
            distance: res?.data?.statistics?.distance || 0,
            time: res?.data?.statistics?.time || 0,
            days: res?.data?.statistics?.days || 0,
          }

          dispatch(
            tripSlice.actions.setHistoricalStatistics({
              ...historicalStatistics,
              ...obj,
            })
          )
        }
        loadStatus.GetTripStatistics = 'loaded'
      } catch (error) {
        console.error(error)
      }
    }
  ),
}
