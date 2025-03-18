import Head from 'next/head'
import TripLaout from '../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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

const FilterComponent = ({
	visible,
	onclose,
	selectTypes,
	onSelectTypes,
	date,
	startDate,
	endDate,
	selectStartDate,
	selectEndDate,
	dataList,
	trips,
	selectTripIds,
	onDataList,
	selectVehicle,
	distanceRange,
	onSelectDistance,
	buttons,
	selectVehicleIds = [],
	onSelectVehicleIds,

	customTripSwitch,
	showCustomTrip,
	onShowCustomTrip,
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
	showCustomTrip?: boolean
	onShowCustomTrip?: (showCustomTrip: boolean) => void
}) => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const config = useSelector((state: RootState) => state.config)
	const trip = useSelector((state: RootState) => state.trip)
	const layout = useSelector((state: RootState) => state.layout)
	const user = useSelector((state: RootState) => state.user)
	const vehicle = useSelector((state: RootState) => state.vehicle)

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

	const menuWidth = '280px'
	const menuItemWidth = '118px'

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
				mask
				mask-closable
				// height='86%'
				padding='0 0 0px 0'
				margin='0 50px 0 0'
				background-color='#fff'
				border-radius='10px'
				z-index='1100'
			>
				<saki-scroll-view mode='Auto'>
					<div>
						<div className='filter-type-dropdown' slot='main'>
							{selectTypes ? (
								<saki-menu
									ref={bindEvent({
										selectvalue: async (e) => {
											console.log(e.detail)

											const fileterTypes = selectTypes.filter(
												(sv) => sv === e.detail.value
											)

											onSelectTypes?.(
												fileterTypes?.length
													? selectTypes?.filter((sv) => sv !== e.detail.value)
													: selectTypes?.concat(e.detail.value)
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
														selectTypes.filter((sv) => sv === v)?.length >= 1
															? '1px solid var(--saki-default-color)'
															: '1px solid #eee'
													}
													background-color={
														selectTypes.filter((sv) => sv === v)?.length >= 1
															? '#f7ecef'
															: '#fff'
													}
													active={
														selectTypes.filter((sv) => sv === v)?.length >= 1
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
														selectStartDate?.('')
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
														selectStartDate?.(
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
												startDate ? moment(startDate).format('YYYY-MM-DD') : ''
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
														selectEndDate?.('')
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
														selectEndDate?.(
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
												endDate ? moment(endDate).format('YYYY-MM-DD') : ''
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
													selectStartDate?.('')
													return
												}
												selectStartDate?.(
													moment(e.detail.date).format('YYYY-MM-DD')
												)
											},
										})}
										date={startDate}
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
													selectEndDate?.('')
													return
												}
												selectEndDate?.(
													moment(e.detail.date + ' 23:59:59').format(
														'YYYY-MM-DD'
													)
												)
											},
										})}
										date={endDate}
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
								<div className='ftd-l-vehicle'>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												onSelectVehicleIds?.(
													selectVehicleIds.filter((sv) => sv === e.detail.value)
														.length >= 1
														? selectVehicleIds.filter(
																(sv) => sv !== e.detail.value
														  )
														: [...selectVehicleIds, e.detail.value]
												)
											},
										})}
										type='Icons'
										width={menuWidth}
										padding='10px'
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
														selectVehicleIds.filter((sv) => sv === v.id)
															?.length >= 1
															? '1px solid var(--saki-default-color)'
															: '1px solid #eee'
													}
													background-color={
														selectVehicleIds.filter((sv) => sv === v.id)
															?.length >= 1
															? '#f7ecef'
															: '#fff'
													}
													active={
														selectVehicleIds.filter((sv) => sv === v.id)
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
																			return t + (ssv.statistics?.distance || 0)
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
							) : (
								''
							)}

							{distanceRange ? (
								<div className='ftd-l-distance'>
									<div className='ftd-l-d-speed'>
										<span>{distanceRange.minDistance}km</span>
										<span>
											{distanceRange.maxDistance === 500
												? '500km+'
												: distanceRange.maxDistance + 'km'}
										</span>
									</div>
									<saki-slider
										ref={bindEvent({
											changevalue(e) {
												console.log('onChangevalue', e)

												if (e.detail?.length === 2) {
													onSelectDistance?.({
														minDistance: Number(e.detail?.[0]),
														maxDistance: Number(e.detail?.[1]),
													})
												}
											},
										})}
										min={0}
										max={500}
										value={[
											distanceRange.minDistance,
											distanceRange.maxDistance,
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
							) : (
								''
							)}

							{customTripSwitch ? (
								<div className='ftd-l-customtrip'>
									<span>
										{showCustomTrip
											? t('showAllTrip', {
													ns: 'trackRoutePage',
											  })
											: t('onlyShowCustomTrip', {
													ns: 'trackRoutePage',
											  })}
									</span>
									<saki-switch
										ref={bindEvent({
											change: (e) => {
												// dispatch(
												// 	methods.config.SetConfigure({
												// 		...config.configure,
												// 		roadColorFade: Boolean(e.detail),
												// 	})
												// )
												onShowCustomTrip?.(Boolean(e.detail))
											},
										})}
										height='24px'
										value={showCustomTrip}
									></saki-switch>
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
														onDataList?.(
															(trips?.map((v) => v?.id) || []) as string[]
														)
													},
												})}
											>
												{t('selectAll', {
													ns: 'trackRoutePage',
												})}
											</saki-button>
											<span className='ftd-l-h-l-count'>
												{selectTripIds?.length + '/' + trips?.length}
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
										{selectTripIds?.length ? (
											<saki-button
												ref={bindEvent({
													tap: () => {
														onDataList?.([])
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
													onDataList?.(e.detail.values)
													// store.dispatch(methods.config.setLanguage(e.detail.value))
												},
											})}
											value={selectTripIds?.join(',')}
											flex-direction='Column'
											type='Checkbox'
										>
											{trips?.map((v, i) => {
												// console.log('tripstrips', v)
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
															<span className='name'>
																{t((v.type || '')?.toLowerCase(), {
																	ns: 'tripPage',
																}) +
																	' · ' +
																	formatDistance(v.statistics?.distance || 0)}
															</span>
															<span className='date'>
																{v.status === 1
																	? moment(Number(v.createTime) * 1000).format(
																			'YYYY.MM.DD'
																	  )
																	: t('unfinished', {
																			ns: 'tripPage',
																	  })}
															</span>
														</div>
													</saki-checkbox-item>
												)
											})}
										</saki-checkbox>
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
					</div>
				</saki-scroll-view>
			</saki-aside-modal>
		</NoSSR>
	)
}
export default FilterComponent
