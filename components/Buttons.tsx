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

	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()

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
					<saki-dropdown
						visible={layout.openTripTrackFilterModal}
						floating-direction='Left'
						ref={bindEvent({
							close: (e) => {
								dispatch(layoutSlice.actions.setOpenTripTrackFilterModal(false))
							},
						})}
					>
						<div className='md-button'>
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
						</div>
						<div className='filter-type-dropdown' slot='main'>
							<saki-menu
								ref={bindEvent({
									selectvalue: async (e) => {
										console.log(e.detail)
										const fileterTypes = config.selectedTripTypes.filter(
											(sv) => sv === e.detail.value
										)
										dispatch(
											configSlice.actions.setSelectedTripTypes(
												fileterTypes?.length
													? config.selectedTripTypes.filter(
															(sv) => sv !== e.detail.value
													  )
													: [...config.selectedTripTypes, e.detail.value]
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
											padding='8px 0px'
											margin='4px 6px'
											value={v}
											border={
												config.selectedTripTypes.filter((sv) => sv === v)
													?.length >= 1
													? '1px solid var(--saki-default-color)'
													: '1px solid #eee'
											}
											background-color={
												config.selectedTripTypes.filter((sv) => sv === v)
													?.length >= 1
													? '#f7ecef'
													: '#fff'
											}
											active={
												config.selectedTripTypes.filter((sv) => sv === v)
													?.length >= 1
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
												) : (
													<saki-icon
														width='36px'
														height='24px'
														type={v}
														color='var(--saki-default-color)'
													></saki-icon>
												)}
												<div className='ftd-right'>
													<span className='ftd-r-title'>
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
							<div className='ftd-l-header'>
								<saki-button
									ref={bindEvent({
										tap: () => {
											dispatch(
												configSlice.actions.setSelectedTripIds(
													(trip.tripStatistics
														?.filter((v) => v.type === 'All')?.[0]
														?.list.map((v) => v.id) || []) as string[]
												)
											)
										},
									})}
								>
									全选
								</saki-button>
								{config.selectedTripIds.length ? (
									<saki-button
										ref={bindEvent({
											tap: () => {
												dispatch(configSlice.actions.setSelectedTripIds([]))
											},
										})}
									>
										取消选中
									</saki-button>
								) : (
									''
								)}
							</div>
							<saki-scroll-view height='300px'>
								<div className='ftd-list'>
									<saki-checkbox
										ref={bindEvent({
											async selectvalue(e) {
												console.log(e.detail.values)
												dispatch(
													configSlice.actions.setSelectedTripIds(
														e.detail.values
													)
												)
												// store.dispatch(methods.config.setLanguage(e.detail.value))
											},
										})}
										value={config.selectedTripIds.join(',')}
										flex-direction='Column'
										type='Checkbox'
									>
										{trip.tripStatistics
											.filter((v) => v.type === 'All')?.[0]
											?.list?.map((v, i) => {
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
							</saki-scroll-view>
						</div>
					</saki-dropdown>
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
			</NoSSR>
		</div>
	)
}
export default ButtonsComponent
