import React, {
	use,
	useCallback,
	useEffect,
	useMemo,
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

import { alert, snackbar, bindEvent, progressBar } from '@saki-ui/core'
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
import { eventListener, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
	createMyPositionMarker,
	createOtherPositionMarker,
} from '../store/position'
import {
	CityInfo,
	convertCityLevelToTypeString,
	createCityBoundaries,
	createCityMarker,
	deleteAllCityGeojsonMap,
	deleteAllCityMarker,
	deleteCityMarker,
	formartCities,
	GeoJSON,
	getAllCityAreas,
	getSimpleCityName,
	updateCityMarkers,
	watchCenterCity,
} from '../store/city'
import { createDistanceScaleControl } from '../plugins/map'
import { t } from 'i18next'
import NoSSR from './NoSSR'

const VisitedCitiesModal = () => {
	const { t, i18n } = useTranslation('visitedCitiesModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const geo = useSelector((state: RootState) => state.geo)
	const user = useSelector((state: RootState) => state.user)

	const { historicalStatistics } = useSelector((state: RootState) => {
		const { historicalStatistics } = state.trip
		return { historicalStatistics }
	})

	const dispatch = useDispatch<AppDispatch>()

	const loadedMap = useRef(false)
	const map = useRef<Leaflet.Map>()
	const layer = useRef<any>()
	const targetMarker = useRef<Leaflet.Marker<any>>()
	const marker = useRef<Leaflet.Marker<any>>()
	const polyline = useRef<Leaflet.Polyline<any>>()

	const [cityDistricts, setCityDistricts] = useState<{
		[type: string]: protoRoot.city.ICityItem[]
	}>({})

	const [cityBoundaries, setCityBoundaries] = useState<
		{
			cityId: string
			level: number
			geojson: GeoJSON
		}[]
	>([])

	const [showType, setShowType] = useState('region')

	const [timelineType, setTimelineType] = useState('country')

	const [startScroll, setStartScroll] = useState(false)

	const [openCityListType, setOpenCityListType] = useState('')
	const [area, setArea] = useState(0)

	const [selectCountry, setSelectCountry] = useState<protoRoot.city.ICityItem>()
	const [selectCity, setSelectCity] = useState<protoRoot.city.ICityItem>()

	useEffect(() => {
		if (layout.openVisitedCitiesModal) {
			loadData()
			return
		}
	}, [layout.openVisitedCitiesModal])

	useEffect(() => {
		if (layout.openVisitedCitiesModal && config.mapUrl) {
			loadedMap.current = false
			initMap()
			return
		}
		clearMap()
	}, [layout.openVisitedCitiesModal, config.mapUrl])

	useEffect(() => {
		if (cityBoundaries.length && loadedMap.current && map.current) {
			console.log('加载边界图', cityBoundaries)

			watchCenterCity(map.current, (ci) => {
				// console.log('center', ci, cityDistricts)
				const sCt = cityDistricts['country'].filter((v) => {
					return v.name?.zhCN === ci.country
				})?.[0]
				setSelectCountry(deepCopy(sCt))
				const sc = cityDistricts['region'].filter((v) => {
					return v.name?.zhCN === (ci.region || ci.state)
				})?.[0]

				sc && setSelectCity(sc)
			})

			let { minLat, minLng, maxLat, maxLng } = getBoundsFromGeoJSONs(
				cityBoundaries.map((v) => v.geojson)
			)
			let zoom = getZoom(minLat, minLng, maxLat, maxLng)

			deleteAllCityGeojsonMap('VisitedCitiesModal')

			cityBoundaries.forEach((v) => {
				map.current &&
					v.level > 1 &&
					createCityBoundaries({
						map: map.current,
						cityGeojson: v.geojson,
						style: {
							color: '#f29cb2', // 边界颜色
							weight: 2, // 边界粗细
							opacity: 0.65, // 透明度
							fillColor: '#f29cb2', // 填充颜色
							fillOpacity: 0.5, // 填充透明度
						},
						cityId: v.cityId,
						key: 'VisitedCitiesModal',
					})
			})
			if (map.current) {
				// let { minLat, minLng, maxLat, maxLng } = minMaxLatlng.current

				map.current.setView(
					[(maxLat + minLat) / 2, (maxLng + minLng) / 2],
					zoom
				)
			}
			const zoomFunc = (e: any) => {
				const cities: {
					[id: string]: protoRoot.city.ICityItem
				} = {}

				Object.keys(cityDistricts).forEach((k) => {
					cityDistricts[k].forEach((v) => {
						if (!cities[v.id || '']) {
							cities[v.id || ''] = v
						}
					})
				})
				const citiesArr = formartCities(
					Object.keys(cities)
						.map((v) => {
							return cities[v]
						})
						.filter((v) => Number(v.level) <= 4)
				)

				console.log('updateMarkers', e.target._zoom)
				if (map.current) {
					updateCityMarkers(map.current, citiesArr, e.target._zoom)
				}
				// map.current &&
				// 	createCityMarkers(
				// 		map.current,
				// 		citiesArr,
				// 		e.target._zoom,
				// 		'VisitedCities'
				// 	)
			}
			map.current?.on('moveend', zoomFunc)
			map.current?.on('zoomend', zoomFunc)
			zoomFunc({
				target: {
					_zoom: zoom,
				},
			})
			return () => {
				map.current?.off('moveend', zoomFunc)
				map.current?.off('zoomend', zoomFunc)
			}
		}
	}, [cityBoundaries, loadedMap.current])

	useEffect(() => {
		if (Object.keys(cityDistricts).length && layout.openVisitedCitiesModal) {
			const loadData = snackbar({
				message: i18n.t('loadData', {
					ns: 'prompt',
				}),
				vertical: 'center',
				horizontal: 'center',
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
			})
			loadData.open()
			loadCityBoundaries(cityDistricts[showType]).then(() => {
				loadData.close()
			})
		}
	}, [showType])

	const createCityMarkers = (
		map: Leaflet.Map,
		cities: CityInfo[],
		zoom: number,
		key = 'tripItem'
	) => {
		console.log('citymarker', cityDistricts, cities, zoom)
		// console.log('citymarker', map.getBounds())
		if (!cities.length) return

		const bound = map.getBounds()

		let level = 1

		if (zoom >= 4) {
			level = 1
		}
		if (zoom >= 4.5) {
			level = 2
		}
		if (zoom >= 6) {
			level = 3
		}
		if (zoom >= 8) {
			level = 4
		}
		if (zoom >= 10) {
			level = 5
		}

		const tempCities = cities.reduce(
			(_cities, v) => {
				_cities[v.id] = v
				return _cities
			},
			{} as {
				[id: string]: CityInfo
			}
		)

		Object.keys(tempCities).forEach((cityId) => {
			const city = tempCities[cityId]

			if (
				Number(city.level) > level ||
				(level !== 1 && Number(city.level) === 1)
			) {
				deleteCityMarker(cityId, key)
				return
			}
			if (!bound.contains([Number(city.lat), Number(city.lng)])) {
				deleteCityMarker(cityId, key)
				return
			}
			// console.log('citymarker 进入范围', city)

			createCityMarker(
				map,
				city.name || '',
				[Number(city.lat), Number(city.lng)],
				Number(city.level),
				cityId,
				key
			)
		})
	}

	const getBoundsFromGeoJSONs = (geojsons: any[]) => {
		let minLat = Infinity
		let minLng = Infinity
		let maxLat = -Infinity
		let maxLng = -Infinity

		// 辅助函数：更新边界
		function updateBounds(lng: number, lat: number): void {
			if (lat < minLat) minLat = lat
			if (lat > maxLat) maxLat = lat
			if (lng < minLng) minLng = lng
			if (lng > maxLng) maxLng = lng
		}

		// 辅助函数：递归遍历坐标
		function traverseCoordinates(coords: any): void {
			if (Array.isArray(coords)) {
				if (typeof coords[0] === 'number') {
					// 处理单个坐标点 [lng, lat]
					const [lng, lat] = coords as [number, number]
					updateBounds(lng, lat)
				} else {
					// 处理嵌套数组
					for (const subCoords of coords) {
						traverseCoordinates(subCoords)
					}
				}
			}
		}

		// 遍历 GeoJSON 数组
		for (const geojson of geojsons) {
			if (geojson.type === 'Point') {
				// Point 的 coordinates 是 [lng, lat]
				const [lng, lat] = geojson.coordinates as [number, number]
				updateBounds(lng, lat)
			} else if (
				geojson.type === 'Polygon' ||
				geojson.type === 'MultiPolygon'
			) {
				// Polygon 和 MultiPolygon 的 coordinates 是嵌套数组
				traverseCoordinates(geojson.coordinates)
			}
		}

		return { minLat, minLng, maxLat, maxLng }
	}

	const loadCityBoundaries = async (
		tCityDistricts: protoRoot.city.ICityItem[]
	) => {
		const cities = tCityDistricts

		console.log('citiescities', cityDistricts, cities)
		const citiesNames = cities.reduce(
			(tv, cv) => {
				if (
					tv.filter((sv) => {
						return sv.cityId === cv.id
					})?.length === 0
				) {
					const lat = cv.coords?.latitude || 0
					const lng = cv.coords?.longitude || 0

					tv.push({
						cityId: cv.id || '',
						level: cv.level || 0,
						name: cv.fullName || '',
					})
				}

				return tv
			},
			[] as {
				cityId: string
				level: number
				name: string
			}[]
		)

		console.log('loadCityBoundaries', tCityDistricts, map.current, citiesNames)

		if (!cities?.length) {
			return
		}

		const cityBoundaries = await dispatch(
			methods.city.GetCityBoundaries({
				cities: citiesNames,
			})
		).unwrap()
		console.log('gcv GetCityBoundaries', cityBoundaries)

		setCityBoundaries(cityBoundaries)
	}

	const loadData = async () => {
		const loadData = snackbar({
			message: i18n.t('loadData', {
				ns: 'prompt',
			}),
			vertical: 'center',
			horizontal: 'center',
			backgroundColor: 'var(--saki-default-color)',
			color: '#fff',
		})

		loadData.open()
		const res = await httpApi.v1.GetAllCitiesVisitedByUser({})

		console.log('gcv', res)
		if (res.code === 200) {
			const tempCityDistricts: typeof cityDistricts = {
				country: [],
				state: [],
				region: [],
				city: [],
				town: [],
			}

			const formatCityDistricts = (
				cities: protoRoot.city.ICityItem[],
				parentCity?: protoRoot.city.ICityItem
			) => {
				cities?.forEach((v) => {
					// if (String(v?.name) === '贵阳市' && v.coords) {
					// 	v.coords.latitude = 26.5878031
					// 	v.coords.longitude = 106.7086936
					// }

					v.fullName =
						(parentCity?.fullName ? parentCity?.fullName + ',' : '') +
						v.name?.zhCN
					if (v.level === 2) {
						if (v.cities?.[0]?.level === 4) {
							tempCityDistricts['region'].push(v)
						}
					}
					tempCityDistricts[convertCityLevelToTypeString(Number(v.level))].push(
						v
					)
					v.cities?.length && formatCityDistricts(v.cities || [], v)
				})
			}

			formatCityDistricts(res.data?.cities || [])
			console.log('gcv', tempCityDistricts)
			setCityDistricts(tempCityDistricts)

			Object.keys(tempCityDistricts).length &&
				(await loadCityBoundaries(tempCityDistricts[showType]))
		}

		await dispatch(methods.trip.GetTripHistoricalStatistics({ type: 'All' }))

		loadData.close()
	}

	const clearMap = () => {
		console.log('clearMap')
		loadedMap.current = false
		map.current?.remove()
		map.current = undefined
		marker.current?.remove()
		marker.current = undefined
		targetMarker.current?.remove()
		targetMarker.current = undefined

		deleteAllCityGeojsonMap('VisitedCitiesModal')
	}

	const initMap = () => {
		const L: typeof Leaflet = (window as any).L

		const myPositionGPS = getLatLng(
			config.mapUrl,
			geo.position.coords.latitude || 0,
			geo.position.coords.longitude || 0
		)
		const zoom = 12

		const [lat, lon] = [myPositionGPS[0], myPositionGPS[1]]

		if (L && !loadedMap.current) {
			if (map.current) {
				clearMap()
			}
			if (!map.current) {
				map.current = L.map('visited-cities-map', {
					renderer: L.canvas(),
					preferCanvas: true,
					zoomControl: false,
					minZoom: 3,
					maxZoom: 18,
					trackResize: false,
					zoomSnap: 0.5,

					attributionControl: false,
				})

				eventListener.on('resize_vcm', () => {
					map.current?.invalidateSize(true)
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

				createDistanceScaleControl(
					map.current,
					config.deviceType === 'Mobile' ? 80 : 100,
					{
						position: 'bottomleft',
						y: '5px',
					}
				)

				isRoadColorFade() && roadColorFade(layer.current)
			}

			loadedMap.current = true
		}

		if (map.current && L) {
		}
	}

	const getTabTitle = (type: string) => {
		console.log('selectCity', selectCity)
		return type === 'world'
			? t('visitedWorldTitle')
			: type === 'region'
			? t('journeyedCountryTitle', {
					country: selectCountry?.name?.zhCN,
			  })
			: t('exploredCityTitle', {
					city: selectCity?.fullName?.split(',').join(''),
			  })
	}

	let cityCount = 0
	let townCount = 0
	selectCity?.id &&
		cityDistricts['city']?.forEach((v) => {
			if (v.parentCityId === selectCity?.id) {
				cityCount += 1

				cityDistricts['town'].forEach((sv) => {
					if (sv.parentCityId === v.id) {
						townCount += 1
					}
				})
			}
		})

	useEffect(() => {
		const init = async () => {
			const cities: {
				cityId: string
				level: number
				name: string
			}[] = []
			switch (timelineType) {
				case 'region':
					cityDistricts['region'].forEach((v) => {
						cities.push({
							cityId: v.id || '',
							level: v.level || 0,
							name: v.fullName || '',
						})
					})
					break
				case 'town':
					// cityDistricts['city']?.forEach((v) => {
					// 	if (v.parentCityId === selectCity?.id) {
					// 		console.log('cccccc', v)

					// 		cityDistricts['town'].forEach((sv) => {
					// 			if (sv.parentCityId === v.id) {
					//         console.log('cccccc', sv)
					// 			}
					// 		})
					// 	}
					// })

					selectCity?.id &&
						cityDistricts['city']?.forEach((v) => {
							if (v.parentCityId === selectCity?.id) {
								cities.push({
									cityId: v.id || '',
									level: v.level || 0,
									name: v.fullName || '',
								})
								// cityDistricts['town'].forEach((sv) => {
								// 	if (sv.parentCityId === v.id) {
								// 		cities.push({
								// 			cityId: sv.id || '',
								// 			level: sv.level || 0,
								// 			name: sv.fullName || '',
								// 		})
								// 	}
								// })
							}
						})

					break
			}
			if (!cities.length) return setArea(0)
			// console.log('area', cities)
			const cityBoundaries = await dispatch(
				methods.city.GetCityBoundaries({
					cities: cities,
				})
			).unwrap()

			// console.log('area', cities, cityBoundaries)
			const area = getAllCityAreas(cityBoundaries.map((v) => v.geojson))
			// console.log('area', area, cityBoundaries)
			setArea(area)
		}
		init()
	}, [timelineType, selectCity])

	const tempTownTimeline = useMemo(() => {
		const tempCities: protoRoot.city.ICityItem[] = []

		if (selectCity?.id) {
			cityDistricts['city']?.forEach((v) => {
				if (v.parentCityId === selectCity?.id) {
					cityDistricts['town'].forEach((sv) => {
						if (sv.parentCityId === v.id) {
							tempCities.push(sv)
						}
					})
				}
			})

			tempCities.sort(
				(a, b) => Number(b.firstEntryTime) - Number(a.firstEntryTime)
			)
		}

		return formatTimeLineCities(tempCities)
	}, [cityDistricts, selectCity])

	const tempCitiesTimeline = useMemo(() => {
		const tempCities: protoRoot.city.ICityItem[] = []

		if (selectCountry?.id) {
			cityDistricts['state']?.forEach((v) => {
				if (v.parentCityId === selectCountry?.id) {
					cityDistricts['region']?.forEach((sv) => {
						if (sv.parentCityId === v?.id) {
							tempCities.push(sv)
						}
					})
				}
				if (v.cities?.[0]?.level === 4) {
					tempCities.push(v)
				}
			})

			tempCities.sort(
				(a, b) => Number(b.firstEntryTime) - Number(a.firstEntryTime)
			)
		}

		return formatTimeLineCities(tempCities)
	}, [cityDistricts, selectCountry])

	const tempCountryTimeline = useMemo(() => {
		const tempCities: protoRoot.city.ICityItem[] = []

		cityDistricts['country']?.forEach((v) => {
			tempCities.push(v)
		})

		tempCities.sort(
			(a, b) => Number(b.firstEntryTime) - Number(a.firstEntryTime)
		)

		console.log('world', formatTimeLineCities(tempCities), cityDistricts)

		return formatTimeLineCities(tempCities)
	}, [cityDistricts])

	return (
		<NoSSR>
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
				<div
					className={
						'visited-cities-modal ' +
						config.deviceType +
						(config.fullScreen ? ' enlarge ' : '')
					}
				>
					<div className='th-header'>
						<saki-modal-header
							// border
							back-icon={true}
							close-icon={false}
							right-width={'56px'}
							ref={bindEvent({
								back() {
									dispatch(layoutSlice.actions.setOpenVisitedCitiesModal(false))
								},
							})}
							background-color={startScroll ? '#fff' : 'transparent'}
							title={t('title', {})}
						></saki-modal-header>
					</div>
					<div className='vc-main'>
						{layout.openVisitedCitiesModal ? (
							<>
								<div className='vc-map-wrap'>
									<div
										id={'visited-cities-map'}
										className={isRoadColorFade() ? 'roadColorFade' : ''}
									></div>
									<div className='vc-switch-citytype'>
										<saki-segmented
											ref={bindEvent({
												changevalue: async (e) => {
													console.log('SetConfigure segmented', e)

													setShowType(e.detail)
													setArea(0)
												},
											})}
											width='200px'
											height='36px'
											border-radius='18px'
											value={showType}
											bg-color='rgb(255,255,255,0.7)'
										>
											{['country', 'state', 'region', 'city'].map((v, i) => {
												return (
													<saki-segmented-item
														padding='0 6px'
														value={v}
														key={i}
													>
														<span>
															{t(v.toLowerCase(), {
																ns: 'visitedCitiesModal',
															})}
														</span>
													</saki-segmented-item>
												)
											})}
										</saki-segmented>
									</div>
								</div>

								<saki-scroll-view
									ref={bindEvent({
										distancetoborder: (e) => {
											// console.log(e.detail.top>0)

											if ((e.detail.top !== 0) !== startScroll) {
												setStartScroll(e.detail.top !== 0)
											}
										},
									})}
									mode='Custom'
									scroll-bar='Hidden'
								>
									<div
										style={{
											marginTop: config.deviceWH.h - 200 + 'px',
										}}
										className={'vc-layer ' + (startScroll ? 'startScroll' : '')}
									>
										<div className='vc-m-tabs'>
											<saki-tabs
												type='Flex'
												// header-background-color='rgb(245, 245, 245)'
												// header-max-width='740px'

												header-border-bottom='none'
												header-padding='0 10px'
												header-item-padding={
													config.lang === 'en-US' ? '0 4px' : '0 14px'
												}
												more-content-width-difference={-80}
												// header-item-min-width='80px'
												// disable-more-button
												active-tab-label={timelineType}
												header-item-height='40px'
												ref={bindEvent({
													tap: async (e) => {
														console.log('tap', e)
														setTimelineType(e.detail.label)
													},
												})}
											>
												{['world', 'region', 'town'].map((v, i) => {
													return true ? (
														<saki-tabs-item
															key={i}
															font-size='14px'
															label={v}
															name={t(v.toLowerCase(), {
																ns: 'visitedCitiesModal',
															})}
														>
															<div className='timeline-item'>
																<div className='vc-m-header'>
																	<div className='vch-left'>
																		<div className='vch-l-note'>
																			{getTabTitle(v)}
																		</div>
																		<div className='vch-l-title'>
																			{v === 'world' ? (
																				<>
																					<span className='days'>
																						{cityDistricts['country']?.length}
																					</span>
																					<span>{t('visitedWorldCount')}</span>
																				</>
																			) : v === 'region' ? (
																				<>
																					<span className='days'>
																						{cityDistricts['region']?.length}
																					</span>
																					<span>
																						{t('journeyedCountryCount')}
																					</span>
																				</>
																			) : (
																				<>
																					<span className='days'>
																						{cityCount}
																					</span>
																					<span
																						style={{
																							margin: '0 10px 0 0',
																						}}
																					>
																						{t('exploredCityCount')}
																					</span>
																					<span className='days'>
																						{townCount}
																					</span>
																					<span>{t('exploredTownCount')}</span>
																				</>
																			)}
																		</div>
																		<div className='vch-l-desc'>
																			{v === 'world' ? (
																				<span>
																					{t('travelSummary', {
																						days: historicalStatistics['All']
																							?.days,
																						hours:
																							historicalStatistics['All']
																								?.time < 0
																								? 0
																								: Math.round(
																										((historicalStatistics[
																											'All'
																										]?.time || 0) /
																											3600) *
																											100
																								  ) / 100 || 0,
																						trips:
																							historicalStatistics['All']
																								?.count,
																						distance:
																							Math.round(
																								(historicalStatistics['All']
																									?.distance || 0) / 100
																							) / 10 || 0,
																					})}
																				</span>
																			) : (
																				<span>
																					{t('footprintCoverage', {
																						area: Math.round(area),
																					})}
																				</span>
																			)}
																		</div>
																	</div>
																	<div className='vch-right'>
																		{v !== 'world' ? (
																			<saki-button
																				border='none'
																				bg-color='#eee'
																				bg-hover-color='#ddd'
																				bg-active-color='#ccc'
																				height='40px'
																				padding='6px 8px 6px 14px'
																				border-radius='20px'
																				ref={bindEvent({
																					tap: () => {
																						setOpenCityListType(v)
																					},
																				})}
																			>
																				<span
																					style={
																						{
																							// maxWidth: '100px',
																							// textWrap: 'nowrap',
																						}
																					}
																					className='text-two-elipsis'
																				>
																					{v === 'region'
																						? selectCountry?.name?.zhCN
																						: v === 'town'
																						? selectCity?.name?.zhCN
																						: ''}
																				</span>

																				<saki-icon
																					margin='0 0 0 4px'
																					type='BottomTriangle'
																				></saki-icon>
																			</saki-button>
																		) : (
																			''
																		)}
																	</div>
																</div>

																<CityTimeLineComponent
																	cities={
																		v === 'world'
																			? tempCountryTimeline
																			: v === 'region'
																			? tempCitiesTimeline
																			: tempTownTimeline
																	}
																	layout='VisitedCities'
																/>
															</div>
														</saki-tabs-item>
													) : (
														''
													)
												})}
											</saki-tabs>
										</div>
									</div>
								</saki-scroll-view>
							</>
						) : (
							''
						)}
					</div>
				</div>
			</saki-modal>
			<CityListModal
				visible={openCityListType !== ''}
				onClose={(b) => {
					setOpenCityListType('')
				}}
				cityDistricts={cityDistricts}
				type={timelineType}
				title={getTabTitle(openCityListType)}
				selectCountry={selectCountry}
				selectCity={selectCity}
				onSelect={(city) => {
					if (timelineType === 'region') {
						setSelectCountry(city)
						map.current?.setView(
							[city.coords?.latitude || 0, city.coords?.longitude || 0],
							3.5
						)
					}
					if (timelineType === 'town') {
						setSelectCity(city)

						map.current?.setView(
							[city.coords?.latitude || 0, city.coords?.longitude || 0],
							8
						)
					}
				}}
			/>
		</NoSSR>
	)
}

const CityListModal = ({
	visible,
	onClose,
	cityDistricts,
	type,
	title,
	selectCountry,
	selectCity,
	onSelect,
}: {
	visible: boolean
	onClose: (b: boolean) => void
	cityDistricts: {
		[type: string]: protoRoot.city.ICityItem[]
	}
	type: string
	title: string
	selectCountry?: protoRoot.city.ICityItem
	selectCity?: protoRoot.city.ICityItem
	onSelect: (city: protoRoot.city.ICityItem) => void
}) => {
	const { t, i18n } = useTranslation('visitedCitiesModal')
	const config = useSelector((state: RootState) => state.config)
	console.log('cityDistricts', cityDistricts)

	const list = useMemo(() => {
		const list: {
			name: string
			cities: {
				name: string
				id: string
				active: boolean
			}[]
		}[] = []
		if (visible) {
			if (type === 'region') {
				const cities: {
					name: string
					id: string
					active: boolean
				}[] = []
				cityDistricts['country'].forEach((v) => {
					cities.push({
						name: v.name?.zhCN || '',
						id: v.id || '',
						active: v.id === selectCountry?.id,
					})
				})
				list.push({
					name: '',
					cities,
				})
			}
			if (type === 'town') {
				cityDistricts['country'].forEach((v) => {
					const cities: {
						name: string
						id: string
						active: boolean
					}[] = []
					cityDistricts['region'].forEach((sv) => {
						if (sv.fullName?.split(',')[0] === v.name?.zhCN) {
							cities.push({
								name: getSimpleCityName(
									sv.name?.zhCN || '',
									convertCityLevelToTypeString(sv.level || 1)
								),
								id: sv.id || '',
								active: sv.id === selectCity?.id,
							})
						}
					})
					list.push({
						name: v.name?.zhCN || '',
						cities,
					})

					console.log('listt', list)
				})
			}
		}
		return list
	}, [type, cityDistricts, visible])

	// console.log('center list', list, selectCountry, selectCity)

	return (
		<saki-aside-modal
			ref={bindEvent({
				close: (e) => {
					console.log('setOpenFilterDropdown', e)
					onClose(false)
				},
			})}
			visible={visible}
			vertical='Bottom'
			horizontal='Center'
			width='100%'
			max-width='460px'
			max-height='420px'
			mask
			mask-closable
			mask-background-color='rgba(255,255,255,0)'
			// height='86%'
			padding='0 0 0px 0'
			background-color='#fff'
			border-radius='20px 20px 0 0'
			z-index='1010'
		>
			<div className='city-list-modal'>
				<div className='cl-header'>
					<div className='cl-h-left'>
						<h2>{title}</h2>
					</div>
					<div className='cl-h-right'>
						<saki-button
							border='none'
							bg-color='#eee'
							bg-hover-color='#ddd'
							bg-active-color='#ccc'
							width='34px'
							height='34px'
							border-radius='17px'
							ref={bindEvent({
								tap: () => {
									onClose(false)
								},
							})}
						>
							<saki-icon
								width='12px'
								height='12px'
								margin='0 0 0 0px'
								type='Close'
							></saki-icon>
						</saki-button>
					</div>
				</div>

				<saki-scroll-view
					ref={bindEvent({
						distancetoborder: (e) => {},
					})}
					// height="420px"
					max-height={420 - 70 + 'px'}
					mode='Custom'
				>
					<div className='cl-list'>
						{list.map((v) => {
							return (
								<div className='list-item'>
									<div className='item-name'>{v.name}</div>
									<div className='item-cities'>
										<saki-menu
											ref={bindEvent({
												selectvalue: async (e) => {
													console.log(e.detail.value)
													Object.keys(cityDistricts).forEach((k) => {
														cityDistricts[k].forEach((sv) => {
															if (sv.id === e.detail.value) {
																console.log('cccc', sv)
																onSelect(sv)
															}
														})
													})
													onClose(false)
												},
											})}
											type='Icons'
											padding='10px'
										>
											{v.cities.map((sv, i) => {
												const w =
													config.deviceWH.w > 460 ? 460 : config.deviceWH.w
												return (
													<saki-menu-item
														key={i}
														padding='0px'
														margin={`${Math.floor(w / 90)}px ${Math.floor(
															w / 90
														)}px`}
														value={sv.id}
														background-hover-color='rgba(0,0,0,0)'
														background-active-color='rgba(0,0,0,0)'
														// border={}
														// background-color={}
														// active={}
													>
														<div
															style={{
																width: Math.floor(w / 4.71) + 'px',
															}}
															className={
																'cities-item text-two-elipsis ' +
																(sv.active ? 'active' : '')
															}
														>
															{sv.name}
														</div>
													</saki-menu-item>
												)
											})}
										</saki-menu>
									</div>
								</div>
							)
						})}
					</div>
				</saki-scroll-view>
			</div>
		</saki-aside-modal>
	)
}

export interface CityTimeLineItem {
	date: string
	list: protoRoot.city.ICityItem[]
}

// item      这里用日期，不用月
export const formatTimeLineCities = (
	citiles: protoRoot.city.ICityItem[]
): CityTimeLineItem[] => {
	const tempCitiesTimeline: {
		[date: string]: protoRoot.city.ICityItem[]
	} = {}

	citiles?.forEach((v) => {
		const date = moment(Number(v?.firstEntryTime) * 1000).format('YYYY-MM')
		if (!tempCitiesTimeline[date]) {
			tempCitiesTimeline[date] = []
		}

		tempCitiesTimeline[date].push(v)
	})

	return Object.keys(tempCitiesTimeline).map((date) => {
		return {
			date,
			list: tempCitiesTimeline[date],
		}
	})
}

export const CityTimeLineComponent = ({
	cities,
	layout,
}: {
	cities: CityTimeLineItem[]
	layout: 'VisitedCities' | 'TripItem'
}) => {
	const { t, i18n } = useTranslation('visitedCitiesModal')
	const config = useSelector((state: RootState) => state.config)
	return (
		<div className='city-timeline-component'>
			<div className='timeline-header'>
				<div className='th-left'>
					{t('cityTimeline', {
						ns: 'visitedCitiesModal',
					})}
				</div>
			</div>

			<div className='timeline-list'>
				{cities?.map((v, i, arr) => {
					return (
						<div key={i} className='tl-item'>
							<div className='tl-i-header'>
								<div className='tl-i-h-title'>
									{layout === 'VisitedCities'
										? moment(v.date).format('YYYY.MM')
										: v.date}
								</div>
							</div>
							<div className='tl-i-list'>
								{v.list.map((sv) => {
									return (
										<div key={sv.id} className='tl-i-l-item'>
											<div className={'tl-i-l-i-left ' + layout}>
												<span>＃</span>
												<span className='text-two-elipsis'>
													{sv?.fullName
														?.split(',')
														.filter(
															(v, i, arr) => i >= arr.length - 2 && i !== 0
														)
														?.join(' · ') || ''}
												</span>
											</div>
											<div className='tl-i-l-i-right'>
												{layout === 'VisitedCities'
													? t('exploredDate', {
															date: moment(
																Number(sv?.firstEntryTime) * 1000
															).format('YYYY.MM.DD'),
													  })
													: t('arrivedDate', {
															date: moment(
																Number(sv?.firstEntryTime) * 1000
															).format('MM.DD hh:mm'),
													  })}
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

export default VisitedCitiesModal
