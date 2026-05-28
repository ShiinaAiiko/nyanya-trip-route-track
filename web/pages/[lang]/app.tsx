import Head from 'next/head'
import TripLaout, { getLayout } from '../../layouts/Trip'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../../components/Footer'
import store, {
  RootState,
  AppDispatch,
  layoutSlice,
  useAppDispatch,
  methods,
  apiSlice,
  geoSlice,
} from '../../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar, alert } from '@saki-ui/core'
import {
  AsyncQueue,
  Debounce,
  deepCopy,
  NyaNyaWasm,
  QueueLoop,
} from '@nyanyajs/utils'
import {
  getRegExp,
  copyText,
  getRandomPassword,
  getSpeedColor,
  getDistance,
  formatTime,
  getLatLng,
  formatDistance,
  roadColorFade,
  formatPositionsStr,
  getTimeLimit,
  toFixed,
  getLatLngGcj02ToWgs84,
  isRoadColorFade,
  normalizeLeafletCoordinates,
  // testGpsData,
} from '../../plugins/methods'
import { getGeoInfo } from 'findme-js'
import moment from 'moment'
import { httpApi } from '../../plugins/http/api'
import { protoRoot } from '../../protos'
import {
  TripType,
  cnMap,
  configSlice,
  eventListener,
  getMapLayer,
  osmMap,
  nyanyaJSBridge,
} from '../../store/config'
import { storage } from '../../store/storage'
import NoSSR from '../../components/NoSSR'
import md5 from 'blueimp-md5'
import ButtonsComponent from '../../components/Buttons'
import {
  changeLanguage,
  defaultLanguage,
  languages,
} from '../../plugins/i18n/i18n'
import {
  GpsPoint,
  initTripCity,
  reupdateTripPositions,
  Statistics,
  tripSlice,
} from '../../store/trip'
import DashboardComponent, { DashboardLayer } from '../../components/Dashboard'

import * as geolib from 'geolib'
import { getIconType } from '../../components/Vehicle'
import {
  bindRealTimePositionListMarkerClickEvent,
  clearRealTimePositionListMarker,
  createMyPositionMarker,
  initSyncPosition,
  positionSlice,
} from '../../store/position'
import FiexdWeatherComponent from '../../components/FiexdWeather'
import {
  createDistanceScaleControl,
  getZoomDistanceScale,
  smoothSetBearing,
} from '../../plugins/map'
import { loadModal } from '../../store/layout'
import { LayerButtons } from '../../components/MapLayer'
import NewDashboardComponent from '../../components/Dashboard'
import { getRoadId } from '../../store/geo'
import { selectFiles, uploadFile } from '../../store/file'

import * as Leaflet from 'leaflet'
import AltitudeDashboard from '../../components/AltitudeDashboard'
import { CompassData, startCompass } from '../../plugins/compass'
import {
  SakiButton,
  SakiModal,
} from '../../components/saki-ui-react/components'
// import 'leaflet-rotate'

let tempTimer: any

const AppPage = () => {
  const { t, i18n } = useTranslation('appPage')
  const [mounted, setMounted] = useState(false)

  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)

  const startTrip = useSelector((state: RootState) => state.trip.startTrip)

  const [dataTheme, setDataTheme] = useState('')

  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    setMounted(true)

    const init = async () => {
      setDataTheme((await storage.global.get('dataTheme')) || 'Dark')
    }
    init()
  }, [])

  useEffect(() => {
    dispatch(
      layoutSlice.actions.setLayoutHeaderLogoText(
        t('appTitle', { ns: 'common' })
      )
    )
  }, [config.lang])

  return (
    <>
      <Head>
        <title>
          {t('pageTitle') +
            ' - ' +
            t('appTitle', {
              ns: 'common',
            })}
        </title>

        <meta name="description" content={t('subtitle')} />
      </Head>
      <div className={'app-page ' + (startTrip ? 'startTrip' : '')}>
        AppPage
      </div>
    </>
  )
}

AppPage.getLayout = getLayout

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

export default AppPage
