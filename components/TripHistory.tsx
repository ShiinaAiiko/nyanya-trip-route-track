import React, { use, useEffect, useState } from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, {
	RootState,
	AppDispatch,
	useAppDispatch,
	methods,
	configSlice,
	userSlice,
	layoutSlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { formatTime } from '../plugins/methods'
import TripItemComponent from './TripItem'
import { Chart } from 'chart.js'

const getMonth = () => {
	let dataArr = []
	let date = new Date()
	date.setMonth(date.getMonth() + 1, 1)
	for (let i = 0; i < 12; i++) {
		date.setMonth(date.getMonth() - 1)
		let m: any = date.getMonth() + 1
		m = m < 10 ? '0' + m : m
		dataArr.push(date.getFullYear() + '-' + m)
	}
	return dataArr.reverse()
}
const getWeeks = () => {
	let dataArr: {
		// s: number
		t: number
		key: string
	}[] = []
	let date = new Date(moment().format('YYYY-MM-DD 0:0:0'))
	let d: any = date.getDate()
	// let s = date.getTime()
	let key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d)
	date.setDate(date.getDate() - (date.getDay() || 7) + 1)
	d = date.getDate()
	let t = Math.floor(date.getTime() / 1000)
	key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d) + ' - ' + key

	dataArr.push({
		// s,
		t,
		key,
	})
	for (let i = 0; i < 11; i++) {
		date.setDate(date.getDate() - 1)
		// s = date.getTime()
		d = date.getDate()
		key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d)

		date.setDate(date.getDate() - 6)

		d = date.getDate()
		t = Math.floor(date.getTime() / 1000)
		key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d) + ' - ' + key
		dataArr.push({
			// s,
			t,
			key,
		})
	}
	return dataArr
}

const getDays = () => {
	let dataArr = []
	let date = new Date()
	date.setDate(date.getDate() + 1)
	for (let i = 0; i < 30; i++) {
		date.setDate(date.getDate() - 1)

		let d: any = date.getDate()
		dataArr.push(date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d))
	}
	return dataArr.reverse()
}

const TripHistoryComponent = () => {
	const { t, i18n } = useTranslation('tripHistoryPage')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [closeIcon, setCloseIcon] = useState(true)
	const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

	useEffect(() => {
		if (layout.settingType) {
			if (config.deviceType === 'Mobile') {
				setCloseIcon(false)
			}
		} else {
			dispatch(layoutSlice.actions.setSettingType('Account'))
		}

		// setMenuType(type || 'Account')
	}, [layout.settingType])

	// useEffect(() => {
	// 	setTimeout(() => {
	// 		dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
	// 	}, 500)
	// }, [])

	return (
		<saki-modal
			ref={bindEvent({
				close() {
					dispatch(layoutSlice.actions.setOpenTripHistoryModal(false))
				},
			})}
			width='100%'
			height='100%'
			max-width={config.deviceType === 'Mobile' ? '100%' : '620px'}
			max-height={config.deviceType === 'Mobile' ? '100%' : '600px'}
			mask
			border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
			border={config.deviceType === 'Mobile' ? 'none' : ''}
			mask-closable='false'
			background-color='#fff'
			visible={layout.openTripHistoryModal}
		>
			<div className={'trip-history-component ' + config.deviceType}>
				<div className='th-header'>
					<saki-modal-header
						// border
						back-icon={!closeIcon}
						close-icon={closeIcon}
						ref={bindEvent({
							close() {
								// console.log('setOpenTripHistoryModal')
								dispatch(layoutSlice.actions.setOpenTripHistoryModal(false))
							},
							back() {
								console.log('back')
								setCloseIcon(true)
							},
						})}
						title={
							!closeIcon
								? t((trip?.type || '')?.toLowerCase(), {
										ns: 'tripPage',
								  }) +
								  ' · ' +
								  Math.round((trip?.statistics?.distance || 0) / 10) / 100 +
								  'km'
								: t('pageTitle')
						}
					/>
				</div>
				<div className='th-main'>
					<TripHistoryPage
						showTripItemPage={!closeIcon}
						onTripItemPage={(type, trip) => {
							setTrip(trip)
							if (type === 'Show') {
								setCloseIcon(false)
								return
							}

							setCloseIcon(true)
						}}
					/>
				</div>
			</div>
		</saki-modal>
	)
}

