import React, { use, useCallback, useEffect, useRef, useState } from 'react'

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
	getDistance,
	getLatLng,
	getLatLngGcj02ToWgs84,
	getSpeedColor,
	getZoom,
	isFullScreen,
	isRoadColorFade,
	removePolylinePointByLatLng,
	roadColorFade,
} from '../plugins/methods'
import TripItemComponent from './TripItem'
import { Chart } from 'chart.js'
import { Debounce, deepCopy, getShortId, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet, { latLng } from 'leaflet'
import SpeedMeterComponent from './SpeedMeter'
import { Statistics } from '../store/trip'
import { eventListener, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
	createCustomTripPointMarker,
	createCustomTripPointMarkerIcon,
	createMyPositionMarker,
	createOtherPositionMarker,
} from '../store/position'

const CreateCustomTripComponent = () => {
	const { t, i18n } = useTranslation('createCustomTripModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const geo = useSelector((state: RootState) => state.geo)
	const user = useSelector((state: RootState) => state.user)

	const dispatch = useDispatch<AppDispatch>()

	const loadedMap = useRef(false)
	const map = useRef<Leaflet.Map>()
	const layer = useRef<any>()
	const targetMarker = useRef<Leaflet.Marker<any>>()
	const marker = useRef<Leaflet.Marker<any>>()
	const customTripPoints = useRef<
		{
			id: string
			latlng: {
				lat: number
				lng: number
			}
			distance: number
			marker?: Leaflet.Marker<any>
		}[]
	>([])

	const polyline = useRef<Leaflet.Polyline<any>>()

	const [selectGpsNodeIndex, setSelectGpsNodeIndex] = useState(-1)
	const selectGpsNodeId = useRef('')
	const [openInfoPage, setOpenInfoPage] = useState(false)
	const [openEditTypeDropdown, setOpenEditTypeDropdown] = useState(false)
	const [type, setType] = useState('')

	const [openStartDateDatePicker, setOpenStartDateDatePicker] = useState(false)
	const [openEndDateDatePicker, setOpenEndDateDatePicker] = useState(false)

	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')
	const [loading, setLoading] = useState(false)

	const [showTag, setShowTag] = useState(true)

	const [myPosition, setMyPosition] = useState<protoRoot.trip.ITripPosition>()

	useEffect(() => {
		const init = async () => {
			const b = await storage.global.get('showcustomTripPositionsTag')
			setShowTag(typeof b === 'boolean' ? b : showTag)

			const refreshMapSizeDebounce = new Debounce()
			window.addEventListener('resize', () => {
				refreshMapSizeDebounce.increase(() => {
					map.current?.invalidateSize(true)
				}, 400)
			})
		}
		init()
	}, [])

	useEffect(() => {
		if (selectGpsNodeIndex === -1) {
			const el = document.querySelectorAll('.map-custom-trip-marker.active')
			el.forEach((el) => {
				el.classList.remove('active')
			})
		} else {
			const el = document.querySelector(
				'.map-custom-trip-marker.' + selectGpsNodeId.current
			)
			el?.classList.add('active')
			console.log(el)
		}
	}, [selectGpsNodeIndex])

	useEffect(() => {
		if (!layout.openCreateCustomTripModal) {
			setMyPosition(undefined)
		}
	}, [layout.openCreateCustomTripModal])

	useEffect(() => {
		try {
			if (geo.position) {
				setMyPosition({
					longitude: geo.position.coords.longitude || 0,
					latitude: geo.position.coords.latitude || 0,
					altitude: geo.position.coords.altitude || -1,
					altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
					accuracy: geo.position.coords.accuracy || -1,
					heading: geo.position.coords.heading || -1,
					speed: geo.position.coords.speed || -1,
					timestamp: geo.position.timestamp || 0,
				})
			}
		} catch (error) {}
	}, [geo.position?.timestamp])

	useEffect(() => {
		bindMapClickEvent()
	}, [selectGpsNodeIndex])

	// useEffect(() => {
	// 	console.log('customTripPoints', customTripPoints.current)
	// }, [customTripPoints])

	useEffect(() => {
		if (layout.openCreateCustomTripModal && config.mapUrl) {
			loadedMap.current = false
			initMap()
			return
		}
		clearMap()
	}, [config.mapUrl, layout.openCreateCustomTripModal])

	const clearMap = () => {
		console.log('clearMap')
		loadedMap.current = false
		map.current?.remove()
		map.current = undefined
		marker.current?.remove()
		marker.current = undefined
		targetMarker.current?.remove()
		targetMarker.current = undefined
		polyline.current?.remove()
		polyline.current = undefined
	}

	const initMap = async () => {
		const L: typeof Leaflet = (window as any).L

		const myPositionGPS = getLatLng(
			config.mapUrl,
			myPosition?.latitude || 0,
			myPosition?.longitude || 0
		)
		const zoom = 15

		const [lat, lon] = [myPositionGPS[0], myPositionGPS[1]]

		if (L && !loadedMap.current) {
			if (map.current) {
				clearMap()
			}
			if (!map.current) {
				map.current = L.map('cct-map', {
					renderer: L.canvas(),
					preferCanvas: true,
					zoomControl: false,
					minZoom: 3,
					maxZoom: 18,
					trackResize: false,
					zoomSnap: 0.5,

					attributionControl: false,

					maxBoundsViscosity: 1.0,
					maxBounds: [
						[-85, -179],
						[85, 179],
					],
				})

				// 检测地址如果在中国就用高德地图
				map.current.setView([lat, lon], zoom)

				layer.current = (L.tileLayer as any)
					.colorScale(config.mapUrl, {})
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
				bindMapClickEvent()
			}

			marker.current = createMyPositionMarker(map.current, [
				myPositionGPS[0],
				myPositionGPS[1],
			])

			const customTripPositions = await storage.global.get(
				'customTripPositions'
			)
			console.log('customTripPositions', customTripPositions)
			if (customTripPositions?.length) {
				customTripPoints.current = customTripPositions.map((v: any) => {
					return {
						id: getShortId(9),
						latlng: {
							lat: v.lat,
							lng: v.lng,
						},
						distance: -1,
					}
				})

				// customTripPoints.current = testCustomTrip.map((v: any) => {
				// 	return {
				// 		id: getShortId(9),
				// 		latlng: {
				// 			lat: v.latitude,
				// 			lng: v.longitude,
				// 		},
				// 		distance: -1,
				// 	}
				// })

				const speedColorLimit = (config.configure.speedColorLimit as any)[
					'drive' as any
				]
				const color = getSpeedColor(
					40,
					speedColorLimit.minSpeed,
					speedColorLimit.maxSpeed,
					config.speedColorRGBs
				)

				let minLat = customTripPoints.current[0].latlng.lat
				let minLng = customTripPoints.current[0].latlng.lng
				let maxLat = customTripPoints.current[0].latlng.lat
				let maxLng = customTripPoints.current[0].latlng.lng

				const pl = L.polyline(
					customTripPoints.current.map((v) => {
						if (v.latlng.lat < minLat) {
							minLat = v.latlng.lat
						}
						if (v.latlng.lng < minLng) {
							minLng = v.latlng.lng
						}
						if (v.latlng.lat > maxLat) {
							maxLat = v.latlng.lat
						}
						if (v.latlng.lng > maxLng) {
							maxLng = v.latlng.lng
						}
						return [v.latlng.lat, v.latlng.lng]
					}),
					{
						color,
						weight: Number(config.configure.polylineWidth?.ongoingTrip),
					}
				).addTo(map.current)
				polyline.current = pl

				calcDistance()

				let lat = (maxLat + minLat) / 2
				let lng = (maxLng + minLng) / 2
				let zoom = getZoom(minLat, minLng, maxLat, maxLng)
				map.current.setView([lat, lng], zoom)
			}

			loadedMap.current = true
		}

		if (map.current && L) {
			marker.current?.setLatLng([myPositionGPS[0], myPositionGPS[1]])
		}
	}

	const bindMapClickEvent = () => {
		map.current?.removeEventListener('click')
		map.current?.on('click', (e) => {
			let latlng = e.latlng

			const obj = {
				id: getShortId(9),
				latlng: {
					lat: latlng.lat,
					lng: latlng.lng,
				},
				distance: -1,
			}
			if (selectGpsNodeIndex < 0) {
				customTripPoints.current.push(obj)
			} else {
				customTripPoints.current.splice(selectGpsNodeIndex, 0, obj)
			}
			savePositionsToLocal()

			addPolyline()
		})
	}

	const addPolyline = () => {
		const { config } = store.getState()
		const L: typeof Leaflet = (window as any).L
		if (!L || !map.current) return

		const v =
			customTripPoints.current[
				selectGpsNodeIndex >= 0
					? selectGpsNodeIndex
					: customTripPoints.current.length - 1
			].latlng

		const vLatlon = [v.lat, v.lng]

		// marker.setIcon(createCustomTripPointMarkerIcon(1))
		calcDistance()

		if (customTripPoints.current.length <= 1) {
			return
		}
		const lv =
			customTripPoints.current[customTripPoints.current.length - 2].latlng

		const lvLatlon = [lv.lat, lv.lng]

		console.log('latlng', selectGpsNodeIndex, customTripPoints.current)

		const speedColorLimit = (config.configure.speedColorLimit as any)[
			'drive' as any
		]
		const color = getSpeedColor(
			40,
			speedColorLimit.minSpeed,
			speedColorLimit.maxSpeed,
			config.speedColorRGBs
		)
		if (polyline.current) {
			if (selectGpsNodeIndex < 0) {
				polyline.current.addLatLng(vLatlon as any)
			} else {
				const latlngs = polyline.current.getLatLngs()

				latlngs.splice(selectGpsNodeIndex, 0, vLatlon as any)
				polyline.current.setLatLngs(latlngs)
			}
		} else {
			const pl = L.polyline([lvLatlon as any, vLatlon as any], {
				// smoothFactor:10,
				// snakingSpeed: 200,
				color, //线的颜色
				weight: Number(config.configure.polylineWidth?.ongoingTrip), //线的粗细
				// opacity: 0.3,
			}).addTo(map.current)
			// playline.set
			console.log('playline', pl)
			polyline.current = pl
		}
		setSelectGpsNodeIndex(-1)
		selectGpsNodeId.current = ''
	}

	const calcDistance = () => {
		let tDistance = 0

		customTripPoints.current.forEach((sv, si) => {
			if (!map.current) return

			const vlatlon = sv.latlng

			if (si === 0) {
				if (sv.distance !== 0) {
					sv.marker?.setIcon(createCustomTripPointMarkerIcon(0, sv.id))
				}
				sv.distance = 0
				tDistance = 0
			} else {
				const lvlatlon = customTripPoints.current[si - 1].latlng
				const cdistance = getDistance(
					vlatlon.lat,
					vlatlon.lng,
					lvlatlon.lat,
					lvlatlon.lng
				)
				tDistance += cdistance
			}
			// console.log('tDistance', tDistance, sv.distance, sv.marker)
			if (sv.marker) {
				// if (sv.distance !== tDistance) {
				sv.marker.setIcon(createCustomTripPointMarkerIcon(tDistance, sv.id))
				// }
			} else {
				const marker = createCustomTripPointMarker(
					map.current,
					tDistance,
					sv.id,
					[vlatlon.lat, vlatlon.lng]
				)

				let clickTime = 0

				marker.addEventListener('click', (e) => {
					if (new Date().getTime() - clickTime <= 500) {
						deleteMarker(marker, vlatlon)
						return
					}
					console.log(e.originalEvent.target)
					const el = e.originalEvent.target as Element
					console.log(el.localName)

					clickTime = new Date().getTime()

					if (el.localName === 'saki-icon') {
						deleteMarker(marker, vlatlon)
						return
					}

					console.log('选中')

					customTripPoints.current.some((sv, si) => {
						console.log(sv)
						if (!sv?.marker) return
						const latlng = sv.marker.getLatLng()
						console.log(latlng, vlatlon)
						if (latlng.lat === vlatlon.lat && latlng.lng === vlatlon.lng) {
							if (selectGpsNodeId.current === sv.id) {
								setSelectGpsNodeIndex(-1)
								selectGpsNodeId.current = ''
								return true
							}
							setSelectGpsNodeIndex(si + 1)
							selectGpsNodeId.current = sv.id
							return true
						}
					})
				})
				sv.marker = marker
			}

			sv.distance = tDistance
		})
	}

	const deleteMarker = (
		marker: Leaflet.Marker<any>,
		vlatlon: {
			lat: number
			lng: number
		}
	) => {
		polyline.current &&
			removePolylinePointByLatLng(polyline.current, [vlatlon.lat, vlatlon.lng])
		marker?.remove()
		customTripPoints.current.some((sv, i) => {
			if (!sv?.marker) return

			const latlng = sv.marker.getLatLng()
			if (latlng.lat === vlatlon.lat && latlng.lng === vlatlon.lng) {
				customTripPoints.current.splice(i, 1)
				savePositionsToLocal()
				return true
			}
		})
		if (customTripPoints.current.length === 0) {
			polyline.current?.remove()
			polyline.current = undefined
		}

		calcDistance()

		setSelectGpsNodeIndex(-1)
		selectGpsNodeId.current = ''
	}

	const savePositionsToLocal = async () => {
		await storage.global.set(
			'customTripPositions',
			customTripPoints.current.map((v) => {
				return v.latlng
			})
		)
	}

	const saveTrip = async () => {
		if (loading) return
		setLoading(true)

		const sd = Math.round(new Date(startDate).getTime() / 1000)
		const ed = Math.round(new Date(endDate).getTime() / 1000)

		const time = ed - sd

		const distance =
			customTripPoints.current[customTripPoints.current.length - 1].distance

		const aTime = (time / distance) * 1000
		// console.log(
		// 	'tttttttttt aTime',
		// 	distance / time,
		// 	(distance / time) * 3.6,
		// 	aTime
		// )

		const params: protoRoot.trip.AddTripToOnline.IRequest = {
			type: type,
			positions: customTripPoints.current?.map(
				(v, i): protoRoot.trip.ITripPosition => {
					const gps = getLatLngGcj02ToWgs84(
						config.mapUrl,
						v.latlng.lat,
						v.latlng.lng
					)

					let lvDistance = 0
					if (i >= 1) {
						lvDistance = customTripPoints.current[i - 1].distance
					}

					// console.log(
					// 	'tttttttttt',
					// 	Math.floor(sd * 1000 + aTime * v.distance),
					// 	// v.distance - lvDistance,
					// 	// aTime,
					// 	aTime * v.distance
					// )

					return {
						latitude: gps[0],
						longitude: gps[1],
						altitude: 348,
						altitudeAccuracy: 1,
						accuracy: 1,
						heading: 1,
						speed: distance / time,
						timestamp: Math.floor(sd * 1000 + aTime * v.distance),
					}
				}
			),
			marks: [],
			createTime: sd,
			startTime: sd,
			endTime: ed,
			customTrip: true,
		}
		console.log(params)
		const res = await httpApi.v1.AddTripToOnline(params)
		console.log('AddTripToOnline', res)

		if (res.code === 200 && res?.data?.trip) {
			// await clear()
			setOpenInfoPage(false)

			setType('')
			setStartDate('')
			setEndDate('')

			snackbar({
				message: t('createdSuccessfully', {
					ns: 'prompt',
				}),
				vertical: 'top',
				horizontal: 'center',
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
				autoHideDuration: 2000,
			}).open()
		}
		setLoading(false)
	}

	const clear = async () => {
		await storage.global.delete('customTripPositions')

		customTripPoints.current.forEach((v, i) => {
			v?.marker?.remove()
		})
		customTripPoints.current = []

		polyline.current?.remove()
		polyline.current = undefined
	}

	return (
		<saki-modal
			ref={bindEvent({
				close() {
					dispatch(layoutSlice.actions.setOpenCreateCustomTripModal(false))
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
			visible={layout.openCreateCustomTripModal}
		>
			<div
				className={
					'create-custom-trip-component ' +
					config.deviceType +
					(config.fullScreen ? ' enlarge ' : ' ') +
					(!showTag ? 'showTag ' : ' ')
				}
			>
				<div className='th-header'>
					<saki-modal-header
						// border
						back-icon={openInfoPage}
						close-icon={!openInfoPage}
						right-width={'74px'}
						ref={bindEvent({
							close() {
								dispatch(
									layoutSlice.actions.setOpenCreateCustomTripModal(false)
								)
							},
							back() {
								setOpenInfoPage(false)
							},
						})}
						title={
							selectGpsNodeIndex >= 0
								? t('insertAfterThisGPSNode', {
										ns: 'createCustomTripModal',
								  })
								: t('title', {
										ns: 'createCustomTripModal',
								  })
							// +  (customTripPoints.current.length
							// 		? ' [' + customTripPoints.current.length + ']'
							// 		: '')
						}
					>
						<div
							style={{
								margin: '0 10px 0 0',
								display: openInfoPage ? 'none' : '',
							}}
							slot='right'
						>
							<saki-row>
								<saki-button
									ref={bindEvent({
										tap: async () => {
											setShowTag(!showTag)

											await storage.global.set(
												'showcustomTripPositionsTag',
												!showTag
											)
										},
									})}
									type='CircleIconGrayHover'
								>
									<saki-icon
										color='#666'
										type={showTag ? 'EyeSlash' : 'Eye'}
									></saki-icon>
								</saki-button>
								<saki-button
									ref={bindEvent({
										tap: async () => {
											alert({
												title: t('clearLine', {
													ns: 'prompt',
												}),
												content: t('clearLineContent', {
													ns: 'prompt',
												}),
												cancelText: t('cancel', {
													ns: 'prompt',
												}),
												confirmText: t('clear', {
													ns: 'prompt',
												}),
												onCancel() {},
												async onConfirm() {
													console.log('polyline.current', polyline.current)

													clear()
												},
											}).open()
										},
									})}
									type='CircleIconGrayHover'
								>
									<saki-icon color='#666' type='ClearFill'></saki-icon>
								</saki-button>
								<saki-button
									ref={bindEvent({
										tap: async () => {
											setOpenInfoPage(true)
										},
									})}
									margin='0 0 0 2px'
									type='CircleIconGrayHover'
								>
									<saki-icon color='#666' type='Hook'></saki-icon>
								</saki-button>
							</saki-row>
						</div>
					</saki-modal-header>
				</div>
				<div className='cct-main'>
					<div
						id={'cct-map'}
						className={isRoadColorFade() ? 'roadColorFade' : ''}
					></div>

					<saki-transition
						class-name={'cct-info'}
						animation-duration='300'
						in={openInfoPage}
					>
						<div className='ctt-m-info'>
							<div className='info-main'>
								<div className='im-item'>
									<span>
										{t('tripInfo', {
											ns: 'createCustomTripModal',
										})}
									</span>
									<span>
										{Math.round(
											(customTripPoints.current[
												customTripPoints.current.length - 1
											]?.distance || 0) / 10
										) /
											100 +
											'km' +
											' / ' +
											t('gpsPoints', {
												ns: 'createCustomTripModal',
												length: customTripPoints.current.length,
											})}
									</span>
								</div>
								<div className='im-item'>
									<span>
										{t('currentType', {
											ns: 'tripPage',
										})}
									</span>

									<saki-dropdown
										visible={openEditTypeDropdown}
										floating-direction='Left'
										z-index={1100}
										ref={bindEvent({
											close: (e) => {
												setOpenEditTypeDropdown(false)
											},
										})}
									>
										<saki-button
											ref={bindEvent({
												tap: () => {
													console.log(1)
													setOpenEditTypeDropdown(true)
												},
											})}
											padding='6px 8px'
											border='none'
											type='Normal'
										>
											<span>
												{t(type?.toLowerCase() || 'type', {
													ns: 'tripPage',
												})}
											</span>
											<saki-icon
												width='12px'
												height='12px'
												color='#999'
												margin='2px 0 0 6px'
												type='Bottom'
											></saki-icon>
										</saki-button>
										<div slot='main'>
											<saki-menu
												ref={bindEvent({
													selectvalue: async (e) => {
														setType(e.detail.value)
														setOpenEditTypeDropdown(false)
													},
												})}
											>
												{config.tripTypes.map((v, i) => {
													return (
														<saki-menu-item
															width='150px'
															padding='10px 18px'
															value={v}
															key={i}
														>
															<span>
																{t((v || '')?.toLowerCase(), {
																	ns: 'tripPage',
																})}
															</span>
														</saki-menu-item>
													)
												})}
											</saki-menu>
										</div>
									</saki-dropdown>
								</div>
								<div className='im-item'>
									<span>
										{t('startDate', {
											ns: 'trackRoutePage',
										})}
									</span>
									<div className='ftd-l-date'>
										<div className='ftd-l-d-content'>
											<saki-input
												ref={bindEvent({
													changevalue: (e: any) => {
														// console.log("Dom发生了变化", e)
														console.log(
															e,
															moment(e.detail.date).format(
																'YYYY-MM-DD HH:mm:ss'
															)
														)
														if (!e.detail) {
															setStartDate?.('')
															return
														}
														setStartDate?.(
															moment(e.detail).format('YYYY-MM-DD HH:mm:ss')
														)
													},
													focusfunc: () => {
														console.log('focus')
														setOpenStartDateDatePicker(true)
													},
												})}
												width='160px'
												padding='10px 4px'
												value={
													startDate
														? moment(startDate).format('YYYY-MM-DD HH:mm:ss')
														: ''
												}
												border-radius='6px'
												font-size='14px'
												margin='0 0'
												placeholder={t('startDate', {
													ns: 'trackRoutePage',
												})}
												color='#999'
												border='1px solid #eee'
												text-align='center'
											></saki-input>
										</div>
										<saki-date-picker
											ref={bindEvent({
												close: () => {
													setOpenStartDateDatePicker(false)
												},
												selectdate: (e) => {
													// console.log("Dom发生了变化`1111111", e)
													setOpenStartDateDatePicker(false)

													if (!e.detail.date) {
														setStartDate?.('')
														return
													}
													setStartDate?.(
														moment(e.detail.date).format('YYYY-MM-DD HH:mm:ss')
													)
												},
											})}
											date={startDate}
											visible={openStartDateDatePicker}
											cancel-button
											time-picker
											mask
											z-index={1300}
										></saki-date-picker>
									</div>
								</div>
								<div className='im-item'>
									<span>
										{t('endDate', {
											ns: 'trackRoutePage',
										})}
									</span>
									<div className='ftd-l-date'>
										<div className='ftd-l-d-content'>
											<saki-input
												ref={bindEvent({
													changevalue: (e: any) => {
														console.log(
															e,
															moment(e.detail).format('YYYY-MM-DD HH:mm:ss')
														)
														if (!e.detail) {
															setEndDate?.('')
															return
														}
														setEndDate?.(
															moment(e.detail).format('YYYY-MM-DD HH:mm:ss')
														)
													},
													focusfunc: () => {
														console.log('focus')
														setOpenEndDateDatePicker(true)
													},
												})}
												width='160px'
												padding='10px 4px'
												value={
													endDate
														? moment(endDate).format('YYYY-MM-DD HH:mm:ss')
														: ''
												}
												border-radius='6px'
												font-size='14px'
												margin='0 0'
												placeholder={t('endDate', {
													ns: 'trackRoutePage',
												})}
												color='#999'
												border='1px solid #eee'
												text-align='center'
											></saki-input>
										</div>
										<saki-date-picker
											ref={bindEvent({
												close: () => {
													setOpenEndDateDatePicker(false)
												},
												selectdate: (e) => {
													setOpenEndDateDatePicker(false)
													if (!e.detail.date) {
														setEndDate?.('')
														return
													}
													setEndDate?.(
														moment(e.detail.date).format('YYYY-MM-DD HH:mm:ss')
													)
												},
											})}
											date={endDate}
											visible={openEndDateDatePicker}
											cancel-button
											time-picker
											mask
											z-index={1300}
										></saki-date-picker>
									</div>
								</div>
								<div className='im-item im-buttons'>
									<div className='im-buttons'>
										<saki-button
											ref={bindEvent({
												tap: () => {
													saveTrip()
												},
											})}
											padding='8px 30px'
											type='Primary'
											loading={loading}
											disabled={!type || !startDate || !endDate}
										>
											{t('save', {
												ns: 'common',
											})}
										</saki-button>
									</div>
								</div>
							</div>
						</div>
					</saki-transition>
				</div>
			</div>
		</saki-modal>
	)
}

export default CreateCustomTripComponent
