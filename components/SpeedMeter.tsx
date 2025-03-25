import Head from 'next/head'
import TripLaout from '../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../components/Footer'
import path from 'path'
import {
	AppDispatch,
	RootState,
	configSlice,
	layoutSlice,
	vehicleSlice,
} from '../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'

import NoSSR from '../components/NoSSR'
import { formatDistance, formatTime } from '../plugins/methods'
import moment from 'moment'
import { storage } from '../store/storage'
import { Statistics, TripStatisticsType, WeatherInfoType } from '../store/trip'
import { protoRoot } from '../protos'
import { VehicleLogo } from './Vehicle'
import { openWeatherWMOToEmoji } from '@akaguny/open-meteo-wmo-to-emoji'
import { httpApi } from '../plugins/http/api'

const SpeedMeterComponent = ({
	type,
	tripId,
	gpsSignalStatus = -1,
	stopped = false,
	selectVehicle = false,
	position,
	startTime,
	listenTime,
	statistics,
	updatedPositionsLength,
	positionsLength,
	live = false,
	onZoom,
	runTime,
	markerPosition = false,
	markerInfo,
	weatherInfo,
	cities = [],
}: {
	type?: string
	tripId: string
	gpsSignalStatus: number
	stopped: boolean
	selectVehicle?: boolean
	position: protoRoot.trip.ITripPosition
	startTime: number
	listenTime: number
	statistics: Statistics
	updatedPositionsLength: number
	positionsLength: number
	live?: boolean
	onZoom?: (v: 'zoomIn' | 'zoomOut') => void
	runTime: number
	markerPosition?: boolean
	markerInfo?: protoRoot.position.GetUserPositionAndVehiclePosition.Response.IPositionItem
	weatherInfo?: WeatherInfoType
	cities?: protoRoot.trip.ITripCity[]
}) => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const { config, vehicle, trip } = useSelector((state: RootState) => {
		const { config, vehicle, trip } = state
		return {
			config,
			vehicle,
			trip,
		}
	})
	// const trip = useSelector((state: RootState) => state.trip)
	// const layout = useSelector((state: RootState) => state.layout)
	// const geo = useSelector((state: RootState) => state.geo)

	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()

	const [dataTheme, setDataTheme] = useState('')
	const [zoomOutSpeedMeter, setZoomOutSpeedMeter] = useState(false)
	const [openDataThemeDropDown, setOpenDataThemeDropDown] = useState(false)
	const [openSelectVehicleDropDown, setOpenSelectVehicleDropDown] =
		useState(false)

	const [historicalStatistics, setHistoricalStatistics] =
		useState<protoRoot.trip.GetHistoricalStatistics.IResponse>()

	useEffect(() => {
		setMounted(true)
		const init = async () => {
			setDataTheme((await storage.global.get('dataTheme')) || 'Dark')
			const zoom = (await storage.global.get('zoomOutSpeedMeter')) || false
			setZoomOutSpeedMeter(zoom)
		}
		init()
	}, [])

	useEffect(() => {
		onZoom?.(zoomOutSpeedMeter ? 'zoomOut' : 'zoomIn')
		storage.global.setSync('zoomOutSpeedMeter', zoomOutSpeedMeter)
	}, [zoomOutSpeedMeter])

	const speed = Number(position?.speed || 0)
	const distance = Number(position?.distance || 0)
	const altitude = Number(position?.altitude || 0)

	const defaultVehicle = vehicle.vehicles.filter(
		(v) => vehicle.defaultVehicleId === v.id
	)?.[0]

	// console.log(
	// 	'resumeTrip tempStatistics',
	// 	position,
	// 	listenTime,
	// 	speed,
	// 	distance,
	// 	altitude
	// )
	// console.log(
	// 	'markerInfo',
	// 	markerInfo,
	// 	historicalStatistics,
	// 	trip.tripStatistics
	// )

	// if (altitude>trip) {

	// }
	useEffect(() => {
		if (live) {
			getStatistics()
		}
	}, [live])

	const getStatistics = async () => {
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

		let sd = 0
		let ed = Math.floor(new Date().getTime() / 1000)

		const res = await httpApi.v1.GetHistoricalStatistics({
			type,
			timeLimit: [sd, ed],
		})
		console.log('GetHistoricalStatistics', res, type)
		if (res.code === 200 && res.data?.maxSpeed?.num) {
			const hs: protoRoot.trip.GetHistoricalStatistics.IResponse = {
				maxSpeed: {
					num: res.data.maxSpeed?.num,
					id: res.data.maxSpeed?.id || '',
				},
				maxDistance: {
					num: res.data.maxDistance?.num,
					id: res.data.maxDistance?.id || '',
				},
				fastestAverageSpeed: {
					num: res.data.fastestAverageSpeed?.num,
					id: res.data.fastestAverageSpeed?.id || '',
				},
				maxAltitude: {
					num: res.data.maxAltitude?.num,
					id: res.data.maxAltitude?.id || '',
				},
				minAltitude: {
					num: res.data.minAltitude?.num,
					id: res.data.minAltitude?.id || '',
				},
				maxClimbAltitude: {
					num: res.data.maxClimbAltitude?.num,
					id: res.data.maxClimbAltitude?.id || '',
				},
				maxDescendAltitude: {
					num: res.data.maxDescendAltitude?.num,
					id: res.data.maxDescendAltitude?.id || '',
				},
			}

			setHistoricalStatistics(hs)
			await storage.global.set(`historicalStatistics-${type}`, hs)
			return
		}
	}

	const recordKeyArray = []

	if (historicalStatistics && live) {
		if (
			historicalStatistics['maxAltitude']?.num &&
			historicalStatistics['maxAltitude']?.num < altitude
		) {
			recordKeyArray.push('maxAltitude')
		}
		if (
			historicalStatistics['maxSpeed']?.num &&
			historicalStatistics['maxSpeed']?.num < speed
		) {
			recordKeyArray.push('maxSpeed')
		}
		if (
			historicalStatistics.maxDistance?.num &&
			historicalStatistics.maxDistance?.num < distance
		) {
			recordKeyArray.push('maxDistance')
		}
		if (
			historicalStatistics.minAltitude?.num &&
			historicalStatistics.minAltitude?.num > altitude
		) {
			recordKeyArray.push('minAltitude')
		}
	}

	// console.log('recordKeyArray', recordKeyArray)

	return (
		<div
			className={
				'speed-meter-component ' +
				config.deviceType +
				' ' +
				dataTheme +
				' ' +
				(markerPosition ? 'markerPosition' : '')
			}
		>
			{zoomOutSpeedMeter ? (
				<div
					ref={
						bindEvent({
							click: () => {
								setZoomOutSpeedMeter(false)
							},
						}) as any
					}
					className={'data-min ' + dataTheme}
				>
					<div className='data-speed'>
						<div className='ds-value'>
							{gpsSignalStatus === 1
								? stopped
									? 0
									: speed <= 0
									? 0
									: Math.round(((speed || 0) * 3600) / 100) / 10
								: '---'}
						</div>
						<div className='ds-unit'>km/h</div>
					</div>
				</div>
			) : (
				<div
					ref={
						bindEvent({
							click: () => {
								// setZoomOutSpeedMeter(true)
							},
						}) as any
					}
					className={'data-main ' + config.deviceType}
				>
					{dataTheme ? (
						<div className='data-theme'>
							<saki-dropdown
								visible={openDataThemeDropDown}
								floating-direction='Left'
								z-index='1001'
								ref={bindEvent({
									close: (e) => {
										setOpenDataThemeDropDown(false)
									},
								})}
							>
								<saki-button
									ref={bindEvent({
										tap: () => {
											setOpenDataThemeDropDown(true)
										},
									})}
									bg-color='transparent'
									bg-hover-color='transparent'
									bg-active-color='transparent'
									border='none'
									type='Normal'
									padding='4px 4px 4px 0'
								>
									<saki-row align-items='center'>
										<saki-icon
											width='30px'
											color={dataTheme === 'Dark' ? '#fff' : '#000'}
											type={dataTheme === 'Dark' ? 'SunFill' : 'MoonFill'}
										></saki-icon>
										<span>
											{t(dataTheme.toLowerCase(), {
												ns: 'settings',
											})}
										</span>
									</saki-row>
								</saki-button>
								<div slot='main'>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												console.log(e.detail.value)

												setDataTheme(e.detail.value)

												setOpenDataThemeDropDown(false)
												await storage.global.set('dataTheme', e.detail.value)
											},
										})}
									>
										<saki-menu-item padding='10px 14px' value={'Light'}>
											<saki-row align-items='center'>
												<saki-icon
													width='30px'
													color='#666'
													type='SunFill'
												></saki-icon>
												<span>
													{t('light', {
														ns: 'settings',
													})}
												</span>
											</saki-row>
										</saki-menu-item>
										<saki-menu-item padding='10px 14px' value={'Dark'}>
											<saki-row align-items='center'>
												<saki-icon
													width='30px'
													color='#666'
													type='MoonFill'
												></saki-icon>
												<span>
													{t('dark', {
														ns: 'settings',
													})}
												</span>
											</saki-row>
										</saki-menu-item>
									</saki-menu>
								</div>
							</saki-dropdown>
							{vehicle.vehicles.length && selectVehicle ? (
								<saki-dropdown
									visible={openSelectVehicleDropDown}
									floating-direction='Left'
									z-index='1001'
									ref={bindEvent({
										close: (e) => {
											setOpenSelectVehicleDropDown(false)
										},
									})}
								>
									<saki-button
										ref={bindEvent({
											tap: () => {
												setOpenSelectVehicleDropDown(true)
											},
										})}
										bg-color='transparent'
										bg-hover-color='transparent'
										bg-active-color='transparent'
										border='none'
										type='Normal'
										padding='4px 4px 4px 0'
										margin='0 0 0 6px'
									>
										<saki-row align-items='center'>
											{!defaultVehicle?.id ? (
												<span>
													{t('noVehicleSelected', {
														ns: 'vehicleModal',
													})}
												</span>
											) : (
												<div className='data-vehicle-item-dropdown'>
													<VehicleLogo
														icon={defaultVehicle?.type || ''}
														style={{
															width: '26px',
															padding: '0 6px',
															transform: 'translateY(1px)',
															backgroundColor:
																dataTheme === 'Dark' ? '#010101' : '#ffffff',
															color: dataTheme === 'Dark' ? '#fff' : '#010101',
														}}
													></VehicleLogo>
													<span className='text-two-elipsis'>
														{defaultVehicle?.name}
													</span>
												</div>
											)}
										</saki-row>
									</saki-button>
									<div slot='main'>
										<saki-menu
											ref={bindEvent({
												selectvalue: async (e) => {
													console.log(e.detail.value)
													dispatch(
														vehicleSlice.actions.setDefaultVehicleId(
															e.detail.value === 'cancelDefault'
																? ''
																: e.detail.value
														)
													)

													setOpenSelectVehicleDropDown(false)
												},
											})}
										>
											{vehicle.vehicles
												.concat([
													{
														id: 'cancelDefault',
														name: t('deselectVehicle', {
															ns: 'vehicleModal',
														}),
													},
												])
												.map((v, i) => {
													return (
														<saki-menu-item
															width='150px'
															padding='10px 18px'
															value={v.id}
															key={i}
															active={vehicle.defaultVehicleId === v.id}
														>
															<div
																style={{
																	justifyContent:
																		v.id === 'cancelDefault'
																			? 'center'
																			: 'flex-start',
																}}
																className='data-vehicle-item-dropdown'
															>
																{v.id !== 'cancelDefault' ? (
																	<VehicleLogo
																		icon={v?.type || ''}
																		style={{
																			width: '28px',
																			height: '28px',
																			margin: '0 6px 0 0',
																		}}
																	></VehicleLogo>
																) : (
																	''
																)}
																<span className='text-two-elipsis'>
																	{v.name}
																</span>
															</div>
														</saki-menu-item>
													)
												})}
										</saki-menu>
									</div>
								</saki-dropdown>
							) : (
								''
							)}
							{markerPosition ? (
								<div className='data-markerinfo'>
									{markerInfo?.type === 'Vehicle' ? (
										<div className='logo'>
											<VehicleLogo
												icon={markerInfo?.vehicleInfo?.type || ''}
												iconSize='14px'
												style={{
													width: '22px',
													height: '22px',
													// padding: '4px',
													margin: '2px 4px 0 0',
												}}
											></VehicleLogo>
										</div>
									) : (
										<saki-avatar
											width='22px'
											height='22px'
											border-radius='50%'
											default-icon={'UserLine'}
											margin='2px 4px 0 0'
											nickname={markerInfo?.userInfo?.nickname}
											src={markerInfo?.userInfo?.avatar}
											alt=''
										></saki-avatar>
									)}
									<div className='name'>
										<span>
											{markerInfo?.vehicleInfo?.name ||
												markerInfo?.userInfo?.nickname}
										</span>
									</div>
								</div>
							) : (
								''
							)}
						</div>
					) : (
						''
					)}

					<div className='data-speed'>
						<div className='ds-value'>
							<SpeedComponent
								speed={
									gpsSignalStatus === 1
										? stopped
											? 0
											: speed <= 0
											? 0
											: Math.round(((speed || 0) * 3600) / 100) / 10
										: -1
								}
								runTime={runTime}
								timestamp={Number(position?.timestamp)}
								enable={config.configure?.speedAnimation || false}
							/>
						</div>
						<div className='ds-unit'>km/h</div>
					</div>
					<div className='data-bottom'>
						<div className='data-b-item'>
							<div className={'di-value '}>
								<span>{markerPosition ? '---' : formatDistance(distance)}</span>
								{recordKeyArray.includes('maxDistance') ? (
									<saki-icon
										color='#fff'
										type='ArrowTop'
										margin='0 0 0 2px'
									></saki-icon>
								) : (
									''
								)}
							</div>
							<div className='di-unit'>
								{t('distance', {
									ns: 'tripPage',
								})}
							</div>
						</div>
						<div className='data-b-item time'>
							<div className='di-value'>
								<span>
									{markerPosition
										? '-- -- --'
										: formatTime(startTime / 1000, listenTime / 1000)}
								</span>
							</div>
							<div className='di-unit'>
								{t('duration', {
									ns: 'tripPage',
								})}
							</div>
						</div>
						<div className='data-b-item'>
							<div className='di-value'>
								{gpsSignalStatus === 1
									? (altitude <= 0
											? 0
											: Math.round((altitude || 0) * 10) / 10) + '  m'
									: '---'}
							</div>
							<div className='di-unit'>
								{t('altitude', {
									ns: 'tripPage',
								})}
							</div>
						</div>

						{!markerPosition ? (
							<>
								<div className='data-b-item'>
									<div className='di-value'>
										<div className='di-value'>
											<span>
												{markerPosition
													? '---'
													: Math.round(
															((statistics.maxSpeed || 0) * 3600) / 100
													  ) / 10}
												<span className='di-v-unit'>km/h</span>
											</span>
											{recordKeyArray.includes('maxSpeed') ? (
												<saki-icon
													color='#fff'
													type='ArrowTop'
													margin='0 0 0 2px'
												></saki-icon>
											) : (
												''
											)}
										</div>
									</div>
									<div className='di-unit'>
										{t('maxSpeed', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										{markerPosition
											? '---'
											: Math.round((statistics.climbAltitude || 0) * 10) / 10 +
											  '  m'}
									</div>
									<div className='di-unit'>
										{t('climbAltitude', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='data-b-item'>
									<div className='di-value'>
										{markerPosition
											? '---'
											: Math.round((statistics.descendAltitude || 0) * 10) /
													10 +
											  '  m'}
									</div>
									<div className='di-unit'>
										{t('descendAltitude', {
											ns: 'tripPage',
										})}
									</div>
								</div>
							</>
						) : (
							''
						)}

						<div className='data-b-item'>
							<div className='di-value'>
								<span>
									{Math.round((statistics.maxAltitude || 0) * 10) / 10 + '  m'}
								</span>
								{recordKeyArray.includes('maxAltitude') ? (
									<saki-icon
										color='#fff'
										type='ArrowTop'
										margin='0 0 0 2px'
									></saki-icon>
								) : (
									''
								)}
							</div>
							<div className='di-unit'>
								{t('maxAltitude', {
									ns: 'tripPage',
								})}
							</div>
						</div>

						<div className='data-b-item'>
							<div className='di-value'>
								<span>
									{Math.round((statistics.minAltitude || 0) * 10) / 10 + '  m'}
								</span>
								{recordKeyArray.includes('minAltitude') ? (
									<saki-icon
										color='#fff'
										type='ArrowTop'
										margin='0 0 0 2px'
									></saki-icon>
								) : (
									''
								)}
							</div>
							<div className='di-unit'>
								{t('minAltitude', {
									ns: 'tripPage',
								})}
							</div>
						</div>

						{weatherInfo && weatherInfo?.windDirection && live ? (
							<div className='data-b-item windSpeed'>
								<div className='di-value'>
									{weatherInfo?.windSpeed || 0}
									<span className='di-v-unit'>km/h</span>
								</div>
								<div className='di-unit'>{weatherInfo?.windDirection}</div>
							</div>
						) : (
							''
						)}
					</div>
					<div className='data-position'>
						<div>
							<span>LAT {position?.latitude}</span>
							<span> - </span>
							<span>LNG {position?.longitude}</span>
							{/* {weatherInfo && weatherInfo?.weather && live ? (
								<>
									<span>
										{(openWeatherWMOToEmoji(Number(weatherInfo.weatherCode))
											?.value || '') + weatherInfo?.weather}
									</span>
									<span>|</span>
									<span>{weatherInfo.temperature + '℃'}</span>
									<span>|</span>
									<span>{weatherInfo.apparentTemperature + '℃'}</span>
									<span>|</span>
									<span className='weather'>{weatherInfo.windDirection}</span>
									<span className='weather'>|</span>
									<span className='weather'>
										{weatherInfo.windSpeed + 'km/h'}
									</span>
									<span className='weather'> - </span>
								</>
							) : (
								''
							)} */}

							{/* {statistics.maxAltitude ? (
								<>
									<span>
										{Math.round((statistics.maxAltitude || 0) * 10) / 10 +
											'  m'}
									</span>
									<span> - </span>{' '}
								</>
							) : (
								''
							)} */}

							{/* {live ? (
							<>
								<span>{Math.round(position?.accuracy || 0)}</span>
								<span> - </span>
								<span>{Math.round(position?.heading || 0)}</span>
								<span> - </span>
							</>
						) : (
							''
						)} */}
							{markerPosition ? (
								''
							) : (
								<>
									<span> - </span>
									<span>{updatedPositionsLength + '/' + positionsLength}</span>
								</>
							)}

							{!cities?.length ? (
								''
							) : (
								<>
									<span> - </span>
									<span>
										{t('numCities', {
											num: cities.length,
											ns: 'tripPage',
										})}
									</span>
								</>
							)}

							{tripId.indexOf('IDB') >= 0 ? (
								<>
									<span> - </span>
									<span>{t('local')}</span>
								</>
							) : (
								''
							)}

							{/* <span> - </span>
								<span>
									{t('averageSpeed', {
										ns: 'tripPage',
									}) + ' '}
									{Math.round(((statistics.averageSpeed || 0) * 3600) / 100) /
										10}{' '}
									km/h
								</span> */}
						</div>
					</div>
					<div className={'data-header-right '}>
						{/* <div className='dhr-weather'>
							{weatherInfo && weatherInfo?.weather && live ? (
								<>
									<span>
										{(openWeatherWMOToEmoji(Number(weatherInfo.weatherCode))
											?.value || '') + weatherInfo?.weather}
									</span>
									<span>|</span>
									<span>{weatherInfo.temperature + '℃'}</span>
									<span>|</span>
									<span>{weatherInfo.apparentTemperature + '℃'}</span>
									<span className='wind'>|</span>
									<span className='wind'>{weatherInfo.windDirection}</span>
									<span className='wind'>|</span>
									<span className='wind'>{weatherInfo.windSpeed + 'km/h'}</span>
								</>
							) : (
								''
							)}
						</div> */}
						<saki-icon
							color={
								gpsSignalStatus === 1
									? 'var(--saki-default-color)'
									: gpsSignalStatus === 0
									? '#eccb56'
									: '#b0aa93'
							}
							type='GPSFill'
						></saki-icon>
						<saki-button
							ref={bindEvent({
								tap: () => {
									setZoomOutSpeedMeter(true)
								},
							})}
							bg-color='transparent'
							bg-hover-color='transparent'
							bg-active-color='transparent'
							border='none'
							type='Normal'
							margin='3px 0 0 6px'
						>
							<saki-icon
								width='18px'
								height='18px'
								color={dataTheme === 'Dark' ? '#fff' : '#000'}
								type='EyeSlash'
							></saki-icon>
						</saki-button>
					</div>
				</div>
			)}
		</div>
	)
}

