import React, { memo, use, useEffect, useRef, useState } from 'react'

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
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent, progressBar } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { Chart } from 'chart.js/auto'
import {
	formatAvgPace,
	formatDistance,
	formatPositionsStr,
	formatTime,
	getDistance,
	getLatLng,
	getSpeedColor,
	getZoom,
	isResumeTrip,
	isRoadColorFade,
	roadColorFade,
	// testGpsData,
} from '../plugins/methods'
import Leaflet from 'leaflet'
import html2canvas from 'html2canvas'
import { cnMap, eventListener, maps, osmMap } from '../store/config'
import NoSSR from './NoSSR'
import { useRouter } from 'next/router'
import { Debounce, deepCopy } from '@nyanyajs/utils'
import { VehicleLogo } from './Vehicle'
import { createMaxSpeedMarker } from '../store/position'
import { initTripCity } from '../store/trip'

// memo()
const VisitedCitiesModal = memo(() => {
	// console.log('TripItemComponent', tripId)
	const { t, i18n } = useTranslation('visitedCitiesModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)
	const geo = useSelector((state: RootState) => state.geo)
	const vehicle = useSelector((state: RootState) => state.vehicle)
	const trip = useSelector((state: RootState) => state.trip.detailPage.trip)
	const citiesTimeline = useSelector((state: RootState) => {
		const trip = state.trip.detailPage.trip

		const citiles = trip?.cities?.reduce(
			(val, cv) => {
				val = val.concat(
					cv?.entryTimes?.map((v) => {
						return {
							entryTime: Number(v.timestamp),
							city: cv.city || '',
						}
					}) || []
				)
				return val
			},
			[] as {
				entryTime: number
				city: string
			}[]
		)
		citiles?.sort((a, b) => a.entryTime - b.entryTime)
		return citiles
	})

	const speedChart = useRef<Chart<'line', any[], unknown>>()
	const map = useRef<Leaflet.Map>()
	const getTripDebounce = useRef(new Debounce())
	const outSpeedLineChartDebounce = useRef(new Debounce())
	const loadedMap = useRef(false)
	const layer = useRef<any>()
	const maxSpeedMarker = useRef<Leaflet.Marker<any>>()

	const router = useRouter()

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [closeIcon, setCloseIcon] = useState(true)
	const [showItemPage, setShowItemPage] = useState(false)
	const [startScroll, setStartScroll] = useState(false)
	const [mounted, setMounted] = useState(false)

	const [currentMapUrl, setCurrentMapUrl] = useState('')
	const [openMoreDropDownMenu, setOpenMoreDropDownMenu] = useState(false)

	const [shareImageDataBase, setShareImageDataBase] = useState<string>('')
	const [generatingSharedData, setGeneratingSharedData] = useState(false)

	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)
	// const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

	useEffect(() => {
		setMounted(true)

		const refreshMapSizeDebounce = new Debounce()
		window.addEventListener('resize', () => {
			refreshMapSizeDebounce.increase(() => {
				map.current?.invalidateSize(true)
			}, 400)
		})

		// eventListener.on('editTrip', (v) => {
		// 	console.log(v, trip)
		// 	if (trip?.id === v.id) {
		// 		const obj: any = {}

		// 		v.type && (obj['type'] = v.type)

		// 		console.log(obj, {
		// 			...trip,
		// 			...obj,
		// 		})
		// 		setTrip({
		// 			...trip,
		// 			...obj,
		// 		})
		// 	}
		// })
	}, [])
	// useEffect(() => {
	// 	if (tripId) {
	// 		getTrip()
	// 	} else {
	// 		setTrip(undefined)
	// 	}
	// }, [tripId])

	useEffect(() => {
		dispatch(tripSlice.actions.setTripForDetailPage(undefined))

		map.current?.remove()
		map.current = undefined
		loadedMap.current = false
		setShareImageDataBase('')

		// setTrip(undefined)
	}, [user.isLogin])

	useEffect(() => {
		layer.current?.setGrayscale?.(config.configure.baseMap?.mapMode === 'Gray')
		layer.current?.setDarkscale?.(config.configure.baseMap?.mapMode === 'Dark')
		layer.current?.setBlackscale?.(
			config.configure.baseMap?.mapMode === 'Black'
		)
	}, [config.configure.baseMap?.mapMode])

	useEffect(() => {
		// console.log('initMap config.mapUrl', trip?.id, loadedMap.current)
		if (config.mapUrl && currentMapUrl && config.mapUrl !== currentMapUrl) {
			loadedMap.current = false
			initMap()
		}
	}, [config.mapUrl, config.configure.roadColorFade])

	const initMap = () => {
		const L: typeof Leaflet = (window as any).L

		console.log('---initMap---', loadedMap.current, trip?.id)

		if (L && !loadedMap.current && trip?.id) {
			loadedMap.current = true
			console.log(
				'---initMap--- 里面',
				document.querySelector('#tic-map'),
				map.current,
				loadedMap.current
			)
			if (map.current) {
				map.current?.off()
				map.current?.remove()
				map.current = undefined

				maxSpeedMarker.current?.remove()
				maxSpeedMarker.current = undefined
			}
			if (!map.current) {
				map.current = L.map('tic-map', {
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
			}

			console.log(geo.position)
			let lat = geo.position?.coords?.latitude || 0
			let lon = geo.position?.coords?.longitude || 0
			let zoom = 13

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
				zoom = getZoom(
					startPosition.latitude || 0,
					startPosition.longitude || 0,
					lat,
					lon
				)
			}

			const latlng = getLatLng(config.mapUrl, lat, lon)

			console.log('latlng', latlng, [lat, lon])
			lat = latlng[0]
			lon = latlng[1]

			if (map.current) {
				// 检测地址如果在中国就用高德地图

				// console.log('config.mapUrl v?.url', config.mapUrl)
				map.current.setView(
					[lat, lon],
					// [
					//   120.3814, -1.09],
					zoom
				)

				setCurrentMapUrl(config.mapUrl)
				layer.current = (L.tileLayer as any)
					.colorScale(
						config.mapUrl,
						// maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url ||
						// 	config.mapUrl,
						{
							// errorTileUrl: osmMap,
							maxZoom: 18,
							// attribution: `&copy;`,
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

				map.current.panTo([lat, lon], {
					animate: false,
				})
				if (trip?.positions) {
					console.time('getLatLnggetLatLng')

					// testGpsData
					// .map((v) => {
					// 	return {
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
					// })

					const latLngs: number[][] = []
					const colors: string[] = []

					let maxSpeedPosition = positions[0]

					positions
						.filter((v) => {
							return !(Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0)
						})
						?.forEach((v, i, arr) => {
							// if (i > arr.length - 2554) {
							// 	return
							// }
							// console.log(
							// 	'v.latitude',
							// 	v.latitude,
							// 	positions[0].latitude,
							// 	i,
							// 	arr.length - 10,
							// 	i < arr.length - 10
							// )

							// const lv = positions[i - 1]

							// console.log(
							// 	i,
							// 	getLatLng(lv.latitude || 0, lv.longitude || 0) as any,
							// 	getLatLng(v.latitude || 0, v.longitude || 0) as any
							// )

							maxSpeedPosition =
								Number(maxSpeedPosition.speed) < Number(v.speed)
									? v
									: maxSpeedPosition

							const speedColorLimit = (config.configure.speedColorLimit as any)[
								(trip?.type?.toLowerCase() || 'running') as any
							]

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
							// map.current &&
							// 	L.polyline(
							// 		[
							// 			getLatLng(lv.latitude || 0, lv.longitude || 0) as any,
							// 			getLatLng(v.latitude || 0, v.longitude || 0) as any,
							// 		],
							// 		{
							// 			// smoothFactor:10,
							// 			// snakingSpeed: 200,
							// 			color: getSpeedColor(
							// 				v.speed || 0,
							// 				speedColorLimit.minSpeed,
							// 				speedColorLimit.maxSpeed
							// 			), //线的颜色
							// 			weight: config.mapPolyline.realtimeTravelTrackWidth,
							// 			// weight: config.mapPolyline.historyTravelTrackWidth,
							// 			// opacity: 0.3,
							// 		}
							// 	).addTo(map.current)
						})

					// console.log('LLLL', L)
					const polycolor = (L as any)
						.polycolor(latLngs, {
							colors: colors,
							useGradient: true,
							weight: config.configure.polylineWidth?.ongoingTrip,
						})
						.addTo(map.current)
					console.log('fTripPositions polyline', polycolor?.addTo, map.current)
					// console.log('LLLLplayline', playline)
					// console.log('LLLLplayline', playline, playline.setLatLngs(latLngs))

					// console.log('config.mapPolyline.width', config.mapPolyline.width)

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

					if (maxSpeedPosition) {
						maxSpeedMarker.current = createMaxSpeedMarker(
							map.current,
							maxSpeedPosition?.speed || 0,
							getLatLng(
								config.mapUrl,
								maxSpeedPosition.latitude || 0,
								maxSpeedPosition.longitude || 0
							)
						)
					}
					console.timeEnd('getLatLnggetLatLng')
				}
			}
			// L.marker([lat, lon]).addTo(m).openPopup()

			// setTimeout(() => {
			// 	outShareImage()
			// }, 1000)
			// console.log('connectionOSM', connectionOSM)

			// console.log('map', map)
		}

		// setTimeout(() => {
		//   outShareImage()
		// }, 500);
	}

	return (
		<saki-modal
			ref={bindEvent({
				close() {
					dispatch(layoutSlice.actions.setOpenVisitedCitiesModal(false))
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
			visible={layout.openVisitedCitiesModal}
		>
			<div className='visited-cities-modal'>
				{trip?.id ? (
					<>
						<div className='ti-map-wrap'>
							<div
								id={'vc-map'}
								className={isRoadColorFade() ? 'roadColorFade' : ''}
							></div>
							<div className='ti-replay'>
								<saki-button
									ref={bindEvent({
										tap: () => {
											// dispatch(
											// 	tripSlice.actions.setReplayTripId({
											// 		id: trip?.id || '',
											// 		shareKey,
											// 	})
											// )
											dispatch(layoutSlice.actions.setOpenVisitedCitiesModal(true))
										},
									})}
									width='50px'
									height='50px'
									margin='0px'
									bg-color='rgba(0,0,0,0.3)'
									bg-hover-color='rgba(0,0,0,0.4)'
									bg-active-color='rgba(0,0,0,0.5)'
									type='CircleIconGrayHover'
								>
									<saki-icon
										width='24px'
										height='24px'
										color='#fff'
										type={'Play'}
									></saki-icon>
								</saki-button>
							</div>
						</div>

						<saki-scroll-view
							ref={bindEvent({
								distancetoborder: (e) => {
									// console.log(e.detail.top>0)

									setStartScroll(e.detail.top !== 0)
								},
							})}
							mode='Auto'
							scroll-bar='Hidden'
						>
							<div className={'ti-main ' + (startScroll ? 'startScroll' : '')}>
								<div className='ti-m-content'>
									<div className='ti-m-c-header'>
										<div className='ti-title'>
											{t((trip?.type || '')?.toLowerCase(), {
												ns: 'tripPage',
											})}
											{' · '}
											{moment(Number(trip?.createTime) * 1000).format(
												'YYYY-MM-DD HH:mm:ss'
											)}

											{!trip?.authorId
												? ' · ' +
												  t('local', {
														ns: 'tripPage',
												  })
												: ''}

											{trip.permissions?.customTrip
												? ' · ' +
												  t('customTrip', {
														ns: 'tripPage',
												  })
												: ''}

											{/* {' · ' +
												(!trip?.permissions?.shareKey
													? t('enableShare', {
															ns: 'prompt',
													  })
													: t('disableShare', {
															ns: 'prompt',
													  }))} */}
										</div>
										<div className='ti-more'>
											<saki-dropdown
												visible={openMoreDropDownMenu}
												floating-direction='Left'
												z-index='1099'
												ref={bindEvent({
													close: (e) => {
														setOpenMoreDropDownMenu(false)
													},
												})}
											>
												<saki-button
													ref={bindEvent({
														tap: () => {
															setOpenMoreDropDownMenu(!openMoreDropDownMenu)
														},
													})}
													type='CircleIconGrayHover'
												>
													<saki-icon color='#999' type='More'></saki-icon>
												</saki-button>

												<div slot='main'>
													<saki-menu
														ref={bindEvent({
															selectvalue: async (e) => {
																console.log(e.detail.value)
																switch (e.detail.value) {
																	case 'Edit':
																		trip &&
																			dispatch(
																				layoutSlice.actions.setEditTripModal({
																					visible: true,
																					trip: trip,
																				})
																			)
																		break
																	// case 'Replay':
																	// 	dispatch(
																	// 		tripSlice.actions.setReplayTripId({
																	// 			id: trip?.id || '',
																	// 			shareKey,
																	// 		})
																	// 	)
																	// 	dispatch(
																	// 		layoutSlice.actions.setOpenReplayTripModal(
																	// 			true
																	// 		)
																	// 	)
																	// 	break

																	default:
																		break
																}
																setOpenMoreDropDownMenu(false)
															},
														})}
													>
														{isResumeTrip(trip) ? (
															<>
																<saki-menu-item
																	padding='10px 18px'
																	value={'ResumeTrip'}
																>
																	<div className='tb-h-r-user-item'>
																		<span>
																			{t('resumeTrip', {
																				ns: 'tripPage',
																			})}
																		</span>
																	</div>
																</saki-menu-item>
															</>
														) : (
															''
														)}
														<>
															<saki-menu-item
																padding='10px 18px'
																value={'initTripCity'}
															>
																<div className='tb-h-r-user-item'>
																	<span>
																		{t('initTripCity', {
																			ns: 'tripPage',
																		})}
																	</span>
																</div>
															</saki-menu-item>
														</>
														{trip?.status === 1 ? (
															<>
																<saki-menu-item
																	padding='10px 18px'
																	value={'Edit'}
																>
																	<div className='tb-h -r-user-item'>
																		<span>
																			{t('edit', {
																				ns: 'common',
																			})}
																		</span>
																	</div>
																</saki-menu-item>
																{trip?.vehicle?.id ? (
																	<saki-menu-item
																		padding='10px 18px'
																		value={'CancelVehicle'}
																	>
																		<div className='tb-h -r-user-item'>
																			<span>
																				{t('cancelVehicle', {
																					ns: 'vehicleModal',
																				})}
																			</span>
																		</div>
																	</saki-menu-item>
																) : (
																	''
																)}
																{/* <saki-menu-item
																	padding='10px 18px'
																	value={'Replay'}
																>
																	<div className='tb-h -r-user-item'>
																		<span>
																			{t('replay', {
																				ns: 'common',
																			})}
																		</span>
																	</div>
																</saki-menu-item> */}
																{/* {trip?.statistics?.distance !==
																	trip?.positions?.[trip?.positions.length - 1]
																		?.distance || 0 ? (
																	<saki-menu-item
																		padding='10px 18px'
																		value={'CorrectedData'}
																	>
																		<div className='tb-h-r-user-item'>
																			<span>
																				{t('correctedData', {
																					ns: 'tripPage',
																				})}
																			</span>
																		</div>
																	</saki-menu-item>
																) : (
																	''
																)} */}
																{user.isLogin ? (
																	<saki-menu-item
																		padding='10px 18px'
																		value={'Share'}
																	>
																		<div className='tb-h-r-user-item'>
																			<span>
																				{!trip?.permissions?.shareKey
																					? t('share', {
																							ns: 'prompt',
																					  })
																					: t('unshare', {
																							ns: 'prompt',
																					  })}
																			</span>
																		</div>
																	</saki-menu-item>
																) : (
																	''
																)}
															</>
														) : trip?.status !== 1 || !trip?.status ? (
															<>
																<saki-menu-item
																	padding='10px 18px'
																	value={'FinishTrip'}
																>
																	<div className='tb-h-r-user-item'>
																		<span>
																			{t('finishTrip', {
																				ns: 'tripPage',
																			})}
																		</span>
																	</div>
																</saki-menu-item>
															</>
														) : (
															''
														)}
														{!trip?.authorId && user.isLogin ? (
															<saki-menu-item
																padding='10px 18px'
																value={'AddTripToOnline'}
															>
																<div className='tb-h-r-user-item'>
																	<span>
																		{t('addTripToOnline', {
																			ns: 'tripPage',
																		})}
																	</span>
																</div>
															</saki-menu-item>
														) : (
															''
														)}
														<saki-menu-item
															padding='10px 18px'
															value={'Delete'}
														>
															<div className='tb-h-r-user-item'>
																<span>
																	{t('delete', {
																		ns: 'prompt',
																	})}
																</span>
															</div>
														</saki-menu-item>
													</saki-menu>
												</div>
											</saki-dropdown>
										</div>
									</div>
									<div className='ti-distance'>
										<div className='ti-d-left'>
											<div className='ti-d-value'>
												<span>
													{Math.round((trip?.statistics?.distance || 0) / 10) /
														100}
												</span>
											</div>
											<div className='ti-d-unit'>km</div>
										</div>
										<div className='ti-d-right'>
											<div className='ti-d-vehicle'>
												<saki-button
													border='none'
													bg-color='rgba(247,247,247,0)'
													padding='6px 10px'
													border-radius='10px'
													ref={bindEvent({
														tap: () => {
															if (!user.isLogin) {
																dispatch(methods.user.loginAlert())
																return
															}
															dispatch(
																layoutSlice.actions.setOpenVehicleModal(true)
															)
														},
													})}
												>
													<VehicleLogo
														icon={trip?.vehicle?.type || ''}
														style={{
															margin: '0 6px 0 0',
														}}
													></VehicleLogo>

													<span
														style={{
															color: '#666',
														}}
													>
														{trip?.vehicle?.name || ''}
													</span>
												</saki-button>
											</div>
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
													config.speedColorRGBs[
														config.speedColorRGBs.length - 1
													]
												})`,
											}}
											className='ti-c-line'
										></div>
										<div
											style={{
												color:
													config.speedColorRGBs[
														config.speedColorRGBs.length - 1
													],
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
													{(trip?.statistics?.maxSpeed || 0) <= 0
														? 0
														: Math.round(
																((trip?.statistics?.maxSpeed || 0) * 3600) / 100
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
													{Number(trip?.endTime || 0) > 0
														? formatTime(
																Number(trip?.startTime),
																Number(trip?.endTime)
														  )
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
													{(trip?.statistics?.maxAltitude || 0) <= 0
														? 0
														: Math.round(
																(trip?.statistics?.maxAltitude || 0) * 10
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
											{trip?.type === 'Walking' ||
											trip?.type === 'PowerWalking' ||
											trip?.type === 'Running' ? (
												<span className='ti-d-b-item'>
													<span>
														{t('averagePace', {
															ns: 'tripPage',
														}) + ' '}
													</span>
													<span>
														{formatAvgPace(
															trip?.statistics?.distance || 0,
															Number(trip?.startTime) || 0,
															Number(trip?.endTime) || 0
														)}
													</span>
												</span>
											) : (
												''
											)}

											<span className='ti-d-b-item'>
												<span>
													{t('averageSpeed', {
														ns: 'tripPage',
													}) + ' '}
												</span>
												<span>
													{Math.round(
														((trip?.statistics?.averageSpeed || 0) * 3600) / 100
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
														(((trip?.statistics?.maxAltitude || 0) -
															(trip?.statistics?.minAltitude || 0)) /
															2 +
															(trip?.statistics?.minAltitude || 0)) *
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
													{Math.round(
														(trip?.statistics?.minAltitude || 0) * 10
													) / 10}{' '}
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
														(trip?.statistics?.climbAltitude || 0) * 10
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
														(trip?.statistics?.descendAltitude || 0) * 10
													) / 10}{' '}
													m
												</span>
											</span>

											<span className='ti-d-b-item'>
												<span>
													{t('tripMark', {
														ns: 'tripPage',
													}) + ' '}
												</span>
												<span>{trip?.marks?.length}</span>
											</span>
										</div>
									</div>
									{/* {trip?.type === 'Running' ? (
  <div className='ti-pace'>
    <saki-title level='4' color='default'>
      配速
    </saki-title>
  </div>
) : (
  ''
)} */}

								
								</div>

								{trip?.marks?.length ? (
									<div className='ti-marks'>
										<div className='ti-m-title'>
											{t('tripMark', {
												ns: 'tripPage',
											})}
										</div>

										<div className='ti-m-list'>
											{trip?.marks?.map((v, i, arr) => {
												return (
													<div className='ti-m-l-item'>
														<div className='ti-m-l-i-index'>
															<span># {arr.length - i}</span>
														</div>
														<div className='ti-m-l-i-createtime text-elipsis'>
															{moment(Number(v.timestamp) * 1000).format(
																'YYYY-MM-DD HH:mm:ss'
															)}
														</div>
													</div>
												)
											})}
										</div>
									</div>
								) : (
									''
								)}

								{citiesTimeline?.length ? (
									<div className='ti-cities'>
										<div className='ti-m-title'>
											{t('tripCityTimeline', {
												ns: 'tripPage',
											})}
										</div>

										<div className='ti-m-list'>
											{citiesTimeline?.map((v, i, arr) => {
												return (
													<div key={i} className='ti-m-l-item'>
														<div className='ti-m-l-i-index'>
															<span># {v.city}</span>
														</div>
														<div className='ti-m-l-i-createtime text-elipsis'>
															{moment(Number(v.entryTime) * 1000).format(
																'YYYY.MM.DD HH:mm'
															)}
														</div>
													</div>
												)
											})}
										</div>
									</div>
								) : (
									''
								)}

								<div className='ti-buttons'>
									<saki-button
										ref={bindEvent({
											tap: () => {
												console.log('share')
												// node &&
												// 	domtoimage
												// 		.toPng(node)
												// 		.then((dataUrl) => {
												// 			var img = new Image()
												// 			img.src = dataUrl
												// 			document.body.appendChild(img)
												// 		})
												// 		.catch(function (error) {
												// 			console.error('oops, something went wrong!', error)
												// 		})
											},
										})}
										margin='0px 0 20px'
										width='200px'
										padding='10px 10px'
										type='Primary'
										loading={generatingSharedData}
									>
										{t('share', {
											ns: 'prompt',
										})}
									</saki-button>
								</div>
							</div>
						</saki-scroll-view>

						<NoSSR>
							<saki-modal
								ref={bindEvent({
									close() {
										setShareImageDataBase('')
									},
								})}
								width='100%'
								height='100%'
								max-width={config.deviceType === 'Mobile' ? '80%' : '480px'}
								max-height={config.deviceType === 'Mobile' ? '80%' : '580px'}
								mask
								border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
								border={config.deviceType === 'Mobile' ? 'none' : ''}
								mask-closable='false'
								background-color='rgba(0,0,0,0.3)'
								visible={!!shareImageDataBase}
								z-index={1010}
							>
								<div className={'ti-share-component ' + config.deviceType}>
									<div className='ts-main'>
										<div className='ts-m-cvs'>
											<img src={shareImageDataBase} alt='' />
										</div>
										<div className='ts-m-footer'>
											<div className='buttons-header'>
												<saki-modal-header
													border
													right-width={'56px'}
													close-icon={true}
													ref={bindEvent({
														close() {
															console.log('setShareImageDataBase')
															setShareImageDataBase('')
														},
													})}
													title={t('share', {
														ns: 'prompt',
													})}
												/>
											</div>
											<div className='buttons-main'>
												<saki-button
													ref={bindEvent({
														tap: () => {
															let link = document.createElement('a')
															link.download = trip?.id + '.png'
															link.href = shareImageDataBase
															link.click()
														},
													})}
													padding='10px 10px'
													border='none'
													// padding="2"
												>
													<div className='buttons-item'>
														<div className='bi-icon download'>
															<saki-icon
																color='#fff'
																type='Download'
															></saki-icon>
														</div>
														<span>
															{t('saveImage', {
																ns: 'prompt',
															})}
														</span>
													</div>
												</saki-button>
											</div>
										</div>
									</div>
								</div>
							</saki-modal>
						</NoSSR>
					</>
				) : (
					<span className='ti-loading'>
						{t('loadingData', {
							ns: 'prompt',
						})}
					</span>
				)}
			</div>
		</saki-modal>
	)
})

export default VisitedCitiesModal
