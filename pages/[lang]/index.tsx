import Head from 'next/head'
import TripLaout, { getLayout } from '../../layouts/Trip'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../../components/Footer'
import store, {
  RootState,
  AppDispatch,
  layoutSlice,
  useAppDispatch,
  methods,
  apiSlice,
  geoSlice,
} from '../../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar, alert } from '@saki-ui/core'
import { Debounce, deepCopy, NyaNyaWasm, QueueLoop } from '@nyanyajs/utils'
import {
  getRegExp,
  copyText,
  getRandomPassword,
  getSpeedColor,
  getDistance,
  formatTime,
  getLatLng,
  formatDistance,
  roadColorFade,
  formatPositionsStr,
  getTimeLimit,
  toFixed,
  getLatLngGcj02ToWgs84,
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
  configSlice,
  eventListener,
  getMapLayer,
  osmMap,
  rnJSBridge,
} from '../../store/config'
import { storage } from '../../store/storage'
import NoSSR from '../../components/NoSSR'
import md5 from 'blueimp-md5'
import ButtonsComponent from '../../components/Buttons'
import {
  changeLanguage,
  defaultLanguage,
  languages,
} from '../../plugins/i18n/i18n'
import { initTripCity, Statistics, tripSlice } from '../../store/trip'
import DashboardComponent, { DashboardLayer } from '../../components/Dashboard'

import * as geolib from 'geolib'
import { getIconType } from '../../components/Vehicle'
import {
  bindRealTimePositionListMarkerClickEvent,
  clearRealTimePositionListMarker,
  createMyPositionMarker,
  initSyncPosition,
  positionSlice,
} from '../../store/position'
import FiexdWeatherComponent from '../../components/FiexdWeather'
import {
  createDistanceScaleControl,
  getZoomDistanceScale,
} from '../../plugins/map'
import { loadModal } from '../../store/layout'
import { LayerButtons } from '../../components/MapLayer'

let tempTimer: any

