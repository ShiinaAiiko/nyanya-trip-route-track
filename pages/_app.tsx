import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { Router } from 'next/router'
import '../layouts/Trip.scss'
import './[lang]/index.scss'
import './[lang]/trackRoute.scss'
import './[lang]/trip/detail.scss'
import '../components/Footer.scss'
import '../components/Settings.scss'
import '../components/Header.scss'
import '../components/Login.scss'
import '../components/MenuDropdown.scss'
import '../components/TripHistory.scss'
import '../components/TripItem.scss'
import '../components/TripEdit.scss'
import '../components/MapTrackRoute.scss'
import '../components/Buttons.scss'
import '../components/Statistics.scss'
import '../components/ReplayTrip.scss'
import '../components/SpeedMeter.scss'
import '../components/Filter.scss'
import '../components/Vehicle.scss'
import '../components/FindLocation.scss'
import '../components/FiexdWeather.scss'
import '../components/CreateCustomTrip.scss'
import '../components/VisitedCities.scss'

import { useRouter } from 'next/router'
import { Provider } from 'react-redux'
import store from '../store'
import Init from '../plugins/init'

import * as nyanyalog from 'nyanyajs-log'

nyanyalog.timer()
nyanyalog.config({
	format: {
		function: {
			fullFunctionChain: false,
		},
		prefixTemplate: '[{{Timer}}] [{{Type}}] [{{File}}]@{{Name}}',
	},
})
// import '../assets/style/base.scss'

export default function App({ Component, pageProps }: any) {
	const getLayout = Component.getLayout || ((page: any) => page)

	const router = useRouter()

	const ProviderAny = Provider as any

	return (
		<ProviderAny store={store}>
			<>
				<Init />

				{getLayout() ? (
					getLayout(<Component router={router} {...pageProps} />, pageProps)
				) : (
					<Component router={router} {...pageProps} />
				)}
			</>
		</ProviderAny>
	)
}