const SpeedComponent = ({
	speed,
	runTime,
	timestamp,
	enable = false,
}: {
	speed: number
	runTime: number
	timestamp: number
	enable: boolean
}) => {
	// if (!enable) {
	return <span>{speed < 0 ? '---' : speed}</span>
	// }
	// const [speedText, setSpeedText] = useState('')
	// const curSpeed = useRef(0)
	// const prevSpeed = useRef(0)
	// const timer = useRef<NodeJS.Timeout>()

	// useEffect(() => {
	// 	clearTimeout(timer.current)
	// 	if (speed < 0) {
	// 		setSpeedText('---')
	// 		return
	// 	}
	// 	if (runTime < 100) {
	// 		setSpeedText(String(speed))
	// 		return
	// 	}
	// 	prevSpeed.current = curSpeed.current
	// 	curSpeed.current = speed
	// }, [speed, timestamp, runTime])

	// useEffect(() => {
	// 	clearTimeout(timer.current)
	// 	let s = (curSpeed.current - prevSpeed.current) / (runTime / 100)
	// 	s = Math.floor(s * 1000) / 1000

	// 	let ps = prevSpeed.current + s

	// 	ps = Math.floor(ps * 1000) / 1000

	// 	setSpeedText(String(Math.floor(ps * 10) / 10))
	// 	timer.current = setInterval(() => {
	// 		ps += s
	// 		ps = Math.floor(ps * 1000) / 1000
	// 		if (s >= 0) {
	// 			if (ps >= curSpeed.current) {
	// 				ps = curSpeed.current
	// 				clearTimeout(timer.current)
	// 			}
	// 		} else {
	// 			if (ps <= curSpeed.current) {
	// 				ps = curSpeed.current
	// 				clearTimeout(timer.current)
	// 			}
	// 		}
	// 		setSpeedText(String(Math.floor(ps * 10) / 10))
	// 	}, 100)
	// }, [curSpeed.current, prevSpeed.current])

	// return <span>{speedText}</span>
}
export default SpeedMeterComponent
