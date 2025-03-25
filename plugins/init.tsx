import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { RootState, AppDispatch, methods, apiSlice } from '../store'
import { useSelector, useStore, useDispatch } from 'react-redux'

import * as nyanyalog from 'nyanyajs-log'
import { sakiui, meowApps } from '../config'
import './i18n/i18n'
import { initPublic } from './public'
nyanyalog.timer()

const Init = () => {
	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()
	const api = useSelector((state: RootState) => state.api)
	const store = useStore()

	useEffect(() => {
		const init = async () => {
			document.body.ontouchstart = () => {}
			initPublic()

			await dispatch(methods.config.init()).unwrap()
		}
		init()
	}, [])

	return (
		<>
			<Head>
				<link rel='icon' href='/favicon.ico' />
				<link rel='manifest' href={`/manifest.json`} />
				<script src='/js/sw-register.js' defer></script>
				<script noModule src={sakiui.jsurl}></script>
				<script type='module' src={sakiui.esmjsurl}></script>
				<script noModule src={meowApps.jsurl}></script>
				<script type='module' src={meowApps.esmjsurl}></script>
			</Head>
		</>
	)
}

export default Init
