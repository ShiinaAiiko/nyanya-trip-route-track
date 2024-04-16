import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
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
import { bindEvent } from '@saki-ui/core'
import { Query } from '../plugins/methods'

const FooterComponent = (): JSX.Element => {
	const { t, i18n } = useTranslation()
	// console.log('Index Layout')
	const [mounted, setMounted] = useState(false)
	useEffect(() => {
		setMounted(true)
	}, [])
	const router = useRouter()
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const dispatch = useDispatch<AppDispatch>()
	const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

	let basePathname = router.pathname.replace('/[lang]', '')

	return (
		<div className='footer-component'>
			<div className='f-left'>
				<div className='f-language'>
					{mounted ? (
						<saki-dropdown
							visible={showLanguageDropdown}
							floating-direction='Center'
							ref={bindEvent({
								close: () => {
									setShowLanguageDropdown(false)
								},
							})}
						>
							<saki-button
								ref={bindEvent({
									tap: () => {
										console.log('more')
										setShowLanguageDropdown(true)
									},
								})}
								bg-color='transparent'
								padding='10px 6px 10px 12px'
								title='Language'
								border='none'
								type='Normal'
							>
								<div className='f-l-button'>
									<span>
										{t(config.language, {
											ns: 'languages',
										})}
									</span>
									<svg
										className='icon'
										viewBox='0 0 1024 1024'
										version='1.1'
										xmlns='http://www.w3.org/2000/svg'
										p-id='1644'
									>
										<path
											d='M725.333333 426.666667L512 640 298.666667 426.666667z'
											p-id='1645'
										></path>
									</svg>
								</div>
							</saki-button>
							<div slot='main'>
								<saki-menu
									ref={bindEvent({
										selectvalue: async (e) => {
											// dispatch(methods.config.setLanguage(e.detail.value))

											localStorage.setItem('language', e.detail.value)

											// router.locale = e.detail
											Object.keys(router.query).forEach((k) => {
												// console.log(k, basePathname.indexOf(`[${k}]`))
												const i = basePathname.indexOf(`[${k}]`)
												if (i >= 0) {
													basePathname = basePathname.replace(
														`[${k}]`,
														String(router.query[k])
													)

													delete router.query[k]
												}
											})
											// console.log('basePathname', basePathname)
											const pathname = Query(
												(e.detail.value === 'system' ? '' : '/' + e.detail.value) +
													basePathname,
												{
													...router.query,
													lang: '',
												}
											)
											console.log('pathname', router, pathname)

											router.replace(pathname || '/')

											setShowLanguageDropdown(false)
										},
									})}
								>
									{config.languages.map((v) => {
										return (
											<saki-menu-item
												key={v}
												padding='10px 18px'
												font-size='14px'
												value={v}
											>
												<div
													style={{
														cursor: 'pointer',
													}}
												>
													<span>
														{v !== 'system'
															? t(v, {
																	ns: 'languages',
															  }) +
															  ' - ' +
															  t(v, {
																	ns: 'languages',
																	lng: v,
															  })
															: t(v, {
																	ns: 'languages',
															  })}
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
				</div>
			</div>
			<div className='f-right'>
				<div className='f-r-copyright'>
					<span>{'© ' + new Date().getFullYear() + ' '}</span>
					<a target='_blank' href={'/'}>
						{t('appTitle', {
							ns: 'common',
						})}
					</a>
					<span> - </span>
					<a
						target='_blank'
						href='https://github.com/ShiinaAiiko/nyanya-toolbox'
					>
						{/* {t('aiikoBlog', {
												ns: 'common',
											})} */}
						Github
					</a>
					<span> - </span>
					<a target='_blank' href='https://im.aiiko.club/invite/78L2tkleM?t=0'>
						{'Shiina Aiiko'}
					</a>
				</div>
			</div>
		</div>
	)
}

export default FooterComponent
