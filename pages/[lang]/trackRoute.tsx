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
import { filterTripsForTrackRoutePage } from '../../store/trip'
import FiexdWeatherComponent from '../../components/FiexdWeather'

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
	const [pageNum, setPageNum] = useState(1)
	const [pageSize, setPageSize] = useState(15)

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
		dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
	}, [i18n.language])

	useEffect(() => {
		if (config.country && !loadedMap.current) {
			initMap()
		}
	}, [config.country])

	useEffect(() => {
		layer.current?.setGrayscale?.(
			config.configure.trackRouteMap?.mapMode === 'Gray'
		)
		layer.current?.setDarkscale?.(
			config.configure.trackRouteMap?.mapMode === 'Dark'
		)
		layer.current?.setBlackscale?.(
			config.configure.trackRouteMap?.mapMode === 'Black'
		)
	}, [config.configure.trackRouteMap?.mapMode])

	useEffect(() => {
		loadedMap.current = false
		zoom.current = 0
		initMap()
		loadData()
	}, [
		config.trackRouteMapUrl,
		config.showDetailedDataForMultipleHistoricalTrips,
		config.configure.roadColorFade,
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
			dispatch(
				methods.trip.GetTripStatistics({
					loadCloudData: true,
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
			// }
			// init()
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
				console.log('getTripHistoryPositionslocalIds', localIds)
				await getTripHistoryPositions()
			}
			init()
		}
		// if (user.isLogin && initLocalData) {
		//   setTimeout(() => {
		//     getTripStatistics()
		//   }, 500);
		// }
	}, [user.isLogin, pageNum, initLocalData, trip.tripStatistics, map.current])

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
	const loadData = () => {
		loadDataDebounce.current.increase(async () => {
			const { config } = store.getState()

			console.log(
				'GetTripStatistics',
				config.configure.filter?.trackRoute,
				trip.tripStatistics.length
			)
			if (!config.configure.filter?.trackRoute || !trip.tripStatistics.length)
				return

			const { selectedTripIds } = config.configure.filter?.trackRoute

			const matchObj: {
				[id: string]: number
			} = {}

			Object.keys(polylines.current).forEach((v) => {
				polylines.current[v].removeFrom(map.current)
				polylines.current[v].removeEventListener('click')
				delete polylines.current[v]
			})
			polylines.current = {}

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
			// console.log(
			// 	'selectedTripTypes2 fffff GetTripStatistics',
			// 	selectedTripTypes,
			// 	trip.tripStatistics
			// )

			if (tripPositions.length && L) {
				let minLat = 0
				let minLon = 0
				let maxLat = 0
				let maxLon = 0

				// let positions: protoRoot.trip.ITripPosition[] = []

				if (
					config.showDetailedDataForMultipleHistoricalTrips &&
					selectedTripIds?.length
				) {
					// console.log('selectedTripIds', selectedTripIds)

					// const incompleteTripData = tripPositions.filter(
					// 	(v) =>
					// 		selectedTripIds.includes(v.value.id || '') &&
					// 		(v.value.positions?.[0]?.split('_').length || 0) <= 2
					// )

					const promiseAll: any[] = []
					let laodCount = 0
					let tripData: protoRoot.trip.ITripPositions[] = []

					loadingSnackbar.current = snackbar({
						message: t('loadingData', {
							ns: 'prompt',
						}),
						vertical: 'top',
						horizontal: 'center',
						backgroundColor: 'var(--saki-default-color)',
						color: '#fff',
					})

					const unPulledIds: string[] = []

					tripPositions.forEach((v) => {
						if (!selectedTripIds.includes(v.value.id || '')) return

						if ((v.value.positions?.[0]?.split('_').length || 0) > 2) {
							tripData.push(v.value)
							return
						}

						// 这些是未获取的

						unPulledIds.push(String(v.value.id))

						// promiseAll.push(
						//   new Promise(async (res: any) => {
						//     const posRes = await httpApi.v1.GetTripPositions({
						//       id: v.value.id,
						//       shareKey: '',
						//     })
						//     // console.log(' fTripPositions GetTripPositions posRes', posRes)
						//     if (
						//       posRes.code === 200 &&
						//       posRes.data?.tripPositions?.positions &&
						//       posRes.data?.tripPositions.status
						//     ) {
						//       laodCount++
						//       loadingSnackbar?.setMessage(
						//         t('loadedData', {
						//           ns: 'prompt',
						//           percentage:
						//             String(
						//               laodCount && promiseAll.length
						//                 ? Math.floor(
						//                   (laodCount / promiseAll.length || 0) * 100
						//                 )
						//                 : 0
						//             ) + '%',
						//         })
						//       )

						//       res(posRes.data.tripPositions)

						//       await storage.tripPositions.set(
						//         v.value.id || '',
						//         posRes.data.tripPositions
						//       )
						//     } else {
						//       res(undefined)
						//     }
						//   })
						// )
					})

					// const res = await Promise.all(promiseAll)

					if (unPulledIds.length) {
						loadingSnackbar.current.open()
					}

					tripData = tripData.concat(
						await getDetailedPositionsOfTrip(unPulledIds, 0, unPulledIds.length)
					)

					// console.log('fTripPositions', res, tripData)

					tripData.forEach(async (v) => {
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
								const speedColorLimit = (
									config.configure.speedColorLimit as any
								)[(v?.type?.toLowerCase() || 'running') as any]

								colors.push(
									getSpeedColor(
										sv.speed || 0,
										speedColorLimit.minSpeed,
										speedColorLimit.maxSpeed,
										config.speedColorRGBs
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

							const { latLngs, colors } = await getLatlngsAndColors(
								{
									id: v.id,
									type: v.type,
								},
								v
							)
							createPolyline(
								v?.id || '',
								latLngs,
								colors,
								'polycolor',
								1,
								map.current
							)
						}
					})

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

					if (loadingSnackbar.current) {
						loadingSnackbar.current.close()
						loadingSnackbar.current = undefined
					}

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
					const filterTrips = Object.fromEntries(
						filterTripsForTrackRoutePage().map((v) => [v.id || '', v])
					)
					const getMatch = (val: protoRoot.trip.ITripPositions) => {
						let id = val.id || ''
						if (matchObj[id] !== undefined) return matchObj[id]

						let match = -1
						if (filterTrips[id]) {
							match = 1
						}

						matchObj[id] = match

						return matchObj[id]
						// if (matchObj[id] !== undefined) return matchObj[id]
						// let match = 1
						// // if (
						// // 	selectedTripTypes?.length ||
						// // 	selectedTripIds?.length ||
						// // 	selectedVehicleIds?.length ||
						// // 	startDate ||
						// // 	endDate
						// // ) {
						// // 	match = 1
						// // }
						// if (
						// 	selectedTripTypes?.length &&
						// 	selectedTripTypes?.filter((sv) => {
						// 		return val.type === sv
						// 	}).length === 0
						// ) {
						// 	match = -1
						// }
						// if (
						// 	selectedVehicleIds?.length &&
						// 	selectedVehicleIds?.filter((sv) => {
						// 		return val.vehicleId === sv
						// 	}).length === 0
						// ) {
						// 	match = -1
						// }

						// // console.log('selectedVehicleIds', selectedVehicleIds.length, match)

						// if (
						// 	selectedTripIds?.length &&
						// 	!selectedTripIds?.includes(String(val.id))
						// ) {
						// 	match = -1
						// }

						// const ct = Number(val.startTime)
						// const st = Math.floor(
						// 	new Date(
						// 		(startDate ? startDate + ' 0:0:0' : '') || '2018-10-31'
						// 	).getTime() / 1000
						// )
						// const et = Math.floor(
						// 	new Date(
						// 		(endDate ? endDate + ' 23:59:59' : '') || '5055-5-5'
						// 	).getTime() / 1000
						// )
						// if (!(ct >= st && ct <= et)) {
						// 	match = -1
						// }

						// const getTrip = trips[val.id || '']

						// // console.log('getTripgetTrip', getTrip, val)
						// if (
						// 	!(
						// 		Number(getTrip.statistics?.distance) >= shortestDistance &&
						// 		(longestDistance >= 500 * 1000
						// 			? true
						// 			: Number(getTrip.statistics?.distance) <= longestDistance)
						// 	)
						// ) {
						// 	match = -1
						// }
						// matchObj[id] = match

						// return match
					}
					console.log(
						'filterTrips',
						filterTrips,
						Object.keys(filterTrips).length
					)

					tripPositions.sort((a, b) => {
						const match = getMatch(a.value)
						if (match === 0) {
							return Number(a.value.startTime) - Number(b.value.startTime)
						} else {
							return match === -1 ? -1 : 1
						}
					})

					console.log(
						'tempUsedPositions 每次用过的gps都记录，每次遍历检测到就去除',
						tripPositions
					)

					tripPositions.forEach(async (v, i) => {
						if (!v.value.positions?.length) return

						const match = getMatch(v.value)

						if (match < 0) return

						// let latlngs: number[][] = []
						const positions = formatPositionsStr(
							Number(v.value.startTime),
							v.value.positions
						)

						positions?.forEach((sv, si) => {
							if (si === 0) {
								return
							}
							const lv = positions[si - 1]
							// console.log('tempUsedPositions lv.latitude', lv.latitude)
							// if (Number(lv.latitude) < 0 || Number(lv.longitude) < 0) {
							// 	console.log('tempUsedPositions lv', lv, v)
							// }
							;(!minLat || minLat > Number(lv.latitude)) &&
								(minLat = Number(lv.latitude))
							;(!minLon || minLon > Number(lv.longitude)) &&
								(minLon = Number(lv.longitude))
							;(!maxLat || maxLat < Number(lv.latitude)) &&
								(maxLat = Number(lv.latitude))
							;(!maxLon || maxLon < Number(lv.longitude)) &&
								(maxLon = Number(lv.longitude))
						})

						// const startPosition = positions[0]
						// const endPosition = positions[positions.length - 1]

						// let lat = geo.position?.coords?.latitude || 0
						// let lon = geo.position?.coords?.longitude || 0

						// lat =
						// 	(startPosition.latitude || 0) -
						// 	((startPosition.latitude || 0) - (endPosition.latitude || 0)) / 2
						// lon =
						// 	(startPosition.longitude || 0) -
						// 	((startPosition.longitude || 0) - (endPosition.longitude || 0)) /
						// 		2

						// cjza0gKVJ
						// 78L2tkleM
						// wguhwNMVy
						// const vId = v.value.id || ""
						// if (!(i > 320 && i < 435)) return
						// // if (!(vId === "cjza0gKVJ" || vId === "iVIMJB727" || vId === "hbLhJg8fY" || vId === "wguhwNMVy")) return

						// let tempArr: protoRoot.trip.ITripPosition[][] = []
						// const newPositions = positions.filter((sv, si) => {
						//   let isExists = false
						//   if (si === 0) {
						//     tempArr.push([sv])
						//   }
						//   tempUsedPositions.current.some(ssv => {
						//     if (ssv.id === v.value.id) {
						//       return true
						//     }
						//     const distance = getDistance(sv.latitude || 0, sv.longitude || 0, ssv.pos.latitude || 0, ssv.pos.longitude || 0)
						//     if (distance <= 1) {
						//       // console.log("tempUsedPositions",distance)
						//       isExists = true
						//       return isExists
						//     }
						//     return false
						//   })

						//   tempArr[tempArr.length - 1].push(sv)
						//   if (!isExists) {
						//     tempUsedPositions.current.push({
						//       id: v.value.id || "",
						//       pos: sv
						//     })
						//     return true
						//   } else {
						//     tempArr.push([sv])
						//   }

						//   // const isExists = tempUsedPositions.current
						//   return false
						// })
						// tempArr = tempArr.filter(v => v.length > 1)
						// console.log("tempUsedPositions tempArr", tempArr.filter(v => v.length > 1))

						// // 分拆tempUsedPositions，
						// // 剪过的，就从这里开始分
						// console.log("tempUsedPositions", i, v, positions.length, newPositions.length,
						//   tempUsedPositions.current.length)

						// tempArr.forEach(newPositions => {
						//   latlngs = []
						// positions?.forEach((v, i) => {
						// 	if (i === 0) {
						// 		return
						// 	}
						// 	const lv = positions[i - 1]

						// 	const latlng = getLatLng(config.trackRouteMapUrl, lat, lon)

						// 	lat = latlng[0]
						// 	lon = latlng[1]
						// 	// console.log('lv.latitude', lv.latitude)
						// 	;(!minLat || minLat > Number(lv.latitude)) &&
						// 		(minLat = Number(lv.latitude))
						// 	;(!minLon || minLon > Number(lv.longitude)) &&
						// 		(minLon = Number(lv.longitude))
						// 	;(!maxLat || maxLat < Number(lv.latitude)) &&
						// 		(maxLat = Number(lv.latitude))
						// 	;(!maxLon || maxLon < Number(lv.longitude)) &&
						// 		(maxLon = Number(lv.longitude))
						// 	latlngs.push(
						// 		getLatLng(
						// 			config.trackRouteMapUrl,
						// 			lv.latitude || 0,
						// 			lv.longitude || 0
						// 		)
						// 	)
						// })

						if (map.current) {
							const { latLngs, colors } = await getLatlngsAndColors(
								{
									id: v.value.id,
									type: v.value.type,
								},
								v.value
							)
							// console.log(
							// 	'tempUsedPositions',
							// 	v.value?.id || '',
							// 	latLngs.length,
							// 	[],
							// 	'polyline',
							// 	match
							// )
							createPolyline(
								v.value?.id || '',
								latLngs,
								[],
								'polyline',
								match,
								map.current
							)
						}

						// })
					})

					// console.log('tempUsedPositions max', minLat, maxLat, minLon, maxLon, {
					// 	lat: (minLat + maxLat) / 2,
					// 	lon: (minLon + maxLon) / 2,
					// })
					setLatLon({
						lat: (minLat + maxLat) / 2,
						lon: (minLon + maxLon) / 2,
					})
				}

				// console.log('fffff', minLat, minLon, maxLat, maxLon)
			}

			if (loadingSnackbar.current) {
				loadingSnackbar.current.close()
				loadingSnackbar.current = undefined
			}

			await getHistoricalStatistic(matchObj)
		}, 700)
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
					getLatLng(
						config.trackRouteMapUrl,
						sv.latitude || 0,
						sv.longitude || 0
					) as any
				)
				const speedColorLimit = (config.configure.speedColorLimit as any)[
					(trip?.type?.toLowerCase() || 'running') as any
				]

				sv.speed &&
					colors.push(
						getSpeedColor(
							sv.speed || 0,
							speedColorLimit.minSpeed,
							speedColorLimit.maxSpeed,
							config.speedColorRGBs
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
					(config.configure?.trackRouteColor as any) || 'Red',
					match === 0 ? false : match === -1 ? true : false
				),
				weight:
					Number(config.configure.polylineWidth?.historyTripTrack) +
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
						Number(
							config.configure.polylineWidth?.historyTripTrackSelectedTrip
						) + (selectPolylineIds.current.includes(id + ';' + type) ? 4 : 0),
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

	const getTripHistoryPositions = async () => {
		try {
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

			const trip = store.getState().trip

			const allIds =
				trip.tripStatistics
					.filter((v) => v.type === 'All')?.[0]
					?.list?.map((v) => v.id) || []
			const localIdsObj: {
				[id: string]: string
			} = {}
			console.log(
				'getTripHistoryPositions allIds',
				trip.tripStatistics,
				allIds.length,
				localIds.length
			)
			localIds.forEach((v) => {
				localIdsObj[v] = v
			})
			const unPulledIds = allIds
				.map((v) => String(v))
				.filter((v) => {
					return !localIdsObj[v]
				})

			console.log(
				'getTripHistoryPositions',
				loadStatus,
				localIds,
				unPulledIds,
				unPulledIds.slice((pageNum - 1) * pageSize, pageNum * pageSize)
				// localIds,
				// trip.tripStatistics.filter(v => v.type === "All")?.[0]?.list?.map(v => v.id)
			)

			const ids = unPulledIds.slice(
				(pageNum - 1) * pageSize,
				pageNum * pageSize
			)

			if (
				!trip.tripStatistics.filter((v) => v.type === 'All')?.[0] ||
				!ids.length
			) {
				loadData()
				return
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
				// pageNum,
				pageNum: 1,
				pageSize,
				type: 'All',
				ids,
				// ids: [],
				timeLimit: [0, Math.floor(new Date().getTime() / 1000)],
				// timeLimit: [localLastTripStartTime + 1, Math.floor(new Date().getTime() / 1000)],
			})
			console.log(
				'GetTripHistoryPositions res',
				localLastTripStartTime,
				localIds,
				res,
				pageNum,
				unPulledIds.slice((pageNum - 1) * pageSize, pageNum * pageSize),
				ids
			)
			if (res.code === 200) {
				const promiseAll: any[] = []
				let startTime = 0
				res.data.list?.forEach(async (v) => {
					if (Number(v.startTime) > startTime) {
						startTime = Number(v.startTime)
					}
					v.id && promiseAll.push(storage.tripPositions.set(v.id, v))
				})
				Promise.all(promiseAll).then(async () => {
					await storage.global.set('localLastTripStartTime', startTime)

					laodCount.current += Number(res.data.total)
					// laodCount.current += unPulledIds.length
					const total =
						trip.tripStatistics?.filter((v) => v.type === 'All')?.[0]?.count ||
						0

					console.log(
						'GetTripHistoryPositions res',
						await storage.tripPositions.getAll(),
						laodCount.current,
						total
					)

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
					if (Number(res.data.total || 0) === pageSize) {
						setPageNum(pageNum + 1)
					} else {
						loadData()
					}
				})
			} else {
				loadData()
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
		} catch (error) {
			console.error(error)
		}
	}

	const getHistoricalStatistic = async (
		matchObj: {
			[id: string]: number
		} = {}
	) => {
		const { trip, config } = store.getState()
		if (!config.configure.filter?.trackRoute) return

		const { selectedTripIds } = config.configure.filter?.trackRoute

		console.log(
			'getTDistance trip.tripStatistics',
			matchObj,
			trip.tripStatistics
		)

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
			if (Object.keys(matchObj).length && matchObj[v.id || ''] !== 1) return

			if (selectedTripIds?.length && !selectedTripIds.includes(String(v.id))) {
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
		console.log('historicalStatistic', obj)
		setHistoricalStatistic(obj)
		// }
	}

	const polylines = useRef<{
		[id: string]: any
	}>({})

	useEffect(() => {
		if (loadedMap.current) {
			// loadedMap.current = false

			loadData()
		}
	}, [
		config.configure.polylineWidth?.historyTripTrack,
		config.configure.polylineWidth?.historyTripTrackSelectedTrip,
		config.configure.filter?.trackRoute?.selectedTripTypes,
		config.configure.filter?.trackRoute?.selectedTripIds,
		config.configure.filter?.trackRoute?.startDate,
		config.configure.filter?.trackRoute?.endDate,
		config.configure.filter?.trackRoute?.selectedVehicleIds,
		config.configure.filter?.trackRoute?.longestDistance,
		config.configure.filter?.trackRoute?.shortestDistance,
		config.configure.filter?.trackRoute?.showCustomTrip,
		config.configure.trackRouteColor,
		trip.tripStatistics,
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
					preferCanvas: true,
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
					.colorScale(
						config.trackRouteMapUrl,
						// maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url || config.mapUrl,
						{
							// errorTileUrl: osmMap,
							// attribution: `&copy;`,
							isGrayscale: false,
						}
					)
					.addTo(map.current)

				console.log('layer.current', layer.current)
				isRoadColorFade() && roadColorFade(layer.current)

				console.log('layer', layer)

				layer.current?.setGrayscale?.(
					config.configure.trackRouteMap?.mapMode === 'Gray'
				)
				layer.current?.setDarkscale?.(
					config.configure.trackRouteMap?.mapMode === 'Dark'
				)
				layer.current?.setBlackscale?.(
					config.configure.trackRouteMap?.mapMode === 'Black'
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
				// 			config.speedColorRGBs
				// 		)
				// 	)
				// )

				// polylines.current['currentLatlons'] = (L as any)
				// 	.polycolor(latLngs, {
				// 		colors: colors,
				// 		useGradient: true,
				// 		weight:
				// 			Number(
				// 				config.configure.polylineWidth?.historyTripTrackSelectedTrip
				// 			) + (selectPolylineIds.current.includes(id + ';' + type) ? 4 : 0),
				// 	})
				// 	.addTo(map)

				map.current.on('click', (e) => {
					let popLocation = e.latlng
					console.log(popLocation, {
						latitude: Math.round(popLocation.lat * 1000000) / 1000000,
						longitude: Math.round(popLocation.lng * 1000000) / 1000000,
					})

					console.log('click', currentLatlons.current)

					currentLatlons.current.push(deepCopy(popLocation))

					console.log('click', popLocation, currentLatlons.current)

					storage.global.setSync('currentLatlons', currentLatlons.current)
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
					// console.log(
					// 	'selectPolylineIds.current',
					// 	e,
					// 	delayClickPolyline.current,
					// 	selectPolylineIds.current
					// )

					if (delayClickPolyline.current) return

					selectPolylineIds.current.forEach(async (v) => {
						const [id, type] = v.split(';')

						selectPolylineIds.current = selectPolylineIds.current.filter(
							(sv) => sv !== id + ';' + type
						)

						// console.log('selectPolylineIds.current', id, type)
						const { latLngs, colors } = await getLatlngsAndColors(
							{
								id,
							},
							undefined
						)
						createPolyline(id, latLngs, colors, type as any, 1, map.current)
					})
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

	const getDetailedPositionsOfTrip = async (
		unPulledIds: string[],
		loadCount: number,
		totalCount: number
	) => {
		let tripPositions: protoRoot.trip.ITripPositions[] = []

		// console.log("GetTripHistoryPositionsresres unPulledIds", unPulledIds)

		if (unPulledIds.length === 0) {
			return tripPositions
		}

		const pageSize = 6

		const res = await httpApi.v1.GetTripHistoryPositions({
			shareKey: String(sk || ''),
			// pageNum,
			pageNum: 1,
			pageSize: pageSize,
			type: 'All',
			ids: unPulledIds.slice(0, pageSize),
			timeLimit: [0, Math.floor(new Date().getTime() / 1000)],
			fullData: true,
			// timeLimit: [localLastTripStartTime + 1, Math.floor(new Date().getTime() / 1000)],
		})

		if (res.code === 200) {
			res.data.list?.forEach((v) => {
				if (v.id) {
					tripPositions.push(v)
					storage.tripPositions.setSync(v.id, v)
				}
			})

			loadCount =
				loadCount + pageSize > totalCount ? totalCount : loadCount + pageSize

			loadingSnackbar.current?.setMessage(
				t('loadedData', {
					ns: 'prompt',
					percentage:
						String(
							loadCount && totalCount
								? Math.floor((loadCount / totalCount || 0) * 100)
								: 0
						) + '%',
				})
			)

			const ids = unPulledIds.slice(pageSize, unPulledIds.length)
			if (ids.length !== 0) {
				tripPositions = tripPositions.concat(
					await getDetailedPositionsOfTrip(ids, loadCount, totalCount)
				)
			}
		}
		return tripPositions
	}

	const selectPolylineId =
		selectPolylineIds.current?.[selectPolylineIds.current.length - 1]?.split(
			';'
		)?.[0] || ''

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
						className={
							(startTrip ? 'start ' : ' ') +
							config.deviceType +
							' ' +
							(isRoadColorFade() ? 'roadColorFade' : '')
						}
					></div>
					{/* <FiexdWeatherComponent></FiexdWeatherComponent> */}
					<div className='tp-statistics'>
						{mounted && (
							<>
								{selectPolylineId ? (
									<saki-button
										ref={bindEvent({
											tap: () => {
												dispatch(
													layoutSlice.actions.setOpenTripItemModal({
														visible: true,
														id: selectPolylineId,
													})
												)
												dispatch(
													layoutSlice.actions.setOpenTripHistoryModal(true)
												)
											},
										})}
										padding='10px 16px'
										margin='16px 0 0 0'
										bg-color='var(--saki-default-color)'
										bg-hover-color='var(--saki-default-hover-color)'
										bg-active-color='var(--saki-default-active-color)'
										border='none'
										type='Normal'
									>
										<div className='tp-view-details'>
											<div className='tp-vd-top'>
												<span className='value'>
													{t('viewDetails', {
														ns: 'trackRoutePage',
													})}
												</span>
											</div>
											<div className='tp-vd-bottom'>
												<span className='value'>{selectPolylineId}</span>
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
											dispatch(
												layoutSlice.actions.setOpenTripHistoryModal(true)
											)
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
										color: config.speedColorRGBs[0],
									}}
									className='ti-c-min'
								>
									{t('slowest', {
										ns: 'tripPage',
									})}
								</div>
								<div
									style={{
										background: `linear-gradient(45deg, ${
											config.speedColorRGBs[0]
										},${
											config.speedColorRGBs[config.speedColorRGBs.length - 1]
										})`,
									}}
									className='ti-c-line'
								></div>
								<div
									style={{
										color:
											config.speedColorRGBs[config.speedColorRGBs.length - 1],
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
