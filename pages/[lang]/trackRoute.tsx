import Head from 'next/head'
import TripLaout, { getLayout } from '../../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
	formatPositionsStr,
	formatTimestamp,
	getZoom,
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
	getTrackRouteColor,
	maps,
	osmMap,
	speedColorRGBs,
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

const TrackRoutePage = () => {
	const { t, i18n } = useTranslation('tripPage')
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

	const [type, setType] = useState<TripType>('Running')

	const [startTrip, setStartTrip] = useState(false)
	const [pageNum, setPageNum] = useState(1)
	const [pageSize, setPageSize] = useState(5)

	const [disablePanTo, setDisablePanTo] = useState(false)

	const [isLockScreen, setIsLockScreen] = useState(false)
	const [dataTheme, setDataTheme] = useState('')

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
	const [initLocalData, setInitLocalData] = useState(false)

	const [latlon, setLatLon] = useState({
		lat: 0,
		lon: 0,
	})

	const dispatch = useDispatch<AppDispatch>()

	useEffect(() => {
		loginSnackbarDebounce.current.increase(() => {
			const { user } = store.getState()
			if (!user.isLogin) {
				loginSnackbar.current.open()
			}
		}, 1000)
		setMounted(true)

		dispatch(layoutSlice.actions.setBottomNavigator(true))
		dispatch(layoutSlice.actions.setLayoutHeader(true))
		dispatch(layoutSlice.actions.setLayoutHeaderFixed(true))

		const init = async () => {
			setDataTheme((await storage.global.get('dataTheme')) || 'Dark')

			// storage.tripPositions.deleteAll()
			const tripPositions = await storage.tripPositions.getAll()
			console.log('GetTripHistoryPositions tripPositions.getAll', tripPositions)

			if (tripPositions.length) {
				laodCount.current = tripPositions.length
				setLocalIds(
					tripPositions.map((v) => {
						return v.value.id || ''
					})
				)
			}
			setInitLocalData(true)

			loadData(
				config.trackRoute.selectedTripTypes,
				config.trackRoute.selectedTripIds,
				config.trackRoute.selectedDate.startDate,
				config.trackRoute.selectedDate.endDate
			)

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
		dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
	}, [i18n.language])

	useEffect(() => {
		if (config.country && !loadedMap.current) {
			initMap()
		}
	}, [config.country])

	useEffect(() => {
		layer.current?.setGrayscale?.(config.isGrayscale)
	}, [config.isGrayscale])

	useEffect(() => {
		loadedMap.current = false
		zoom.current = 0
		initMap()
		loadData(
			config.trackRoute.selectedTripTypes,
			config.trackRoute.selectedTripIds,
			config.trackRoute.selectedDate.startDate,
			config.trackRoute.selectedDate.endDate
		)
	}, [
		config.trackRouteMapUrl,
		config.showDetailedDataForMultipleHistoricalTrips,
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
		if (user.isLogin) {
			loginSnackbar.current.close()
			getTripStatistics()
		}
	}, [user.isLogin])

	useEffect(() => {
		console.log(
			'tyupe',
			type,
			user.isLogin,
			!!(user.isLogin && initLocalData && map.current)
		)
		if (user.isLogin && initLocalData && map.current) {
			getTripHistoryPositions()
		}
	}, [user.isLogin, pageNum, initLocalData, map.current])

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

	const loadData = (
		selectedTripTypes: typeof config.trackRoute.selectedTripTypes,
		selectedTripIds: typeof config.trackRoute.selectedTripIds,
		startDate: typeof config.trackRoute.selectedDate.startDate,
		endDate: typeof config.trackRoute.selectedDate.endDate
	) => {
		loadDataDebounce.current.increase(async () => {
			const { config } = store.getState()

			polylines.current.forEach((v) => {
				v.removeFrom(map.current)
			})
			polylines.current = []

			const L: typeof Leaflet = (window as any).L

			// if (!tripPositionsRef.current.length) {
			const tripPositions = (await storage.tripPositions.getAll()).filter(
				(v) => v.value.authorId === user.userInfo?.uid
			)
			console.log('GetTripHistoryPositions tripPositions.getAll', tripPositions)

			// 	if (tripPositions.length && L) {
			// 		tripPositionsRef.current = tripPositions
			// 	}
			// }
			console.log('selectedTripTypes2 fffff', selectedTripTypes)

			if (tripPositions.length && L) {
				let minLat = 0
				let minLon = 0
				let maxLat = 0
				let maxLon = 0

				// let positions: protoRoot.trip.ITripPosition[] = []

				if (
					config.showDetailedDataForMultipleHistoricalTrips &&
					selectedTripIds.length
				) {
					// console.log('selectedTripIds', selectedTripIds)

					// const incompleteTripData = tripPositions.filter(
					// 	(v) =>
					// 		selectedTripIds.includes(v.value.id || '') &&
					// 		(v.value.positions?.[0]?.split('_').length || 0) <= 2
					// )

					const promiseAll: any[] = []
					let laodCount = 0
					const tripData: protoRoot.trip.ITripPositions[] = []

					const loadingSnackbar = snackbar({
						message: t('loadingData', {
							ns: 'prompt',
						}),
						vertical: 'top',
						horizontal: 'center',
						backgroundColor: 'var(--saki-default-color)',
						color: '#fff',
					})

					tripPositions.forEach((v) => {
						if (!selectedTripIds.includes(v.value.id || '')) return

						if ((v.value.positions?.[0]?.split('_').length || 0) > 2) {
							tripData.push(v.value)
							return
						}
						promiseAll.push(
							new Promise(async (res: any) => {
								const posRes = await httpApi.v1.GetTripPositions({
									id: v.value.id,
									shareKey: '',
								})
								// console.log(' fTripPositions GetTripPositions posRes', posRes)
								if (
									posRes.code === 200 &&
									posRes.data?.tripPositions?.positions &&
									posRes.data?.tripPositions.status
								) {
									laodCount++
									loadingSnackbar?.setMessage(
										t('loadedData', {
											ns: 'prompt',
											percentage:
												String(
													laodCount && promiseAll.length
														? Math.floor(
																(laodCount / promiseAll.length || 0) * 100
														  )
														: 0
												) + '%',
										})
									)

									res(posRes.data.tripPositions)

									await storage.tripPositions.set(
										v.value.id || '',
										posRes.data.tripPositions
									)
								} else {
									res(undefined)
								}
							})
						)
					})

					if (promiseAll.length) {
						loadingSnackbar.open()
					}

					const res = await Promise.all(promiseAll)

					if (res) {
						res.forEach((v) => {
							v && tripData.push(v)
						})
						// console.log('fTripPositions', res, tripData)

						tripData.forEach((v) => {
							const positions = formatPositionsStr(
								Number(v.startTime),
								v.positions || []
							)
							const latLngs: number[][] = []
							const colors: string[] = []
							positions
								?.filter((sv) => {
									return !(
										Number(sv.speed || 0) < 0 || Number(sv.altitude || 0) < 0
									)
								})
								?.forEach((sv, i, arr) => {
									;(!minLat || minLat > Number(sv.latitude)) &&
										(minLat = Number(sv.latitude))
									;(!minLon || minLon > Number(sv.longitude)) &&
										(minLon = Number(sv.longitude))
									;(!maxLat || maxLat < Number(sv.latitude)) &&
										(maxLat = Number(sv.latitude))
									;(!maxLon || maxLon < Number(sv.longitude)) &&
										(maxLon = Number(sv.longitude))

									latLngs.push(
										getLatLng(
											config.trackRouteMapUrl,
											sv.latitude || 0,
											sv.longitude || 0
										) as any
									)
									const speedColorLimit =
										config.speedColorLimit[
											(v?.type?.toLowerCase() || 'running') as any
										]

									colors.push(
										getSpeedColor(
											sv.speed || 0,
											speedColorLimit.minSpeed,
											speedColorLimit.maxSpeed
										)
									)
								})

							if (map.current) {
								// console.log(
								// 	'fTripPositions incompleteTripData',
								// 	latLngs.length,
								// 	colors.length,
								// 	map.current
								// )

								const polycolor = (L as any)
									.polycolor(latLngs, {
										colors: colors,
										useGradient: true,
										weight:
											config.mapPolyline.historyTravelDetailedDataTrackWidth,
									})
									.addTo(map.current)

								polylines.current.push(polycolor)
							}
						})
					}

					if (map.current) {
						const tempLatLon = {
							lat: (minLat + maxLat) / 2,
							lon: (minLon + maxLon) / 2,
						}

						setLatLon({
							...tempLatLon,
						})
						map.current.setView(
							[tempLatLon.lat, tempLatLon.lon],
							// [
							//   120.3814, -1.09],
							getZoom(minLat, minLon, maxLat, maxLon)
						)
					}

					loadingSnackbar?.close()

					// console.log('fTripPositions incompleteTripData', incompleteTripData)

					// fTripPositions.forEach((v) => {
					// 	// const positions = formatPositionsStr(
					// 	// 	Number(v.value.startTime),
					// 	// 	v.value.positions || []
					// 	// )
					// 	// console.log('fTripPositions positions', positions)
					// })

					// console.log('fTripPositions', fTripPositions, selectedTripIds)
				} else {
					const getMatch = (val: protoRoot.trip.ITripPositions) => {
						let match = 0
						if (
							selectedTripTypes.length ||
							selectedTripIds.length ||
							startDate ||
							endDate
						) {
							match = 1
						}
						if (
							selectedTripTypes.length &&
							selectedTripTypes.filter((sv) => {
								return val.type === sv
							}).length === 0
						) {
							match = -1
						}

						if (
							selectedTripIds.length &&
							!selectedTripIds.includes(String(val.id))
						) {
							match = -1
						}

						const ct = Number(val.startTime)
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
						if (!(ct >= st && ct <= et)) {
							match = -1
						}

						return match
					}

					tripPositions.sort((a, b) => {
						const match = getMatch(a.value)
						if (match === 0) {
							return Number(a.value.startTime) - Number(b.value.startTime)
						} else {
							return match === -1 ? -1 : 1
						}
					})

					tripPositions.forEach(async (v, i) => {
						if (!v.value.positions?.length) return

						const match = getMatch(v.value)

						let latlngs: number[][] = []
						const positions = formatPositionsStr(
							Number(v.value.startTime),
							v.value.positions
						)

						const startPosition = positions[0]
						const endPosition = positions[positions.length - 1]

						let lat = geo.position?.coords?.latitude || 0
						let lon = geo.position?.coords?.longitude || 0

						lat =
							(startPosition.latitude || 0) -
							((startPosition.latitude || 0) - (endPosition.latitude || 0)) / 2
						lon =
							(startPosition.longitude || 0) -
							((startPosition.longitude || 0) - (endPosition.longitude || 0)) /
								2

						positions?.forEach((v, i) => {
							if (i === 0) {
								return
							}
							const lv = positions[i - 1]

							const latlng = getLatLng(config.trackRouteMapUrl, lat, lon)

							lat = latlng[0]
							lon = latlng[1]
							// console.log('lv.latitude', lv.latitude)
							;(!minLat || minLat > Number(lv.latitude)) &&
								(minLat = Number(lv.latitude))
							;(!minLon || minLon > Number(lv.longitude)) &&
								(minLon = Number(lv.longitude))
							;(!maxLat || maxLat < Number(lv.latitude)) &&
								(maxLat = Number(lv.latitude))
							;(!maxLon || maxLon < Number(lv.longitude)) &&
								(maxLon = Number(lv.longitude))
							latlngs.push(
								getLatLng(
									config.trackRouteMapUrl,
									lv.latitude || 0,
									lv.longitude || 0
								)
							)
						})

						if (map.current) {
							const polyline = L.polyline(latlngs as any, {
								// smoothFactor:10,
								// snakingSpeed: 200,
								// color: '#4af0fe',
								color: getTrackRouteColor(
									config.trackRouteColor,
									match === 0 ? false : match === -1 ? true : false
								),
								// color: '#f29cb2',
								weight:
									config.mapPolyline.historyTravelTrackWidth +
									(match === 1 ? 2 : 0),
								// weight: 1,
								// opacity: 0.3,
								smoothFactor: router.query.sf ? Number(router.query.sf) : 1,
								noClip: true,
							}).addTo(map.current)
							polylines.current.push(polyline)
						}
					})
					setLatLon({
						lat: (minLat + maxLat) / 2,
						lon: (minLon + maxLon) / 2,
					})
				}

				console.log('fffff', minLat, minLon, maxLat, maxLon)
			}

			if (loadingSnackbar.current) {
				loadingSnackbar.current.close()
				loadingSnackbar.current = undefined
			}

			getHistoricalStatistic(selectedTripTypes, selectedTripIds)
		}, 700)
	}

	const getTripHistoryPositions = async () => {
		console.log(
			'getTripHistoryPositions',
			loadStatus,
			!!(loadStatus === 'loading' || loadStatus == 'noMore')
		)

		if (!loadingSnackbar.current) {
			loadingSnackbar.current = snackbar({
				message: t('loadingData', {
					ns: 'prompt',
				}),
				vertical: 'top',
				horizontal: 'center',
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
			})
			loadingSnackbar.current.open()
		}

		if (loadStatus === 'loading' || loadStatus == 'noMore') return
		setLoadStatus('loading')
		console.log(!user.isLogin || type === 'Local')
		// if (!user.isLogin || type === 'Local') {
		// 	const trips = await storage.trips.getAll()
		// 	console.log('getLocalTrips', trips)

		// 	const obj: any = {}
		// 	// let distance = 0
		// 	// let time = 0
		// 	trips.forEach((v) => {
		// 		if (!v.value.type) return
		// 		!obj[v.value.type] &&
		// 			(obj[v.value.type] = {
		// 				count: 0,
		// 				distance: 0,
		// 				time: 0,
		// 			})

		// 		obj[v.value.type].count += 1
		// 		obj[v.value.type].distance += v.value.statistics?.distance || 0
		// 		obj[v.value.type].time +=
		// 			(Number(v.value.endTime) || 0) - (Number(v.value.startTime) || 0)
		// 	})
		// 	setHistoricalStatistics({
		// 		...historicalStatistics,
		// 		...obj,
		// 	})
		// 	setLoadStatus('loaded')
		// 	return
		// }
		//
		const res = await httpApi.v1.GetTripHistoryPositions({
			shareKey: String(sk || ''),
			pageNum,
			pageSize,
			type: 'All',
			ids: localIds,
		})
		console.log('GetTripHistoryPositions res', localIds, res, pageNum)
		if (res.code === 200) {
			const promiseAll: any[] = []
			res.data.list?.forEach(async (v) => {
				v.id && promiseAll.push(storage.tripPositions.set(v.id, v))
			})

			Promise.all(promiseAll).then(async () => {
				if (Number(res.data.total || 0) === pageSize) {
					setPageNum(pageNum + 1)
					laodCount.current += Number(res.data.total)
					const total =
						trip.tripStatistics?.filter((v) => v.type === 'All')?.[0]?.count ||
						0

					loadingSnackbar.current?.setMessage(
						t('loadedData', {
							ns: 'prompt',
							percentage:
								String(
									laodCount.current && total
										? Math.floor((laodCount.current / total || 0) * 100)
										: 0
								) + '%',
						})
					)
				} else {
					loadData(
						config.trackRoute.selectedTripTypes,
						config.trackRoute.selectedTripIds,
						config.trackRoute.selectedDate.startDate,
						config.trackRoute.selectedDate.endDate
					)
				}
			})
		} else {
			loadData(
				config.trackRoute.selectedTripTypes,
				config.trackRoute.selectedTripIds,
				config.trackRoute.selectedDate.startDate,
				config.trackRoute.selectedDate.endDate
			)
		}
		// const obj: any = {}
		// obj[type] = {
		// 	count: res?.data?.count || 0,
		// 	distance: res?.data?.distance || 0,
		// 	time: res?.data?.time || 0,
		// }
		// setHistoricalStatistics({
		// 	...historicalStatistics,
		// 	...obj,
		// })
		setLoadStatus('loaded')
	}

	const getHistoricalStatistic = async (
		selectedTripTypes: typeof config.trackRoute.selectedTripTypes,
		selectedTripIds: typeof config.trackRoute.selectedTripIds
	) => {
		const { trip } = store.getState()
		console.log('getTDistance trip.tripStatistics', trip.tripStatistics)

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
			if (
				selectedTripTypes.length &&
				selectedTripTypes.filter((sv) => {
					return v.type === sv
				}).length === 0
			) {
				return
			}
			if (selectedTripIds.length && !selectedTripIds.includes(String(v.id))) {
				return
			}
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
		// console.log('historicalStatistic', obj)
		setHistoricalStatistic(obj)
		// }
	}

	const polylines = useRef<any[]>([])

	useEffect(() => {
		if (loadedMap.current) {
			// loadedMap.current = false

			loadData(
				config.trackRoute.selectedTripTypes,
				config.trackRoute.selectedTripIds,
				config.trackRoute.selectedDate.startDate,
				config.trackRoute.selectedDate.endDate
			)
		}
	}, [
		config.mapPolyline.historyTravelTrackWidth,
		config.mapPolyline.historyTravelDetailedDataTrackWidth,
		config.trackRoute.selectedTripTypes.length,
		config.trackRoute.selectedTripIds.length,
		config.trackRoute.selectedDate.startDate,
		config.trackRoute.selectedDate.endDate,
		config.trackRouteColor,
	])

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
					zoomControl: false,
					minZoom: 3,
					maxZoom: 18,
					trackResize: false,
					zoomSnap: 0.5,

					zoom: 15,
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
				console.log('config.mapUrl', config.mapUrl)
				layer.current = (L.tileLayer as any)
					.grayscale(
						config.trackRouteMapUrl,
						// maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url || config.mapUrl,
						{
							// errorTileUrl: osmMap,
							// attribution: `&copy;`,
							isGrayscale: false,
						}
					)
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
				config.trackRouteMapUrl,
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

	const getTripStatistics = async () => {
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

		const res = await httpApi.v1.GetTripStatistics({
			type: 'All',
			timeLimit: [1540915200, Math.floor(new Date().getTime() / 1000)],
		})
		console.log('getTripStatistics tsts', res, type)
		if (res.code === 200 && res?.data?.count) {
			res.data.list?.forEach((v) => {
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
						res.data.list?.filter((v) => {
							if (ts[sv].type === 'All') {
								return true
							}
							return ts[sv].type === v.type
						}) || []
					ts[sv].time += Number(v.endTime) - Number(v.createTime)
				})
			})

			console.log('tsts', ts)

			dispatch(tripSlice.actions.setTripStatistics(ts))

			const { config } = store.getState()
			getHistoricalStatistic(
				config.trackRoute.selectedTripTypes,
				config.trackRoute.selectedTripIds
			)
			return
		}
	}

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
					name='description'
					content={t('subtitle', {
						ns: 'trackRoutePage',
					})}
				/>
			</Head>
			<div className='track-route-page'>
				<div className='tp-main'>
					<ButtonsComponent
						filter
						indexPage
						currentPosition
						layer
						onCurrentPosition={() => {
							setDisablePanTo(true)
							geo.position && panToMap(geo.position, true)
						}}
					></ButtonsComponent>
					<div
						id='tp-map'
						className={(startTrip ? 'start ' : ' ') + config.deviceType}
					></div>
					<div className='tp-statistics'>
						{mounted && (
							<saki-button
								ref={bindEvent({
									tap: () => {
										if (
											config.showDetailedDataForMultipleHistoricalTrips &&
											config.trackRoute.selectedTripIds.length
										) {
											dispatch(
												layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
													true
												)
											)

											return
										}
										dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
									},
								})}
								padding='10px 14px'
								margin='16px 0 0 0'
								bg-color='#2d3646'
								bg-hover-color='#242b37'
								bg-active-color='#151920'
								border='none'
								type='Normal'
								// box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
							>
								<div className='tp-s-content'>
									<div className='tp-s-c-distance'>
										<span className='value'>
											{historicalStatistic.distance}
										</span>
										<span className='name'>km</span>
									</div>
									<div className='tp-s-c-bottom'>
										<span className='value'>
											{/* {t('durationText', {
												ns: 'tripPage',
												num:
													historicalStatistic.time <= 0
														? 0
														: Math.round(
																(historicalStatistic.time / 3600) * 100
														  ) / 100 || 0,
											})} */}
											{formatTimestamp(
												historicalStatistic.time <= 0
													? 0
													: historicalStatistic.time || 0
											)}
										</span>
										<span className='value'> · </span>
										<span className='value'>
											{t('tripsCount', {
												ns: 'tripPage',
												num: historicalStatistic.count,
											})}
										</span>
									</div>
								</div>
							</saki-button>
						)}
					</div>
				</div>

				{mounted &&
				config.showDetailedDataForMultipleHistoricalTrips &&
				config.trackRoute.selectedTripIds.length ? (
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
						width='100%'
						height={config.deviceType === 'Mobile' ? '100%' : 'auto'}
						max-width={config.deviceType === 'Mobile' ? '100%' : '500px'}
						max-height={config.deviceType === 'Mobile' ? '100%' : 'auto'}
						mask
						border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
						border={config.deviceType === 'Mobile' ? 'none' : ''}
						mask-closable='false'
						background-color='#fff'
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
								slot='right'
							>
								<saki-button
									ref={bindEvent({
										tap: () => {
											dispatch(
												layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
													false
												)
											)
											dispatch(
												layoutSlice.actions.setOpenTripHistoryModal(true)
											)
										},
									})}
									type='CircleIconGrayHover'
								>
									<saki-icon color='#666' type='TripRoute'></saki-icon>
								</saki-button>
							</div>
						</saki-modal-header>
						<div className='tp-modal-main'>
							<div className='ti-distance'>
								<div className='ti-d-value'>
									<span>{historicalStatistic.distance}</span>
								</div>
								<div className='ti-d-unit'>km</div>
								<div className='ti-d-tip'>
									{t('tripsCount', {
										ns: 'tripPage',
										num: historicalStatistic.count,
									})}
								</div>
							</div>
							<div className='ti-color'>
								<div
									style={{
										color: speedColorRGBs[0],
									}}
									className='ti-c-min'
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
									className='ti-c-line'
								></div>
								<div
									style={{
										color: speedColorRGBs[speedColorRGBs.length - 1],
									}}
									className='ti-c-max'
								>
									{t('fastest', {
										ns: 'tripPage',
									})}
								</div>
							</div>
							<div className={'ti-data ' + config.lang}>
								<div className='ti-d-top'>
									<div className='ti-d-item'>
										<span className='value'>
											{(historicalStatistic.maxSpeed || 0) <= 0
												? 0
												: Math.round(
														((historicalStatistic.maxSpeed || 0) * 3600) / 100
												  ) / 10}
										</span>
										<span className='name'>
											{t('maxSpeed', {
												ns: 'tripPage',
											}) + ' (km/h)'}
										</span>
									</div>
									<div className='ti-d-item time'>
										<span className='value'>
											{historicalStatistic.time > 0
												? formatTimestamp(historicalStatistic.time)
												: t('unfinished', {
														ns: 'tripPage',
												  })}
										</span>
										<span className='name'>
											{t('duration', {
												ns: 'tripPage',
											})}
										</span>
									</div>
									<div className='ti-d-item'>
										<span className='value'>
											{(historicalStatistic.maxAltitude || 0) <= 0
												? 0
												: Math.round(
														(historicalStatistic.maxAltitude || 0) * 10
												  ) / 10}
										</span>
										<span className='name'>
											{t('maxAltitude', {
												ns: 'tripPage',
											}) + ' (m)'}
										</span>
									</div>
								</div>
								<div className={'ti-d-bottom ' + config.deviceType}>
									<span className='ti-d-b-item'>
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
									<span className='ti-d-b-item'>
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
									<span className='ti-d-b-item'>
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

									<span className='ti-d-b-item'>
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

									<span className='ti-d-b-item'>
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
										dispatch(
											layoutSlice.actions.setOpenHistoricalTripsDetailedDataModal(
												false
											)
										)
										dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
									},
								})}
								padding='10px 18px'
								margin='10px 0 0'
								type='Primary'
							>
								<saki-icon
									margin='2px 6px 0 0'
									color='#fff'
									type='TripRoute'
								></saki-icon>
								<span className='text-elipsis'>
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