const TripPage = () => {
  const { t, i18n } = useTranslation('tripPage')
  const [mounted, setMounted] = useState(false)
  const [gpsStatusDebounce] = useState(new Debounce())

  const config = useSelector((state: RootState) => {
    return state.config
  })

  const user = useSelector((state: RootState) => state.user)
  const geo = useSelector((state: RootState) => state.geo)
  const vehicle = useSelector((state: RootState) => state.vehicle)

  const startTrip = useSelector((state: RootState) => state.trip.startTrip)
  const { weatherInfo, tripStatistics, cityInfo, historicalStatistics } =
    useSelector((state: RootState) => {
      const { cityInfo } = state.city
      const { weatherInfo, tripStatistics, historicalStatistics } = state.trip
      return { weatherInfo, tripStatistics, cityInfo, historicalStatistics }
    })

  const position = useSelector((state: RootState) => state.position)

  const router = useRouter()

  const updatedPositionIndex = useRef(-1)
  const tDistance = useRef(0)
  const syncPositionInterval = useRef(10)
  const climbAltitude = useRef(0)
  const descendAltitude = useRef(0)
  const timer = useRef<NodeJS.Timeout>()
  const marker = useRef<Leaflet.Marker<any>>()
  const wakeLock = useRef<WakeLockSentinel>()
  const map = useRef<Leaflet.Map>()
  const loadedMap = useRef(false)
  const polyline = useRef<any>()
  const layer = useRef<any>()

  const initTime = useRef(Math.floor(new Date().getTime() / 1000))

  const heading = useRef(0)

  const tempPositions = useRef<protoRoot.trip.ITripPosition[]>([])

  const [tripMarks, setTripMarks] = useState<
    {
      timestamp: number
    }[]
  >([])

  const cities = useRef<protoRoot.trip.ITripCity[]>([])

  const [gpsSignalStatus, setGpsSignalStatus] = useState(-1)
  const [type, setType] = useState<TripType | ''>('')

  // const [startTrip, setStartTrip] = useState(false)
  const [startCountdown, setStartCountdown] = useState(-1)

  // const [positionList, setPositionList] = useState<
  // 	{
  // 		latitude: number
  // 		longitude: number
  // 		altitude: number
  // 		altitudeAccuracy: number
  // 		accuracy: number
  // 		heading: number
  // 		speed: number
  // 		timestamp: number
  // 		distance: number
  // 	}[]
  // >([])

  const [startTime, setStartTime] = useState(0)
  const resumeStartTime = useRef(0)
  const [listenTime, setListenTime] = useState(0)

  const statistics = useRef<Statistics>({
    speed: 0,
    maxSpeed: 0,
    maxAltitude: 0,
    minAltitude: 0,
    climbAltitude: 0,
    descendAltitude: 0,
    averageSpeed: 0,
    distance: 0,
  })
  const [isLockScreen, setIsLockScreen] = useState(false)
  const [disablePanTo, setDisablePanTo] = useState(false)

  const [stopped, setStopped] = useState(false)
  const [zoomOutSpeedMeter, setZoomOutSpeedMeter] = useState(false)

  const [dataTheme, setDataTheme] = useState('')
  const [openDataThemeDropDown, setOpenDataThemeDropDown] = useState(false)

  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )
  const [trip, setTrip] = useState<protoRoot.trip.ITrip>()
  const [tripLength, setTripLength] = useState<number>(0)

  const [testData, setTestData] = useState<protoRoot.trip.ITrip>()

  const dispatch = useDispatch<AppDispatch>()

  const refreshMapSizeDebounce = useRef(new Debounce())

  const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
    mapLayer: true,
    mapMode: true,
    roadColorFade: true,
    showAvatarAtCurrentPosition: true,
    showSpeedColor: false,
    cityName: false,
    cityBoundaries: false,
    tripTrackRoute: false,
    speedAnimation: true,
    turnOnVoice: true,
    showPositionMarker: true,
    trackSpeedColor: true,
    trackRouteColor: false,
    polylineWidth: true,
    speedColorLimit: true,
  })

  const { speedColorRGBs, mapLayer, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('indexPage')
    // console.log('dddddd', ml)

    // const tempFeaturesList = {
    //   ...mapLayerFeaturesList,
    //   trackSpeedColor: !!ml.mapLayer?.showSpeedColor,
    //   trackRouteColor: !ml.mapLayer?.showSpeedColor,
    //   polylineWidth: !!ml.mapLayer?.tripTrackRoute,
    //   speedColorLimit: !!ml.mapLayer?.tripTrackRoute,
    // }

    // tempFeaturesList.trackSpeedColor = !ml.mapLayer?.tripTrackRoute
    //   ? false
    //   : tempFeaturesList.trackSpeedColor
    // tempFeaturesList.trackRouteColor = !ml.mapLayer?.tripTrackRoute
    //   ? false
    //   : tempFeaturesList.trackRouteColor

    // setMapLayerFeaturesList(tempFeaturesList)
    return ml
  }, [
    config.configure,
    config.country,
    config.connectionOSM,
    config.initConfigure,
  ])

  useEffect(() => {
    mapLayer &&
      dispatch(
        configSlice.actions.setTurnOnCityVoice(mapLayer?.turnOnVoice || false)
      )
  }, [mapLayer])

  const dashboardDataHeight = useRef(0)

  useEffect(() => {
    setMounted(true)

    eventListener.on('dashboardDataHeight', (val) => {
      dashboardDataHeight.current = val
    })

    const init = async () => {
      // setTimeout(async () => {
      // 	let sd = getTimeLimit('All')
      // 	let ed = Math.floor(new Date().getTime() / 1000)

      // 	const res = await httpApi.v1.OpenGetTripStatistics({
      // 		type: 'All',
      // 		timeLimit: [sd, ed],
      // 		distanceLimit: [0, 500],
      // 	})

      // 	console.log('OpenGetTripStatistics', res)
      // }, 4000)

      window.addEventListener('resize', () => {
        refreshMapSizeDebounce.current.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      })

      setType((await storage.global.get('selectedIndexPageType')) || 'Running')
      setDataTheme((await storage.global.get('dataTheme')) || 'Dark')

      const trips = await storage.trips.getAll()
      console.log('trips.getAll', trips)

      setTripLength(trips.length)
      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          requestWakeLock()
        }
      })

      // console.log(
      // 	'testttttt',
      // 	getDistance(29.87242648, 106.38138641, 29.87242648, 106.38138666),
      // 	getDistance(29.87242648, 106.38138641, 29.87242806, 106.38138748),
      // 	getDistance(29.87242648, 106.38138641, 29.86577082, 106.40077541)
      // )

      if (config.devTrip) {
        const getTestData = await axios(
          // 'http://192.168.204.132:23203/s//testData1.json'
          'http://192.168.204.132:23203/s//KTmESZzS4.json'
          // 'http://192.168.204.132:23203/s//xfHtQxa4s.json'
          // 'http://192.168.204.132:23203/s//rhcMglTZW.json'
          // 'http://192.168.204.132:23203/s//ykMRlTUd2.json'
          // 'http://192.168.204.132:23203/s//lRzQNG8Pq.json'
        )
        // console.log('testData', getTestData.data)
        // console.log('testData', getTestData.data.reverse())
        setTestData({
          positions: getTestData.data,
        })
      }
    }
    init()
  }, [])

  // useEffect(() => {
  // 	const init = async () => {
  // 		const nRes = await httpApi.v1.GetAllCitiesVisitedByUser({})

  // 		console.log('nRes', nRes)
  // 	}
  // 	init()
  // }, [])

  useEffect(() => {
    eventListener.on('resumeTrip', async (trip: protoRoot.trip.ITrip) => {
      console.log('resumeTrip1', trip)

      let startTime = Number(trip.startTime)
      const posRes = await httpApi.v1.GetTripPositions({
        id: trip.id,
      })
      console.log('resumeTrip GetTripPositions posRes1111', posRes)
      if (posRes.code === 200 && posRes.data?.tripPositions?.positions) {
        startTime = Number(posRes.data?.tripPositions?.startTime || 0)
        trip.positions = formatPositionsStr(
          startTime,
          posRes.data?.tripPositions?.positions || []
        )
      }

      tDistance.current = 0
      climbAltitude.current = 0
      descendAltitude.current = 0
      updatedPositionIndex.current = -1
      tempPositions.current = []
      setTripMarks(
        trip?.marks?.map((v) => {
          return {
            timestamp: Number(v?.timestamp),
          }
        }) || []
      )
      polyline.current = undefined

      setTrip(trip)
      resumeStartTime.current = startTime * 1000
    })

    return () => {
      eventListener.removeEvent('resumeTrip')
    }
  }, [config, map.current])

  const addPosition = (position: GeolocationPosition, resumeTrip: boolean) => {
    if (!position) return

    const { config } = store.getState()
    // 5秒内没有GPS信号，则视为信号差
    gpsStatusDebounce.increase(() => {
      setGpsSignalStatus(0)
    }, 5 * 1000)

    position.coords?.heading &&
      position.coords?.heading >= 0 &&
      (heading.current = position.coords.heading)

    initMap()
    const isStartTrip = resumeTrip || startTrip
    panToMap(position, isStartTrip)

    // if (isStartTrip && position.timestamp >= startTime) {
    if (isStartTrip) {
      if ('wakeLock' in navigator) {
        requestWakeLock()
      }

      const tPositions = tempPositions.current
      const lv = tPositions[tPositions.length - 1]
      const v = position.coords
      // console.log("tDistance",tDistance)
      // ？检测信号是否异常
      const gss = !(
        (
          position.coords.speed === null ||
          position.coords.altitude === null ||
          position.coords.accuracy === null ||
          position.coords.accuracy > 20
        )
        // ||	position.coords.accuracy > 20
      )
      !resumeTrip && setGpsSignalStatus(gss ? 1 : 0)
      // 每秒超过500米视为异常
      if (position.coords?.latitude && Number(position.coords?.speed) < 500) {
        let distance = 0
        if (lv) {
          distance = getDistance(
            v.latitude,
            v.longitude,
            Number(lv.latitude || 0),
            Number(lv.longitude || 0)
          )
          // 移动距离小于0.5就是原地踏步
          // if (distance <= (type === 'Running' ? 0.5 : 0.8)) {

          if (!resumeTrip) {
            if (Number(position.coords.speed || 0) < 0.2) {
              // 第一次停止可以记录
              if (stopped) {
                console.log(
                  '原地踏步中 distance1',
                  distance,
                  position.coords,
                  lv,
                  'speed',
                  position.coords.speed
                )
                return
              }
              setStopped(true)
            } else {
              setStopped(false)
            }
          }

          // console.log('distance1', distance, position.coords, lv)
        }
        // 在这里绘制新的图
        // console.log('gss', gss)
        if (gss) {
          const L: typeof Leaflet = (window as any).L
          if (map.current && L) {
            if (lv && !resumeTrip) {
              const speedColorLimit = (
                config.configure.general?.speedColorLimit as any
              )[(trip?.type?.toLowerCase() || 'drive') as any]

              // latLngs.current.push(
              // 	getLatLng(v.latitude || 0, v.longitude || 0)
              // )
              // colors.current.push(
              // 	getSpeedColor(
              // 		v.speed || 0,
              // 		speedColorLimit.minSpeed,
              // 		speedColorLimit.maxSpeed
              // 	)
              // )

              // polyline()

              // console.log(
              // 	'playline.current',
              // 	latLngs.current,
              // 	colors.current
              // )
              // playline.current?.removeForm(map.current)
              // playline.current = (L as any)
              // 	.polycolor(latLngs.current, {
              // 		colors: colors.current,
              // 		useGradient: true,
              // 		weight: config.mapPolyline.realtimeTravelTrackWidth,
              // 	})
              // 	.addTo(map.current)

              // console.log('playline.current', playline.current)

              const color = getSpeedColor(
                v.speed || 0,
                speedColorLimit.minSpeed,
                speedColorLimit.maxSpeed,
                speedColorRGBs
              )

              // console.log(
              // 	'playlinec',
              // 	polyline.current,
              // 	polyline.current?.options?.color === color,
              // 	color,
              // 	1,
              // 	v.speed || 0,
              // 	speedColorLimit.minSpeed,
              // 	speedColorLimit.maxSpeed,
              // 	speedColorRGBs,
              // 	getLatLng(mapUrl, v.latitude || 0, v.longitude || 0)
              // )
              if (polyline.current?.options?.color === color) {
                ;(polyline.current as ReturnType<typeof L.polyline>).addLatLng(
                  getLatLng(mapUrl, v.latitude || 0, v.longitude || 0) as any
                )
              } else {
                const pl = L.polyline(
                  [
                    getLatLng(
                      mapUrl,
                      lv.latitude || 0,
                      lv.longitude || 0
                    ) as any,
                    getLatLng(mapUrl, v.latitude || 0, v.longitude || 0) as any,
                  ],
                  {
                    // smoothFactor:10,
                    // snakingSpeed: 200,
                    color, //线的颜色
                    weight: Number(mapLayer?.polylineWidth), //线的粗细
                    // opacity: 0.3,
                  }
                ).addTo(map.current)
                // playline.set
                console.log('playline', pl)
                polyline.current = pl
              }

              // playline.addLatLng

              // playline.removeFrom(map.current)
            }
          }
          if (lv) {
            tDistance.current =
              Math.round((tDistance.current + distance) * 10000) / 10000

            if (
              Number(v.altitudeAccuracy) < 10 &&
              Number(v.altitude) &&
              lv.altitude
            ) {
              if (Number(v.altitude) > lv.altitude) {
                climbAltitude.current =
                  Math.floor(
                    (climbAltitude.current +
                      (Number(v.altitude) - Number(lv.altitude))) *
                      1000
                  ) / 1000
              }
              if (Number(v.altitude) < lv.altitude) {
                descendAltitude.current =
                  Math.floor(
                    (descendAltitude.current +
                      (Number(lv.altitude) - Number(v.altitude))) *
                      1000
                  ) / 1000
              }
            }

            statistics.current = {
              speed:
                distance /
                (Math.abs(position.timestamp - Number(lv.timestamp || 0)) /
                  1000),
              maxSpeed:
                (position.coords.speed || 0) > statistics.current.maxSpeed
                  ? position.coords.speed || 0
                  : statistics.current.maxSpeed,

              climbAltitude: climbAltitude.current,
              descendAltitude: descendAltitude.current,
              maxAltitude:
                (position.coords.altitude || 0) > statistics.current.maxAltitude
                  ? position.coords.altitude || 0
                  : statistics.current.maxAltitude,
              minAltitude:
                statistics.current.minAltitude === 0 ||
                (position.coords.altitude || 0) < statistics.current.minAltitude
                  ? position.coords.altitude || 0
                  : statistics.current.minAltitude,
              distance: tDistance.current,
              averageSpeed:
                tDistance.current / Math.round((listenTime - startTime) / 1000),
            }

            // !resumeTrip && setStatistics(tempStatistics)
            // console.log(
            // 	'tDistance.current',
            // 	tDistance.current,
            // 	distance,
            // 	Math.round((listenTime - startTime) / 1000)
            // )
            // console.log("distance",distance)
          }

          tempPositions.current.push({
            longitude: toFixed(position.coords.longitude) || 0,
            latitude: toFixed(position.coords.latitude) || 0,
            altitude: toFixed(position.coords.altitude) || -1,
            altitudeAccuracy: position.coords.altitudeAccuracy || -1,
            accuracy: position.coords.accuracy || -1,
            heading: toFixed(position.coords.heading || 0) || -1,
            speed: toFixed(position.coords.speed) || -1,
            timestamp: position.timestamp || 0,
            distance: tDistance.current,
          })
        }
        // setPositionList(
        // 	positionList.concat([
        // 		{
        // 			longitude: position.coords.longitude || 0,
        // 			latitude: position.coords.latitude || 0,
        // 			altitude: position.coords.altitude || -1,
        // 			altitudeAccuracy: position.coords.altitudeAccuracy || -1,
        // 			accuracy: position.coords.accuracy || -1,
        // 			heading: position.coords.heading || -1,
        // 			speed: position.coords.speed || -1,
        // 			timestamp: position.timestamp || 0,
        // 			distance: tDistance.current,
        // 		},
        // 	])
        // )
      }
      // getSpend()
    }
  }

  useEffect(() => {
    if (resumeStartTime.current && trip) {
      dispatch(tripSlice.actions.setStartTrip(true))

      tDistance.current = 0

      updatedPositionIndex.current = Number(trip.positions?.length) - 1 || 0
      // tempPositions.current = trip.positions || []
      const tPositions = trip.positions || []

      console.log('resumeTrip tPositions', tPositions)
      // let i = 0
      // const timer = setInterval(() => {
      // 	const v = tPositions[i]
      // 	i++

      // 	if (i === tPositions.length - 1) {

      // 		clearInterval(timer)
      // 	}
      // }, 5)
      const latLngs: number[][] = []
      const colors: string[] = []
      tPositions?.forEach((v, i) => {
        latLngs.push(
          getLatLng(mapUrl, v.latitude || 0, v.longitude || 0) as any
        )

        const speedColorLimit = (
          config.configure.general?.speedColorLimit as any
        )[(trip?.type?.toLowerCase() || 'running') as any]

        colors.push(
          getSpeedColor(
            v.speed || 0,
            speedColorLimit.minSpeed,
            speedColorLimit.maxSpeed,
            speedColorRGBs
          )
        )
        addPosition(
          {
            coords: {
              longitude: v.longitude || 0,
              latitude: v.latitude || 0,
              altitude: v.altitude || -1,
              altitudeAccuracy: v.altitudeAccuracy || 1,
              accuracy: v.accuracy || 1,
              heading: v.heading || -1,
              speed: v.speed || -1,
            },
            timestamp: Number(v.timestamp) * 1000 || 0,
          } as any,
          true
        )
      })

      const L: typeof Leaflet = (window as any).L

      const polycolor = (L as any)
        .polycolor(latLngs, {
          colors: colors,
          useGradient: true,
          weight: mapLayer?.polylineWidth,
        })
        .addTo(map.current)

      console.log(
        'resumeTrip1 tempStatistics',
        statistics.current,
        tempPositions.current,
        resumeStartTime.current,
        climbAltitude.current,
        descendAltitude.current,
        polyline.current,
        polycolor,
        colors,
        latLngs,
        map.current
      )
    }
  }, [resumeStartTime.current, trip])

  useEffect(() => {
    setTimeout(() => {
      map.current?.invalidateSize(true)
    }, 400)
  }, [zoomOutSpeedMeter, startTrip])

  useEffect(() => {
    if (!startTrip) return clearInterval(tempTimer)
    if (config.devTrip && testData && startTrip) {
      setTimeout(() => {
        setStartCountdown(0)

        let i = 0
        // testData.positions?.forEach((v) => {
        // 	panToMap(
        // 		{
        // 			coords: v as any,
        // 		} as any,
        // 		true
        // 	)
        // })

        tempTimer = setInterval(() => {
          if (!testData?.positions) return
          if (i > testData.positions?.length - 1 || i > 50000) {
            clearInterval(tempTimer)
            return
          }

          console.log('oooooo', testData.positions[i])

          dispatch(
            geoSlice.actions.setSelectPosition({
              longitude: testData.positions[i].longitude as any,
              latitude: testData.positions[i].latitude as any,
            })
          )

          dispatch(
            geoSlice.actions.setPosition({
              // timestamp: testData.positions[i]?.timestamp as any,
              timestamp: new Date().getTime(),
              coords: {
                ...(testData.positions[i] as any),
              },
            } as any)
          )
          // panToMap(
          // 	{
          // 		coords: testData.positions[i] as any,
          // 	} as any,
          // 	true
          // )
          i++
        }, 500)
      }, 1000)
    }
  }, [testData, startTrip])

  useEffect(() => {
    dispatch(
      layoutSlice.actions.setLayoutHeaderLogoText(
        t('appTitle', { ns: 'common' })
      )
    )
  }, [i18n.language])

  useEffect(() => {
    layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
    layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
    layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')
  }, [mapLayer?.mapMode])

  useEffect(() => {
    if (startCountdown === 0) {
      setDisablePanTo(false)
      dispatch(tripSlice.actions.setStartTrip(true))
      setStartCountdown(-1)
      return
    }
    startCountdown !== -1 &&
      setTimeout(() => {
        console.log(startCountdown)
        setStartCountdown(startCountdown - 1)
      }, 1000)
  }, [startCountdown])

  // useEffect(() => {
  // 	if (startTrip) {
  // 		loadedMap.current = false
  // 		initMap()
  // 	}
  // }, [config.deviceType])

  useEffect(() => {
    timer && clearInterval(timer.current)
    // navigator.geolocation.clearWatch(watchId.current)
    bindRealTimePositionListMarkerClickEvent()
    bindMapClickEvent()
    dispatch(positionSlice.actions.setSelectRealTimeMarkerId(''))

    if (startTrip) {
      if (config.appConfig.version) {
        snackbar({
          message: t('screen_always_on_and_background_gps_enabled', {
            ns: 'tripPage',
          }),
          autoHideDuration: 5000,
          vertical: 'center',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
        }).open()

        rnJSBridge.enableLocation(true)
        rnJSBridge.enableBackgroundTasks(true)
        rnJSBridge.keepScreenOn(true)
      }
      dispatch(configSlice.actions.setShowIndexPageButton(true))

      dispatch(layoutSlice.actions.setLayoutHeader(false))
      dispatch(layoutSlice.actions.setBottomNavigator(false))

      console.log(map, marker, map)
      if (!config.devTrip) {
        !trip && addTrip()
      }

      // map.current && marker.current && marker.current.removeFrom(map.current)
      // if (navigator.geolocation) {

      // 说明是继续项目
      if (!resumeStartTime.current) {
        loadedMap.current = false
        initMap()
        tDistance.current = 0
        climbAltitude.current = 0
        descendAltitude.current = 0
        updatedPositionIndex.current = -1
        tempPositions.current = []
        setTripMarks([])
        polyline.current = undefined
      }

      const startTime = resumeStartTime.current || new Date().getTime()
      setStartTime(startTime)
      // let time = 1000 * 20 * 60
      let time = 0
      setListenTime(new Date().getTime() + time)

      console.log(
        'resumeTrip1 resumeStartTime.current || new Date().getTime()',
        trip,
        startTime,
        resumeStartTime.current,
        climbAltitude.current,
        descendAltitude.current,
        polyline.current,
        tempPositions.current
      )
      // console.log('testGpsData', testGpsData)

      // let i = 20
      // setInterval(() => {
      // 	if (!testGpsData[i]) return
      // 	const v = testGpsData[i]
      // 	const nv = {
      // 		coords: {
      // 			latitude: v.latitude,
      // 			longitude: v.longitude,
      // 			altitude: v.altitude,
      // 			altitudeAccuracy: v.altitudeAccuracy,
      // 			accuracy: v.accuracy,
      // 			speed: v.speed,
      // 			heading: v.heading,
      // 		},
      // 		timestamp: v.timestamp,
      // 	}
      // 	console.log('testGpsData1', nv)
      // 	dispatch(geoSlice.actions.setPosition(nv))
      // }, 1500)
      timer.current = setInterval(() => {
        console.log(
          'resumeStartTime',
          new Date().getTime() - startTime,
          new Date().getTime(),
          startTime
        )
        setListenTime(new Date().getTime() + time)

        // if (!testGpsData[i]) return
        // const v = testGpsData[i]
        // const nv: any = {
        // 	coords: {
        // 		latitude: v.latitude,
        // 		longitude: v.longitude,
        // 		altitude: v.altitude,
        // 		altitudeAccuracy: v.altitudeAccuracy,
        // 		accuracy: v.accuracy,
        // 		speed: v.speed,
        // 		heading: v.heading,
        // 	},
        // 	timestamp: v.timestamp,
        // }
        // console.log('testGpsData1', nv)
        // dispatch(geoSlice.actions.setPosition(nv))
        // i++

        // updatedPositionIndex.current += 1
        // const v = testGpsData[testDataIndex.current]
        // console.log('vvvv', v, testDataIndex.current)
        // setPosition({
        // 	coords: {
        // 		latitude: v.latitude,
        // 		longitude: v.longitude,
        // 		altitude: v.altitude,
        // 		altitudeAccuracy: v.altitudeAccuracy,
        // 		accuracy: v.accuracy,
        // 		speed: v.speed,
        // 		heading: v.heading,
        // 	},
        // 	timestamp: v.timestamp,
        // })
        // testDataIndex.current++
      }, 1000)

      // return
      // }
      // console.log('该浏览器不支持获取地理位置')
      return
    }
    if (config.appConfig.version) {
      snackbar({
        message: t('screen_always_on_and_background_gps_disabled', {
          ns: 'tripPage',
        }),
        autoHideDuration: 4000,
        vertical: 'center',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
      rnJSBridge.keepScreenOn(false)
      rnJSBridge.enableBackgroundTasks(false)
    }

    statistics.current = {
      speed: 0,
      maxSpeed: 0,
      maxAltitude: 0,
      minAltitude: 0,
      climbAltitude: 0,
      descendAltitude: 0,
      averageSpeed: 0,
      distance: 0,
    }
    setListenTime(0)
    setGpsSignalStatus(-1)
    setStartTime(0)
    resumeStartTime.current = 0
    // setPositionList([])

    finishTrip()

    dispatch(layoutSlice.actions.setBottomNavigator(true))
    dispatch(layoutSlice.actions.setLayoutHeader(true))
    dispatch(layoutSlice.actions.setLayoutHeaderFixed(true))

    loadedMap.current = false
    initMap()
    // map.current &&
    // 	marker.current &&
    // 	marker.current.addTo(map.current).openPopup()
    if (wakeLock.current) {
      wakeLock.current.release().then(() => (wakeLock.current = undefined))
    }
  }, [startTrip])

  useEffect(() => {
    // console.log(listenTime)
    if (listenTime) {
      Math.floor(listenTime / 1000) % syncPositionInterval.current === 0 &&
        updatePosition()

      // 30秒一次初始化容器
      if (Math.floor(listenTime / 1000) % 30 === 0) {
        if (config.appConfig.version) {
          rnJSBridge.keepScreenOn(true)
          rnJSBridge.enableBackgroundTasks(true)
        }
        refreshMapSizeDebounce.current.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      }
    }
  }, [listenTime])

  useEffect(() => {
    try {
      console.log('initMap1 111111111', geo.position, loadedMap.current)
      if (!loadedMap.current) {
        initMap()
      }
      // console.log('geo.position', geo.position, geo.position?.coords?.heading)
      addPosition(geo.position, false)
    } catch (error) {
      snackbar({
        message: JSON.stringify(error),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: '#f06386',
        color: '#fff',
      }).open()
    }
  }, [geo.position?.timestamp])

  useEffect(() => {
    marker.current?.remove()
    marker.current = undefined
    panToMap(geo.position, false)
  }, [
    user.isLogin,
    user.userInfo?.avatar,
    mapLayer?.showAvatarAtCurrentPosition,
  ])

  const realTimePositionList = useRef<
    protoRoot.position.GetUserPositionAndVehiclePosition.Response.IPositionItem[]
  >([])
  useEffect(() => {
    map.current &&
      initSyncPosition(map.current, mapLayer?.showPositionMarker || false)
  }, [
    config.userPositionShare,
    startTrip,
    user,
    position.syncPositionIntervalTime,
    vehicle.defaultVehicleId,
    map.current,
    config.syncLocationWhileTraveling,
    mapLayer?.showPositionMarker,
  ])

  useEffect(() => {
    console.log('click', position.selectRealTimeMarkerId)
    bindMapClickEvent()
    if (position.selectRealTimeMarkerId) {
      dispatch(layoutSlice.actions.setBottomNavigator(false))
      dispatch(layoutSlice.actions.setLayoutHeader(false))
      dispatch(layoutSlice.actions.setLayoutHeaderFixed(true))
      return
    }

    dispatch(layoutSlice.actions.setBottomNavigator(true))
    dispatch(layoutSlice.actions.setLayoutHeader(true))
    dispatch(layoutSlice.actions.setLayoutHeaderFixed(true))
  }, [position.selectRealTimeMarkerId])

  useEffect(() => {
    if (
      geo.position &&
      config.userPositionShare > 0 &&
      !startTrip &&
      user.isLogin
    ) {
      updateUserPosition({
        longitude: toFixed(geo.position.coords.longitude) || 0,
        latitude: toFixed(geo.position.coords.latitude) || 0,
        altitude: toFixed(geo.position.coords.altitude || 0) || -1,
        altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
        accuracy: geo.position.coords.accuracy || -1,
        heading: toFixed(geo.position.coords.heading || 0) || -1,
        speed: toFixed(geo.position.coords.speed || 0) || -1,
        timestamp: geo.position.timestamp || 0,
        distance: tDistance.current,
      })
    }
  }, [geo.position?.timestamp, config.userPositionShare, startTrip, user])

  useEffect(() => {
    if (config.country && !loadedMap.current) {
      initMap()
    }
  }, [config.country])

  useEffect(() => {
    loadedMap.current = false
    initMap()
  }, [mapUrl, mapLayer?.roadColorFade])

  useEffect(() => {
    geo.position && map && panToMap(geo.position)
  }, [map])
  // console.log('router', router.pathname)

  useEffect(() => {
    console.log('tyupe', router.pathname, type, user.isLogin)
    type && dispatch(methods.trip.GetTripHistoricalStatistics({ type }))
  }, [user.isLogin, type])

  useEffect(() => {
    if (user.isLogin && vehicle.defaultVehicleId) {
      updateTripVehicleId()
    }
  }, [user.isLogin, vehicle])

  useEffect(() => {
    if (user.isLogin) {
      // initTripCity()
    }
  }, [user.isLogin])

  useEffect(() => {
    user.isInit && addCity(cityInfo)
  }, [cityInfo, user.isInit])

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

  useEffect(() => {
    if (map.current) {
      ;(map.current as any).mapUrl = mapUrl
      ;(map.current as any).speedColorRGBs = speedColorRGBs
    }
  }, [map.current, speedColorRGBs, mapUrl])

  const initMap = () => {
    const L: typeof Leaflet = (window as any).L
    console.log(
      'initMap1',
      L,
      loadedMap.current,
      geo.position,
      geo.position?.coords?.latitude,
      mapUrl
    )
    if (
      L &&
      !loadedMap.current &&
      geo.position?.coords?.latitude !== undefined &&
      mapUrl
    ) {
      console.log('initMap1 开始加载！')
      let lat = toFixed(geo.position?.coords.latitude) || 0
      let lon = toFixed(geo.position?.coords.longitude) || 0
      if (map.current) {
        map.current?.remove()
        marker.current?.remove()
        map.current = undefined
        marker.current = undefined
        clearRealTimePositionListMarker()
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

          attributionControl: false,
          // center: [Number(res?.data?.lat), Number(res?.data?.lon)],
        })

        // 检测地址如果在中国就用高德地图
        map.current.setView(
          // [29.886385, 106.276923],
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
        // console.log("mapUrl",mapUrl)

        let color = { r: 12, g: 12, b: 83 }
        //VEC_C  ---天地图的地址
        //TK_KEY ---天地图的token
        // const customLayer = new DesignTileLayer()(mapUrl, {
        // 	color: color,
        // })
        // // 将 customLayer 添加到 Leaflet 地图中
        // customLayer.addTo(map)

        layer.current = (L.tileLayer as any)
          .colorScale(mapUrl, {
            // isDarkscale: true,
            // isGrayscale: true,
            // isBlackscale: true,
            // className:""
            // errorTileUrl: osmMap,
            // attribution: `&copy;`,
          })
          .addTo(map.current)

        console.log('mapUrl', config, mapUrl)

        layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
        layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
        layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')

        console.log('layer.current', layer.current)

        mapLayer && roadColorFade(mapLayer, layer.current)

        console.log('layer', layer)
        // }
        //定义一个地图缩放控件
        // var zoomControl = L.control.zoom({ position: 'topleft' })
        // //将地图缩放控件加载到地图
        // m.addControl(zoomControl)
        // m.removeControl(zoomControl)
        bindMapClickEvent()

        createDistanceScaleControl(
          map.current,
          config.deviceType === 'Mobile' ? 80 : 100,
          {
            position: 'bottomleft',
            y: '5px',
          }
        )

        map.current.on('zoom', (e) => {
          console.log('zoomEvent', e.target._zoom)
        })
        map.current.on('movestart', (e) => {
          !startTrip && setDisablePanTo(true)
        })
      }
      geo.position && panToMap(geo.position)
      console.log('connectionOSM', config.connectionOSM)

      loadedMap.current = true
      // console.log('map', map)
    }
  }

  const bindMapClickEvent = () => {
    map.current?.removeEventListener('click')
    map.current?.on('click', (e) => {
      hideButtons()
      // console.log('bindMapClickEvent click', !!selectRealTimeMarkkerId, e)
      let popLocation = e.latlng
      const { config } = store.getState()

      if (!startTrip && !position.selectRealTimeMarkerId) {
        dispatch(
          configSlice.actions.setShowIndexPageButton(
            !config.showIndexPageButton
          )
        )
      }

      dispatch(positionSlice.actions.setSelectRealTimeMarkerId(''))

      const latlng = getLatLngGcj02ToWgs84(
        mapUrl,
        popLocation.lat,
        popLocation.lng
      )

      let lat = Math.round(latlng[0] * 1000000) / 1000000
      let lng = Math.round(latlng[1] * 1000000) / 1000000
      dispatch(
        geoSlice.actions.setSelectPosition({
          latitude: lat,
          longitude: lng,
        })
      )

      !startTrip &&
        dispatch(
          methods.city.GetCity({
            lat: lat,
            lng: lng,
            customGPS: true,
          })
        )
    })
  }

  const panToMap = (position: GeolocationPosition, allowPanto?: boolean) => {
    const L: typeof Leaflet = (window as any).L

    // console.log('panToMap', position, map.current, L, marker.current)
    if (map.current && L && position?.coords) {
      const { config } = store.getState()
      const [lat, lon] = getLatLng(
        mapUrl,
        toFixed(position?.coords.latitude) || 0,
        toFixed(position?.coords.longitude) || 0
      )

      // console.log('panto', !disablePanTo || allowPanto, [lat, lon])

      if (!disablePanTo || allowPanto) {
        map.current.panTo([lat, lon], {
          // animate: false,

          animate: true,
          duration: 1,
          easeLinearity: 1,
        })
      }
      // map.current.panInside([v.latitude, v.longitude], {
      // 	paddingTopLeft: [220, 1],
      // })
      // console.log('marker', marker)

      // if (!startTrip) {

      if (!marker.current) {
        // if (!iconOptions.iconUrl) {
        // 	delete iconOptions.iconUrl
        // }
        marker.current = createMyPositionMarker(
          map.current,
          [lat, lon],
          mapLayer?.showAvatarAtCurrentPosition || false
        )
      }
      marker.current.setLatLng([lat, lon])
      // }

      // positionList.forEach((v, i) => {
      // 	if (i === 0) return
      // 	const lv = positionList[i - 1]

      // 	// console.log(v.speed, getColor(v.speed, 4, 10))
      // 	L.polyline(
      // 		[
      // 			[lv.latitude, lv.longitude],
      // 			[v.latitude, v.longitude],
      // 		],
      // 		{
      // 			// smoothFactor:10,
      // 			// snakingSpeed: 200,
      // 			color: getSpeedColor(v.speed, 4, 10), //线的颜色
      // 			weight: 8, //线的粗细
      // 			// opacity: 0.3,
      //     }
      // 	).addTo(map)
      // })
    }
  }

  const updateTripVehicleId = async () => {
    if (!startTrip) return
    const res = await httpApi.v1.UpdateTrip({
      id: trip?.id || '',
      vehicleId: vehicle.defaultVehicleId,
    })
    console.log('UpdateTrip res', res)
    if (res.code === 200) {
      const v = {
        ...trip,
      }
      if (trip?.vehicle) {
        v['vehicle'] = {
          ...trip.vehicle,
          id: vehicle.defaultVehicleId || '',
        }
      }

      setTrip(v)
      await storage.trips.set(v?.id || '', v)
      snackbar({
        message: t('defaultVehicleHasBeenSet', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  const addTrip = async () => {
    let id = 'IDB_' + md5(String(new Date().getTime()))

    const v = {
      id,
      type,
      positions: [],
      statistics: {},
      permissions: {},
      status: 0,
      vehicle: {
        id: vehicle.defaultVehicleId || '',
      },
      createTime: Math.floor(new Date().getTime() / 1000),
      startTime: Math.floor(new Date().getTime() / 1000),
    }
    setTrip(v)
    await storage.trips.set(id, v)

    if (user.isLogin) {
      const params: protoRoot.trip.AddTrip.IRequest = {
        type,
        vehicleId: vehicle.defaultVehicleId,
        // startTime: Math.floor(startTime / 1000),
      }
      console.log(params)
      const res = await httpApi.v1.AddTrip(params)
      console.log('addTrip', res)
      if (res.code === 200 && res?.data?.trip?.id) {
        await storage.trips.delete(id)

        console.log(res?.data?.trip)
        id = res?.data?.trip?.id
        setTrip(res?.data?.trip)
        await storage.trips.set(id, res?.data?.trip)
      }
    } else {
      snackbar({
        message: t('noLoginSaveTrip', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  const updatePosition = async () => {
    const pl = tempPositions.current.filter((_, i) => {
      return i > updatedPositionIndex.current
    })
    console.log('updatePosition1', trip, pl, updatedPositionIndex.current)
    if (!trip?.id || !pl.length) return
    // console.log('updatePositionparams', params)
    const pLength = tempPositions.current.length

    // 本地
    // setTrip({
    // 	...trip,
    // 	...params,
    // 	positions: localTempPositions,
    // })
    await storage.trips.set(trip.id, {
      ...trip,
      positions: tempPositions.current.map(
        (v): protoRoot.trip.ITripPosition => {
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
        }
      ),
    })
    if (!trip.id.includes('IDB')) {
      const params: protoRoot.trip.UpdateTripPosition.IRequest = {
        id: trip?.id || '',
        distance: statistics.current.distance,
        vehicleId: trip?.vehicle?.id || '',
        positions: pl.map((v): protoRoot.trip.ITripPosition => {
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
      console.log('updateTripPosition', res)
      if (res.code === 200) {
        updatedPositionIndex.current = pLength - 1
      }
    } else {
      updatedPositionIndex.current = pLength - 1
    }
  }

  const addMark = async () => {
    if (!trip?.id) return
    const t = Math.round(new Date().getTime() / 1000)
    const tMarks = [
      ...tripMarks,
      {
        timestamp: t,
      },
    ]
    setTripMarks(tMarks)

    await storage.trips.set(trip.id, {
      ...trip,
      marks: tMarks,
    })
    if (trip.id.indexOf('IDB') < 0) {
      const res = await httpApi.v1.AddTripMark({
        id: trip?.id,
        mark: {
          timestamp: t,
        },
      })
      if (res.code !== 200) {
        return
      }
    }
  }

  const addCity = async (ci: typeof cityInfo) => {
    console.log('cities.current ci UpdateCity', ci)
    let id = trip?.id || ''
    // id = 'wKod7r4LS'
    if (!ci.address || !id) return
    const entryTime = Math.round(new Date().getTime() / 1000)

    const lastCity = cities.current.reduce((latest, city) => {
      return Math.max(
        ...(city?.entryTimes?.map((entry) => Number(entry?.timestamp)) || [])
      ) >
        Math.max(
          ...(latest?.entryTimes?.map((entry) => Number(entry.timestamp)) || [])
        )
        ? city
        : latest
    }, cities.current[0])

    console.log('cities.current lastCity', lastCity)

    if (ci.address !== lastCity?.city && trip?.id) {
      // 将城市信息存储到本地
      let isexits = false
      cities.current.some((v) => {
        if (v.city === ci.address) {
          isexits = true
          v.entryTimes?.push({
            timestamp: entryTime,
          })
          return true
        }
      })

      if (!isexits) {
        cities.current.push({
          cityId: '',
          city: ci.address,
          entryTimes: [
            {
              timestamp: entryTime,
            },
          ],
        })
      }

      await storage.trips.set(trip.id, {
        ...trip,
        cities: cities.current,
      })
    }

    console.log(
      'cities.current',
      ci.address,
      lastCity?.city,
      cities.current,
      user.isLogin,
      ci.address !== lastCity?.city && user.isLogin
    )

    if (user.isLogin) {
      const res = await httpApi.v1.UpdateCity({
        // tripId: trip?.id || '',
        tripId: id,
        city: {
          country: ci.country,
          state: ci.state,
          region: ci.region,
          city: ci.city,
          town: ci.town,
          address: ci.address,
        },
        entryTime,
      })
      console.log('cities.current UpdateCity', id, res)
      if (res.code === 200) {
        // 将城市信息存储到本地
        cities.current.some((v) => {
          if (v.city === ci.address) {
            v.cityId = res.data.id
            return true
          }
        })

        trip?.id &&
          (await storage.trips.set(trip.id, {
            ...trip,
            cities: cities.current,
          }))
      }
    }
  }

  const finishTrip = async () => {
    if (!trip?.id) return
    await updatePosition()

    // if (statistics.current.distance >= 50) {
    const tempTrip = {
      ...trip,
      marks: tripMarks,
      positions: tempPositions.current.map(
        (v): protoRoot.trip.ITripPosition => {
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
        }
      ),
      statistics: {
        distance: Math.round(statistics.current.distance * 10000) / 10000,
        maxSpeed: statistics.current.maxSpeed,
        averageSpeed: statistics.current.averageSpeed,
        maxAltitude: statistics.current.maxAltitude,
        climbAltitude: statistics.current.climbAltitude,
        descendAltitude: statistics.current.descendAltitude,
      },
      status: 1,
      endTime: Math.floor(new Date().getTime() / 1000),
    }
    await storage.trips.set(trip.id, tempTrip)
    console.log('tempTrip getLocalTrips', tempTrip)
    // }
    if (trip.id.indexOf('IDB') < 0) {
      const res = await httpApi.v1.FinishTrip({
        id: trip.id,
      })
      console.log('FinishTrip', res)
      if (res.code === 200) {
        if (res?.data?.deleted) {
          snackbar({
            message: '距离过短, 距离需过50m才会记录',
            autoHideDuration: 2000,
            vertical: 'top',
            horizontal: 'center',
          }).open()
        }
        // await storage.trips.delete(trip.id)
        // await storage.trips.set(trip.id, tempTrip)
      }
    } else {
      if (statistics.current.distance >= 50) {
        snackbar({
          message: t('tripSavedLocally', {
            ns: 'prompt',
          }),
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
        }).open()
      } else {
        await storage.trips.delete(trip.id)
        snackbar({
          message: '距离过短, 距离需过50m才会记录',
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
        }).open()
      }
    }
    setTrip(undefined)
    dispatch(methods.trip.GetTripHistoricalStatistics({ type }))
  }

  const updateUserPosition = async (position: protoRoot.trip.ITripPosition) => {
    const now = Math.floor(new Date().getTime() / 1000)
    const t = now - initTime.current
    console.log('同步', t, t <= syncPositionInterval.current)

    if (t <= syncPositionInterval.current) return

    initTime.current = now

    const res = await httpApi.v1.UpdateUserPosition({
      position,
    })
    console.log('同步', geo.position, res, t)
    if (res.code === 200) {
      return
    }
    console.error(res)
  }

  const showButtons = useRef(true)

  const showButtonsDeb = useRef(new Debounce())
  useEffect(() => {
    if (!startTrip) {
      showButtons.current = true
      return
    }

    hideButtons()
  }, [startTrip])

  const hideButtons = () => {
    if (showButtons.current) {
      showButtons.current = false
      return
    }
    showButtons.current = true
    showButtonsDeb.current.increase(() => {
      showButtons.current = false
    }, 5000)
  }

  return (
    <>
      <Head>
        <title>
          {t('pageTitle', {
            ns: 'tripPage',
          }) +
            ' - ' +
            t('appTitle', {
              ns: 'common',
            })}
        </title>

        <meta
          name="description"
          content={t('subtitle', {
            ns: 'tripPage',
          })}
        />

        <script src="https://cache.amap.com/lbs/static/es5.min.js"></script>
        <script src="https://webapi.amap.com/maps?v=1.4.15&key=6f025e700cbacbb0bb866712d20bb35c"></script>
        <script src="./index.js"></script>
      </Head>
      <div
        style={
          {
            '--position-heading': (heading.current || 0) + 'deg',
            '--position-transition': '1s',
            '--dashboard-data-h': dashboardDataHeight.current + 'px',
          } as any
        }
        className={'trip-page ' + (startTrip ? 'startTrip' : '')}
      >
        <div
          // onClick={() => {
          //   console.log('showButtons')
          //   hideButtons()
          // }}
          className="tp-main"
        >
          <ButtonsComponent
            position={
              startTrip
                ? {
                    right: 10,
                    top: 0,
                  }
                : {
                    right: 10,
                    bottom: 90,
                  }
            }
            currentPosition={!startTrip}
            aichat={config.showIndexPageButton}
            trackRoute={!startTrip && config.showIndexPageButton}
            realTimePosition={config.showIndexPageButton && user.isLogin}
            mark={startTrip}
            markCount={tripMarks.length}
            // layer={false}
            layer={startTrip}
            featuresList={mapLayerFeaturesList}
            mapLayerType={mapLayerType}
            // layer={!startTrip && config.showIndexPageButton}
            onCurrentPosition={() => {
              setDisablePanTo(true)
              geo.position && panToMap(geo.position, true)
              map.current?.setView(
                [geo.position.coords.latitude, geo.position.coords.longitude],
                // [
                //   120.3814, -1.09],
                15
              )
              dispatch(
                geoSlice.actions.setSelectPosition({
                  latitude: -10000,
                  longitude: -10000,
                })
              )
            }}
            onMark={async () => {
              await addMark()
            }}
          ></ButtonsComponent>

          <DashboardLayer
            enable={!!(startTrip || position.selectRealTimeMarkerId)}
            mapUrl={mapUrl}
            mapMode={mapLayer?.mapMode || 'Normal'}
            type={type}
            tripId={trip?.id || ''}
            gpsSignalStatus={
              !position.selectRealTimeMarkerId ? gpsSignalStatus : 1
            }
            stopped={!position.selectRealTimeMarkerId ? stopped : false}
            position={
              !position.selectRealTimeMarkerId
                ? tempPositions.current[tempPositions.current.length - 1]
                : realTimePositionList.current.filter(
                    (v) =>
                      (v.vehicleInfo?.id || v.userInfo?.uid || '') ===
                      position.selectRealTimeMarkerId
                  )?.[0]?.position ||
                  tempPositions.current[tempPositions.current.length - 1]
            }
            startTime={startTime}
            listenTime={listenTime}
            statistics={statistics.current}
            updatedPositionsLength={updatedPositionIndex.current + 1}
            positionsLength={tempPositions.current.length}
            selectVehicle={!position.selectRealTimeMarkerId}
            live={!position.selectRealTimeMarkerId}
            markerPosition={!!position.selectRealTimeMarkerId}
            onZoom={(v) => {
              setZoomOutSpeedMeter(v === 'zoomOut')
            }}
            runTime={1000}
            weatherInfo={weatherInfo}
            cityInfo={cityInfo}
            markerInfo={
              realTimePositionList.current.filter(
                (v) =>
                  (v.vehicleInfo?.id || v.userInfo?.uid || '') ===
                  position.selectRealTimeMarkerId
              )?.[0]
            }
            cities={cities.current}
            zIndex={500}
            speedAnimation={mapLayer?.speedAnimation || false}
          >
            <div
              id="tp-map"
              className={
                (startTrip ? 'start ' : ' ') +
                config.deviceType +
                ' ' +
                (zoomOutSpeedMeter ? 'zoomOutSpeedMeter' : '') +
                ' ' +
                (mapLayer && isRoadColorFade(mapLayer) ? 'roadColorFade' : '')
              }
            >
              <LayerButtons
                mapLayer={mapLayer}
                show={!startTrip}
                style={
                  startTrip
                    ? config.deviceType === 'Mobile'
                      ? {
                          left: '20px',
                          bottom: '140px',
                        }
                      : {
                          right: '20px',
                          top: '60px',
                        }
                    : {
                        left: '20px',
                        bottom: '50px',
                      }
                }
                modalConfig={
                  startTrip
                    ? config.deviceType === 'Mobile'
                      ? {
                          vertical: 'Top',
                          horizontal: 'Left',
                          offsetX: '20px',
                          offsetY: '160px',
                        }
                      : {
                          vertical: 'Top',
                          horizontal: 'Right',
                          offsetX: '20px',
                          offsetY: '140px',
                        }
                    : {
                        vertical: 'Bottom',
                        horizontal: 'Left',
                        offsetX: '20px',
                        offsetY: '50px',
                      }
                }
                featuresList={mapLayerFeaturesList}
                mapLayerType={mapLayerType}
              ></LayerButtons>
            </div>
          </DashboardLayer>
          {config.showIndexPageButton ? (
            <div
              className={
                'tp-m-trip-buttons ' +
                (showButtons.current ? 'show' : 'hide') +
                ' ' +
                (startTrip ? 'starting' : 'waiting')
              }
            >
              <div
                onClick={async () => {
                  if (startTrip) {
                    alert({
                      title: t('stop_recording_trip', {
                        ns: 'prompt',
                      }),
                      content: t('stop_recording_immediately', {
                        ns: 'prompt',
                      }),
                      cancelText: t('cancel', {
                        ns: 'prompt',
                      }),
                      confirmText: t('confirm', {
                        ns: 'prompt',
                      }),
                      onCancel() {},
                      async onConfirm() {
                        dispatch(tripSlice.actions.setStartTrip(false))

                        snackbar({
                          message: t('trip_stopped_view_history', {
                            ns: 'prompt',
                          }),
                          vertical: 'bottom',
                          horizontal: 'center',
                          backgroundColor: 'var(--saki-default-color)',
                          color: '#fff',
                          autoHideDuration: 2000,
                        }).open()
                      },
                    }).open()
                    return
                  }
                  setStartCountdown(3)
                }}
                className={
                  'tp-b-item start ' +
                  (startCountdown !== -1 ? 'startCountdown ' : '') +
                  (startTrip ? 'starting' : '')
                }
              >
                {startCountdown === -1
                  ? startTrip
                    ? t('stop', {
                        ns: 'tripPage',
                      })
                    : t('start', {
                        ns: 'tripPage',
                      })
                  : startCountdown}
              </div>
            </div>
          ) : (
            ''
          )}
          <FiexdWeatherComponent
            showCoords={!startTrip}
            coords={geo.position.coords}
            full={startTrip || geo.selectPosition.latitude === -10000}
            mapUrl={mapUrl}
            mapMode={mapLayer?.mapMode || 'Normal'}
            style={{
              right: '10px',
              bottom: (startTrip ? 40 + dashboardDataHeight.current : 4) + 'px',
            }}
          ></FiexdWeatherComponent>
          {/* {startTrip || position.selectRealTimeMarkerId ? (
            <DashboardComponent
              type={type}
              tripId={trip?.id || ''}
              gpsSignalStatus={
                !position.selectRealTimeMarkerId ? gpsSignalStatus : 1
              }
              stopped={!position.selectRealTimeMarkerId ? stopped : false}
              position={
                !position.selectRealTimeMarkerId
                  ? tempPositions.current[tempPositions.current.length - 1]
                  : realTimePositionList.current.filter(
                      (v) =>
                        (v.vehicleInfo?.id || v.userInfo?.uid || '') ===
                        position.selectRealTimeMarkerId
                    )?.[0]?.position ||
                    tempPositions.current[tempPositions.current.length - 1]
              }
              startTime={startTime}
              listenTime={listenTime}
              statistics={statistics.current}
              updatedPositionsLength={updatedPositionIndex.current + 1}
              positionsLength={tempPositions.current.length}
              selectVehicle={!position.selectRealTimeMarkerId}
              live={!position.selectRealTimeMarkerId}
              markerPosition={!!position.selectRealTimeMarkerId}
              onZoom={(v) => {
                setZoomOutSpeedMeter(v === 'zoomOut')
              }}
              runTime={1000}
              weatherInfo={weatherInfo}
              markerInfo={
                realTimePositionList.current.filter(
                  (v) =>
                    (v.vehicleInfo?.id || v.userInfo?.uid || '') ===
                    position.selectRealTimeMarkerId
                )?.[0]
              }
              cities={cities.current}
              zIndex={500}
              speedAnimation={mapLayer?.speedAnimation || false}
            />
          ) : (
            ''
          )} */}
          <div
            style={{
              display:
                config.showIndexPageButton &&
                !startTrip &&
                !position.selectRealTimeMarkerId
                  ? 'block'
                  : 'none',
            }}
            className="tp-m-type-buttons"
          >
            {mounted ? (
              <saki-tabs
                type="Flex"
                // header-background-color='rgb(245, 245, 245)'
                // header-max-width='740px'
                // header-border-bottom='none'
                header-padding="0 10px"
                // header-item-min-width='40px'
                header-item-padding={
                  config.lang === 'en-US' ? '0 4px' : '0 14px'
                }
                more-content-width-difference={
                  config.lang === 'en-US' ? -80 : -80
                }
                active-tab-label={type}
                // disable-more-button
                ref={bindEvent({
                  tap: async (e) => {
                    console.log('tap', e)

                    await storage.global.set(
                      'selectedIndexPageType',
                      e.detail.label
                    )
                    setType(e.detail.label)
                  },
                })}
              >
                {config.tripTypes.map((v, i) => {
                  return v !== 'Local' ? (
                    <saki-tabs-item
                      font-size="14px"
                      label={v}
                      name={t(v.toLowerCase(), {
                        ns: 'tripPage',
                      })}
                      key={i}
                    >
                      <div className="buttons-item">
                        <div className="bi-distance">
                          <span className="value">
                            {Math.round(
                              (historicalStatistics[type]?.distance || 0) / 100
                            ) / 10 || 0}
                          </span>
                          <span className="name">
                            km
                            {/* {t('distance', {
                          ns: 'tripPage',
                        }) + ' (km)'} */}
                          </span>
                        </div>
                        <div className="bi-right">
                          <div className="bi-time">
                            <span className="value">
                              {historicalStatistics[type]?.time < 0
                                ? 0
                                : Math.round(
                                    ((historicalStatistics[type]?.time || 0) /
                                      3600) *
                                      100
                                  ) / 100 || 0}
                            </span>
                            <span className="name">
                              {t('duration', {
                                ns: 'tripPage',
                              }) + ' (h)'}
                            </span>
                          </div>
                          <div className="bi-count">
                            <span className="value">
                              {historicalStatistics[type]?.count || 0}
                            </span>
                            <span className="name">
                              {t('trips', {
                                ns: 'tripPage',
                              })}
                            </span>
                          </div>
                          <saki-button
                            ref={bindEvent({
                              tap: () => {
                                loadModal('TripHistory', () => {
                                  dispatch(
                                    layoutSlice.actions.setTripHistoryType(
                                      (user.isLogin ? v : 'Local') as any
                                    )
                                  )
                                  dispatch(
                                    layoutSlice.actions.setOpenTripHistoryModal(
                                      true
                                    )
                                  )
                                })
                              },
                            })}
                            type="CircleIconGrayHover"
                          >
                            <saki-icon color="#999" type="Right"></saki-icon>
                          </saki-button>
                        </div>
                      </div>
                    </saki-tabs-item>
                  ) : (
                    ''
                  )
                })}
              </saki-tabs>
            ) : (
              ''
            )}
            {/* <div
            onClick={() => {
              setType('Running')
            }}
            className={'tp-b-item ' + (type === 'Running' ? 'active' : '')}
          >
            步行
          </div>
          <div
            onClick={() => {
              setType('Bike')
            }}
            className={'tp-b-item ' + (type === 'Bike' ? 'active' : '')}
          >
            骑行
          </div>
          <div
            onClick={() => {
              setType('Drive')
            }}
            className={'tp-b-item ' + (type === 'Drive' ? 'active' : '')}
          >
            驾车
          </div> */}
          </div>
          <div
            className={
              'tp-m-trip-right-buttons ' + (startTrip ? 'starting' : '')
            }
          ></div>
          {/* {!(
						geo.selectPosition.latitude === -10000 &&
						geo.selectPosition.longitude === -10000
					) && !startTrip ? (
						<div
							onClick={() => {
								console.log(1)
								window.navigator.clipboard.writeText(
									geo.selectPosition.latitude +
										',' +
										geo.selectPosition.longitude
								)

								snackbar({
									message: t('copySuccessfully', {
										ns: 'prompt',
									}),
									autoHideDuration: 2000,
									vertical: 'top',
									horizontal: 'center',
									backgroundColor: 'var(--saki-default-color)',
									color: '#fff',
								}).open()
							}}
							className='tp-m-click-position'
						>
							{geo.selectPosition.latitude.toFixed(2) +
								',' +
								geo.selectPosition.longitude.toFixed(2)}
						</div>
					) : (
						''
					)} */}
        </div>
      </div>
    </>
  )
}

TripPage.getLayout = getLayout

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

export default TripPage
