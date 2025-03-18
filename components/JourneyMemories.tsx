import React, {
	createContext,
	use,
	useCallback,
	useContext,
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
	IContext,
	reducer,
	journeyMemorySlice,
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
	formatPositionsStr,
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
	stripHtmlTags,
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
import FilterComponent from './Filter'
import { FilterTrips } from '../store/trip'
import { clearLayer, renderPolyline } from '../store/map'
import {
	backPage,
	deleteJM,
	getCurrentPageType,
	goPage,
	journeyMemoryMethods,
	setJMState,
	sortTlList,
} from '../store/journeyMemory'
import {
	SakiButton,
	SakiCascader,
	SakiCascaderItem,
	SakiIcon,
	SakiImages,
	SakiScrollLoading,
	SakiScrollView,
} from './saki-ui-react/components'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css'
import { TripListItemComponent } from './TripHistory'
import { clear } from 'console'
import {
	getSAaSSImageUrl,
	MediaItem,
	uploadFile,
	uploadFiles,
} from '../store/file'

const JourneyMemoriesModal = () => {
	const { t, i18n } = useTranslation('journeyMemoriesModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const geo = useSelector((state: RootState) => state.geo)
	const user = useSelector((state: RootState) => state.user)
	const jmState = useSelector((state: RootState) => state.journeyMemory)

	const { historicalStatistics } = useSelector((state: RootState) => {
		const { historicalStatistics } = state.trip
		return { historicalStatistics }
	})

	const dispatch = useDispatch<AppDispatch>()

	const [activeVehicleIdDropdown, setActiveVehicleIdDropdown] = useState('')

	useEffect(() => {
		if (layout.openJourneyMemoriesModal) {
			backPage(-10)
			dispatch(
				journeyMemoryMethods.GetJMList({
					pageNum: 1,
				})
			).unwrap()
			loadBaseData()
			return
		}
	}, [layout.openJourneyMemoriesModal])

	const loadBaseData = async () => {
		if (jmState.loadBaseDataStatus === 'noMore') return
		dispatch(
			setJMState({
				type: 'loadBaseDataStatus',
				value: 'loading',
			})
		)

		dispatch(
			methods.trip.GetTripHistoryData({
				loadCloudData: false,
				alert: false,
			})
		).unwrap()
		dispatch(
			setJMState({
				type: 'loadBaseDataStatus',
				value: 'noMore',
			})
		)
	}

	const pageTitle = useMemo(() => {
		const pageType = getCurrentPageType()

		if (pageType === 'AddJM') {
			return t('addJourneyMemory', {})
		}
		if (pageType === 'EditJM') {
			return t('updateJourneyMemory', {}) + ` [${jmState.editJM.id}]`
		}
		if (pageType === 'JMDetail') {
			return `${jmState.jmDetail.name} - ${t('title')}`
		}
		if (pageType === 'EditJMTimeline') {
			return t('updateMoment', {}) + ` [${jmState.editJMTL.id}]`
		}
		if (pageType === 'AddJMTimeline') {
			return t('addMoment', {})
		}

		if (jmState.loadBaseDataStatus === 'loading') {
			return t('loadingData', {
				ns: 'prompt',
			})
		}
		console.log(
			'jmState.pageTypes',
			jmState.pageTypes,
			jmState.pageTypes.filter(
				(v) =>
					v === 'JMDetail' || v === 'AddJMTimeline' || v === 'EditJMTimeline'
			).length > 0
		)
		return t('title', {}) + jmState.pageTypes.join(',')
	}, [jmState.loadBaseDataStatus, jmState.pageTypes])

	return (
		<saki-modal
			ref={bindEvent({
				close() {
					dispatch(layoutSlice.actions.setOpenJourneyMemoriesModal(false))
				},
			})}
			width='100%'
			height='100%'
			// max-width={config.deviceType === 'Mobile' ? '100%' : '780px'}
			// max-height={config.deviceType === 'Mobile' ? '100%' : '780px'}
			mask
			border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
			border={config.deviceType === 'Mobile' ? 'none' : ''}
			mask-closable='false'
			background-color='#fff'
			visible={layout.openJourneyMemoriesModal}
			z-index={899}
		>
			<div
				className={
					'journey-memories-modal ' +
					config.deviceType +
					(config.fullScreen ? ' enlarge ' : '')
				}
			>
				<div className='jm-header'>
					<saki-modal-header
						// border
						back-icon={jmState.pageTypes.length > 0}
						close-icon={jmState.pageTypes.length === 0}
						left-width={config.deviceType === 'Mobile' ? '100%' : ''}
						center-width={config.deviceType === 'Mobile' ? '0px' : ''}
						right-width={'56px'}
						ref={bindEvent({
							close() {
								backPage(-10)
								dispatch(layoutSlice.actions.setOpenJourneyMemoriesModal(false))
							},
							back() {
								backPage(-1)
							},
						})}
						background-color={
							getCurrentPageType() === 'JMDetail' && !jmState.startScroll
								? 'transparent'
								: '#fff'
						}
						title={config.deviceType !== 'Mobile' ? pageTitle : ''}
					>
						<div className='vc-h-left' slot='left'>
							<span className='text'>
								{config.deviceType === 'Mobile' ? pageTitle : ''}
							</span>
						</div>
						<div
							className='vc-h-right'
							style={{
								margin: '0 10px 0 0',
							}}
							slot='right'
						>
							{jmState.pageTypes.length === 0 ? (
								<saki-button
									ref={bindEvent({
										tap: () => {
											dispatch(
												setJMState({
													type: 'pageTypes',
													value: jmState.pageTypes.concat('AddJM'),
												})
											)
										},
									})}
									padding='6px 10px'
									border='none'
									type='Normal'
								>
									<span
										style={{
											whiteSpace: 'nowrap',
										}}
									>
										{t('addJourneyMemory')}
									</span>
								</saki-button>
							) : (
								''
							)}
							{getCurrentPageType() === 'JMDetail' ? (
								<saki-button
									ref={bindEvent({
										tap: () => {
											goPage('EditJM')

											dispatch(
												setJMState({
													type: 'editJM',
													value: jmState.jmDetail,
												})
											)
										},
									})}
									padding='6px 10px'
									border='none'
									type='Normal'
								>
									<span
										style={{
											whiteSpace: 'nowrap',
										}}
									>
										{t('updateJourneyMemory')}
									</span>
								</saki-button>
							) : (
								''
							)}
						</div>
					</saki-modal-header>
				</div>
				<div className='jm-main'>
					{jmState.loadBaseDataStatus === 'loading' ? (
						<span className='jm-loading'>
							{t('loadingData', {
								ns: 'prompt',
							})}
						</span>
					) : (
						<>
							{!jmState.list.length ? (
								<div className='jm-none'>
									<saki-button
										ref={bindEvent({
											tap: () => {
												console.log('addJourneyMemory')

												dispatch(
													setJMState({
														type: 'pageTypes',
														value: jmState.pageTypes.concat('AddJM'),
													})
												)
											},
										})}
										margin='0px 0 20px'
										width='200px'
										padding='10px 10px'
										type='Primary'
										loading={jmState.loadBaseDataStatus === 'loading'}
									>
										{t('addJourneyMemory', {})}
									</saki-button>
								</div>
							) : (
								<saki-scroll-view
									ref={bindEvent({
										distancetoborder: (e) => {
											console.log(e.detail.top > 0)

											// if ((e.detail.top !== 0) !== startScroll) {
											// 	setStartScroll(e.detail.top !== 0)
											// }
										},
									})}
									mode='Custom'
									scroll-bar='Hidden'
								>
									<div style={{}} className={'jm-layer '}>
										<div className='jm-list'>
											<saki-card title={''} hide-subtitle>
												{jmState.list.map((v, i) => {
													const coverUrl = v.media?.filter(
														(v) => v.type === 'image'
													)?.[0]?.url
													return (
														<saki-card-item
															ref={bindEvent({
																tap: () => {
																	dispatch(
																		setJMState({
																			type: 'pageTypes',
																			value:
																				jmState.pageTypes.concat('JMDetail'),
																		})
																	)
																	dispatch(
																		setJMState({
																			type: 'jmDetail',
																			value: v,
																		})
																	)
																},
															})}
															key={i}
															type='Flex'
															// right-width='50px'
															title=''
															// border='1px dashed var(--saki-default-color)'
															// border-hover='1px dashed var(--saki-default-color)'
															// border-active='1px dashed var(--saki-default-color)'
															border-radius='10px'
															background-color='#fff'
															background-hover-color='#f3f3f3'
															background-active-color='#eee'
															margin='0 0 10px'
															padding='10px'
															center-content='false'
															// background-hover-color="rgb(250,250,250)"
														>
															<div className='jm-item' slot='left'>
																<div className='jmi-top'>
																	<div className='jmi-left'>
																		{coverUrl ? (
																			<saki-images
																				width='50px'
																				height='50px'
																				border-radius='6px'
																				margin='0 10px 0 0'
																				src={coverUrl}
																			></saki-images>
																		) : (
																			<div className='jmil-icon'>
																				<SakiIcon
																					width='20px'
																					height='20px'
																					color='#fff'
																					type='Route'
																				></SakiIcon>
																			</div>
																		)}
																	</div>
																	<div className='jmi-right'>
																		<div className='jmi-r-left'>
																			<div className='name'>
																				<div>{v.name}</div>
																			</div>
																			{/* <div className='desc'>
																		<span className='type'>{v.desc}</span>
																	</div> */}
																			<div className='desc'>
																				<span className='text-two-elipsis'>
																					{stripHtmlTags(v?.desc || '')}
																				</span>
																			</div>
																		</div>
																		<saki-dropdown
																			visible={activeVehicleIdDropdown === v.id}
																			floating-direction='Left'
																			ref={bindEvent({
																				close: () => {
																					setActiveVehicleIdDropdown('')
																				},
																			})}
																		>
																			<saki-button
																				ref={bindEvent({
																					tap: () => {
																						setActiveVehicleIdDropdown(
																							v.id || ''
																						)
																					},
																				})}
																				bg-color='transparent'
																				type='CircleIconGrayHover'
																			>
																				<saki-icon
																					color='#555'
																					type='More'
																				></saki-icon>
																			</saki-button>
																			<div slot='main'>
																				<saki-menu
																					ref={bindEvent({
																						selectvalue: async (e) => {
																							console.log(e.detail.value)
																							switch (e.detail.value) {
																								case 'Edit':
																									goPage('EditJM')

																									dispatch(
																										setJMState({
																											type: 'editJM',
																											value: v,
																										})
																									)
																									break
																								case 'Delete':
																									deleteJM(v.id || '')
																									break

																								default:
																									break
																							}
																							setActiveVehicleIdDropdown('')
																						},
																					})}
																				>
																					<saki-menu-item
																						padding='10px 18px'
																						value={'Edit'}
																					>
																						<div className='dp-menu-item'>
																							<span>
																								{t('updateJourneyMemory', {
																									ns: 'journeyMemoriesModal',
																								})}
																							</span>
																						</div>
																					</saki-menu-item>
																					<saki-menu-item
																						padding='10px 18px'
																						value={'Delete'}
																					>
																						<div className='dp-menu-item'>
																							<span>
																								{t('deleteJourneyMemory', {
																									ns: 'journeyMemoriesModal',
																								})}
																							</span>
																						</div>
																					</saki-menu-item>
																				</saki-menu>
																			</div>
																		</saki-dropdown>
																	</div>
																</div>
																{v.statistics?.days ? (
																	<div className='jmi-bottom'>
																		<div className='jm-statistics'>
																			<div className='item-s-item'>
																				{`${t('duration', {
																					ns: 'tripPage',
																				})} ${
																					v.statistics?.days
																				}天 · ${formatTimestamp(
																					Number(v.statistics?.time),
																					true
																				)}`}
																			</div>

																			<div className='item-s-item'>
																				{`${v.statistics?.count}次行程 · ${
																					Math.round(
																						(v?.statistics?.distance || 0) / 10
																					) / 100
																				} km`}
																			</div>

																			<div className='item-s-item'>
																				{t('maxSpeed', {
																					ns: 'tripPage',
																				})}{' '}
																				{(v?.statistics?.maxSpeed?.num || 0) <=
																				0
																					? 0
																					: Math.round(
																							((v?.statistics?.maxSpeed?.num ||
																								0) *
																								3600) /
																								100
																					  ) / 10}{' '}
																				km/h
																			</div>
																			<div className='item-s-item'>
																				{t('maxAltitude', {
																					ns: 'tripPage',
																				})}{' '}
																				{(v?.statistics?.maxAltitude?.num ||
																					0) <= 0
																					? 0
																					: Math.round(
																							(v?.statistics?.maxAltitude
																								?.num || 0) * 10
																					  ) / 10}{' '}
																				m
																			</div>
																			{/* <div className='info-item'>平均时速 10'05</div> */}
																		</div>
																	</div>
																) : (
																	''
																)}
															</div>
															{/* <div slot='center'>
                                              </div> */}
															{/* <div slot='right'></div> */}
														</saki-card-item>
													)
												})}
											</saki-card>
										</div>
										{/* {jmState.list.map((v, i) => {
											return (
												<div className='jm-item' key={i}>
													<div className='jm-i-left'>
														<div className='jm-i-name'>{v.name}</div>
														<div className='jm-i-desc'>
															<div className='jm-i-d-item'>
																总时长{' '}
																{(Number(v.statistics?.days) || 0) +
																	' / ' +
																	(Number(v.statistics?.time) || 0)}
															</div>
															<div className='jm-i-d-item'>
																行程数 {Number(v.statistics?.count) || 0}
															</div>
														</div>
													</div>
													<div className='jm-i-right'>
														<div className='jm-i-days'>
															{v.statistics?.distance}
														</div>
													</div>
												</div>
											)
										})} */}

										<SakiScrollLoading
											onTap={async () => {
												await dispatch(
													journeyMemoryMethods.GetJMList({
														pageNum: 1,
													})
												).unwrap()
											}}
											type={jmState.loadStatus as any}
										></SakiScrollLoading>
									</div>
								</saki-scroll-view>
							)}
						</>
					)}
				</div>
				<saki-transition
					class-name={'avp'}
					animation-duration='300'
					data-refresh={config.deviceType}
					in={
						jmState.pageTypes.filter((v) => v === 'AddJM' || v === 'EditJM')
							.length > 0
					}
				>
					<AddJourneyMemoriesPage />
				</saki-transition>
				<saki-transition
					class-name={'avp'}
					animation-duration='300'
					data-refresh={config.deviceType}
					in={
						jmState.pageTypes.filter(
							(v) =>
								v === 'JMDetail' ||
								v === 'AddJMTimeline' ||
								v === 'EditJMTimeline'
						).length > 0
					}
				>
					<JourneyMemoriesItemPage />
				</saki-transition>
				<saki-transition
					class-name={'avp'}
					animation-duration='300'
					data-deviceType={config.deviceType}
					in={
						jmState.pageTypes.filter(
							(v) => v === 'AddJMTimeline' || v === 'EditJMTimeline'
						).length > 0
					}
				>
					<AddJourneyMemoriesTimelinePage />
				</saki-transition>
			</div>
		</saki-modal>
	)
}

const AddJourneyMemoriesPage = () => {
	const { t, i18n } = useTranslation('journeyMemoriesModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const trip = useSelector((state: RootState) => state.trip)

	const jmState = useSelector((state: RootState) => state.journeyMemory)

	const dispatch = useDispatch<AppDispatch>()

	const [openFilterModal, setOpenFilterModal] = useState(false)
	const [openPositionShareDropdown, setOpenPositionShareDropdown] =
		useState(false)
	const [selectLogo, setSelectLogo] = useState(false)

	const [filterConfig, setFilterConfig] =
		useState<protoRoot.configure.Configure.Filter.IFilterItem>({
			startDate: '',
			endDate: '',
			selectedVehicleIds: [] as string[],
			selectedTripTypes: [] as string[],
			selectedTripIds: [] as string[],
			shortestDistance: 0,
			longestDistance: 500,
		})

	const [id, setId] = useState('')
	const [logo, setLogo] = useState('')
	const [name, setName] = useState('')
	const [nameErr, setNameErr] = useState('')
	const [desc, setDesc] = useState('')
	const [media, setMedia] = useState<MediaItem[]>([])

	const richtextEl = useRef<any>()

	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)
	useEffect(() => {
		if (
			jmState.pageTypes.filter((v) => v === 'AddJM' || v === 'EditJM').length >
			0
		) {
			if (jmState.pageTypes.includes('EditJM')) {
				setId(jmState.editJM.id || '')
				setName(jmState.editJM.name || '')
				setNameErr('')
				setDesc(jmState.editJM.desc || '')
				richtextEl.current?.setValue(jmState.editJM.desc || '')
				setMedia(jmState.editJM.media || [])
				return
			}
			setId('')
			setLogo('')
			setName('')
			setNameErr('')
			setDesc('')
			richtextEl.current?.setValue('')
			setMedia([])
		}
	}, [jmState.pageTypes])

	const addJM = async () => {
		if (loadStatus === 'loading') return
		setLoadStatus('loading')

		const mediaList = await uploadFiles(media)

		const params: protoRoot.journeyMemory.AddJM.IRequest = {
			name,
			desc,
			media: mediaList.map((v) => {
				return {
					type: v.type,
					url: v.url,
				}
			}),
		}
		const res = await httpApi.v1.AddJM({
			...params,
		})
		console.log('AddJM', res, {
			name,
			desc,
			media,
		})
		if (res.code === 200) {
			setLoadStatus('loaded')
			backPage(-1)

			await dispatch(
				journeyMemoryMethods.GetJMList({
					pageNum: 1,
				})
			).unwrap()

			snackbar({
				message: t('createdSuccessfully', {
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

	const updateJM = async () => {
		if (loadStatus === 'loading') return
		setLoadStatus('loading')

		const mediaList = await uploadFiles(media)

		const params: protoRoot.journeyMemory.UpdateJM.IRequest = {
			name,
			desc,
			media: mediaList.map((v) => {
				return {
					type: v.type,
					url: v.url,
				}
			}),
		}

		const res = await httpApi.v1.UpdateJM({
			id: jmState.editJM.id,
			...params,
			// tripIds,
		})
		console.log('UpdateJM', res)
		if (res.code === 200) {
			setLoadStatus('loaded')

			backPage(-1)

			dispatch(
				setJMState({
					type: 'jmDetail',
					value: {
						...jmState.jmDetail,
						...params,
					},
				})
			)

			dispatch(
				setJMState({
					type: 'list',
					value: jmState.list.map((v) => {
						if (v.id === jmState.editJM.id) {
							return {
								...v,
								...params,
							}
						}

						return v
					}),
				})
			)

			snackbar({
				message: t('updatedSuccessfully', {
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

	return (
		<div className='add-jm-page  page-transition'>
			<SakiScrollView mode='Custom' scroll-bar='Hidden'>
				<div className='av-main'>
					{/* {id ? (
					<div className='av-item'>
						<span>{t('id')}</span>
						<span
							style={{
								color: '#999',
							}}
						>
							{id || ''}
						</span>
					</div>
				) : (
					''
				)} */}
					{/* <div className='av-item'>
					<span>{t('cover') + ' (可选)'}</span>
					<saki-avatar
						ref={bindEvent({
							edit: (e: any) => {
								console.log(e)
								setSelectLogo(true)
							},
						})}
						width='80px'
						height='80px'
						border-radius='50%'
						default-icon='User'
						default-icon-size='24px'
						edit-icon
						src={logo}
					></saki-avatar>
				</div> */}

					<saki-input
						ref={bindEvent({
							changevalue: (e: any) => {
								// console.log(e)
								setNameErr(
									!e.detail
										? t('cannotBeEmpty', {
												ns: 'prompt',
										  })
										: ''
								)
								setName(e.detail)
							},
						})}
						value={name}
						placeholder={t('namePlaceholder')}
						width={'100%'}
						height={'56px'}
						type={'Text'}
						margin='20px 0 0'
						placeholder-animation='MoveUp'
						max-length={30}
						error={nameErr}
						// errorColor={v.errorColor}
						// errorFontSize={v.errorFontSize}
					></saki-input>

					<saki-richtext
						ref={bindEvent(
							{
								changevalue: (e) => {
									// console.log('datadata', e.detail.richText)
									setDesc(e.detail.richText || '')
								},
								submit: () => {},
							},
							(e: any) => {
								richtextEl.current = e
								richtextEl.current?.setToolbar?.({
									container: [],
								})
							}
						)}
						theme='snow'
						toolbar='false'
						toolbar-padding='0px'
						// max-height='250px'
						min-height='120px'
						width='100%'
						padding='0px'
						margin='16px 0 0'
						font-size='14px'
						min-length='0'
						max-length='10000'
						clear-all-styles-when-pasting
						short-enter='NewLine'
						editor-background-color='rgb(243,243,243)'
						editor-border-radius='10px'
						editor-padding='10px'
						value={desc}
						placeholder={t('descPlaceholder')}
					/>

					{/* <div className='av-item'>
					<span>{t('tripList')}</span>

					<saki-button
						ref={bindEvent({
							tap: () => {
								setOpenFilterModal(true)
							},
						})}
						margin='20px 0 0'
						padding='10px 10px'
						type='Primary'
					>
						<span>
							{tripIds?.length
								? t('selectedTripsCount', {
										length: tripIds.length,
								  })
								: t('selectTrips')}
						</span>
					</saki-button>

				</div>
				<FilterComponent
					dataList
					trips={FilterTrips({
						selectedTripTypes: filterConfig?.selectedTripTypes || [],
						shortestDistance: Number(filterConfig?.shortestDistance) || 0,
						longestDistance: Number(filterConfig?.longestDistance) || 0,
						showCustomTrip: filterConfig?.showCustomTrip || false,
						selectedVehicleIds: filterConfig?.selectedVehicleIds || [],
						startDate: filterConfig?.startDate || '',
						endDate: filterConfig?.endDate || '',
					})}
					selectTripIds={filterConfig?.selectedTripIds || []}
					onDataList={(ids) => {
						setFilterConfig({
							...filterConfig,
							selectedTripIds: ids,
						})

						setTripIds(ids)
					}}
					selectTypes={filterConfig?.selectedTripTypes || []}
					onSelectTypes={(filterTypes) => {
						setFilterConfig({
							...filterConfig,
							selectedTripTypes: filterTypes,
						})
					}}
					distanceRange={{
						minDistance: Number(filterConfig?.shortestDistance),
						maxDistance: Number(filterConfig?.longestDistance),
					}}
					onSelectDistance={(obj) => {
						setFilterConfig({
							...filterConfig,
							shortestDistance: obj.minDistance,
							longestDistance: obj.maxDistance,
						})
					}}
					date
					startDate={filterConfig?.startDate || ''}
					endDate={filterConfig?.endDate || ''}
					selectStartDate={(date) => {
						setFilterConfig({
							...filterConfig,
							startDate: date,
						})
					}}
					selectEndDate={(date) => {
						setFilterConfig({
							...filterConfig,
							endDate: date,
						})
					}}
					selectVehicle
					selectVehicleIds={filterConfig?.selectedVehicleIds || []}
					onSelectVehicleIds={(ids) => {
						setFilterConfig({
							...filterConfig,
							selectedVehicleIds: ids,
						})
					}}
					visible={openFilterModal}
					onclose={() => {
						setOpenFilterModal(false)
					}}
					customTripSwitch
					showCustomTrip={filterConfig?.showCustomTrip || false}
					onShowCustomTrip={(showCustomTrip) => {
						setFilterConfig({
							...filterConfig,
							showCustomTrip: showCustomTrip,
						})
					}}
				/> */}

					<div className='av-item media'>
						<span>{t('cover') + ' (可选)'}</span>
						<div
							style={{
								maxWidth:
									media.length >= 2 ? '270px' : (media.length + 1) * 90 + 'px',
							}}
							className={'av-i-media ' + (media.length >= 2 ? 'grid' : 'flex')}
						>
							{media
								// .concat(media)
								// .concat(media)
								// .concat(media)
								.map((v, i) => {
									return (
										<div
											ref={
												bindEvent({
													click: () => {
														alert({
															title: t('delete', {
																ns: 'prompt',
															}),
															content: t('deleteImage', {
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
																setMedia(media.filter((_, si) => si !== i))
															},
														}).open()
													},
												}) as any
											}
											className='media-item'
											key={i}
										>
											{v.type === 'image' ? (
												<SakiImages
													width='80px'
													height='80px'
													objectFit={'cover'}
													borderRadius='10px'
													src={getSAaSSImageUrl(v.url || '', 'small')}
												></SakiImages>
											) : (
												''
											)}
										</div>
									)
								})}
							{media.length < 9 ? (
								<div
									ref={
										bindEvent({
											click: () => {
												const input = document.createElement('input')
												input.type = 'file'
												input.accept = 'image/*'
												input.multiple = true

												input.oninput = () => {
													if (input.files?.length) {
														const tmedia = [...media]

														for (let i = 0; i < input.files.length; i++) {
															if (tmedia.length >= 9) {
																snackbar({
																	message: t('mediaLimitExceeded', {
																		ns: 'prompt',
																	}),
																	autoHideDuration: 2000,
																	vertical: 'top',
																	horizontal: 'center',
																	backgroundColor: 'var(--saki-default-color)',
																	color: '#fff',
																}).open()
																break
															}

															tmedia.push({
																type: 'image',
																url: URL.createObjectURL(input.files[i]),
																file: input.files[i],
															})
														}

														setMedia(tmedia)
														// const reader = new FileReader()
														// reader.onload = (e) => {
														// 	if (!e.target?.result?.toString()) return

														// 	setMedia(
														// 		media.concat([
														// 			{
														// 				type: 'image',
														// 				url: e.target?.result?.toString() || '',
														// 			},
														// 		])
														// 	)
														// }
														// reader.readAsDataURL(file)
													}
												}
												input.onblur = () => {
													console.log('close')
												}
												input.onfocus = () => {
													console.log('close')
												}
												input.click()
											},
										}) as any
									}
									className='media-item'
								>
									<SakiIcon
										color='#999'
										width='24px'
										height='24px'
										type='Add'
									></SakiIcon>
								</div>
							) : (
								''
							)}
							{/* <saki-avatar
							ref={bindEvent({
								edit: (e: any) => {
									console.log(e)
									setSelectLogo(true)
								},
							})}
							width='80px'
							height='80px'
							border-radius='50%'
							default-icon='User'
							default-icon-size='24px'
							// edit-icon
							src={logo}
						></saki-avatar> */}
						</div>
					</div>

					<div className='av-item av-buttons'>
						{getCurrentPageType() === 'EditJM' ? (
							<SakiButton
								onTap={() => {
									deleteJM(jmState.jmDetail?.id || '')
								}}
								margin='20px 0 20px 10px'
								padding='10px 10px'
								type='Normal'
							>
								{t('deleteJourneyMemory')}
							</SakiButton>
						) : (
							''
						)}
						<saki-button
							ref={bindEvent({
								tap: () => {
									if (!id) {
										addJM()
										return
									}
									updateJM()
								},
							})}
							margin='20px 0 20px 10px'
							padding='10px 10px'
							type='Primary'
							disabled={!name}
							loading={loadStatus === 'loading'}
						>
							{jmState.pageTypes.includes('EditJM')
								? t('updateJourneyMemory')
								: t('addJourneyMemory')}
						</saki-button>
					</div>
				</div>
			</SakiScrollView>
		</div>
	)
}

const JourneyMemoriesItemPage = () => {
	const { t, i18n } = useTranslation('journeyMemoriesModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const geo = useSelector((state: RootState) => state.geo)
	const user = useSelector((state: RootState) => state.user)
	const jmState = useSelector((state: RootState) => state.journeyMemory)

	const { historicalStatistics } = useSelector((state: RootState) => {
		const { historicalStatistics } = state.trip
		return { historicalStatistics }
	})

	const dispatch = useDispatch<AppDispatch>()

	const mapRef = useRef<{
		[id: string]: {
			loadedMap: boolean
			map: Leaflet.Map | undefined
			layer: any
		}
	}>({})

	// const loadedMap = useRef(false)
	// const map = useRef<Leaflet.Map>()
	// const layer = useRef<any>()
	// const targetMarker = useRef<Leaflet.Marker<any>>()
	// const marker = useRef<Leaflet.Marker<any>>()
	// const polyline = useRef<Leaflet.Polyline<any>>()

	const [loadMoreList, setLoadMoreList] = useState<string[]>([])

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

	const [viewMomentMapTrackId, setViewMomentMapTrackId] = useState('')

	const [activeJMTLdDropdown, setActiveJMTLDropdown] = useState('')

	const carouselMap = useRef<{
		[id: string]: any
	}>({})
	const carouselNavMap = useRef<{
		[id: string]: any
	}>({})

	const d = useRef(new Debounce())

	const [imageWidth, setImageWidth] = useState(0)

	const [openCityListType, setOpenCityListType] = useState('')
	const [area, setArea] = useState(0)

	const [selectCountry, setSelectCountry] = useState<protoRoot.city.ICityItem>()
	const [selectCity, setSelectCity] = useState<protoRoot.city.ICityItem>()

	useEffect(() => {
		console.log(
			'GetJMTimelineList',
			!jmState.jmDetail.authorId,
			jmState.jmDetail?.id,
			getCurrentPageType() === 'JMDetail',
			jmState.loadTimelineDetailStatus
		)
		if (
			jmState.loadTimelineDetailStatus === 'loaded' &&
			jmState.jmDetail?.id &&
			getCurrentPageType() === 'JMDetail'
		) {
			setViewMomentMapTrackId('')
			loadData()
			return
		} else {
			if (!jmState.pageTypes.includes('JMDetail')) {
				jmState.jmDetail?.id && clearMap(jmState.jmDetail?.id)
				dispatch(
					setJMState({
						type: 'jmDetail',
						value: {},
					})
				)
				dispatch(
					setJMState({
						type: 'tlList',
						value: [],
					})
				)
				dispatch(
					setJMState({
						type: 'loadTimelineDetailStatus',
						value: 'loaded',
					})
				)
				dispatch(
					setJMState({
						type: 'loadTimelineListStatus',
						value: 'loaded',
					})
				)
			}
		}
	}, [jmState.jmDetail?.id, jmState.pageTypes])

	useEffect(() => {
		const id = jmState.jmDetail?.id || ''
		const m = mapRef.current[id]
		if (jmState.jmDetail?.id && jmState.tlList && m) {
			// jmState.tlList.forEach((v) => {
			// 	initMap(v?.id || '')
			// })
		}
	}, [jmState.jmDetail, jmState.tlList, mapRef.current])

	useEffect(() => {
		if (jmState.jmDetail?.id && config.mapUrl) {
			initMap(jmState.jmDetail?.id || '')
		}
	}, [viewMomentMapTrackId, jmState.jmDetail, jmState.tlList, config.mapUrl])

	// useEffect(() => {
	// 	if (layout.openJourneyMemoriesModal && config.mapUrl) {
	// 		initMap(jmState.jmDetail?.id || '', true)
	// 		return
	// 	}
	// 	// clearMap()
	// }, [layout.openJourneyMemoriesModal, config.mapUrl])

	const loadData = async () => {
		if (jmState.loadTimelineDetailStatus === 'loading') return

		setLoadMoreList([])

		dispatch(
			setJMState({
				type: 'loadTimelineDetailStatus',
				value: 'loading',
			})
		)

		const res = await httpApi.v1.GetJMDetail({
			id: jmState.jmDetail.id || '',
		})
		console.log('GetJMDetail', res)
		if (res.code === 200 && res?.data?.journeyMemory) {
			dispatch(
				setJMState({
					type: 'jmDetail',
					value: res.data.journeyMemory,
				})
			)
			dispatch(
				methods.journeyMemory.GetJMTLList({
					id: jmState.jmDetail.id || '',
					pageNum: 1,
				})
			).unwrap()
		}
		dispatch(
			setJMState({
				type: 'loadTimelineDetailStatus',
				value: 'noMore',
			})
		)
	}

	const clearMap = (id: string) => {
		console.log('clearMap')

		const m = mapRef.current[id]

		if (!m) return
		m.map?.remove()
		m.map = undefined
		m.loadedMap = false

		// loadedMap.current = false
		// map.current?.remove()
		// map.current = undefined
		// marker.current?.remove()
		// marker.current = undefined
		// targetMarker.current?.remove()
		// targetMarker.current = undefined

		// deleteAllCityGeojsonMap('VisitedCitiesModal')
	}

	const initMap = async (id: string, loadedMap: boolean = false) => {
		const L: typeof Leaflet = (window as any).L

		const myPositionGPS = getLatLng(
			config.mapUrl,
			geo.position.coords.latitude || 0,
			geo.position.coords.longitude || 0
		)
		const zoom = 12

		const [lat, lon] = [myPositionGPS[0], myPositionGPS[1]]

		if (!mapRef.current[id]) {
			mapRef.current[id] = {
				loadedMap: false,
				layer: undefined,
				map: undefined,
			}
		}

		const m = mapRef.current[id]

		console.log(
			'initMap',
			'jmd-map-' + id,
			config.mapUrl,
			m,
			(L && !m.loadedMap) || loadedMap
		)

		if ((L && !m.loadedMap) || loadedMap) {
			if (m.map || loadedMap) {
				clearMap(id)
			}
			if (!m.map) {
				m.map = L.map('jmd-map-' + id, {
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
					m.map?.invalidateSize(true)
				})

				// 检测地址如果在中国就用高德地图
				m.map.setView([lat, lon], zoom)

				m.layer = (L.tileLayer as any)
					.colorScale(config.mapUrl, {})
					.addTo(m.map)

				m.layer?.setGrayscale?.(config.configure.baseMap?.mapMode === 'Gray')
				m.layer?.setDarkscale?.(config.configure.baseMap?.mapMode === 'Dark')
				m.layer?.setBlackscale?.(config.configure.baseMap?.mapMode === 'Black')

				createDistanceScaleControl(
					m.map,
					config.deviceType === 'Mobile' ? 80 : 100,
					{
						position: 'bottomleft',
						y: '5px',
					}
				)

				isRoadColorFade() && roadColorFade(m.layer)
			}

			m.loadedMap = true
		}

		if (m.map && L && jmState.tlList.length) {
			clearLayer({
				map: m.map,
				type: 'Polyline',
			})
			let ids = [] as string[]
			jmState.tlList.forEach((v) => {
				if (viewMomentMapTrackId && v.id !== viewMomentMapTrackId) {
					return
				}
				ids = ids.concat(v?.tripIds || [])
			})
			const tripPositions = await storage.tripPositions.mget(ids)
			console.log('positions1', tripPositions.length, ids)

			renderPolyline({
				map: m.map,
				trips: tripPositions.map((v) => v.value),
				// Number(config.configure.polylineWidth?.historyTripTrack) ||
				weight: 2,
				speedColor:
					getTrackRouteColor(config.configure?.trackRouteColor as any, false) ||
					'auto',
			})
		}

		d.current.increase(() => {
			m.map?.invalidateSize(true)
		}, 300)
	}

	const deleteMoment = async (id: string) => {
		alert({
			title: t('deleteMoment', {
				ns: 'journeyMemoriesModal',
			}),
			content: t('deleteThisMoment', {
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
				const res = await httpApi.v1.DeleteJMTimeline({
					id: jmState.jmDetail.id,
					timelineId: id,
				})

				console.log('DeleteJMTimeline', res)

				if (res.code === 200) {
					dispatch(
						setJMState({
							type: 'tlList',
							value: sortTlList(
								jmState.tlList.filter((v) => {
									return v.id !== id
								})
							),
						})
					)
					snackbar({
						message: t('deletedSuccessfully', {
							ns: 'prompt',
						}),
						autoHideDuration: 2000,
						vertical: 'top',
						horizontal: 'center',
						backgroundColor: 'var(--saki-default-color)',
						color: '#fff',
					}).open()
				}
			},
		}).open()
	}

	const jmId = jmState.jmDetail?.id || ''

	const scrollViewEl = useRef<any>()

	const jmCreateTimeMoment = moment(Number(jmState.jmDetail.createTime) * 1000)
	const jmLastUpdateTimeMoment = moment(
		Number(jmState.jmDetail.lastUpdateTime) * 1000
	)

	const { cityNamesMap, cityNamesList } = useMemo(() => {
		const cityNamesMap: {
			[id: string]: string[]
		} = {}
		jmState.tlList.forEach((v) => {
			const cityName: string[] = []

			v.trips?.forEach((sv) => {
				sv.cities?.forEach((ssv) => {
					// ssv.cityDetails?.filter

					const fullName: string[] = []
					ssv.cityDetails?.forEach((sssv) => {
						if (sssv.level === 2 || sssv.level === 3 || sssv.level === 4) {
							fullName.push(
								getSimpleCityName(
									sssv.name?.zhCN || '',
									convertCityLevelToTypeString(sssv.level || 1)
								)
							)
							// fullName.push(sssv.name?.zhCN || '')
						}
					})

					const fullNameStr = fullName
						// .slice(fullName.length - 2, fullName.length)
						.join('·')

					!cityName.includes(fullNameStr) && cityName.push(fullNameStr)
				})
			})

			cityNamesMap[v.id || ''] = cityName
		})

		const cityNamesList = Object.keys(cityNamesMap).reduce((cityNames, v) => {
			return [...new Set(cityNames.concat(cityNamesMap[v]))]
		}, [] as string[])
		return { cityNamesMap, cityNamesList }
	}, [jmState.tlList])

	return (
		<div
			className={
				'jm-detail-page page-transition ' +
				config.deviceType +
				(config.fullScreen ? ' enlarge ' : '')
			}
		>
			<saki-scroll-view
				ref={bindEvent(
					{
						distancetoborder: (e) => {
							// console.log(e.detail.top>0)

							if ((e.detail.top !== 0) !== jmState.startScroll) {
								// setStartScroll(e.detail.top !== 0)
								dispatch(
									setJMState({
										type: 'startScroll',
										value: e.detail.top !== 0,
									})
								)
							}
						},
					},
					(e) => {
						scrollViewEl.current = e
					}
				)}
				mode='Custom'
				// scroll-bar='Hidden'
			>
				<div className='jmd-media'>
					{jmState.jmDetail?.id ? (
						<>
							<saki-carousel
								ref={bindEvent(
									{
										resizeChange: (e) => {
											// console.log('carousel', e)
										},
										switchIndex: (e) => {
											console.log('switchIndex', e)

											carouselNavMap.current[jmId]?.switch(e.detail)
										},
									},
									(e) => {
										carouselMap.current[jmId] = e
									}
								)}
								margin='0 0 10px 0'
								width='100%'
								height='100%'
								// height='calc(100% - 60px)'
								// autoplay
								arrows
								// dots
							>
								<saki-carousel-item>
									<div className='jmd-map'>
										<div className='map' id={'jmd-map-' + jmId}></div>
									</div>
								</saki-carousel-item>
								{jmState.jmDetail.media?.map((v, i) => {
									return v.type === 'image' ? (
										<saki-carousel-item key={i}>
											<saki-images
												width='100%'
												height='100%'
												objectFit='cover'
												src={getSAaSSImageUrl(v.url || '', 'mid')}
											></saki-images>
											;
										</saki-carousel-item>
									) : (
										''
									)
								})}
							</saki-carousel>
							<div
								// style={{
								// 	width:
								// 		60 * (Number(jmState.jmDetail.media?.length) + 1) + 'px',
								// }}
								className='jmd-carnav'
							>
								{viewMomentMapTrackId ? (
									<div className='jmd-restore-track'>
										<SakiButton
											onTap={() => {
												setViewMomentMapTrackId('')
												scrollViewEl.current?.scrollto?.('top')
											}}
											padding='6px 10px'
											type='Primary'
										>
											<span
												style={{
													whiteSpace: 'nowrap',
												}}
											>
												{t('viewAllMomentMapTrack')}
											</span>
										</SakiButton>
									</div>
								) : (
									''
								)}

								<saki-carousel-nav
									ref={bindEvent(
										{
											switchIndex: async (e) => {
												console.log('switchIndex selectvalue', e)
												;(await carouselMap.current[jmId].getScrollIndex()) !==
													e.detail && carouselMap.current[jmId].switch(e.detail)
											},
										},
										(e) => {
											carouselNavMap.current[jmId] = e
										}
									)}
									// margin='0 0 10px 0'
									width='100%'
									// height='60px'
									justify-content='flex-end'
								>
									<saki-carousel-nav-item
										border-radius='6px'
										width='50px'
										height='50px'
										padding='2px'
										margin='0 0 10px 10px'
									>
										<span className='jmd-media-map-nav-text'>{t('map')}</span>
									</saki-carousel-nav-item>
									{jmState.jmDetail.media?.map((v, i) => {
										return v.type === 'image' ? (
											<saki-carousel-nav-item
												border-radius='6px'
												width='50px'
												height='50px'
												margin='0 0 10px 10px'
												key={i}
											>
												<SakiImages
													width='100%'
													height='100%'
													objectFit='cover'
													src={getSAaSSImageUrl(v.url || '', 'small')}
												></SakiImages>
												;
											</saki-carousel-nav-item>
										) : (
											''
										)
									})}
								</saki-carousel-nav>
							</div>
						</>
					) : (
						''
					)}
				</div>

				<div
					style={
						{
							// marginTop: config.deviceWH.h - 200 + 'px',
						}
					}
					className={'jmd-main '}
				>
					<div className='jmd-name'>
						<h3>{jmState.jmDetail.name}</h3>
					</div>
					<div className='jmd-desc'>
						<div
							dangerouslySetInnerHTML={{ __html: jmState.jmDetail.desc || '' }}
						/>
					</div>
					{jmState.jmDetail?.statistics?.count}
					{jmState.jmDetail?.statistics?.count ? (
						<div className='jm-statistics'>
							<div className='item-s-item'>
								{`${t('duration', {
									ns: 'tripPage',
								})} ${jmState.jmDetail?.statistics?.days}天 · ${formatTimestamp(
									Number(jmState.jmDetail?.statistics?.time),
									true
								)}`}
							</div>

							<div className='item-s-item'>
								{`${jmState.jmDetail?.statistics?.count}次行程 · ${
									Math.round(
										(jmState.jmDetail?.statistics?.distance || 0) / 10
									) / 100
								} km`}
							</div>

							<div className='item-s-item'>
								{t('maxSpeed', {
									ns: 'tripPage',
								})}{' '}
								{(jmState.jmDetail?.statistics?.maxSpeed?.num || 0) <= 0
									? 0
									: Math.round(
											((jmState.jmDetail?.statistics?.maxSpeed?.num || 0) *
												3600) /
												100
									  ) / 10}{' '}
								km/h
							</div>
							<div className='item-s-item'>
								{t('maxAltitude', {
									ns: 'tripPage',
								})}{' '}
								{(jmState.jmDetail?.statistics?.maxAltitude?.num || 0) <= 0
									? 0
									: Math.round(
											(jmState.jmDetail?.statistics?.maxAltitude?.num || 0) * 10
									  ) / 10}{' '}
								m
							</div>
							{/* <div className='info-item'>平均时速 10'05</div> */}
						</div>
					) : (
						''
					)}
					<div className='jmd-city'>
						{cityNamesList.map((v, i) => {
							return (
								<span className='cn' key={i}>
									{v}
								</span>
							)
						})}
					</div>
					<div className='jmd-info'>
						<span>
							{t('numCities', {
								ns: 'tripPage',
								num: cityNamesList.length,
							})}
						</span>

						<span>{`·`}</span>
						{jmState.jmDetail.lastUpdateTime ? (
							<span>
								{t('lastUpdatedAt', {
									date: jmLastUpdateTimeMoment.format('YYYY.MM.DD'),
									time: jmLastUpdateTimeMoment.format('hh:mm:ss'),
								})}
							</span>
						) : (
							''
						)}
						<span>{`·`}</span>
						<span>
							{t('createdAt', {
								date: jmCreateTimeMoment.format('YYYY.MM.DD'),
								time: jmCreateTimeMoment.format('hh:mm:ss'),
							})}
						</span>
					</div>

					{!jmState.jmDetail.timeline?.length && false ? (
						<div className='jmd-timeline-none'>{t('timelineEmpty')}</div>
					) : (
						<>
							<div className='jmd-timeline-title'>
								<span className='title'>{t('moment')}</span>

								<SakiButton
									onTap={() => {
										goPage('AddJMTimeline')
									}}
									padding='10px 10px'
									border='none'
									type='Normal'
								>
									{/* <saki-icon
										margin='0 6px 0 0'
										color='#aaa'
										type='Add'
									></saki-icon> */}
									<span>{t('addMoment')}</span>
								</SakiButton>
							</div>

							<div className='jmd-timeline'>
								{jmState.tlList.map((v, i) => {
									let maxCreateTripTime = 0
									let minCreateTripTime = 9999999999
									v.trips?.forEach((sv) => {
										maxCreateTripTime = Math.max(
											maxCreateTripTime,
											Number(sv.createTime)
										)
										minCreateTripTime = Math.min(
											minCreateTripTime,
											Number(sv.createTime)
										)
									})

									return (
										<div className='jmd-tl-item' key={i}>
											<div className='item-header'>
												<span className='date'>
													{`${moment(minCreateTripTime * 1000).format(
														'YYYY.MM.DD'
													)} - ${moment(maxCreateTripTime * 1000).format(
														'YYYY.MM.DD'
													)}`}
												</span>

												<saki-dropdown
													visible={activeJMTLdDropdown === v.id}
													floating-direction='Left'
													ref={bindEvent({
														close: () => {
															setActiveJMTLDropdown('')
														},
													})}
												>
													<saki-button
														ref={bindEvent({
															tap: () => {
																setActiveJMTLDropdown(v.id || '')
															},
														})}
														bg-color='transparent'
														type='CircleIconGrayHover'
													>
														<saki-icon
															// width='14px'
															// height='14px'
															color='#999'
															type='More'
														></saki-icon>
													</saki-button>
													<div slot='main'>
														<saki-menu
															ref={bindEvent({
																selectvalue: async (e) => {
																	console.log(e.detail.value)
																	switch (e.detail.value) {
																		case 'Edit':
																			dispatch(
																				setJMState({
																					type: 'editJMTL',
																					value: v,
																				})
																			)
																			goPage('EditJMTimeline')
																			break
																		case 'Delete':
																			deleteMoment(v.id || '')
																			break
																		case 'ViewMomentMapTrack':
																			setViewMomentMapTrackId(v?.id || '')
																			scrollViewEl.current?.scrollto?.('top')
																			break

																		default:
																			break
																	}
																	setActiveJMTLDropdown('')
																},
															})}
														>
															<saki-menu-item
																padding='10px 18px'
																value={'ViewMomentMapTrack'}
															>
																<div className='dp-menu-item'>
																	<span>
																		{t('viewMomentMapTrack', {
																			ns: 'journeyMemoriesModal',
																		})}
																	</span>
																</div>
															</saki-menu-item>
															<saki-menu-item
																padding='10px 18px'
																value={'Edit'}
															>
																<div className='dp-menu-item'>
																	<span>
																		{t('updateMoment', {
																			ns: 'journeyMemoriesModal',
																		})}
																	</span>
																</div>
															</saki-menu-item>
															<saki-menu-item
																padding='10px 18px'
																value={'Delete'}
															>
																<div className='dp-menu-item'>
																	<span>
																		{t('deleteMoment', {
																			ns: 'journeyMemoriesModal',
																		})}
																	</span>
																</div>
															</saki-menu-item>
														</saki-menu>
													</div>
												</saki-dropdown>
											</div>
											<div className='item-continer'>
												<div className='item-name'>
													<span className='name'>{v.name}</span>
												</div>
												<div className='item-desc'>
													<div
														className='desc'
														dangerouslySetInnerHTML={{ __html: v.desc || '' }}
													/>
													{/* <span className='desc'>{v.desc}</span> */}
												</div>
												<div className='item-city'>
													{cityNamesMap[v?.id || '']?.map((sv, si) => {
														return (
															<span className='cn' key={si}>
																{sv}
															</span>
														)
													})}
												</div>
												{v.statistics?.count ? (
													<div className='jm-statistics'>
														<div className='item-s-item'>
															{`${t('duration', {
																ns: 'tripPage',
															})} ${v.statistics?.days}天 · ${formatTimestamp(
																Number(v.statistics?.time),
																true
															)}`}
														</div>

														<div className='item-s-item'>
															{`${v.statistics?.count}次行程 · ${
																Math.round(
																	(v?.statistics?.distance || 0) / 10
																) / 100
															} km`}
														</div>

														<div className='item-s-item'>
															{t('maxSpeed', {
																ns: 'tripPage',
															})}{' '}
															{(v?.statistics?.maxSpeed?.num || 0) <= 0
																? 0
																: Math.round(
																		((v?.statistics?.maxSpeed?.num || 0) *
																			3600) /
																			100
																  ) / 10}{' '}
															km/h
														</div>
														<div className='item-s-item'>
															{t('maxAltitude', {
																ns: 'tripPage',
															})}{' '}
															{(v?.statistics?.maxAltitude?.num || 0) <= 0
																? 0
																: Math.round(
																		(v?.statistics?.maxAltitude?.num || 0) * 10
																  ) / 10}{' '}
															m
														</div>
														{/* <div className='info-item'>平均时速 10'05</div> */}
													</div>
												) : (
													''
												)}

												<div className='item-media'>
													<saki-viewer>
														<div className='item-media-list saki-gallery'>
															{v.media?.map((sv, si) => {
																return (
																	<a
																		className='im-img'
																		data-src={getSAaSSImageUrl(
																			sv.url || '',
																			'big'
																		)}
																		data-sub-html={`
                                      <h4>${v.name}</h4>
                                      <p>${v.desc}</p>
                                    `}
																		key={si}
																	>
																		<img
																			style={{
																				display: 'none',
																			}}
																			src={getSAaSSImageUrl(
																				sv.url || '',
																				'small'
																			)}
																			alt='Image 1'
																		/>
																		<SakiImages
																			width={
																				config.deviceWH.w < 450
																					? '80px'
																					: '120px'
																			}
																			height={
																				config.deviceWH.w < 450
																					? '80px'
																					: '120px'
																			}
																			objectFit='cover'
																			borderRadius='10px'
																			src={getSAaSSImageUrl(
																				sv.url || '',
																				'mid'
																			)}
																		></SakiImages>
																	</a>
																)
															})}
														</div>
													</saki-viewer>
													{/* <div className={'gallery' + v.id}>
														{v.media?.map((sv, si) => {
															return (
																<a data-src={sv.url || ''} key={si}>
																	<img src={sv.url || ''} alt='Image 1' />
																</a>
															)
														})}
													</div> */}

													{/* <saki-carousel
														ref={bindEvent(
															{
																resizeChange: (e) => {
																	// console.log('carousel', e)
																},
																switchIndex: (e) => {
																	console.log('switchIndex', e)

																	carouselNavMap.current[v?.id || '']?.switch(
																		e.detail
																	)
																},
															},
															(e) => {
																carouselMap.current[v?.id || ''] = e
															}
														)}
														margin='0 0 6px 0'
														width='100%'
														height='250px'
														border-radius='10px'
														// autoplay
														arrows
														dots
													>
														{v.media
															?.concat(v.media)
															?.concat(v.media)
															?.concat(v.media)
															?.concat(v.media)
															?.concat(v.media)
															?.map((v, i) => {
																return v.type === 'image' ? (
																	<saki-carousel-item key={i}>
																		<saki-images
																			width='100%'
																			height='100%'
																			objectFit='cover'
																			src={getSAaSSImageUrl(v.url || '', 'mid')}
																		></saki-images>
																		;
																	</saki-carousel-item>
																) : (
																	''
																)
															})}
													</saki-carousel>
													<saki-carousel-nav
														ref={bindEvent(
															{
																switchIndex: (e) => {
																	console.log('switchIndex selectvalue', e)

																	carouselMap.current[v?.id || ''].switch(
																		e.detail
																	)
																},
															},
															(e) => {
																carouselNavMap.current[v?.id || ''] = e
															}
														)}
														margin='0 0 10px 0'
														width='100%'
														// height='60px'
														justify-content='flex-end'
													>
														{v.media
															?.concat(v.media)
															?.concat(v.media)
															?.concat(v.media)
															?.concat(v.media)
															?.concat(v.media)
															?.map((v, i) => {
																return v.type === 'image' ? (
																	<saki-carousel-nav-item
																		border-radius='6px'
																		width='50px'
																		height='50px'
																		key={i}
																	>
																		<SakiImages
																			width='100%'
																			height='100%'
																			objectFit='cover'
																			src={getSAaSSImageUrl(
																				v.url || '',
																				'small'
																			)}
																		></SakiImages>
																		;
																	</saki-carousel-nav-item>
																) : (
																	''
																)
															})}
													</saki-carousel-nav> */}
												</div>
												<div className='item-trips'>
													<div
														className={
															'item-t-list ' +
															(loadMoreList.includes(v?.id || '')
																? 'full'
																: 'min')
														}
													>
														{v.trips?.map((sv, si) => {
															return (
																<TripListItemComponent
																	trip={sv}
																	type={sv.type as any}
																	onTap={(id) => {
																		dispatch(
																			layoutSlice.actions.setOpenTripItemModal({
																				visible: true,
																				id: id || '',
																			})
																		)
																	}}
																	key={si}
																/>
															)
														})}
													</div>

													{Number(v.trips?.length) > 2 &&
													!loadMoreList.includes(v?.id || '') ? (
														<SakiScrollLoading
															onTap={() => {
																setLoadMoreList(
																	loadMoreList.concat(v?.id || '')
																)
															}}
															type='loaded'
														/>
													) : (
														''
													)}
												</div>
											</div>
										</div>
									)
								})}
							</div>
							<saki-scroll-loading
								margin='30px 0'
								type={jmState.loadTimelineListStatus}
							></saki-scroll-loading>
						</>
					)}
				</div>
			</saki-scroll-view>
		</div>
	)
}

const AddJourneyMemoriesTimelinePage = () => {
	const { t, i18n } = useTranslation('journeyMemoriesModal')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const trip = useSelector((state: RootState) => state.trip)

	const jmState = useSelector((state: RootState) => state.journeyMemory)

	const dispatch = useDispatch<AppDispatch>()

	const [openFilterModal, setOpenFilterModal] = useState(false)
	const [openPositionShareDropdown, setOpenPositionShareDropdown] =
		useState(false)
	const [selectLogo, setSelectLogo] = useState(false)

	const [filterConfig, setFilterConfig] =
		useState<protoRoot.configure.Configure.Filter.IFilterItem>({
			startDate: '',
			endDate: '',
			selectedVehicleIds: [] as string[],
			selectedTripTypes: [] as string[],
			selectedTripIds: [] as string[],
			shortestDistance: 0,
			longestDistance: 500,
		})

	const [id, setId] = useState('')
	const [logo, setLogo] = useState('')
	const [name, setName] = useState('')
	const [nameErr, setNameErr] = useState('')
	const [desc, setDesc] = useState('')
	const [tripIds, setTripIds] = useState([] as string[])
	const [media, setMedia] = useState<MediaItem[]>([
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
		// {
		// 	type: 'image',
		// 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
		// },
	])

	const richtextEl = useRef<any>()

	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)
	useEffect(() => {
		if (jmState.pageTypes.includes('EditJMTimeline')) {
			setId(jmState.editJMTL.id || '')
			setName(jmState.editJMTL.name || '')
			setNameErr('')
			setDesc(jmState.editJMTL.desc || '')
			richtextEl.current?.setValue(jmState.editJMTL.desc || '')
			setMedia(jmState.editJMTL.media || [])
			setTripIds(jmState.editJMTL.tripIds || [])
			return
		}
		setId('')
		setLogo('')
		setName('')
		setNameErr('')
		setDesc('')
		richtextEl.current?.setValue('')
		setTripIds([])
		setMedia([])
	}, [jmState.pageTypes])

	const addJMTL = async () => {
		if (loadStatus === 'loading') return
		setLoadStatus('loading')

		const mediaList = await uploadFiles(media)

		const params: protoRoot.journeyMemory.AddJMTimeline.IRequest = {
			desc,
			media: mediaList.map((v) => {
				return {
					type: v.type,
					url: v.url,
				}
			}),
			tripIds,
		}

		const res = await httpApi.v1.AddJMTimeline({
			id: jmState.jmDetail.id,
			name,
			...params,
		})

		console.log('AddJMTimeline', res.data.journeyMemoryTimeline, params)
		if (res.code === 200 && res.data.journeyMemoryTimeline) {
			setLoadStatus('loaded')
			backPage(-1)

			dispatch(
				methods.journeyMemory.GetJMTLList({
					id: jmState.jmDetail.id || '',
					pageNum: 1,
				})
			).unwrap()

			snackbar({
				message: t('createdSuccessfully', {
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

	const updateJMTL = async () => {
		if (loadStatus === 'loading') return
		setLoadStatus('loading')

		const mediaList = await uploadFiles(media)

		const params: protoRoot.journeyMemory.UpdateJMTimeline.IRequest = {
			name,
			desc,
			media: mediaList.map((v) => {
				return {
					type: v.type,
					url: v.url,
				}
			}),
			tripIds,
		}

		const res = await httpApi.v1.UpdateJMTimeline({
			id: jmState.jmDetail.id,
			timelineId: jmState.editJMTL.id,
			...params,
		})

		console.log('UpdateJMTimeline', res, params)
		if (res.code === 200) {
			setLoadStatus('loaded')

			backPage(-1)
			dispatch(
				setJMState({
					type: 'tlList',
					value: sortTlList([
						...jmState.tlList.map((v) => {
							if (v.id === jmState.editJMTL.id) {
								return {
									...v,
									...params,
								}
							}

							return v
						}),
					]),
				})
			)
			// await dispatch(
			// 	journeyMemoryMethods.GetJMList({
			// 		pageNum: 1,
			// 	})
			// ).unwrap()

			snackbar({
				message: t('updatedSuccessfully', {
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

	return (
		<div className='add-jmtl-page page-transition'>
			<SakiScrollView mode='Custom' scroll-bar='Hidden'>
				<div className='av-main'>
					{/* {id ? (
					<div className='av-item'>
						<span>{t('id')}</span>
						<span
							style={{
								color: '#999',
							}}
						>
							{id || ''}
						</span>
					</div>
				) : (
					''
				)} */}

					<saki-input
						ref={bindEvent({
							changevalue: (e: any) => {
								// console.log(e)
								setNameErr(
									!e.detail
										? t('cannotBeEmpty', {
												ns: 'prompt',
										  })
										: ''
								)
								setName(e.detail)
							},
						})}
						value={name}
						placeholder={t('timelineNamePlaceholder')}
						width={'100%'}
						height={'56px'}
						type={'Text'}
						margin='20px 0 0'
						placeholder-animation='MoveUp'
						max-length={30}
						error={nameErr}
						// errorColor={v.errorColor}
						// errorFontSize={v.errorFontSize}
					></saki-input>

					<saki-richtext
						ref={bindEvent(
							{
								changevalue: (e) => {
									// console.log('datadata', e.detail.richText)
									setDesc(e.detail.richText || '')
								},
								submit: () => {},
							},
							(e: any) => {
								richtextEl.current = e
								richtextEl.current?.setToolbar?.({
									container: [],
								})
							}
						)}
						theme='snow'
						toolbar='false'
						toolbar-padding='0px'
						// max-height='250px'
						min-height='120px'
						width='100%'
						padding='0px'
						margin='16px 0 0'
						font-size='14px'
						min-length='0'
						max-length='10000'
						clear-all-styles-when-pasting
						short-enter='NewLine'
						editor-background-color='rgb(243,243,243)'
						editor-border-radius='10px'
						editor-padding='10px'
						value={desc}
						placeholder={t('descPlaceholder')}
					/>

					<div className='av-item'>
						<span>{t('tripList')}</span>

						<saki-button
							ref={bindEvent({
								tap: () => {
									setOpenFilterModal(true)
								},
							})}
							margin='20px 0 0'
							padding='10px 10px'
							type='Primary'
						>
							<span>
								{tripIds?.length
									? t('selectedTripsCount', {
											length: tripIds.length,
									  })
									: t('selectTrips')}
							</span>
						</saki-button>
					</div>
					<FilterComponent
						dataList
						trips={FilterTrips({
							selectedTripTypes: filterConfig?.selectedTripTypes || [],
							shortestDistance: Number(filterConfig?.shortestDistance) || 0,
							longestDistance: Number(filterConfig?.longestDistance) || 0,
							showCustomTrip: filterConfig?.showCustomTrip || false,
							selectedVehicleIds: filterConfig?.selectedVehicleIds || [],
							startDate: filterConfig?.startDate || '',
							endDate: filterConfig?.endDate || '',
						})}
						selectTripIds={tripIds || []}
						onDataList={(ids) => {
							setFilterConfig({
								...filterConfig,
								selectedTripIds: ids,
							})

							setTripIds(ids)
						}}
						selectTypes={filterConfig?.selectedTripTypes || []}
						onSelectTypes={(filterTypes) => {
							setFilterConfig({
								...filterConfig,
								selectedTripTypes: filterTypes,
							})
						}}
						distanceRange={{
							minDistance: Number(filterConfig?.shortestDistance),
							maxDistance: Number(filterConfig?.longestDistance),
						}}
						onSelectDistance={(obj) => {
							setFilterConfig({
								...filterConfig,
								shortestDistance: obj.minDistance,
								longestDistance: obj.maxDistance,
							})
						}}
						date
						startDate={filterConfig?.startDate || ''}
						endDate={filterConfig?.endDate || ''}
						selectStartDate={(date) => {
							setFilterConfig({
								...filterConfig,
								startDate: date,
							})
						}}
						selectEndDate={(date) => {
							setFilterConfig({
								...filterConfig,
								endDate: date,
							})
						}}
						selectVehicle
						selectVehicleIds={filterConfig?.selectedVehicleIds || []}
						onSelectVehicleIds={(ids) => {
							setFilterConfig({
								...filterConfig,
								selectedVehicleIds: ids,
							})
						}}
						visible={openFilterModal}
						onclose={() => {
							setOpenFilterModal(false)
						}}
						customTripSwitch
						showCustomTrip={filterConfig?.showCustomTrip || false}
						onShowCustomTrip={(showCustomTrip) => {
							setFilterConfig({
								...filterConfig,
								showCustomTrip: showCustomTrip,
							})
						}}
					/>

					<div className='av-item media'>
						<span>{t('cover') + ' (可选)'}</span>
						<div
							style={{
								maxWidth:
									media.length >= 2 ? '270px' : (media.length + 1) * 90 + 'px',
							}}
							className={'av-i-media ' + (media.length >= 2 ? 'grid' : 'flex')}
						>
							{media
								// .concat(media)
								// .concat(media)
								// .concat(media)
								.map((v, i) => {
									return (
										<div
											ref={
												bindEvent({
													click: () => {
														alert({
															title: t('delete', {
																ns: 'prompt',
															}),
															content: t('deleteImage', {
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
																setMedia(media.filter((_, si) => si !== i))
															},
														}).open()
													},
												}) as any
											}
											className='media-item'
											key={i}
										>
											{v.type === 'image' ? (
												<SakiImages
													width='80px'
													height='80px'
													objectFit={'cover'}
													borderRadius='10px'
													src={getSAaSSImageUrl(v.url || '', 'small')}
												></SakiImages>
											) : (
												''
											)}
										</div>
									)
								})}
							{media.length < 9 ? (
								<div
									ref={
										bindEvent({
											click: () => {
												const input = document.createElement('input')
												input.type = 'file'
												input.accept = 'image/*'
												input.multiple = true

												input.oninput = () => {
													if (input.files?.length) {
														const tmedia = [...media]

														for (let i = 0; i < input.files.length; i++) {
															if (tmedia.length >= 9) {
																snackbar({
																	message: t('mediaLimitExceeded', {
																		ns: 'prompt',
																	}),
																	autoHideDuration: 2000,
																	vertical: 'top',
																	horizontal: 'center',
																	backgroundColor: 'var(--saki-default-color)',
																	color: '#fff',
																}).open()
																break
															}
															tmedia.push({
																type: 'image',
																url: URL.createObjectURL(input.files[i]),
																file: input.files[i],
															})
														}
														setMedia(tmedia)
														// const reader = new FileReader()
														// reader.onload = (e) => {
														// 	if (!e.target?.result?.toString()) return

														// 	setMedia(
														// 		media.concat([
														// 			{
														// 				type: 'image',
														// 				url: e.target?.result?.toString() || '',
														// 			},
														// 		])
														// 	)
														// }
														// reader.readAsDataURL(file)
													}
												}
												input.onblur = () => {
													console.log('close')
												}
												input.onfocus = () => {
													console.log('close')
												}
												input.click()
											},
										}) as any
									}
									className='media-item'
								>
									<SakiIcon
										color='#999'
										width='24px'
										height='24px'
										type='Add'
									></SakiIcon>
								</div>
							) : (
								''
							)}
							{/* <saki-avatar
							ref={bindEvent({
								edit: (e: any) => {
									console.log(e)
									setSelectLogo(true)
								},
							})}
							width='80px'
							height='80px'
							border-radius='50%'
							default-icon='User'
							default-icon-size='24px'
							// edit-icon
							src={logo}
						></saki-avatar> */}
						</div>
					</div>

					{jmState.pageTypes.includes('EditJM') ? (
						<div className='av-item'>
							<span>{t('positionShare')}</span>

							<saki-dropdown
								visible={openPositionShareDropdown}
								floating-direction='Left'
								z-index='1000'
								ref={bindEvent({
									close: () => {
										setOpenPositionShareDropdown(false)
									},
								})}
							>
								<saki-button
									border='none'
									bg-hover-color='transparent'
									bg-active-color='transparent'
									padding='0px'
									ref={bindEvent({
										tap: () => {
											setOpenPositionShareDropdown(true)
										},
									})}
								>
									<saki-icon
										width='12px'
										height='12px'
										color='#999'
										margin='0 0 0 6px'
										type='Bottom'
									></saki-icon>
								</saki-button>
								<div slot='main'>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												setOpenPositionShareDropdown(false)
											},
										})}
									>
										{[5, 1, -1].map((v, i) => {
											return (
												<saki-menu-item
													key={i}
													// width={dropdownWidth}
													padding='10px 18px'
													value={v}
												></saki-menu-item>
											)
										})}
									</saki-menu>
								</div>
							</saki-dropdown>
						</div>
					) : (
						''
					)}
					<div className='av-item av-buttons'>
						<saki-button
							ref={bindEvent({
								tap: () => {
									if (!id) {
										addJMTL()
										return
									}
									updateJMTL()
								},
							})}
							margin='20px 0 0'
							padding='10px 10px'
							type='Primary'
							disabled={!name || !tripIds.length}
							loading={loadStatus === 'loading'}
						>
							{jmState.pageTypes.includes('EditJMTimeline')
								? t('updateMoment')
								: t('addMoment')}
						</saki-button>
					</div>
				</div>
			</SakiScrollView>
		</div>
	)
}

export default JourneyMemoriesModal
