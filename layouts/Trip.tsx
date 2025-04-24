import Head from 'next/head'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
// import './App.module.scss'
import { useSelector, useStore, useDispatch } from 'react-redux'
import store, {
  RootState,
  userSlice,
  AppDispatch,
  layoutSlice,
  methods,
  configSlice,
  geoSlice,
} from '../store'
import { useTranslation } from 'react-i18next'
// import { userAgent } from './usergAgent'
import { userAgent, CipherSignature, NyaNyaWasm } from '@nyanyajs/utils'
import debounce, { Debounce } from '@nyanyajs/utils/dist/debounce'
import * as nyanyalog from 'nyanyajs-log'
import HeaderComponent from '../components/Header'
import SettingsComponent from '../components/Settings'
import LoginComponent from '../components/Login'
import TripHistoryComponent from '../components/TripHistory'
import AddVehicleComponent from '../components/Vehicle'
import StatisticsComponent from '../components/Statistics'
import NoSSR from '../components/NoSSR'
import { bindEvent, snackbar } from '@saki-ui/core'
import axios from 'axios'
import TripEditComponent from '../components/TripEdit'
import ReplayTripComponent from '../components/ReplayTrip'

import {
  defaultLanguage,
  detectionLanguage,
  changeLanguage,
  resources,
  initI18n,
} from '../plugins/i18n/i18n'
import Leaflet from 'leaflet'
import { useRouter } from 'next/router'
import { storage } from '../store/storage'
import { isFullScreen } from '../plugins/methods'
import { eventListener } from '../store/config'
import FindLocationComponent from '../components/FindLocation'
import screenfull from 'screenfull'
import Script from 'next/script'
import CreateCustomTripComponent from '../components/CreateCustomTrip'
import VisitedCitiesModal from '../components/VisitedCities'
import JourneyMemoriesModal from '../components/JourneyMemories'
import LoadModalComponent, {
  LoadModalsComponent,
} from '../components/LoadModal'
import { loadPwaNewVersion } from '../plugins/loadPwaNewVersion'
import { SakiI18n } from '../components/saki-ui-react/components'

// import { testGpsData } from '../plugins/methods'
// import parserFunc from 'ua-parser-js'

// const NonSSRWrapper = (props) => (
// 	<React.Fragment>{props.children}</React.Fragment>
// )

let watchPosTimer: NodeJS.Timeout

