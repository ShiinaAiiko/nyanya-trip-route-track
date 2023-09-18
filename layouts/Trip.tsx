import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
// import './App.module.scss'
import { useSelector, useStore, useDispatch } from 'react-redux'
import {
	RootState,
	userSlice,
	AppDispatch,
	layoutSlice,
	methods,
	configSlice,
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
import { bindEvent } from '@saki-ui/core'
import axios from 'axios'
// import parserFunc from 'ua-parser-js'

const ToolboxLayout = ({ children }: propsType): JSX.Element => {
	const { t, i18n } = useTranslation()
	const [mounted, setMounted] = useState(false)
	// console.log('Index Layout')

	// const cccc = useSelector((state: RootState) => state.)
	const dispatch = useDispatch<AppDispatch>()
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

	useEffect(() => {
		setMounted(true)

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
        }, 4000)
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
			<div className='trip-layout'>
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
			</div>
		</>
	)
}

export default ToolboxLayout
