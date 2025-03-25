import React, {
	use,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, {
	RootState,
	AppDispatch,
	useAppDispatch,
	methods,
	configSlice,
	userSlice,
	layoutSlice,
	tripSlice,
	geoSlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import {
	exitFullscreen,
	formatAvgPace,
	formatDistance,
	formatTime,
	formatTimestamp,
	fullScreen,
	getAngle,
	getLatLng,
	getSpeedColor,
	getZoom,
	isFullScreen,
	isRoadColorFade,
	roadColorFade,
} from '../plugins/methods'
import TripItemComponent from './TripItem'
import { Chart } from 'chart.js'
import { Debounce, deepCopy, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet from 'leaflet'
import SpeedMeterComponent from './SpeedMeter'
import { Statistics } from '../store/trip'
import { eventListener } from '../store/config'
import screenfull from 'screenfull'
import { createIconMarker } from '../store/map'
import { SakiScrollView } from './saki-ui-react/components'
import {
	convertCityLevelToTypeString,
	getCityName,
	getSimpleCityName,
} from '../store/city'

const ReplayTripComponent = () => {
	const { t, i18n } = useTranslation('replayTripPage')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)

	const dispatch = useDispatch<AppDispatch>()

	const clearEvent = useRef(new NEventListener())

	return (
		<saki-modal
			ref={bindEvent({
				close() {
					dispatch(layoutSlice.actions.setOpenReplayTripModal(false))
				},
				loaded() {
					eventListener.dispatch('loadModal:ReplayTrip', true)
				},
			})}
			width='100%'
			height='100%'
			max-width={'100%'}
			max-height={'100%'}
			mask
			border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
			border={config.deviceType === 'Mobile' ? 'none' : ''}
			mask-closable='false'
			background-color='#fff'
			visible={layout.openReplayTripModal}
		>
			<div
				className={
					'replay-trip-component ' +
					config.deviceType +
					(config.fullScreen ? ' enlarge ' : '')
				}
			>
				<div className='th-header'>
					{/* <saki-modal-header
						// border
						back-icon={true}
						close-icon={false}
						right-width={'56px'}
						ref={bindEvent({
							back() {
								dispatch(layoutSlice.actions.setOpenReplayTripModal(false))
								// clear(true)
								clearEvent.current.dispatch('clear', true)
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
							{config.deviceType !== 'Mobile' ? (
								<saki-button
									ref={bindEvent({
										tap: () => {
											// setEnlarge(!enlarge)
										},
									})}
									type='CircleIconGrayHover'
								>
									{!enlarge ? (
										<saki-icon
											color='#666'
											width='18px'
											height='18px'
											type='ZoomIn'
										></saki-icon>
									) : (
										<saki-icon
											color='#666'
											width='18px'
											height='18px'
											type='ZoomOut'
										></saki-icon>
									)}
								</saki-button>
							) : (
								''
							)}
						</div>
					</saki-modal-header> */}
				</div>
				<ReplayTripPage clearEvent={clearEvent.current} />
			</div>
		</saki-modal>
	)
}

const forceUpdateReducer = (state: number) => state + 1

const ReplayTripPage = ({ clearEvent }: { clearEvent: NEventListener }) => {
	const { t, i18n } = useTranslation('replayTripPage')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	// const trip = useSelector((state: RootState) => state.trip)
	const geo = useSelector((state: RootState) => state.geo)
	const user = useSelector((state: RootState) => state.user)

	const tripId = useSelector((state: RootState) => state.trip.replayTrip.id)
	const shareKey = useSelector(
		(state: RootState) => state.trip.replayTrip.shareKey
	)

	const trackWidth = useSelector(
		(state: RootState) => config.configure.polylineWidth?.reviewTrip || 6
	)

	const [, forceUpdate] = useReducer(forceUpdateReducer, 0)

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [uselessData, setUselessData] = useState([] as string[])
	// const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

	// useEffect(() => {
	// 	setTimeout(() => {
	// 		dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
	// 	}, 500)
	// }, [])

	const loadedMap = useRef(false)
	const map = useRef<Leaflet.Map>()
	const maxSpeedMarker = useRef<Leaflet.Marker<any>>()
	const marker = useRef<Leaflet.Marker<any>>()
	const layer = useRef<any>()
	const zoom = useRef(0)
	const isSetZoom = useRef(false)
	const heading = useRef(0)
	const gpsSignalStatus = useRef(1)
	const showSkipLongParkingButton = useRef(false)
	const goThroughTunnel = useRef(false)
	const parkingTime = useRef(0)
	const skipListenTime = useRef(0)
	// const duration = useRef(0)
	const [duration, setDuration] = useState(0)
	const lastCenterPosition = useRef({
		lat: 0,
		lon: 0,
	})
	const updatingPositionIndex = useRef(0)
	const polyline = useRef<any>()

	const [maxSpeedPosition, setMaxSpeedPosition] =
		useState<protoRoot.trip.ITripPosition>()

	const updatePositionTimer = useRef<NodeJS.Timeout>()

	// const [gpsSignalStatus, setGpsSignalStatus] = useState(1)

	const [stopped, setStopped] = useState(false)

	const [startTime, setStartTime] = useState(0)
	const [listenTime, setListenTime] = useState(-1)

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

	const [startTrip, setStartTrip] = useState(false)

	const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

	const [disablePanTo, setDisablePanTo] = useState(false)

	const [speedMeterZoom, setZoomSpeedMeter] = useState<'zoomIn' | 'zoomOut'>(
		'zoomOut'
	)

	const [runningSpeed, setRunningSpeed] = useState(1)
	const [runningSpeedArr] = useState([
		{ t: '0.5x', v: 2.0 },
		{ t: '0.75x', v: 1.3333 },
		{ t: '1x', v: 1.0 },
		{ t: '2x', v: 0.5 },
		{ t: '3x', v: 0.3333 },
		{ t: '4x', v: 0.25 },
		{ t: '5x', v: 0.2 },
		{ t: '6x', v: 0.1667 },
		{ t: '7x', v: 0.1429 },
		{ t: '8x', v: 0.125 },
		{ t: '9x', v: 0.1111 },
		{ t: '10x', v: 0.1 },
		{ t: '11x', v: 0.0909 },
		{ t: '12x', v: 0.0833 },
		{ t: '13x', v: 0.0769 },
		{ t: '14x', v: 0.0714 },
		{ t: '15x', v: 0.0667 },
		{ t: '16x', v: 0.0625 },
		{ t: '17x', v: 0.0588 },
		{ t: '18x', v: 0.0556 },
		{ t: '19x', v: 0.0526 },
		{ t: '20x', v: 0.05 },
	])

	const showeProgressBar = useRef(true)

	const [openRunningSpeedDropDown, setOpenRunningSpeedDropDown] =
		useState(false)

	useEffect(() => {
		const init = async () => {
			// setEnlarge(isFullScreen(document.body))

			// if (screenfull.isEnabled) {
			// 	console.log('screenfull', await screenfull.request())
			// }

			const refreshMapSizeDebounce = new Debounce()
			window.addEventListener('resize', () => {
				// console.log('isFullScreen()', isFullScreen(document.body))
				// setEnlarge(isFullScreen(document.body))
				refreshMapSizeDebounce.increase(() => {
					map.current?.invalidateSize(true)
				}, 400)
			})

			clearEvent.on('clear', (data) => {
				clear(data)
			})
			setRunningSpeed(Number(await storage.global.get('runningSpeed')) || 1)
		}
		init()
	}, [])

	useEffect(() => {
		if (tripId && layout.openReplayTripModal) {
			clear(true)
			const init = async () => {
				const tripData = await dispatch(
					methods.trip.GetTrip({
						tripId,
						shareKey,
					})
				).unwrap()

				if (tripData) {
					setTrip(tripData)
					console.log('tripData', tripData)
				}
			}
			init()
		}
	}, [tripId, layout.openReplayTripModal])

	useEffect(() => {
		if (startTrip) {
			if (
				trip?.positions &&
				(updatingPositionIndex.current === trip?.positions?.length - 1 ||
					updatingPositionIndex.current === 0)
			) {
				// if (!isSetZoom.current) {
				zoom.current = 15
				isSetZoom.current = true
				// }
				map.current?.setZoom(zoom.current)
				clear(false)
				updatePosition(updatingPositionIndex.current)
				return start(0)
			}
			map.current?.setZoom(zoom.current)

			start(listenTime)
			return
		} else {
			setStopped(true)
			clearInterval(updatePositionTimer.current)
		}
	}, [startTrip])

	useEffect(() => {
		trip?.id && initMap()

		// setTimeout(() => {
		// 	setStartTrip(true)
		// }, 1000)
	}, [trip])
	useEffect(() => {
		if (config.mapUrl) {
			loadedMap.current = false
			initMap()
		}
	}, [config.mapUrl, config.configure.roadColorFade])
	useEffect(() => {
		if (startTrip) {
			start(listenTime)
			return
		}
	}, [runningSpeed])

	useEffect(() => {
		updateProgress()
		listenTimeRef.current = listenTime
	}, [listenTime])

	useEffect(() => {
		layer.current?.setGrayscale?.(config.configure.baseMap?.mapMode === 'Gray')
		layer.current?.setDarkscale?.(config.configure.baseMap?.mapMode === 'Dark')
		layer.current?.setBlackscale?.(
			config.configure.baseMap?.mapMode === 'Black'
		)
	}, [config.configure.baseMap?.mapMode])

	useEffect(() => {
		bindKeydownEvent()
	}, [startTrip, tripId, layout.openReplayTripModal, stopped])

	const listenTimeRef = useRef(0)

	const bindKeydownEvent = () => {
		const totalTime =
			(Number(trip?.positions?.[trip?.positions?.length - 1]?.timestamp) || 0) -
			Number(trip?.startTime)

		eventListener.removeEvent('replay-trip-keydown')

		eventListener.on('replay-trip-keydown', (e) => {
			if (e.keyCode === 32) {
				setStartTrip(!startTrip)
			}

			if (e.keyCode === 37) {
				const t = listenTimeRef.current - 1
				jump((t < 0 ? 0 : t) / totalTime)
			}
			if (e.keyCode === 39) {
				const t = listenTimeRef.current + 1
				jump((t > totalTime ? totalTime : t) / totalTime)
			}
		})
	}

	const start = (listenTime: number) => {
		clearInterval(updatePositionTimer.current)

		updateProgress()

		let t = 0
		updatePositionTimer.current = setInterval(
			() => {
				t++

				if (t === 1) {
					map.current?.invalidateSize()
				}

				setListenTime(listenTime + t)
				setStopped(false)
				// updatePositionTimer.current = setTimeout(
				// 	() => {
				// 		updatePosition(index + 1)
				// 	},
				// 	// 超过5分钟的快进，并且做提示

				// is skip？（设置里，下面代码有效
				if (!trip?.positions || updatingPositionIndex.current < 1) {
					return
				}
				const position = trip.positions[updatingPositionIndex.current - 1]
				const nextPosition = trip.positions[updatingPositionIndex.current]
				const timestamp =
					(Number(nextPosition.timestamp) - Number(position.timestamp)) *
					1000 *
					runningSpeed
				// console.log(
				// 	timestamp > 5 * 60 * 1000 * runningSpeed &&
				// 		Number(nextPosition.speed) < 0.8
				// )
				// console.log(
				// 	timestamp,
				// 	2 * 1000 * runningSpeed,
				// 	Number(nextPosition.speed)
				// )
				// 超过2秒信号差，超过5分钟则是摆烂

				showSkipLongParkingButton.current = false
				parkingTime.current = 0
				goThroughTunnel.current = false

				if (
					timestamp >
					2 * 1000 * runningSpeed
					// && Number(nextPosition.speed) < 1
				) {
					// console.log('跳过')
					gpsSignalStatus.current = -1

					// 超过1分钟就是长时间停车，跳过
					if (timestamp > 1 * 60 * 1000 * runningSpeed) {
						showSkipLongParkingButton.current = true
						parkingTime.current = timestamp / runningSpeed / 1000
						skipListenTime.current =
							Number(nextPosition.timestamp) - Number(trip.startTime)
						if (Number(nextPosition.speed) > 1) {
							goThroughTunnel.current = true
						}
					}
					// console.log(
					// 	listenTime + t,
					// 	Number(nextPosition.timestamp) - Number(trip.startTime)
					// )
					// clearInterval(updatePositionTimer.current)
					// setTimeout(() => {
					// 	start(Number(nextPosition.timestamp) - Number(trip.startTime))
					// }, 2000)

					return
				}

				gpsSignalStatus.current = 1
			},
			// 超过5分钟的快进，并且做提示
			1000 * runningSpeed
		)
	}

	const updateProgress = () => {
		if (
			!trip?.positions?.length ||
			updatingPositionIndex.current === trip?.positions?.length - 1
		)
			return setStartTrip(false)
		const cTime = listenTime + Number(trip?.startTime)
		const timestamp =
			Number(trip?.positions[updatingPositionIndex.current].timestamp) || 0
		// console.log(cTime, timestamp, cTime - timestamp)

		if (cTime - timestamp >= 0) {
			updatePosition(updatingPositionIndex.current)
			updatingPositionIndex.current++

			// clearInterval(updatePositionTimer.current)
		}
	}

	const updatePosition = (index: number) => {
		if (!trip?.positions?.length) return
		// console.log('trip?.positions', trip?.positions)

		// setUpdatedPositionIndex(index)

		const position = trip.positions[index]
		const nextPosition = trip.positions[index + 1]

		const timestamp =
			(Number(nextPosition.timestamp) - Number(position.timestamp)) *
			1000 *
			runningSpeed

		const dur = timestamp / 1000
		setDuration(dur)

		const speed = Number(position.speed) || 0
		const altitude = Number(position.altitude) || 0
		const nextAltitude = Number(nextPosition.altitude) || 0

		statistics.current.maxSpeed =
			speed > statistics.current.maxSpeed ? speed : statistics.current.maxSpeed

		if (altitude < nextAltitude) {
			statistics.current.climbAltitude += nextAltitude - altitude
		} else {
			statistics.current.descendAltitude += altitude - nextAltitude
		}

		statistics.current.maxAltitude =
			altitude > statistics.current.maxAltitude
				? altitude
				: statistics.current.maxAltitude

		statistics.current.minAltitude =
			statistics.current.minAltitude === 0 ||
			altitude < statistics.current.minAltitude
				? altitude
				: statistics.current.minAltitude
		heading.current = position.heading || 0
		if (!heading.current) {
			var angle = getAngle(
				Number(position.latitude || 0),
				Number(position.longitude || 0),
				Number(nextPosition.latitude || 0),
				Number(nextPosition.longitude || 0)
			)
			// console.log('heading', angle, runningSpeed, timestamp)
			heading.current = angle
		}

		// console.log(
		// 	'nextPosition.speed',
		// 	timestamp,
		// 	timestamp > 5 * 60 * 1000 * updateSpeed,
		// 	5 * 60 * 1000 * updateSpeed,
		// 	nextPosition,
		// 	timestamp > 5 * 60 * 1000 * updateSpeed &&
		// 		Number(nextPosition.speed) < 0.8
		// )
		// console.log(
		// 	'timestamptimestamp',
		// 	index,
		// 	timestamp,
		// 	dur,
		// 	index !== 0
		// 		? {
		// 				animate: true,
		// 				duration: dur,
		// 				easeLinearity: 1,
		// 		  }
		// 		: undefined
		// )

		panToMap(
			{
				coords: nextPosition,
			} as any,
			startTrip,
			index !== 0
				? {
						animate: true,
						duration: dur,
						easeLinearity: 1,
				  }
				: undefined
		)

		if (timestamp > 1000 * runningSpeed) {
			// console.log('timestamptimestamp 需要跳时间', timestamp)
		}

		// if (!map.current) return

		// const color = '#aaa'

		// const L: typeof Leaflet = (window as any).L

		// // if (polyline.current) {
		// // 	;(polyline.current as ReturnType<typeof L.polyline>).addLatLng(
		// // 		getLatLng(
		// // 			config.mapUrl,
		// // 			nextPosition.latitude || 0,
		// // 			nextPosition.longitude || 0
		// // 		) as any
		// // 	)
		// // 	return
		// // }
		// const pl = L.polyline(
		// 	[
		// 		getLatLng(
		// 			config.mapUrl,
		// 			position.latitude || 0,
		// 			position.longitude || 0
		// 		) as any,
		// 		getLatLng(
		// 			config.mapUrl,
		// 			nextPosition.latitude || 0,
		// 			nextPosition.longitude || 0
		// 		) as any,
		// 	],
		// 	{
		// 		// smoothFactor:10,
		// 		// snakingSpeed: 200,
		// 		color, //线的颜色
		// 		weight: trackWidth, //线的粗细
		// 		// opacity: 0.3,
		// 	}
		// ).addTo(map.current)
		// // playline.set
		// console.log('playline', pl)
		// polyline.current = pl
	}

	const jump = (progress: number) => {
		if (!trip?.positions?.length) return
		const totalTime =
			(Number(trip?.positions?.[trip?.positions?.length - 1]?.timestamp) || 0) -
			Number(trip?.startTime)

		const listenTime = totalTime * progress

		let index = 0
		trip?.positions.some((v, i) => {
			if (Number(v.timestamp) - (Number(trip.startTime) + listenTime) >= 0) {
				index = i
				return true
			}
		})
		console.log(
			progress,
			Number(trip?.positions?.[trip?.positions?.length - 1]?.timestamp),
			Number(trip?.startTime),
			listenTime,
			index
		)

		setListenTime(listenTime)
		gpsSignalStatus.current = 1
		updatingPositionIndex.current = index

		if (!stopped) {
			start(listenTime)
		}

		console.log('updatePositionTimer.current', updatePositionTimer.current)

		if (!trip?.positions[index]) return

		if (!isSetZoom.current) {
			zoom.current = 15
			isSetZoom.current = true
		}
		map.current?.setZoom(zoom.current)

		const position = trip.positions[index]

		heading.current = position.heading || 0
		if (!heading.current && index < trip?.positions?.length - 1) {
			const nextPosition = trip.positions[index + 1]
			var angle = getAngle(
				Number(position.latitude || 0),
				Number(position.longitude || 0),
				Number(nextPosition.latitude || 0),
				Number(nextPosition.longitude || 0)
			)
			heading.current = angle
		}

		panToMap(
			{
				coords: position,
			} as any,
			startTrip
		)
	}

	const initMap = () => {
		const L: typeof Leaflet = (window as any).L

		if (L && !loadedMap.current && trip?.id) {
			console.log('initMap开始加载！', trip)
			let lat = geo.position?.coords.latitude || 0
			let lon = geo.position?.coords.longitude || 0
			zoom.current = 13

			let positions = trip?.positions || []

			positions = positions.filter((v, i) => {
				const gss = !(v.speed === null || v.altitude === null)

				if (v.speed && v.speed > 45) {
					// console.log(v.speed, v.timestamp)
				}
				return gss
			})
			if (positions.length) {
				const startPosition = positions[0]
				const endPosition = positions[positions.length - 1]

				lat =
					(startPosition.latitude || 0) -
					((startPosition.latitude || 0) - (endPosition.latitude || 0)) / 2
				lon =
					(startPosition.longitude || 0) -
					((startPosition.longitude || 0) - (endPosition.longitude || 0)) / 2
				zoom.current = getZoom(
					startPosition.latitude || 0,
					startPosition.longitude || 0,
					lat,
					lon
				)
			}

			const latlng = getLatLng(config.mapUrl, lat, lon)

			console.log('latlng', latlng, [lat, lon], zoom)
			lat = latlng[0]
			lon = latlng[1]

			if (map.current) {
				map.current?.remove()
				marker.current?.remove()
				map.current = undefined
				marker.current = undefined
				maxSpeedMarker.current?.remove()
				maxSpeedMarker.current = undefined
			}
			if (!map.current) {
				map.current = L.map('rt-map', {
					renderer: L.canvas(),
					preferCanvas: true,
					zoomControl: false,
					minZoom: 3,
					maxZoom: 18,
					trackResize: false,
					zoomSnap: 0.5,

					zoom: 15,
					attributionControl: false,
				})

				// 检测地址如果在中国就用高德地图
				map.current.setView(
					[lat, lon],
					// [
					//   120.3814, -1.09],
					zoom.current
				)

				layer.current = (L.tileLayer as any)
					.colorScale(
						config.mapUrl,
						// maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url || config.mapUrl,
						{
							// errorTileUrl: osmMap,
							// attribution: `&copy;`,
							maxZoom: 18,
							isGrayscale: false,
						}
					)
					.addTo(map.current)

				layer.current?.setGrayscale?.(
					config.configure.baseMap?.mapMode === 'Gray'
				)
				layer.current?.setDarkscale?.(
					config.configure.baseMap?.mapMode === 'Dark'
				)
				layer.current?.setBlackscale?.(
					config.configure.baseMap?.mapMode === 'Black'
				)

				isRoadColorFade() && roadColorFade(layer.current)

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

					showeProgressBar.current = !showeProgressBar.current

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

				map.current.panTo([lat, lon], {
					animate: false,
				})

				let maxSpeedPosition = positions[0]

				if (trip?.positions) {
					console.time('getLatLnggetLatLng')

					const latLngs: number[][] = []
					const colors: string[] = []

					positions
						.filter((v) => {
							return !(Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0)
						})
						?.forEach((v, i, arr) => {
							const speedColorLimit = (config.configure.speedColorLimit as any)[
								(trip?.type?.toLowerCase() || 'running') as any
							]

							maxSpeedPosition =
								Number(maxSpeedPosition?.speed) < Number(v.speed)
									? v
									: maxSpeedPosition

							// const latlng = getLatLng(lat, lon)

							// lat = latlng[0]
							// lon = latlng[1]

							latLngs.push(
								getLatLng(
									config.mapUrl,
									v.latitude || 0,
									v.longitude || 0
								) as any
							)
							colors.push(
								getSpeedColor(
									v.speed || 0,
									speedColorLimit.minSpeed,
									speedColorLimit.maxSpeed,
									config.speedColorRGBs
								)
							)
						})

					// console.log('LLLL', L)
					const polycolor = (L as any)
						.polycolor(latLngs, {
							colors: colors,
							useGradient: true,
							weight: trackWidth,
						})
						.addTo(map.current)
					console.log('fTripPositions polyline', polycolor?.addTo, map.current)

					if (positions?.[0]) {
						let startIcon = L.icon({
							className: 'map_position_start_icon',
							iconUrl: '/position_start_green.png',
							iconSize: [28, 28],
							// shadowSize: [36, 36],
							iconAnchor: [14, 25],
							// shadowAnchor: [4, 62],
							// popupAnchor: [-3, -76],
						})
						L.marker(
							getLatLng(
								config.mapUrl,
								positions[0]?.latitude || 0,
								positions[0]?.longitude || 0
							) as any,
							{
								icon: startIcon,
							}
						)
							.addTo(map.current)
							// .bindPopup(
							// 	`${ipInfoObj.ipv4}`
							// 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
							// )
							.openPopup()
					}
					if (positions?.[positions.length - 1]) {
						let endIcon = L.icon({
							className: 'map_position_end_icon',
							iconUrl: '/position_end_black.png',
							iconSize: [26, 34],
							// iconUrl: '/position_start.png',
							// iconSize: [28, 28],
							// shadowSize: [36, 36],
							iconAnchor: [0, 30],
							// shadowAnchor: [4, 62],
							// popupAnchor: [-3, -76],
						})
						L.marker(
							getLatLng(
								config.mapUrl,
								positions[positions.length - 1]?.latitude || 0,
								positions[positions.length - 1]?.longitude || 0
							) as any,
							{
								icon: endIcon,
							}
						)
							.addTo(map.current)
							// .bindPopup(
							// 	`${ipInfoObj.ipv4}`
							// 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
							// )
							.openPopup()
					}

					setMaxSpeedPosition(maxSpeedPosition)
					if (maxSpeedPosition) {
						maxSpeedMarker.current = createIconMarker({
							map: map.current,
							maxSpeed: maxSpeedPosition?.speed || 0,
							latlng: getLatLng(
								config.mapUrl,
								maxSpeedPosition.latitude || 0,
								maxSpeedPosition.longitude || 0
							),
							type: 'MaxSpeed',
						})
					}

					console.timeEnd('getLatLnggetLatLng')
				}
			}

			loadedMap.current = true
			// console.log('map', map)
		}
	}

	const panToMap = (
		position: GeolocationPosition,
		allowPanto?: boolean,
		panOptions?: Leaflet.PanOptions
	) => {
		const L: typeof Leaflet = (window as any).L

		// console.log('panToMap', position, map.current, L, marker.current)
		if (map.current && L) {
			const [lat, lon] = getLatLng(
				config.mapUrl,
				position?.coords.latitude || 0,
				position?.coords.longitude || 0
			)

			// console.log(
			// 	'panto',
			// 	allowPanto,
			// 	!disablePanTo || allowPanto,
			// 	[lat, lon],
			// 	marker.current
			// )

			if (!disablePanTo || allowPanto) {
				map.current.panTo(
					[lat, lon],
					panOptions || {
						animate: false,
					}
				)
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
						html: `<div class='map_current_position_icon-wrap'>
            <div class='icon'></div>
            ${
							user.userInfo?.uid && config.configure.showAvatarAtCurrentPosition
								? `<div class='saki-avatar'><saki-avatar
              width='${22}px'
              height='${22}px'
              border-radius='50%'
              border='2px solid #fff'
              border-hover='2px solid #fff'
              border-active='2px solid #fff'
              default-icon={'UserLine'}
              nickname='${user.userInfo?.nickname}'
              src='${user.userInfo?.avatar}'
              alt=''
            ></saki-avatar></div>`
								: ''
						}

            </div>`,
						className:
							'map_current_position_icon ' +
							(user?.userInfo?.uid &&
							config.configure.showAvatarAtCurrentPosition
								? ' avatar'
								: ' noAvatar'),
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
		}
	}

	const cityTimeline = useMemo(() => {
		return (
			trip?.cities?.reduce(
				(results, v, i, arr) => {
					v.entryTimes?.forEach((t) => {
						results.push({
							item: v,
							time: Number(t.timestamp),
						})
					})
					if (arr.length - 1 === i) {
						console.log('trip?.cities results', results)
						results.sort((a, b) => a.time - b.time)
					}
					return results
				},
				[] as {
					item: protoRoot.trip.ITripCity
					time: number
				}[]
			) || []
		)
	}, [trip?.cities])

	const findCityByTimestamp = (
		cityTimeline: {
			item: protoRoot.trip.ITripCity
			time: number
		}[],
		timestamp: number
	) => {
		if (!cityTimeline.length) return
		let city = cityTimeline[0]
		for (let i = 0; i < cityTimeline.length; i++) {
			// console.log(
			// 	'lllll',
			// 	i,
			// 	moment(cityTimeline[i].time * 1000).format('hh:mm:ss'),
			// 	moment(timestamp * 1000).format('hh:mm:ss'),
			// 	moment(Number(trip?.startTime) * 1000).format('hh:mm:ss'),
			// 	moment(Number(trip?.endTime) * 1000).format('hh:mm:ss'),
			// 	cityTimeline[i].time > timestamp
			// )
			if (cityTimeline[i].time > timestamp) {
				break
			}
			city = cityTimeline[i]
		}
		return city
	}

	// const [fullCityName, setFullCityName] = useState(true)

	const entryTime = useRef(0)

	const [cityInfo, setCityInfo] = useState<
		protoRoot.trip.ITripCity | undefined
	>()
	useEffect(() => {
		const tempCitiInfo = findCityByTimestamp(
			cityTimeline,
			Number(trip?.startTime) + listenTime
		)
		if (tempCitiInfo?.time !== entryTime.current) {
			// console.log('新城市', tempCitiInfo)
			entryTime.current = tempCitiInfo?.time || 0

			const spans = document.querySelectorAll('.rt-city span')

			// 动画参数
			const exitDuration = 300 // 消失阶段 0.3 秒（快速）
			const enterDuration = 1200 // 显示阶段 1.2 秒（灵巧）

			setTimeout(() => {
				// console.log('新城市', 3232)
				setCityInfo(tempCitiInfo?.item)
			}, 400)

			// 为每个字符添加动画
			spans.forEach((span, index) => {
				const delay = index * 100 // 每个字符延迟 100ms

				// 1. 消失动画（快速向左上方淡出）
				const exitAnimation = span.animate(
					[
						{ transform: 'translate(0, 0)', opacity: 1 }, // 开始位置
						{ transform: 'translate(-80px, -40px)', opacity: 0 }, // 快速消失
					],
					{
						duration: exitDuration,
						delay: delay,
						easing: 'ease-out', // 快速消失的自然减速
						fill: 'forwards',
					}
				)

				// 2. 显示动画（从右上方灵巧滑入）
				exitAnimation.onfinish = () => {
					span.animate(
						[
							{ transform: 'translate(80px, -40px) rotate(15deg)', opacity: 0 }, // 从右上方带点旋转进入
							{
								transform: 'translate(0, -10px) rotate(-5deg)',
								opacity: 0.7,
								offset: 0.7,
							}, // 中间轻微弹起
							{ transform: 'translate(0, 0) rotate(0deg)', opacity: 1 }, // 平滑落地
						],
						{
							duration: enterDuration,
							delay: 0, // 消失后立即开始
							easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.5)', // 弹性感（超出目标后回弹）
							fill: 'forwards',
						}
					)
				}
			})
		}
	}, [listenTime])

	const clear = (initMap = false) => {
		console.log('clear')
		clearTimeout(updatePositionTimer.current)

		if (initMap) {
			loadedMap.current = false
			map.current?.remove()
			marker.current?.remove()
			map.current = undefined
			marker.current = undefined
			maxSpeedMarker.current?.remove()
			maxSpeedMarker.current = undefined
			setStartTrip(false)
		}

		heading.current = 0
		setDuration(0)
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

		updatingPositionIndex.current = 0
		setListenTime(-1)
	}

	const maxSpeedPositionProcess =
		(Number(maxSpeedPosition?.timestamp) - Number(trip?.startTime)) /
		((Number(trip?.positions?.[trip?.positions?.length - 1]?.timestamp) || 0) -
			Number(trip?.startTime))

	const cityStyle = useRef('Dark')
	const fullCityName = useRef(true)

	const timer = useRef<NodeJS.Timeout>()

	const cityClickEvent = useRef({
		timer: deepCopy(timer.current),
		startTime: 0,
		mouseDown: (e: any) => {
			cityClickEvent.current.startTime = e.timeStamp
			cityClickEvent.current.timer = setTimeout(() => {
				// cityClickEvent.current.copyText()
				cityStyle.current = cityStyle.current === 'Dark' ? 'Light' : 'Dark'
				forceUpdate()
				return
			}, 700)
		},
		mouseUp: (e: any) => {
			cityClickEvent.current?.timer &&
				clearTimeout(cityClickEvent.current.timer)

			// console.log(
			// 	'cityClickEvent.current',
			// 	e.timeStamp - cityClickEvent.current.startTime
			// )

			if (!cityClickEvent.current?.startTime) return

			if (e.timeStamp - cityClickEvent.current.startTime < 700) {
				// setFullCityName(!fullCityName)
				fullCityName.current = !fullCityName.current
				forceUpdate()
			}
			cityClickEvent.current.startTime = 0

			e.stopPropagation()
			e.preventDefault()
		},
	})
	return (
		<div
			className='rt-main'
			style={
				{
					'--window-h': config.deviceWH.h + 'px',

					'--position-heading': (heading.current || 0) + 'deg',
					'--position-transition': (duration || 0) + 's',
				} as any
			}
		>
			<div
				id={'rt-map'}
				className={
					config.deviceType +
					' ' +
					(startTrip ? 'start' : '') +
					' ' +
					(isRoadColorFade() ? 'roadColorFade' : '') +
					' ' +
					speedMeterZoom
				}
			></div>

			{trip?.positions && (startTrip || listenTime >= 0) ? (
				<SpeedMeterComponent
					tripId={tripId || ''}
					gpsSignalStatus={gpsSignalStatus.current}
					stopped={false}
					position={trip.positions[updatingPositionIndex.current]}
					startTime={(Number(trip.startTime) || 0) * 1000}
					listenTime={((Number(trip.startTime) || 0) + listenTime) * 1000}
					statistics={statistics.current}
					updatedPositionsLength={updatingPositionIndex.current}
					positionsLength={trip.positions.length}
					runTime={startTrip ? 1000 * runningSpeed : 1}
					// cities={trip?.cities || []}
					onZoom={(v) => {
						console.log(v)
						setZoomSpeedMeter(v)
						map.current?.invalidateSize(true)
					}}
				/>
			) : (
				''
			)}

			{showSkipLongParkingButton.current ? (
				<div className={'rt-skip-button '}>
					<saki-button
						ref={bindEvent({
							tap: () => {
								start(skipListenTime.current)
							},
						})}
						height='30px'
						padding={'6px 12px'}
						border-radius={'15px'}
						border='none'
						bg-color='rgba(0,0,0,0.3)'
						bg-hover-color='rgba(0,0,0,0.4)'
						bg-active-color='rgba(0,0,0,0.5)'
					>
						<span>
							{goThroughTunnel.current
								? t('goThroughTunnelSkip', {
										ns: 'tripPage',
										parkingTime: formatTimestamp(parkingTime.current, false),
								  })
								: t('parkingLongTimeSkip', {
										ns: 'tripPage',
										parkingTime: formatTimestamp(parkingTime.current, false),
								  })}
						</span>
					</saki-button>
				</div>
			) : (
				''
			)}

			{cityInfo?.cityDetails?.length ? (
				<div
					ref={
						bindEvent({
							// click: () => {
							// 	// setFullCityName(!fullCityName)
							// 	fullCityName.current = !fullCityName.current
							// },
							mousedown: cityClickEvent.current.mouseDown,
							mouseup: cityClickEvent.current.mouseUp,
							touchstart: cityClickEvent.current.mouseDown,
							touchend: cityClickEvent.current.mouseUp,
						}) as any
					}
					className={'rt-city ' + cityStyle.current}
				>
					{/* <span>贵州·黔西南·兴义·万峰湖</span> */}
					{cityInfo?.cityDetails
						?.slice(1, cityInfo?.cityDetails?.length || 0)
						.map((v, i, arr) => {
							let name = getCityName(v.name)
							if (!fullCityName.current) {
								name = getSimpleCityName(
									name,
									convertCityLevelToTypeString(v.level || 1)
								)
							}
							return (
								<span key={i}>{name + (i < arr.length - 1 ? '·' : '')}</span>
							)
						})}
				</div>
			) : (
				''
			)}
			<div
				className={
					'rt-processbar ' +
					config.deviceType +
					' ' +
					(showeProgressBar.current ? 'show' : 'hide')
				}
			>
				<saki-button
					ref={bindEvent({
						tap: () => {
							setStartTrip(!startTrip)
						},
					})}
					bg-color='transparent'
					bg-hover-color='transparent'
					bg-active-color='transparent'
					border='none'
					type='Normal'
					margin='0 6px 0 0'
				>
					{startTrip ? (
						<saki-icon
							width='26px'
							height='26px'
							color='#fff'
							type={'Pause'}
						></saki-icon>
					) : (
						<saki-icon
							width='26px'
							height='26px'
							color='#fff'
							type={'Play'}
						></saki-icon>
					)}
				</saki-button>

				<div className='rt-p'>
					<saki-linear-progress-bar
						ref={bindEvent({
							jump: (e) => {
								jump(e.detail)
							},
						})}
						width='100%'
						height='10px'
						progress={
							listenTime /
							((Number(
								trip?.positions?.[trip?.positions?.length - 1]?.timestamp
							) || 0) -
								Number(trip?.startTime) -
								1)

							// updatedPositionIndex / ((trip?.positions?.length || 0) - 2)
						}
						border-radius={'5px'}
						transition={'width ' + duration + 's linear'}
					></saki-linear-progress-bar>
					{maxSpeedPosition?.speed ? (
						<div
							ref={
								bindEvent({
									click: () => {
										console.log('maxSpeedPosition', maxSpeedPosition)
										jump(maxSpeedPositionProcess)
									},
								}) as any
							}
							style={{
								left: maxSpeedPositionProcess * 100 + '%',
							}}
							className='rt-p-mark map-max-speed-marker'
						>
							<div className='map-max-speed-marker-wrap'>
								<div className='msm-icon'>
									<saki-icon
										margin='-1px 0 0 -1px'
										color='var(--saki-default-color)'
										size='10px'
										type='Rocket'
									></saki-icon>
								</div>
								<div className='msm-speed'>
									<span>
										{Math.round(
											Number(maxSpeedPosition?.speed || 0) * 3.6 * 10
										) / 10}
									</span>
									<span>km/h</span>
								</div>
							</div>
						</div>
					) : (
						''
					)}
				</div>
				<saki-dropdown
					visible={openRunningSpeedDropDown}
					floating-direction='Left'
					z-index='1001'
					ref={bindEvent({
						close: (e) => {
							setOpenRunningSpeedDropDown(false)
						},
					})}
				>
					<saki-button
						ref={bindEvent({
							tap: () => {
								setOpenRunningSpeedDropDown(true)
							},
						})}
						bg-color='transparent'
						bg-hover-color='transparent'
						bg-active-color='transparent'
						border='none'
						type='Normal'
						height='26px'
						padding='4px 4px 4px 0'
					>
						<span
							style={{
								lineHeight: '14px',
								fontSize: runningSpeed === 1 ? '15px' : '16px',
								color: '#fff',
							}}
						>
							{runningSpeed === 1
								? '倍速'
								: runningSpeedArr.filter((v) => {
										return v.v === runningSpeed
								  })?.[0].t}
						</span>
					</saki-button>
					<div slot='main'>
						<SakiScrollView
							maxHeight={Math.min(config.deviceWH.h, 300) + 'px'}
							mode='Custom'
						>
							<saki-menu
								ref={bindEvent({
									selectvalue: async (e) => {
										setRunningSpeed(Number(e.detail.value))

										setOpenRunningSpeedDropDown(false)
										await storage.global.set('runningSpeed', e.detail.value)
									},
								})}
							>
								{/* 0.5, 0.75, 1, 2.5, 5, 7.5, 10 */}
								{runningSpeedArr.map((v) => {
									return (
										<saki-menu-item
											key={v.v}
											padding='10px 14px'
											value={v.v}
											active={v.v === runningSpeed}
										>
											<saki-row align-items='center' justify-content='center'>
												<span>{v.t}</span>
											</saki-row>
										</saki-menu-item>
									)
								})}
							</saki-menu>
						</SakiScrollView>
					</div>
				</saki-dropdown>
				<saki-button
					ref={bindEvent({
						tap: () => {
							if (!config.fullScreen) {
								dispatch(methods.config.fullScreen(true))
								return
							}
							dispatch(methods.config.fullScreen(false))
						},
					})}
					bg-color='transparent'
					bg-hover-color='transparent'
					bg-active-color='transparent'
					border='none'
					type='Normal'
					margin='0 6px 0 0'
				>
					{!config.fullScreen ? (
						<saki-icon
							width='18px'
							height='18px'
							color='#fff'
							type='ZoomIn'
						></saki-icon>
					) : (
						<saki-icon
							width='18px'
							height='18px'
							color='#fff'
							type='ZoomOut'
						></saki-icon>
					)}
				</saki-button>
				{trip?.positions && (startTrip || listenTime >= 0) ? (
					<saki-button
						ref={bindEvent({
							tap: () => {
								dispatch(layoutSlice.actions.setOpenReplayTripModal(false))
								clear(true)
							},
						})}
						bg-color='transparent'
						bg-hover-color='transparent'
						bg-active-color='transparent'
						border='none'
						type='Normal'
						margin='0 6px 0 0'
					>
						<saki-icon
							width='18px'
							height='18px'
							color='#fff'
							type='Shutdown'
						></saki-icon>
						{/* {!enlarge ? (
						<saki-icon
							width='18px'
							height='18px'
							color='#fff'
							type='ZoomIn'
						></saki-icon>
					) : (
						<saki-icon
							width='18px'
							height='18px'
							color='#fff'
							type='ZoomOut'
						></saki-icon>
					)} */}
					</saki-button>
				) : (
					''
				)}
			</div>
			<div
				className={
					'rt-back-button ' +
					config.deviceType +
					' ' +
					(trip?.positions && (startTrip || listenTime >= 0) ? 'start' : 'stop')
				}
			>
				<saki-button
					ref={bindEvent({
						tap: () => {
							dispatch(layoutSlice.actions.setOpenReplayTripModal(false))
							clear(true)
						},
					})}
					width='46px'
					height='46px'
					bg-color='rgba(0,0,0,0.3)'
					bg-hover-color='rgba(0,0,0,0.4)'
					bg-active-color='rgba(0,0,0,0.5)'
					type='CircleIconGrayHover'
				>
					<saki-icon
						width='20px'
						height='20px'
						color='#fff'
						type={'Shutdown'}
					></saki-icon>
				</saki-button>
			</div>
		</div>
	)
}

export default ReplayTripComponent
