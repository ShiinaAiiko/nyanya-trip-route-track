import Head from 'next/head'
import TripLaout, { getLayout } from '../../../layouts/Trip'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { JourneyMemoriesItemPage } from '../../../components/JourneyMemories'
import { setJMState } from '../../../store/journeyMemory'

const JMDetailPage = () => {
  const { t, i18n } = useTranslation('journeyMemoriesModal')

  const jmState = useSelector((state: RootState) => state.journeyMemory)
  const { config } = useSelector((state: RootState) => state)

  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const { jmId } = useMemo(() => {
    const { id = '' } = router.query
    return {
      jmId: String(id) || '',
    }
  }, [router.query])

  const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

  const [loadStatus, setLoadStatus] = useState('loading')

  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('title')))
  }, [config.lang])

  useEffect(() => {
    dispatch(layoutSlice.actions.setBottomNavigator(true))
    dispatch(layoutSlice.actions.setLayoutHeader(true))
    dispatch(layoutSlice.actions.setLayoutHeaderFixed(false))
    setMounted(true)
  }, [])

  useEffect(() => {
    dispatch(
      setJMState({
        type: 'jmDetail',
        value: {
          id: String(jmId),
        } as protoRoot.journeyMemory.IJourneyMemoryItem,
      })
    )
  }, [jmId])

  // useEffect(() => {
  //   dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
  // }, [i18n.language])

  const onTrip = useCallback((trip?: protoRoot.trip.ITrip) => {
    dispatch(tripSlice.actions.setTripForDetailPage(trip))

    setTrip(trip)
    setLoadStatus('noMore')
  }, [])

  // console.log('router.query initMap', router, jmId, sk)

  return (
    <>
      <Head>
        <title>
          {(jmState.jmDetail?.name
            ? jmState.jmDetail?.name || ''
            : t('title', {
                ns: 'journeyMemoriesModal',
              })) +
            ' - ' +
            t('appTitle', {
              ns: 'common',
            })}
        </title>
      </Head>
      <div className="jm-page">
        {mounted ? (
          // <JourneyMemoriesItemPage preview />
          // <JourneyMemoriesIndexPage />
          ''
        ) : (
          <div className="jm-detail-none-page">
            <div className="td-none">空白页面，请检查下Url路径是否正确</div>
          </div>
        )}
      </div>
    </>
  )
}
JMDetailPage.getLayout = getLayout

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

export default JMDetailPage
