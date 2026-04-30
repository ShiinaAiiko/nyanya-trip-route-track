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
  buttonStyle = {
    width: '36px',
    height: '36px',
    margin: '10px 0 0',
    iconSize: '18px',
  },
  indexPage = false,
  trackRoute = false,
  currentPosition = false,
  realTimePosition = false,
  filter = false,
  layer = false,
  aichat = false,
  aichatParams,
  mark = false,
  markCount = 0,
  fullScreen = false,
  zoom = false,
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
  onZoom,
  onFullScreen,
}: {
  position?: {
    left?: number
    right?: number
    bottom?: number
    top?: number
  }
  buttonStyle?: {
    width: string
    height: string
    margin: string
    iconSize: string
  }
  indexPage?: boolean
  trackRoute?: boolean
  currentPosition?: boolean
  realTimePosition?: boolean
  filter?: boolean
  aichat?: boolean
  aichatParams?: Parameters<typeof layoutSlice.actions.setOpenAiChatModal>[0]
  layer?: boolean
  mark?: boolean
  markCount?: number
  fullScreen?: boolean
  zoom?: boolean
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
  onZoom?: (type: 'ZoomIn' | 'ZoomOut') => void
  onFullScreen?: (isFullScreen: boolean) => void
}) => {
  const { t, i18n } = useTranslation('tripPage')
  const [mounted, setMounted] = useState(false)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)

  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()

  const [openStartDateDatePicker, setOpenStartDateDatePicker] = useState(false)
  const [openEndDateDatePicker, setOpenEndDateDatePicker] = useState(false)

  const [openUserPositionShareDropdown, setOpenUserPositionShareDropdown] =
    useState(false)

  const [isFullScreen, setIsFullScreen] = useState(false)

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
              width={buttonStyle.width}
              height={buttonStyle.height}
              // padding="24px"
              margin={buttonStyle.margin}
              type="CircleIconGrayHover"
              box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
            >
              <saki-icon
                color="var(--saki-default-color)"
                width={buttonStyle.iconSize}
                height={buttonStyle.iconSize}
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
            width={buttonStyle.width}
            height={buttonStyle.height}
            // padding="24px"
            margin={buttonStyle.margin}
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width={buttonStyle.iconSize}
              height={buttonStyle.iconSize}
              type="Route"
            ></saki-icon>
          </saki-button>
        )}

        {aichat && (
          <SakiButton
            onTap={() => {
              console.log('AI领航员 aichatParams', aichatParams)
              loadModal('AiChatModal', () => {
                dispatch(
                  layoutSlice.actions.setOpenAiChatModal({
                    ...aichatParams,
                    visible: true,
                  })
                )
              })
            }}
            width={buttonStyle.width}
            height={buttonStyle.height}
            // padding="24px"
            margin={buttonStyle.margin}
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width={`calc(${buttonStyle.iconSize} + 4px)`}
              height={`calc(${buttonStyle.iconSize} + 4px)`}
              type="AiChatFill"
            ></saki-icon>
          </SakiButton>
        )}
        {realTimePosition ? (
          <div
            style={
              {
                '--rpb-after-w': `calc(14px * ${buttonStyle.width} / 36px)`,
                '--rpb-after-top': `calc(12px * ${buttonStyle.width} / 36px)`,
              } as any
            }
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
                width={buttonStyle.width}
                height={buttonStyle.height}
                // padding="24px"
                margin={buttonStyle.margin}
                type="CircleIconGrayHover"
                box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
              >
                <saki-icon
                  color="var(--saki-default-color)"
                  width={buttonStyle.iconSize}
                  height={buttonStyle.iconSize}
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
                        subtitle={
                          i === 0
                            ? t('showPosition', {
                                ns: 'settings',
                              })
                            : ''
                        }
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
              width={buttonStyle.width}
              height={buttonStyle.height}
              // padding="24px"
              margin={buttonStyle.margin}
              type="CircleIconGrayHover"
              box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
            >
              <saki-icon
                color="var(--saki-default-color)"
                width={`calc(${buttonStyle.iconSize} + 4px)`}
                height={`calc(${buttonStyle.iconSize} + 4px)`}
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
            width={buttonStyle.width}
            height={buttonStyle.height}
            // padding="24px"
            margin={buttonStyle.margin}
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width={buttonStyle.iconSize}
              height={buttonStyle.iconSize}
              type="Layer"
            ></saki-icon>
          </saki-button>
        )}
        {currentPosition && (
          <saki-button
            ref={bindEvent({
              tap: () => {
                onCurrentPosition()
              },
            })}
            width={buttonStyle.width}
            height={buttonStyle.height}
            // padding="24px"
            margin={buttonStyle.margin}
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width={`calc(${buttonStyle.iconSize} + 4px)`}
              height={`calc(${buttonStyle.iconSize} + 4px)`}
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
              width={buttonStyle.width}
              height={buttonStyle.height}
              // padding="24px"
              margin={buttonStyle.margin}
              type="CircleIconGrayHover"
              bg-color="#58c8f2"
              bg-hover-color="#4eb2d6"
              bg-active-color="#4194b2"
              box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
            >
              <div className="mark-content">
                <saki-icon
                  width={buttonStyle.iconSize}
                  height={buttonStyle.iconSize}
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
        {zoom && (
          <div
            style={{
              margin: buttonStyle.margin,
              borderRadius: `var(${buttonStyle.width} / 2)`,
            }}
            className="mb-zoom"
          >
            <SakiButton
              onTap={() => {
                onZoom?.('ZoomIn')
              }}
              width={buttonStyle.width}
              height={buttonStyle.height}
              // padding="24px"
              borderRadius="0"
              type="CircleIconGrayHover"
            >
              <SakiIcon
                color="var(--saki-default-color)"
                width={buttonStyle.iconSize}
                height={buttonStyle.iconSize}
                type="Add"
              ></SakiIcon>
            </SakiButton>
            <div className="mbz-border"> </div>
            <SakiButton
              onTap={() => {
                onZoom?.('ZoomOut')
              }}
              width={buttonStyle.width}
              height={buttonStyle.height}
              // padding="24px"
              borderRadius="0"
              type="CircleIconGrayHover"
            >
              <saki-icon
                color="var(--saki-default-color)"
                width={buttonStyle.iconSize}
                height={buttonStyle.iconSize}
                type="Minus"
              ></saki-icon>
            </SakiButton>
          </div>
        )}
        {fullScreen && (
          <saki-button
            ref={bindEvent({
              tap: () => {
                setIsFullScreen(!isFullScreen)
                onFullScreen?.(!isFullScreen)
              },
            })}
            width={buttonStyle.width}
            height={buttonStyle.height}
            // padding="24px"
            margin={buttonStyle.margin}
            type="CircleIconGrayHover"
            box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
          >
            <saki-icon
              color="var(--saki-default-color)"
              width={buttonStyle.iconSize}
              height={buttonStyle.iconSize}
              type={!isFullScreen ? 'FullScreen2' : 'ExitFullScreen'}
            ></saki-icon>
          </saki-button>
        )}
      </NoSSR>
    </div>
  )
}
export default ButtonsComponent
