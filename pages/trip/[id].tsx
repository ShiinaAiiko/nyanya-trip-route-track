import Head from 'next/head'
import TripLaout from '../../layouts/Trip'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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
} from '../../plugins/methods'
import { getGeoInfo } from 'findme-js'
import Leaflet from 'leaflet'
import moment from 'moment'
import { clearInterval, setInterval } from 'timers'
import { setConfig } from 'next/config'
import { httpApi } from '../../plugins/http/api'
import { protoRoot } from '../../protos'
import TripItemComponent from '../../components/TripItem'
import ShareTripComponent from '../../components/ShareTrip'
import { cnMap } from '../../store/config'
import TripDetailMobileComponent from '../../components/TripDetailUi'

let wakeLock: WakeLockSentinel | null
let timer: NodeJS.Timeout
let watchId: number
let tDistance = 0
let speedChart: any
let marker: Leaflet.Marker<any>

const TripPage = () => {
	const { t, i18n } = useTranslation('tripPage')
	const [mounted, setMounted] = useState(false)
	const api = useSelector((state: RootState) => state.api)
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)

	const router = useRouter()

	const { id, sk } = router.query

	const [map, setMap] = useState<Leaflet.Map>()
	const [gpsSignalStatus, setGpsSignalStatus] = useState(-1)
	const [type, setType] = useState<'Running' | 'Bike' | 'Drive'>('Running')

	const [startTrip, setStartTrip] = useState(false)
	const [startCountdown, setStartCountdown] = useState(-1)

	const [positionList, setPositionList] = useState<
		{
			latitude: number
			longitude: number
			altitude: number
			altitudeAccuracy: number
			accuracy: number
			heading: number
			speed: number
			timestamp: number
			distance: number
		}[]
	>([])
	const [position, setPosition] = useState<GeolocationPosition>()
	const [selectPosition, setSelectPosition] = useState<{
		latitude: number
		longitude: number
	}>({
		latitude: -10000,
		longitude: -10000,
	})

	const [startTime, setStartTime] = useState(0)
	const [listenTime, setListenTime] = useState(0)
	const [speed, setSpeed] = useState(0)
	const [maxSpeed, setMaxSpeed] = useState(0)
	const [isLockScreen, setIsLockScreen] = useState(false)

	const [count, setCount] = useState(0)
	const [distance, setDistance] = useState(0)
	const [time, setTime] = useState(0)
	const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
		'loaded'
	)
	const [blankPage, setBlankPage] = useState(false)
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

	return (
		<>
			<Head>
				<title>
					{t('pageTitle', {
						ns: 'tripPage',
					}) +
						' - ' +
						t('appTitle', {
							ns: 'common',
						})}
				</title>
			</Head>
			<div className='trip-detail-page'>
				{blankPage ? (
					<div className='td-none'>空白页面，请检查下Url路径是否正确</div>
				) : (
					''
				)}
				<TripItemComponent
					isShare={false}
					onBack={() => {}}
					onDelete={() => {}}
					onTrip={(trip) => {
						setBlankPage(!trip)
					}}
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
