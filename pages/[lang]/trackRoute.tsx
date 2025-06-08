import Head from 'next/head'
import TripLaout, { getLayout } from '../../layouts/Trip'
import Link from 'next/link'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import FooterComponent from '../../components/Footer'
import path from 'path'
import store, {
  RootState,
  AppDispatch,
  layoutSlice,
  useAppDispatch,
  methods,
  apiSlice,
  geoSlice,
  tripSlice,
} from '../../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'
import {
  AsyncQueue,
  Debounce,
  deepCopy,
  NyaNyaWasm,
  QueueLoop,
} from '@nyanyajs/utils'
import {
  getRegExp,
  copyText,
  getRandomPassword,
  getSpeedColor,
  getDistance,
  formatTime,
  getLatLng,
  formatDistance,
  formatPositionsStr,
  formatDurationI18n,
  getZoom,
  roadColorFade,
  isRoadColorFade,
  // testGpsData,
} from '../../plugins/methods'
import { getGeoInfo } from 'findme-js'
import Leaflet from 'leaflet'
import moment from 'moment'
import { httpApi } from '../../plugins/http/api'
import { protoRoot } from '../../protos'
import {
  TripType,
  cnMap,
  getMapLayer,
  getTrackRouteColor,
  maps,
  osmMap,
} from '../../store/config'
import { storage } from '../../store/storage'
import NoSSR from '../../components/NoSSR'
import md5 from 'blueimp-md5'

import MapTrackRouteComponent from '../../components/MapTrackRoute'
import ButtonsComponent from '../../components/Buttons'
import {
  changeLanguage,
  defaultLanguage,
  languages,
} from '../../plugins/i18n/i18n'
import { log } from 'console'
import {
  filterTripsForTrackRoutePage,
  getAllTripPositions,
  getTripHistoryPositions,
} from '../../store/trip'
import FiexdWeatherComponent from '../../components/FiexdWeather'
import { createDistanceScaleControl } from '../../plugins/map'
import { loadModal } from '../../store/layout'
import FilterComponent from '../../components/Filter'
import {
  clearLayer,
  renderPolyline,
  renderPolylineItem,
  RenderPolylineItemClickFunc,
  RenderPolylineItemClickFuncReRender,
  RenderPolylineItemParams,
} from '../../store/map'
import { LayerButtons } from '../../components/MapLayer'

const forceUpdateReducer = (state: number) => state + 1

