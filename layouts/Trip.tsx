import Head from 'next/head'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
// import './App.module.scss'
import { useSelector, useStore, useDispatch } from 'react-redux'
import store, {
	RootState,
	userSlice,
	AppDispatch,
	layoutSlice,
	methods,
	configSlice,
	geoSlice,
} from '../store'
import { useTranslation } from 'react-i18next'
// import { userAgent } from './userAgent'
import { userAgent, CipherSignature, NyaNyaWasm } from '@nyanyajs/utils'
import debounce from '@nyanyajs/utils/dist/debounce'
import * as nyanyalog from 'nyanyajs-log'
import HeaderComponent from '../components/Header'
import SettingsComponent from '../components/Settings'
import LoginComponent from '../components/Login'
import TripHistoryComponent from '../components/TripHistory'
import NoSSR from '../components/NoSSR'
import { bindEvent, snackbar } from '@saki-ui/core'
import axios from 'axios'
import { position } from 'html2canvas/dist/types/css/property-descriptors/position'
import TripEditComponent from '../components/TripEdit'
// import parserFunc from 'ua-parser-js'

// const NonSSRWrapper = (props) => (
// 	<React.Fragment>{props.children}</React.Fragment>
// )

const ToolboxLayout = ({ children }: propsType): JSX.Element => {
	const { t, i18n } = useTranslation()
	const [mounted, setMounted] = useState(false)

	const watchId = useRef(-1)

	// console.log('Index Layout')

	// const cccc = useSelector((state: RootState) => state.)
	const dispatch = useDispatch<AppDispatch>()
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

	const [hideLoading, setHideLoading] = useState(false)
	const [sakiuiInit, setSakiuiInit] = useState(false)
	const [loadProgressBar, setLoadProgressBar] = useState(false)
	const [progressBar, setProgressBar] = useState(0.01)

	useEffect(() => {
		setMounted(true)
		setProgressBar(progressBar + 0.2 >= 1 ? 1 : progressBar + 0.2)

		dispatch(methods.user.Init()).unwrap()
		dispatch(methods.sso.Init()).unwrap()
		dispatch(methods.user.InitUser()).unwrap()

		initNyaNyaWasm()

		dispatch(methods.config.getDeviceType())

		window.addEventListener('resize', () => {
			dispatch(methods.config.getDeviceType())
		})
		window.addEventListener('load', () => {
			dispatch(methods.config.getDeviceType())
		})

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					// const t = setTimeout(() => {
					// const L: typeof Leaflet = (window as any).L
					// if (L) {

					dispatch(
						geoSlice.actions.setSelectPosition({
							longitude: pos.coords.longitude,
							latitude: pos.coords.latitude,
						})
					)

					dispatch(geoSlice.actions.setPosition(pos))

					// setPosition({
					// 	...pos,
					// 	// coords: {
					// 	// 	...pos.coords,
					// 	// 	latitude: 29.417266,
					// 	// 	longitude: 105.594791,
					// 	// },
					// })
					// clearTimeout(t)
					// }
					// }, 500)
				},
				(error) => {
					if (error.code === 1) {
						snackbar({
							message: '必须开启定位权限，请检查下是否开启定位权限',
							autoHideDuration: 2000,
							vertical: 'top',
							horizontal: 'center',
						}).open()
					}
					console.log('GetCurrentPosition Error', error)
				},
				{ enableHighAccuracy: true }
			)
		} else {
			console.log('该浏览器不支持获取地理位置')
		}

		const initConnectionOSM = async () => {
			try {
				console.time('initConnectionOSM')
				dispatch(
					configSlice.actions.setConnectionOSM(
						(await fetch('https://tile.openstreetmap.org')).status === 200
							? 1
							: -1
					)
				)
				console.timeEnd('initConnectionOSM')
			} catch (error) {
				dispatch(configSlice.actions.setConnectionOSM(-1))
			}
		}
		initConnectionOSM()
		const initCountry = async () => {
			try {
				console.time('initCountry')
				const timer = setTimeout(() => {
					dispatch(configSlice.actions.setCountry('Argentina'))
					clearTimeout(timer)
				}, 3000)
				const res = await axios(
					'https://tools.aiiko.club/api/v1/ip/details?ip=&language=en-US'
				)
				if (res?.data?.code === 200 && res?.data?.data?.country) {
					// dispatch(configSlice.actions.setCountry('Argentina'))
					dispatch(configSlice.actions.setCountry(res.data.data.country))
				} else {
					dispatch(configSlice.actions.setCountry('Argentina'))
				}
				clearTimeout(timer)
				console.timeEnd('initCountry')
			} catch (error) {
				dispatch(configSlice.actions.setCountry('Argentina'))
			}
		}
		initCountry()
	}, [])

	useEffect(() => {
		if (loadProgressBar && sakiuiInit && mounted) {
			progressBar < 1 &&
				setTimeout(() => {
					setProgressBar(1)
				}, 500)
		}
	}, [loadProgressBar, sakiuiInit, mounted])

	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(watchId.current)

			watchId.current = navigator.geolocation.watchPosition(
				(pos) => {
					console.log('watchPosition', pos)
					// setListenTime(new Date().getTime())

					dispatch(geoSlice.actions.setPosition(pos))
				},
				(error) => {
					console.log('GetCurrentPosition Error', error)
				},
				{
					enableHighAccuracy: true,
				}
			)
			console.log('watchPosition', watchId.current)
		} else {
			console.log('该浏览器不支持获取地理位置')
		}
	}, [config.connectionOSM])

	const initNyaNyaWasm = async () => {
		NyaNyaWasm.setWasmPath('./nyanyajs-utils-wasm.wasm')
		NyaNyaWasm.setCoreJsPath('./wasm_exec.js')

		// const res = await (
		// 	await fetch(
		// 		'https://saass.aiiko.club/api/v1/share?path=/NyaNyaJS/1.0.0&sid=EWmdAO1GBw'
		// 	)
		// ).json()
		// console.log('initNyaNyaWasm', res?.data?.data?.list)
		// if (res?.data?.data?.list?.length) {
		// 	res?.data?.data?.list.forEach((v: any) => {
		// 		console.log(v)
		// 		if (v.fileName === 'wasm_exec.js') {
		// 			NyaNyaWasm.setCoreJsPath(v.urls.domainUrl + v.urls.shortUrl)
		// 		}
		// 		if (
		// 			v.fileName === 'nyanyajs-utils-wasm.wasm' ||
		// 			v.fileName === 'wasm_exec.js'
		// 		) {
		// 			NyaNyaWasm.setWasmPath(v.urls.domainUrl + v.urls.shortUrl)
		// 		}
		// 	})
		// }
	}
	return (
		<>
			<Head>
				<meta httpEquiv='X-UA-Compatible' content='IE=edge'></meta>
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1.0'
				></meta>
				<link
					rel='stylesheet'
					href='https://unpkg.com/leaflet@1.9.3/dist/leaflet.css'
					integrity='sha256-kLaT2GOSpHechhsozzB+flnD+zUyjE2LlfWPgU04xyI='
					crossOrigin=''
				/>
				<script
					src='https://unpkg.com/leaflet@1.9.3/dist/leaflet.js'
					integrity='sha256-WBkoXOwTeyKclOHuWtc+i2uENFpDZ9YPdf5Hf+D7ewM='
					crossOrigin=''
				></script>
			</Head>
			<div className='trip-layout saki-loading'>
				<NoSSR>
					<>
						<saki-base-style></saki-base-style>
						<saki-init
							ref={bindEvent({
								mounted(e) {
									console.log('mounted', e)
									setSakiuiInit(true)
									// store.dispatch(
									// 	configSlice.actions.setStatus({
									// 		type: 'sakiUIInitStatus',
									// 		v: true,
									// 	})
									// )
									// setProgressBar(progressBar + 0.2 >= 1 ? 1 : progressBar + 0.2)
									// setProgressBar(.6)
								},
							})}
						></saki-init>
					</>
				</NoSSR>

				<div
					onTransitionEnd={() => {
						console.log('onTransitionEnd')
						// setHideLoading(true)
					}}
					className={
						'il-loading active ' +
						// (!(appStatus.noteInitStatus && appStatus.sakiUIInitStatus)
						// 	? 'active '
						// 	: '') +
						(hideLoading ? 'hide' : '')
					}
				>
					{/* <div className='loading-animation'></div>
				<div className='loading-name'>
					{t('appTitle', {
						ns: 'common',
					})}
				</div> */}
					<div className='loading-logo'>
						<img src={'/icons/256x256.png'} alt='' crossOrigin='anonymous' />
					</div>
					{/* <div>progressBar, {progressBar}</div> */}
					<div className='loading-progress-bar'>
						{/* {dynamic(
							() => (
								<div></div>
							),
							{
								ssr: false,
							}
						)} */}

						<NoSSR>
							<saki-linear-progress-bar
								ref={bindEvent({
									loaded: () => {
										console.log('progress-bar', progressBar)
										setProgressBar(0)
										setTimeout(() => {
											progressBar < 1 &&
												setProgressBar(
													progressBar + 0.2 >= 1 ? 1 : progressBar + 0.2
												)
										}, 0)
										setLoadProgressBar(true)
									},
									transitionEnd: (e: CustomEvent) => {
										console.log('progress-bar', e)
										if (e.detail === 1) {
											const el: HTMLDivElement | null =
												document.querySelector('.il-loading')
											if (el) {
												const animation = el.animate(
													[
														{
															opacity: 1,
														},
														{
															opacity: 0,
														},
													],
													{
														duration: 500,
														iterations: 1,
													}
												)
												animation.onfinish = () => {
													el.style.display = 'none'
													setHideLoading(true)
												}
											}
										}
									},
								})}
								max-width='280px'
								transition='width 1s'
								width='100%'
								height='10px'
								progress={progressBar}
								border-radius='5px'
							></saki-linear-progress-bar>
						</NoSSR>
					</div>
				</div>
				<div className='tl-main'>
					<HeaderComponent
						visible={layout.header}
						fixed={layout.headerFiexd}
					></HeaderComponent>
					<div
						className={'tl-m-main ' + (layout.headerFiexd ? 'headerFiexd' : '')}
					>
						{children}
					</div>
				</div>

				{/* <>
					{mounted ? (
						<>
							<saki-base-style></saki-base-style>

							<saki-chat-layout
								bottom-navigator={layout.bottomNavigator && innerWidth <= 768}
								device-type={config.deviceType}
							>
								<div className='tl-side-navigator' slot='side-navigator'>
									<saki-chat-layout-side-navigator
										ref={bindEvent({
											expandStatus: async (e) => {},
											change: async (e) => {},
										})}
										expand={false}
									>
										<div slot='top'>
											<saki-chat-layout-side-navigator-menu-item
												margin='0 0 12px 0'
												active={true}
												icon-type={'Messages'}
												name={'开始行程'}
												count={0}
												href='/'
											></saki-chat-layout-side-navigator-menu-item>
											<saki-chat-layout-side-navigator-menu-item
												margin='0 0 12px 0'
												active={false}
												icon-type={'User'}
												name={'行程历史'}
												count={0}
												href='/contacts'
											></saki-chat-layout-side-navigator-menu-item>
										
										</div>
										<div slot='bottom'>
											<saki-chat-layout-side-navigator-menu-item
												margin='12px 0 0 0'
												active={false}
												icon-type={'Settings'}
												icon-size='20px'
												name={'SETTINGS'}
												href='/settings'
											></saki-chat-layout-side-navigator-menu-item>
										</div>
									</saki-chat-layout-side-navigator>
								</div>
								<div className='tl-bottom-navigator' slot='bottom-navigator'>
									<saki-chat-layout-bottom-navigator
										ref={bindEvent({
											expandStatus: async (e) => {},
											change: async (e) => {},
										})}
									>
										<saki-chat-layout-bottom-navigator-item
											active={true}
											icon-type={'Messages'}
											name={'开始行程'}
											count={0}
											href='/'
										></saki-chat-layout-bottom-navigator-item>
										<saki-chat-layout-bottom-navigator-item
											active={false}
											icon-type={'User'}
											name={'行程历史'}
											// count={20}
											count={0}
											href='/contacts'
										></saki-chat-layout-bottom-navigator-item>
										<saki-chat-layout-bottom-navigator-item
											active={false}
											icon-type={'Settings'}
											name={'SETTINGS'}
											// count={20}
											count={0}
											href='/contacts'
										></saki-chat-layout-bottom-navigator-item>
									</saki-chat-layout-bottom-navigator>
								</div>
							
							</saki-chat-layout>
						</>
					) : (
						''
					)}
				</> */}
				{mounted ? (
					<>
						<SettingsComponent
							visible={layout.openSettingsModal}
							// type={openSettingType}
							onClose={() => {
								dispatch(layoutSlice.actions.setOpenSettingsModal(false))
							}}
						/>
						<LoginComponent />
						<TripHistoryComponent />
					</>
				) : (
					''
				)}

				<TripEditComponent />
			</div>
		</>
	)
}

export default ToolboxLayout
