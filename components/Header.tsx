import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
	RootState,
	userSlice,
	AppDispatch,
	layoutSlice,
	methods,
	configSlice,
} from '../store'
import { useTranslation } from 'react-i18next'
import { alert, bindEvent, snackbar } from '@saki-ui/core'
import { useSelector, useStore, useDispatch } from 'react-redux'
import axios from 'axios'
import { appListUrl } from '../config'
import MenuDropdownComponent from '../components/MenuDropdown'

const HeaderComponent = ({
	// 暂时仅fixed可用
	visible = true,
	fixed = false,
}: {
	visible: boolean
	fixed: boolean
}) => {
	const { t, i18n } = useTranslation('randomPasswordPage')
	const [mounted, setMounted] = useState(false)
	useEffect(() => {
		setMounted(true)
	}, [])
	const store = useStore()

	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()
	const { redirectUri, deviceId, appId, disableHeader } = router.query
	const layout = useSelector((state: RootState) => state.layout)
	const user = useSelector((state: RootState) => state.user)
	const config = useSelector((state: RootState) => state.config)

	const [openUserDropDownMenu, setOpenUserDropDownMenu] = useState(false)

	return (
		<div
			className={
				'tb-header ' + (fixed ? ' fixed' : '') + (!visible ? ' hide' : '')
			}
		>
			<div className='tb-h-bg'></div>
			<div
				style={{
					display: config.showIndexPageButton ? 'block' : 'none',
				}}
				className='tb-h-left'
			>
				<div className='logo-text'>
					{/* {layout.headerLogoText} */}
					{/* {t('appTitle', {
						ns: 'common',
					})} */}

					<MenuDropdownComponent />
				</div>
			</div>
			<div className='tb-h-center'></div>
			<div className='tb-h-right'>
				{mounted && (
					<>
						<meow-apps-dropdown
							style={{
								display: config.showIndexPageButton ? 'block' : 'none',
							}}
							bg-color='rgba(255,255,255,0.7)'
							language={config.lang}
							z-index='1001'
						></meow-apps-dropdown>

						<saki-dropdown
							visible={openUserDropDownMenu}
							floating-direction='Left'
							z-index='1001'
							ref={bindEvent({
								close: (e) => {
									setOpenUserDropDownMenu(false)
								},
							})}
						>
							<div
								onClick={() => {
									// onSettings?.('Account')
									setOpenUserDropDownMenu(!openUserDropDownMenu)
								}}
								className='tb-h-r-user'
							>
								<saki-avatar
									ref={bindEvent({
										tap: () => {
											// onSettings?.()
											// store.dispatch(userSlice.actions.logout({}))
										},
									})}
									className='qv-h-r-u-avatar'
									width='34px'
									height='34px'
									border-radius='50%'
									default-icon={'UserLine'}
									nickname={user.userInfo.nickname}
									src={user.userInfo.avatar}
									alt=''
								/>
							</div>
							<div slot='main'>
								<saki-menu
									ref={bindEvent({
										selectvalue: async (e) => {
											console.log(e.detail.value)
											switch (e.detail.value) {
												case 'Settings':
													dispatch(
														layoutSlice.actions.setOpenSettingsModal(true)
													)
													break
												case 'Login':
													dispatch(layoutSlice.actions.setOpenLoginModal(true))
													break
												case 'Logout':
													dispatch(methods.user.logout())
													break
												case 'TripHistory':
													// router.push('/tripHistory')
													dispatch(
														layoutSlice.actions.setOpenTripHistoryModal(true)
													)
													break
												case 'Vehicle':
													if (!user.isLogin) {
														dispatch(methods.user.loginAlert())
														return
													}
													dispatch(
														layoutSlice.actions.setOpenVehicleModal(true)
													)
													break
												case 'CreateCustomTrip':
													if (!user.isLogin) {
														dispatch(methods.user.loginAlert())
														return
													}
													dispatch(
														layoutSlice.actions.setOpenCreateCustomTripModal(
															true
														)
													)
													break
												case 'VisitedCities':
													if (!user.isLogin) {
														dispatch(methods.user.loginAlert())
														return
													}
													dispatch(
														layoutSlice.actions.setOpenVisitedCitiesModal(true)
													)
													break
												case 'Account':
													dispatch(
														layoutSlice.actions.setSettingType('Account')
													)
													dispatch(
														layoutSlice.actions.setOpenSettingsModal(true)
													)
													break
												case 'Route':
													location.replace(
														(router.query.lang
															? '/' + (router.query.lang || '')
															: '') + '/trackRoute'
													)
													break
												case 'IndexPage':
													location.replace(
														(router.query.lang
															? '/' + (router.query.lang || '')
															: '') + '/'
													)
													break

												default:
													break
											}
											setOpenUserDropDownMenu(false)
										},
									})}
								>
									{!user.isLogin ? (
										<saki-menu-item padding='10px 18px' value={'Login'}>
											<div className='tb-h-r-user-item'>
												<saki-icon color='#666' type='User'></saki-icon>
												<span>
													{t('login', {
														ns: 'common',
													})}
												</span>
											</div>
										</saki-menu-item>
									) : (
										''
									)}
									{user.isLogin ? (
										<>
											<saki-menu-item padding='10px 18px' value={'Account'}>
												<div className='tb-h-r-user-item'>
													<saki-avatar
														ref={bindEvent({
															tap: () => {
																// onSettings?.()
																// store.dispatch(userSlice.actions.logout({}))
															},
														})}
														className='qv-h-r-u-avatar'
														width='20px'
														height='20px'
														margin='0 10px 0 0'
														border-radius='50%'
														default-icon={'UserLine'}
														nickname={user.userInfo.nickname}
														src={user.userInfo.avatar}
														alt=''
													/>
													<span className='text-elipsis'>
														{user.userInfo.nickname}
													</span>
												</div>
											</saki-menu-item>
											<saki-menu-item padding='10px 18px' value={'TripHistory'}>
												<div className='tb-h-r-user-item'>
													<saki-icon color='#666' type='TripRoute'></saki-icon>
													<span className='text-elipsis'>
														{t('tripHistory', {
															ns: 'settings',
														})}
													</span>
												</div>
											</saki-menu-item>
											{/* <saki-menu-item padding='10px 18px' value={'MergeTrip'}>
												<div className='tb-h-r-user-item'>
													<saki-icon color='#666' type='TripRoute'></saki-icon>
													<span className='text-elipsis'>
														{t('mergeTrip', {
															ns: 'settings',
														})}
													</span>
												</div>
											</saki-menu-item> */}
										</>
									) : (
										''
									)}

									<saki-menu-item padding='10px 18px' value={'Vehicle'}>
										<div className='tb-h-r-user-item'>
											<saki-icon color='#666' type='Drive'></saki-icon>
											<span>
												{t('pageTitle', {
													ns: 'vehicleModal',
												})}
											</span>
										</div>
									</saki-menu-item>
									{router.pathname.indexOf('trackRoute') < 0 ? (
										<saki-menu-item padding='10px 18px' value={'Route'}>
											<div className='tb-h-r-user-item'>
												<saki-icon color='#666' type='Route'></saki-icon>
												<span>
													{t('pageTitle', {
														ns: 'trackRoutePage',
													})}
												</span>
											</div>
										</saki-menu-item>
									) : (
										<saki-menu-item padding='10px 18px' value={'IndexPage'}>
											<div className='tb-h-r-user-item'>
												<saki-icon color='#666' type='TripRoute'></saki-icon>
												<span className='text-elipsis'>
													{t('pageTitle', {
														ns: 'tripPage',
													})}
												</span>
											</div>
										</saki-menu-item>
									)}
									{user.isLogin ? (
										<saki-menu-item
											padding='10px 18px'
											value={'CreateCustomTrip'}
										>
											<div className='tb-h-r-user-item'>
												<saki-icon color='#666' type='Add'></saki-icon>
												<span>
													{t('title', {
														ns: 'createCustomTripModal',
													})}
												</span>
											</div>
										</saki-menu-item>
									) : (
										''
									)}
									{user.isLogin ? (
										<saki-menu-item padding='10px 18px' value={'VisitedCities'}>
											<div className='tb-h-r-user-item'>
												<saki-icon color='#666' type='Add'></saki-icon>
												<span>
													{t('visitedCities', {
														ns: 'VisitedCitiesModal',
													})}
												</span>
											</div>
										</saki-menu-item>
									) : (
										''
									)}
									<saki-menu-item padding='10px 18px' value={'Settings'}>
										<div className='tb-h-r-user-item'>
											<saki-icon color='#666' type='Settings'></saki-icon>
											<span>
												{t('title', {
													ns: 'settings',
												})}
											</span>
										</div>
									</saki-menu-item>
									{user.isLogin ? (
										<saki-menu-item padding='10px 18px' value={'Logout'}>
											<div className='tb-h-r-user-item'>
												<saki-icon color='#666' type='Logout'></saki-icon>
												<span>
													{t('logout', {
														ns: 'common',
													})}
												</span>
											</div>
										</saki-menu-item>
									) : (
										''
									)}
								</saki-menu>
							</div>
						</saki-dropdown>
					</>
				)}
			</div>
		</div>
	)
}

export default HeaderComponent
