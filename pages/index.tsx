import Head from 'next/head'
import TripLaout from '../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../components/Footer'
import path from 'path'
import {
	RootState,
	AppDispatch,
	layoutSlice,
	useAppDispatch,
	methods,
	apiSlice,
	geoSlice,
} from '../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'
import { deepCopy, NyaNyaWasm, QueueLoop } from '@nyanyajs/utils'
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
} from '../plugins/methods'
import { getGeoInfo } from 'findme-js'
import Leaflet from 'leaflet'
import moment from 'moment'
import { clearInterval, setInterval } from 'timers'
import { setConfig } from 'next/config'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { cnMap, osmMap } from '../store/config'
import { storage } from '../store/storage'
import NoSSR from '../components/NoSSR'
import md5 from 'blueimp-md5'
const TripPage = () => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)
	const geo = useSelector((state: RootState) => state.geo)

	const testDataIndex = useRef(0)
	const updatedPositionIndex = useRef(0)
	const tDistance = useRef(0)
	const timer = useRef<NodeJS.Timeout>()
	const marker = useRef<Leaflet.Marker<any>>()
	const wakeLock = useRef<WakeLockSentinel>()
	const map = useRef<Leaflet.Map>()
	const loadedMap = useRef(false)

	const [gpsSignalStatus, setGpsSignalStatus] = useState(-1)
	const [type, setType] = useState<'Running' | 'Bike' | 'Drive' | 'Local'>(
		'Running'
	)

	const [startTrip, setStartTrip] = useState(false)
	const [startCountdown, setStartCountdown] = useState(-1)

	const [positionList, setPositionList] = useState<
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

	const [startTime, setStartTime] = useState(0)
	const [listenTime, setListenTime] = useState(0)

	const [statistics, setStatistics] = useState({
		speed: 0,
		maxSpeed: 0,
		maxAltitude: 0,
		averageSpeed: 0,
		distance: 0,
	})
	const [isLockScreen, setIsLockScreen] = useState(false)
	const [disablePanTo, setDisablePanTo] = useState(false)

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

	const dispatch = useDispatch<AppDispatch>()

	useEffect(() => {
		setMounted(true)
		const init = async () => {
			const trips = await storage.trips.getAll()
			console.log('trips.getAll', trips)

			setTripLength(trips.length)
			document.addEventListener('visibilitychange', async () => {
				if (wakeLock !== null && document.visibilityState === 'visible') {
					requestWakeLock()
				}
			})
		}
		init()
	}, [])

	useEffect(() => {
		dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
	}, [i18n.language])

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

	useEffect(() => {
		timer && clearInterval(timer.current)
		// navigator.geolocation.clearWatch(watchId.current)
		if (startTrip) {
			tDistance.current = 0
			updatedPositionIndex.current = 0

			dispatch(layoutSlice.actions.setLayoutHeader(false))
			dispatch(layoutSlice.actions.setBottomNavigator(false))

			console.log(map, marker, map)
			map.current && marker.current && marker.current.removeFrom(map.current)
			// if (navigator.geolocation) {

			setStartTime(new Date().getTime())
			// let time = 1000 * 20 * 60
			let time = 0
			setListenTime(new Date().getTime() + time)
			timer.current = setInterval(() => {
				setListenTime(new Date().getTime() + time)
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

			!trip && addTrip()

			// return
			// }
			// console.log('该浏览器不支持获取地理位置')
			return
		}

		setStatistics({
			speed: 0,
			maxSpeed: 0,
			maxAltitude: 0,
			averageSpeed: 0,
			distance: 0,
		})
		setListenTime(0)
		setGpsSignalStatus(-1)
		setStartTime(0)
		setPositionList([])

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
			// console.log(position)
			if (geo.position) {
				initMap()
				panToMap(geo.position)
				// if (startTrip && position.timestamp >= startTime) {
				if (startTrip) {
					if ('wakeLock' in navigator) {
						requestWakeLock()
					}
					// console.log("tDistance",tDistance)
					// ？检测信号是否异常
					const gss = !(
						geo.position.coords.speed === null ||
						geo.position.coords.altitude === null ||
						geo.position.coords.accuracy === null
					)
					setGpsSignalStatus(gss ? 1 : 0)
					// 每秒超过500米视为异常
					if (
						geo.position.coords?.latitude &&
						Number(geo.position.coords?.speed) < 500
					) {
						// 在这里绘制新的图
						if (gss) {
							const L: typeof Leaflet = (window as any).L
							const lv = positionList[positionList.length - 1]
							if (map.current && L) {
								if (lv) {
									const v = geo.position.coords
									const speedColorLimit =
										config.speedColorLimit[
											(trip?.type?.toLowerCase() || 'running') as any
										]
									L.polyline(
										[
											getLatLng(lv.latitude || 0, lv.longitude || 0) as any,
											getLatLng(v.latitude || 0, v.longitude || 0) as any,
										],
										{
											// smoothFactor:10,
											// snakingSpeed: 200,
											color: getSpeedColor(
												v.speed || 0,
												speedColorLimit.minSpeed,
												speedColorLimit.maxSpeed
											), //线的颜色
											weight: config.mapPolyline.width, //线的粗细
											// opacity: 0.3,
										}
									).addTo(map.current)
								}
							}
							if (lv) {
								const distance = getDistance(
									geo.position.coords.latitude,
									geo.position.coords.longitude,
									lv.latitude,
									lv.longitude
								)
								tDistance.current += distance

								setStatistics({
									speed:
										distance /
										(Math.abs(geo.position.timestamp - lv.timestamp) / 1000),
									maxSpeed:
										(geo.position.coords.speed || 0) > statistics.maxSpeed
											? geo.position.coords.speed || 0
											: statistics.maxSpeed,
									maxAltitude:
										(geo.position.coords.altitude || 0) > statistics.maxAltitude
											? geo.position.coords.altitude || 0
											: statistics.maxAltitude,
									distance: tDistance.current,
									averageSpeed:
										tDistance.current /
										Math.round((listenTime - startTime) / 1000),
								})
								console.log(
									tDistance.current,
									Math.round((listenTime - startTime) / 1000)
								)
								// console.log("distance",distance)
							}
						}
						setPositionList(
							positionList.concat([
								{
									longitude: geo.position.coords.longitude || 0,
									latitude: geo.position.coords.latitude || 0,
									altitude: geo.position.coords.altitude || -1,
									altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
									accuracy: geo.position.coords.accuracy || -1,
									heading: geo.position.coords.heading || -1,
									speed: geo.position.coords.speed || -1,
									timestamp: geo.position.timestamp || 0,
									distance: tDistance.current,
								},
							])
						)
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

	useEffect(() => {
		console.log('tyupe', type, user.isLogin)
		getTripStatistics()
	}, [user, type])

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
		console.log(
			'initMap',
			L,
			config.country,
			config.connectionOSM,
			geo.position,
			deepCopy(geo.position),
			loadedMap.current,
			L &&
				!loadedMap.current &&
				geo.position?.coords?.latitude &&
				config.mapUrl !== 'AutoSelect'
		)
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
				const layer = L.tileLayer(config.mapUrl, {
					// errorTileUrl: osmMap,
					// attribution: `&copy;`,
				}).addTo(map.current)

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
				position?.coords.latitude || 0,
				position?.coords.longitude || 0
			)

			;(!disablePanTo || allowPanto) && map.current.panTo([lat, lon], {})
			// map.current.panInside([v.latitude, v.longitude], {
			// 	paddingTopLeft: [220, 1],
			// })
			// console.log('marker', marker)
			if (!startTrip) {
				if (!marker.current) {
					let icon = L.icon({
						className: 'map_current_position_icon',
						iconUrl: '/current_position_50px.png',
						iconSize: [20, 20], // size of the icon
						// shadowSize: [36, 36], // size of the shadow
						// iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
						// shadowAnchor: [4, 62], // the same for the shadow
						// popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
					})
					marker.current = L.marker([lat, lon], {
						icon: icon,
					})
						.addTo(map.current)
						// .bindPopup(
						// 	`${ipInfoObj.ipv4}`
						// 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
						// )
						.openPopup()
				}
				marker.current.setLatLng([lat, lon])
			}
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
		if (!user.isLogin) {
			const id = 'IDB_' + md5(String(startTime))

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
			return
		}
		const params: protoRoot.trip.AddTrip.IRequest = {
			type,
			// startTime: Math.floor(startTime / 1000),
		}
		console.log(params)
		const res = await httpApi.v1.AddTrip(params)
		console.log('addTrip', res)
		if (res.code === 200) {
			console.log(res?.data?.trip)
			res?.data?.trip && setTrip(res?.data?.trip)
		}
	}

	const updatePosition = async () => {
		const pl = positionList.filter((_, i) => {
			return i > updatedPositionIndex.current
		})
		console.log('updatePosition', trip, pl)
		if (!trip?.id || !pl.length) return
		const params: protoRoot.trip.UpdateTripPosition.IRequest = {
			id: trip?.id || '',
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
		console.log(params)
		const pLength = positionList.length

		if (!trip?.authorId) {
			setTrip({
				...trip,
				...params,
			})
			await storage.trips.set(trip.id, {
				...trip,
				...params,
			})
			updatedPositionIndex.current = pLength - 1
			return
		}
		const res = await httpApi.v1.UpdateTripPosition(params)
		console.log('updateTripPosition', res)
		if (res.code === 200) {
			updatedPositionIndex.current = pLength - 1
		}
	}

	const finishTrip = async () => {
		if (!trip?.id) return
		await updatePosition()
		const params: protoRoot.trip.FinishTrip.IRequest = {
			id: trip?.id || '',
			statistics: {
				distance: statistics.distance,
				maxSpeed: statistics.maxSpeed,
				averageSpeed: statistics.averageSpeed,
				maxAltitude: statistics.maxAltitude,
			},
		}
		console.log(params)

		if (!trip?.authorId) {
			if (statistics.distance < 50) {
				snackbar({
					message: '距离过短, 距离需过50m才会记录',
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
				}).open()
				return
			}
			setTrip({
				...trip,
				...params,
				status: 1,
				endTime: Math.floor(new Date().getTime() / 1000),
			})
			await storage.trips.set(trip.id, {
				...trip,
				...params,
				status: 1,
				endTime: Math.floor(new Date().getTime() / 1000),
			})
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
			return
		}
		const res = await httpApi.v1.FinishTrip(params)
		console.log('FinishTrip', res)
		if (res.code === 200) {
			setTrip(undefined)
			if (res?.data?.deleted) {
				snackbar({
					message: '距离过短, 距离需过50m才会记录',
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
				}).open()
				return
			}
		}
		getTripStatistics()
	}

	const getTripStatistics = async () => {
		console.log(loadStatus,loadStatus === 'loading' || loadStatus == 'noMore')
		if (loadStatus === 'loading' || loadStatus == 'noMore') return
    setLoadStatus('loading') 
    console.log(!user.isLogin || type === 'Local')
		if (!user.isLogin || type === 'Local') {
			const trips = await storage.trips.getAll()
			console.log('getLocalTrips', trips)

			let distance = 0
			let time = 0
			trips.forEach((v) => {
				distance += v.value.statistics?.distance || 0
				time +=
					(Number(v.value.endTime) || 0) - (Number(v.value.startTime) || 0)
			})
			const obj: any = {}
			obj[type] = {
				count: trips.length || 0,
				distance: distance,
				time: time,
			}
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
			</Head>
			<div className='trip-page'>
				<div className='tp-main'>
					<div id='tp-map'></div>
					<div className='map-buttons'>
						<NoSSR>
							{/* <saki-button
								ref={bindEvent({
									tap: () => {
										setDisablePanTo(true)
										geo.position && panToMap(geo.position, true)
									},
								})}
								padding='24px'
								margin='16px 0 0 0'
								type='CircleIconGrayHover'
								box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
							>
								<saki-icon
									color='var(--saki-default-color)'
									width='20px'
									height='20px'
									type='Send'
								></saki-icon>
							</saki-button> */}
							<saki-button
								ref={bindEvent({
									tap: () => {
										setDisablePanTo(true)
										geo.position && panToMap(geo.position, true)
									},
								})}
								padding='24px'
								margin='16px 0 0 0'
								type='CircleIconGrayHover'
								box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
							>
								<saki-icon
									color='var(--saki-default-color)'
									width='30px'
									height='30px'
									type='CurrentPosition'
								></saki-icon>
							</saki-button>
						</NoSSR>
					</div>
					{startTrip ? (
						<div className={'tp-m-data ' + config.deviceType}>
							<div className='data-speed'>
								<div className='ds-value'>
									{positionList[positionList.length - 1]?.speed <= 0
										? 0
										: Math.round(
												((positionList[positionList.length - 1]?.speed || 0) *
													3600) /
													100
										  ) / 10}
								</div>
								<div className='ds-unit'>km/h</div>
							</div>
							<div className='data-bottom'>
								<div className='data-b-item'>
									<div className='di-value'>
										{formatDistance(
											positionList[positionList.length - 1]?.distance
										)}
									</div>
									<div className='di-unit'>
										{t('distance', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
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
										{positionList[positionList.length - 1]?.altitude <= 0
											? 0
											: Math.round(
													(positionList[positionList.length - 1]?.altitude ||
														0) * 10
											  ) / 10}{' '}
										m
									</div>
									<div className='di-unit'>
										{t('altitude', {
											ns: 'tripPage',
										})}
									</div>
								</div>
							</div>
							<div className='data-position'>
								<span>{geo.position?.coords.latitude}</span>
								<span> - </span>
								<span>{geo.position?.coords.longitude}</span>
								<span> - </span>
								<span>
									{updatedPositionIndex.current + '/' + positionList.length}
								</span>
								<span> - </span>
								<span>
									{t('averageSpeed', {
										ns: 'tripPage',
									}) + ' '}
									{Math.round(((statistics.averageSpeed || 0) * 3600) / 100) /
										10}{' '}
									km/h
								</span>
								{/* <span> - </span>
								<span>
									{Math.round(((statistics.speed || 0) * 3600) / 100) / 10} km/h
								</span> */}
							</div>
							<div className='data-gps'>
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
									// header-item-min-width='80px'
									active-tab-label={type}
									disable-more-button
									ref={bindEvent({
										tap: (e) => {
											console.log('tap', e)
											setType(e.detail.label)
										},
									})}
								>
									{config.tripTypes.map((v, i) => {
										return v === 'Local' || (user.isLogin && v !== 'Local') ? (
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
																{Math.round(
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

					<div className='tp-m-trip-buttons'>
						<div
							onClick={async () => {
								if (startTrip) {
									setStartTrip(false)
									return
								}
								setStartCountdown(3)
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
TripPage.getLayout = function getLayout(page: any) {
	return <TripLaout>{page}</TripLaout>
}

export default TripPage
