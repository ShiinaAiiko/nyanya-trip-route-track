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

import { sakisso, version } from '../config'

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
import { SakiImages } from './saki-ui-react/components'

export const imagesWaterfallNEventListener = new NEventListener()

const ImagesWaterfallComponent = () => {
  const { t, i18n } = useTranslation('imagesWaterfallModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)

  const dispatch = useDispatch<AppDispatch>()

  const loadedMap = useRef(false)
  const map = useRef<Leaflet.Map>()
  const layer = useRef<any>()
  const targetMarker = useRef<Leaflet.Marker<any>>()
  const marker = useRef<Leaflet.Marker<any>>()
  const polyline = useRef<Leaflet.Polyline<any>>()

  const [targetPosition, setTargetPosition] =
    useState<protoRoot.trip.ITripPosition>()
  const [targetVehicle, setTargetVehicle] =
    useState<protoRoot.trip.IVehicleItem>()
  const [targetUserInfo, setTargetUserInfo] = useState<UserInfo>()

  const [myPosition, setMyPosition] = useState<protoRoot.trip.ITripPosition>()

  useEffect(() => {
    if (!layout.openImagesWaterfallModal.visible) {
    }
  }, [layout.openImagesWaterfallModal.visible])

  // console.log('ImagesWaterfall', layout.openImagesWaterfallModal.visible)

  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(layoutSlice.actions.setOpenImagesWaterfallModal(false))
        },
        loaded() {
          eventListener.dispatch('loadModal:ImagesWaterfall', true)
        },
      })}
      width="100%"
      height="100%"
      max-width={'100%'}
      max-height={'100%'}
      mask
      border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      mask-closable="false"
      background-color="#fff"
      visible={layout.openImagesWaterfallModal.visible}
    >
      <div
        className={
          'images-waterfall-component ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : '')
        }
      >
        <div className="th-header">
          <saki-modal-header
            // border
            back-icon={false}
            close-icon={true}
            right-width={'56px'}
            ref={bindEvent({
              close() {
                dispatch(layoutSlice.actions.setOpenImagesWaterfallModal(false))
              },
            })}
            title={
              layout.openImagesWaterfallModal.title
                ? t('albumTitle', {
                    ns: 'imagesWaterfallModal',
                    name: layout.openImagesWaterfallModal.title,
                  })
                : t('title', {
                    ns: 'imagesWaterfallModal',
                  })
            }
          ></saki-modal-header>
        </div>
        {layout.openImagesWaterfallModal.mediaList?.length ? (
          <saki-scroll-view
            ref={bindEvent({
              distancetoborder: (e) => {
                console.log(e.detail.top > 0)

                // if  ((e.detail.top !== 0) !== startScroll) {
                // 	setStartScroll(e.detail.top !== 0)
                // }
              },
            })}
            mode="Custom"
            // scroll-bar="Hidden"
          >
            <div className="iw-main">
              <saki-viewer>
                <div className="saki-gallery">
                  <saki-waterfall-layout>
                    {layout.openImagesWaterfallModal.mediaList.map((v, i) => {
                      let shortDesc = stripHtmlTags(v?.tlItem?.desc || '')

                      if (shortDesc.length >= 50) {
                        shortDesc = shortDesc.slice(0, 50) + '...'
                      }

                      return (
                        <saki-waterfall-layout-item
                          width={v.width}
                          height={v.height}
                          // margin="0 5px 5px"
                          border-radius="10px"
                          key={i}
                        >
                          <a
                            style={{
                              width: '100%',
                            }}
                            className="im-img"
                            data-src={getSAaSSImageUrl(v.url || '', 'big')}
                            data-sub-html={`
                          <h4>${v.tlItem.name}</h4>
                          <p>${shortDesc}</p>
                        `}
                          >
                            <img
                              style={{
                                display: 'none',
                              }}
                              src={getSAaSSImageUrl(v.url || '', 'small')}
                              alt="Image 1"
                            />
                            <SakiImages
                              style={{
                                width: '100%',
                              }}
                              border-radius="10px"
                              width={'100%'}
                              height={'100%'}
                              objectFit={'cover'}
                              src={getSAaSSImageUrl(v?.url || '', 'midOrSmall')}
                            ></SakiImages>
                            <div className="im-i-name text-two-elipsis">
                              {' '}
                              {v.tlItem.name}
                            </div>
                          </a>
                        </saki-waterfall-layout-item>
                      )
                    })}
                  </saki-waterfall-layout>
                  {/* {layout.openImagesWaterfallModal.mediaList.map((v, i) => {
                  return (
                    <a
                      className="im-img"
                      data-src={getSAaSSImageUrl(v.url || '', 'big')}
                      data-sub-html={`
                          <h4>${'v.name'}</h4>
                          <p>${'shortDesc'}</p>
                        `}
                      key={i}
                    >
                      <img
                        style={{
                          display: 'none',
                        }}
                        src={getSAaSSImageUrl(v.url || '', 'small')}
                        alt="Image 1"
                      />
                      <saki-images
                        style={{
                          width: '100%',
                        }}
                        border-radius="10px"
                        width={'auto'}
                        margin="0 0 10px 0"
                        src={getSAaSSImageUrl(v?.url || '', 'midOrSmall')}
                      ></saki-images>
                    </a>
                  )
                })} */}
                </div>
              </saki-viewer>
            </div>
          </saki-scroll-view>
        ) : (
          ''
        )}
      </div>
    </saki-modal>
  )
}

export default ImagesWaterfallComponent
