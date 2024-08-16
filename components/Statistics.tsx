import React, { use, useCallback, useEffect, useState } from 'react'

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

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { formatDistance, formatTime } from '../plugins/methods'
import TripItemComponent from './TripItem'

const StatisticsComponent = ({}: {}) => {
	const { t, i18n } = useTranslation('tripHistoryPage')
	// const [type, setType] = useState<'All' | 'Running' | 'Bike' | 'Drive'>('All')
	const [time, setTime] = useState<'Day' | 'Week' | 'Month' | 'Year' | 'All'>(
		'All'
	)
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)
	const layout = useSelector((state: RootState) => state.layout)

	const [pageHeight, setPageHeight] = useState(0)
	const [contentHeight, setContentHeight] = useState(0)
	const [historicalStatistics, setHistoricalStatistics] =
		useState<protoRoot.trip.GetHistoricalStatistics.IResponse>()

	const dispatch = useDispatch<AppDispatch>()

	useEffect(() => {
		layout.openStatisticsModal.visible && getStatistics()
	}, [layout.openStatisticsModal.visible])

	const getStatistics = async () => {
		const type = layout.openStatisticsModal.type
		setHistoricalStatistics(
			(await storage.global.get(`historicalStatistics-${type}`)) || {
				maxDistance: 0,
				maxSpeed: 0,
				fastestAverageSpeed: 0,
				maxAltitude: 0,
				minAltitude: 0,
				maxClimbAltitude: 0,
			}
		)
		const res = await httpApi.v1.GetHistoricalStatistics({
			type,
		})
		console.log('GetHistoricalStatistics', res, type)
		if (res.code === 200) {
			const hs: protoRoot.trip.GetHistoricalStatistics.IResponse = {
				maxSpeed: {
					num: Math.round(((res.data.maxSpeed?.num || 0) * 3600) / 100) / 10,
					id: res.data.maxSpeed?.id || '',
				},
				maxDistance: {
					num: Math.round((res.data.maxDistance?.num || 0) / 10) / 100,
					id: res.data.maxDistance?.id || '',
				},
				fastestAverageSpeed: {
					num:
						Math.round(
							((res.data.fastestAverageSpeed?.num || 0) * 3600) / 100
						) / 10,
					id: res.data.fastestAverageSpeed?.id || '',
				},
				maxAltitude: {
					num: Math.round((res.data.maxAltitude?.num || 0) * 10) / 10,
					id: res.data.maxAltitude?.id || '',
				},
				minAltitude: {
					num: Math.round((res.data.minAltitude?.num || 0) * 10) / 10,
					id: res.data.minAltitude?.id || '',
				},
				maxClimbAltitude: {
					num: Math.round((res.data.maxClimbAltitude?.num || 0) * 10) / 10,
					id: res.data.maxClimbAltitude?.id || '',
				},
				maxDescendAltitude: {
					num: Math.round((res.data.maxDescendAltitude?.num || 0) * 10) / 10,
					id: res.data.maxDescendAltitude?.id || '',
				},
			}

			setHistoricalStatistics(hs)
			await storage.global.set(`historicalStatistics-${type}`, hs)
			return
		}
	}

	return (
		<div
			ref={(e) => {
				e &&
					pageHeight !== e?.scrollHeight &&
					setPageHeight(e?.scrollHeight || 0)
			}}
			className='statistics-component'
		>
			<saki-scroll-view mode='Auto' scroll-bar='Hover'>
				<div
					ref={(e) => {
						e &&
							contentHeight !== e?.scrollHeight &&
							setContentHeight(e?.scrollHeight || 0)
					}}
					className={'sc-wrap ' + (pageHeight <= contentHeight ? 'scroll' : '')}
				>
					{/* <div>{layout.openStatisticsType}</div> */}
					<div className='sc-list'>
						{[
							'maxDistance',
							'maxSpeed',
							'fastestAverageSpeed',
							'maxAltitude',
							'minAltitude',
							'maxClimbAltitude',
							'maxDescendAltitude',
						].map((v) => {
							const numItem = (historicalStatistics as any)?.[
								v
							] as protoRoot.trip.GetHistoricalStatistics.Response.INumItem

							console.log('numItem', numItem)
							return (
								<div
									ref={
										bindEvent({
											click: () => {
												console.log('v')

												dispatch(
													layoutSlice.actions.setOpenTripItemModal({
														visible: true,
														id: numItem.id || '',
													})
												)
											},
										}) as any
									}
									key={v}
									className='sc-l-item'
								>
									<span className='num'>
										{Math.round((numItem?.num || 0) * 10) / 10}
									</span>
									<span className='type'>
										{t(v, {
											ns: 'tripPage',
										})}{' '}
										{v === 'maxDistance' ? '(km)' : ''}
										{v === 'maxSpeed' ? '(km/h)' : ''}
										{v === 'fastestAverageSpeed' ? '(km/h)' : ''}
										{v === 'maxAltitude' ? '(m)' : ''}
										{v === 'minAltitude' ? '(m)' : ''}
										{v === 'maxClimbAltitude' ? '(m)' : ''}
										{v === 'maxDescendAltitude' ? '(m)' : ''}
									</span>
								</div>
							)
						})}
					</div>
				</div>
			</saki-scroll-view>
		</div>
	)
}

export default StatisticsComponent
