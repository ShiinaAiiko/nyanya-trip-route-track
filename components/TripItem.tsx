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

import { alert, snackbar, bindEvent, progressBar } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { Chart } from 'chart.js/auto'
import {
	formatTime,
	getDistance,
	getSpeedColor,
	getZoom,
	rgbs,
} from '../plugins/methods'
import Leaflet from 'leaflet'
import html2canvas from 'html2canvas'
import { cnMap } from '../store/config'

let speedChart: any
const TripItemComponent = ({ trip }: { trip?: protoRoot.trip.ITrip }) => {
	const { t, i18n } = useTranslation('tripItemPage')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [closeIcon, setCloseIcon] = useState(true)
	const [showItemPage, setShowItemPage] = useState(false)
	const [startScroll, setStartScroll] = useState(false)
	const [mounted, setMounted] = useState(false)

	const [shareImageDataBase, setShareImageDataBase] = useState<string>('')
	const [generatingSharedData, setGeneratingSharedData] = useState(false)

	const [map, setMap] = useState<Leaflet.Map>()

	useEffect(() => {
		console.log(rgbs)
		// setMounted(true)
	}, [])

	useEffect(() => {
		if (!map && config.country && trip) {
			let tDistance = 0
			trip?.postions?.forEach((v, i) => {
				if (i > 0) {
					const lv = trip?.postions?.[i - 1]
					if (lv) {
						tDistance += getDistance(
							v.longitude || 0,
							v.latitude || 0,
							lv.longitude || 0,
							lv.latitude || 0
						)
					}
				}
				v.distance = tDistance
			})
			outSpeedLineChart()
			initMap()
		} else {
			setShareImageDataBase('')
			setMap(undefined)
		}
	}, [trip?.id, config.country])

	const initMap = () => {
		const L: typeof Leaflet = (window as any).L
		if (L && trip?.postions) {
			const startPosition = trip.postions[0]
			const endPosition = trip.postions[trip.postions.length - 1]

			let lat =
				(startPosition.latitude || 0) -
				((startPosition.latitude || 0) - (endPosition.latitude || 0)) / 2
			let lon =
				(startPosition.longitude || 0) -
				((startPosition.longitude || 0) - (endPosition.longitude || 0)) / 2

			let m: Leaflet.Map = map as any
			if (!m && L) {
				m = L.map('ti-map', {
					zoomControl: false,
					renderer: L.canvas(),
					// center: [Number(res?.data?.lat), Number(res?.data?.lon)],
				})
				// 检测地址如果在中国就用高德地图

				m.setView(
					[lat, lon],
					// [
					//   120.3814, -1.09],
					getZoom(
						startPosition.latitude || 0,
						startPosition.longitude || 0,
						lat,
						lon
					)
				)
				L.tileLayer(
					config.country === 'China'
						? cnMap
						: config.connectionOSM
						? `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
						: cnMap,
					{
						maxZoom: 19,
						attribution: `&copy; ${
							config.connectionOSM && config.country !== 'China'
								? '<a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
								: '<a href="https://map.geoq.cn">ArcGIS</a>'
						}`,
					}
				).addTo(m)
				//定义一个地图缩放控件
				// var zoomControl = L.control.zoom({ position: 'topleft' })
				// //将地图缩放控件加载到地图
				// m.addControl(zoomControl)
				// m.removeControl(zoomControl)

				setMap(m)
			}
			console.log('initMap', m)
			console.log(lat, lon)
			m && m.panTo([lat, lon])

			// L.marker([lat, lon]).addTo(m).openPopup()
			const positions = trip.postions
			positions?.forEach((v, i) => {
				if (i === 0) return
				const lv = positions[i - 1]
				L.polyline(
					[
						[lv.latitude || 0, lv.longitude || 0],
						[v.latitude || 0, v.longitude || 0],
					],
					{
						// smoothFactor:10,
						// snakingSpeed: 200,
						color: getSpeedColor(v.speed || 0, 4, 10), //线的颜色
						weight: 8, //线的粗细
						// opacity: 0.3,
					}
				).addTo(m)
			})
			// console.log('connectionOSM', connectionOSM)

			// console.log('map', map)
		}

		// setTimeout(() => {
		//   outShareImage()
		// }, 500);
	}

	const outSpeedLineChart = () => {
		try {
			if (speedChart || !trip?.postions?.length) return
			const el = document.getElementById('speed-chart')

			let labels: any[] = []
			let speedData: number[] = []
			let altitudeData: number[] = []
			trip?.postions?.forEach((v, i) => {
				// if (i > 10) return
				labels.push(Math.floor(v?.distance || 0))
				speedData.push((v.speed || 0) < 0 ? 0 : (v.speed || 0) * 3.6)
				altitudeData.push(v.altitude || 0)
			})
			// console.log('labels', labels)
			// console.log('speedData', speedData)
			// console.log('altitudeData', altitudeData)
			const data = {
				labels: labels,
				datasets: [
					// {
					// 	label: 'Cubic interpolation (monotone)',
					// 	data: datapoints,
					// 	borderColor: 'rgb(75, 192, 192)',
					// 	fill: false,
					// 	cubicInterpolationMode: 'monotone',
					// 	tension: 0.4,
					// },
					{
						label:
							t('altitude', {
								ns: 'tripPage',
							}) + ' (m)',
						data: altitudeData,
						pointBorderWidth: 0,
						borderColor: '#58c8f2',
						backgroundColor: '#58c8f258',
						fill: false,
						cubicInterpolationMode: 'monotone',
						tension: 0.5,
						yAxisID: 'y1',
					},
					{
						label:
							t('speed', {
								ns: 'tripPage',
							}) + ' (km/h)',
						data: speedData,
						pointBorderWidth: 0,
						borderColor: '#f29cb2',
						backgroundColor: '#f29cb258',
						fill: true,
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
						},
						interaction: {
							intersect: false,
						},
						scales: {
							// x: {
							// 	display: false,
							// 	title: {
							// 		display: true,
							// 	},
							// },
							y: {
								display: true,
								title: {
									display: true,
									text:
										t('speed', {
											ns: 'tripPage',
										}) + ' (km/h)',
								},
								// suggestedMin: -10,
								// suggestedMax: 200,
								grid: {
									color: '#f29cb2',
									lineWidth: 1,
									drawOnChartArea: false, // only want the grid lines for one axis to show up
								},
							},
							y1: {
								// type: 'linear',
								display: true,
								position: 'right',
								title: {
									display: true,
									text:
										t('altitude', {
											ns: 'tripPage',
										}) + ' (m)',
								},

								// grid line settings
								grid: {
									color: '#58c8f2',
									lineWidth: 1,
									drawOnChartArea: false, // only want the grid lines for one axis to show up
								},
							},
						},
					},
				})

				speedChart = chart
			}
		} catch (error) {
			console.error(error)
		}
	}

	const outShareImage = async () => {
		setGeneratingSharedData(true)
		const pb = snackbar({
			message: '正在生成分享内容...',
			vertical: 'center',
			horizontal: 'center',
			padding: '14px 20px',
			backgroundColor: 'var(--saki-default-color)',
			color: '#fff',
			closeIcon: true,
		})
		pb.open()
		// 生成地图图片
		let mapEl: any = document.querySelector('#ti-map')
		let contentEl: any = document.querySelector('.ti-m-content')

		if (mapEl && contentEl) {
			console.log('mapEl.scrollHeight', mapEl.offsetHeight)
			const mapCvs = await html2canvas(mapEl, {
				backgroundColor: 'white',
				useCORS: true,
				scale: 1,
				height: mapEl.offsetHeight,
				windowHeight: mapEl.offsetHeight,
			})

			// 生成内容图
			const contentCvs = await html2canvas(contentEl, {
				backgroundColor: 'white',
				useCORS: true,
				scale: 1,
				height: contentEl.scrollHeight,
				windowHeight: contentEl.scrollHeight,
			})

			// const mapPng = mapCvs.toDataURL('image/png', 1)
			// const contentPng = contentCvs.toDataURL('image/png', 1)

			//创建新的canvas并绘制两个图片数据
			var shareImageCvs = document.createElement('canvas')
			var ctx = shareImageCvs.getContext('2d')
			if (ctx) {
				shareImageCvs.width = Math.max(mapCvs.width, contentCvs.width)
				shareImageCvs.height = mapCvs.height + contentCvs.height
				// console.log(mapCvs.height, contentCvs.height)
				// console.log(shareImageCvs.width, shareImageCvs.height)
				ctx.drawImage(mapCvs, 0, 0)
				ctx.drawImage(contentCvs, 0, mapCvs.height)
			}
			//将新的canvas转换为图片数据并保存
			setShareImageDataBase(shareImageCvs.toDataURL('image/png', 1))
			setGeneratingSharedData(false)
			pb.close()
			// var finalDataURL = newCanvas.toDataURL('image/png')
			// var link = document.createElement('a')
			// link.download = 'merged.png'
			// link.href = finalDataURL
			// link.click()
			// document.body?.appendChild(mapCvs)
			// document.body?.appendChild(contentCvs)
		}
	}
	return (
		<div className='trip-item-component'>
			{trip ? (
				<>
					<div id='ti-map'></div>

					<saki-scroll-view
						ref={bindEvent({
							distancetoborder: (e) => {
								// console.log(e.detail.top>0)

								setStartScroll(e.detail.top !== 0)
							},
						})}
						mode='Auto'
						scroll-bar='Hidden'
					>
						<div className={'ti-main ' + (startScroll ? 'startScroll' : '')}>
							<div className='ti-m-content'>
								<div className='ti-title'>
									{t((trip.type || '')?.toLowerCase(), {
										ns: 'tripPage',
									})}
									{' · '}
									{moment(Number(trip?.createTime) * 1000).format(
										'YYYY-MM-DD HH:mm:ss'
									)}
								</div>
								<div className='ti-distance'>
									<div className='ti-d-value'>
										{Math.round((trip?.statistics?.totalDistance || 0) / 10) /
											100}
									</div>
									<div className='ti-d-unit'>km</div>
								</div>
								<div className='ti-color'>
									<div
										// style={{
										// 	color: 'rgb(140, 200, 70)',
										// }}
										className='ti-c-min'
									>
										{t('slowest', {
											ns: 'tripPage',
										})}
									</div>
									<div
										// style={{
										// 	background: `linear-gradient(45deg, rgb(140, 200, 70), rgb(230, 110, 70))`,
										// }}
										className='ti-c-line'
									></div>
									<div
										// style={{
										// 	color: 'rgb(230, 110, 70)',
										// }}
										className='ti-c-max'
									>
										{t('fastest', {
											ns: 'tripPage',
										})}
									</div>
								</div>
								<div className='ti-data'>
									<div className='ti-d-item'>
										<span className='value'>
											{(trip?.statistics?.maxSpeed || 0) <= 0
												? 0
												: Math.round(
														((trip?.statistics?.maxSpeed || 0) * 3600) / 100
												  ) / 10}
										</span>
										<span className='name'>
											{t('maxSpeed', {
												ns: 'tripPage',
											}) + ' (km/h)'}
										</span>
									</div>
									<div className='ti-d-item'>
										<span className='value'>
											{formatTime(
												Number(trip?.startTime),
												Number(trip?.endTime)
											)}
										</span>
										<span className='name'>
											{t('duration', {
												ns: 'tripPage',
											}) + ' (h)'}
										</span>
									</div>
									<div className='ti-d-item'>
										<span className='value'>
											{trip?.statistics?.maxAltitude || 0}
										</span>
										<span className='name'>
											{t('maxAltitude', {
												ns: 'tripPage',
											}) + ' (m)'}
										</span>
									</div>
								</div>
								{/* {trip?.type === 'Running' ? (
  <div className='ti-pace'>
    <saki-title level='4' color='default'>
      配速
    </saki-title>
  </div>
) : (
  ''
)} */}

								<canvas id='speed-chart' width='400' height='200'></canvas>
							</div>
							<div className='ti-buttons'>
								<saki-button
									ref={bindEvent({
										tap: () => {
											outShareImage()
											console.log('share')
											// node &&
											// 	domtoimage
											// 		.toPng(node)
											// 		.then((dataUrl) => {
											// 			var img = new Image()
											// 			img.src = dataUrl
											// 			document.body.appendChild(img)
											// 		})
											// 		.catch(function (error) {
											// 			console.error('oops, something went wrong!', error)
											// 		})
										},
									})}
									margin='0px 0 20px'
									width='200px'
									padding='10px 10px'
									type='Primary'
									loading={generatingSharedData}
								>
									{t('share', {
										ns: 'common',
									})}
								</saki-button>
							</div>
						</div>
					</saki-scroll-view>
				</>
			) : (
				''
			)}

			<saki-modal
				ref={bindEvent({
					close() {
						setShareImageDataBase('')
					},
				})}
				width='100%'
				height='100%'
				max-width={config.deviceType === 'Mobile' ? '80%' : '480px'}
				max-height={config.deviceType === 'Mobile' ? '80%' : '580px'}
				mask
				border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
				border={config.deviceType === 'Mobile' ? 'none' : ''}
				mask-closable='false'
				background-color='rgba(0,0,0,0.3)'
				visible={!!shareImageDataBase}
			>
				<div className={'ti-share-component ' + config.deviceType}>
					<div className='ts-main'>
						<div className='ts-m-cvs'>
							<img src={shareImageDataBase} alt='' />
						</div>
						<div className='ts-m-footer'>
							<div className='buttons-header'>
								<saki-modal-header
									border
									close-icon={true}
									ref={bindEvent({
										close() {
											console.log('setShareImageDataBase')
											setShareImageDataBase('')
										},
									})}
									title={'分享'}
								/>
							</div>
							<div className='buttons-main'>
								<saki-button
									ref={bindEvent({
										tap: () => {
											let link = document.createElement('a')
											link.download = trip?.id + '.png'
											link.href = shareImageDataBase
											link.click()
										},
									})}
									padding='10px 10px'
									border='none'
									// padding="2"
								>
									<div className='buttons-item'>
										<div className='bi-icon download'>
											<saki-icon color='#fff' type='Download'></saki-icon>
										</div>
										<span>保存图片</span>
									</div>
								</saki-button>
								<saki-button
									ref={bindEvent({
										tap: () => {},
									})}
									padding='10px 10px'
									border='none'
									// padding="2"
								>
									<div className='buttons-item'>
										<div className='bi-icon link'>
											<saki-icon color='#fff' type='Link'></saki-icon>
										</div>
										<span>复制链接</span>
									</div>
								</saki-button>
							</div>
						</div>
					</div>
				</div>
			</saki-modal>
		</div>
	)
}

export default TripItemComponent
