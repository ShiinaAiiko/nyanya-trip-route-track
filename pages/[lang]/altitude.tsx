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
  rnJSBridge,
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

const AltitudePage = () => {
  const { t, i18n } = useTranslation('altitudePage')
  const [mounted, setMounted] = useState(false)

  const { config, user, geo } = useSelector((state: RootState) => {
    return state
  })

  const startTrip = useSelector((state: RootState) => state.trip.startTrip)

  const [dataTheme, setDataTheme] = useState('')

  const dispatch = useDispatch<AppDispatch>()

  const { speedColorRGBs, mapLayer, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('indexPage')
    return ml
  }, [
    config.configure,
    config.country,
    config.connectionOSM,
    config.initConfigure,
  ])

  const [compassData, setCompassData] = useState<CompassData>()

  useEffect(() => {
    setMounted(true)

    const init = async () => {
      setDataTheme((await storage.global.get('dataTheme')) || 'Dark')

      startCompass((data) => {
        console.log('altitudeposition startCompass', data)
        setCompassData(data)
      })
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

  const position = useMemo(() => {
    console.log('altitudeposition geo', geo?.position?.coords)
    if (geo.position?.timestamp) {
      const position = {
        longitude: toFixed(geo.position.coords.longitude) || 0,
        latitude: toFixed(geo.position.coords.latitude) || 0,
        altitude: toFixed(geo.position.coords.altitude || 0) || -1,
        altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
        accuracy: geo.position.coords.accuracy || -1,
        heading: toFixed(geo.position.coords.heading || 0) || -1,
        speed: toFixed(geo.position.coords.speed || 0) || -1,
        timestamp: geo.position.timestamp || 0,
      }

      // console.log('altitudeposition', position)
      return position
    }
  }, [geo.position?.timestamp])

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
      <div
        style={
          {
            '--position-transition': '1s',
          } as any
        }
        className={'altitude-page ' + (startTrip ? 'startTrip' : '')}
      >
        <div className={'ap-main '}>
          {/* <div className="ap-m-title">{t('pageTitle')}</div>
          <div className="ap-m-subtitle">{t('subtitle')}</div> */}

          <AltitudeDashboard
            radius={100}
            altitude={position?.altitude || -100000}
            heading={compassData?.heading || 0}
            // heading={350}
            // heading={50}
            altitudeAccuracy={position?.altitudeAccuracy || 0}
          ></AltitudeDashboard>

          <div className="ap-latlng">
            <div className="apl-lat">
              <span>{t('latitude')}</span>
              <span>
                {position?.latitude
                  ? position?.latitude.toFixed(6) + '° N'
                  : '---'}
              </span>
            </div>
            <div className="apl-lng">
              <span>{t('longitude')}</span>
              <span>
                {position?.longitude
                  ? position?.longitude.toFixed(6) + '° E'
                  : '---'}
              </span>
            </div>
            {/* <div className="apl-lng">
              <span>Heading</span>
              <span>
                {typeof compassData?.heading === 'number'
                  ? (compassData?.heading || 0).toFixed(2)
                  : '---'}
              </span>
            </div> */}
            {/* <div className="apl-lng">
              <span>absolute</span>
              <span>{compassData?.absolute}</span>
            </div>
            <div className="apl-lng">
              <span>alpha</span>
              <span>
                {compassData?.alpha ? compassData?.alpha.toFixed(2) : '---'}
              </span>
            </div> */}
          </div>

          <div className="ap-photo-buttons">
            <NoSSR>
              <SakiButton
                onTap={() => {
                  copyText(`${t('altitude')} ${position?.altitude !== -1 || position?.altitude === undefined ? position?.altitude : '---'}
${t('latitude')} ${position?.latitude ? position?.latitude.toFixed(6) + '° N' : '---'}
${t('longitude')} ${
                    position?.longitude
                      ? position?.longitude.toFixed(6) + '° E'
                      : '---'
                  }`)

                  snackbar({
                    message: t('copySuccessfully', {
                      ns: 'prompt',
                    }),
                    autoHideDuration: 2000,
                    vertical: 'top',
                    horizontal: 'center',
                    backgroundColor: 'var(--saki-default-color)',
                    color: '#fff',
                  }).open()
                }}
                width="40px"
                height="40px"
                // padding="24px"
                margin="16px 12px 0"
                type="CircleIconGrayHover"
              >
                <saki-icon
                  color="var(--saki-default-color)"
                  width="18px"
                  height="18px"
                  type="Copy"
                ></saki-icon>
              </SakiButton>
              {/* <SakiButton
                onTap={() => {
                  loadModal('AltitudeWatermarkModal', () => {
                    dispatch(
                      layoutSlice.actions.setOpenAltitudeWatermarkModal({
                        visible: true,
                      })
                    )
                  })
                }}
                width="40px"
                height="40px"
                // padding="24px"
                margin="16px 12px 0"
                type="CircleIconGrayHover"
              >
                <saki-icon
                  color="var(--saki-default-color)"
                  width="18px"
                  height="18px"
                  type="Camera"
                ></saki-icon>
              </SakiButton> */}
              <SakiButton
                onTap={async () => {
                  const files = await selectFiles()
                  console.log('files', files)
                  loadModal('AltitudeWatermarkModal', () => {
                    dispatch(
                      layoutSlice.actions.setOpenAltitudeWatermarkModal({
                        visible: true,
                        selectFile: files?.[0],
                        position: {
                          altitude: position?.altitude || 0,
                          latitude: position?.latitude || 0,
                          longitude: position?.longitude || 0,
                        },
                      })
                    )
                  })
                }}
                width="40px"
                height="40px"
                // padding="24px"
                margin="16px 12px 0"
                type="CircleIconGrayHover"
              >
                <saki-icon
                  color="var(--saki-default-color)"
                  width="18px"
                  height="18px"
                  type="Image"
                ></saki-icon>
              </SakiButton>
            </NoSSR>
          </div>
        </div>
      </div>
    </>
  )
}

AltitudePage.getLayout = getLayout

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

export default AltitudePage
