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
const TripPage = () => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)

	const testDataIndex = useRef(0)
	const updatedPositionIndex = useRef(0)
	const tDistance = useRef(0)
	const timer = useRef<NodeJS.Timeout>()
	const marker = useRef<Leaflet.Marker<any>>()
	const watchId = useRef(0)
	const wakeLock = useRef<WakeLockSentinel>()
	const map = useRef<Leaflet.Map>()
	const loadedMap = useRef(false)

	const [gpsSignalStatus, setGpsSignalStatus] = useState(-1)
	const [type, setType] = useState<'Running' | 'Bike' | 'Drive'>('Running')

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
	const [position, setPosition] = useState<GeolocationPosition>()
	const [selectPosition, setSelectPosition] = useState<{
		latitude: number
		longitude: number
	}>({
		latitude: -10000,
		longitude: -10000,
	})

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

	const dispatch = useDispatch<AppDispatch>()

	useEffect(() => {
		setMounted(true)

		document.addEventListener('visibilitychange', async () => {
			if (wakeLock !== null && document.visibilityState === 'visible') {
				requestWakeLock()
			}
		})

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					// const t = setTimeout(() => {
					// const L: typeof Leaflet = (window as any).L
					// if (L) {
					setSelectPosition({
						longitude: pos.coords.longitude,
						latitude: pos.coords.latitude,
					})

					setPosition(pos)
					// setPosition({
					// 	...pos,
					// 	// coords: {
					// 	// 	...pos.coords,
					// 	// 	latitude: 29.417266,
					// 	// 	longitude: 105.594791,
					// 	// },
					// })
					// clearTimeout(t)
					// }
					// }, 500)
				},
				(error) => {
					if (error.code === 1) {
						snackbar({
							message: '必须开启定位权限，请检查下是否开启定位权限',
							autoHideDuration: 2000,
							vertical: 'top',
							horizontal: 'center',
						}).open()
					}
					console.log('GetCurrentPosition Error', error)
				},
				{ enableHighAccuracy: true }
			)

			navigator.geolocation.clearWatch(watchId.current)
			watchId.current = navigator.geolocation.watchPosition(
				(pos) => {
					// console.log(1, new Date().getTime())
					// setListenTime(new Date().getTime())
					setPosition(pos)
				},
				(error) => {
					console.log('GetCurrentPosition Error', error)
				},
				{
					enableHighAccuracy: true,
				}
			)
		} else {
			console.log('该浏览器不支持获取地理位置')
		}
	}, [])

	useEffect(() => {
		dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
	}, [i18n.language])

	useEffect(() => {
		if (startCountdown === 0) {
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
		navigator.geolocation.clearWatch(watchId.current)
		if (startTrip) {
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
		tDistance.current = 0
		updatedPositionIndex.current = 0

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
			if (position) {
				initMap()
				panToMap(position)
				// if (startTrip && position.timestamp >= startTime) {
				if (startTrip) {
					if ('wakeLock' in navigator) {
						requestWakeLock()
					}
					// console.log("tDistance",tDistance)
					// ？检测信号是否异常
					const gss = !(
						position.coords.speed === null ||
						position.coords.altitude === null ||
						position.coords.accuracy === null ||
						position.coords.speed < 0
					)
					setGpsSignalStatus(gss ? 1 : 0)
					// 每秒超过500米视为异常
					if (
						position.coords?.latitude &&
						Number(position.coords?.speed) < 500
					) {
						// 在这里绘制新的图
						if (gss) {
							const L: typeof Leaflet = (window as any).L
							const lv = positionList[positionList.length - 1]
							if (map.current && L) {
								if (lv) {
									const v = position.coords
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
											weight: 8, //线的粗细
											// opacity: 0.3,
										}
									).addTo(map.current)
								}
							}
							if (lv) {
								const distance = getDistance(
									position.coords.latitude,
									position.coords.longitude,
									lv.latitude,
									lv.longitude
								)
								tDistance.current += distance

								setStatistics({
									speed:
										distance /
										(Math.abs(position.timestamp - lv.timestamp) / 1000),
									maxSpeed:
										(position.coords.speed || 0) > statistics.maxSpeed
											? position.coords.speed || 0
											: statistics.maxSpeed,
									maxAltitude:
										(position.coords.altitude || 0) > statistics.maxAltitude
											? position.coords.altitude || 0
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
									longitude: position.coords.longitude || 0,
									latitude: position.coords.latitude || 0,
									altitude: position.coords.altitude || -1,
									altitudeAccuracy: position.coords.altitudeAccuracy || -1,
									accuracy: position.coords.accuracy || -1,
									heading: position.coords.heading || -1,
									speed: position.coords.speed || -1,
									timestamp: position.timestamp || 0,
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
	}, [position?.timestamp])

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
		position && map && panToMap(position)
	}, [map])

	useEffect(() => {
		console.log('tyupe', type, user.isLogin)
		user.isLogin && getTripStatistics()
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
			position,
			loadedMap.current,
			L &&
				!loadedMap.current &&
				position?.coords?.latitude &&
				config.mapUrl !== 'AutoSelect'
		)
		if (
			L &&
			!loadedMap.current &&
			position?.coords?.latitude &&
			config.mapUrl !== 'AutoSelect'
		) {
			console.log('开始加载！')
			let lat = position?.coords.latitude || 0
			let lon = position?.coords.longitude || 0
			if (map.current) {
				map.current?.remove()
				marker.current?.remove()
				map.current = undefined
				marker.current = undefined
			}
			if (!map.current) {
				map.current = L.map('tp-map', {
					zoomControl: false,

					// center: [Number(res?.data?.lat), Number(res?.data?.lon)],
				})

				// 检测地址如果在中国就用高德地图
				map.current.setView(
					[lat, lon],
					// [
					//   120.3814, -1.09],
					15
				)
				// if (config.country === 'China') {
				// 	(L as any).tileLayer.chinaProvider('GaoDe.Normal.Map')
				// } else {
				const layer = L.tileLayer(config.mapUrl, {
					// errorTileUrl: osmMap,
					maxZoom: 18,
					attribution: `&copy;`,
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

					setSelectPosition({
						latitude: Math.round(popLocation.lat * 1000000) / 1000000,
						longitude: Math.round(popLocation.lng * 1000000) / 1000000,
					})
				})
			}
			position && panToMap(position)
			console.log('connectionOSM', config.connectionOSM)

			loadedMap.current = true
			// console.log('map', map)
		}
	}

	const panToMap = (position: GeolocationPosition) => {
		const L: typeof Leaflet = (window as any).L

		// console.log('panToMap', position, map.current, L, marker.current)
		if (map.current && L) {
			const [lat, lon] = getLatLng(
				position?.coords.latitude || 0,
				position?.coords.longitude || 0
			)

			map.current.panTo([lat, lon], {})
			// map.current.panInside([v.latitude, v.longitude], {
			// 	paddingTopLeft: [220, 1],
			// })
			// console.log('marker', marker)
			if (!marker.current) {
				marker.current = L.marker([lat, lon])
					.addTo(map.current)
					// .bindPopup(
					// 	`${ipInfoObj.ipv4}`
					// 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
					// )
					.openPopup()
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
		const res = await httpApi.v1.UpdateTripPosition(params)
		console.log('updateTripPosition', res)
		if (res.code === 200) {
			updatedPositionIndex.current = positionList.length - 1
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
		if (loadStatus === 'loading' || loadStatus == 'noMore') return
		setLoadStatus('loading')
		const res = await httpApi.v1.GetTripStatistics({
			type: type,
			timeLimit: [1540915200, Math.floor(new Date().getTime() / 1000)],
		})
		console.log('getTripStatistics', res)
		if (res.code === 200 && res?.data?.count) {
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
									<div className='di-unit'>里程</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										<span>
											{formatTime(startTime / 1000, listenTime / 1000)}
										</span>
									</div>
									<div className='di-unit'>时间</div>
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
									<div className='di-unit'>海拔</div>
								</div>
							</div>
							<div className='data-position'>
								<span>{position?.coords.latitude}</span>
								<span> - </span>
								<span>{position?.coords.longitude}</span>
								<span> - </span>
								<span>
									{updatedPositionIndex.current + ' / ' + positionList.length}
								</span>
								<span> - </span>
								<span>
									Avg{' '}
									{Math.round(((statistics.averageSpeed || 0) * 3600) / 100) /
										10}{' '}
									km/h
								</span>
								<span> - </span>
								<span>
									{Math.round(((statistics.speed || 0) * 3600) / 100) / 10} km/h
								</span>
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
									header-item-min-width='80px'
									active-tab-label={'Running'}
									ref={bindEvent({
										tap: (e) => {
											console.log('tap', e)
											setType(e.detail.label)
										},
									})}
								>
									{['Running', 'Bike', 'Drive'].map((v, i) => {
										return (
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
															{t('distance', {
																ns: 'tripPage',
															}) + ' (km)'}
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
																			v as any
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
						selectPosition.latitude === -10000 &&
						selectPosition.longitude === -10000
					) ? (
						<div
							onClick={() => {
								console.log(1)
								window.navigator.clipboard.writeText(
									selectPosition.latitude + ',' + selectPosition.longitude
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
							{selectPosition.latitude + ',' + selectPosition.longitude}
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
