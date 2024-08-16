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
	// testGpsData,
} from '../plugins/methods'
import Leaflet from 'leaflet'
import html2canvas from 'html2canvas'
import {
	cnMap,
	eventListener,
	maps,
	osmMap,
	speedColorRGBs,
} from '../store/config'
import NoSSR from './NoSSR'
import { useRouter } from 'next/router'
import { Debounce } from '@nyanyajs/utils'

const TripItemComponent = memo(
	({
		tripId,
		shareKey,
		isShare,
		onBack,
		onDelete,
		onTrip,
	}: // trip,
	{
		isShare: boolean
		tripId: string
		shareKey: string
		onBack: () => void
		onDelete: (tripId: string) => void
		onTrip: (trip?: protoRoot.trip.ITrip) => void
	}) => {
		console.log('TripItemComponent', tripId)
		const { t, i18n } = useTranslation('tripItemPage')
		const layout = useSelector((state: RootState) => state.layout)
		const config = useSelector((state: RootState) => state.config)
		const user = useSelector((state: RootState) => state.user)
		const geo = useSelector((state: RootState) => state.geo)
		const trip = useSelector((state: RootState) => state.trip.detailPage.trip)

		const speedChart = useRef<Chart<'line', any[], unknown>>()
		const map = useRef<Leaflet.Map>()
		const getTripDebounce = useRef(new Debounce())
		const outSpeedLineChartDebounce = useRef(new Debounce())
		const loadedMap = useRef(false)
		const layer = useRef<any>()

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

		const [loadStatus, setLoadStatus] = useState<
			'loading' | 'loaded' | 'noMore'
		>('loaded')
		// const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

		useEffect(() => {
			setMounted(true)

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
			console.log(tripId, shareKey, user.isLogin)

			console.log('setTripForDetailPage', tripId, map.current)
			if (tripId) {
				if (tripId.indexOf('IDB_') >= 0) {
					getTrip()
					return
				}
				if (!shareKey) {
					if (user.isLogin) {
						getTrip()
						return
					}
				} else {
					getTrip()
					return
				}
			}
			dispatch(tripSlice.actions.setTripForDetailPage(undefined))

			speedChart.current?.destroy()
			speedChart.current = undefined
			map.current?.remove()
			map.current = undefined
			loadedMap.current = false
			setShareImageDataBase('')
			// setTrip(undefined)
		}, [tripId, shareKey, user])

		useEffect(() => {
			isShare && map && outShareImage()
		}, [isShare, map])

		useEffect(() => {
			if (tripId && trip?.id && map.current && !speedChart.current) {
				outSpeedLineChart()
			}
		}, [trip?.id, map.current, speedChart.current])

		useEffect(() => {
			if (
				config.mapUrl &&
				config.country &&
				tripId &&
				trip?.id &&
				!loadedMap.current
			) {
				initMap()
			}
		}, [trip?.id, config.country, config.mapUrl])
		useEffect(() => {
			if (config.mapUrl && currentMapUrl && config.mapUrl !== currentMapUrl) {
				loadedMap.current = false
				initMap()
			}
		}, [config.mapUrl])

		useEffect(() => {
			layer.current?.setGrayscale?.(config.isGrayscale)
		}, [config.isGrayscale])

		const initMap = () => {
			const { config } = store.getState()

			console.log('---initMap---')
			const L: typeof Leaflet = (window as any).L
			if (L && !loadedMap.current) {
				console.log(geo.position)
				let lat = geo.position?.coords?.latitude || 0
				let lon = geo.position?.coords?.longitude || 0
				let zoom = 13

				// const positions = testGpsData
				// const positions =
				// 	testGpsData.filter((v) => {
				// 		const gss = !(
				// 			v.speed === null ||
				// 			v.altitude === null ||
				// 			v.accuracy === null ||
				// 			v.accuracy > 20
				// 		)
				// 		// console.log(v)

				// 		console.log('gss', gss)
				// 		return gss

				// 		return !(Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0)
				// 	}) || []
				let positions = trip?.positions || []

				positions = positions.filter((v, i) => {
					const gss = !(v.speed === null || v.altitude === null)

					if (v.speed && v.speed > 45) {
						console.log(v.speed, v.timestamp)
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
					map.current?.remove()
					map.current = undefined
				}
				if (!map.current && L?.map) {
					map.current = L.map('ti-map', {
						zoomControl: false,
						zoomSnap: 0.5,
						renderer: L.canvas(),
						attributionControl: false,
						// center: [Number(res?.data?.lat), Number(res?.data?.lon)],
					})
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
						.grayscale(
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
					layer.current.setGrayscale(config.isGrayscale)

					//定义一个地图缩放控件
					// var zoomControl = L.control.zoom({ position: 'topleft' })
					// //将地图缩放控件加载到地图
					// m.addControl(zoomControl)
					// m.removeControl(zoomControl)
				}
				if (map.current) {
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

						positions
							.filter((v) => {
								return !(
									Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0
								)
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

								const speedColorLimit =
									config.speedColorLimit[
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
										speedColorLimit.maxSpeed
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
								weight: config.mapPolyline.realtimeTravelTrackWidth,
							})
							.addTo(map.current)
						console.log(
							'fTripPositions polyline',
							polycolor?.addTo,
							map.current
						)
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
			loadedMap.current = true

			// setTimeout(() => {
			//   outShareImage()
			// }, 500);
		}

		const outSpeedLineChart = () => {
			try {
				// const startTime = Number(trip?.startTime)
				// const endTime = Number(trip?.endTime)
				// console.log(
				// 	'outSpeedLineChart',
				// 	startTime,
				// 	endTime,
				// 	endTime - startTime,
				// 	trip?.positions
				// )
				if (speedChart.current) return
				const el = document.getElementById('speed-chart')

				let labels: any[] = []
				let speedData: number[] = []
				let altitudeData: number[] = []

				trip?.positions?.forEach((v, i) => {
					// if (i > 10) return
					labels.push(Math.round((v.distance || 0) / 10) / 100 + 'km')
					speedData.push((v.speed || 0) < 0 ? 0 : (v.speed || 0) * 3.6)
					altitudeData.push(v.altitude || 0)
				})
				// console.log('labels', labels)
				// console.log('speedData', speedData)
				// console.log('altitudeData', altitudeData)
				const data = {
					labels: labels,
					datasets: [
						// {
						// 	label: 'Cubic interpolation (monotone)',
						// 	data: datapoints,
						// 	borderColor: 'rgb(75, 192, 192)',
						// 	fill: false,
						// 	cubicInterpolationMode: 'monotone',
						// 	tension: 0.4,
						// },
						{
							label:
								t('altitude', {
									ns: 'tripPage',
								}) + ' (m)',
							data: altitudeData,
							pointBorderWidth: 0,
							borderColor: speedColorRGBs[speedColorRGBs.length - 1],
							backgroundColor: speedColorRGBs[speedColorRGBs.length - 1],
							fill: false,
							cubicInterpolationMode: 'monotone',
							tension: 0.5,
							yAxisID: 'y1',
						},
						{
							label:
								t('speed', {
									ns: 'tripPage',
								}) + ' (km/h)',
							data: speedData,
							pointBorderWidth: 0,
							borderColor: speedColorRGBs[0],
							backgroundColor: speedColorRGBs[0],
							fill: true,
							cubicInterpolationMode: 'monotone',
							tension: 0.4,
							yAxisID: 'y',
						},
					],
				}

				if (el) {
					speedChart.current = new Chart(el as any, {
						type: 'line',
						data: data as any,

						options: {
							aspectRatio: 2,
							responsive: true,
							onResize(chart, size) {
								// console.log('onresize', chart, chart.aspectRatio, size)
								if (size.width <= 730) {
									chart.options.aspectRatio = 1.5
								} else {
									if (size.width <= 1024) {
										chart.options.aspectRatio = 2
									} else {
										chart.options.aspectRatio = 2.5
									}
								}
								chart.update()
							},
							plugins: {
								title: {
									display: true,
									text: '',
								},
							},
							interaction: {
								intersect: false,
							},
							scales: {
								// x: {
								// 	display: false,
								// 	title: {
								// 		display: true,
								// 	},
								// },
								y: {
									display: true,
									title: {
										display: true,
										text:
											t('speed', {
												ns: 'tripPage',
											}) + ' (km/h)',
									},
									// suggestedMin: -10,
									// suggestedMax: 200,
									grid: {
										color: speedColorRGBs[0],
										lineWidth: 1,
										drawOnChartArea: false, // only want the grid lines for one axis to show up
									},
								},
								y1: {
									// type: 'linear',
									display: true,
									position: 'right',
									title: {
										display: true,
										text:
											t('altitude', {
												ns: 'tripPage',
											}) + ' (m)',
									},

									// grid line settings
									grid: {
										color: speedColorRGBs[speedColorRGBs.length - 1],
										lineWidth: 1,
										drawOnChartArea: false, // only want the grid lines for one axis to show up
									},
								},
							},
						},
					})
				}
			} catch (error) {
				console.error(error)
			}
		}

		const outShareImage = async () => {
			setGeneratingSharedData(true)
			const pb = snackbar({
				message: t('generatingSharingContent', {
					ns: 'prompt',
				}),
				vertical: 'center',
				horizontal: 'center',
				padding: '14px 20px',
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
				closeIcon: true,
			})
			pb.open()
			setTimeout(async () => {
				// 生成地图图片
				let mapEl: any = document.querySelector('#ti-map')
				let contentEl: any = document.querySelector('.ti-m-content')

				if (mapEl && contentEl) {
					console.log('mapEl.scrollHeight', mapEl.offsetHeight)
					const mapCvs = await html2canvas(mapEl, {
						backgroundColor: 'white',
						useCORS: true,
						scale: 1,
						height: mapEl.offsetHeight,
						windowHeight: mapEl.offsetHeight,
					})

					// 生成内容图
					const contentCvs = await html2canvas(contentEl, {
						backgroundColor: 'white',
						useCORS: true,
						scale: 1,
						height: contentEl.scrollHeight,
						windowHeight: contentEl.scrollHeight,
					})

					// const mapPng = mapCvs.toDataURL('image/png', 1)
					// const contentPng = contentCvs.toDataURL('image/png', 1)

					//创建新的canvas并绘制两个图片数据
					var shareImageCvs = document.createElement('canvas')
					var ctx = shareImageCvs.getContext('2d')
					if (ctx) {
						shareImageCvs.width = Math.max(mapCvs.width, contentCvs.width)
						shareImageCvs.height = mapCvs.height + contentCvs.height
						// console.log(mapCvs.height, contentCvs.height)
						// console.log(shareImageCvs.width, shareImageCvs.height)
						ctx.drawImage(mapCvs, 0, 0)
						ctx.drawImage(contentCvs, 0, mapCvs.height)
					}
					//将新的canvas转换为图片数据并保存
					setShareImageDataBase(shareImageCvs.toDataURL('image/png', 1))
					setGeneratingSharedData(false)
					pb.close()
					// var finalDataURL = newCanvas.toDataURL('image/png')
					// var link = document.createElement('a')
					// link.download = 'merged.png'
					// link.href = finalDataURL
					// link.click()
					// document.body?.appendChild(mapCvs)
					// document.body?.appendChild(contentCvs)
				}
			}, 500)
		}

		const getTrip = async () => {
			getTripDebounce.current.increase(async () => {
				if (loadStatus === 'loading') return
				setLoadStatus('loading')

				console.log('getTrip', tripId)

				if (tripId.indexOf('IDB_') >= 0) {
					const v = await storage.trips.get(tripId)
					console.log('getTrip', v)
					if (v) {
						// setTrip(res?.data?.trip)
						if (v.statistics && v?.positions?.length) {
							v.statistics.minAltitude = Math.min(
								...(v.positions?.map((v) => v.altitude || 0) || [0])
							)
						}
						onTrip(v || undefined)
						setLoadStatus('noMore')
						dispatch(tripSlice.actions.setTripForDetailPage(v))
					}
					return
				}
				const res = await httpApi.v1.GetTrip({
					id: tripId,
					shareKey: shareKey,
				})
				console.log('getTrip', res.data)
				let tripPositions = await storage.tripPositions.get(tripId)

				console.log(
					'storage tripPositions',
					(tripPositions?.positions?.[0]?.split('_') || [])?.length <= 2,
					tripPositions,
					!tripPositions
				)
				if (
					// true ||
					!tripPositions ||
					(tripPositions?.positions?.[0]?.split('_') || [])?.length <= 2 ||
					!tripPositions?.status
				) {
					const posRes = await httpApi.v1.GetTripPositions({
						id: tripId,
						shareKey: shareKey,
					})
					console.log('GetTripPositions posRes', posRes)
					if (posRes.code === 200 && posRes.data?.tripPositions?.positions) {
						// res.data.trip &&
						// 	(res.data.trip.status =
						// 		Number(posRes.data?.tripPositions.status) || 0)
						tripPositions = posRes.data.tripPositions
						if (posRes.data?.tripPositions.status) {
							await storage.tripPositions.set(tripId, posRes.data.tripPositions)
						}
					}
				}

				console.log('GetTripPositions pospos', tripPositions)
				if (res.code === 200 && res?.data?.trip && tripPositions) {
					res.data.trip.positions = formatPositionsStr(
						Number(tripPositions.startTime),
						tripPositions.positions || []
					)
					console.log('pospos1', res.data.trip.positions)
					// if (pos) {
					// 	console.log('getTrip', pos[0].timestamp)
					// 	console.log('getTrip', pos[pos.length - 1].timestamp)
					// }
					// setTrip(res?.data?.trip)
					if (res.data.trip?.statistics) {
						res.data.trip.statistics.minAltitude = Math.min(
							...(res?.data?.trip?.positions?.map((v) => v.altitude || 0) || [
								0,
							])
						)

						// console.log(
						// 	'res.data.trip.statistics?.climbAltitude',
						// 	res.data.trip.statistics?.climbAltitude,
						// 	res.data.trip?.positions
						// )
						if (
							!res.data.trip.statistics?.climbAltitude ||
							!res.data.trip.statistics?.descendAltitude
						) {
							let climbAltitude = 0
							let descendAltitude = 0
							res.data.trip?.positions?.forEach((v, i) => {
								if (i === 0) return
								let lv = res.data.trip?.positions?.[i - 1]
								if (lv?.altitude && Number(v.altitude) > lv.altitude) {
									climbAltitude =
										Math.floor(
											(climbAltitude +
												(Number(v.altitude) - Number(lv.altitude))) *
												1000
										) / 1000
								}
								if (lv?.altitude && Number(v.altitude) < lv.altitude) {
									descendAltitude =
										Math.floor(
											(descendAltitude +
												(Number(lv.altitude) - Number(v.altitude))) *
												1000
										) / 1000
								}
							})

							res.data.trip.statistics.climbAltitude = climbAltitude
							res.data.trip.statistics.descendAltitude = descendAltitude
						}
					}

					dispatch(tripSlice.actions.setTripForDetailPage(res?.data?.trip))

					// dispatch(
					// 	layoutSlice.actions.setEditTripModal({
					// 		visible: true,
					// 		trip: res.data.trip,
					// 	})
					// )
				}
				onTrip(res?.data?.trip || undefined)
				setLoadStatus('noMore')
			}, 300)
		}

		const copyUrl = (shareKey: string) => {
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

			window.navigator.clipboard.writeText(
				location.origin +
					(config.language === 'system' ? '' : '/' + config.language) +
					'/trip/detail' +
					'?id=' +
					tripId +
					'&sk=' +
					(shareKey || '')
			)
		}

		const switchShareKey = async (copy: boolean) => {
			alert({
				title: !trip?.permissions?.shareKey
					? t('enableShare', {
							ns: 'prompt',
					  })
					: t('disableShare', {
							ns: 'prompt',
					  }),
				content: !trip?.permissions?.shareKey
					? t('enableShareContent', {
							ns: 'prompt',
					  })
					: t('disableShareContent', {
							ns: 'prompt',
					  }),
				cancelText: t('cancel', {
					ns: 'prompt',
				}),
				confirmText: !trip?.permissions?.shareKey
					? t('share', {
							ns: 'prompt',
					  })
					: t('unshare', {
							ns: 'prompt',
					  }),
				onCancel() {},
				async onConfirm() {
					// onDelete(tripId)
					// onBack()

					const res = await httpApi.v1.UpdateTrip({
						id: tripId,
						shareKey: !!trip?.permissions?.shareKey ? 'Delete' : 'Generate',
					})
					console.log('res', res, !!trip?.permissions?.shareKey)
					if (res.code === 200) {
						// if (trip?.permissions?.shareKey) {
						// }
						dispatch(
							tripSlice.actions.setTripForDetailPage({
								...trip,
								permissions: {
									...(trip?.permissions || {}),
									shareKey: res?.data?.shareKey || '',
								},
							})
						)

						snackbar({
							message: res?.data?.shareKey ? '分享成功！' : '已成功取消分享',
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
							autoHideDuration: 2000,
						}).open()
						if (res?.data?.shareKey && copy) {
							copyUrl(res?.data?.shareKey)
						}
						return
					}

					snackbar({
						message: res.msg,
						vertical: 'top',
						horizontal: 'center',
						autoHideDuration: 2000,
						closeIcon: true,
					}).open()
				},
			}).open()
		}

		const finishTrip = async (correctedData: boolean) => {
			if (!trip?.id) return

			// 需要获取trip
			// let endTime = 0
			// if (trip?.positions?.length && trip?.positions?.length >= 10) {
			// 	endTime =
			// 		Number(trip?.positions[trip?.positions.length - 1].timestamp) || 0
			// }
			// if ((trip?.statistics?.distance || tDistance || 0) < 50) {
			// 	deleteTrip()
			// 	return
			// }
			const params: protoRoot.trip.FinishTrip.IRequest = {
				id: trip?.id || '',
			}

			// if (Number(trip.endTime) < 1) {
			// 	params.endTime = endTime
			// }

			console.log('params', params, trip?.positions, trip)
			if (correctedData) {
				const res = await httpApi.v1.CorrectedTripData(params as any)
				console.log('FinishTrip', res)
				if (res.code === 200) {
					getTrip()
					return
				}

				snackbar({
					message: res.error || res.msg,
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
				}).open()
				return
			}

			const res = await httpApi.v1.FinishTrip(params)
			console.log('FinishTrip', res)
			if (res.code === 200) {
				if (res?.data?.deleted) {
					snackbar({
						message: '距离过短, 距离需过50m才会记录',
						autoHideDuration: 2000,
						vertical: 'top',
						horizontal: 'center',
					}).open()
					return
				}
				loadedMap.current = false
				getTrip()
				return
			}

			snackbar({
				message: res.error || res.msg,
				autoHideDuration: 2000,
				vertical: 'top',
				horizontal: 'center',
			}).open()
		}

		const deleteTrip = async () => {
			// onBack()

			alert({
				title: t('delete', {
					ns: 'prompt',
				}),
				content:
					(trip?.statistics?.distance || 0) < 50
						? t('deleteThisTrip50m', {
								ns: 'prompt',
						  })
						: t('deleteThisTrip', {
								ns: 'prompt',
						  }),
				cancelText: t('cancel', {
					ns: 'prompt',
				}),
				confirmText: t('delete', {
					ns: 'prompt',
				}),
				onCancel() {},
				async onConfirm() {
					// onDelete(tripId)
					if (!trip?.authorId) {
						storage.trips.delete(trip?.id || '')
						snackbar({
							message: '删除成功！',
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
							autoHideDuration: 2000,
						}).open()
						onDelete(tripId)
						return
					}
					const res = await httpApi.v1.DeleteTrip({
						id: tripId,
					})
					if (res.code === 200) {
						snackbar({
							message: '删除成功！',
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
							autoHideDuration: 2000,
						}).open()
						onDelete(tripId)
						return
					}

					snackbar({
						message: res.msg,
						vertical: 'top',
						horizontal: 'center',
						autoHideDuration: 2000,
						closeIcon: true,
					}).open()
				},
			}).open()
		}

		const addTripToOnline = async () => {
			console.log('AddTripToOnline')

			const params: protoRoot.trip.AddTripToOnline.IRequest = {
				type: trip?.type,
				positions: trip?.positions?.map((v): protoRoot.trip.ITripPosition => {
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
				marks: trip?.marks || [],
				createTime: trip?.createTime,
				startTime: trip?.startTime,
				endTime: trip?.endTime,
				// startTime: Math.floor(startTime / 1000),
			}
			console.log(params)
			const res = await httpApi.v1.AddTripToOnline(params)
			console.log('AddTripToOnline', res)
			if (res.code === 200 && res?.data?.trip) {
				const localTripId = trip?.id
				alert({
					title: t('delete', {
						ns: 'prompt',
					}),
					content: t('deleteLocalTrip', {
						ns: 'prompt',
					}),
					cancelText: t('cancel', {
						ns: 'prompt',
					}),
					confirmText: t('delete', {
						ns: 'prompt',
					}),
					onCancel() {},
					async onConfirm() {
						storage.trips.delete(localTripId || '')
						snackbar({
							message: t('deletedSuccessfully', {
								ns: 'prompt',
							}),
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
							autoHideDuration: 2000,
						}).open()
					},
				}).open()

				if (res.data.trip?.statistics) {
					res.data.trip.statistics.minAltitude = Math.min(
						...(res?.data?.trip?.positions?.map((v) => v.altitude || 0) || [0])
					)
				}
				console.log(res?.data?.trip)
				dispatch(tripSlice.actions.setTripForDetailPage(res?.data?.trip))
			}
		}

		return (
			<div className='trip-item-component'>
				{trip?.id ? (
					<>
						<div id='ti-map'></div>

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
											{t((trip.type || '')?.toLowerCase(), {
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
																	case 'Share':
																		console.log(trip)
																		switchShareKey(true)
																		break
																	case 'AddTripToOnline':
																		addTripToOnline()
																		break
																	case 'FinishTrip':
																		finishTrip(false)
																		break
																	case 'CorrectedData':
																		finishTrip(true)
																		break
																	case 'Edit':
																		dispatch(
																			layoutSlice.actions.setEditTripModal({
																				visible: true,
																				trip: trip,
																			})
																		)
																		break
																	case 'Delete':
																		deleteTrip()
																		break

																	default:
																		break
																}
																setOpenMoreDropDownMenu(false)
															},
														})}
													>
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
										<div className='ti-d-value'>
											<span>
												{Math.round((trip?.statistics?.distance || 0) / 10) /
													100}
											</span>
										</div>
										<div className='ti-d-unit'>km</div>
										{/* {trip?.statistics?.distance !==
											trip?.positions?.[trip?.positions.length - 1]?.distance ||
										0 ? (
										) : (
											''
										)} */}

										<span
											style={{
												display: 'none',
											}}
											className='ti-d-tip'
											data-old-distance={trip?.statistics?.distance}
											data-new-distance={
												trip?.positions?.[trip?.positions.length - 1]
													?.distance || 0
											}
										>
											{t('tripDataCanBeCorrected', {
												ns: 'tripPage',
											})}
										</span>
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
												background: `linear-gradient(45deg, ${
													speedColorRGBs[0]
												},${speedColorRGBs[speedColorRGBs.length - 1]})`,
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
													{Number(trip.endTime || 0) > 0
														? formatTime(
																Number(trip.startTime),
																Number(trip.endTime)
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
											{trip.type === 'Walking' ||
											trip.type === 'PowerWalking' ||
											trip.type === 'Running' ? (
												<span className='ti-d-b-item'>
													<span>
														{t('averagePace', {
															ns: 'tripPage',
														}) + ' '}
													</span>
													<span>
														{formatAvgPace(
															trip?.statistics?.distance || 0,
															Number(trip.startTime) || 0,
															Number(trip.endTime) || 0
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
												<span>{trip.marks?.length}</span>
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

									<canvas
										id='speed-chart'
										// width={
										// 	300
										// 	// config.deviceType === 'Mobile'
										// 	// 	? h * 1.5
										// 	// 	: config.deviceType === 'Pad'
										// 	// 	? h * 2
										// 	// 	: h * 2.5
										// 	// config.deviceType === 'Mobile'
										// 	// 	? 300
										// 	// 	: config.deviceType === 'Pad'
										// 	// 	? 400
										// 	// 	: 500
										// }
										// height='200'
									></canvas>
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

								<div className='ti-buttons'>
									<saki-button
										ref={bindEvent({
											tap: () => {
												outShareImage()
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
												{user.isLogin ? (
													<saki-button
														ref={bindEvent({
															tap: () => {
																if (trip?.permissions?.shareKey) {
																	copyUrl(trip?.permissions?.shareKey)
																	return
																}
																switchShareKey(true)
															},
														})}
														padding='10px 10px'
														border='none'
														// padding="2"
													>
														<div className='buttons-item'>
															<div className='bi-icon link'>
																<saki-icon color='#fff' type='Link'></saki-icon>
															</div>
															<span>
																{t('copyLink', {
																	ns: 'prompt',
																})}
															</span>
														</div>
													</saki-button>
												) : (
													''
												)}
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
		)
	}
)

export default TripItemComponent
