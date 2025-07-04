import Head from 'next/head'
import TripLaout from '../layouts/Trip'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import FooterComponent from '../components/Footer'
import path from 'path'
import {
  AppDispatch,
  RootState,
  configSlice,
  layoutSlice,
  methods,
} from '../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'

import NoSSR from '../components/NoSSR'
import FilterComponent from './Filter'
import { formatDistance } from '../plugins/methods'
import moment from 'moment'
import { getPositionShareText } from './Vehicle'
import { protoRoot } from '../protos'
import { filterTripsForTrackRoutePage } from '../store/trip'
import { defaultMapLayerModalFeaturesList, loadModal } from '../store/layout'
import { SakiButton, SakiIcon } from './saki-ui-react/components'
import { deepCopy } from '@nyanyajs/utils'

const ButtonsComponent = ({
  position = {
    right: 20,
    bottom: 50,
    // top: 50,
  },
  indexPage = false,
  trackRoute = false,
  currentPosition = false,
  realTimePosition = false,
  filter = false,
  layer = false,
  aichat = true,
  mark = false,
  markCount = 0,
  mapLayerModalConfig = {
    vertical: 'Bottom',
    horizontal: 'Right',
    offsetX: '20px',
    offsetY: '50px',
  },
  mapLayerType,
  featuresList = deepCopy(defaultMapLayerModalFeaturesList),
  onCurrentPosition,
  onMark,
  onFilter,
}: {
  position?: {
    left?: number
    right?: number
    bottom?: number
    top?: number
  }
  indexPage?: boolean
  trackRoute?: boolean
  currentPosition?: boolean
  realTimePosition?: boolean
  filter?: boolean
  aichat?: boolean
  layer?: boolean
  mark?: boolean
  markCount?: number
  mapLayerStyle?: {
    left?: string
    right?: string
    top?: string
    bottom?: string
  }
  mapLayerModalConfig?: {
    vertical: 'Bottom' | 'Top' | 'Center'
    horizontal: 'Center' | 'Left' | 'Right'
    offsetX: string
    offsetY: string
  }
  mapLayerType?: keyof protoRoot.configure.Configure.IMapLayer
  featuresList?: typeof defaultMapLayerModalFeaturesList
  onCurrentPosition: () => void
  onMark?: () => void
  onFilter?: () => void
}) => {
  const { t, i18n } = useTranslation('tripPage')
  const [mounted, setMounted] = useState(false)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)
  const layout = useSelector((state: RootState) => state.layout)

  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()

  const [openStartDateDatePicker, setOpenStartDateDatePicker] = useState(false)
  const [openEndDateDatePicker, setOpenEndDateDatePicker] = useState(false)

  const [openUserPositionShareDropdown, setOpenUserPositionShareDropdown] =
    useState(false)

  return (
    <div
      style={{
        // right: position.right + 'px',
        // bottom: position.bottom + 'px',
        // top: position.top + 'px',

        ...(['left', 'right', 'bottom', 'top'].reduce((fin, cur) => {
          const pos: any = position
          return pos[cur] ? { ...fin, [cur]: pos[cur] + 'px' } : fin
        }, {}) as any),
      }}
      className="map-buttons-component"
    >
      <NoSSR>
        {indexPage && (
          <>
            <saki-button
              ref={bindEvent({
                tap: () => {
                  console.log(router, location)
                  location.replace('/' + (router.query.lang || ''))
                },
              })}
              width="40px"
              height="40px"
              // padding="24px"
              margin="16px 0 0 0"
              type="CircleIconGrayHover"
              box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
            >
              <saki-icon
                color="var(--saki-default-color)"
                width="18px"
                height="18px"
                type="Index"
              ></saki-icon>
            </saki-button>
          </>
        )}
        {trackRoute && (
          <saki-button
            ref={bindEvent({
              tap: () => {
                location.replace(
                  (router.query.lang ? '/' + (router.query.lang || '') : '') +
                    '/trackRoute'
                )
                // dispatch(layoutSlice.actions.setOpenTripTrackRoute(true))
              },
            })}
            width="40px"
            height="40px"
            // padding="24px"
            margin="16px 0 0 0"
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width="18px"
              height="18px"
              type="Route"
            ></saki-icon>
          </saki-button>
        )}

        {realTimePosition ? (
          <div
            className={
              'realTimePosition-button ' +
              (config.userPositionShare >= 0 ? 'start' : 'close') +
              ' ' +
              ((trip.startTrip ? config.syncLocationWhileTraveling : true)
                ? 'Enable'
                : 'Disable')
            }
          >
            <saki-dropdown
              visible={openUserPositionShareDropdown}
              floating-direction="Left"
              z-index="1000"
              ref={bindEvent({
                close: () => {
                  setOpenUserPositionShareDropdown(false)
                },
              })}
            >
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    setOpenUserPositionShareDropdown(true)
                  },
                })}
                width="40px"
                height="40px"
                // padding="24px"
                margin="12px 0 0 0"
                type="CircleIconGrayHover"
                box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
              >
                <saki-icon
                  color="var(--saki-default-color)"
                  width="18px"
                  height="18px"
                  type="PositionShare"
                ></saki-icon>
              </saki-button>
              <div slot="main">
                <saki-menu
                  ref={bindEvent({
                    selectvalue: async (e) => {
                      dispatch(
                        methods.config.updateUserPositionShare(
                          Number(e.detail.value)
                        )
                      )
                      setOpenUserPositionShareDropdown(false)
                    },
                  })}
                >
                  {[5, 1, -1].map((v, i) => {
                    return (
                      <saki-menu-item
                        key={i}
                        padding="10px 18px"
                        value={v}
                        active={v === config.userPositionShare}
                      >
                        <span>
                          {t(getPositionShareText(v), {
                            ns: 'vehicleModal',
                          })}
                        </span>
                      </saki-menu-item>
                    )
                  })}
                </saki-menu>
                <saki-menu
                  ref={bindEvent({
                    selectvalue: async (e) => {
                      console.log('e.detail.value', e.detail.value)

                      dispatch(
                        configSlice.actions.setSyncLocationWhileTraveling(
                          e.detail.value === 'Enable'
                        )
                      )
                      setOpenUserPositionShareDropdown(false)
                    },
                  })}
                >
                  {['Enable', 'Disable'].map((v, i) => {
                    return (
                      <saki-menu-item
                        key={i}
                        padding="10px 18px"
                        value={v}
                        margin={i === 0 ? '6px 0 0' : ''}
                        subtitle={
                          i === 0
                            ? t('syncLocationWhileTraveling', {
                                ns: 'settings',
                              })
                            : ''
                        }
                        active={
                          v ===
                          (config.syncLocationWhileTraveling
                            ? 'Enable'
                            : 'Disable')
                        }
                      >
                        <span>
                          {t(v.toLowerCase(), {
                            ns: 'prompt',
                          })}
                        </span>
                      </saki-menu-item>
                    )
                  })}
                </saki-menu>
              </div>
            </saki-dropdown>
          </div>
        ) : (
          ''
        )}

        {filter && (
          <>
            <saki-button
              ref={bindEvent({
                tap: () => {
                  onFilter?.()
                },
              })}
              width="40px"
              height="40px"
              // padding="24px"
              margin="16px 0 0 0"
              type="CircleIconGrayHover"
              box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
            >
              <saki-icon
                color="var(--saki-default-color)"
                width="22px"
                height="22px"
                type="FilterFill"
              ></saki-icon>
            </saki-button>
          </>
        )}
        {layer && (
          <saki-button
            ref={bindEvent({
              tap: () => {
                loadModal('MapLayer', () => {
                  dispatch(
                    layoutSlice.actions.setOpenMapLayerModal({
                      visible: true,
                      mapLayerType,
                      modalConfig: mapLayerModalConfig,
                    })
                  )
                  dispatch(
                    layoutSlice.actions.setOpenMapLayerModalFeaturesList(
                      featuresList
                    )
                  )
                })
              },
            })}
            width="40px"
            height="40px"
            // padding="24px"
            margin="12px 0 0 0"
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width="18px"
              height="18px"
              type="Layer"
            ></saki-icon>
          </saki-button>
        )}
        {aichat && (
          <SakiButton
            onTap={() => {
              loadModal('Settings', () => {
                dispatch(layoutSlice.actions.setSettingType('Maps'))
                dispatch(layoutSlice.actions.setOpenSettingsModal(true))
              })
            }}
            width="40px"
            height="40px"
            // padding="24px"
            margin="12px 0 0 0"
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <SakiIcon
              color="var(--saki-default-color)"
              width="18px"
              height="18px"
              type="ChatFill"
            ></SakiIcon>
          </SakiButton>
        )}
        {currentPosition && (
          <saki-button
            ref={bindEvent({
              tap: () => {
                onCurrentPosition()
              },
            })}
            width="40px"
            height="40px"
            // padding="24px"
            margin="12px 0 0 0"
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width="22px"
              height="22px"
              type="CurrentPosition"
            ></saki-icon>
          </saki-button>
        )}
        {mark && (
          <div
            // style={{
            //   transform: 'translate(0,20px)',
            // }}
            className="mark-button"
          >
            {/* {realTimePosition ? (
							<saki-button
								ref={bindEvent({
									tap: () => {},
								})}
								padding='24px'
								margin='0 0 20px 0'
								type='CircleIconGrayHover'
								box-shadow='0 0 10px rgba(0, 0, 0, 0.3)'
							>
								<saki-icon
									color='var(--saki-default-color)'
									width='22px'
									height='22px'
									type='PositionShare'
								></saki-icon>
							</saki-button>
						) : (
							''
						)} */}
            <saki-button
              ref={bindEvent({
                tap: () => {
                  onMark?.()
                },
              })}
              width="40px"
              height="40px"
              // padding="24px"
              margin="12px 0 0 0"
              type="CircleIconGrayHover"
              bg-color="#58c8f2"
              bg-hover-color="#4eb2d6"
              bg-active-color="#4194b2"
              box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
            >
              <div className="mark-content">
                <saki-icon
                  width="18px"
                  height="18px"
                  color="#fff"
                  type="Flag"
                ></saki-icon>
                {markCount ? (
                  <span className="tp-b-i-marklength">{markCount}</span>
                ) : (
                  ''
                )}
              </div>
            </saki-button>
          </div>
        )}
      </NoSSR>
    </div>
  )
}
export default ButtonsComponent
