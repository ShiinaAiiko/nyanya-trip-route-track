import Head from 'next/head'
import TripLaout, { getLayout } from '../../layouts/Trip'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  roadColorFade,
  formatPositionsStr,
  getTimeLimit,
  toFixed,
  getLatLngGcj02ToWgs84,
  isRoadColorFade,
  normalizeLeafletCoordinates,
  // testGpsData,
} from '../../plugins/methods'
import { getGeoInfo } from 'findme-js'
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
import {
  GpsPoint,
  initTripCity,
  reupdateTripPositions,
  Statistics,
  tripMethods,
  tripSlice,
} from '../../store/trip'
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
  smoothSetBearing,
} from '../../plugins/map'
import { loadModal } from '../../store/layout'
import { LayerButtons } from '../../components/MapLayer'
import NewDashboardComponent from '../../components/Dashboard'
import { getRoadId } from '../../store/geo'
import { uploadFile } from '../../store/file'

import * as Leaflet from 'leaflet'
import { createIconMarker } from '../../store/map'
// import 'leaflet-rotate'

let tempTimer: any

const TripPage = () => {
  const { t, i18n } = useTranslation('tripPage')
  const [mounted, setMounted] = useState(false)
  const [gpsStatusDebounce] = useState(new Debounce())

  // 1. 基础模块尽量原子化获取
  // 只有当对应的 slice 对象整个替换时才会触发重绘
  const config = useSelector((state: RootState) => state.config)
  const layout = useSelector((state: RootState) => state.layout)
  const user = useSelector((state: RootState) => state.user)
  const geo = useSelector((state: RootState) => state.geo)
  const vehicle = useSelector((state: RootState) => state.vehicle)
  const network = useSelector((state: RootState) => state.network)
  const position = useSelector((state: RootState) => state.position)

  // 2. 具体的业务字段
  const startTrip = useSelector((state: RootState) => state.trip.startTrip)

  // 3. 跨模块或深层属性，依然建议分开写，以获得最佳的引用拦截效果
  const cityInfo = useSelector((state: RootState) => state.city.cityInfo)
  const weatherInfo = useSelector((state: RootState) => state.trip.weatherInfo)
  const tripStatistics = useSelector(
    (state: RootState) => state.trip.tripStatistics
  )
  const historicalStatistics = useSelector(
    (state: RootState) => state.trip.historicalStatistics
  )
  const router = useRouter()

  const updatedPositionIndex = useRef(-1)
  const tDistance = useRef(0)
  // 未来如果有他人同步查看再提升
  const syncPositionInterval = useRef(30)
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
    headingUp: true,
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
          // 173
          // http://192.168.204.130:23202/trip/detail?id=kbZ4vhU21

          // 'http://192.168.204.130:23203/s//testData1.json'
          // 'http://192.168.204.130:23203/s//KTmESZzS4.json'
          // 'http://192.168.204.130:23203/s//xfHtQxa4s.json'
          // 'http://192.168.204.130:23203/s//rhcMglTZW.json'
          // 'http://192.168.204.130:23203/s//ykMRlTUd2.json'
          // 'http://192.168.204.130:23203/s//lRzQNG8Pq.json'
          // 'http://192.168.204.130:23203/s//kbZ4vhU21'
          // 'http://192.168.204.130:23203/s//jZwjLXZ0S'
          'http://127.0.0.1:23203/s//bDkFXZVgq'
        )
        // console.log('testData', getTestData.data)
        // console.log('testData', getTestData.data.reverse())
        setTestData({
          positions: getTestData.data,
        })
      }

      rnJSBridge?.enableLocation(true)
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
                // console.log('playline', pl)
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
      // const timer =  setInterval(() => {
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

          // console.log('oooooo', testData.positions[i])

          dispatch(
            geoSlice.actions.setSelectPosition({
              latitude: -10000,
              longitude: -10000,
            })
          )

          dispatch(
            geoSlice.actions.setPosition({
              timestamp: testData.positions[i]?.timestamp as any,
              // timestamp: new Date().getTime(),
              coords: {
                ...(testData.positions[i] as any),
                altitude: Number(testData.positions[i].altitude),
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
          // i += 10
          // }, 300)
        }, 1000)
      }, 1000)
    }
  }, [testData, startTrip])

  useEffect(() => {
    dispatch(
      layoutSlice.actions.setLayoutHeaderLogoText(
        t('appTitle', { ns: 'common' })
      )
    )

    // console.log('AI领航员 trip layout')
    dispatch(
      layoutSlice.actions.setOpenAiChatModalInfo({
        type: 'coDriver',
        title: t('aiModelTitle', {
          ns: 'tripPage',
        }),
        subtitle: t('aiModelSubtitle', {
          ns: 'tripPage',
        }),
      })
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

    AIContext.current = {
      startTrip: startTrip,
      currentTripData: undefined,
      lastTriggerData: undefined,
      lastTriggerTime: 0,
    }

    setMapLayerFeaturesList({
      ...mapLayerFeaturesList,
      headingUp: startTrip,
    })

    if (startTrip) {
      if (rnJSBridge.isInApp()) {
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
        rnJSBridge.enableBackgroundLocation(true)
        // rnJSBridge.enableBackgroundTasks(true)
        rnJSBridge.keepScreenOn(true)
        rnJSBridge.enableCarData(true)
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

      // console.log(
      //   'resumeTrip1 resumeStartTime.current || new Date().getTime()',
      //   trip,
      //   startTime,
      //   resumeStartTime.current,
      //   climbAltitude.current,
      //   descendAltitude.current,
      //   polyline.current,
      //   tempPositions.current
      // )
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
        // console.log(
        //   'resumeStartTime',
        //   new Date().getTime() - startTime,
        //   new Date().getTime(),
        //   startTime
        // )
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
      rnJSBridge.enableBackgroundLocation(false)
      // rnJSBridge.enableBackgroundTasks(false)
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

    lastWeather.current = undefined
    tripWeather.current = []

    setListenTime(0)
    setGpsSignalStatus(-1)
    setStartTime(0)
    resumeStartTime.current = 0
    // setPositionList([])

    finishTrip()

    setTrip(undefined)
    dispatch(methods.trip.GetTripHistoricalStatistics({ type }))

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
      if (Math.floor(listenTime / 1000) % 45 === 0) {
        if (config.appConfig.version) {
          rnJSBridge.keepScreenOn(true)
          // rnJSBridge.enableBackgroundTasks(true)
        }
        refreshMapSizeDebounce.current.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      }

      // AI领航员

      AIContext.current.currentCity = cityInfo.city
      AIContext.current.currentTripData = {
        city: ['state', 'region', 'city', 'town']
          .map((v) => {
            const si: any = cityInfo
            let s = si[v]
            return s
          })
          .filter((v) => !!v)
          .join('·'),
        altitude: geo.position.coords.altitude,
        speed: geo.position.coords.speed,
        weather: weatherInfo.weather,
        temp: weatherInfo.temperature,
        road: (
          roadInfoList.current?.filter((v) => {
            return v.code !== 'A404'
          }) || []
        )
          .map((v) => {
            return (
              v.code +
              ' ' +
              ((v.name as any)?.[
                config.lang === 'zh-CN'
                  ? 'zhHans'
                  : config.lang === 'zh-TW'
                    ? 'zhHant'
                    : 'en'
              ] || (v.name as any)['zhHans'])
            )
          })
          .join('; '),
        coords: {
          latitude: Number(geo.position.coords.latitude.toFixed(6)),
          longitude: Number(geo.position.coords.longitude.toFixed(6)),
          heading: Number(geo.position.coords.heading?.toFixed(6)) || 0,
        },
        time: geo.position.timestamp,
        statistics: statistics.current,
      }

      // console.log('AI领航员 config', config.configure.ai)

      if (user.isLogin && config.configure.ai?.aiCoDriver?.enabled) {
        const result = shouldAIPilotWakeUp(AIContext.current)
        if (result.triggerReason) {
          console.log(
            'AI领航员 isGoAi',
            result.triggerReason,
            AIContext.current,
            config.configure?.ai?.aiCoDriver?.trigger
          )

          const params = deepCopy({
            visible: true,
            startTrip: true,
            triggerReason: result.triggerReason,

            autoPlayVoice:
              config.configure.ai?.aiCoDriver?.autoPlayVoice || false,
            autoCloseTime: config.configure.ai?.aiCoDriver?.autoCloseTime || 0,

            currentTripData: AIContext.current.currentTripData,
            lastTripData: AIContext.current.lastTriggerData,
          })
          result?.end()
          loadModal('AiChatModal', () => {
            dispatch(layoutSlice.actions.setOpenAiChatModal(params))
          })
        }
      }
    }
  }, [listenTime, config.configure.ai?.aiCoDriver])

  useEffect(() => {
    if (user.isLogin) {
      eventListener.on('startAICoDriver', () => {
        loadModal('AiChatModal', () => {
          const { layout } = store.getState()
          dispatch(
            layoutSlice.actions.setOpenAiChatModal({
              visible: true,
              startTrip: layout.openAiChatModal.startTrip,
              ...(!config.devTrip
                ? {
                    triggerReason: layout.openAiChatModal.startTrip
                      ? 'MILESTONE_DISTANCE'
                      : '',
                    autoPlayVoice: false,
                    autoCloseTime: 0,
                    currentTripData: AIContext.current.currentTripData,
                    lastTripData: AIContext.current.lastTriggerData,
                  }
                : {
                    // triggerReason: 'FIRST_OPEN_DISTANCE',
                    triggerReason: 'CHANGE_CITY',
                    autoPlayVoice: false,
                    autoCloseTime: 0,

                    currentTripData: {
                      city: '四川省·甘孜藏族自治州·巴塘县·夏邛镇',
                      altitude: 2498.44140625,
                      speed: 0.6600000262,
                      weather: '阴',
                      temp: 18.5,
                      road: '',
                      coords: {
                        latitude: 29.977319,
                        longitude: 99.087103,
                        heading: 270,
                      },
                      time: 1757218995000,
                      statistics: {
                        speed: 0.904,
                        maxSpeed: 0.6600000262,
                        climbAltitude: 0.532,
                        descendAltitude: 0.317,
                        maxAltitude: 2498.7595214844,
                        minAltitude: 2498.44140625,
                        distance: 2.445,
                        averageSpeed: 0.61125,
                      } as any,
                    },
                    lastTripData: {
                      city: '四川省·甘孜藏族自治州·理塘县',
                      altitude: 2498.44140625,
                      speed: 0.6600000262,
                      weather: '阴',
                      temp: 18.5,
                      road: '',
                      coords: {
                        latitude: 29.977319,
                        longitude: 99.087103,
                        heading: 270,
                      },
                      time: 1757218995000,
                      statistics: {
                        speed: 0.904,
                        maxSpeed: 0.6600000262,
                        climbAltitude: 0.532,
                        descendAltitude: 0.317,
                        maxAltitude: 2498.7595214844,
                        minAltitude: 2498.44140625,
                        distance: 2.445,
                        averageSpeed: 0.61125,
                      } as any,
                    },
                  }),
            })
          )
        })
      })
    }
  }, [user.isLogin])

  interface AIContext {
    startTrip: boolean
    currentTripData?: protoRoot.ai.IAICoDriverCurrentTripData
    lastTriggerData?: protoRoot.ai.IAICoDriverCurrentTripData // 存储上一次触发时的数据，用于对比
    lastTriggerTime?: number // 时间戳
    lastTriggerHour?: number // 【新增】记录上一次触发时的“小时”数
    lastStopTime?: number // 【新增】记录上一次触发时的“小时”数
    lastCity?: string
    currentCity?: string
    activeWeatherWarning?: string // 【新增】当前已预警的天气状态锁
  }

  const AIContext = useRef<AIContext>({
    startTrip: false,
    currentTripData: undefined,
    lastTriggerData: undefined,
    lastTriggerTime: 0,
  })

  /**
   * 判定并自动更新 AI 领航员状态 (全功能完整版)
   * 包含：里程里程碑、海拔跳变、累计爬升/下降、温度预警、速度异常、整点/时段触发、起步唤醒
   */
  function shouldAIPilotWakeUp(ctx: AIContext) {
    let triggerReason: (typeof layout.openAiChatModal)['triggerReason'] = ''

    // 1. 基础检查
    if (!ctx.startTrip || !ctx.currentTripData) return { triggerReason }

    const {
      currentTripData,
      lastTriggerData,
      lastTriggerTime,
      lastTriggerHour,
    } = ctx
    const now = Date.now()
    const currentDate = new Date(now)
    const currentHour = currentDate.getHours()

    // 2. 冷启动逻辑：行程开始的第一帧初始化锚点
    if (!lastTriggerData) {
      ctx.lastTriggerData = JSON.parse(JSON.stringify(currentTripData))

      ctx.lastTriggerHour = currentHour
      return { triggerReason }
    }

    const currStats = currentTripData.statistics
    const lastStats = lastTriggerData.statistics
    if (!currStats || !lastStats) return { triggerReason }

    // ==========================================
    // 3. 阈值定义区 (根据需求可在此统一修改)
    // ==========================================
    const aiTrigger = config.configure?.ai?.aiCoDriver?.trigger

    const FIRST_OPEN_DISTANCE = config.devTrip
      ? 2
      : (aiTrigger?.firstOpenDistance ?? 100) // 首次触发里程
    // 距离触发器步进
    const MILESTONE_STEP = config.devTrip
      ? 500
      : (aiTrigger?.milestoneStep ?? 5000)
    // 海拔瞬时跳变阈值
    const ALTITUDE_STEP = config.devTrip ? 30 : (aiTrigger?.altitudeStep ?? 150)
    // 累计爬升触发
    const CLIMB_MILESTONE = config.devTrip
      ? 100
      : (aiTrigger?.climbMilestone ?? 500)
    // 累计下降触发
    const DESCEND_MILESTONE = config.devTrip
      ? 100
      : (aiTrigger?.descendMilestone ?? 500)
    // 温差预警阈值
    const TEMP_STEP = config.devTrip ? 2 : (aiTrigger?.tempStep ?? 5)
    // 速度骤降判定基准 (m/s)
    const SPEED_DROP_THRESHOLD = config.devTrip
      ? 10
      : (aiTrigger?.speedDropThreshold ?? 20)
    // 触发所需的最小位移 (m)
    const MIN_MOVEMENT_THRESHOLD = config.devTrip
      ? 10
      : (aiTrigger?.minMovementThreshold ?? 500)
    // 全局冷却时间 (ms)
    const GLOBAL_COOLDOWN = config.devTrip
      ? 0.1 * 60 * 1000
      : (aiTrigger?.globalCooldownMs ?? 5 * 60 * 1000)
    // 停车判定“重新出发”时长 (ms)
    const REST_AWAKE_THRESHOLD = config.devTrip
      ? 1 * 60 * 1000
      : (aiTrigger?.restAwakeThresholdMs ?? 20 * 60 * 1000)

    // 疲劳驾驶间隔 (ms)
    const DROWSY_DRIVING = config.devTrip
      ? 60 * 1000
      : (aiTrigger?.drowsyDrivingMs ?? 2 * 60 * 60 * 1000)

    // 特殊时间点：中午、傍晚、深夜
    const SPECIAL_HOURS = aiTrigger?.specialHours ?? [12, 18, 22, 0]

    // console.log(
    //   'AI领航员 FIRST_OPEN_DISTANCE',
    //   FIRST_OPEN_DISTANCE,
    //   Number(config.configure?.ai?.aiCoDriver?.trigger?.firstOpenDistance)
    // )

    // ==========================================
    // 4. 基础校验 (冷却与位移)
    // ==========================================
    const distanceMoved =
      Number(currStats.distance) - Number(lastStats.distance)
    const timeSinceLast = now - (lastTriggerTime || 0)

    // 如果位移极小（比如人在车里休息），除非是时间到了，否则不触发
    const isMoving = distanceMoved >= MIN_MOVEMENT_THRESHOLD

    // ==========================================
    // 5. 核心判定逻辑
    // ==========================================

    // console.log(
    //   'AI领航员',
    //   FIRST_OPEN_DISTANCE,
    //   Number(currStats.distance),
    //   !ctx.lastTriggerTime,
    //   isMoving,
    //   currentTripData.road
    // )
    // A. 物理指标判定 (需满足冷却时间)
    if (timeSinceLast >= GLOBAL_COOLDOWN && isMoving) {
      if (distanceMoved >= MILESTONE_STEP) {
        triggerReason = 'MILESTONE_DISTANCE'
      }
    }
    if (
      Math.abs(
        Number(currentTripData.altitude) - Number(lastTriggerData.altitude)
      ) >= ALTITUDE_STEP
    ) {
      triggerReason = 'ALTITUDE_JUMP'
    } else if (
      Number(currStats.climbAltitude) - Number(lastStats.climbAltitude) >=
      CLIMB_MILESTONE
    ) {
      triggerReason = 'CLIMB_ACHIEVEMENT'
    } else if (
      Number(currStats.descendAltitude) - Number(lastStats.descendAltitude) >=
      DESCEND_MILESTONE
    ) {
      triggerReason = 'DESCEND_WARNING'
    } else if (
      Number(lastTriggerData.temp) - Number(currentTripData.temp) >=
      TEMP_STEP
    ) {
      triggerReason = 'TEMPERATURE_DROP'
    } else if (
      Number(lastTriggerData.speed) > SPEED_DROP_THRESHOLD &&
      Number(currentTripData.speed) < 3
    ) {
      triggerReason = 'SUDDEN_STOP'
    } else if (currentTripData.road !== currentTripData.road) {
      triggerReason = 'CHANGE_ROAD'
    }

    if (!ctx.lastCity) {
      ctx.lastCity = ctx.currentCity
    }
    if (ctx.currentCity !== ctx.lastCity) {
      triggerReason = 'CHANGE_CITY'
    }

    // B. 天气逻辑判定 (独立于物理冷却，但受位移限制)
    if (isMoving) {
      const dangerousWeather = ['大雨', '暴雪', '大雾', '冰雹', '沙尘暴']
      const currentWeather = currentTripData.weather || ''
      if (
        dangerousWeather.includes(currentWeather) &&
        currentWeather !== ctx.activeWeatherWarning
      ) {
        ctx.activeWeatherWarning = currentWeather

        triggerReason = 'WEATHER_CHANGE'
      } else if (!dangerousWeather.includes(currentWeather)) {
        ctx.activeWeatherWarning = undefined // 解锁
      }
    }

    // C. 时间逻辑判定 (跨小时判定)
    if (currentHour !== lastTriggerHour) {
      // 如果是特殊时段，或者已经 1 小时没说话了，且车子在动
      if (
        (SPECIAL_HOURS.includes(currentHour) ||
          timeSinceLast > 60 * 60 * 1000) &&
        isMoving
      ) {
        triggerReason = 'TIME_EVENT'
      }
    }

    // D. 休息唤醒逻辑 (长停后起步)
    if (
      timeSinceLast > REST_AWAKE_THRESHOLD &&
      isMoving &&
      distanceMoved > 1000
    ) {
      triggerReason = 'REST_WELCOME_BACK'
    }

    // 疲劳驾驶
    if (!ctx.lastStopTime) {
      ctx.lastStopTime = now
    }
    if (now - ctx.lastStopTime >= DROWSY_DRIVING && isMoving) {
      triggerReason = 'DROWSY_DRIVING'
    }

    if (
      FIRST_OPEN_DISTANCE < Number(currStats.distance) &&
      !ctx.lastTriggerTime
    ) {
      triggerReason = 'FIRST_OPEN_DISTANCE'
    }

    // ==========================================
    // 6. 状态同步与返回
    // ==========================================

    return {
      triggerReason,
      end: () => {
        if (triggerReason) {
          console.log(
            `[AI领航员] 触发成功 | 原因: ${triggerReason} | 时间: ${currentHour}点`
          )

          // 自动更新上下文状态
          ctx.lastTriggerData = deepCopy(currentTripData)
          ctx.lastTriggerTime = now
          ctx.lastTriggerHour = currentHour

          if (triggerReason === 'DROWSY_DRIVING') {
            ctx.lastStopTime = now
          }
          if (triggerReason === 'CHANGE_CITY') {
            ctx.lastCity = ctx.currentCity
          }
        }
      },
    }
  }

  const roadInfoList = useRef<protoRoot.road.IRoadInfo[]>([])
  const roads = useRef<protoRoot.trip.ITripRoad[]>([])

  useEffect(() => {
    try {
      // console.log('initMap1 111111111', geo.position, loadedMap.current)
      if (!loadedMap.current) {
        initMap()
      }
      // console.log('geo.position', geo.position, geo.position?.coords?.heading)
      addPosition(geo.position, false)

      if (startTrip) {
        dispatch(
          geoSlice.actions.setSelectPosition({
            latitude: -10000,
            longitude: -10000,
          })
        )
        dispatch(
          methods.geo.GetRoadInfo({
            position: geo.position,
          })
        )
          .unwrap()
          .then((res) => {
            if (res.status === 'loaded') {
              roadInfoList.current = res.riList || []

              // console.log('roadInfo', trip?.id)
              addRoad(roadInfoList.current)
            }
          })
      }
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
  }, [geo.position?.timestamp, startTrip, trip])

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
    user.isInit &&
      type &&
      dispatch(methods.trip.GetTripHistoricalStatistics({ type }))
  }, [user.isInit, type])

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
    // console.log(
    //   'initMap1',
    //   L,
    //   loadedMap.current,
    //   geo.position,
    //   geo.position?.coords?.latitude,
    //   mapUrl
    // )
    if (
      L &&
      !loadedMap.current &&
      geo.position?.coords?.latitude !== undefined &&
      mapUrl
    ) {
      console.log('initMap1 开始加载！', map.current)
      let zoom = 15
      let [lat, lon] = getLatLng(
        mapUrl,
        toFixed(geo.position?.coords.latitude) || 0,
        toFixed(geo.position?.coords.longitude) || 0
      )
      if (map.current) {
        const latlng = map.current?.getCenter()
        lat = latlng.lat
        lon = latlng.lng
        zoom = map.current?.getZoom()

        map.current?.remove()
        marker.current?.remove()
        selectPositionMarker.current?.remove()
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

          ...({ rotate: true, bearing: 0 } as any),

          attributionControl: false,
          // center: [Number(res?.data?.lat), Number(res?.data?.lon)],
        })

        // 检测地址如果在中国就用高德地图
        map.current.setView(
          // [29.886385, 106.276923],
          [lat, lon],
          // [
          //   120.3814, -1.09],
          zoom
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
        // const customLayer =   new DesignTileLayer()(mapUrl, {
        // 	color: color,
        // })
        // // 将 customLayer  添加到 Leaflet 地图中
        // customLayer.addTo(map)

        layer.current = (L.tileLayer as any)
          .colorScale(
            mapUrl,
            // 'http://cdn.rainviewer.com/v2/radar/1750178400/256/{z}/{x}/{y}/255/1_1_1_0.png',
            // 'http://tilecache.rainviewer.com/v2/radar/1750144800/256/{z}/{x}/{y}/0/0_0.png',
            {
              time: Date.now(), // 使用最新雷达图
              // isDarkscale: true,
              // isGrayscale: true,
              // isBlackscale: true,
              // className:""
              // errorTileUrl: osmMap,
              // attribution: `&copy;`,
            }
          )
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

        // map.current.on('zoom', (e) => {
        //   console.log('initMap1 zoomEvent', e.target._zoom)
        // })
        map.current.on('movestart', (e) => {
          // console.log('initMap1 zoomEvent', e.target)
          !startTrip && setDisablePanTo(true)
        })
        // map.current.on('moveend', (e) => {
        //   console.log(
        //     'initMap1 moveend',
        //     map.current?.getZoom(),
        //     map.current?.getCenter()
        //   )
        // })
      }
      geo.position && panToMap(geo.position)
      // console.log('connectionOSM', config.connectionOSM)

      // console.log('connectionOSM', (map.current as any).setBearing)
      // ;(map.current as any).setBearing(265.8)

      loadedMap.current = true
      // console.log(' map', map)
    }
  }

  const lastHeading = useRef(0)
  const isHeadingUp = useMemo(() => {
    return !startTrip ? false : mapLayer?.headingUp
  }, [startTrip, mapLayer?.headingUp])
  useEffect(() => {
    if (!map.current) return
    if (isHeadingUp) {
      smoothSetBearing(map.current, lastHeading.current * -1, 400, 'linear')
    } else {
      ;(map.current as any)?.setBearing(0)
    }

    if (marker.current) {
      const el = document.body.querySelector(
        '.map_current_position_icon-wrap .icon'
      )

      if (isHeadingUp) {
        el?.classList.add('disallowRotate')
        el?.classList.remove('allowRotate')
      } else {
        el?.classList.remove('disallowRotate')
        el?.classList.add('allowRotate')
      }
    }
  }, [isHeadingUp])

  const selectPositionMarker = useRef<Leaflet.Marker<any>>()

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

      const latlng2 = normalizeLeafletCoordinates(latlng[0], latlng[1])

      let lat = Math.round(latlng2.lat * 1000000) / 1000000
      let lng = Math.round(latlng2.lng * 1000000) / 1000000
      dispatch(
        geoSlice.actions.setSelectPosition({
          latitude: lat,
          longitude: lng,
        })
      )

      selectPositionMarker.current?.remove()

      if (map.current) {
        // selectPositionMarker.current = createIconMarker({
        //   map: map.current,
        //   latlng: [popLocation.lat, popLocation.lng],
        //   type: 'StartPosition',
        // })
      }

      // !startTrip &&
      //   dispatch(
      //     methods.city.GetCity({
      //       lat: lat,
      //       lng: lng,
      //       customGPS: true,
      //     })
      //   )
    })
  }

  const panToMap = (position: GeolocationPosition, allowPanto?: boolean) => {
    const L: typeof Leaflet = (window as any).L

    selectPositionMarker.current?.remove()

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
          mapLayer?.showAvatarAtCurrentPosition || false,
          isHeadingUp || false
        )
      }
      marker.current.setLatLng([lat, lon])

      if (isHeadingUp) {
        if ((position.coords.speed || 0) > 0) {
          lastHeading.current = position.coords.heading || 0
          smoothSetBearing(
            map.current,
            (position.coords.heading || 0) * -1,
            400,
            'linear'
          )
        }
      } else {
        ;(map.current as any).setBearing(0)
      }

      // smoothSetBearing(map.current, -90, 400, 'linear')
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

    const v: protoRoot.trip.ITrip = {
      id,
      type,
      positions: [],
      statistics: {},
      permissions: {},
      weather: [],
      networkStatus: [],
      addresses: [],
      cities: [],
      roads: [],
      marks: [],
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
        lastWeather.current = undefined
        tripWeather.current = []
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

  const networkStatus = useRef<protoRoot.trip.ITripNetworkStatus[]>([])
  useEffect(() => {
    if (startTrip && trip?.id && !trip?.id.includes('IDB')) {
      const status = network.status === 'online' ? 1 : -1

      if (
        networkStatus.current[networkStatus.current.length - 1]?.status !==
        status
      ) {
        networkStatus.current.push({
          status: status,
          timestamp: moment().unix(),
        })
        updateNetworkStatus()
      }
    }
  }, [network, startTrip, trip?.id])

  const updateNetworkStatus = useCallback(async () => {
    // console.log('network2', network.status, startTrip, networkStatus, trip?.id)

    const tempTrip: protoRoot.trip.ITrip = {
      ...trip,
      weather: tripWeather.current,
      networkStatus: networkStatus.current || [],
    }

    await storage.trips.set(trip?.id || '', tempTrip)
    await storage.global.set('tempTripData_' + trip?.id || '', tempTrip)

    if (trip?.id && !trip?.id.includes('IDB') && network.status === 'online') {
      const res = await httpApi.v1.UpdateTripNetworkStatus({
        id: trip?.id,
        networkStatus: networkStatus.current || [],
      })

      // console.log(
      //   'network2 UpdateTripNetworkStatus',
      //   res,
      //   networkStatus.current
      // )
    }
  }, [network, startTrip, trip?.id])

  const lastWeather = useRef<protoRoot.trip.ITripWeather>()
  const tripWeather = useRef<protoRoot.trip.ITripWeather[]>([])
  useEffect(() => {
    if (startTrip && trip?.id && Number(weatherInfo.weatherCode) >= 0) {
      updateTripWeather()
    }
  }, [startTrip, trip, weatherInfo])

  const updateTripWeather = useCallback(async () => {
    const cur: protoRoot.trip.ITripWeather = {
      weatherCode: Number(weatherInfo.weatherCode),
      temperature: Number(weatherInfo.temperature),
      apparentTemperature: Number(weatherInfo.apparentTemperature),
      windSpeed: Number(weatherInfo.windSpeed),
      windDirection: Number(weatherInfo.windDirectionNum),
      humidity: Number(weatherInfo.humidity),
      precipitation: Number(weatherInfo.precipitation),
      timestamp: moment().unix(),
    }
    console.log('GetWeather curWeather', cur)

    let last = lastWeather.current

    if (
      !last?.timestamp ||
      cur.weatherCode !== last?.weatherCode ||
      Math.abs(Number(cur.temperature) - Number(last?.temperature)) >= 1 ||
      Math.abs(Number(cur.windSpeed) - Number(last?.windSpeed)) >= 10
    ) {
      const updateTripWeather = async () => {
        lastWeather.current = cur
        tripWeather.current = tripWeather.current?.concat(cur)

        if (!trip?.id) return
        const tempTrip: protoRoot.trip.ITrip = {
          ...trip,
          weather: tripWeather.current,
        }

        await storage.trips.set(trip?.id, tempTrip)
        await storage.global.set('tempTripData_' + trip.id, tempTrip)

        if (!trip.id.includes('IDB')) {
          const res = await httpApi.v1.UpdateTripWeather({
            id: trip?.id || '',
            weather: cur,
          })

          console.log(
            'GetWeather UpdateTripWeather',
            res,
            {
              id: trip?.id || '',
              weather: cur,
            },
            deepCopy(tempTrip),
            tripWeather.current
          )
        } else {
          // console.log('GetWeather UpdateTripWeather', tripWeather.current)
        }
      }
      updateTripWeather()
    }
  }, [startTrip, trip, weatherInfo])

  const updatePosition = async () => {
    const pl = tempPositions.current
      .filter((_, i) => {
        return i > updatedPositionIndex.current
      })
      .slice(0, 200)
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
    const tempTrip = {
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
    }
    await storage.trips.set(trip.id, tempTrip)
    await storage.global.set('tempTripData_' + trip.id, tempTrip)
    if (trip.id.includes('IDB')) {
      updatedPositionIndex.current = pLength - 1
    } else {
      if (network.status === 'offline') {
        return
      }
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
        updatedPositionIndex.current = Math.min(
          updatedPositionIndex.current + pl.length,
          pLength - 1
        )
      }
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

  const addRoad = async (roadInfo: typeof roadInfoList.current) => {
    let id = trip?.id || ''
    const entryTime = Math.round(new Date().getTime() / 1000)

    const lastRoad = roads.current.reduce((latest, city) => {
      return Math.max(
        ...(city?.entryTimes?.map((entry) => Number(entry?.timestamp)) || [])
      ) >
        Math.max(
          ...(latest?.entryTimes?.map((entry) => Number(entry.timestamp)) || [])
        )
        ? city
        : latest
    }, roads.current[0])

    // console.log('cities.current lastCity', lastCity)

    if (getRoadId(roadInfo) !== getRoadId(lastRoad?.roads || []) && trip?.id) {
      // 将城市信息存储到本地
      let isexits = false
      roads.current.some((v) => {
        if (getRoadId(v?.roads || []) === getRoadId(roadInfo)) {
          isexits = true
          v.entryTimes?.push({
            timestamp: entryTime,
          })
          return true
        }
      })

      if (!isexits) {
        roads.current.push({
          roads: roadInfo,
          entryTimes: [
            {
              timestamp: entryTime,
            },
          ],
        })
      }

      await storage.trips.set(trip.id, {
        ...trip,
        roads: roads.current,
      })
    }

    // console.log('roadInfo', roadInfo)
    if (user.isLogin && trip?.id) {
      const res = await httpApi.v1.UpdateRoad({
        tripId: id,
        // tripId: trip?.id || 'wKod7r4LS',
        roads: roadInfo,
        entryTime,
      })
      if (res.code === 200) {
        // 将城市信息存储到本地
      }
    }
  }

  const finishTrip = async () => {
    if (!trip?.id) return

    // const gpsJson = await axios.get('http://192.168.204.130:23202/JJd7XhWhe2')

    // console.log('UpdateTripPositionres gpsJson', gpsJson.data)

    // await reupdateTripPositions({
    //   id: trip.id || '',
    //   positions: gpsJson.data,
    // })

    // if (statistics.current.distance >= 50) {
    // 先存储到本地
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
    await storage.global.set('tempTripData_' + trip.id, tempTrip)

    await updatePosition()

    await updateNetworkStatus()

    // console.log('tempTrip getLocalTrips', tempTrip)
    // }
    if (trip.id.indexOf('IDB') < 0) {
      const res = await httpApi.v1.FinishTrip({
        id: trip.id,
      })
      console.log('FinishTrip', res)
      if (res.code === 200) {
        snackbar({
          message: t('finishTripTip', {
            ns: 'prompt',
            localNum: tempPositions.current.length,
            cloudNum: res?.data?.positionLength,
          }),
          autoHideDuration: 4000,
          vertical: 'top',
          horizontal: 'center',
        }).open()
        // 检测是否没传完，没传完的在这里继续，然后重新FinshTrip

        requestAnimationFrame(() => {
          dispatch(
            tripMethods.GetTripAddresses({
              trips: [trip],
              isSnackbar: true,
            })
          ).unwrap()
        })

        if (res?.data?.positionLength !== tempPositions.current.length) {
          await httpApi.v1.ResumeTrip({
            id: trip?.id,
          })
          await reupdateTripPositions({
            id: trip.id || '',
            positions: tempPositions.current,
          })
          const jsonString = JSON.stringify(tempPositions.current)

          // 创建File对象
          const file = new File(
            [jsonString], // 内容
            'backup_trip_' + trip?.id + '.json', // 文件名
            { type: 'application/json' } // 文件类型
          )

          const res = await uploadFile(file)
          snackbar({
            message: res,
            // autoHideDuration: 4000,
            closeIcon: true,
            onTap() {
              copyText(res)
            },
            vertical: 'bottom',
            horizontal: 'center',
          }).open()

          // 原始数组
          // copyText(jsonString)

          await httpApi.v1.FinishTrip({
            id: trip.id,
          })
          return
        }
        if (res?.data?.deleted) {
          snackbar({
            message: t('shortDistanceTrip', {
              ns: 'prompt',
            }),
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
    // setTrip(undefined)
    // dispatch(methods.trip.GetTripHistoricalStatistics({ type }))
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
        {/* <script src="./index.js"></script> */}
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
          className={
            'tp-main ' +
            (config.deviceWH.h >= 510
              ? 'compassRightBottom'
              : 'compassRightTop')
          }
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
                    bottom: 110,
                  }
            }
            currentPosition={!startTrip}
            // aichat={config.showIndexPageButton}
            aichat={config.showIndexPageButton}
            aichatParams={{
              visible: false,

              ...(true
                ? // ...(!config.devTrip
                  {
                    // startTrip: startTrip,
                    // startTrip: true,
                    startTrip: config.devTrip
                      ? // startTrip
                        true
                      : startTrip,
                    // tGetAllTripMemoryriggerReason: startTrip ? 'MILESTONE_DISTANCE' : '',
                    // currentTripData: AIContext.current.currentTripData,
                    // lastTripData: AIContext.current.lastTriggerData,
                  }
                : {
                    startTrip: true,
                    // triggerReason: 'MILESTONE_DISTANCE',

                    // currentTripData: {
                    //   city: '四川省·甘孜藏族自治州·巴塘县·夏邛镇',
                    //   altitude: 2498.44140625,
                    //   speed: 0.6600000262,
                    //   weather: '阴',
                    //   temp: 18.5,
                    //   road: '',
                    //   coords: {
                    //     latitude: 29.977319,
                    //     longitude: 99.087103,
                    //   },
                    //   time: 1757218995000,
                    //   statistics: {
                    //     speed: 0.904,
                    //     maxSpeed: 0.6600000262,
                    //     climbAltitude: 0.532,
                    //     descendAltitude: 0.317,
                    //     maxAltitude: 2498.7595214844,
                    //     minAltitude: 2498.44140625,
                    //     distance: 2.445,
                    //     averageSpeed: 0.61125,
                    //   } as any,
                    // },
                    // lastTripData: {
                    //   city: '四川省·甘孜藏族自治州·理塘县',
                    //   altitude: 2498.44140625,
                    //   speed: 0.6600000262,
                    //   weather: '阴',
                    //   temp: 18.5,
                    //   road: '',
                    //   coords: {
                    //     latitude: 29.977319,
                    //     longitude: 99.087103,
                    //   },
                    //   time: 1757218995000,
                    //   statistics: {
                    //     speed: 0.904,
                    //     maxSpeed: 0.6600000262,
                    //     climbAltitude: 0.532,
                    //     descendAltitude: 0.317,
                    //     maxAltitude: 2498.7595214844,
                    //     minAltitude: 2498.44140625,
                    //     distance: 2.445,
                    //     averageSpeed: 0.61125,
                    //   } as any,
                    // },
                  }),
            }}
            // trackRoute={!startTrip && config.showIndexPageButton}
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
              const [lat, lon] = getLatLng(
                mapUrl,
                toFixed(geo.position?.coords.latitude) || 0,
                toFixed(geo.position?.coords.longitude) || 0
              )
              map.current?.setView([lat, lon], 15)

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
              show={config.showIndexPageButton && !startTrip}
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
          <NoSSR>
            <NewDashboardComponent
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
              roads={
                roadInfoList.current?.filter((v) => {
                  return v.code !== 'A404'
                }) || []
              }
              headingUp={isHeadingUp || false}
              mapLayerType={mapLayerType}
            ></NewDashboardComponent>
          </NoSSR>

          {config.showIndexPageButton ? (
            <div
              className={
                'tp-m-trip-buttons ' +
                (showButtons.current ? 'show' : 'hide') +
                ' ' +
                (startTrip ? 'starting' : 'waiting') +
                ' ' +
                (user.isLogin ? 'login' : 'logout')
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
              bottom:
                (startTrip ? 40 + dashboardDataHeight.current + 0 : 4) + 'px',
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
                // header-background-color="rgb(245, 245, 245)"
                // header-max-width='740px'
                header-border-bottom="1px solid #ddd"
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
                              (historicalStatistics[type]?.statistics
                                ?.distance || 0) / 100
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
                              {Number(
                                historicalStatistics[type]?.statistics?.time
                              ) < 0
                                ? 0
                                : Math.round(
                                    ((Number(
                                      historicalStatistics[type]?.statistics
                                        ?.time
                                    ) || 0) /
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
                              {historicalStatistics[type]?.statistics?.count ||
                                0}
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