const ToolboxLayout = ({ children, pageProps }: any): JSX.Element => {
  const { t, i18n } = useTranslation()

  // console.log('dddddd 1', 111)
  const { lang } = pageProps

  if (pageProps && process.env.OUTPUT === 'export') {
    const lang =
      pageProps?.router?.asPath?.split('/')?.[1] ||
      pageProps?.lang ||
      (typeof window === 'undefined' ? defaultLanguage : detectionLanguage())
    // isInPwa()

    // console.log(
    // 	'isInPwa',
    // 	isInPwa(),
    // 	detectionLanguage() as any,
    // )
    pageProps && i18n.language !== lang && changeLanguage(lang)
  }

  useEffect(() => {
    const l = lang || 'system'

    l && dispatch(methods.config.setLanguage(l))
  }, [lang])

  const [mounted, setMounted] = useState(false)
  const [watchPosDeb] = useState(new Debounce())

  const watchId = useRef(-1)

  const router = useRouter()

  const { debug, nativeConsole } = router.query

  // console.log('Index Layout')

  // const cccc = useSelector((state: RootState) => state.)
  const dispatch = useDispatch<AppDispatch>()
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)
  const geoWatchUpdateTime = useSelector(
    (state: RootState) => state.geo.watchUpdateTime
  )
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

  const [sakiuiInit, setSakiuiInit] = useState(false)
  const [loadProgressBar, setLoadProgressBar] = useState(false)
  const [progressBar, setProgressBar] = useState(0.01)

  useEffect(() => {
    console.log('debug', debug, router.query)

    const lf = console.log
    const wf = console.warn
    // const ef = console.error
    const tf = console.time
    const tef = console.timeEnd

    if (process.env.CLIENT_ENV === 'production' && debug !== 'true') {
      console.log = () => {}
      console.warn = () => {}
      // console.error = () => {}
      console.time = () => {}
      console.timeEnd = () => {}
    }

    let vConsole: any
    if (debug === 'true' && !nativeConsole) {
      const sc = document.createElement('script')
      sc.src = 'https://unpkg.com/vconsole@latest/dist/vconsole.min.js'

      sc.onload = () => {
        vConsole = new (window as any).VConsole({ theme: 'dark' })
      }

      document.body.appendChild(sc)
    }

    return () => {
      console.log = lf
      console.warn = wf
      // console.error = ef
      console.time = tf
      console.timeEnd = tef

      vConsole?.destroy()
    }
  }, [router])

  useEffect(() => {
    console.log('dddddd 1', 111)
    const L: typeof Leaflet = (window as any).L

    if (L) {
      ;(window as any)?.leafletPolycolor?.(L)
    }

    // loadPwaNewVersion()

    setMounted(true)
    setProgressBar(progressBar + 0.2 >= 1 ? 1 : progressBar + 0.2)

    dispatch(methods.config.init()).unwrap()

    dispatch(methods.user.Init()).unwrap()
    dispatch(methods.geo.Init()).unwrap()
    dispatch(methods.sso.Init()).unwrap()
    dispatch(methods.user.InitUser()).unwrap()

    initNyaNyaWasm()

    dispatch(methods.config.getDeviceType())

    dispatch(configSlice.actions.setFullScreen(screenfull.isFullscreen))

    window.addEventListener('keydown', function (e) {
      e = e || window.event
      eventListener.dispatch('replay-trip-keydown', e)
      if (e.keyCode === 122) {
        e.preventDefault()

        dispatch(methods.config.fullScreen(!config.fullScreen))
      }
    })

    // screenfull.onchange((e) => {
    // dispatch(configSlice.actions.setFullScreen(screenfull.isFullscreen))
    // })

    window.addEventListener('resize', () => {
      // setTimeout(() => {
      // 	console.log(
      // 		'screenfull.isFullscreen',
      // 		screenfull.isFullscreen,
      // 		isFullScreen(document.body)
      // 	)
      // 	dispatch(configSlice.actions.setFullScreen(screenfull.isFullscreen))
      // }, 700)

      dispatch(methods.config.getDeviceType())

      // setTimeout(() => {
      //   eventListener.dispatch('resize_vcm', undefined)
      // }, 300)
    })
    window.addEventListener('load', () => {
      dispatch(methods.config.getDeviceType())
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // const t = setTimeout(() => {
          // const L: typeof Leaflet = (window as any).L
          // if (L) {

          dispatch(
            geoSlice.actions.setSelectPosition({
              longitude: pos.coords.longitude,
              latitude: pos.coords.latitude,
            })
          )

          dispatch(geoSlice.actions.setPosition(pos))

          // setPosition({
          // 	...pos,
          // 	// coords: {
          // 	// 	...pos.coords,
          // 	// 	latitude: 29.417266,
          // 	// 	longitude: 105.594791,
          // 	// },
          // })
          // clearTimeout(t)
          // }
          // }, 500)
        },
        (error) => {
          if (error.code === 1) {
            snackbar({
              message: '必须开启定位权限，请检查下是否开启定位权限',
              autoHideDuration: 2000,
              vertical: 'top',
              horizontal: 'center',
            }).open()
          }
          console.log('GetCurrentPosition Error', error)
        },
        { enableHighAccuracy: true }
      )
    } else {
      console.log('该浏览器不支持获取地理位置')
    }

    const initConnectionOSM = async () => {
      try {
        console.time('initConnectionOSM')
        dispatch(
          configSlice.actions.setConnectionOSM(
            (await fetch('https://tile.openstreetmap.org')).status === 200
              ? 1
              : -1
          )
        )
        console.timeEnd('initConnectionOSM')
      } catch (error) {
        dispatch(configSlice.actions.setConnectionOSM(-1))
      }
    }
    initConnectionOSM()
    const initCountry = async () => {
      try {
        console.time('initCountry')
        const timer = setTimeout(() => {
          dispatch(configSlice.actions.setCountry('Argentina'))
          clearTimeout(timer)
        }, 3000)
        const res = await axios(
          'https://tools.aiiko.club/api/v1/ip/details?ip=&language=en-US'
        )

        // console.log('dddddd initCountry', res)
        if (res?.data?.code === 200 && res?.data?.data?.country) {
          // dispatch(configSlice.actions.setCountry('Argentina'))
          dispatch(configSlice.actions.setCountry(res.data.data.country))
        } else {
          dispatch(configSlice.actions.setCountry('Argentina'))
        }
        clearTimeout(timer)
        console.timeEnd('initCountry')
      } catch (error) {
        dispatch(configSlice.actions.setCountry('Argentina'))
      }
    }
    initCountry()
  }, [])

  useEffect(() => {
    if (loadProgressBar && sakiuiInit && mounted) {
      progressBar < 1 &&
        setTimeout(() => {
          setProgressBar(1)
        }, 500)
    }
  }, [loadProgressBar, sakiuiInit, mounted])

  useEffect(() => {
    const init = async () => {
      if (user.isInit) {
        if (user.isLogin) {
          await dispatch(methods.config.getUserPositionShare())

          await dispatch(methods.config.GetConfigure())
        }
        dispatch(configSlice.actions.setInitConfigure(true))
      }
    }
    init()

    dispatch(configSlice.actions.setUserPositionShare(-1))
  }, [user])

  // useEffect(() => {
  //   router.pathname.indexOf('trackRoute') < 0 && checkMapUrl(config.mapUrl, 'BaseMap')
  // }, [config.mapUrl])

  // useEffect(() => {
  //   router.pathname.indexOf('trackRoute') >= 0 && checkMapUrl(config.trackRouteMapUrl, 'TrackRoute')
  // }, [config.trackRouteMapUrl])

  useEffect(() => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current)

        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            console.log('watchPosition', pos)
            // setListenTime(new Date().getTime())

            dispatch(geoSlice.actions.setPosition(pos))

            clearInterval(watchPosTimer)
            // 5秒内不更新，就重新获取GPS
            watchPosTimer = setInterval(() => {
              dispatch(
                geoSlice.actions.setWatchUpdateTime(new Date().getTime())
              )
            }, 10 * 1000)
          },
          (error) => {
            console.log('GetCurrentPosition Error', error)
          },
          {
            enableHighAccuracy: true,
          }
        )
        console.log('watchPosition', watchId.current)
      } else {
        console.log('该浏览器不支持获取地理位置')
      }
    } catch (error) {
      snackbar({
        message: String(error),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
      }).open()
    }
  }, [config.connectionOSM, geoWatchUpdateTime])

  const initNyaNyaWasm = async () => {
    NyaNyaWasm.setWasmPath('./nyanyajs-utils-wasm.wasm')
    NyaNyaWasm.setCoreJsPath('./wasm_exec.js')

    // const res = await (
    // 	await fetch(
    // 		'https://saass.aiiko.club/api/v1/share?path=/NyaNyaJS/1.0.0&sid=EWmdAO1GBw'
    // 	)
    // ).json()
    // console.log('initNyaNyaWasm', res?.data?.data?.list)
    // if (res?.data?.data?.list?.length) {
    // 	res?.data?.data?.list.forEach((v: any) => {
    // 		console.log(v)
    // 		if (v.fileName === 'wasm_exec.js') {
    // 			NyaNyaWasm.setCoreJsPath(v.urls.domainUrl + v.urls.shortUrl)
    // 		}
    // 		if (
    // 			v.fileName === 'nyanyajs-utils-wasm.wasm' ||
    // 			v.fileName === 'wasm_exec.js'
    // 		) {
    // 			NyaNyaWasm.setWasmPath(v.urls.domainUrl + v.urls.shortUrl)
    // 		}
    // 	})
    // }
  }
  return (
    <>
      <Head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge"></meta>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        ></meta>
        <link rel="stylesheet" href="/css/leaflet.css" crossOrigin="" />
        <script src="/js/leaflet.js" crossOrigin=""></script>
        <script src="/js/leaflet-polycolor.min.js"></script>
        <script src="/js/TileLayer.ColorScale.js" crossOrigin=""></script>

        {/* {debug === 'true' ? (
					<script src='https://unpkg.com/vconsole@latest/dist/vconsole.min.js'></script>
				) : (
					''
				)} */}

        {/* <Script
					src={'https://unpkg.com/vconsole@latest/dist/vconsole.min.js'}
					onLoad={() => {
						new (window as any).VConsole({ theme: 'dark' })
					}}
				></Script> */}
        <script src="/js/responsivevoice.js"></script>
        {/* <script src='https://code.responsivevoice.org/responsivevoice.js?key=qH3G8T7O'></script> */}

        {/* <link
					rel='stylesheet'
					href='https://cdn.jsdelivr.net/npm/lightgallery/css/lightgallery-bundle.min.css'
				/>
				<script src='https://cdn.jsdelivr.net/npm/lightgallery/lightgallery.umd.js'></script>
				<script src='https://cdn.jsdelivr.net/npm/lightgallery/plugins/zoom/lg-zoom.umd.js'></script>
				<script src='https://cdn.jsdelivr.net/npm/lightgallery/plugins/fullscreen/lg-fullscreen.umd.js'></script>
				<script src='https://cdn.jsdelivr.net/npm/lightgallery/plugins/video/lg-video.umd.js'></script> */}
      </Head>
      <div className="trip-layout saki-loading">
        <NoSSR>
          <>
            <saki-base-style></saki-base-style>
            <saki-init
              ref={bindEvent({
                mounted(e) {
                  console.log('mounted', e)
                  setSakiuiInit(true)
                  // store.dispatch(
                  // 	configSlice.actions.setStatus({
                  // 		type: 'sakiUIInitStatus',
                  // 		v: true,
                  // 	})
                  // )
                  // setProgressBar(progressBar + 0.2 >= 1 ? 1 : progressBar + 0.2)
                  // setProgressBar(.6)
                },
              })}
            ></saki-init>
            <SakiI18n
              onMounted={async (e) => {
                console.log('SakiI18n', e.target)
                const r = await e.target.getResources()
                console.log('SakiI18n1', r)
                initI18n(r)
              }}
              language={config.language}
              lang={i18n.language}
              languages={config.languages}
              resources={resources as any}
            ></SakiI18n>
          </>
        </NoSSR>
        <div
          onTransitionEnd={() => {
            console.log('onTransitionEnd')
            // setHideLoading(true)
          }}
          className={
            'il-loading active ' +
            // (!(appStatus.noteInitStatus && appStatus.sakiUIInitStatus)
            // 	? 'active '
            // 	: '') +
            (config.hideLoading ? 'hide' : '')
          }
        >
          {/* <div className='loading-animation'></div>
				<div className='loading-name'>
					{t('appTitle', {
						ns: 'common',
					})}
				</div> */}
          <div className="loading-logo">
            <img src={'/icons/256x256.png'} alt="" crossOrigin="anonymous" />
          </div>
          {/* <div>progressBar, {progressBar}</div> */}
          <div className="loading-progress-bar">
            {/* {dynamic(
							() => (
								<div></div>
							),
							{
								ssr: false,
							}
						)} */}

            <NoSSR>
              <saki-linear-progress-bar
                ref={bindEvent({
                  loaded: () => {
                    console.log('progress-bar', progressBar)
                    setProgressBar(0)
                    setTimeout(() => {
                      progressBar < 1 &&
                        setProgressBar(
                          progressBar + 0.2 >= 1 ? 1 : progressBar + 0.2
                        )
                    }, 0)
                    setLoadProgressBar(true)
                  },
                  transitionEnd: (e: CustomEvent) => {
                    console.log('progress-bar', e)
                    if (e.detail === 1) {
                      const el: HTMLDivElement | null =
                        document.querySelector('.il-loading')
                      if (el) {
                        const animation = el.animate(
                          [
                            {
                              opacity: 1,
                            },
                            {
                              opacity: 0,
                            },
                          ],
                          {
                            duration: 500,
                            iterations: 1,
                          }
                        )
                        animation.onfinish = () => {
                          el.style.display = 'none'
                          // setHideLoading(true)
                          dispatch(configSlice.actions.setHideLoading(true))
                        }
                      }
                    }
                  },
                })}
                max-width="280px"
                transition="width 1s"
                width="100%"
                height="10px"
                progress={progressBar}
                border-radius="5px"
              ></saki-linear-progress-bar>
            </NoSSR>
          </div>
        </div>
        <div className="tl-main">
          <HeaderComponent
            visible={layout.header}
            fixed={layout.headerFiexd}
          ></HeaderComponent>
          <div
            className={'tl-m-main ' + (layout.headerFiexd ? 'headerFiexd' : '')}
          >
            {children}
          </div>
        </div>
        {mounted ? (
          <>
            {/* <StatisticsComponent /> */}

            <saki-aside-modal
              ref={bindEvent({
                close: (e) => {},
              })}
              visible={
                !config.connectionMapUrl
                // !config.connectionBaseMapUrl ||
                // !config.connectionTrackRouteMapUrl
              }
              vertical="Top"
              horizontal="Center"
              // height='86%'
              padding="0 0 0px 0"
              margin="10px 0 0 0"
              border-radius="10px"
            >
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    dispatch(layoutSlice.actions.setSettingType('Maps'))
                    dispatch(layoutSlice.actions.setOpenSettingsModal(true))
                  },
                })}
                color="var(--saki-default-color)"
                type="Normal"
                padding="0px"
                border-radius="8px"
                border="none"
              >
                <div
                  style={{
                    padding: '8px 10px',
                    border: '2px solid var(--saki-default-color)',
                    borderRadius: '10px',
                  }}
                >
                  {t('unableLoadMap', {
                    ns: 'prompt',
                  })}
                </div>
              </saki-button>
            </saki-aside-modal>
          </>
        ) : (
          ''
        )}
        <LoadModalsComponent />
      </div>
    </>
  )
}

export function getLayout(page: any, pageProps: any) {
  return (
    <ToolboxLayout
      pageProps={{
        ...pageProps,
      }}
    >
      {page}
    </ToolboxLayout>
  )
}

export default ToolboxLayout
