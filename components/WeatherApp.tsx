import React, { use, useCallback, useEffect, useRef, useState } from 'react'

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

import { sakisso, toolApiUrl, toolUrl, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import {
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
  Query,
  roadColorFade,
  stripHtmlTags,
} from '../plugins/methods'
import TripItemComponent from './TripItem'

import { Debounce, deepCopy, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet from 'leaflet'
import SpeedMeterComponent from './Dashboard'
import { Statistics } from '../store/trip'
import { eventListener, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
  createMyPositionMarker,
  createOtherPositionMarker,
} from '../store/position'
import { getSAaSSImageUrl } from '../store/file'
import { SakiAsideModal, SakiImages } from './saki-ui-react/components'

export const imagesWaterfallNEventListener = new NEventListener()

const WeatherAppModal = () => {
  const { t, i18n } = useTranslation('WeatherAppModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)

  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    if (!layout.openWeatherAppModal.visible) {
    }
  }, [layout.openWeatherAppModal.visible])

  // console.log('ImagesWaterfall', layout.openImagesWaterfallModal.visible)

  return (
    <SakiAsideModal
      onClose={() => {
        dispatch(
          layoutSlice.actions.setOpenWeatherAppModal({
            visible: false,
          })
        )
      }}
      onLoaded={() => {
        eventListener.dispatch('loadModal:WeatherApp', true)
      }}
      width="100%"
      height="100%"
      max-width={config.deviceType === 'Mobile' ? '100%' : '360px'}
      max-height={
        config.deviceType === 'Mobile'
          ? '80%'
          : Math.min(600, config.deviceWH.h) + 'px'
      }
      vertical={config.deviceType === 'Mobile' ? 'Bottom' : 'Center'}
      horizontal={config.deviceType === 'Mobile' ? 'Center' : 'Center'}
      offset-x={'0px'}
      offset-y={'0px'}
      mask
      mask-closable={config.deviceType === 'Mobile'}
      maskBackgroundColor={'rgba(0,0,0,0.3)'}
      border-radius={config.deviceType === 'Mobile' ? '10px 10px 0 0' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      background-color="#fff"
      visible={layout.openWeatherAppModal.visible}
      overflow="hidden"
    >
      <div
        className={
          'weather-app-modal ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : '')
        }
      >
        {/* <span>  {'openWeatherAppModal'}</span> */}

        <saki-app-portal
          ref={bindEvent({
            closeApp: () => {
              dispatch(
                layoutSlice.actions.setOpenWeatherAppModal({
                  visible: false,
                })
              )
            },
          })}
          entry-url={Query(`${toolUrl}/zh-CN/weather`, {
            lat: layout.openWeatherAppModal.latlng.lat.toString(),
            lng: layout.openWeatherAppModal.latlng.lng.toString(),
            alt: layout.openWeatherAppModal.latlng.alt.toString(),
            header: 'false',
          })}
          // header={false}
        ></saki-app-portal>
      </div>
    </SakiAsideModal>
  )
}

export default WeatherAppModal
