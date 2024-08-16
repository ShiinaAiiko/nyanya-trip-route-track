import Head from 'next/head'
import TripLaout, { getLayout } from '../../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../../components/Footer'
import path from 'path'
import {
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
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'
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
	// testGpsData,
} from '../../plugins/methods'
import { getGeoInfo } from 'findme-js'
import Leaflet from 'leaflet'
import moment from 'moment'
import { httpApi } from '../../plugins/http/api'
import { protoRoot } from '../../protos'
import { TripType, cnMap, osmMap } from '../../store/config'
import { storage } from '../../store/storage'
import NoSSR from '../../components/NoSSR'
import md5 from 'blueimp-md5'
import ButtonsComponent from '../../components/Buttons'
import {
	changeLanguage,
	defaultLanguage,
	languages,
} from '../../plugins/i18n/i18n'

let tempTimer: any

const TripPage = () => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const [gpsStatusDebounce] = useState(new Debounce())

	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)
	const geo = useSelector((state: RootState) => state.geo)

	const router = useRouter()

	const updatedPositionIndex = useRef(0)
	const tDistance = useRef(0)
	const climbAltitude = useRef(0)
	const descendAltitude = useRef(0)
	const timer = useRef<NodeJS.Timeout>()
	const marker = useRef<Leaflet.Marker<any>>()
	const wakeLock = useRef<WakeLockSentinel>()
	const map = useRef<Leaflet.Map>()
	const loadedMap = useRef(false)
	const polyline = useRef<any>()
	const layer = useRef<any>()

	const heading = useRef(0)

	const tempPositions = useRef<
		{
			latitude: number
			longitude: number
			altitude: number
			altitudeAccuracy: number
			accuracy: number
			heading: number
			speed: number
			timestamp: number
			distance: number
		}[]
	>([])

	const [tripMarks, setTripMarks] = useState<
		{
			timestamp: number
		}[]
	>([])

	const [gpsSignalStatus, setGpsSignalStatus] = useState(-1)
	const [type, setType] = useState<TripType | ''>('')

	const [startTrip, setStartTrip] = useState(false)
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
	const [listenTime, setListenTime] = useState(0)

	const [statistics, setStatistics] = useState({
		speed: 0,
		maxSpeed: 0,
		maxAltitude: 0,
		climbAltitude: 0,
		descendAltitude: 0,
		averageSpeed: 0,
		distance: 0,
	})
	const [isLockScreen, setIsLockScreen] = useState(false)
	const [disablePanTo, setDisablePanTo] = useState(false)

	const [stopped, setStopped] = useState(false)

	const [dataTheme, setDataTheme] = useState('')
	const [openDataThemeDropDown, setOpenDataThemeDropDown] = useState(false)

	const [historicalStatistics, setHistoricalStatistics] = useState<{
		[type: string]: {
			distance: 0
			time: 0
			count: 0
		}
	}>({})
	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)
	const [trip, setTrip] = useState<protoRoot.trip.ITrip>()
	const [tripLength, setTripLength] = useState<number>(0)

	const [testData, setTestData] = useState<protoRoot.trip.ITrip>()

	const dispatch = useDispatch<AppDispatch>()

	useEffect(() => {
		setMounted(true)

		const init = async () => {
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

			// const getTestData = await axios('/testData1.json')
			// console.log('testData', getTestData.data.positions.reverse())
			// setTestData(getTestData.data)
		}
		init()
	}, [])

	useEffect(() => {
		if (!startTrip) return clearInterval(tempTimer)
		if (testData && startTrip) {
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
					if (i > testData.positions?.length - 1 || i > 500) {
						clearInterval(tempTimer)
						return
					}

					// console.log('oooooo', testData.positions[i])

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
				}, 100)
			}, 1000)
		}
	}, [testData, startTrip])

	useEffect(() => {
		dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
	}, [i18n.language])

	useEffect(() => {
		layer.current?.setGrayscale?.(config.isGrayscale)
	}, [config.isGrayscale])

	useEffect(() => {
		if (startCountdown === 0) {
			setDisablePanTo(false)
			setStartTrip(true)
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
		if (startTrip) {
			loadedMap.current = false
			initMap()

			polyline.current = undefined
			tDistance.current = 0
			climbAltitude.current = 0
			descendAltitude.current = 0
			updatedPositionIndex.current = 0
			tempPositions.current = []
			setTripMarks([])

			dispatch(layoutSlice.actions.setLayoutHeader(false))
			dispatch(layoutSlice.actions.setBottomNavigator(false))

			console.log(map, marker, map)
			!trip && addTrip()

			// map.current && marker.current && marker.current.removeFrom(map.current)
			// if (navigator.geolocation) {

			setStartTime(new Date().getTime())
			// let time = 1000 * 20 * 60
			let time = 0
			setListenTime(new Date().getTime() + time)

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

		setStatistics({
			speed: 0,
			maxSpeed: 0,
			maxAltitude: 0,
			climbAltitude: 0,
			descendAltitude: 0,
			averageSpeed: 0,
			distance: 0,
		})
		setListenTime(0)
		setGpsSignalStatus(-1)
		setStartTime(0)
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
		if (listenTime && Math.floor(listenTime / 1000) % 5 === 0) {
			updatePosition()
		}
	}, [listenTime])

	useEffect(() => {
		try {
			// console.log('geo.position', geo.position, geo.position?.coords?.heading)
			if (geo.position) {
				// 5秒内没有GPS信号，则视为信号差
				gpsStatusDebounce.increase(() => {
					setGpsSignalStatus(0)
				}, 5 * 1000)

				geo.position?.coords?.heading &&
					geo.position?.coords?.heading >= 0 &&
					(heading.current = geo.position.coords.heading)

				initMap()
				panToMap(geo.position, startTrip)

				// if (startTrip && position.timestamp >= startTime) {
				if (startTrip) {
					if ('wakeLock' in navigator) {
						requestWakeLock()
					}

					const tPositions = tempPositions.current
					const lv = tPositions[tPositions.length - 1]
					const v = geo.position.coords
					// console.log("tDistance",tDistance)
					// ？检测信号是否异常
					const gss = !(
						(
							geo.position.coords.speed === null ||
							geo.position.coords.altitude === null ||
							geo.position.coords.accuracy === null ||
							geo.position.coords.accuracy > 20
						)
						// ||	geo.position.coords.accuracy > 20
					)
					setGpsSignalStatus(gss ? 1 : 0)
					// 每秒超过500米视为异常
					if (
						geo.position.coords?.latitude &&
						Number(geo.position.coords?.speed) < 500
					) {
						let distance = 0
						if (lv) {
							distance = getDistance(
								geo.position.coords.latitude,
								geo.position.coords.longitude,
								lv.latitude,
								lv.longitude
							)
							// 移动距离小于0.5就是原地踏步
							// if (distance <= (type === 'Running' ? 0.5 : 0.8)) {
							if (Number(geo.position.coords.speed || 0) < 0.2) {
								// 第一次停止可以记录
								if (stopped) {
									console.log(
										'原地踏步中 distance1',
										distance,
										geo.position.coords,
										lv,
										'speed',
										geo.position.coords.speed
									)
									return
								}
								setStopped(true)
							} else {
								setStopped(false)
							}

							// console.log('distance1', distance, geo.position.coords, lv)
						}
						// 在这里绘制新的图
						console.log('gss', gss)
						if (gss) {
							const L: typeof Leaflet = (window as any).L
							if (map.current && L) {
								if (lv) {
									const speedColorLimit =
										config.speedColorLimit[
											(trip?.type?.toLowerCase() || 'drive') as any
										]

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
										speedColorLimit.maxSpeed
									)

									console.log(
										'playlinec',
										polyline.current?.options?.color === color,
										color
									)
									if (polyline.current?.options?.color === color) {
										;(
											polyline.current as ReturnType<typeof L.polyline>
										).addLatLng(
											getLatLng(
												config.mapUrl,
												v.latitude || 0,
												v.longitude || 0
											) as any
										)
									} else {
										const pl = L.polyline(
											[
												getLatLng(
													config.mapUrl,
													lv.latitude || 0,
													lv.longitude || 0
												) as any,
												getLatLng(
													config.mapUrl,
													v.latitude || 0,
													v.longitude || 0
												) as any,
											],
											{
												// smoothFactor:10,
												// snakingSpeed: 200,
												color, //线的颜色
												weight: config.mapPolyline.realtimeTravelTrackWidth, //线的粗细
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

								setStatistics({
									speed:
										distance /
										(Math.abs(geo.position.timestamp - lv.timestamp) / 1000),
									maxSpeed:
										(geo.position.coords.speed || 0) > statistics.maxSpeed
											? geo.position.coords.speed || 0
											: statistics.maxSpeed,
									climbAltitude: climbAltitude.current,
									descendAltitude: descendAltitude.current,
									maxAltitude:
										(geo.position.coords.altitude || 0) > statistics.maxAltitude
											? geo.position.coords.altitude || 0
											: statistics.maxAltitude,
									distance: tDistance.current,
									averageSpeed:
										tDistance.current /
										Math.round((listenTime - startTime) / 1000),
								})
								// console.log(
								// 	tDistance.current,
								// 	Math.round((listenTime - startTime) / 1000)
								// )
								// console.log("distance",distance)
							}

							tempPositions.current.push({
								longitude: geo.position.coords.longitude || 0,
								latitude: geo.position.coords.latitude || 0,
								altitude: geo.position.coords.altitude || -1,
								altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
								accuracy: geo.position.coords.accuracy || -1,
								heading: geo.position.coords.heading || -1,
								speed: geo.position.coords.speed || -1,
								timestamp: geo.position.timestamp || 0,
								distance: tDistance.current,
							})
						}
						// setPositionList(
						// 	positionList.concat([
						// 		{
						// 			longitude: geo.position.coords.longitude || 0,
						// 			latitude: geo.position.coords.latitude || 0,
						// 			altitude: geo.position.coords.altitude || -1,
						// 			altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
						// 			accuracy: geo.position.coords.accuracy || -1,
						// 			heading: geo.position.coords.heading || -1,
						// 			speed: geo.position.coords.speed || -1,
						// 			timestamp: geo.position.timestamp || 0,
						// 			distance: tDistance.current,
						// 		},
						// 	])
						// )
					}
					// getSpend()
				}
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
	}, [geo.position?.timestamp])

	useEffect(() => {
		if (config.country && !loadedMap.current) {
			initMap()
		}
	}, [config.country])

	useEffect(() => {
		loadedMap.current = false
		initMap()
	}, [config.mapUrl])

	useEffect(() => {
		geo.position && map && panToMap(geo.position)
	}, [map])
	// console.log('router', router.pathname)

	useEffect(() => {
		console.log('tyupe', router.pathname, type, user.isLogin)
		type && getTripStatistics(type)
	}, [user.isLogin, type])

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

	const initMap = () => {
		const L: typeof Leaflet = (window as any).L
		// console.log(
		// 	'initMap',
		// 	L,
		// 	config.country,
		// 	config.connectionOSM,
		// 	geo.position,
		// 	deepCopy(geo.position),
		// 	loadedMap.current,
		// 	L &&
		// 		!loadedMap.current &&
		// 		geo.position?.coords?.latitude &&
		// 		config.mapUrl !== 'AutoSelect'
		// )
		if (
			L &&
			!loadedMap.current &&
			geo.position?.coords?.latitude &&
			config.mapUrl !== 'AutoSelect'
		) {
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
					zoomControl: false,
					minZoom: 3,
					maxZoom: 18,
					zoomSnap: 0.5,

					attributionControl: false,
					// center: [Number(res?.data?.lat), Number(res?.data?.lon)],
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
				// console.log("config.mapUrl",config.mapUrl)
				layer.current = (L.tileLayer as any)
					.grayscale(config.mapUrl, {
						// className:""
						// errorTileUrl: osmMap,
						// attribution: `&copy;`,
					})
					.addTo(map.current)
				layer.current.setGrayscale(config.isGrayscale)

				console.log('layer', layer)
				// }
				//定义一个地图缩放控件
				// var zoomControl = L.control.zoom({ position: 'topleft' })
				// //将地图缩放控件加载到地图
				// m.addControl(zoomControl)
				// m.removeControl(zoomControl)
				map.current.on('click', (e) => {
					let popLocation = e.latlng
					console.log(popLocation, {
						latitude: Math.round(popLocation.lat * 1000000) / 1000000,
						longitude: Math.round(popLocation.lng * 1000000) / 1000000,
					})
					// L.popup()
					// 	.setLatLng(popLocation)
					// 	.setContent(
					// 		`${Math.round(popLocation.lat * 1000000) / 1000000} - ${
					// 			Math.round(popLocation.lng * 1000000) / 1000000
					// 		}`
					// 	)
					// 	.openOn(map.current)

					dispatch(
						geoSlice.actions.setSelectPosition({
							latitude: Math.round(popLocation.lat * 1000000) / 1000000,
							longitude: Math.round(popLocation.lng * 1000000) / 1000000,
						})
					)
				})
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

	const panToMap = (position: GeolocationPosition, allowPanto?: boolean) => {
		const L: typeof Leaflet = (window as any).L

		// console.log('panToMap', position, map.current, L, marker.current)
		if (map.current && L) {
			const [lat, lon] = getLatLng(
				config.mapUrl,
				position?.coords.latitude || 0,
				position?.coords.longitude || 0
			)

			// console.log('panto', !disablePanTo || allowPanto, [lat, lon])

			if (!disablePanTo || allowPanto) {
				map.current.panTo([lat, lon], {
					animate: false,
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
				marker.current = L.marker([lat, lon], {
					icon: L.divIcon({
						html: "<div class='map_current_position_icon-wrap'></div>",
						className:
							'map_current_position_icon ' +
							(user?.userInfo?.avatar ? ' avatar' : ''),
						// iconUrl: user?.userInfo?.avatar || '',
						// iconUrl: '/current_position_50px.png',
						// iconUrl: user?.userInfo?.avatar || '/current_position_50px.png',
						iconSize: [26, 26], // size of the icon
						// shadowSize: [36, 36], // size of the shadow
						// iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
						// shadowAnchor: [4, 62], // the same for the shadow
						// popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
					}),
				})
					.addTo(map.current)
					// .bindPopup(
					// 	`${ipInfoObj.ipv4}`
					// 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
					// )
					.openPopup()
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

	const addTrip = async () => {
		let id = 'IDB_' + md5(String(new Date().getTime()))

		const v = {
			id,
			type,
			positions: [],
			statistics: {},
			permissions: {},
			status: 0,
			createTime: Math.floor(new Date().getTime() / 1000),
			startTime: Math.floor(new Date().getTime() / 1000),
		}
		setTrip(v)
		await storage.trips.set(id, v)

		if (user.isLogin) {
			const params: protoRoot.trip.AddTrip.IRequest = {
				type,
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
		// console.log('updatePosition', trip, pl, updatedPositionIndex.current)
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
		if (trip.id.indexOf('IDB') < 0) {
			const params: protoRoot.trip.UpdateTripPosition.IRequest = {
				id: trip?.id || '',
				distance: statistics.distance,
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
		const t = Math.floor(new Date().getTime() / 1000)
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

	const finishTrip = async () => {
		if (!trip?.id) return
		await updatePosition()

		// if (statistics.distance >= 50) {
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
				distance: Math.round(statistics.distance * 10000) / 10000,
				maxSpeed: statistics.maxSpeed,
				averageSpeed: statistics.averageSpeed,
				maxAltitude: statistics.maxAltitude,
				climbAltitude: statistics.climbAltitude,
				descendAltitude: statistics.descendAltitude,
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
				await storage.trips.delete(trip.id)
				// await storage.trips.set(trip.id, tempTrip)
			}
		} else {
			if (statistics.distance >= 50) {
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
		getTripStatistics(type)
	}

	const getTripStatistics = async (type: string) => {
		console.log(loadStatus, loadStatus === 'loading' || loadStatus == 'noMore')
		if (loadStatus === 'loading' || loadStatus == 'noMore') return
		setLoadStatus('loading')
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
				obj[v.value.type].time +=
					(Number(v.value.endTime) || 0) - (Number(v.value.startTime) || 0)
			})
			setHistoricalStatistics({
				...historicalStatistics,
				...obj,
			})
			setLoadStatus('loaded')
			return
		}
		const res = await httpApi.v1.GetTripStatistics({
			type: type,
			timeLimit: [1540915200, Math.floor(new Date().getTime() / 1000)],
		})
		console.log('getTripStatistics', res)
		if (res.code === 200) {
		}
		const obj: any = {}
		obj[type] = {
			count: res?.data?.count || 0,
			distance: res?.data?.distance || 0,
			time: res?.data?.time || 0,
		}
		setHistoricalStatistics({
			...historicalStatistics,
			...obj,
		})
		setLoadStatus('loaded')
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
					name='description'
					content={t('subtitle', {
						ns: 'tripPage',
					})}
				/>
			</Head>
			<div
				style={
					{
						'--position-heading': (heading.current || 0) + 'deg',
					} as any
				}
				className='trip-page'
			>
				<div className='tp-main'>
					<ButtonsComponent
						currentPosition={!startTrip}
						trackRoute={!startTrip}
						layer={!startTrip}
						onCurrentPosition={() => {
							setDisablePanTo(true)
							geo.position && panToMap(geo.position, true)
						}}
					></ButtonsComponent>
					<div
						id='tp-map'
						className={(startTrip ? 'start ' : ' ') + config.deviceType}
					></div>
					{startTrip ? (
						<div className={'tp-m-data ' + config.deviceType + ' ' + dataTheme}>
							{dataTheme ? (
								<div className='data-theme'>
									<saki-dropdown
										visible={openDataThemeDropDown}
										floating-direction='Left'
										z-index='1001'
										ref={bindEvent({
											close: (e) => {
												setOpenDataThemeDropDown(false)
											},
										})}
									>
										<saki-button
											ref={bindEvent({
												tap: () => {
													setOpenDataThemeDropDown(true)
												},
											})}
											bg-color='transparent'
											bg-hover-color='transparent'
											bg-active-color='transparent'
											border='none'
											type='Normal'
											padding='4px 4px 4px 0'
										>
											<saki-row align-items='center'>
												<saki-icon
													width='30px'
													color={dataTheme === 'Dark' ? '#fff' : '#000'}
													type={dataTheme === 'Dark' ? 'SunFill' : 'MoonFill'}
												></saki-icon>
												<span>
													{t(dataTheme.toLowerCase(), {
														ns: 'settings',
													})}
												</span>
											</saki-row>
										</saki-button>
										<div slot='main'>
											<saki-menu
												ref={bindEvent({
													selectvalue: async (e) => {
														console.log(e.detail.value)

														setDataTheme(e.detail.value)

														setOpenDataThemeDropDown(false)
														await storage.global.set(
															'dataTheme',
															e.detail.value
														)
													},
												})}
											>
												<saki-menu-item padding='10px 14px' value={'Light'}>
													<saki-row align-items='center'>
														<saki-icon
															width='30px'
															color='#666'
															type='SunFill'
														></saki-icon>
														<span>
															{t('light', {
																ns: 'settings',
															})}
														</span>
													</saki-row>
												</saki-menu-item>
												<saki-menu-item padding='10px 14px' value={'Dark'}>
													<saki-row align-items='center'>
														<saki-icon
															width='30px'
															color='#666'
															type='MoonFill'
														></saki-icon>
														<span>
															{t('dark', {
																ns: 'settings',
															})}
														</span>
													</saki-row>
												</saki-menu-item>
											</saki-menu>
										</div>
									</saki-dropdown>
								</div>
							) : (
								''
							)}

							<div className='data-speed'>
								<div className='ds-value'>
									{gpsSignalStatus === 1
										? stopped
											? 0
											: tempPositions.current[tempPositions.current.length - 1]
													?.speed <= 0
											? 0
											: Math.round(
													((tempPositions.current[
														tempPositions.current.length - 1
													]?.speed || 0) *
														3600) /
														100
											  ) / 10
										: '---'}
								</div>
								<div className='ds-unit'>km/h</div>
							</div>
							<div className='data-bottom'>
								<div className='data-b-item'>
									<div className='di-value'>
										{formatDistance(
											tempPositions.current[tempPositions.current.length - 1]
												?.distance
										)}
									</div>
									<div className='di-unit'>
										{t('distance', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item time'>
									<div className='di-value'>
										<span>
											{formatTime(startTime / 1000, listenTime / 1000)}
										</span>
									</div>
									<div className='di-unit'>
										{t('duration', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										{gpsSignalStatus === 1
											? (tempPositions.current[tempPositions.current.length - 1]
													?.altitude <= 0
													? 0
													: Math.round(
															(tempPositions.current[
																tempPositions.current.length - 1
															]?.altitude || 0) * 10
													  ) / 10) + '  m'
											: '---'}
									</div>
									<div className='di-unit'>
										{t('altitude', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										<div className='di-value'>
											{Math.round(((statistics.maxSpeed || 0) * 3600) / 100) /
												10}
											<span className='di-v-unit'>km/h</span>
										</div>
									</div>
									<div className='di-unit'>
										{t('maxSpeed', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										{Math.round((statistics.climbAltitude || 0) * 10) / 10 +
											'  m'}
									</div>
									<div className='di-unit'>
										{t('climbAltitude', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										{Math.round((statistics.descendAltitude || 0) * 10) / 10 +
											'  m'}
									</div>
									<div className='di-unit'>
										{t('descendAltitude', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								{/* <div className='data-b-item'>
									<div className='di-value'>
										{Math.round((statistics.maxAltitude || 0) * 10) / 10 +
											'  m'}
									</div>
									<div className='di-unit'>
										{t('maxAltitude', {
											ns: 'tripPage',
										})}
									</div>
								</div> */}
							</div>
							<div className='data-position'>
								<span>LAT {geo.position?.coords.latitude}</span>
								<span> - </span>
								<span>LNG {geo.position?.coords.longitude}</span>
								<span> - </span>
								<span>{Math.round(geo.position?.coords.accuracy)}</span>
								<span> - </span>
								{/* <span>{Math.round(geo.position?.coords.altitude || 0)}</span>
								<span> - </span>
								<span>
									{Math.round(geo.position?.coords.altitudeAccuracy || 0)}
								</span>
								<span> - </span> */}
								<span>{Math.round(geo.position?.coords.heading || 0)}</span>
								<span> - </span>
								<span>
									{updatedPositionIndex.current +
										'/' +
										tempPositions.current.length}
								</span>
								{(trip?.id || '').indexOf('IDB') >= 0 ? (
									<>
										<span> - </span>
										<span>{t('local')}</span>
									</>
								) : (
									''
								)}

								{/* <span> - </span>
								<span>
									{t('averageSpeed', {
										ns: 'tripPage',
									}) + ' '}
									{Math.round(((statistics.averageSpeed || 0) * 3600) / 100) /
										10}{' '}
									km/h
								</span> */}
							</div>
							<div className={'data-gps '}>
								<saki-icon
									color={
										gpsSignalStatus === 1
											? 'var(--saki-default-color)'
											: gpsSignalStatus === 0
											? '#eccb56'
											: '#b0aa93'
									}
									type='GPSFill'
								></saki-icon>
							</div>
						</div>
					) : (
						<div className='tp-m-type-buttons'>
							{mounted ? (
								<saki-tabs
									type='Flex'
									// header-background-color='rgb(245, 245, 245)'
									// header-max-width='740px'
									// header-border-bottom='none'
									header-padding='0 10px'
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
												font-size='14px'
												label={v}
												name={t(v.toLowerCase(), {
													ns: 'tripPage',
												})}
												key={i}
											>
												<div className='buttons-item'>
													<div className='bi-distance'>
														<span className='value'>
															{Math.round(
																(historicalStatistics[type]?.distance || 0) /
																	100
															) / 10 || 0}
														</span>
														<span className='name'>
															km
															{/* {t('distance', {
                              ns: 'tripPage',
                            }) + ' (km)'} */}
														</span>
													</div>
													<div className='bi-right'>
														<div className='bi-time'>
															<span className='value'>
																{historicalStatistics[type]?.time < 0
																	? 0
																	: Math.round(
																			((historicalStatistics[type]?.time || 0) /
																				3600) *
																				100
																	  ) / 100 || 0}
															</span>
															<span className='name'>
																{t('duration', {
																	ns: 'tripPage',
																}) + ' (h)'}
															</span>
														</div>
														<div className='bi-count'>
															<span className='value'>
																{historicalStatistics[type]?.count || 0}
															</span>
															<span className='name'>
																{t('trips', {
																	ns: 'tripPage',
																})}
															</span>
														</div>
														<saki-button
															ref={bindEvent({
																tap: () => {
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
																},
															})}
															type='CircleIconGrayHover'
														>
															<saki-icon color='#999' type='Right'></saki-icon>
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
					)}
					<div className={'tp-m-trip-buttons ' + (startTrip ? 'starting' : '')}>
						<div
							onClick={async () => {
								if (startTrip) {
									setStartTrip(false)
									return
								}
								setStartCountdown(0)
							}}
							className={
								'tp-b-item start ' + (startCountdown !== -1 ? 'starting' : '')
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
					<div
						className={
							'tp-m-trip-right-buttons ' + (startTrip ? 'starting' : '')
						}
					>
						<div
							onClick={async () => {
								await addMark()
							}}
							className={'tp-b-item mark addMark'}
						>
							<saki-icon
								width='28px'
								height='28px'
								color='#fff'
								type='Flag'
							></saki-icon>
							{tripMarks.length ? (
								<span className='tp-b-i-marklength'>{tripMarks.length}</span>
							) : (
								''
							)}
						</div>
					</div>
					{!(
						geo.selectPosition.latitude === -10000 &&
						geo.selectPosition.longitude === -10000
					) ? (
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
							{geo.selectPosition.latitude + ',' + geo.selectPosition.longitude}
						</div>
					) : (
						''
					)}
					{/* <div
						style={{
							margin: '150px 0 0',
						}}
					></div>
					<FooterComponent></FooterComponent> */}
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
