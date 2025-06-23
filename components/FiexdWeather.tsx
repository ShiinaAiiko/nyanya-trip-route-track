import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, {
  RootState,
  AppDispatch,
  useAppDispatch,
  methods,
  configSlice,
  userSlice,
  layoutSlice,
  tripSlice,
  geoSlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import {
  copyText,
  exitFullscreen,
  formatAvgPace,
  formatDistance,
  formatTime,
  fullScreen,
  getAngle,
  getLatLng,
  getSpeedColor,
  getZoom,
  isFullScreen,
  isRoadColorFade,
  roadColorFade,
} from '../plugins/methods'
import TripItemComponent from './TripItem'

import { Debounce, deepCopy, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet from 'leaflet'
import SpeedMeterComponent from './Dashboard'
import { Statistics } from '../store/trip'
import {
  cityType,
  ethnicGroups,
  ethnicReg,
  getSimpleCityName,
  voiceBroadcast,
} from '../store/city'

import { eventListener, getTrackRouteColor, maps } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
  createMyPositionMarker,
  createOtherPositionMarker,
} from '../store/position'
import { openWeatherWMOToEmoji } from '@akaguny/open-meteo-wmo-to-emoji'
import { loadModal } from '../store/layout'
import { position } from 'html2canvas/dist/types/css/property-descriptors/position'

const FiexdWeatherComponent = ({
  full,
  showCoords,
  coords,
  zIndex = 400,
  mapUrl,
  mapMode,
  style,
}: {
  showCoords: boolean
  coords: GeolocationCoordinates
  full: boolean
  zIndex?: number
  mapUrl: string
  mapMode: string
  style?: {
    left?: string
    right?: string
    top?: string
    bottom?: string
  }
}) => {
  const { t, i18n } = useTranslation('weather')
  const { config, geo, weatherInfo, cityInfo } = useSelector(
    (state: RootState) => {
      return {
        config: state.config,
        geo: state.geo,
        weatherInfo: state.trip.weatherInfo,
        cityInfo: state.city.cityInfo,
      }
    }
  )

  const altitude = (coords?.altitude || 0).toFixed(1)
  const speed = coords?.speed || 0

  const dispatch = useDispatch<AppDispatch>()

  const d = useRef(new Debounce())

  const [loadWeather, setLoadWeather] = useState(false)
  const [fullWeather, setFullWeather] = useState(false)
  const [fullCityName, setFullCityName] = useState(false)
  const [fullCoords, setFullCoords] = useState(false)

  const timer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const init = async () => {
      setFullWeather((await storage.global.get('fullWeather')) || false)
      setFullCityName((await storage.global.get('fullCityName')) || false)
      setFullCoords((await storage.global.get('fullCoords')) || false)
    }
    init()
  }, [])

  useEffect(() => {
    d.current.increase(() => {
      const { geo } = store.getState()
      if (loadWeather && config.connectionStatus.sakiuiI18n) {
        if (geo.position?.coords?.latitude) {
          dispatch(
            methods.trip.GetWeather({
              lat: geo.position.coords.latitude,
              lon: geo.position.coords.longitude,
            })
          )
          dispatch(
            methods.city.GetCity({
              lat: geo.position.coords.latitude,
              lng: geo.position.coords.longitude,
            })
          )
        }

        let loadCount = 1
        timer.current = setInterval(() => {
          const { geo } = store.getState()
          if (geo.position?.coords?.latitude) {
            if (loadCount === 4) {
              dispatch(
                methods.trip.GetWeather({
                  lat: geo.position.coords.latitude,
                  lon: geo.position.coords.longitude,
                })
              )
              loadCount = 0
            }
            dispatch(
              methods.city.GetCity({
                lat: geo.position.coords.latitude,
                lng: geo.position.coords.longitude,
              })
            )
          }
          loadCount += 1
          // }, 15 * 1000)
        }, 30 * 1000)
      } else {
        clearInterval(timer.current)
      }
    }, 1000)
    return () => {
      clearInterval(timer.current)
    }
  }, [loadWeather, config.lang, config.connectionStatus.sakiuiI18n])

  useEffect(() => {
    if (geo.position?.coords?.latitude) {
      setLoadWeather(true)
    } else {
      setLoadWeather(false)
    }
  }, [geo])

  const cityClickEvent = {
    timer: deepCopy(timer.current),
    startTime: 0,
    copyText() {
      if (
        geo.selectPosition.latitude === cityInfo.lat &&
        geo.selectPosition.longitude === cityInfo.lng
      ) {
        copyText(`${cityInfo.lat},${cityInfo.lng},${cityInfo.address}`)
      } else {
        copyText(
          `${geo.selectPosition.latitude},${geo.selectPosition.longitude}`
        )
      }

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
    },
    mouseDown: (e: any) => {
      cityClickEvent.startTime = e.timeStamp
      cityClickEvent.timer = setTimeout(() => {
        cityClickEvent.copyText()
        // voiceBroadcast(cityInfo.address)
        return
      }, 700)
    },
    mouseUp: (e: any) => {
      cityClickEvent?.timer && clearTimeout(cityClickEvent.timer)

      if (!cityClickEvent?.startTime) return

      console.log('cityClickEvent', e.timeStamp - cityClickEvent.startTime)
      if (e.timeStamp - cityClickEvent.startTime < 700) {
        setFullCityName(!fullCityName)
        storage.global.set('fullCityName', !fullCityName)
      }
      cityClickEvent.startTime = 0

      e.stopPropagation()
      e.preventDefault()
    },
  }

  const { textTheme } = useMemo(() => {
    let textTheme = 'light-text'
    // textTheme = 'light-text'

    const mapKey = maps.filter((v) => v.url === mapUrl)?.[0].key

    // console.log('cccccccc', mapKey, mapUrl, mapMode)

    if (
      mapKey === 'AmapSatellite' ||
      mapKey === 'GoogleSatellite' ||
      mapKey === 'TianDiTuSatellite' ||
      mapMode === 'Dark' ||
      mapMode === 'Black'
    ) {
      textTheme = 'dark-text'
    }

    return {
      textTheme,
    }
  }, [mapUrl, mapMode])

  return (
    <div
      style={{
        zIndex: zIndex,
        ...style,
      }}
      className={
        'fiexd-weather1-component Light ' + textTheme + ' ' + config.deviceType
      }
      onClick={() => {
        if (!cityInfo.address) return
      }}
    >
      <div
        onClick={() => {
          loadModal('WeatherApp', () => {
            const { geo } = store.getState()
            dispatch(
              layoutSlice.actions.setOpenWeatherAppModal({
                visible: true,
                latlng: {
                  lat: geo.position.coords.latitude,
                  lng: geo.position.coords.longitude,
                  alt: geo.position.coords.altitude || 0,
                },
              })
            )
          })
        }}
        className="dashbord-weather custom-font"
      >
        <span>
          <span>
            {openWeatherWMOToEmoji(Number(weatherInfo?.weatherCode))?.value ||
              ''}
          </span>
          <span>{weatherInfo?.weather}</span>
        </span>

        <span>{(weatherInfo?.temperature || '---') + '℃'}</span>
      </div>
      <div
        onClick={() => {
          setFullWeather(!fullWeather)
          storage.global.set('fullWeather', !fullWeather)

          // loadModal('WeatherApp', () => {
          //   const { geo } = store.getState()
          //   dispatch(
          //     layoutSlice.actions.setOpenWeatherAppModal({
          //       visible: true,
          //       latlng: {
          //         lat: geo.position.coords.latitude,
          //         lng: geo.position.coords.longitude,
          //         alt: geo.position.coords.altitude || 0,
          //       },
          //     })
          //   )
          // })
        }}
        className="dashbord-city custom-font"
      >
        <span>
          {['state', 'region', 'city', 'town', 'road']
            .map((v) => {
              const si: any = cityInfo
              let s = si[v]
              // console.log(fullCityName, s, v, cityInfo)

              return fullWeather ? s : getSimpleCityName(s, v)
            })
            .filter((v) => !!v)
            .join('·')}
        </span>
      </div>
      {showCoords ? (
        <div
          onMouseDown={cityClickEvent.mouseDown}
          onMouseUp={cityClickEvent.mouseUp}
          onTouchStart={cityClickEvent.mouseDown}
          onTouchEnd={cityClickEvent.mouseUp}
          className="dashbord-latlng"
        >
          <span>
            {(geo.selectPosition.latitude !== -10000
              ? geo.selectPosition?.latitude
              : geo.position?.coords?.latitude
            )?.toFixed(6)}
            ° N
          </span>
          <span>
            {(geo.selectPosition.latitude !== -10000
              ? geo.selectPosition?.longitude
              : geo.position?.coords?.longitude
            )?.toFixed(6)}
            ° E
          </span>
        </div>
      ) : (
        ''
      )}
    </div>
  )

  // return (
  //   <div
  //     style={{
  //       zIndex: zIndex,
  //     }}
  //     className={'fiexd-weather-component ' + config.deviceType}
  //     onClick={() => {
  //       if (!cityInfo.address) return
  //       // voiceBroadcast(cityInfo.address)
  //       // let msg = `祝贺汝喵进入「${cityInfo.address}」！`
  //       // // // 创建语音对象
  //       // ;(window as any).responsiveVoice.speak(
  //       // 	msg,
  //       // 	'Chinese Female', // 中文女声
  //       // 	{
  //       // 		pitch: 1, // 音调
  //       // 		rate: 1, // 语速
  //       // 		volume: 1, // 音量
  //       // 		onend: () => console.log('播放完成！'),
  //       // 	}
  //       // )

  //       // if ('speechSynthesis' in window) {
  //       // 	// 清空队列
  //       // 	window.speechSynthesis.cancel()

  //       // 	// 创建语音对象
  //       // 	const utterance = new SpeechSynthesisUtterance(msg)
  //       // 	utterance.lang = 'zh-TW'
  //       // 	utterance.pitch = 1
  //       // 	utterance.rate = 1

  //       // 	// 等待语音加载
  //       // 	window.speechSynthesis.onvoiceschanged = () => {
  //       // 		const voices = window.speechSynthesis.getVoices()
  //       // 		utterance.voice =
  //       // 			voices.find((voice) => voice.lang === 'zh-TW') ||
  //       // 			voices.find((voice) => voice.lang.startsWith('zh')) ||
  //       // 			voices[0] // 回退到第一个可用语音
  //       // 	}

  //       // 	// 添加事件监听
  //       // 	utterance.addEventListener('end', () => {
  //       // 		console.log('Speech synthesis finished.')
  //       // 	})
  //       // 	utterance.addEventListener('error', (err) => {
  //       // 		console.error('Speech synthesis error:', err)
  //       // 	})

  //       // 	// 开始播放
  //       // 	if (window.speechSynthesis.speaking) {
  //       // 		console.warn('Speech synthesis is already speaking. Cancelling...')
  //       // 		window.speechSynthesis.cancel()
  //       // 	}
  //       // 	window.speechSynthesis.speak(utterance)
  //       // } else {
  //       // 	console.error(
  //       // 		'Sorry, your browser does not support speech synthesis.'
  //       // 	)
  //       // }
  //     }}
  //   >
  //     {showCoords ? (
  //       <>
  //         <span
  //           onClick={() => {
  //             setFullCoords(!fullCoords)
  //             storage.global.set('fullCoords', !fullCoords)
  //           }}
  //           className="fw-cords"
  //         >
  //           <span>
  //             {`${
  //               fullCoords
  //                 ? t('speed', {
  //                     ns: 'tripPage',
  //                   }) + ' '
  //                 : ''
  //             } ${Math.round((speed * 3600) / 100) / 10} km/h`}
  //           </span>
  //           <span>·</span>
  //           <span>
  //             {(fullCoords
  //               ? t('altitude', {
  //                   ns: 'tripPage',
  //                 }) +
  //                 ' ' +
  //                 altitude
  //               : altitude) + ' m'}
  //           </span>
  //         </span>
  //       </>
  //     ) : (
  //       ''
  //     )}
  //     <div
  //       className={
  //         'fw-text ' +
  //         config.deviceType +
  //         ' ' +
  //         config.lang +
  //         ' ' +
  //         (config.deviceType === 'Mobile' && !fullWeather && !fullCityName
  //           ? 'text-elipsis'
  //           : '') +
  //         ' ' +
  //         (full ? 'full' : '')
  //       }
  //     >
  //       {weatherInfo ? (
  //         <>
  //           {cityInfo?.state ? (
  //             <>
  //               <span
  //                 onMouseDown={cityClickEvent.mouseDown}
  //                 onMouseUp={cityClickEvent.mouseUp}
  //                 onTouchStart={cityClickEvent.mouseDown}
  //                 onTouchEnd={cityClickEvent.mouseUp}
  //               >
  //                 {['state', 'region', 'city', 'town', 'road']
  //                   .map((v) => {
  //                     const si: any = cityInfo
  //                     let s = si[v]
  //                     // console.log(fullCityName, s, v, cityInfo)
  //                     if (fullCityName) return s

  //                     return getSimpleCityName(s, v)
  //                   })
  //                   .filter((v) => !!v)
  //                   .join('·')}
  //               </span>
  //               <span>|</span>
  //             </>
  //           ) : (
  //             ''
  //           )}
  //           <span
  //             onClick={() => {
  //               setFullWeather(!fullWeather)
  //               storage.global.set('fullWeather', !fullWeather)

  //               loadModal('WeatherApp', () => {
  //                 dispatch(
  //                   layoutSlice.actions.setOpenWeatherAppModal({
  //                     visible: true,
  //                     latlng: {
  //                       lat: geo.position.coords.latitude,
  //                       lng: geo.position.coords.longitude,
  //                       alt: geo.position.coords.altitude || 0,
  //                     },
  //                   })
  //                 )
  //               })
  //             }}
  //           >
  //             <span>
  //               {(openWeatherWMOToEmoji(Number(weatherInfo.weatherCode))
  //                 ?.value || '') + weatherInfo?.weather}
  //             </span>
  //             {config.deviceType === 'Mobile' ? (
  //               fullWeather ? (
  //                 <>
  //                   <span>|</span>
  //                   <span>
  //                     {(fullWeather
  //                       ? t('daysTemperature', {
  //                           ns: 'sakiuiWeather',
  //                         }) + ' '
  //                       : '') +
  //                       (weatherInfo.daysTemperature[1] +
  //                         '℃' +
  //                         '/' +
  //                         weatherInfo.daysTemperature[0] +
  //                         '℃')}
  //                   </span>
  //                 </>
  //               ) : (
  //                 ''
  //               )
  //             ) : (
  //               <>
  //                 <span>|</span>
  //                 <span>
  //                   {(fullWeather
  //                     ? t('daysTemperature', {
  //                         ns: 'sakiuiWeather',
  //                       }) + ' '
  //                     : '') +
  //                     (weatherInfo.daysTemperature[1] +
  //                       '℃' +
  //                       '/' +
  //                       weatherInfo.daysTemperature[0] +
  //                       '℃')}
  //                 </span>
  //               </>
  //             )}
  //             <span>|</span>
  //             <span>
  //               {(fullWeather
  //                 ? t('temperature', {
  //                     ns: 'sakiuiWeather',
  //                   }) + ' '
  //                 : '') +
  //                 (weatherInfo.temperature + '℃')}
  //             </span>
  //             <span>|</span>
  //             <span>
  //               {(fullWeather
  //                 ? t('apparentTemperature', {
  //                     ns: 'sakiuiWeather',
  //                   }) + ' '
  //                 : '') +
  //                 (weatherInfo.apparentTemperature + '℃')}
  //             </span>
  //             <span>|</span>
  //             <span>
  //               {weatherInfo.windDirection +
  //                 ' ' +
  //                 weatherInfo.windSpeed +
  //                 'm/s'}
  //             </span>
  //             {/* <span>|</span>
  // 				<span>{weatherInfo.windSpeed + 'm/s'}</span> */}
  //             <span>|</span>
  //             <span>
  //               {(fullWeather
  //                 ? t('humidity', {
  //                     ns: 'sakiuiWeather',
  //                   }) + ' '
  //                 : '') +
  //                 (weatherInfo.humidity + '%')}
  //             </span>
  //             {/* <span>|</span>
  // 				<span>
  // 					{(showWeatherTip
  // 						? t('visibility', {
  // 								ns: 'sakiuiWeather',
  // 						  }) + ' '
  // 						: '') + (weatherInfo.visibility / 1000).toFixed(1)}
  // 					km
  // 				</span> */}
  //           </span>
  //         </>
  //       ) : (
  //         ''
  //       )}
  //     </div>
  //   </div>
  // )
}

export default FiexdWeatherComponent
