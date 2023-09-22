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
	formatDistance,
	formatTime,
	getDistance,
	getLatLng,
	getSpeedColor,
	getZoom,
} from '../plugins/methods'
import Leaflet from 'leaflet'
import html2canvas from 'html2canvas'
import { cnMap, eventListener, osmMap, speedColorRGBs } from '../store/config'
import NoSSR from './NoSSR'

const TripEditComponent = memo(() => {
	const { t, i18n } = useTranslation('tripItemPage')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)
	const trip = useSelector((state: RootState) => state.trip)

	const speedChart = useRef<Chart<'line', any[], unknown>>()
	const map = useRef<Leaflet.Map>()

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [closeIcon, setCloseIcon] = useState(true)
	const [showItemPage, setShowItemPage] = useState(false)
	const [startScroll, setStartScroll] = useState(false)
	const [mounted, setMounted] = useState(false)

	const [openMoreDropDownMenu, setOpenMoreDropDownMenu] = useState(false)

	const [shareImageDataBase, setShareImageDataBase] = useState<string>('')
	const [generatingSharedData, setGeneratingSharedData] = useState(false)
	const [openEditTypeDropdown, setOpenEditTypeDropdown] = useState(false)

	const [type, setType] = useState('')

	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)

	useEffect(() => {
		setType('')
	}, [layout.editTripData?.id])

	const editTrip = async () => {
		const obj: any = {}

		type && (obj['type'] = type)
		if (type === '' || !layout.editTripData?.id) return

		// console.log(type, layout.editTripData?.id)

		if (!layout.editTripData?.authorId) {
			await storage.trips.set(layout.editTripData?.id || '', {
				...layout.editTripData,
				...obj,
			})
			if (trip.detailPage.trip?.id === layout.editTripData.id) {
				dispatch(
					tripSlice.actions.setTripForDetailPage({
						...trip.detailPage.trip,
						...obj,
					})
				)
			}
			snackbar({
				message: '编辑成功！',
				vertical: 'top',
				horizontal: 'center',
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
				autoHideDuration: 2000,
			}).open()
			dispatch(
				layoutSlice.actions.setEditTripModal({
					visible: false,
				})
			)
			return
		}

		const res = await httpApi.v1.UpdateTrip({
			id: layout.editTripData?.id,
			type,
		})
		console.log('res', res)
		if (res.code === 200) {
			console.log(trip.detailPage.trip?.id === layout.editTripData.id)
			if (trip.detailPage.trip?.id === layout.editTripData.id) {
				dispatch(
					tripSlice.actions.setTripForDetailPage({
						...trip.detailPage.trip,
						...obj,
					})
				)
			}
			// eventListener.dispatch('editTrip', {
			// 	id: layout.editTripData?.id,
			// 	type,
			// })
			snackbar({
				message: '编辑成功！',
				vertical: 'top',
				horizontal: 'center',
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
				autoHideDuration: 2000,
			}).open()
			dispatch(
				layoutSlice.actions.setEditTripModal({
					visible: false,
				})
			)
		}
	}
	return (
		<NoSSR>
			<saki-modal
				ref={bindEvent({
					close() {
						dispatch(
							layoutSlice.actions.setEditTripModal({
								visible: false,
							})
						)
					},
				})}
				width='100%'
				height={config.deviceType === 'Mobile' ? '100%' : 'auto'}
				max-width={config.deviceType === 'Mobile' ? '100%' : '480px'}
				max-height={config.deviceType === 'Mobile' ? '100%' : '580px'}
				mask
				border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
				border={config.deviceType === 'Mobile' ? 'none' : ''}
				mask-closable='false'
				visible={layout.editTripModal}
				z-index={1050}
			>
				<div className={'trip-edit-component ' + config.deviceType}>
					<saki-modal-header
						border
						close-icon={true}
						ref={bindEvent({
							close() {
								dispatch(
									layoutSlice.actions.setEditTripModal({
										visible: false,
									})
								)
							},
						})}
						title={t('editTrip', {
							ns: 'tripPage',
						})}
					/>
					<div className='tr-main'>
						<div className='tr-m-item'>
							<saki-title level='4' color='default' margin='0 0 10px 0'>
								{t('type', {
									ns: 'tripPage',
								})}
							</saki-title>
							<div className='tr-m-i-content'>
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
											{t(
												(
													type ||
													layout.editTripData?.type ||
													''
												)?.toLowerCase(),
												{
													ns: 'tripPage',
												}
											)}
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
						</div>
						<div className='tr-m-buttons'>
							<saki-button
								ref={bindEvent({
									tap: () => {
										editTrip()
									},
								})}
								padding='10px 50px'
								type='Primary'
								loading={generatingSharedData}
							>
								{t('save', {
									ns: 'common',
								})}
							</saki-button>
						</div>
					</div>
				</div>
			</saki-modal>
		</NoSSR>
	)
})

export default TripEditComponent