const TrackRoutePage = () => {
  const { t, i18n } = useTranslation('trackRoutePage')
  const [mounted, setMounted] = useState(false)
  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)
  const layout = useSelector((state: RootState) => state.layout)
  const geo = useSelector((state: RootState) => state.geo)
  const trip = useSelector((state: RootState) => state.trip)

  const router = useRouter()

  const { id, sk } = router.query

  const marker = useRef<Leaflet.Marker<any>>()
  const loginSnackbarDebounce = useRef(new Debounce())
  const loadDataDebounce = useRef(new Debounce())
  const wakeLock = useRef<WakeLockSentinel>()
  const map = useRef<Leaflet.Map>()
  const loadedMap = useRef(false)
  const laodCount = useRef(0)
  const layer = useRef<any>()

  const currentLatlons = useRef<any[]>([])

  const selectPolylineIds = useRef<string[]>([])

  const [, forceUpdate] = useReducer(forceUpdateReducer, 0)

  const loginSnackbar = useRef(
    snackbar({
      message: t('noLoginTrip', {
        ns: 'prompt',
      }),
      vertical: 'top',
      horizontal: 'center',

      backgroundColor: 'var(--saki-default-color)',
      color: '#fff',
    })
  )

  const loadingSnackbar = useRef<ReturnType<typeof snackbar>>()

  const tempUsedPositions = useRef<
    {
      id: string
      pos: protoRoot.trip.ITripPosition
    }[]
  >([])

  const [type, setType] = useState<TripType>('Running')

  const [startTrip, setStartTrip] = useState(false)
  // const [pageNum, setPageNum] = useState(1)
  // const [pageSize, setPageSize] = useState(15)

  const [disablePanTo, setDisablePanTo] = useState(false)

  const [isLockScreen, setIsLockScreen] = useState(false)

  const [historicalStatistic, setHistoricalStatistic] = useState<{
    distance: number
    time: number
    count: number
    averageSpeed: number
    maxSpeed: number
    maxAltitude: number
    minAltitude: number
    climbAltitude: number
    descendAltitude: number
  }>({
    distance: 0,
    time: 0,
    count: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    maxAltitude: 0,
    minAltitude: 0,
    climbAltitude: 0,
    descendAltitude: 0,
  })
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )
  const [localIds, setLocalIds] = useState<string[]>([])
  const [localLastTripStartTime, setLocalLastTripStartTime] = useState(0)
  const [initLocalData, setInitLocalData] = useState(false)

  const [latlon, setLatLon] = useState({
    lat: 0,
    lon: 0,
  })

  const dispatch = useDispatch<AppDispatch>()

  const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
    mapLayer: true,
    mapMode: true,
    roadColorFade: true,
    showAvatarAtCurrentPosition: false,
    showSpeedColor: true,
    cityName: true,
    cityBoundaries: true,
    tripTrackRoute: true,
    speedAnimation: false,
    turnOnVoice: false,
    showPositionMarker: false,
    trackSpeedColor: true,
    trackRouteColor: true,
    polylineWidth: true,
    speedColorLimit: true,
  })

  const { mapLayer, speedColorRGBs, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('trackRoutePage')
    console.log('dddddd', ml)

    const tempFeaturesList = {
      ...mapLayerFeaturesList,
      trackSpeedColor: !!ml.mapLayer?.showSpeedColor,
      trackRouteColor: !ml.mapLayer?.showSpeedColor,
      polylineWidth: !!ml.mapLayer?.tripTrackRoute,
      speedColorLimit: !!ml.mapLayer?.tripTrackRoute,
    }

    tempFeaturesList.trackSpeedColor = !ml.mapLayer?.tripTrackRoute
      ? false
      : tempFeaturesList.trackSpeedColor
    tempFeaturesList.trackRouteColor = !ml.mapLayer?.tripTrackRoute
      ? false
      : tempFeaturesList.trackRouteColor

    setMapLayerFeaturesList(tempFeaturesList)

    return ml
  }, [
    config.configure,
    config.country,
    config.connectionOSM,
    config.initConfigure,
  ])

  useEffect(() => {
    // loginSnackbarDebounce.current.increase(() => {
    // 	const { user } = store.getState()
    // 	console.log('user.isLogin', user.isLogin)
    // 	if (!user.isLogin) {
    // 		loginSnackbar.current.open()
    // 	}
    // }, 1000)
    setMounted(true)

    dispatch(layoutSlice.actions.setBottomNavigator(true))
    dispatch(layoutSlice.actions.setLayoutHeader(true))
    dispatch(layoutSlice.actions.setLayoutHeaderFixed(true))

    const init = async () => {
      const cl = await storage.global.get('currentLatlons')
      currentLatlons.current = cl || []

      const refreshMapSizeDebounce = new Debounce()
      window.addEventListener('resize', () => {
        refreshMapSizeDebounce.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      })

      // storage.tripPositions.deleteAll()
      setLocalLastTripStartTime(0)
      const tripPositions = (await storage.tripPositions.getAll())?.filter(
        (v) => Number(v.value?.status) >= 0
      )
      // console.log('GetTripHistoryPositions tripPositions.getAll', tripPositions)

      if (tripPositions.length) {
        setLocalLastTripStartTime(
          (await storage.global.get('localLastTripStartTime')) || 0
        )

        laodCount.current = tripPositions.length
        // let startTime = 0
        setLocalIds(
          tripPositions.map((v) => {
            // Number(v.value.startTime) > startTime && (startTime = Number(v.value.startTime))
            return v.value.id || ''
          })
        )
        // setLocalLastTripCreateTime(startTime)
      }
      setInitLocalData(true)

      // loadData()

      // storage.tripPositions.deleteAll()
      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          requestWakeLock()
        }
      })
    }
    init()
  }, [])

  useEffect(() => {
    if (user.isLogin) {
      dispatch(methods.vehicle.Init())
      dispatch(methods.journeyMemory.GetJMBaseDataList()).unwrap
    }
  }, [user.isLogin])

  useEffect(() => {
    dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
  }, [i18n.language])

  useEffect(() => {
    if (config.country && !loadedMap.current) {
      initMap()
    }
  }, [config.country])

  useEffect(() => {
    layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
    layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
    layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')
  }, [mapLayer?.mapMode])

  useEffect(() => {
    loadedMap.current = false
    zoom.current = 0
    initMap()

    // if (map.current) {
    //   const L: typeof Leaflet = (window as any).L
    //   layer.current = (L.tileLayer as any)
    //     .colorScale(
    //       mapUrl,
    //       // maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url || config.mapUrl,
    //       {
    //         // errorTileUrl: osmMap,
    //         // attribution: `&copy;`,
    //         isGrayscale: false,
    //       }
    //     )
    //     .addTo(map.current)
    //   // loadData()
    // }
  }, [
    mapUrl,
    config.showDetailedDataForMultipleHistoricalTrips,
    mapLayer?.roadColorFade,
  ])

  const zoom = useRef(0)
  const lastCenterPosition = useRef({
    lat: 0,
    lon: 0,
  })

  useEffect(() => {
    if (zoom.current) {
      return
    }
    if (latlon?.lat) {
      panToMap(
        {
          coords: {
            latitude: latlon.lat,
            longitude: latlon.lon,
          },
        } as any,
        true
      )
      map.current?.setZoom(zoom.current || 8)
      return
    }
    geo.position && map && panToMap(geo.position)
  }, [map.current, latlon])

  useEffect(() => {
    user.isInit &&
      loginSnackbarDebounce.current.increase(() => {
        const { user } = store.getState()
        console.log('user.isLogin', user.isLogin)
        if (user.isLogin) {
          loginSnackbar.current.close()
        } else {
          loginSnackbar.current.open()
        }
      }, 1500)
    if (user.isLogin && user.isInit) {
      console.log('user.isLogin', user.isLogin)
      // 以后要改！

      console.log('getTripStatistics', user)
      // setTimeout(() => {
      // }, 5500);
      // const init = async () => {

      // }
      // init()

      dispatch(
        methods.trip.GetTripHistoryData({
          loadCloudData: true,
          alert: true,
          cityDetails: true,
        })
      )
        .unwrap()
        .then((v) => {
          // dispatch(
          // 	methods.trip.GetTripStatistics({
          // 		loadCloudData: true,
          // 	})
          // )
        })
    }
  }, [user])

  useEffect(() => {
    // console.log("getTripHistoryPositions", map.current)
    if (
      user.isLogin &&
      initLocalData &&
      map.current &&
      trip.tripStatistics.length
    ) {
      // setTimeout(() => {
      // }, 500);
      const init = async () => {
        // console.log("getTripHistoryPositions", "开始", user.isLogin)
        // setTimeout(() => {
        //   getTripHistoryPositions()
        // }, 5500);
        // await getTripStatistics()

        const { config } = store.getState()
        // getHistoricalStatistic()
        console.log('getAllTripPositions', localIds)
        // await getTripHistoryPositions()
      }
      init()
    }
    // if (user.isLogin && initLocalData) {
    //   setTimeout(() => {
    //     getTripStatistics()
    //   }, 500);
    // }
  }, [user.isLogin, initLocalData, trip.tripStatistics, map.current])

  const requestWakeLock = async () => {
    try {
      // console.log('wakeLock', wakeLock)
      if (wakeLock.current) return
      wakeLock.current = await navigator.wakeLock.request('screen')
      console.log('Wake Lock is active!')
      setIsLockScreen(true)

      wakeLock.current.addEventListener('release', () => {
        console.log('Wake Lock has been released')
        setIsLockScreen(false)
      })
    } catch (err) {
      console.error(err)
      // console.log(`${err.name}, ${err.message}`)
    }
  }

  // selectedTripTypes: protoRoot.configure.Configure.Filter.IFilterItem['selectedTripTypes'],
  // selectedTripIds: protoRoot.configure.Configure.Filter.IFilterItem['selectedTripIds'],
  // startDate: protoRoot.configure.Configure.Filter.IFilterItem['startDate'],
  // endDate: protoRoot.configure.Configure.Filter.IFilterItem['endDate'],
  // selectedVehicleIds: protoRoot.configure.Configure.Filter.IFilterItem['selectedVehicleIds']

  const selectPolylineParamsMap = useRef<{
    [id: string]: ReturnType<RenderPolylineItemClickFuncReRender>
  }>({})

  const loadData = () => {
    loadDataDebounce.current.increase(async () => {
      const { config } = store.getState()
      const L: typeof Leaflet = (window as any).L

      console.log(
        'renderPolyline ffff filter1 GetTripStatistics',
        config.configure.filter?.trackRoute,
        trip.tripStatistics.length
      )
      if (!config.configure.filter?.trackRoute || !trip.tripStatistics.length)
        return

      const { selectedTripIds, speedRange, altitudeRange } =
        config.configure.filter?.trackRoute

      let tripIds: string[] = []

      let trips: protoRoot.trip.ITrip[] = []

      if (selectedTripIds?.length) {
        tripIds = selectedTripIds
      } else {
        trips = filterTripsForTrackRoutePage().filter(
          (v) => Number(v.status) >= 1
        )

        tripIds = trips.map((v) => v?.id || '')
      }
      await getHistoricalStatistic(tripIds)

      // let positions: protoRoot.trip.ITripPosition[] = []
      // showFullData
      // console.log('showFullData', showFullData)

      let fullData = mapLayer?.showSpeedColor || false

      if (
        speedRange?.min !== 0 ||
        speedRange?.max !== 380 ||
        altitudeRange?.min !== 0 ||
        altitudeRange?.max !== 8848
      ) {
        fullData = true
      }

      const tripPositions = await getTripHistoryPositions({
        ids: tripIds,
        fullData: fullData,
        authorId: user.userInfo?.uid,
      })

      // console.log('mapLayer?.cityName', mapLayer?.cityName)

      map.current &&
        renderPolyline({
          map: map.current,
          alert: true,

          filterAccuracy: 'High',
          speedRange: {
            min: speedRange?.min || 0,
            max: speedRange?.max || 380,
          },
          altitudeRange: {
            min: altitudeRange?.min || 0,
            max: altitudeRange?.max || 8848,
          },

          showTripTrackRoute: mapLayer?.tripTrackRoute || false,
          showCityName: mapLayer?.cityName || false,
          showCityBoundariesType: (mapLayer?.cityBoundaries || '') as any,

          trips: tripPositions,
          speedColor: mapLayer?.showSpeedColor
            ? 'auto'
            : getTrackRouteColor(
                (mapLayer?.trackRouteColor as any) || 'Red',
                false
              ),
          weight: Number(mapLayer?.polylineWidth),
          clickFunc({ params, reRender }) {
            console.log('clickFunc', params)
            delayClickPolyline.current = true
            setTimeout(() => {
              delayClickPolyline.current = false
            }, 300)

            if (selectPolylineIds.current.includes(params.tripId)) {
              selectPolylineIds.current = selectPolylineIds.current.filter(
                (sv) => sv !== params.tripId
              )
            } else {
              selectPolylineIds.current.push(params.tripId)
            }

            selectPolylineParamsMap.current[params.tripId] = reRender({
              ...params,
              weight:
                Number(mapLayer?.polylineWidth) +
                (selectPolylineIds.current.includes(params.tripId) ? 4 : 0),
            })

            forceUpdate()
          },
        })

      // Object.keys(polylines.current).forEach((v) => {
      // 	polylines.current[v].removeFrom(map.current)
      // 	polylines.current[v].removeEventListener('click')
      // 	delete polylines.current[v]
      // })
      // polylines.current = {}

      // if (!tripPositionsRef.current.length) {

      // 	if (tripPositions.length && L) {
      // 		tripPositionsRef.current = tripPositions
      // 	}
      // }
      // console.log(
      // 	'selectedTripTypes2 fffff GetTripStatistics',
      // 	selectedTripTypes,
      // 	trip.tripStatistics
      // )

      // let minLat = 0
      // let minLon = 0
      // let maxLat = 0
      // let maxLon = 0

      // tripPositions.forEach(async (v) => {
      // 	const latLngs: number[][] = []
      // 	const colors: string[] = []
      // 	v.positionList
      // 		?.filter((sv) => {
      // 			return !(Number(sv.speed || 0) < 0 || Number(sv.altitude || 0) < 0)
      // 		})
      // 		?.forEach((sv, i, arr) => {
      // 			;(!minLat || minLat > Number(sv.latitude)) &&
      // 				(minLat = Number(sv.latitude))
      // 			;(!minLon || minLon > Number(sv.longitude)) &&
      // 				(minLon = Number(sv.longitude))
      // 			;(!maxLat || maxLat < Number(sv.latitude)) &&
      // 				(maxLat = Number(sv.latitude))
      // 			;(!maxLon || maxLon < Number(sv.longitude)) &&
      // 				(maxLon = Number(sv.longitude))

      // 			latLngs.push(
      // 				getLatLng(
      // 					mapUrl,
      // 					sv.latitude || 0,
      // 					sv.longitude || 0
      // 				) as any
      // 			)
      // 			const speedColorLimit = (config.configure.speedColorLimit as any)[
      // 				(v?.type?.toLowerCase() || 'running') as any
      // 			]

      // 			colors.push(
      // 				getSpeedColor(
      // 					sv.speed || 0,
      // 					speedColorLimit.minSpeed,
      // 					speedColorLimit.maxSpeed,
      // 					speedColorRGBs
      // 				)
      // 			)
      // 		})

      // 	if (map.current) {
      // 		// console.log(
      // 		// 	'fTripPositions incompleteTripData',
      // 		// 	latLngs.length,
      // 		// 	colors.length,
      // 		// 	map.current
      // 		// )

      // 		const { latLngs, colors } = await getLatlngsAndColors(
      // 			{
      // 				id: v.id,
      // 				type: v.type,
      // 			},
      // 			v
      // 		)
      // 		// createPolyline(
      // 		// 	v?.id || '',
      // 		// 	latLngs,
      // 		// 	colors,
      // 		// 	showFullData ? 'polycolor' : 'polyline',
      // 		// 	1,
      // 		// 	map.current
      // 		// )

      // 		renderPolylineItem({
      // 			tripId: v.id || '',
      // 			map: map.current,
      // 			positions,
      // 		})

      // 		// delayClickPolyline.current = true
      // 		// setTimeout(() => {
      // 		//   delayClickPolyline.current = false
      // 		// }, 300)
      // 		// if (selectPolylineIds.current.includes(id + ';' + type)) {
      // 		//   selectPolylineIds.current = selectPolylineIds.current.filter(
      // 		//     (sv) => sv !== id + ';' + type
      // 		//   )
      // 		// } else {
      // 		//   selectPolylineIds.current.push(id + ';' + type)
      // 		// }
      // 		// createPolyline(id, latLngs, colors, type, match, map)
      // 	}
      // })

      // if (map.current) {
      // 	const tempLatLon = {
      // 		lat: (minLat + maxLat) / 2,
      // 		lon: (minLon + maxLon) / 2,
      // 	}

      // 	setLatLon({
      // 		...tempLatLon,
      // 	})
      // 	map.current.setView(
      // 		[tempLatLon.lat, tempLatLon.lon],
      // 		// [
      // 		//   120.3814, -1.09],
      // 		getZoom(minLat, minLon, maxLat, maxLon)
      // 	)
      // }

      // console.log('fffff', minLat, minLon, maxLat, maxLon)

      // if (loadingSnackbar.current) {
      // 	loadingSnackbar.current.close()
      // 	loadingSnackbar.current = undefined
      // }

      // if (showFullData) {
      // 	if (loadingSnackbar.current) {
      // 		loadingSnackbar.current.close()
      // 		loadingSnackbar.current = undefined
      // 	}

      // 	// console.log('fTripPositions incompleteTripData', incompleteTripData)

      // 	// fTripPositions.forEach((v) => {
      // 	// 	// const positions = formatPositionsStr(
      // 	// 	// 	Number(v.value.startTime),
      // 	// 	// 	v.value.positions || []
      // 	// 	// )
      // 	// 	// console.log('fTripPositions positions', positions)
      // 	// })

      // 	// console.log('fTripPositions', fTripPositions, selectedTripIds)
      // } else {
      // 	tripPositions.forEach(async (v, i) => {
      // 		if (!v.positions?.length) return

      // 		// let latlngs: number[][] = []

      // 		v?.positionList?.forEach((sv, si) => {
      // 			if (si === 0) {
      // 				return
      // 			}
      // 			const lv = v?.positionList?.[si - 1]
      // 			if (!lv) {
      // 				return
      // 			}
      // 			// console.log('tempUsedPositions lv.latitude', lv.latitude)
      // 			// if (Number(lv.latitude) < 0 || Number(lv.longitude) < 0) {
      // 			// 	console.log('tempUsedPositions lv', lv, v)
      // 			// }
      // 			;(!minLat || minLat > Number(lv.latitude)) &&
      // 				(minLat = Number(lv.latitude))
      // 			;(!minLon || minLon > Number(lv.longitude)) &&
      // 				(minLon = Number(lv.longitude))
      // 			;(!maxLat || maxLat < Number(lv.latitude)) &&
      // 				(maxLat = Number(lv.latitude))
      // 			;(!maxLon || maxLon < Number(lv.longitude)) &&
      // 				(maxLon = Number(lv.longitude))
      // 		})

      // 		if (map.current) {
      // 			const { latLngs, colors } = await getLatlngsAndColors(
      // 				{
      // 					id: v.id,
      // 					type: v.type,
      // 				},
      // 				v
      // 			)
      // 			// console.log(
      // 			// 	'tempUsedPositions',
      // 			// 	v.value?.id || '',
      // 			// 	latLngs.length,
      // 			// 	[],
      // 			// 	'polyline',
      // 			// 	match
      // 			// )
      // 			createPolyline(v?.id || '', latLngs, [], 'polyline', 1, map.current)
      // 		}

      // 		// })
      // 	})

      // 	console.log(
      // 		'filter1 tempUsedPositions max',
      // 		minLat,
      // 		maxLat,
      // 		minLon,
      // 		maxLon,
      // 		{
      // 			lat: (minLat + maxLat) / 2,
      // 			lon: (minLon + maxLon) / 2,
      // 		}
      // 	)
      // }
    }, 1000)
  }

  const getLatlngsAndColors = async (
    trip?: protoRoot.trip.ITrip,
    tripPositions?: protoRoot.trip.ITripPositions
  ) => {
    let positions: protoRoot.trip.ITripPosition[] = []
    if (!tripPositions || !trip?.type) {
      trip = await storage.trips.get(trip?.id || '')
      tripPositions = await storage.tripPositions.get(trip?.id || '')
      positions = formatPositionsStr(
        Number(trip.startTime),
        tripPositions.positions || []
      )
    } else {
      positions = formatPositionsStr(
        Number(trip.startTime),
        tripPositions.positions || []
      )
    }
    // console.log('tripPositions selectPolylineIds', positions)

    const latLngs: number[][] = []
    const colors: string[] = []
    positions
      ?.filter((sv) => {
        return !(Number(sv.speed || 0) < 0 || Number(sv.altitude || 0) < 0)
      })
      ?.forEach((sv, i, arr) => {
        latLngs.push(
          getLatLng(mapUrl, sv.latitude || 0, sv.longitude || 0) as any
        )
        const speedColorLimit = (
          config.configure.general?.speedColorLimit as any
        )[(trip?.type?.toLowerCase() || 'running') as any]

        sv.speed &&
          colors.push(
            getSpeedColor(
              sv.speed || 0,
              speedColorLimit.minSpeed,
              speedColorLimit.maxSpeed,
              speedColorRGBs
            )
          )
      })
    return {
      latLngs,
      colors,
    }
  }

  const delayClickPolyline = useRef(false)

  const createPolyline = (
    id: string,
    latLngs: number[][],
    colors: string[],
    type: 'polyline' | 'polycolor',
    match = 1,
    map: Leaflet.Map | undefined
  ) => {
    const L: typeof Leaflet = (window as any).L

    // console.log('selectPolylineIds.createPolyline', id, latLngs, colors, type)
    if (!map || !L) return
    polylines.current[id || '']?.removeEventListener('click')
    polylines.current[id || '']?.removeFrom(map)
    delete polylines.current[id || '']

    if (type === 'polyline') {
      polylines.current[id || ''] = L.polyline(latLngs as any, {
        color: getTrackRouteColor(
          (mapLayer?.trackRouteColor as any) || 'Red',
          match === 0 ? false : match === -1 ? true : false
        ),
        weight:
          Number(mapLayer?.polylineWidth) +
          (selectPolylineIds.current.includes(id + ';' + type) ? 4 : 0),
        smoothFactor: router.query.sf ? Number(router.query.sf) : 1,
        noClip: true,
      }).addTo(map)

      // console.log(
      // 	'tempUsedPositions',
      // 	id,
      // 	match,
      // 	getTrackRouteColor(
      // 		(config.configure?.trackRouteColor as any) || 'Red',
      // 		match === 0 ? false : match === -1 ? true : false
      // 	),
      // 	polylines.current[id || '']
      // )
    }

    if (type === 'polycolor') {
      polylines.current[id || ''] = (L as any)
        .polycolor(latLngs, {
          colors: colors,
          useGradient: true,
          weight:
            Number(mapLayer?.polylineWidth) +
            (selectPolylineIds.current.includes(id + ';' + type) ? 4 : 0),
        })
        .addTo(map)
    }

    polylines.current[id || ''].addEventListener('click', () => {
      delayClickPolyline.current = true
      setTimeout(() => {
        delayClickPolyline.current = false
      }, 300)
      if (selectPolylineIds.current.includes(id + ';' + type)) {
        selectPolylineIds.current = selectPolylineIds.current.filter(
          (sv) => sv !== id + ';' + type
        )
      } else {
        selectPolylineIds.current.push(id + ';' + type)
      }
      createPolyline(id, latLngs, colors, type, match, map)
    })
  }

  const getTripHistoryPositionsPageNum = useRef(1)
  const getTripHistoryPositionsAQ = useRef(
    new AsyncQueue({
      maxQueueConcurrency: 5,
    })
  )

  const getHistoricalStatistic = async (ids: string[]) => {
    const { trip, config } = store.getState()
    if (!config.configure.filter?.trackRoute) return

    // const { selectedTripIds } = config.configure.filter?.trackRoute

    let s = trip.tripStatistics?.filter((v) => v.type === 'All')?.[0]

    // if (!selectedTripTypes.length) {
    let distance = 0
    let time = 0
    let count = 0
    let maxSpeed = 0
    let maxAltitude = 0
    let minAltitude = 0
    let climbAltitude = 0
    let descendAltitude = 0

    s?.list?.forEach((v) => {
      if (!ids.includes(v.id || '')) return

      // if (selectedTripIds?.length && !selectedTripIds.includes(String(v.id))) {
      // 	return
      // }
      distance += Number(v.statistics?.distance) || 0
      count += 1
      time += Number(v.endTime) - Number(v.startTime) || 0
      ;(maxSpeed === 0 || maxSpeed < (v.statistics?.maxSpeed || 0)) &&
        (maxSpeed = v.statistics?.maxSpeed || 0)
      ;(maxAltitude === 0 || maxAltitude < (v.statistics?.maxAltitude || 0)) &&
        (maxAltitude = v.statistics?.maxAltitude || 0)
      ;(minAltitude === 0 || minAltitude > (v.statistics?.minAltitude || 0)) &&
        (minAltitude = v.statistics?.minAltitude || 0)

      climbAltitude += Number(v.statistics?.climbAltitude) || 0
      descendAltitude += Number(v.statistics?.descendAltitude) || 0

      // console.log('historicalStatistic 1111', v.statistics)
    })

    distance = Math.round((distance || 0) / 100) / 10 || 0
    // console.log('getTDistance', td)
    const obj = {
      ...historicalStatistic,
      distance,
      count,
      time,
      averageSpeed: (distance * 1000) / time,
      maxSpeed,
      maxAltitude,
      minAltitude,
      climbAltitude,
      descendAltitude,
    }
    console.log('historicalStatistic', obj)
    setHistoricalStatistic(obj)
    // }
  }

  const polylines = useRef<{
    [id: string]: any
  }>({})

  useEffect(() => {
    if (map.current) {
      ;(map.current as any).mapUrl = mapUrl
      ;(map.current as any).speedColorRGBs = speedColorRGBs
    }
  }, [map.current, speedColorRGBs, mapUrl])

  useEffect(() => {
    if (config.initConfigure && loadedMap.current) {
      // loadedMap.current = false

      // console.log('loadData')
      // console.log('setConfig', config.initConfigure, [
      //   mapLayer?.cityBoundaries,
      //   mapLayer?.cityName,
      //   mapLayer?.polylineWidth,
      //   mapLayer?.showSpeedColor,
      //   // mapLayer?.polylineWidth,
      //   // mapLayer?.polylineWidthSelectedTrip,
      //   config.configure.filter?.trackRoute?.selectedTripTypes,
      //   config.configure.filter?.trackRoute?.selectedTripIds,
      //   config.configure.filter?.trackRoute?.startDate,
      //   config.configure.filter?.trackRoute?.endDate,
      //   config.configure.filter?.trackRoute?.selectedVehicleIds,
      //   config.configure.filter?.trackRoute?.selectedJmIds,
      //   config.configure.filter?.trackRoute?.distanceRange,
      //   config.configure.filter?.trackRoute?.speedRange,
      //   config.configure.filter?.trackRoute?.altitudeRange,
      //   // config.configure.filter?.trackRoute?.longestDistance,
      //   // config.configure.filter?.trackRoute?.shortestDistance,
      //   config.configure.filter?.trackRoute?.showCustomTrip,
      //   mapLayer?.trackRouteColor,
      //   trip.tripStatistics,
      //   loadedMap.current,
      //   config.initConfigure,
      // ])
      loadData()
    }
  }, [
    mapLayer?.cityBoundaries,
    mapLayer?.cityName,
    mapLayer?.polylineWidth,
    mapLayer?.showSpeedColor,
    mapLayer?.polylineWidth,
    // mapLayer?.polylineWidthSelectedTrip,
    config.configure.filter?.trackRoute?.selectedTripTypes,
    config.configure.filter?.trackRoute?.selectedTripIds,
    config.configure.filter?.trackRoute?.startDate,
    config.configure.filter?.trackRoute?.endDate,
    config.configure.filter?.trackRoute?.selectedVehicleIds,
    config.configure.filter?.trackRoute?.selectedJmIds,
    config.configure.filter?.trackRoute?.distanceRange,
    config.configure.filter?.trackRoute?.speedRange,
    config.configure.filter?.trackRoute?.altitudeRange,
    config.configure.filter?.trackRoute?.showCustomTrip,
    mapLayer?.trackRouteColor,
    trip.tripStatistics,
    loadedMap.current,
    config.initConfigure,
  ])

  // console.log('dddddd')

  const initMap = () => {
    const L: typeof Leaflet = (window as any).L

    if (L && !loadedMap.current && geo.position?.coords?.latitude) {
      console.log('开始加载！')
      let lat = geo.position?.coords.latitude || 0
      let lon = geo.position?.coords.longitude || 0
      if (map.current) {
        map.current?.remove()
        marker.current?.remove()
        map.current = undefined
        marker.current = undefined
      }
      if (!map.current) {
        map.current = L.map('tp-map', {
          renderer: L.canvas(),
          preferCanvas: true,
          zoomControl: false,
          minZoom: 3,
          maxZoom: 18,
          trackResize: false,
          zoomDelta: 0.5,
          zoomSnap: 0.5,

          zoom: 15,
          attributionControl: false,
          // center: [Number(res?.dat a?.lat), Number(res?.data?.lon)],
        })

        // 检测地址如果在中国就用高德地图
        map.current.setView(
          [lat, lon],
          // [
          //   120.3814, -1.09],
          15
        )
        // map.current.addEventListener('zoom', (v) => {
        //   // 8 18
        //   // 325.8 251837.9
        // 	console.log(
        // 		'zoom',
        // 		getDistance(22.316587, 114.172867, 22.316448, 114.176027),
        // 		getDistance(30.519681, 104.078979, 30.496018, 106.704712),
        // 		getDistance(29.413432,105.596595, 29.411937,105.615134),
        // 		v,
        // 		map.current?.getZoom()
        // 	)
        // })
        // if (config.country === 'China') {
        // 	(L as any).tileLayer.chinaProvider('GaoDe.Normal.Map')
        // } else {
        // console.log('config.mapUrl', config.mapUrl)
        layer.current = (L.tileLayer as any)
          .colorScale(
            mapUrl,
            // maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url || config.mapUrl,
            {
              // errorTileUrl: osmMap,
              // attribution: `&copy;`,
              isGrayscale: false,
            }
          )
          .addTo(map.current)

        console.log('layer.current', layer.current)
        mapLayer && roadColorFade(mapLayer, layer.current)

        console.log('layer', layer)

        layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
        layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
        layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')

        createDistanceScaleControl(
          map.current,
          config.deviceType === 'Mobile' ? 80 : 100,
          {
            position: 'bottomleft',
            y: '5px',
          }
        )

        console.log('layer', layer)
        // }
        //定义一个地图缩放控件
        // var zoomControl = L.control.zoom({ position: 'topleft' })
        // //将地图缩放控件加载到地图
        // m.addControl(zoomControl)
        // m.removeControl(zoomControl)

        // const speedColorLimit = (config.configure.speedColorLimit as any)[
        // 	'Drive'
        // ]
        // console.log(
        // 	'currentLatlons.current',
        // 	currentLatlons.current.map((v) => [v.lat, v.lon]),
        // 	currentLatlons.current.map((v) =>
        // 		getSpeedColor(
        // 			50,
        // 			speedColorLimit.minSpeed,
        // 			speedColorLimit.maxSpeed,
        // 			speedColorRGBs
        // 		)
        // 	)
        // )

        // polylines.current['currentLatlons'] = (L as any)
        // 	.polycolor(latLngs, {
        // 		colors: colors,
        // 		useGradient: true,
        // 		weight:
        // 			Number(
        // 				mapLayer?.polylineWidthSelectedTrip
        // 			) + (selectPolylineIds.current.includes(id + ';' + type) ? 4 : 0),
        // 	})
        // 	.addTo(map)

        map.current.on('click', (e) => {
          // let popLocation = e.latlng
          // console.log(popLocation, {
          // 	latitude: Math.round(popLocation.lat * 1000000) / 1000000,
          // 	longitude: Math.round(popLocation.lng * 1000000) / 1000000,
          // })

          // console.log('click', currentLatlons.current)

          // currentLatlons.current.push(deepCopy(popLocation))

          // console.log('click', popLocation, currentLatlons.current)

          // storage.global.setSync('currentLatlons', currentLatlons.current)
          // // L.popup()
          // // 	.setLatLng(popLocation)
          // // 	.setContent(
          // // 		`${Math.round(popLocation.lat * 1000000) / 1000000} - ${
          // // 			Math.round(popLocation.lng * 1000000) / 1000000
          // // 		}`
          // // 	)
          // // 	.openOn(map.current)

          // dispatch(
          // 	geoSlice.actions.setSelectPosition({
          // 		latitude: Math.round(popLocation.lat * 1000000) / 1000000,
          // 		longitude: Math.round(popLocation.lng * 1000000) / 1000000,
          // 	})
          // )
          console.log(
            'selectPolylineIds.current clickFunc',
            delayClickPolyline.current,
            selectPolylineParamsMap.current
          )

          if (delayClickPolyline.current) return

          Object.keys(selectPolylineParamsMap.current).forEach(async (id) => {
            const params = await selectPolylineParamsMap.current[id]
            params.remove()
            renderPolylineItem({
              params: {
                ...params.params,
                weight: Number(mapLayer?.polylineWidth),
                filterAccuracy: 'High',
              },
              clickFunc: params.clickFunc,
            })
          })

          selectPolylineParamsMap.current = {}
          selectPolylineIds.current = []
          forceUpdate()
        })
        map.current.on('zoom', (e) => {
          console.log('zoomEvent', e.target._lastCenter, e.target._zoom)
          zoom.current = e.target._zoom
          lastCenterPosition.current = {
            lat: e.target._lastCenter.lat,
            lon: e.target._lastCenter.lng,
          }
        })
        // map.current.on('movestart', (e) => {
        // 	!startTrip && setDisablePanTo(true)
        // })
        // map.current.on('moveend', (e) => {
        // 	console.log('moveend zoomEvent', e, e.target._lastCenter)
        // 	// !startTrip && setDisablePanTo(true)
        // })
      }

      loadedMap.current = true
      // console.log('map', map)
    }
  }

  const panToMap = (position: GeolocationPosition, allowPanto?: boolean) => {
    const L: typeof Leaflet = (window as any).L

    console.log('panToMap', position, map.current, L, marker.current)
    if (map.current && L) {
      const [lat, lon] = getLatLng(
        mapUrl,
        position?.coords.latitude || 0,
        position?.coords.longitude || 0
      )

      console.log('panto', !disablePanTo || allowPanto, [lat, lon])

      if (!disablePanTo || allowPanto) {
        map.current.panTo([lat, lon], {
          animate: false,
        })
      }
    }
  }

  const getDetailedPositionsOfTrip = async (
    unPulledIds: string[],
    loadCount: number,
    totalCount: number
  ) => {
    const tripPositions = await getAllTripPositions({
      ids: unPulledIds,
      pageSize: 10,
      onload(totalCount, loadCount) {
        console.log('getAllTripPositions', totalCount, loadCount)
      },
      loadingSnackbar: true,
      fullData: true,
    })
    console.log(
      'fTripPositions getDetailedPositionsOfTrip',
      tripPositions,
      unPulledIds
    )

    // // console.log("GetTripHistoryPositionsresres unPulledIds", unPulledIds)

    // // console.log('GetTripHistoryPositions', unPulledIds)
    // if (unPulledIds.length === 0) {
    // 	return tripPositions
    // }

    // const pageSize = 6

    // const res = await httpApi.v1.GetTripHistoryPositions({
    // 	shareKey: String(sk || ''),
    // 	// pageNum,
    // 	pageNum: 1,
    // 	pageSize: pageSize,
    // 	type: 'All',
    // 	ids: unPulledIds.slice(0, pageSize),
    // 	timeLimit: [0, 32503651200],
    // 	fullData: true,
    // 	// timeLimit: [localLastTripStartTime + 1, 32503651200],
    // })

    // // console.log('GetTripHistoryPositions', res)

    // if (res.code === 200) {
    // 	res.data.list?.forEach((v) => {
    // 		if (v.id) {
    // 			tripPositions.push(v)
    // 			storage.tripPositions.setSync(v.id, v)
    // 		}
    // 	})

    // 	loadCount =
    // 		loadCount + pageSize > totalCount ? totalCount : loadCount + pageSize

    // 	loadingSnackbar.current?.setMessage(
    // 		t('loadedData', {
    // 			ns: 'prompt',
    // 			percentage:
    // 				String(
    // 					loadCount && totalCount
    // 						? Math.floor((loadCount / totalCount || 0) * 100)
    // 						: 0
    // 				) + '%',
    // 		})
    // 	)

    // 	const ids = unPulledIds.slice(pageSize, unPulledIds.length)
    // 	if (ids.length !== 0) {
    // 		tripPositions = tripPositions.concat(
    // 			await getDetailedPositionsOfTrip(ids, loadCount, totalCount)
    // 		)
    // 	}
    // }
    return tripPositions
  }

  const selectPolylineId =
    selectPolylineIds.current?.[selectPolylineIds.current.length - 1]?.split(
      ';'
    )?.[0] || ''

  const trips = useMemo(() => {
    const trips = trip.tripStatistics?.filter((v) => v.type === 'All')

    return trips[0]?.list || []
  }, [trip.tripStatistics])

  return (
    <>
      <Head>
        <title>
          {t('pageTitle', {
            ns: 'trackRoutePage',
          }) +
            ' - ' +
            t('appTitle', {
              ns: 'common',
            })}
        </title>
        <meta
          name="description"
          content={t('subtitle', {
            ns: 'trackRoutePage',
          })}
        />
      </Head>
      <div className="track-route-page">
        <div className="tp-main">
          <ButtonsComponent
            filter
            indexPage
            currentPosition
            layer={false}
            onCurrentPosition={() => {
              setDisablePanTo(true)
              geo.position && panToMap(geo.position, true)
            }}
            onFilter={() => {
              dispatch(
                layoutSlice.actions.setOpenTripFilterModal(
                  !layout.openTripFilterModal
                )
              )
            }}
          ></ButtonsComponent>
          <div
            id="tp-map"
            className={
              (startTrip ? 'start ' : ' ') +
              config.deviceType +
              ' ' +
              (mapLayer && isRoadColorFade(mapLayer) ? 'roadColorFade' : '')
            }
          >
            <LayerButtons
              mapLayer={mapLayer}
              style={{
                left: '20px',
                top: '60px',
                // bottom: selectPolylineId ? '240px' : '160px',
              }}
              modalConfig={{
                vertical: 'Top',
                horizontal: 'Left',
                offsetX: '20px',
                offsetY: '60px',
              }}
              mapLayerType={mapLayerType}
              featuresList={mapLayerFeaturesList}
            ></LayerButtons>
          </div>
          {/* <FiexdWeatherComponent></FiexdWeatherComponent> */}
          <div className="tp-statistics">
            {mounted && (
              <>
                {selectPolylineId ? (
                  <saki-button
                    ref={bindEvent({
                      tap: () => {
                        loadModal('TripHistory', () => {
                          dispatch(
                            layoutSlice.actions.setOpenTripItemModal({
                              visible: true,
                              id: selectPolylineId,
                            })
                          )
                          dispatch(
                            layoutSlice.actions.setOpenTripHistoryModal(true)
                          )
                        })
                      },
                    })}
                    padding="10px 16px"
                    margin="16px 0 0 0"
                    bg-color="var(--saki-default-color)"
                    bg-hover-color="var(--saki-default-hover-color)"
                    bg-active-color="var(--saki-default-active-color)"
                    border="none"
                    type="Normal"
                  >
                    <div className="tp-view-details">
                      <div className="tp-vd-top">
                        <span className="value">
                          {t('viewDetails', {
                            ns: 'trackRoutePage',
                          })}
                        </span>
                      </div>
                      <div className="tp-vd-bottom">
                        <span className="value">{selectPolylineId}</span>
                      </div>
                    </div>
                  </saki-button>
                ) : (
                  ''
                )}
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      if (
                        config.showDetailedDataForMultipleHistoricalTrips &&
                        config.configure.filter?.trackRoute?.selectedTripIds
                          ?.length
                      ) {
                        dispatch(
                          layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
                            true
                          )
                        )

                        return
                      }
                      loadModal('TripHistory', () => {
                        dispatch(
                          layoutSlice.actions.setOpenTripHistoryModal(true)
                        )
                      })
                    },
                  })}
                  padding="10px 14px"
                  margin="16px 0 0 0"
                  bg-color="#2d3646"
                  bg-hover-color="#242b37"
                  bg-active-color="#151920"
                  border="none"
                  type="Normal"
                  // box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
                >
                  <div className="tp-s-content">
                    <div className="tp-s-c-distance">
                      <span className="value">
                        {historicalStatistic.distance}
                      </span>
                      <span className="name">km</span>
                    </div>
                    <div className="tp-s-c-bottom">
                      <span className="value">
                        {/* {t('durationText', {
												ns: 'tripPage',
												num:
													historicalStatistic.time <= 0
														? 0
														: Math.round(
																(historicalStatistic.time / 3600) * 100
														  ) / 100 || 0,
											})} */}
                        {formatDurationI18n(
                          historicalStatistic.time <= 0
                            ? 0
                            : historicalStatistic.time || 0
                        )}
                      </span>
                      <span className="value"> · </span>
                      <span className="value">
                        {t('tripsCount', {
                          ns: 'tripPage',
                          num: historicalStatistic.count,
                        })}
                      </span>
                    </div>
                  </div>
                </saki-button>
              </>
            )}
          </div>
        </div>

        {mounted &&
        config.showDetailedDataForMultipleHistoricalTrips &&
        config.configure.filter?.trackRoute?.selectedTripIds?.length ? (
          <saki-modal
            ref={bindEvent({
              close() {
                dispatch(
                  layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
                    false
                  )
                )
              },
            })}
            width="100%"
            height={config.deviceType === 'Mobile' ? '100%' : 'auto'}
            max-width={config.deviceType === 'Mobile' ? '100%' : '500px'}
            max-height={config.deviceType === 'Mobile' ? '100%' : 'auto'}
            mask
            border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
            border={config.deviceType === 'Mobile' ? 'none' : ''}
            mask-closable="false"
            background-color="#fff"
            visible={layout.openHistoricalTripsDetailedDataModal}
          >
            <saki-modal-header
              // border
              close-icon={true}
              right-width={'56px'}
              ref={bindEvent({
                close() {
                  // console.log('setOpenTripHistoryModal')
                  dispatch(
                    layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
                      false
                    )
                  )
                },
              })}
              title={t('pageTitle')}
            >
              <div
                style={{
                  margin: '0 10px 0 0',
                }}
                slot="right"
              >
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      loadModal('TripHistory', () => {
                        dispatch(
                          layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
                            false
                          )
                        )
                        dispatch(
                          layoutSlice.actions.setOpenTripHistoryModal(true)
                        )
                      })
                    },
                  })}
                  type="CircleIconGrayHover"
                >
                  <saki-icon color="#666" type="TripRoute"></saki-icon>
                </saki-button>
              </div>
            </saki-modal-header>
            <div className="tp-modal-main">
              <div className="ti-distance">
                <div className="ti-d-value">
                  <span>{historicalStatistic.distance}</span>
                </div>
                <div className="ti-d-unit">km</div>
                <div className="ti-d-tip">
                  {t('tripsCount', {
                    ns: 'tripPage',
                    num: historicalStatistic.count,
                  })}
                </div>
              </div>
              <div className="ti-color">
                <div
                  style={{
                    color: speedColorRGBs[0],
                  }}
                  className="ti-c-min"
                >
                  {t('slowest', {
                    ns: 'tripPage',
                  })}
                </div>
                <div
                  style={{
                    background: `linear-gradient(45deg, ${speedColorRGBs[0]},${
                      speedColorRGBs[speedColorRGBs.length - 1]
                    })`,
                  }}
                  className="ti-c-line"
                ></div>
                <div
                  style={{
                    color: speedColorRGBs[speedColorRGBs.length - 1],
                  }}
                  className="ti-c-max"
                >
                  {t('fastest', {
                    ns: 'tripPage',
                  })}
                </div>
              </div>
              <div className={'ti-data ' + config.lang}>
                <div className="ti-d-top">
                  <div className="ti-d-item">
                    <span className="value">
                      {(historicalStatistic.maxSpeed || 0) <= 0
                        ? 0
                        : Math.round(
                            ((historicalStatistic.maxSpeed || 0) * 3600) / 100
                          ) / 10}
                    </span>
                    <span className="name">
                      {t('maxSpeed', {
                        ns: 'tripPage',
                      }) + ' (km/h)'}
                    </span>
                  </div>
                  <div className="ti-d-item time">
                    <span className="value">
                      {historicalStatistic.time > 0
                        ? formatDurationI18n(historicalStatistic.time)
                        : t('unfinished', {
                            ns: 'tripPage',
                          })}
                    </span>
                    <span className="name">
                      {t('duration', {
                        ns: 'tripPage',
                      })}
                    </span>
                  </div>
                  <div className="ti-d-item">
                    <span className="value">
                      {(historicalStatistic.maxAltitude || 0) <= 0
                        ? 0
                        : Math.round(
                            (historicalStatistic.maxAltitude || 0) * 10
                          ) / 10}
                    </span>
                    <span className="name">
                      {t('maxAltitude', {
                        ns: 'tripPage',
                      }) + ' (m)'}
                    </span>
                  </div>
                </div>
                <div className={'ti-d-bottom ' + config.deviceType}>
                  <span className="ti-d-b-item">
                    <span>
                      {t('averageSpeed', {
                        ns: 'tripPage',
                      }) + ' '}
                    </span>
                    <span>
                      {Math.round(
                        ((historicalStatistic.averageSpeed || 0) * 3600) / 100
                      ) / 10}{' '}
                      km/h
                    </span>
                  </span>
                  {/* <span
												className='ti-d-b-item'
												style={{
													margin: '0 6px',
												}}
											>
												-
											</span> */}
                  <span className="ti-d-b-item">
                    <span>
                      {t('averageAltitude', {
                        ns: 'tripPage',
                      }) + ' '}
                    </span>
                    <span>
                      {Math.round(
                        (((historicalStatistic.maxAltitude || 0) -
                          (historicalStatistic.minAltitude || 0)) /
                          2 +
                          (historicalStatistic.minAltitude || 0)) *
                          10
                      ) / 10}{' '}
                      m
                    </span>
                  </span>
                  {/* <span
												className='ti-d-b-item'
												style={{
													margin: '0 6px',
												}}
											>
												-
											</span> */}
                  <span className="ti-d-b-item">
                    <span>
                      {t('minAltitude', {
                        ns: 'tripPage',
                      }) + ' '}
                    </span>
                    <span>
                      {Math.round((historicalStatistic.minAltitude || 0) * 10) /
                        10}{' '}
                      m
                    </span>
                  </span>

                  <span className="ti-d-b-item">
                    <span>
                      {t('climbAltitude', {
                        ns: 'tripPage',
                      }) + ' '}
                    </span>
                    <span>
                      {Math.round(
                        (historicalStatistic.climbAltitude || 0) * 10
                      ) / 10}{' '}
                      m
                    </span>
                  </span>

                  <span className="ti-d-b-item">
                    <span>
                      {t('descendAltitude', {
                        ns: 'tripPage',
                      }) + ' '}
                    </span>
                    <span>
                      {Math.round(
                        (historicalStatistic.descendAltitude || 0) * 10
                      ) / 10}{' '}
                      m
                    </span>
                  </span>
                </div>
              </div>

              <saki-button
                ref={bindEvent({
                  tap: () => {
                    loadModal('TripHistory', () => {
                      dispatch(
                        layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
                          false
                        )
                      )
                      dispatch(
                        layoutSlice.actions.setOpenTripHistoryModal(true)
                      )
                    })
                  },
                })}
                padding="10px 18px"
                margin="10px 0 0"
                type="Primary"
              >
                <saki-icon
                  margin="2px 6px 0 0"
                  color="#fff"
                  type="TripRoute"
                ></saki-icon>
                <span className="text-elipsis">
                  {t('tripHistory', {
                    ns: 'settings',
                  })}
                </span>
              </saki-button>
            </div>
            {/* {config.showDetailedDataForMultipleHistoricalTrips &&
						config.trackRoute.selectedTripIds.length ? (
							<>
								<div className='tp-s-c-bottom-info'>
									<span className='value'>
										{t('averageSpeed') +
											' ' +
											Math.round(
												((historicalStatistic.averageSpeed || 0) * 3600) / 100
											) /
												10 +
											'km/h'}
									</span>
									<span className='value'> · </span>
									<span className='value'>
										{t('maxSpeed') +
											' ' +
											Math.round(
												((historicalStatistic.maxSpeed || 0) * 3600) / 100
											) /
												10 +
											'km/h'}
									</span>
								</div>
								<div className='tp-s-c-bottom-info'>
									<span className='value'>
										{t('maxAltitude') +
											' ' +
											Math.round((historicalStatistic.maxAltitude || 0) * 10) /
												10 +
											'm'}
									</span>
									<span className='value'> · </span>
									<span className='value'>
										{t('minAltitude') +
											' ' +
											Math.round((historicalStatistic.minAltitude || 0) * 10) /
												10 +
											'm'}
									</span>
								</div>
								<div className='tp-s-c-bottom-info'>
									<span className='value'>
										{t('climbAltitude') +
											' ' +
											Math.round(
												(historicalStatistic.climbAltitude || 0) * 10
											) /
												10 +
											'm'}
									</span>
									<span className='value'> · </span>
									<span className='value'>
										{t('descendAltitude') +
											' ' +
											Math.round(
												(historicalStatistic.descendAltitude || 0) * 10
											) /
												10 +
											'm'}
									</span>
								</div>
							</>
						) : (
							''
						)} */}
          </saki-modal>
        ) : (
          ''
        )}

        <FilterComponent
          visible={layout.openTripFilterModal}
          onclose={() => {
            dispatch(layoutSlice.actions.setOpenTripFilterModal(false))
          }}
          journeyMemory
          selectJmIds={config.configure.filter?.trackRoute?.selectedJmIds || []}
          onLoad={(fc, trips) => {
            console.log('FilterTrips onload', fc, trips)

            const f = {
              ...config.configure['filter'],
            }

            f &&
              dispatch(
                methods.config.SetConfigure({
                  ...config.configure,
                  filter: {
                    ...f,
                    trackRoute: {
                      ...f['trackRoute'],
                      startDate: fc.startDate,
                      endDate: fc.endDate,
                      selectedVehicleIds: fc.selectedVehicleIds,
                      selectedJmIds: fc.selectedJmIds,
                      selectedTripTypes: fc.selectedTripTypes,
                      selectedTripIds: fc.selectedTripIds,
                      distanceRange: fc.distanceRange,
                      speedRange: fc.speedRange,
                      altitudeRange: fc.altitudeRange,
                      showFullData: fc.showFullData,
                    },
                  },
                })
              )

            dispatch(layoutSlice.actions.setOpenTripFilterModal(false))
          }}
          dataList
          trips={trips}
          selectTripIds={
            config.configure.filter?.trackRoute?.selectedTripIds || []
          }
          selectTypes={
            config.configure.filter?.trackRoute?.selectedTripTypes || []
          }
          distanceFilter
          distanceRange={{
            min:
              Number(config.configure.filter?.trackRoute?.distanceRange?.min) ||
              0,
            max:
              Number(config.configure.filter?.trackRoute?.distanceRange?.max) ||
              500,
          }}
          speedFilter
          speedRange={{
            min:
              Number(config.configure.filter?.trackRoute?.speedRange?.min) || 0,
            max:
              Number(config.configure.filter?.trackRoute?.speedRange?.max) ||
              380,
          }}
          altitudeFilter
          altitudeRange={{
            min:
              Number(config.configure.filter?.trackRoute?.altitudeRange?.min) ||
              0,
            max:
              Number(config.configure.filter?.trackRoute?.altitudeRange?.max) ||
              8848,
          }}
          date
          startDate={config.configure.filter?.trackRoute?.startDate || ''}
          endDate={config.configure.filter?.trackRoute?.endDate || ''}
          selectVehicle
          selectVehicleIds={
            config.configure.filter?.trackRoute?.selectedVehicleIds || []
          }
          customTripSwitch
          showCustomTrip={
            config.configure.filter?.trackRoute?.showCustomTrip || false
          }
          showCustomTripSwitch={
            config.configure.filter?.trackRoute?.showCustomTrip || false
          }
          fullDataSwitch={false}
          showFullDataSwitch={
            config.configure.filter?.trackRoute?.showFullData || false
          }
        />
      </div>
    </>
  )
}
TrackRoutePage.getLayout = getLayout

export async function getStaticPaths() {
  return {
    paths:
      process.env.OUTPUT === 'export'
        ? languages.map((v) => {
            return {
              params: {
                lang: v,
              },
            }
          })
        : [],
    fallback: true,
  }
}

export async function getStaticProps({
  params,
  locale,
}: {
  params: {
    lang: string
  }
  locale: string
}) {
  process.env.OUTPUT === 'export' && changeLanguage(params.lang as any)

  return {
    props: {
      lang: params.lang || defaultLanguage,
    },
  }
}

export default TrackRoutePage
