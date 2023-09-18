import Head from 'next/head'
import TripLaout from '../../layouts/Trip'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../../components/Footer'
import path from 'path'
import {
	RootState,
	AppDispatch,
	layoutSlice,
	useAppDispatch,
	methods,
	apiSlice,
} from '../../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'
import { deepCopy, NyaNyaWasm, QueueLoop } from '@nyanyajs/utils'
import {
	getRegExp,
	copyText,
	getRandomPassword,
	getSpeedColor,
	getDistance,
	formatTime,
	formatDistance,
} from '../../plugins/methods'
import { getGeoInfo } from 'findme-js'
import Leaflet from 'leaflet'
import moment from 'moment'
import { clearInterval, setInterval } from 'timers'
import { setConfig } from 'next/config'
import { httpApi } from '../../plugins/http/api'
import { protoRoot } from '../../protos'
import TripItemComponent from '../../components/TripItem'
import { cnMap } from '../../store/config'

const TripPage = () => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const router = useRouter()

	const { id, sk } = router.query

	const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

	const dispatch = useDispatch<AppDispatch>()

	useEffect(() => {
		dispatch(layoutSlice.actions.setLayoutHeader(true))
		dispatch(layoutSlice.actions.setLayoutHeaderFixed(false))
		setMounted(true)
	}, [])

	useEffect(() => {
		dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
	}, [i18n.language])

	const onTrip = useCallback((trip?: protoRoot.trip.ITrip) => {
		setTrip(trip)
	}, [])

	return (
		<>
			<Head>
				<title>
					{(trip?.id
						? formatDistance(trip.statistics?.distance || 0) +
						  ' - ' +
						  t((trip.type || '')?.toLowerCase(), {
								ns: 'tripPage',
						  }) +
						  ' - '
						: '') +
						t('pageTitle', {
							ns: 'tripPage',
						}) +
						' - ' +
						t('appTitle', {
							ns: 'common',
						})}
				</title>
			</Head>
			<div className='trip-detail-page'>
				{!trip?.id ? (
					<div className='td-none'>空白页面，请检查下Url路径是否正确</div>
				) : (
					''
				)}
				<TripItemComponent
					isShare={false}
					onBack={() => {}}
					onDelete={() => {}}
					onTrip={onTrip}
					tripId={String(id || '')}
					shareKey={String(sk || '')}
				/>
			</div>
		</>
	)
}
TripPage.getLayout = function getLayout(page: any) {
	return <TripLaout>{page}</TripLaout>
}

export default TripPage
