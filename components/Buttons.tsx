import Head from 'next/head'
import TripLaout from '../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../components/Footer'
import path from 'path'
import { AppDispatch, RootState, configSlice, layoutSlice } from '../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'

import NoSSR from '../components/NoSSR'
import { formatDistance } from '../plugins/methods'
import moment from 'moment'

const ButtonsComponent = ({
	indexPage = false,
	trackRoute = false,
	currentPosition = false,
	filter = false,
	layer = false,
	onCurrentPosition,
}: {
	indexPage?: boolean
	trackRoute?: boolean
	currentPosition?: boolean
	filter?: boolean
	layer?: boolean
	onCurrentPosition: () => void
}) => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const config = useSelector((state: RootState) => state.config)
	const trip = useSelector((state: RootState) => state.trip)
	const layout = useSelector((state: RootState) => state.layout)

	const startDate = useSelector(
		(state: RootState) => state.config.trackRoute.selectedDate.startDate
	)
	const endDate = useSelector(
		(state: RootState) => state.config.trackRoute.selectedDate.endDate
	)

	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()

	const [openStartDateDatePicker, setOpenStartDateDatePicker] = useState(false)
	const [openEndDateDatePicker, setOpenEndDateDatePicker] = useState(false)

	const filterList = () => {
		return (
			trip.tripStatistics
				?.filter((v) =>
					config.trackRoute.selectedTripTypes.length === 0
						? v.type === 'All'
						: config.trackRoute.selectedTripTypes.includes(v.type)
				)?.[0]
				?.list.filter((v) => {
					const ct = Number(v.createTime)
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
					// console.log('ct,st,et', ct, st, et)
					return ct >= st && ct <= et
				}) || []
		)
	}

	return (
		<div className='map-buttons-component'>
			<NoSSR>
				{indexPage && (
					<saki-button
						ref={bindEvent({
							tap: () => {
								console.log(router, location)
								router.replace('/' + (router.query.lang || ''))
							},
						})}
						padding='24px'
						margin='16px 0 0 0'
						type='CircleIconGrayHover'
						box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
					>
						<saki-icon
							color='var(--saki-default-color)'
							width='22px'
							height='22px'
							type='Index'
						></saki-icon>
					</saki-button>
				)}
				{trackRoute && (
					<saki-button
						ref={bindEvent({
							tap: () => {
								router.push(
									(router.query.lang ? '/' + (router.query.lang || '') : '') +
										'/trackRoute'
								)
								// dispatch(layoutSlice.actions.setOpenTripTrackRoute(true))
							},
						})}
						padding='24px'
						margin='16px 0 0 0'
						type='CircleIconGrayHover'
						box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
					>
						<saki-icon
							color='var(--saki-default-color)'
							width='22px'
							height='22px'
							type='Route'
						></saki-icon>
					</saki-button>
				)}

				{filter && (
					<>
						<saki-button
							ref={bindEvent({
								tap: () => {
									dispatch(
										layoutSlice.actions.setOpenTripTrackFilterModal(
											!layout.openTripHistoryModal
										)
									)
								},
							})}
							padding='24px'
							margin='16px 0 0 0'
							type='CircleIconGrayHover'
							box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
						>
							<saki-icon
								color='var(--saki-default-color)'
								width='26px'
								height='26px'
								type='FilterFill'
							></saki-icon>
						</saki-button>
						<saki-aside-modal
							ref={bindEvent({
								close: (e) => {
									dispatch(
										layoutSlice.actions.setOpenTripTrackFilterModal(false)
									)
								},
							})}
							visible={layout.openTripTrackFilterModal}
							vertical='Center'
							horizontal='Right'
							mask
							mask-closable
							// height='86%'
							padding='0 0 20px 0'
							margin='0 50px 0 0'
							background-color='#fff'
							border-radius='10px'
						>
							<div>
								<div className='md-button'></div>
								<div className='filter-type-dropdown' slot='main'>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												console.log(e.detail)
												const fileterTypes =
													config.trackRoute.selectedTripTypes.filter(
														(sv) => sv === e.detail.value
													)
												dispatch(
													configSlice.actions.setTrackRouteSelectedTripTypes(
														fileterTypes?.length
															? config.trackRoute.selectedTripTypes.filter(
																	(sv) => sv !== e.detail.value
															  )
															: [
																	...config.trackRoute.selectedTripTypes,
																	e.detail.value,
															  ]
													)
												)
												dispatch(
													layoutSlice.actions.setOpenTripTrackFilterModal(true)
												)
											},
										})}
										type='Icons'
										width='240px'
										padding='10px'
									>
										{config.tripTypes.map((v, i) => {
											const distance =
												Math.round(
													(trip.tripStatistics?.filter(
														(sv) => sv.type === (v as any)
													)?.[0]?.distance || 0) / 100
												) / 10 || 0

											return (
												<saki-menu-item
													width='98px'
													key={i}
													border-radius='6px'
													padding='4px 0px'
													margin='4px 6px'
													value={v}
													border={
														config.trackRoute.selectedTripTypes.filter(
															(sv) => sv === v
														)?.length >= 1
															? '1px solid var(--saki-default-color)'
															: '1px solid #eee'
													}
													background-color={
														config.trackRoute.selectedTripTypes.filter(
															(sv) => sv === v
														)?.length >= 1
															? '#f7ecef'
															: '#fff'
													}
													active={
														config.trackRoute.selectedTripTypes.filter(
															(sv) => sv === v
														)?.length >= 1
													}
												>
													<div className='ftd-item'>
														{v === 'Local' ? (
															<saki-icon
																width='36px'
																height='19px'
																type={'Send'}
																color='var(--saki-default-color)'
															></saki-icon>
														) : v === 'Drive' ? (
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
														)}
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
									<div className='ftd-l-date'>
										<div className='ftd-l-d-content'>
											<saki-input
												ref={bindEvent({
													changevalue: (e: any) => {
														console.log(e)
														if (!e.detail) {
															dispatch(
																configSlice.actions.setTrackRouteSelectedStartDate(
																	''
																)
															)
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
															dispatch(
																configSlice.actions.setTrackRouteSelectedStartDate(
																	moment(e.detail).format('YYYY-MM-DD')
																)
															)
														}
													},
													focusfunc: () => {
														console.log('focus')
														setOpenStartDateDatePicker(true)
													},
												})}
												width='100px'
												padding='6px 0'
												value={
													startDate
														? moment(startDate).format('YYYY-MM-DD')
														: ''
												}
												border-radius='10px'
												font-size='14px'
												margin='0 0'
												placeholder={t('startDate', {
													ns: 'trackRoutePage',
												})}
												color='#999'
												border='1px solid var(--defaul-color)'
											></saki-input>
											<span>-</span>
											<saki-input
												ref={bindEvent({
													changevalue: (e: any) => {
														console.log(e)
														if (!e.detail) {
															dispatch(
																configSlice.actions.setTrackRouteSelectedEndDate(
																	''
																)
															)
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
															dispatch(
																configSlice.actions.setTrackRouteSelectedEndDate(
																	moment(e.detail).format('YYYY-MM-DD')
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
												padding='6px 0'
												value={
													endDate ? moment(endDate).format('YYYY-MM-DD') : ''
												}
												border-radius='10px'
												font-size='14px'
												margin='0 0'
												placeholder={t('endDate', {
													ns: 'trackRoutePage',
												})}
												color='#999'
												border='1px solid var(--defaul-color)'
												text-align='right'
											></saki-input>
										</div>
									</div>
									<div className='ftd-l-header'>
										<saki-button
											ref={bindEvent({
												tap: () => {
													dispatch(
														configSlice.actions.setTrackRouteSelectedTripIds(
															(filterList().map((v) => v.id) || []) as string[]
														)
													)
												},
											})}
										>
											全选
										</saki-button>
										{config.trackRoute.selectedTripIds.length ? (
											<saki-button
												ref={bindEvent({
													tap: () => {
														dispatch(
															configSlice.actions.setTrackRouteSelectedTripIds(
																[]
															)
														)
													},
												})}
											>
												取消选中
											</saki-button>
										) : (
											''
										)}
									</div>
									<saki-scroll-view height='260px'>
										<div className='ftd-list'>
											<saki-checkbox
												ref={bindEvent({
													async selectvalue(e) {
														console.log(e.detail.values)
														dispatch(
															configSlice.actions.setTrackRouteSelectedTripIds(
																e.detail.values
															)
														)
														// store.dispatch(methods.config.setLanguage(e.detail.value))
													},
												})}
												value={config.trackRoute.selectedTripIds.join(',')}
												flex-direction='Column'
												type='Checkbox'
											>
												{filterList()?.map((v, i) => {
													return (
														// <div key={i} className='ftd-l-item'>
														// 	{v.id}
														// </div>
														<saki-checkbox-item
															key={i}
															padding='14px 10px'
															margin='0px'
															value={v.id}
														>
															<div className='ftd-l-item'>
																<span className='name'>
																	{t((v.type || '')?.toLowerCase(), {
																		ns: 'tripPage',
																	}) +
																		' · ' +
																		formatDistance(v.statistics?.distance || 0)}
																</span>
																<span className='date'>
																	{v.status === 1
																		? moment(
																				Number(v.createTime) * 1000
																		  ).format('YYYY.MM.DD')
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
									</saki-scroll-view>
								</div>
							</div>
						</saki-aside-modal>
					</>
				)}
				{layer && (
					<saki-button
						ref={bindEvent({
							tap: () => {
								dispatch(layoutSlice.actions.setSettingType('Maps'))
								dispatch(layoutSlice.actions.setOpenSettingsModal(true))
							},
						})}
						padding='24px'
						margin='16px 0 0 0'
						type='CircleIconGrayHover'
						box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
					>
						<saki-icon
							color='var(--saki-default-color)'
							width='28px'
							height='28px'
							type='Layer'
						></saki-icon>
					</saki-button>
				)}
				{currentPosition && (
					<saki-button
						ref={bindEvent({
							tap: () => {
								onCurrentPosition()
							},
						})}
						padding='24px'
						margin='16px 0 0 0'
						type='CircleIconGrayHover'
						box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
					>
						<saki-icon
							color='var(--saki-default-color)'
							width='30px'
							height='30px'
							type='CurrentPosition'
						></saki-icon>
					</saki-button>
				)}

				<saki-date-picker
					ref={bindEvent({
						close: () => {
							setOpenStartDateDatePicker(false)
						},
						selectdate: (e) => {
							dispatch(
								configSlice.actions.setTrackRouteSelectedStartDate(
									moment(e.detail.date).format('YYYY-MM-DD')
								)
							)

							setOpenStartDateDatePicker(false)
						},
					})}
					date={startDate}
					visible={openStartDateDatePicker}
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
							dispatch(
								configSlice.actions.setTrackRouteSelectedEndDate(
									moment(e.detail.date).format('YYYY-MM-DD')
								)
							)

							setOpenEndDateDatePicker(false)
						},
					})}
					date={endDate}
					visible={openEndDateDatePicker}
					// time-picker
					mask
					z-index={1300}
				></saki-date-picker>
			</NoSSR>
		</div>
	)
}
export default ButtonsComponent
