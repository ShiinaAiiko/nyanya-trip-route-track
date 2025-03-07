import Head from 'next/head'
import TripLaout, { getLayout } from '../../../layouts/Trip'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
	RootState,
	AppDispatch,
	layoutSlice,
	useAppDispatch,
	methods,
	apiSlice,
	tripSlice,
} from '../../../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { formatDistance } from '../../../plugins/methods'
import { protoRoot } from '../../../protos'
import TripItemComponent from '../../../components/TripItem'
import {
	changeLanguage,
	defaultLanguage,
	languages,
} from '../../../plugins/i18n/i18n'

const TripDetailPage = () => {
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
		dispatch(tripSlice.actions.setTripForDetailPage(trip))

		setTrip(trip)
	}, [])

	// console.log('router.query initMap', router.query, id, sk)

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
TripDetailPage.getLayout = getLayout

export async function getStaticPaths() {
	return {
		paths:
			process.env.OUTPUT === 'export'
				? languages.map((v) => {
						return {
							params: {
								lang: v,
							},
						}
				  })
				: [],
		fallback: true,
	}
}

export async function getStaticProps({
	params,
	locale,
}: {
	params: {
		lang: string
	}
	locale: string
}) {
	process.env.OUTPUT === 'export' && changeLanguage(params.lang as any)

	return {
		props: {
			lang: params.lang || defaultLanguage,
		},
	}
}

export default TripDetailPage
