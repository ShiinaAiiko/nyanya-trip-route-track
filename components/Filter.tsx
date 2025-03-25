import Head from 'next/head'
import TripLaout from '../layouts/Trip'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import path from 'path'
import {
	AppDispatch,
	RootState,
	configSlice,
	layoutSlice,
	tripSlice,
} from '../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'

import NoSSR from '../components/NoSSR'
import { formatDistance } from '../plugins/methods'
import moment from 'moment'
import { httpApi } from '../plugins/http/api'
import { VehicleLogo } from './Vehicle'
import { protoRoot } from '../protos'
import {
	SakiButton,
	SakiScrollLoading,
	SakiTitle,
} from './saki-ui-react/components'
import { FilterTrips } from '../store/trip'
import {
	convertCityLevelToTypeString,
	getCityName,
	getSimpleCityName,
} from '../store/city'

interface FilterConfig {
	selectedTripTypes: string[]
	shortestDistance: number
	longestDistance: number
	showCustomTrip: boolean
	showFullData: boolean
	selectedVehicleIds: string[]
	startDate: string
	endDate: string
	selectedTripIds: string[]
}

const FilterComponent = ({
	visible,
	onclose,
	selectTypes,
	date,
	startDate,
	endDate,
	dataList,
	trips,
	selectTripIds,
	selectVehicle,
	distanceRange,
	buttons,
	selectVehicleIds,

	customTripSwitch,
	showCustomTripSwitch,

	fullDataSwitch,
	showFullDataSwitch,

	onLoad,
}: {
	visible: boolean
	onclose: () => void
	selectTypes?: string[]
	onSelectTypes?: (fileterTypes: string[]) => void
	date?: boolean
	startDate?: string
	endDate?: string
	selectStartDate?: (date: string) => void
	selectEndDate?: (date: string) => void
	dataList?: boolean
	trips?: protoRoot.trip.ITrip[]
	selectTripIds?: string[]
	onDataList?: (ids: string[]) => void
	selectVehicle?: boolean
	distanceRange?: { minDistance: number; maxDistance: number }
	onSelectDistance?: (obj: { minDistance: number; maxDistance: number }) => void
	buttons?: {
		text: string
		type: 'Normal' | 'Primary'
		onTap: () => void
	}[]
	selectVehicleIds?: string[]
	onSelectVehicleIds?: (ids: string[]) => void

	customTripSwitch?: boolean
	fullDataSwitch?: boolean
	showFullDataSwitch?: boolean
	showCustomTripSwitch?: boolean
	showCustomTrip?: boolean
	// onShowCustomTrip?: (showCustomTrip: boolean) => void
	onLoad?: (filterConfig: FilterConfig, trips: protoRoot.trip.ITrip[]) => void
}) => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const config = useSelector((state: RootState) => state.config)
	const trip = useSelector((state: RootState) => state.trip)
	const layout = useSelector((state: RootState) => state.layout)
	const user = useSelector((state: RootState) => state.user)
	const vehicle = useSelector((state: RootState) => state.vehicle)

	// console.log('baseTrips jm ', trips)
	// const startDate = useSelector(
	// 	(state: RootState) => state.config.trackRoute.selectedDate.startDate
	// )
	// const endDate = useSelector(
	// 	(state: RootState) => state.config.trackRoute.selectedDate.endDate
	// )

	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()

	const [openStartDateDatePicker, setOpenStartDateDatePicker] = useState(false)
	const [openEndDateDatePicker, setOpenEndDateDatePicker] = useState(false)

	const [selectedTypes, setSelectedTypes] = useState<string[]>([])

	const [selectedStartDate, setSelectedStartDate] = useState('')
	const [selectedEndDate, setSelectedEndDate] = useState('')

	const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([])

	const [selectedDistanceRange, setSelectedDistanceRange] = useState({
		minDistance: 0,
		maxDistance: 500,
	})

	const [showCustomTrip, setShowCustomTrip] = useState(false)
	const [showFullData, setShowFullData] = useState(false)

	const [selectedTripIds, setSelectedTripIds] = useState<string[]>([])
	const [pageNum, setPageNum] = useState(1)
	const [pageSize, setPageSize] = useState(20)
	const [loadStatus, setLoadStatus] = useState<'loaded' | 'loading' | 'noMore'>(
		'loaded'
	)

	useEffect(() => {
		setSelectedTypes(selectTypes || [])
		setSelectedStartDate(startDate || '')
		setSelectedEndDate(endDate || '')
		setSelectedVehicleIds(selectVehicleIds || [])
		setSelectedDistanceRange(
			distanceRange || {
				minDistance: 0,
				maxDistance: 500,
			}
		)
		setSelectedTripIds(selectTripIds || [])
		setShowCustomTrip(showCustomTripSwitch || false)
		setShowFullData(showFullDataSwitch || false)
	}, [visible])

	const clear = () => {
		setSelectedTypes([])
		setSelectedStartDate('')
		setSelectedEndDate('')
		setSelectedVehicleIds([])
		setSelectedDistanceRange({
			minDistance: 0,
			maxDistance: 500,
		})
		setSelectedTripIds([])
		setShowCustomTrip(false)
		setShowFullData(false)
		setPageNum(1)
	}

	const { filterTrips, filterConfig } = useMemo(() => {
		const filterConfig: FilterConfig = {
			selectedTripTypes: selectedTypes,
			shortestDistance: selectedDistanceRange.minDistance,
			longestDistance: selectedDistanceRange.maxDistance,
			showCustomTrip: showCustomTrip,
			selectedVehicleIds: selectedVehicleIds,
			startDate: selectedStartDate,
			endDate: selectedEndDate,
			selectedTripIds: selectedTripIds,
			showFullData: showFullData,
		}
		const filterTrips = FilterTrips(filterConfig)
		console.log('FilterTrips', filterTrips)

		return { filterTrips, filterConfig }
	}, [
		selectedTypes,
		selectedDistanceRange,
		selectedVehicleIds,
		selectedStartDate,
		selectedEndDate,
		selectedTripIds,
		showCustomTrip,
		showFullData,
		trips?.length,
	])

	const tripCityDetailsMap = useRef<{
		[tripId: string]: {
			start: protoRoot.trip.ITripCity
			end: protoRoot.trip.ITripCity
		}
	}>({})

	const renderTrips = useMemo(() => {
		const trips = FilterTrips({
			selectedTripTypes: selectedTypes,
			shortestDistance: selectedDistanceRange.minDistance,
			longestDistance: selectedDistanceRange.maxDistance,
			showCustomTrip: showCustomTrip,
			selectedVehicleIds: selectedVehicleIds,
			startDate: selectedStartDate,
			endDate: selectedEndDate,
			selectedTripIds: [],
		})

		// console.log('baseTrips jm renderTrips', trips, {
		// 	selectedTripTypes: selectedTypes,
		// 	shortestDistance: selectedDistanceRange.minDistance,
		// 	longestDistance: selectedDistanceRange.maxDistance,
		// 	showCustomTrip: showCustomTrip,
		// 	selectedVehicleIds: selectedVehicleIds,
		// 	startDate: selectedStartDate,
		// 	endDate: selectedEndDate,
		// 	selectedTripIds: [],
		// })
		trips.forEach((v) => {
			const citiesMap =
				v.cities?.reduce(
					(results, v) => {
						v.entryTimes?.forEach((sv) => {
							// v.cityDetails = v.cityDetails?.slice(
							// 	v.cityDetails?.length - 3,
							// 	v.cityDetails.length - 1
							// )
							results[Number(sv.timestamp)] = v
						})

						return results
					},
					{} as {
						[time: number]: protoRoot.trip.ITripCity
					}
				) || {}
			const times = Object.keys(citiesMap).map((v) => Number(v))
			const startTime = Math.min(...times)
			const endTime = Math.max(...times)

			tripCityDetailsMap.current[v?.id || ''] = {
				start: citiesMap[startTime],
				end: citiesMap[endTime],
			}
		})
		return trips
	}, [
		selectedTypes,
		selectedDistanceRange,
		selectedVehicleIds,
		selectedStartDate,
		selectedEndDate,
		selectedTripIds,
		showCustomTrip,
		trips?.length,
	])

	const loadData = () => {
		const pn = pageNum + 1
		if (pn * pageSize > (trips?.length || 0)) {
			setLoadStatus('noMore')
		}
		setPageNum(pn)
	}

	const { menuWidth, menuItemWidth } = useMemo(() => {
		let menuWidth = '410px'
		let menuItemWidth = '118px'

		if (config.deviceType === 'Mobile') {
			menuWidth = config.deviceWH.w + 'px'
			menuItemWidth = (config.deviceWH.w - 60) / 3 + 'px'
		}

		return {
			menuWidth,
			menuItemWidth,
		}
	}, [config.deviceType])

	const [mainHeight, setMainHeight] = useState(0)

	return (
		<NoSSR>
			<saki-aside-modal
				ref={bindEvent({
					close: (e) => {
						onclose()
					},
				})}
				visible={visible}
				vertical='Center'
				horizontal='Right'
				width='100%'
				height={mainHeight > config.deviceWH.h ? '100%' : ''}
				max-width={config.deviceType === 'Mobile' ? '100%' : '410px'}
				max-height={'100%'}
				mask
				mask-closable
				// height='86%'
				padding='0 0 0px 0'
				// margin='0 50px 0 0'
				background-color='#fff'
				border-radius={config.deviceType === 'Mobile' ? '0px' : '10px'}
				offset-x={config.deviceType === 'Mobile' ? 0 : 50}
				z-index='1100'
			>
				<div className='filter-component'>
					<div className='filter-type-header'>
						<saki-modal-header
							// border
							back-icon={false}
							close-icon={true}
							center-width={'0px'}
							right-width={'120px'}
							// border={true}
							ref={bindEvent({
								close() {
									onclose()
								},
							})}
							background-color={'rgba(255,255,255,1)'}
							title={
								layout.openVisitedCitiesModal?.title ||
								t('filter', {
									ns: 'prompt',
								})
							}
						>
							<div
								className='ft-h-right'
								style={{
									margin: '0 10px 0 0',
								}}
								slot='right'
							>
								<SakiButton
									onTap={() => {
										clear()
									}}
									padding='6px 10px'
									margin='0 0 0 6px'
									type='Normal'
								>
									<span
										style={{
											whiteSpace: 'nowrap',
										}}
									>
										{t('clear', {
											ns: 'prompt',
										})}
									</span>
								</SakiButton>
								<SakiButton
									onTap={() => {
										onLoad?.(filterConfig, filterTrips)
									}}
									padding='6px 10px'
									margin='0 0 0 6px'
									border='none'
									type='Primary'
								>
									<span
										style={{
											whiteSpace: 'nowrap',
										}}
									>
										{t('filter', {
											ns: 'prompt',
										}) + (filterTrips.length ? ` (${filterTrips.length})` : '')}
									</span>
								</SakiButton>
							</div>
						</saki-modal-header>
					</div>
					<saki-scroll-view mode='Custom'>
						<div
							ref={(e) => {
								if (e?.offsetHeight && e?.offsetHeight !== mainHeight) {
									console.log('fffff', e?.offsetHeight)
									setMainHeight(e?.offsetHeight)
								}
							}}
							className='filter-type-main'
						>
							{selectTypes ? (
								<>
									<SakiTitle level={4} padding='0 14px' color='default'>
										{t('type', {
											ns: 'tripPage',
										})}
									</SakiTitle>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												console.log(e.detail)

												const fileterTypes = selectedTypes.filter(
													(sv) => sv === e.detail.value
												)

												setSelectedTypes?.(
													fileterTypes?.length
														? selectedTypes?.filter(
																(sv) => sv !== e.detail.value
														  )
														: selectedTypes?.concat(e.detail.value)
												)
											},
										})}
										type='Icons'
										width={menuWidth}
										padding='10px'
									>
										{config.tripTypes
											.filter((v) => v !== 'Local')
											.map((v, i) => {
												const distance =
													Math.round(
														(trip.tripStatistics?.filter(
															(sv) => sv.type === (v as any)
														)?.[0]?.distance || 0) / 100
													) / 10 || 0

												return (
													<saki-menu-item
														width={menuItemWidth}
														key={i}
														border-radius='6px'
														padding='4px 0px'
														margin='4px 6px'
														value={v}
														border={
															selectedTypes.filter((sv) => sv === v)?.length >=
															1
																? '1px solid var(--saki-default-color)'
																: '1px solid #eee'
														}
														background-color={
															selectedTypes.filter((sv) => sv === v)?.length >=
															1
																? '#f7ecef'
																: '#fff'
														}
														active={
															selectedTypes.filter((sv) => sv === v)?.length >=
															1
														}
													>
														<div className='ftd-item'>
															{
																// v === 'Local' ? (
																// 	<saki-icon
																// 		width='36px'
																// 		height='19px'
																// 		type={'Send'}
																// 		color='var(--saki-default-color)'
																// 	></saki-icon>
																// ) :
																v === 'Drive' ? (
																	<saki-icon
																		width='36px'
																		height='25px'
																		type={'Drive'}
																		color='var(--saki-default-color)'
																	></saki-icon>
																) : v === 'Motorcycle' ? (
																	<saki-icon
																		width='36px'
																		height='18px'
																		type={'Motorcycle'}
																		color='var(--saki-default-color)'
																	></saki-icon>
																) : v === 'Plane' ? (
																	<saki-icon
																		width='36px'
																		height='19px'
																		type={'Plane'}
																		color='var(--saki-default-color)'
																	></saki-icon>
																) : v === 'PublicTransport' ? (
																	<saki-icon
																		width='36px'
																		height='19px'
																		type={'PublicTransport'}
																		color='var(--saki-default-color)'
																	></saki-icon>
																) : v === 'Train' ? (
																	<saki-icon
																		width='36px'
																		height='20px'
																		type={'Train'}
																		color='var(--saki-default-color)'
																	></saki-icon>
																) : (
																	<saki-icon
																		width='36px'
																		height='24px'
																		type={v}
																		color='var(--saki-default-color)'
																	></saki-icon>
																)
															}
															<div className='ftd-right'>
																<span className='ftd-r-title '>
																	{t(v.toLowerCase(), {
																		ns: 'tripPage',
																	})}
																</span>
																<span className='ftd-r-distance'>
																	{distance}
																	km
																</span>
															</div>
														</div>
													</saki-menu-item>
												)
											})}
									</saki-menu>
								</>
							) : (
								''
							)}
							{date ? (
								<SakiTitle level={4} padding='0 14px' color='default'>
									{t('date', {
										ns: 'tripPage',
									})}
								</SakiTitle>
							) : (
								''
							)}
							{date ? (
								<div className='ftd-l-date'>
									<div className='ftd-l-d-content'>
										<saki-input
											ref={bindEvent({
												changevalue: (e: any) => {
													// console.log("Dom发生了变化", e)
													if (!e.detail) {
														setSelectedStartDate?.('')
														return
													}
													const dateArr = e.detail.split('-')
													const y = Number(dateArr[0])
													const m = Number(dateArr[1])
													const d = Number(dateArr[2])
													const date = new Date(y + '-' + m + '-' + d)
													const t = date.getTime()
													if (
														!!t &&
														y > 1000 &&
														m >= 0 &&
														m <= 11 &&
														d >= 0 &&
														d <= 31
													) {
														setSelectedStartDate?.(
															moment(e.detail).format('YYYY-MM-DD')
														)
													}
												},
												focusfunc: () => {
													console.log('focus')
													setOpenStartDateDatePicker(true)
												},
											})}
											width='100px'
											padding='10px 4px'
											value={
												selectedStartDate
													? moment(selectedStartDate).format('YYYY-MM-DD')
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
										<span
											style={{
												margin: '0 6px',
											}}
										>
											-
										</span>
										<saki-input
											ref={bindEvent({
												changevalue: (e: any) => {
													console.log(e)
													if (!e.detail) {
														setSelectedEndDate?.('')
														return
													}
													const dateArr = e.detail.split('-')
													const y = Number(dateArr[0])
													const m = Number(dateArr[1])
													const d = Number(dateArr[2])
													const date = new Date(y + '-' + m + '-' + d)
													const t = date.getTime()
													if (
														!!t &&
														y > 1000 &&
														m >= 0 &&
														m <= 11 &&
														d >= 0 &&
														d <= 31
													) {
														setSelectedEndDate?.(
															moment(e.detail + ' 23:59:59').format(
																'YYYY-MM-DD'
															)
														)
													}
												},
												focusfunc: () => {
													console.log('focus')
													setOpenEndDateDatePicker(true)
												},
											})}
											width='100px'
											padding='10px 4px'
											value={
												selectedEndDate
													? moment(selectedEndDate).format('YYYY-MM-DD')
													: ''
											}
											border-radius='6px'
											font-size='14px'
											margin='0 0'
											placeholder={t('now', {
												ns: 'trackRoutePage',
											})}
											color='#999'
											border='1px solid #eee'
											text-align='center'
										></saki-input>
									</div>
								</div>
							) : (
								''
							)}
							{date ? (
								<>
									<saki-date-picker
										ref={bindEvent({
											close: () => {
												setOpenStartDateDatePicker(false)
											},
											selectdate: (e) => {
												// console.log("Dom发生了变化`1111111", e)
												setOpenStartDateDatePicker(false)

												if (!e.detail.date) {
													setSelectedStartDate?.('')
													return
												}
												setSelectedStartDate?.(
													moment(e.detail.date).format('YYYY-MM-DD')
												)
											},
										})}
										date={selectedStartDate}
										visible={openStartDateDatePicker}
										cancel-button
										// time-picker
										mask
										z-index={1300}
									></saki-date-picker>
									<saki-date-picker
										ref={bindEvent({
											close: () => {
												setOpenEndDateDatePicker(false)
											},
											selectdate: (e) => {
												setOpenEndDateDatePicker(false)
												if (!e.detail.date) {
													setSelectedEndDate?.('')
													return
												}
												setSelectedEndDate?.(
													moment(e.detail.date + ' 23:59:59').format(
														'YYYY-MM-DD'
													)
												)
											},
										})}
										date={selectedEndDate}
										visible={openEndDateDatePicker}
										cancel-button
										// time-picker
										mask
										z-index={1300}
									></saki-date-picker>
								</>
							) : (
								''
							)}

							{selectVehicle && vehicle.vehicles.length ? (
								<>
									<SakiTitle
										margin='6px 0 6px 0'
										level={4}
										padding='0 14px'
										color='default'
									>
										{t('pageTitle', {
											ns: 'vehicleModal',
										})}
									</SakiTitle>
									<div className='ftd-l-vehicle'>
										<saki-menu
											ref={bindEvent({
												selectvalue: async (e) => {
													setSelectedVehicleIds?.(
														selectedVehicleIds.filter(
															(sv) => sv === e.detail.value
														).length >= 1
															? selectedVehicleIds.filter(
																	(sv) => sv !== e.detail.value
															  )
															: [...selectedVehicleIds, e.detail.value]
													)
												},
											})}
											type='Icons'
											width={menuWidth}
											padding='0 10px'
										>
											{vehicle.vehicles.map((v, i) => {
												return (
													<saki-menu-item
														width={menuItemWidth}
														key={i}
														border-radius='6px'
														padding='4px 0px'
														margin='4px 6px'
														value={v.id}
														border={
															selectedVehicleIds.filter((sv) => sv === v.id)
																?.length >= 1
																? '1px solid var(--saki-default-color)'
																: '1px solid #eee'
														}
														background-color={
															selectedVehicleIds.filter((sv) => sv === v.id)
																?.length >= 1
																? '#f7ecef'
																: '#fff'
														}
														active={
															selectedVehicleIds.filter((sv) => sv === v.id)
																?.length >= 1
														}
													>
														<div className='ftd-v-item'>
															<VehicleLogo
																icon={v?.type || ''}
																style={{
																	margin: '0 4px 0 0',
																}}
															></VehicleLogo>

															<div className='ftd-v-i-right'>
																<span
																	className='text-two-elipsis'
																	style={{
																		color: '#666',
																	}}
																	title={v?.name || ''}
																>
																	{v?.name || ''}
																</span>
																<span
																	style={{
																		color: '#666',
																		fontSize: '10px',
																	}}
																>
																	{Math.round(
																		(trip.tripStatistics
																			.filter((v) => v.type === 'All')?.[0]
																			?.list?.filter(
																				(sv) => sv.vehicle?.id === v.id
																			)
																			.reduce((t, ssv) => {
																				return (
																					t + (ssv.statistics?.distance || 0)
																				)
																			}, 0) || 0) / 1000
																	) + 'km'}
																</span>
															</div>
														</div>
													</saki-menu-item>
												)
											})}
										</saki-menu>
									</div>
								</>
							) : (
								''
							)}

							{distanceRange ? (
								<>
									<SakiTitle
										margin='6px 0 6px 0'
										level={4}
										padding='0 14px'
										color='default'
									>
										{t('distance', {
											ns: 'tripPage',
										})}
									</SakiTitle>
									<div className='ftd-l-distance'>
										<div className='ftd-l-d-speed'>
											<span>{selectedDistanceRange.minDistance}km</span>
											<span>
												{selectedDistanceRange.maxDistance === 500
													? '500km+'
													: selectedDistanceRange.maxDistance + 'km'}
											</span>
										</div>
										<saki-slider
											ref={bindEvent({
												changevalue(e) {
													console.log('onChangevalue', e)

													if (e.detail?.length === 2) {
														setSelectedDistanceRange?.({
															minDistance: Number(e.detail?.[0]),
															maxDistance: Number(e.detail?.[1]),
														})
													}
												},
											})}
											min={0}
											max={500}
											value={[
												selectedDistanceRange.minDistance,
												selectedDistanceRange.maxDistance,
											].join(';')}
											bg-color='rgb(243,243,243)'
											bg-hover-color='#eee'
											track-color={['var(--saki-default-color)'].join(';')}
											marks={[
												{
													val: 5,
													text: 5 + 'km',
													style: {
														color: 'var(--saki-default-color)',
														transform: 'translateX(-8px)',
														fontWeight: 700,
													},
												},
												{
													val: 100,
													text: 100 + 'km',
													style: {
														color: 'var(--saki-default-color)',
														// fontWeight: 700,
													},
												},
												{
													val: 200,
													text: 200 + 'km',
													style: {
														color: 'var(--saki-default-color)',
														// fontWeight: 700,
													},
												},
												{
													val: 500,
													text: '500km+',
													style: {
														color: 'var(--saki-default-color)',
														transform: 'translateX(-44px)',
														fontWeight: 700,
													},
												},
											]
												.map((v) => JSON.stringify(v))
												.join(';')}
											tool-tip={true}
											disabled={false}
											width={'100%'}
											max-width={'100%'}
											height={'12px'}
											margin='10px 0 34px'
											padding='0 20px 0 24px'
											border-radius='6px'
										></saki-slider>
									</div>
								</>
							) : (
								''
							)}

							{customTripSwitch || fullDataSwitch ? (
								<div className='ftd-l-customtrip'>
									{fullDataSwitch ? (
										<>
											<span>
												{t('showSeedColor', {
													ns: 'trackRoutePage',
												})}
											</span>
											<saki-switch
												ref={bindEvent({
													change: (e) => {
														setShowFullData?.(Boolean(e.detail))
													},
												})}
												height='24px'
												value={showFullData}
											></saki-switch>
										</>
									) : (
										''
									)}
									{customTripSwitch ? (
										<>
											<span
												style={{
													margin: '0 0 0 6px',
												}}
											>
												{showCustomTrip
													? t('onlyShowCustomTrip', {
															ns: 'trackRoutePage',
													  })
													: t('onlyShowCustomTrip', {
															ns: 'trackRoutePage',
													  })}
											</span>
											<saki-switch
												ref={bindEvent({
													change: (e) => {
														setShowCustomTrip?.(Boolean(e.detail))
													},
												})}
												height='24px'
												value={showCustomTrip}
											></saki-switch>
										</>
									) : (
										''
									)}
								</div>
							) : (
								''
							)}

							{dataList ? (
								<>
									<div className='ftd-l-header'>
										<div className='ftd-l-h-left'>
											<saki-button
												ref={bindEvent({
													tap: () => {
														// onDataList?.(
														// 	(trips?.map((v) => v?.id) || []) as string[]
														// )
														setSelectedTripIds(
															(renderTrips?.map((v) => v?.id) || []) as string[]
														)
													},
												})}
											>
												{t('selectAll', {
													ns: 'trackRoutePage',
												})}
											</saki-button>
											<span className='ftd-l-h-l-count'>
												{selectedTripIds?.length + '/' + renderTrips?.length}
											</span>
											<saki-icon
												width='14px'
												height='14px'
												color='#999'
												margin={'1px 0 0 6px'}
												type='Detail'
												title={t('selectedTripIdsTip', {
													ns: 'settings',
												})}
											></saki-icon>
											{/* <saki-tooltip
												title={t('selectedTripIdsTip', {
													ns: 'settings',
												})}
											>
												<saki-icon
													width='14px'
													height='14px'
													color='#999'
													margin={'2px 0 0 6px'}
													type='Detail'
												></saki-icon>
											</saki-tooltip> */}
										</div>
										{selectedTripIds?.length ? (
											<saki-button
												ref={bindEvent({
													tap: () => {
														// onDataList?.([])
														setSelectedTripIds([])
													},
												})}
											>
												{t('uncheck', {
													ns: 'trackRoutePage',
												})}
											</saki-button>
										) : (
											''
										)}
									</div>
									<div className='ftd-list'>
										<saki-checkbox
											ref={bindEvent({
												async selectvalue(e) {
													console.log(e.detail.values)
													setSelectedTripIds(e.detail.values)
													// onDataList?.(e.detail.values)
													// store.dispatch(methods.config.setLanguage(e.detail.value))
												},
											})}
											value={selectedTripIds?.join(',')}
											flex-direction='Column'
											type='Checkbox'
										>
											<div className='ftd-l-list'>
												{renderTrips
													?.slice(0, pageNum * pageSize)
													?.map((v, i) => {
														// console.log('tripstrips', v)
														const cityDetails =
															tripCityDetailsMap.current[v?.id || '']

														const startCityDetails =
															cityDetails?.start?.cityDetails || []
														const endCityDetails =
															cityDetails?.end?.cityDetails || []
														return (
															// <div key={i} className='ftd-l-item'>
															// 	{v.id}
															// </div>

															<saki-checkbox-item
																key={i}
																margin='14px 10px'
																value={v.id}
															>
																<div
																	className={
																		'ftd-l-item ' + v.type + ' ' + config.lang
																	}
																>
																	<div className='item-top'>
																		<span className='name'>
																			{t((v.type || '')?.toLowerCase(), {
																				ns: 'tripPage',
																			}) +
																				' · ' +
																				formatDistance(
																					v.statistics?.distance || 0
																				)}
																		</span>
																		<span className='date'>
																			{v.status === 1
																				? moment(
																						Number(v.createTime) * 1000
																				  ).format('YY.MM.DD')
																				: t('unfinished', {
																						ns: 'tripPage',
																				  })}
																		</span>
																	</div>
																	{/* <div className='item-center'>
																		{v.status === 1
																			? moment(
																					Number(v.createTime) * 1000
																			  ).format('YYYY.MM.DD')
																			: t('unfinished', {
																					ns: 'tripPage',
																			  })}
																	</div> */}
																	{startCityDetails.length &&
																	endCityDetails.length ? (
																		<div className='item-bottom'>
																			{/* <span className='date'>
																				{v.status === 1
																					? moment(
																							Number(v.createTime) * 1000
																					  ).format('YYYY.MM.DD')
																					: t('unfinished', {
																							ns: 'tripPage',
																					  })}
																			</span> */}
																			<span>
																				{`${startCityDetails
																					.slice(
																						startCityDetails.length - 3,
																						startCityDetails.length - 1
																					)
																					.map((v) =>
																						getSimpleCityName(
																							getCityName(v.name) || '',
																							convertCityLevelToTypeString(
																								v.level || 1
																							)
																						)
																					)
																					.join('')} ~ ${endCityDetails
																					.slice(
																						endCityDetails.length - 3,
																						endCityDetails.length - 1
																					)
																					.map((v) =>
																						getSimpleCityName(
																							getCityName(v.name) || '',
																							convertCityLevelToTypeString(
																								v.level || 1
																							)
																						)
																					)
																					.join('')}`}
																			</span>
																			{/* <span> 至 </span>
																		<span>
																			{}
																		</span> */}
																		</div>
																	) : (
																		''
																	)}
																</div>
															</saki-checkbox-item>
														)
													})}
											</div>
										</saki-checkbox>

										<SakiScrollLoading
											onLoadData={() => {
												// console.log('出现了3333')
												loadData()
											}}
											onTap={() => {
												loadData()
											}}
											margin='10px 0'
											type={loadStatus}
										></SakiScrollLoading>
									</div>
								</>
							) : (
								''
							)}

							{buttons?.length ? (
								<div className='ftd-buttons'>
									{buttons?.map((v, i) => {
										return (
											<saki-button
												ref={bindEvent({
													tap: () => {
														// clearFilterData()
														// loadNewData()
														// setOpenFilterDropdown(false)
														v.onTap?.()
													},
												})}
												height='34px'
												padding='8px 10px'
												margin='0 0 0 6px'
												type={v.type}
												key={i}
											>
												<span>{v.text}</span>
											</saki-button>
										)
									})}
								</div>
							) : (
								''
							)}
						</div>
					</saki-scroll-view>
				</div>
			</saki-aside-modal>
		</NoSSR>
	)
}
export default FilterComponent