const TripHistoryPage = ({
	onTripItemPage,
	showTripItemPage,
}: {
	onTripItemPage: (type: 'Show' | 'Back', trip?: protoRoot.trip.ITrip) => void
	showTripItemPage: boolean
}) => {
	const { t, i18n } = useTranslation('tripHistoryPage')
	// const [type, setType] = useState<'All' | 'Running' | 'Bike' | 'Drive'>('All')
	const [time, setTime] = useState<'Day' | 'Week' | 'Month' | 'Year' | 'All'>(
		'All'
	)
	const user = useSelector((state: RootState) => state.user)
	const layout = useSelector((state: RootState) => state.layout)
	const type = useSelector((state: RootState) => state.layout.tripHistoryType)

	const [pageHeight, setPageHeight] = useState(0)
	const [contentHeight, setContentHeight] = useState(0)
	const [pageSize, setPageSize] = useState(10)
	const [pageNum, setPageNum] = useState(1)
	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)
	const [trips, setTrips] = useState<protoRoot.trip.ITrip[]>([])
	const [tripId, setTripId] = useState<string>('')

	const dispatch = useDispatch<AppDispatch>()

	const [tripStatistics, setTripStatistics] = useState<
		{
			type: 'All' | 'Running' | 'Bike' | 'Drive'
			count: number
			distance: number
			time: number
			list: protoRoot.trip.ITrip[]
			speedChart?: Chart<'line', any[], unknown>
		}[]
	>([])

	useEffect(() => {
		if (!showTripItemPage) {
			setTripId('')
		}
	}, [showTripItemPage])

	useEffect(() => {
		setTripStatistics(
			['All', 'Running', 'Bike', 'Drive'].map((v, i) => {
				return {
					type: v as any,
					count: 0,
					distance: 0,
					time: 0,
					list: [],
				}
			})
		)
	}, [])

	useEffect(() => {
		if (pageNum === 1 && user.isLogin && layout.openTripHistoryModal) {
			getTripHistory()
			getTripStatistics()
		}
	}, [user, layout.openTripHistoryModal])

	useEffect(() => {
		if (
			user.isLogin &&
			pageNum === 1 &&
			loadStatus === 'loaded' &&
			trips.length === 0
		) {
			getTripHistory()
			getTripStatistics()
		}
	}, [pageNum, loadStatus, trips])

	useEffect(() => {
		outSpeedLineChart()
	}, [tripStatistics])

	const getTimeLimit = () => {
		let startTime = 1540915200
		switch (time) {
			// 所有时间从2018年开始
			case 'All':
				break
			// 最近10年
			case 'Year':
				startTime =
					Math.floor(new Date().getTime() / 1000) - 365 * 10 * 24 * 3600
				break
			// 最近12个月
			case 'Month':
				startTime = Math.floor(new Date().getTime() / 1000) - 365 * 24 * 3600
				break
			// 最近12个周
			case 'Week':
				startTime =
					Math.floor(new Date().getTime() / 1000) -
					(11 * 7 + new Date().getDay()) * 24 * 3600
				break
			// 最近30天
			case 'Day':
				startTime = Math.floor(new Date().getTime() / 1000) - 30 * 24 * 3600
				break

			default:
				break
		}
		return startTime
	}
	const getTripStatistics = async () => {
		const res = await httpApi.v1.GetTripStatistics({
			type: type,
			timeLimit: [getTimeLimit(), Math.floor(new Date().getTime() / 1000)],
		})
		console.log('getTripStatistics', res, type)
		if (res.code === 200 && res?.data?.count) {
			// const data: {
			// 	type: 'Year'
			// 	key: Number.
			// 	value:
			// }[] = []
			// res?.data?.list?.forEach((v) => {})

			setTripStatistics(
				tripStatistics.map((v) => {
					if (v.type === String(type)) {
						return {
							...v,
							count: Number(res?.data?.count),
							distance: Number(res?.data?.distance),
							time: Number(res?.data?.time),
							list: res?.data?.list || [],
						}
					}
					return v
				})
			)
			return
		}
	}

	const outSpeedLineChart = () => {
		try {
			const list =
				tripStatistics.filter((v) => {
					return v.type === type
				})?.[0]?.list || []

			const tripData: {
				[key: string]: number
			} = {}
			switch (time) {
				// 所有时间从2018年开始
				case 'All':
					list.forEach((v) => {
						let t = moment(Number(v.createTime) * 1000).format('YYYY')
						!tripData[t] && (tripData[t] = 0)

						tripData[t] += v.statistics?.distance || 0
					})
					if (Object.keys(tripData).length === 1) {
						tripData['2018'] = 0
					}
					break
				// 最近10年
				case 'Year':
					let y = Number(moment().format('YYYY'))
					for (let i = 0; i < 10; i++) {
						tripData[String(y - i)] = 0
					}
					list.forEach((v) => {
						let t = moment(Number(v.createTime) * 1000).format('YYYY')
						!tripData[t] && (tripData[t] = 0)

						tripData[t] += v.statistics?.distance || 0
					})
					break
				// 最近12个月
				case 'Month':
					getMonth().forEach((v) => {
						tripData[v] = 0
					})
					list.forEach((v) => {
						let t = moment(Number(v.createTime) * 1000).format('YYYY-MM')
						!tripData[t] && (tripData[t] = 0)

						tripData[t] += v.statistics?.distance || 0
					})
					break
				// 最近12个周
				case 'Week':
					const weeks = getWeeks()
					weeks.forEach((_, i) => {
						tripData[weeks[weeks.length - 1 - i].key] = 0
					})
					list.forEach((v) => {
						let c = Number(v.createTime)
						weeks.some((sv) => {
							if (c > sv.t) {
								tripData[sv.key] += v.statistics?.distance || 0
								return true
							}
						})
					})
					break
				// 最近30天
				case 'Day':
					getDays().forEach((v) => {
						tripData[v] = 0
					})
					list.forEach((v) => {
						let t = moment(Number(v.createTime) * 1000).format('M/DD')
						!tripData[t] && (tripData[t] = 0)

						tripData[t] += v.statistics?.distance || 0
					})
					break

				default:
					break
			}
			const tsItem = tripStatistics.filter((v) => {
				return v.type === type
			})?.[0]
			console.log(
				'outSpeedLineChart',
				tripStatistics,
				list,
				tsItem?.speedChart,
				time,
				tripData
			)
			if (tsItem?.speedChart) {
				tsItem.speedChart.destroy()
				// return
			}
			const el = document.querySelector('.si-c-cvs-' + type)

			console.log('elelelel', el)
			let labels: any[] = []
			let distanceData: number[] = []
			Object.keys(tripData).forEach((k, i) => {
				labels.push(k)
				distanceData.push(tripData[k])
			})
			console.log(labels, distanceData)
			const data = {
				labels: labels,
				datasets: [
					{
						label:
							t('distance', {
								ns: 'tripPage',
							}) + ' (km)',
						data: distanceData,
						pointBorderWidth: 0,
						borderColor: '#f29cb2',
						backgroundColor: '#f29cb258',
						// fill: true,
						cubicInterpolationMode: 'monotone',
						tension: 0.4,
						yAxisID: 'y',
					},
				],
			}

			if (el) {
				const chart = new Chart(el as any, {
					type: 'line',

					data: data as any,
					options: {
						responsive: true,
						plugins: {
							title: {
								display: true,
								text: '',
							},
							legend: {
								display: false,
							},
						},
						interaction: {
							intersect: false,
						},
						maintainAspectRatio: false,
						scales: {
							y: {
								display: true,
								title: {
									display: true,
									text:
										t('distance', {
											ns: 'tripPage',
										}) + ' (km)',
								},
								suggestedMin: 0,
								// suggestedMax: 200,
								grid: {
									color: '#f29cb2',
									lineWidth: 1,
									drawOnChartArea: false, // only want the grid lines for one axis to show up
								},
							},
						},
					},
				})
				tsItem.speedChart = chart
				setTripStatistics(tripStatistics)
			}
		} catch (error) {
			console.error(error)
		}
	}

	const getTripHistory = async () => {
		if (loadStatus === 'loading' || loadStatus == 'noMore') return
		setLoadStatus('loading')
		const res = await httpApi.v1.GetTrips({
			type: type,
			pageSize,
			pageNum,
			timeLimit: [getTimeLimit(), Math.floor(new Date().getTime() / 1000)],
		})
		console.log('getTripHistory', res, pageNum)
		if (res.code === 200) {
			setLoadStatus(Number(res.data.total) === pageSize ? 'loaded' : 'noMore')
			res.data.list && setTrips(trips.concat(res.data.list))

			setPageNum(pageNum + 1)

			// res.data.list && setTripId(res.data.list[0]?.id || '')
			// res.data.list && onTripItemPage('Show', res.data.list[0])
			return
		}

		setLoadStatus('noMore')
	}
	return (
		<div
			ref={(e) => {
				e &&
					pageHeight !== e?.scrollHeight &&
					setPageHeight(e?.scrollHeight || 0)
			}}
			className='trip-history-page'
		>
			<saki-scroll-view mode='Auto' scroll-bar='Hover'>
				<div
					ref={(e) => {
						e &&
							contentHeight !== e?.scrollHeight &&
							setContentHeight(e?.scrollHeight || 0)
					}}
					className={'th-wrap ' + (pageHeight <= contentHeight ? 'scroll' : '')}
				>
					<div className='th-type-tabs'>
						<saki-tabs
							type='Flex'
							// header-background-color='rgb(245, 245, 245)'
							// header-max-width='740px'

							header-border-bottom='none'
							header-padding='0 10px'
							header-item-min-width='80px'
							active-tab-label={type}
							ref={bindEvent({
								tap: (e) => {
									console.log('tap', e)

									dispatch(
										layoutSlice.actions.setTripHistoryType(e.detail.label)
									)
									setTrips([])
									setPageNum(1)
									setLoadStatus('loaded')
								},
							})}
						>
							{tripStatistics.map((v, i) => {
								return (
									<saki-tabs-item
										key={i}
										font-size='14px'
										label={v.type}
										name={t(v.type.toLowerCase(), {
											ns: 'tripPage',
										})}
									>
										<div className='statistics-item'>
											<div className='si-time'>
												{['Day', 'Week', 'Month', 'Year', 'All'].map((v, i) => {
													return (
														<div
															ref={(e) => {
																e &&
																	(e.onclick = () => {
																		setTime(v as any)
																		setTrips([])
																		setPageNum(1)
																		setLoadStatus('loaded')
																	})
															}}
															className={
																'si-t-item ' + (time === v ? 'active' : '')
															}
															key={i}
														>
															{t(v.toLowerCase(), {
																ns: 'tripPage',
															})}
														</div>
													)
												})}
											</div>
											<div className='si-data'>
												<div className='bi-distance'>
													<span className='value'>
														{Math.round(v.distance / 100) / 10 || 0}
													</span>
													<span className='name'>
														{t('distance', {
															ns: 'tripPage',
														}) + ' (km)'}
													</span>
												</div>
												<div className='bi-right'>
													<div className='bi-time'>
														<span className='value'>
															{Math.round((v.time / 3600) * 100) / 100 || 0}
														</span>
														<span className='name'>
															{' '}
															{t('duration', {
																ns: 'tripPage',
															}) + ' (h)'}
														</span>
													</div>
													<div className='bi-count'>
														<span className='value'>{v.count || 0}</span>
														<span className='name'>
															{' '}
															{t('trips', {
																ns: 'tripPage',
															})}
														</span>
													</div>
												</div>
											</div>
											<div className='si-chart'>
												<canvas className={'si-c-cvs-' + v.type}></canvas>
											</div>
										</div>
									</saki-tabs-item>
								)
							})}
						</saki-tabs>
					</div>
					<div className='th-list'>
						{trips
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							// .concat(trips)
							.map((v, i) => {
								// console.log(v)

								return (
									// <saki-button
									// 	ref={bindEvent({
									// 		tap: () => {
									// 			console.log('th-l-item')
									// 			setShowTripItemPage(true)
									// 		},
									// 	})}
									// 	key={i}
									// >
									<div
										ref={(e) => {
											e &&
                        (e.onclick = () => {
                        if (v.status === 0) {
                          alert
                        }
                        
													setTripId(v.id || '')
													onTripItemPage('Show', v)
												})
										}}
										className='th-l-item'
										key={i}
									>
										<div className='th-l-i-left'>
											<div className='th-l-i-l-title'>
												{t((v.type || '')?.toLowerCase(), {
													ns: 'tripPage',
												})}
												{' · '}
												{Math.round((v.statistics?.distance || 0) / 10) / 100 +
													' km'}
											</div>
											<div className='th-l-i-l-info'>
												<div className='info-item'>
													{t('duration', {
														ns: 'tripPage',
													})}{' '}
													{Number(v.endTime || 0) > 0
														? formatTime(Number(v.startTime), Number(v.endTime))
														: t('unfinished', {
																ns: 'tripPage',
														  })}
												</div>
												{/* <div className='info-item'>配速 10'05</div> */}
												<div className='info-item'>
													{t('maxSpeed', {
														ns: 'tripPage',
													})}{' '}
													{(v?.statistics?.maxSpeed || 0) <= 0
														? 0
														: Math.round(
																((v?.statistics?.maxSpeed || 0) * 3600) / 100
														  ) / 10}{' '}
													km/h
												</div>
												{/* <div className='info-item'>平均时速 10'05</div> */}
											</div>
										</div>
										<div className='th-l-i-right'>
											<div className='th-l-i-r-date'>
												{v.status === 1
													? moment(Number(v.createTime) * 1000).format(
															'YYYY.MM.DD'
													  )
													: t('unfinished', {
															ns: 'tripPage',
													  })}
											</div>
										</div>
										{/* <div className='th-i-header'>
									<div className='th-i-h-icon'></div>
									<div className='th-i-h-date'>
										{moment(Number(v.createTime) * 1000).format('YYYY-MM')}
									</div>
								</div>
								<div className='th-i-content'>
									<div></div>
								</div> */}
									</div>
								)
							})}

						<saki-scroll-loading
							margin='20px 0 10px'
							type={loadStatus}
							language={i18n.language}
							ref={bindEvent({
								tap: () => {
									getTripHistory()
								},
							})}
						></saki-scroll-loading>
					</div>
				</div>
			</saki-scroll-view>
			<div className={'th-item-page ' + (tripId ? 'visivle' : '')}>
				<TripItemComponent
					onBack={() => {
						setTripId('')
						onTripItemPage('Back')
					}}
					onTrip={() => {}}
					onDelete={(tripId) => {
						setTrips(trips.filter((v) => v.id !== tripId))
						onTripItemPage('Back')
					}}
					isShare={false}
					tripId={tripId}
					shareKey=''
				/>
			</div>
		</div>
	)
}

export default TripHistoryComponent
