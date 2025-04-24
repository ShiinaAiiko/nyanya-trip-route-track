import React, {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
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
  IContext,
  reducer,
  journeyMemorySlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import {
  alert,
  snackbar,
  bindEvent,
  progressBar,
  multiplePrompts,
} from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import {
  exitFullscreen,
  formatAvgPace,
  formatDistance,
  formatPositionsStr,
  formatTime,
  formatTimestamp,
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
import { Chart } from 'chart.js'
import {
  Debounce,
  deepCopy,
  getShortId,
  images,
  NEventListener,
} from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet, { map } from 'leaflet'
import SpeedMeterComponent from './SpeedMeter'
import { eventListener, getMapLayer, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
  createMyPositionMarker,
  createOtherPositionMarker,
} from '../store/position'
import {
  CityInfo,
  convertCityLevelToTypeString,
  createCityBoundaries,
  createCityMarker,
  deleteAllCityGeojsonMap,
  deleteAllCityMarker,
  deleteCityMarker,
  formartCities,
  GeoJSON,
  getAllCityAreas,
  getCityName,
  getSimpleCityName,
  updateCityMarkers,
  watchCenterCity,
} from '../store/city'
import { createDistanceScaleControl } from '../plugins/map'
import { t } from 'i18next'
import NoSSR from './NoSSR'
import FilterComponent from './Filter'
import { FilterTrips, getTripHistoryPositions } from '../store/trip'
import { clearLayer, renderPolyline } from '../store/map'
import {
  backPage,
  deleteJM,
  getCurrentPageType,
  goPage,
  journeyMemoryMethods,
  setJMState,
  sortTlList,
} from '../store/journeyMemory'
import {
  SakiButton,
  SakiCascader,
  SakiCascaderItem,
  SakiIcon,
  SakiImages,
  SakiScrollLoading,
  SakiScrollView,
} from './saki-ui-react/components'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css'
import { TripListItemComponent } from './TripHistory'
import { clear } from 'console'
import {
  getSAaSSImageUrl,
  MediaItem,
  selectFiles,
  uploadFile,
  uploadFiles,
} from '../store/file'
import { IWMediaItem, loadModal } from '../store/layout'
import { useRouter } from 'next/router'
import { MultipleInput } from '@saki-ui/core/dist/dialog'
import { LayerButtons } from './MapLayer'

interface ImageDimensions {
  url: string
  width: number | null
  height: number | null
  error?: string
}

async function getImageDimensionsBatched(
  urls: string[],
  batchSize: number = 10
): Promise<ImageDimensions[]> {
  const results: ImageDimensions[] = []

  // 加载单张图片的函数
  const loadImage = (url: string): Promise<ImageDimensions> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = url

      img.onload = () => {
        resolve({
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }

      img.onerror = () => {
        resolve({
          url,
          width: null,
          height: null,
          error: `Failed to load image at ${url}`,
        })
      }
    })
  }

  // 分批处理图片
  for (let i = 0; i < urls.length; i += batchSize) {
    const batchUrls = urls.slice(i, i + batchSize)
    const batchPromises = batchUrls.map((url) => loadImage(url))
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

const copyJMUrl = (id: string) => {
  const { config } = store.getState()
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

  window.navigator.clipboard.writeText(
    location.origin +
      (config.language === 'system' ? '' : '/' + config.language) +
      '/journeyMemories/detail?id=' +
      id
  )
}

const shareJM = (jmDetail: protoRoot.journeyMemory.IJourneyMemoryItem) => {
  const id = jmDetail?.id || ''

  if (jmDetail?.permissions?.allowShare) {
    copyJMUrl(id)
    return
  }
  switchShareJM(jmDetail)
}

const switchShareJM = (
  jmDetail: protoRoot.journeyMemory.IJourneyMemoryItem
) => {
  const id = jmDetail?.id || ''
  alert({
    title: !jmDetail?.permissions?.allowShare
      ? t('enableShare', {
          ns: 'prompt',
        })
      : t('disableShare', {
          ns: 'prompt',
        }),
    content: !jmDetail?.permissions?.allowShare
      ? t('enableShareContent', {
          ns: 'prompt',
        })
      : t('disableShareContent', {
          ns: 'prompt',
        }),
    cancelText: t('cancel', {
      ns: 'prompt',
    }),
    confirmText: !jmDetail?.permissions?.allowShare
      ? t('share', {
          ns: 'prompt',
        })
      : t('unshare', {
          ns: 'prompt',
        }),
    onCancel() {},
    async onConfirm() {
      // onDelete(tripId)
      // onBack()
      const res = await httpApi.v1.UpdateJM({
        id,
        allowShare: !jmDetail?.permissions?.allowShare ? 'Allow' : 'NotAllow',
      })
      console.log('UpdateJM res', res, !!jmDetail?.permissions?.allowShare)
      if (res.code === 200) {
        store.dispatch(
          setJMState({
            type: 'jmDetail',
            value: {
              ...jmDetail,
              permissions: {
                ...jmDetail.permissions,
                allowShare: !jmDetail?.permissions?.allowShare,
              },
            },
          })
        )

        // store.dispatch(
        //   tripSlice.actions.setTripForDetailPage({
        //     ...trip,
        //     permissions: {
        //       ...(trip?.permissions || {}),
        //       shareKey: res?.data?.shareKey || '',
        //     },
        //   })
        // )
        snackbar({
          message: !jmDetail?.permissions?.allowShare
            ? '分享成功！'
            : '已成功取消分享',
          vertical: 'top',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
          autoHideDuration: 2000,
        }).open()
        if (!jmDetail?.permissions?.allowShare) {
          copyJMUrl(id)
        }
        return
      }
      snackbar({
        message: res.msg,
        vertical: 'top',
        horizontal: 'center',
        autoHideDuration: 2000,
        closeIcon: true,
      }).open()
    },
  }).open()
}

const JourneyMemoriesModal = () => {
  const { t, i18n } = useTranslation('journeyMemoriesModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)
  const jmState = useSelector((state: RootState) => state.journeyMemory)

  const { historicalStatistics } = useSelector((state: RootState) => {
    const { historicalStatistics } = state.trip
    return { historicalStatistics }
  })

  const dispatch = useDispatch<AppDispatch>()

  const [activeVehicleIdDropdown, setActiveVehicleIdDropdown] = useState('')

  const [activeJMIdDropdown, setActiveJMIdDropdown] = useState('')

  useEffect(() => {
    console.log('JourneyMemories', layout.openJourneyMemoriesModal)
    if (layout.openJourneyMemoriesModal) {
      backPage(-10)
      dispatch(
        journeyMemoryMethods.GetJMList({
          pageNum: 1,
        })
      ).unwrap()
      loadBaseData()
      return
    }
  }, [layout.openJourneyMemoriesModal])

  const loadBaseData = async () => {
    if (jmState.loadBaseDataStatus === 'noMore') return
    dispatch(
      setJMState({
        type: 'loadBaseDataStatus',
        value: 'loading',
      })
    )

    dispatch(
      setJMState({
        type: 'filterConfig',
        value: {
          ...(await storage.global.get('jm-filterConfig')),
          longestDistance: 500,
          shortestDistance: 0,
        },
      })
    )

    dispatch(
      methods.trip.GetTripHistoryData({
        loadCloudData: true,
        alert: false,
        cityDetails: true,
      })
    ).unwrap()
    dispatch(
      setJMState({
        type: 'loadBaseDataStatus',
        value: 'noMore',
      })
    )
  }

  const pageTitle = useMemo(() => {
    const pageType = getCurrentPageType()

    if (pageType === 'AddJM') {
      return t('addJourneyMemory', {})
    }
    if (pageType === 'EditJM') {
      return t('updateJourneyMemory', {}) + ` [${jmState.editJM.id}]`
    }
    if (pageType === 'JMDetail') {
      return `${jmState.jmDetail.name} - ${t('title')}`
    }
    if (pageType === 'EditJMTimeline') {
      return t('updateMoment', {}) + ` [${jmState.editJMTL.id}]`
    }
    if (pageType === 'AddJMTimeline') {
      return t('addMoment', {})
    }

    if (jmState.loadBaseDataStatus === 'loading') {
      return t('loadingData', {
        ns: 'prompt',
      })
    }
    console.log(
      'jmState.pageTypes',
      jmState.pageTypes,
      jmState.pageTypes.filter(
        (v) =>
          v === 'JMDetail' || v === 'AddJMTimeline' || v === 'EditJMTimeline'
      ).length > 0
    )
    return t('title', {}) + jmState.pageTypes.join(',')
  }, [jmState.loadBaseDataStatus, jmState.pageTypes])

  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(layoutSlice.actions.setOpenJourneyMemoriesModal(false))
        },
        loaded() {
          console.log('loadModal:JourneyMemories loaded3')
          eventListener.dispatch('loadModal:JourneyMemories', true)
        },
      })}
      width="100%"
      height="100%"
      // max-width={config.deviceType === 'Mobile' ? '100%' : '780px'}
      // max-height={config.deviceType === 'Mobile' ? '100%' : '780px'}
      mask
      border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      mask-closable="false"
      background-color="#fff"
      visible={layout.openJourneyMemoriesModal}
      z-index={899}
    >
      <div
        className={
          'journey-memories-modal ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : '')
        }
      >
        <div className="jm-header">
          <saki-modal-header
            // border
            back-icon={jmState.pageTypes.length > 0}
            close-icon={jmState.pageTypes.length === 0}
            left-width={
              config.deviceType === 'Mobile' ? 'calc(100% - 120px)' : ''
            }
            center-width={config.deviceType === 'Mobile' ? '0px' : ''}
            right-width={'56px'}
            ref={bindEvent({
              close() {
                backPage(-10)
                dispatch(layoutSlice.actions.setOpenJourneyMemoriesModal(false))
              },
              back() {
                backPage(-1)
              },
            })}
            background-color={
              getCurrentPageType() === 'JMDetail' && !jmState.startScroll
                ? 'transparent'
                : '#fff'
            }
            title={config.deviceType !== 'Mobile' ? pageTitle : ''}
          >
            <div className="vc-h-left" slot="left">
              <span className="text">
                {config.deviceType === 'Mobile' ? pageTitle : ''}
              </span>
            </div>
            <div
              className="jm-h-right"
              style={{
                margin: '0 10px 0 0',
              }}
              slot="right"
            >
              {jmState.pageTypes.length === 0 ? (
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      dispatch(
                        setJMState({
                          type: 'pageTypes',
                          value: jmState.pageTypes.concat('AddJM'),
                        })
                      )
                    },
                  })}
                  padding="6px 10px"
                  border="none"
                  type="Normal"
                >
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('addJourneyMemory')}
                  </span>
                </saki-button>
              ) : (
                ''
              )}
              {getCurrentPageType() === 'JMDetail' ? (
                <>
                  <saki-button
                    ref={bindEvent({
                      tap: () => {
                        shareJM(jmState.jmDetail)
                      },
                    })}
                    margin={'0 10px 0 0'}
                    // bg-color="transparent"
                    type="CircleIconGrayHover"
                  >
                    <SakiIcon
                      // width='14px'
                      // height='14px'
                      color="#555"
                      type="Share"
                    ></SakiIcon>
                  </saki-button>
                  <saki-dropdown
                    visible={activeJMIdDropdown === jmState.jmDetail.id}
                    floating-direction="Left"
                    ref={bindEvent({
                      close: () => {
                        setActiveJMIdDropdown('')
                      },
                    })}
                  >
                    <saki-button
                      ref={bindEvent({
                        tap: () => {
                          setActiveJMIdDropdown(jmState.jmDetail.id || '')
                        },
                      })}
                      // bg-color="transparent"
                      type="CircleIconGrayHover"
                    >
                      <saki-icon
                        // width='14px'
                        // height='14px'
                        color="#555"
                        type="More"
                      ></saki-icon>
                    </saki-button>
                    <div slot="main">
                      <saki-menu
                        ref={bindEvent({
                          selectvalue: async (e) => {
                            console.log(e.detail.value)
                            setActiveJMIdDropdown('')
                            setTimeout(() => {
                              switch (e.detail.value) {
                                case 'Edit':
                                  dispatch(
                                    setJMState({
                                      type: 'editJM',
                                      value: jmState.jmDetail,
                                    })
                                  )
                                  goPage('EditJM')

                                  break
                                case 'Unshare':
                                  switchShareJM(jmState.jmDetail)
                                  break
                                case 'Delete':
                                  deleteJM(jmState.jmDetail.id || '')
                                  break

                                default:
                                  break
                              }
                            })
                          },
                        })}
                      >
                        <saki-menu-item padding="10px 18px" value={'Edit'}>
                          <div className="dp-menu-item">
                            <span>
                              {t('updateJourneyMemory', {
                                ns: 'journeyMemoriesModal',
                              })}
                            </span>
                          </div>
                        </saki-menu-item>
                        {jmState.jmDetail?.permissions?.allowShare ? (
                          <saki-menu-item padding="10px 18px" value={'Unshare'}>
                            <div className="dp-menu-item">
                              <span>
                                {t('unshare', {
                                  ns: 'prompt',
                                })}
                              </span>
                            </div>
                          </saki-menu-item>
                        ) : (
                          ''
                        )}
                        <saki-menu-item padding="10px 18px" value={'Delete'}>
                          <div className="dp-menu-item">
                            <span>
                              {t('deleteJourneyMemory', {
                                ns: 'journeyMemoriesModal',
                              })}
                            </span>
                          </div>
                        </saki-menu-item>
                      </saki-menu>
                    </div>
                  </saki-dropdown>
                </>
              ) : (
                ''
              )}
            </div>
          </saki-modal-header>
        </div>
        <div className="jm-main">
          {jmState.loadBaseDataStatus === 'loading' ||
          jmState.loadStatus === 'loading' ? (
            <span className="jm-loading">
              {t('loadingData', {
                ns: 'prompt',
              })}
            </span>
          ) : (
            <>
              {!jmState.list.length ? (
                <div className="jm-none">
                  <saki-button
                    ref={bindEvent({
                      tap: () => {
                        console.log('addJourneyMemory')

                        dispatch(
                          setJMState({
                            type: 'pageTypes',
                            value: jmState.pageTypes.concat('AddJM'),
                          })
                        )
                      },
                    })}
                    margin="0px 0 20px"
                    width="200px"
                    padding="10px 10px"
                    type="Primary"
                    loading={jmState.loadBaseDataStatus === 'loading'}
                  >
                    {t('addJourneyMemory', {})}
                  </saki-button>
                </div>
              ) : (
                <saki-scroll-view
                  ref={bindEvent({
                    distancetoborder: (e) => {
                      console.log(e.detail.top > 0)

                      // if ((e.detail.top !== 0) !== startScroll) {
                      // 	setStartScroll(e.detail.top !== 0)
                      // }
                    },
                  })}
                  mode="Custom"
                  scroll-bar="Hidden"
                >
                  <div style={{}} className={'jm-layer '}>
                    <div className="jm-list">
                      <saki-card title={''} hide-subtitle>
                        {jmState.list.map((v, i) => {
                          const coverUrl = v.media?.filter(
                            (v) => v.type === 'image'
                          )?.[0]?.url
                          return (
                            <saki-card-item
                              ref={bindEvent({
                                tap: () => {
                                  dispatch(
                                    setJMState({
                                      type: 'pageTypes',
                                      value:
                                        jmState.pageTypes.concat('JMDetail'),
                                    })
                                  )
                                  dispatch(
                                    setJMState({
                                      type: 'jmDetail',
                                      value: v,
                                    })
                                  )
                                },
                              })}
                              key={i}
                              type="Flex"
                              // right-width='50px'
                              title=""
                              // border='1px dashed var(--saki-default-color)'
                              // border-hover='1px dashed var(--saki-default-color)'
                              // border-active='1px dashed var(--saki-default-color)'
                              border-radius="10px"
                              background-color="#fff"
                              background-hover-color="#f3f3f3"
                              background-active-color="#eee"
                              margin="0 0 10px"
                              padding="10px"
                              center-content="false"
                              // background-hover-color="rgb(250,250,250)"
                            >
                              <div className="jm-item" slot="left">
                                <div className="jmi-top">
                                  <div className="jmi-left">
                                    {coverUrl ? (
                                      <saki-images
                                        width="50px"
                                        height="50px"
                                        border-radius="6px"
                                        margin="0 10px 0 0"
                                        src={getSAaSSImageUrl(
                                          coverUrl,
                                          'thumbnail'
                                        )}
                                      ></saki-images>
                                    ) : (
                                      <div className="jmil-icon">
                                        <SakiIcon
                                          width="20px"
                                          height="20px"
                                          color="#fff"
                                          type="Route"
                                        ></SakiIcon>
                                      </div>
                                    )}
                                  </div>
                                  <div className="jmi-right">
                                    <div className="jmi-r-left">
                                      <div className="name">
                                        <div>{v.name}</div>
                                      </div>
                                      {/* <div className='desc'>
																		<span className='type'>{v.desc}</span>
																	</div> */}
                                      <div className="desc">
                                        <span className="text-two-elipsis">
                                          {stripHtmlTags(v?.desc || '')}
                                        </span>
                                      </div>
                                    </div>
                                    <saki-dropdown
                                      visible={activeVehicleIdDropdown === v.id}
                                      floating-direction="Left"
                                      ref={bindEvent({
                                        close: () => {
                                          setActiveVehicleIdDropdown('')
                                        },
                                      })}
                                    >
                                      <saki-button
                                        ref={bindEvent({
                                          tap: () => {
                                            setActiveVehicleIdDropdown(
                                              v.id || ''
                                            )
                                          },
                                        })}
                                        bg-color="transparent"
                                        type="CircleIconGrayHover"
                                      >
                                        <saki-icon
                                          color="#555"
                                          type="More"
                                        ></saki-icon>
                                      </saki-button>
                                      <div slot="main">
                                        <saki-menu
                                          ref={bindEvent({
                                            selectvalue: async (e) => {
                                              console.log(e.detail.value)
                                              switch (e.detail.value) {
                                                case 'Edit':
                                                  goPage('EditJM')

                                                  dispatch(
                                                    setJMState({
                                                      type: 'editJM',
                                                      value: v,
                                                    })
                                                  )
                                                  break
                                                case 'Delete':
                                                  deleteJM(v.id || '')
                                                  break

                                                default:
                                                  break
                                              }
                                              setActiveVehicleIdDropdown('')
                                            },
                                          })}
                                        >
                                          <saki-menu-item
                                            padding="10px 18px"
                                            value={'Edit'}
                                          >
                                            <div className="dp-menu-item">
                                              <span>
                                                {t('updateJourneyMemory', {
                                                  ns: 'journeyMemoriesModal',
                                                })}
                                              </span>
                                            </div>
                                          </saki-menu-item>
                                          <saki-menu-item
                                            padding="10px 18px"
                                            value={'Delete'}
                                          >
                                            <div className="dp-menu-item">
                                              <span>
                                                {t('deleteJourneyMemory', {
                                                  ns: 'journeyMemoriesModal',
                                                })}
                                              </span>
                                            </div>
                                          </saki-menu-item>
                                        </saki-menu>
                                      </div>
                                    </saki-dropdown>
                                  </div>
                                </div>
                                {v.statistics?.days ? (
                                  <div className="jmi-bottom">
                                    <div className="jm-statistics">
                                      <div className="item-s-item">
                                        {`${t('durationFull', {
                                          ns: 'tripPage',
                                          days: `${v.statistics?.days}天`,
                                          time: `${formatTimestamp(
                                            Number(v.statistics?.time),
                                            true
                                          )}`,
                                        })}`}
                                      </div>

                                      <div className="item-s-item">
                                        {`${v.statistics?.count}次行程 · ${
                                          Math.round(
                                            (v?.statistics?.distance || 0) / 10
                                          ) / 100
                                        } km`}
                                      </div>

                                      <div className="item-s-item">
                                        {t('maxSpeed', {
                                          ns: 'tripPage',
                                        })}{' '}
                                        {(v?.statistics?.maxSpeed?.num || 0) <=
                                        0
                                          ? 0
                                          : Math.round(
                                              ((v?.statistics?.maxSpeed?.num ||
                                                0) *
                                                3600) /
                                                100
                                            ) / 10}{' '}
                                        km/h
                                      </div>
                                      <div className="item-s-item">
                                        {t('maxAltitude', {
                                          ns: 'tripPage',
                                        })}{' '}
                                        {(v?.statistics?.maxAltitude?.num ||
                                          0) <= 0
                                          ? 0
                                          : Math.round(
                                              (v?.statistics?.maxAltitude
                                                ?.num || 0) * 10
                                            ) / 10}{' '}
                                        m
                                      </div>
                                      {/* <div className='info-item'>平均时速 10'05</div> */}
                                    </div>
                                  </div>
                                ) : (
                                  ''
                                )}
                              </div>
                              {/* <div slot='center'>
                                              </div> */}
                              {/* <div slot='right'></div> */}
                            </saki-card-item>
                          )
                        })}
                      </saki-card>
                    </div>
                    {/* {jmState.list.map((v, i) => {
											return (
												<div className='jm-item' key={i}>
													<div className='jm-i-left'>
														<div className='jm-i-name'>{v.name}</div>
														<div className='jm-i-desc'>
															<div className='jm-i-d-item'>
																总时长{' '}
																{(Number(v.statistics?.days) || 0) +
																	' / ' +
																	(Number(v.statistics?.time) || 0)}
															</div>
															<div className='jm-i-d-item'>
																行程数 {Number(v.statistics?.count) || 0}
															</div>
														</div>
													</div>
													<div className='jm-i-right'>
														<div className='jm-i-days'>
															{v.statistics?.distance}
														</div>
													</div>
												</div>
											)
										})} */}

                    <SakiScrollLoading
                      onTap={async () => {
                        await dispatch(
                          journeyMemoryMethods.GetJMList({
                            pageNum: 1,
                          })
                        ).unwrap()
                      }}
                      type={jmState.loadStatus as any}
                    ></SakiScrollLoading>
                  </div>
                </saki-scroll-view>
              )}
            </>
          )}
        </div>
        <saki-transition
          class-name={'avp'}
          animation-duration="300"
          data-refresh={config.deviceType}
          in={
            jmState.pageTypes.filter((v) => v === 'AddJM' || v === 'EditJM')
              .length > 0
          }
        >
          <AddJourneyMemoriesPage />
        </saki-transition>
        <saki-transition
          class-name={'avp'}
          animation-duration="300"
          data-refresh={config.deviceType}
          in={
            jmState.pageTypes.filter(
              (v) =>
                v === 'JMDetail' ||
                v === 'AddJMTimeline' ||
                v === 'EditJMTimeline'
            ).length > 0
          }
        >
          <JourneyMemoriesItemPage />
        </saki-transition>
        <saki-transition
          class-name={'avp'}
          animation-duration="300"
          data-deviceType={config.deviceType}
          in={
            jmState.pageTypes.filter(
              (v) => v === 'AddJMTimeline' || v === 'EditJMTimeline'
            ).length > 0
          }
        >
          <AddJourneyMemoriesTimelinePage />
        </saki-transition>
      </div>
    </saki-modal>
  )
}

const AddJourneyMemoriesPage = () => {
  const { t, i18n } = useTranslation('journeyMemoriesModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)

  const jmState = useSelector((state: RootState) => state.journeyMemory)

  const dispatch = useDispatch<AppDispatch>()

  const [openFilterModal, setOpenFilterModal] = useState(false)
  const [openPositionShareDropdown, setOpenPositionShareDropdown] =
    useState(false)
  const [selectLogo, setSelectLogo] = useState(false)

  const [filterConfig, setFilterConfig] =
    useState<protoRoot.configure.Configure.Filter.IFilterItem>({
      startDate: '',
      endDate: '',
      selectedVehicleIds: [] as string[],
      selectedTripTypes: [] as string[],
      selectedTripIds: [] as string[],
      // shortestDistance: 0,
      // longestDistance: 500,
    })

  const [id, setId] = useState('')
  const [logo, setLogo] = useState('')
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [desc, setDesc] = useState('')
  const [media, setMedia] = useState<MediaItem[]>([])

  const richtextEl = useRef<any>()

  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )
  useEffect(() => {
    if (
      jmState.pageTypes.filter((v) => v === 'AddJM' || v === 'EditJM').length >
      0
    ) {
      if (jmState.pageTypes.includes('EditJM')) {
        setId(jmState.editJM.id || '')
        setName(jmState.editJM.name || '')
        setNameErr('')
        setDesc(jmState.editJM.desc || '')
        richtextEl.current?.setValue(jmState.editJM.desc || '')
        setMedia(
          (jmState.editJM.media || []).map((v, i) => {
            return {
              ...v,
              id: i + getShortId(9),
            }
          })
        )
        return
      }
      setId('')
      setLogo('')
      setName('')
      setNameErr('')
      setDesc('')
      richtextEl.current?.setValue('')
      setMedia([
        // {
        // 	type: 'image',
        // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/Ia8ar2s1dM',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/JQaBKAoXbE',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/IP7Z3zrdFb',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/Mxc6JVX5AZ',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/HLc1JT0Hu1',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/JjwJXrXcN1',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/IAWtouCQNu',
        // },
        // {
        // 	type: 'image',
        // 	url: 'https://saass.aiiko.club/s/JwMrYL4FGQ',
        // },
      ])
    }
  }, [jmState.pageTypes])

  const addJM = async () => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')

    const mediaList = await uploadFiles(media)

    const params: protoRoot.journeyMemory.AddJM.IRequest = {
      name,
      desc,
      media: mediaList.map((v) => {
        return {
          type: v.type,
          url: v.url,
          width: v.width || 0,
          height: v.height || 0,
        }
      }),
    }
    const res = await httpApi.v1.AddJM({
      ...params,
    })
    console.log('AddJM', res, {
      name,
      desc,
      media,
    })
    if (res.code === 200) {
      setLoadStatus('loaded')
      backPage(-1)

      await dispatch(
        journeyMemoryMethods.GetJMList({
          pageNum: 1,
        })
      ).unwrap()

      snackbar({
        message: t('createdSuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  const updateJM = async () => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')

    const mediaList = await uploadFiles(media)

    const params: protoRoot.journeyMemory.UpdateJM.IRequest = {
      name,
      desc,
      media: mediaList.map((v) => {
        return {
          type: v.type,
          url: v.url,
          width: v.width || 0,
          height: v.height || 0,
        }
      }),
    }

    const res = await httpApi.v1.UpdateJM({
      id: jmState.editJM.id,
      ...params,
      // tripIds,
    })
    console.log('UpdateJM', res)
    if (res.code === 200) {
      setLoadStatus('loaded')

      backPage(-1)

      dispatch(
        setJMState({
          type: 'jmDetail',
          value: {
            ...jmState.jmDetail,
            ...params,
          },
        })
      )

      dispatch(
        setJMState({
          type: 'list',
          value: jmState.list.map((v) => {
            if (v.id === jmState.editJM.id) {
              return {
                ...v,
                ...params,
              }
            }

            return v
          }),
        })
      )

      snackbar({
        message: t('updatedSuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  return (
    <div className="add-jm-page  page-transition">
      <SakiScrollView mode="Custom" scroll-bar="Hidden">
        <div className="av-main">
          {/* {id ? (
					<div className='av-item'>
						<span>{t('id')}</span>
						<span
							style={{
								color: '#999',
							}}
						>
							{id || ''}
						</span>
					</div>
				) : (
					''
				)} */}
          {/* <div className='av-item'>
					<span>{t('cover') + ' (可选)'}</span>
					<saki-avatar
						ref={bindEvent({
							edit: (e: any) => {
								console.log(e)
								setSelectLogo(true)
							},
						})}
						width='80px'
						height='80px'
						border-radius='50%'
						default-icon='User'
						default-icon-size='24px'
						edit-icon
						src={logo}
					></saki-avatar>
				</div> */}

          <saki-input
            ref={bindEvent({
              changevalue: (e: any) => {
                // console.log(e)
                setNameErr(
                  !e.detail
                    ? t('cannotBeEmpty', {
                        ns: 'prompt',
                      })
                    : ''
                )
                setName(e.detail)
              },
            })}
            value={name}
            placeholder={t('namePlaceholder')}
            width={'100%'}
            height={'56px'}
            type={'Text'}
            margin="20px 0 0"
            placeholder-animation="MoveUp"
            max-length={30}
            error={nameErr}
            // errorColor={v.errorColor}
            // errorFontSize={v.errorFontSize}
          ></saki-input>

          <saki-richtext
            ref={bindEvent(
              {
                changevalue: (e) => {
                  // console.log('datadata', e.detail.richText)
                  setDesc(e.detail.richText || '')
                },
                submit: () => {},
              },
              (e: any) => {
                richtextEl.current = e
                richtextEl.current?.setToolbar?.({
                  container: [],
                })
              }
            )}
            theme="snow"
            toolbar="false"
            toolbar-padding="0px"
            // max-height='250px'
            min-height="120px"
            width="100%"
            padding="0px"
            margin="16px 0 0"
            font-size="14px"
            min-length="0"
            max-length="10000"
            clear-all-styles-when-pasting
            short-enter="NewLine"
            editor-background-color="rgb(243,243,243)"
            editor-border-radius="10px"
            editor-padding="10px"
            value={desc}
            placeholder={t('descPlaceholder')}
          />

          {/* <div className='av-item'>
					<span>{t('tripList')}</span>

					<saki-button
						ref={bindEvent({
							tap: () => {
								setOpenFilterModal(true)
							},
						})}
						margin='20px 0 0'
						padding='10px 10px'
						type='Primary'
					>
						<span>
							{tripIds?.length
								? t('selectedTripsCount', {
										length: tripIds.length,
								  })
								: t('selectTrips')}
						</span>
					</saki-button>

				</div>
				<FilterComponent
					dataList
					trips={FilterTrips({
						selectedTripTypes: filterConfig?.selectedTripTypes || [],
						shortestDistance: Number(filterConfig?.shortestDistance) || 0,
						longestDistance: Number(filterConfig?.longestDistance) || 0,
						showCustomTrip: filterConfig?.showCustomTrip || false,
						selectedVehicleIds: filterConfig?.selectedVehicleIds || [],
						startDate: filterConfig?.startDate || '',
						endDate: filterConfig?.endDate || '',
					})}
					selectTripIds={filterConfig?.selectedTripIds || []}
					onDataList={(ids) => {
						setFilterConfig({
							...filterConfig,
							selectedTripIds: ids,
						})

						setTripIds(ids)
					}}
					selectTypes={filterConfig?.selectedTripTypes || []}
					onSelectTypes={(filterTypes) => {
						setFilterConfig({
							...filterConfig,
							selectedTripTypes: filterTypes,
						})
					}}
					distanceRange={{
						minDistance: Number(filterConfig?.shortestDistance),
						maxDistance: Number(filterConfig?.longestDistance),
					}}
					onSelectDistance={(obj) => {
						setFilterConfig({
							...filterConfig,
							shortestDistance: obj.minDistance,
							longestDistance: obj.maxDistance,
						})
					}}
					date
					startDate={filterConfig?.startDate || ''}
					endDate={filterConfig?.endDate || ''}
					selectStartDate={(date) => {
						setFilterConfig({
							...filterConfig,
							startDate: date,
						})
					}}
					selectEndDate={(date) => {
						setFilterConfig({
							...filterConfig,
							endDate: date,
						})
					}}
					selectVehicle
					selectVehicleIds={filterConfig?.selectedVehicleIds || []}
					onSelectVehicleIds={(ids) => {
						setFilterConfig({
							...filterConfig,
							selectedVehicleIds: ids,
						})
					}}
					visible={openFilterModal}
					onclose={() => {
						setOpenFilterModal(false)
					}}
					customTripSwitch
					showCustomTrip={filterConfig?.showCustomTrip || false}
					onShowCustomTrip={(showCustomTrip) => {
						setFilterConfig({
							...filterConfig,
							showCustomTrip: showCustomTrip,
						})
					}}
				/> */}

          <div className="av-item media">
            <span>{t('cover')}</span>
            <CoverListComponent
              media={media}
              onMedia={(media) => {
                setMedia(media)
              }}
              maxLength={1}
            />

            {/* <saki-avatar
							ref={bindEvent({
								edit: (e: any) => {
									console.log(e)
									setSelectLogo(true)
								},
							})}
							width='80px'
							height='80px'
							border-radius='50%'
							default-icon='User'
							default-icon-size='24px'
							// edit-icon
							src={logo}
						></saki-avatar> */}
          </div>

          <div className="av-item av-buttons">
            {getCurrentPageType() === 'EditJM' ? (
              <SakiButton
                onTap={() => {
                  deleteJM(jmState.jmDetail?.id || '')
                }}
                margin="20px 0 20px 10px"
                padding="10px 10px"
                type="Normal"
              >
                {t('deleteJourneyMemory')}
              </SakiButton>
            ) : (
              ''
            )}
            <saki-button
              ref={bindEvent({
                tap: () => {
                  if (!id) {
                    addJM()
                    return
                  }
                  updateJM()
                },
              })}
              margin="20px 0 20px 10px"
              padding="10px 10px"
              type="Primary"
              disabled={!name}
              loading={loadStatus === 'loading'}
            >
              {jmState.pageTypes.includes('EditJM')
                ? t('updateJourneyMemory')
                : t('addJourneyMemory')}
            </saki-button>
          </div>
        </div>
      </SakiScrollView>
    </div>
  )
}

function updateIframeSrc(iframe: string): string {
  // 正则提取 src 属性
  const srcRegex = /src=(["'])(.*?)\1/
  const match = iframe.match(srcRegex)

  if (!match) {
    console.warn('No src attribute found')
    return iframe
  }

  let src = match[2] // 提取 src 值
  const quote = match[1] // 引号类型

  try {
    // 确保 URL 完整（添加协议）
    const url = new URL(src.startsWith('//') ? `https:${src}` : src)
    const params = url.searchParams

    // 检查是否已包含 autoplay 参数
    if (!params.has('autoplay')) {
      params.append('autoplay', '0')
      src = url.toString().replace(/^https:/, '') // 恢复原始协议相对格式
    }

    // 替换原 src 属性
    return iframe.replace(srcRegex, `src=${quote}${src}${quote}`)
  } catch (error) {
    console.error('Invalid URL:', error)
    return iframe // URL 无效，返回原字符串
  }
}

export const JourneyMemoriesItemPage = ({
  preview = false,
}: {
  preview?: boolean
}) => {
  const { t, i18n } = useTranslation('journeyMemoriesModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)
  const jmState = useSelector((state: RootState) => state.journeyMemory)

  const { historicalStatistics } = useSelector((state: RootState) => {
    const { historicalStatistics } = state.trip
    return { historicalStatistics }
  })

  const router = useRouter()

  const dispatch = useDispatch<AppDispatch>()

  const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
    mapLayer: true,
    mapMode: true,
    roadColorFade: true,
    showAvatarAtCurrentPosition: false,
    showSpeedColor: true,
    cityName: true,
    cityBoundaries: true,
    tripTrackRoute: true,
    speedAnimation: false,
    turnOnVoice: false,
    showPositionMarker: false,
    trackSpeedColor: true,
    trackRouteColor: true,
    polylineWidth: true,
    speedColorLimit: true,
  })

  const { mapLayer, speedColorRGBs, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('journeyMemoriesPage')
    console.log('dddddd', ml)

    const tempFeaturesList = {
      ...mapLayerFeaturesList,
      trackSpeedColor: !!ml.mapLayer?.showSpeedColor,
      trackRouteColor: !ml.mapLayer?.showSpeedColor,
      polylineWidth: !!ml.mapLayer?.tripTrackRoute,
      speedColorLimit: !!ml.mapLayer?.tripTrackRoute,
    }

    tempFeaturesList.trackSpeedColor = !ml.mapLayer?.tripTrackRoute
      ? false
      : tempFeaturesList.trackSpeedColor
    tempFeaturesList.trackRouteColor = !ml.mapLayer?.tripTrackRoute
      ? false
      : tempFeaturesList.trackRouteColor

    setMapLayerFeaturesList(tempFeaturesList)

    return ml
  }, [
    config.configure,
    config.country,
    config.connectionOSM,
    config.initConfigure,
  ])

  const mapRef = useRef<{
    [id: string]: {
      loadedMap: boolean
      map: Leaflet.Map | undefined
      layer: any
    }
  }>({})

  // const loadedMap = useRef(false)
  // const map = useRef<Leaflet.Map>()
  // const layer = useRef<any>()
  // const targetMarker = useRef<Leaflet.Marker<any>>()
  // const marker = useRef<Leaflet.Marker<any>>()
  // const polyline = useRef<Leaflet.Polyline<any>>()

  const [loadMoreList, setLoadMoreList] = useState<string[]>([])

  const [cityDistricts, setCityDistricts] = useState<{
    [type: string]: protoRoot.city.ICityItem[]
  }>({})

  const [cityBoundaries, setCityBoundaries] = useState<
    {
      cityId: string
      level: number
      geojson: GeoJSON
    }[]
  >([])

  const [showType, setShowType] = useState('ViewAllMomentMapTrack')

  const [viewMomentMapTrackId, setViewMomentMapTrackId] = useState('')

  const [activeJMTLdDropdown, setActiveJMTLDropdown] = useState('')

  const [showTLSortDP, setShowTLSortDP] = useState(false)

  const [showAllCityIds, setShowAllCityIds] = useState([] as string[])

  const carouselMap = useRef<{
    [id: string]: any
  }>({})
  const carouselNavMap = useRef<{
    [id: string]: any
  }>({})

  const d = useRef(new Debounce())

  const [imageWidth, setImageWidth] = useState(0)

  const [openCityListType, setOpenCityListType] = useState('')
  const [area, setArea] = useState(0)

  const [selectCountry, setSelectCountry] = useState<protoRoot.city.ICityItem>()
  const [selectCity, setSelectCity] = useState<protoRoot.city.ICityItem>()

  // const jmId = jmState.jmDetail?.id || ''

  const { jmId, isJmDetailPage } = useMemo(() => {
    const { id = '' } = router.query

    const isJmDetailPage = router.pathname.includes('/journeyMemories/detail')

    return {
      jmId: String(id || '') || jmState.jmDetail?.id || '',
      isJmDetailPage,
    }
  }, [router.query, jmState.jmDetail?.id])

  // console.log('router', jmId)

  useEffect(() => {
    // console.log(
    //   'GetJMTimelineList',
    //   !jmState.jmDetail.authorId,
    //   jmId,
    //   getCurrentPageType() === 'JMDetail',
    //   jmState.loadTimelineDetailStatus,
    //   router
    // )
    if (
      jmState.loadTimelineDetailStatus === 'loaded' &&
      jmId &&
      (isJmDetailPage || getCurrentPageType() === 'JMDetail')
    ) {
      setViewMomentMapTrackId('')
      loadData()
      return
    } else {
      if (!jmState.pageTypes.includes('JMDetail')) {
        jmId && clearMap(jmId)
        dispatch(
          setJMState({
            type: 'jmDetail',
            value: {},
          })
        )
        dispatch(
          setJMState({
            type: 'tlList',
            value: [],
          })
        )
        dispatch(
          setJMState({
            type: 'loadTimelineDetailStatus',
            value: 'loaded',
          })
        )
        dispatch(
          setJMState({
            type: 'loadTimelineListStatus',
            value: 'loaded',
          })
        )
      }
    }
  }, [jmId, jmState.pageTypes])

  // useEffect(() => {
  // 	if (showType === 'ViewMomentMapTrack') {
  // 		setViewMomentMapTrackId('')
  // 		scrollViewEl.current?.scrollto?.('top')
  // 		setShowType('ViewAllMomentMapTrack')
  // 	}
  // }, [showType])

  useEffect(() => {
    const id = jmId || ''
    const m = mapRef.current[id]
    if (jmId && jmState.tlList && m) {
      // jmState.tlList.forEach((v) => {
      // 	initMap(v?.id || '')
      // })
    }
  }, [jmState.jmDetail, jmState.tlList, mapRef.current])

  useEffect(() => {
    console.log(
      "mapUrl && jmId && (preview ?? getCurrentPageType() === 'JMDetail')",
      jmId,
      (preview || getCurrentPageType() === 'JMDetail') &&
        jmId &&
        mapUrl &&
        config.initConfigure
    )
    if (
      (preview || getCurrentPageType() === 'JMDetail') &&
      jmId &&
      mapUrl &&
      config.initConfigure
    ) {
      initMap(jmId)
    }
  }, [jmState.loadTimelineDetailStatus, jmId, mapUrl, config.initConfigure])

  useEffect(() => {
    const m = mapRef.current[jmId || '']
    if (
      (preview || getCurrentPageType() === 'JMDetail') &&
      jmId &&
      mapUrl &&
      config.initConfigure &&
      m?.loadedMap
    ) {
      m.loadedMap = false
      initMap(jmId)
    }
  }, [
    mapUrl,
    config.showDetailedDataForMultipleHistoricalTrips,
    mapLayer?.roadColorFade,
  ])
  // useEffect(() => {
  // 	if (layout.openJourneyMemoriesModal && mapUrl) {
  // 		initMap(jmId || '', true)
  // 		return
  // 	}
  // 	// clearMap()
  // }, [layout.openJourneyMemoriesModal, mapUrl])

  const loadData = async () => {
    if (jmState.loadTimelineDetailStatus === 'loading') return

    setLoadMoreList([])

    dispatch(
      setJMState({
        type: 'loadTimelineDetailStatus',
        value: 'loading',
      })
    )

    const res = await httpApi.v1.GetJMDetail({
      id: jmId,
      // shareKey: sk,
    })
    console.log('GetJMDetail', res, jmId)
    if (res.code === 200 && res?.data?.journeyMemory) {
      if (isJmDetailPage) {
        dispatch(
          layoutSlice.actions.setLayoutHeaderLogoText(
            res.data?.journeyMemory?.name || ''
          )
        )
      }

      dispatch(
        setJMState({
          type: 'jmDetail',
          value: res.data.journeyMemory,
        })
      )
      await dispatch(
        methods.journeyMemory.GetJMTLList({
          id: jmId,
          pageNum: 1,
        })
      ).unwrap()

      // const { journeyMemory } = store.getState()
      // const urls = journeyMemory.tlList.reduce((t, v) => {
      //   const urls = v.media?.filter((v) => v.type === 'image')?.map((v) => v.url || '') || []
      //   return t.concat(...urls)
      // }, [] as string[])
      // console.log('jmmm', urls)
      // console.log('jmmm', await getImageDimensionsBatched(urls, 5))
    }
    dispatch(
      setJMState({
        type: 'loadTimelineDetailStatus',
        value: 'noMore',
      })
    )
  }

  const clearMap = (id: string) => {
    console.log('clearMap')

    const m = mapRef.current[id]

    if (!m) return
    m.map?.remove()
    m.map = undefined
    m.loadedMap = false

    // loadedMap.current = false
    // map.current?.remove()
    // map.current = undefined
    // marker.current?.remove()
    // marker.current = undefined
    // targetMarker.current?.remove()
    // targetMarker.current = undefined

    // deleteAllCityGeojsonMap('VisitedCitiesModal')
  }

  useEffect(() => {
    d.current.increase(() => {
      Object.keys(mapRef.current).forEach((k) => {
        console.log(
          'resize_vcm111',
          mapRef.current[k],
          mapRef.current[k]?.map?.invalidateSize
        )
        mapRef.current[k]?.map?.invalidateSize(true)
      })
    }, 400)
  }, [config.deviceWH.w, config.deviceWH.h])

  useEffect(() => {
    console.log('llllll', jmState.loadTimelineListStatus)
    if (
      jmState.loadTimelineListStatus === 'loaded' ||
      jmState.loadTimelineListStatus === 'noMore'
    ) {
      loadTrackData()
    }
  }, [
    mapRef.current,
    jmState.loadTimelineListStatus,
    viewMomentMapTrackId,

    mapLayer?.tripTrackRoute,
    mapLayer?.cityBoundaries,
    mapLayer?.cityName,
    mapLayer?.polylineWidth,
    mapLayer?.showSpeedColor,
    mapLayer?.polylineWidth,
    mapLayer?.trackSpeedColor,
  ])

  const loadTrackData = async () => {
    d.current.increase(async () => {
      const m = mapRef.current[jmId || '']
      console.log(
        'llllll',
        mapRef.current,
        m,
        jmId || '',
        jmState.loadTimelineListStatus,
        jmState.tlList.length
      )
      if (m?.map && jmState.tlList.length) {
        let ids = [] as string[]
        jmState.tlList.forEach((v) => {
          if (viewMomentMapTrackId && v.id !== viewMomentMapTrackId) {
            return
          }
          ids = ids.concat(v?.tripIds || [])
        })
        // const tripPositions = await storage.tripPositions.mget(ids)
        // console.log('llllll,positions1', tripPositions, ids)

        console.log('GetJMTimelineList', jmState.tlList)

        const tripPositions = await getTripHistoryPositions({
          ids: tripIds,
          fullData: true,
          authorId: jmState.jmDetail?.authorId || '',
          jmId,
        })

        await renderPolyline({
          map: m.map,

          showTripTrackRoute: mapLayer?.tripTrackRoute || false,
          showCityName: mapLayer?.cityName || false,
          showCityBoundariesType: (mapLayer?.cityBoundaries || '') as any,

          trips: tripPositions,
          // Number(config.configure.polylineWidth?.historyTripTrack) ||

          speedColor: mapLayer?.showSpeedColor
            ? 'auto'
            : getTrackRouteColor(
                (mapLayer?.trackRouteColor as any) || 'Red',
                false
              ),
          weight: Number(mapLayer?.polylineWidth),

          filterAccuracy: 'NoFilter',
          // speedColor: getTrackRouteColor(config.configure?.trackRouteColor as any, false) || 'auto',
        })
        d.current.increase(() => {
          m.map?.invalidateSize(true)
        }, 300)
      }
    }, 700)
  }

  useEffect(() => {
    const m = mapRef.current[jmId || '']
    if (m?.map) {
      ;(m.map as any).mapUrl = mapUrl
      ;(m.map as any).speedColorRGBs = speedColorRGBs
    }
  }, [mapRef.current, speedColorRGBs, mapUrl])

  useEffect(() => {
    const m = mapRef.current[jmId || '']
    if (m?.layer) {
      m?.layer?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
      m?.layer?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
      m?.layer?.setBlackscale?.(mapLayer?.mapMode === 'Black')
    }
  }, [mapLayer?.mapMode])

  const initMap = async (id: string, loadedMap: boolean = false) => {
    const L: typeof Leaflet = (window as any).L

    const myPositionGPS = getLatLng(
      mapUrl,
      geo.position.coords?.latitude || 0,
      geo.position.coords?.longitude || 0
    )
    const zoom = 12

    const [lat, lon] = [myPositionGPS[0], myPositionGPS[1]]

    if (!mapRef.current[id]) {
      mapRef.current[id] = {
        loadedMap: false,
        layer: undefined,
        map: undefined,
      }
    }

    const m = mapRef.current[id]

    // console.log(
    //   'llllll initMap',
    //   'jmd-map-' + id,
    //   mapUrl,
    //   m,
    //   (L && !m.loadedMap) || loadedMap
    // )

    if ((L && !m.loadedMap) || loadedMap) {
      if (m.map || loadedMap) {
        clearMap(id)
      }
      if (!m.map) {
        m.map = L.map('jmd-map-' + (preview ? 'pre-' : '') + id, {
          renderer: L.canvas(),
          preferCanvas: true,
          zoomControl: false,
          minZoom: 3,
          maxZoom: 18,
          trackResize: false,
          zoomDelta: 0.5,
          zoomSnap: 0.5,

          attributionControl: false,
        })

        // eventListener.on('resize_vcm', () => {
        //   m.map?.invalidateSize(true)
        //   console.log('resize_vcm', m.map)
        // })

        // 检测地址如果在中国就用高德地图
        m.map.setView([lat, lon], zoom)

        m.layer = (L.tileLayer as any).colorScale(mapUrl, {}).addTo(m.map)

        m.layer?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
        m.layer?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
        m.layer?.setBlackscale?.(mapLayer?.mapMode === 'Black')

        createDistanceScaleControl(
          m.map,
          config.deviceType === 'Mobile' ? 80 : 100,
          {
            position: 'bottomleft',
            y: '5px',
          }
        )

        mapLayer && roadColorFade(mapLayer, m.layer)

        d.current.increase(() => {
          m.map?.invalidateSize(true)
        }, 300)
      }

      m.loadedMap = true
      ;(m.map as any).mapUrl = mapUrl
      ;(m.map as any).speedColorRGBs = speedColorRGBs
      loadTrackData()
    }
  }

  const deleteMoment = async (id: string) => {
    alert({
      title: t('deleteMoment', {
        ns: 'journeyMemoriesModal',
      }),
      content: t('deleteThisMoment', {
        ns: 'journeyMemoriesModal',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('delete', {
        ns: 'prompt',
      }),
      onCancel() {},
      async onConfirm() {
        const res = await httpApi.v1.DeleteJMTimeline({
          id: jmState.jmDetail.id,
          timelineId: id,
        })

        console.log('DeleteJMTimeline', res)

        if (res.code === 200) {
          dispatch(
            setJMState({
              type: 'tlList',
              value: sortTlList(
                jmState.tlList.filter((v) => {
                  return v.id !== id
                }),
                jmState.tlSort
              ),
            })
          )
          snackbar({
            message: t('deletedSuccessfully', {
              ns: 'prompt',
            }),
            autoHideDuration: 2000,
            vertical: 'top',
            horizontal: 'center',
            backgroundColor: 'var(--saki-default-color)',
            color: '#fff',
          }).open()
        }
      },
    }).open()
  }

  const scrollViewEl = useRef<any>()

  const jmCreateTimeMoment = moment(Number(jmState.jmDetail.createTime) * 1000)
  const jmLastUpdateTimeMoment = moment(
    Number(jmState.jmDetail.lastUpdateTime) * 1000
  )

  const { cityNamesMap, cityNamesList, tripIds } = useMemo(() => {
    const cityNamesMap: {
      [id: string]: string[]
    } = {}
    let tripIds: string[] = []
    jmState.tlList.forEach((v) => {
      const cityName: string[] = []

      tripIds = tripIds.concat(v?.tripIds || [])

      v.trips?.forEach((sv) => {
        sv.cities?.reverse()
        sv.cities?.forEach((ssv) => {
          // ssv.cityDetails?.filter

          const fullName: string[] = []
          ssv.cityDetails?.forEach((sssv) => {
            if (sssv.level === 2 || sssv.level === 3 || sssv.level === 4) {
              fullName.push(
                getSimpleCityName(
                  getCityName(sssv.name) || '',
                  convertCityLevelToTypeString(sssv.level || 1)
                )
              )
              // fullName.push(sssv.name?.zhCN || '')
            }
          })

          const fullNameStr = fullName
            // .slice(fullName.length - 2, fullName.length)
            .join('·')

          !cityName.includes(fullNameStr) && cityName.push(fullNameStr)
        })
      })

      cityNamesMap[v.id || ''] = cityName
    })

    const cityNamesList = Object.keys(cityNamesMap).reduce((cityNames, v) => {
      return [...new Set(cityNames.concat(cityNamesMap[v]))]
    }, [] as string[])
    return { cityNamesMap, cityNamesList, tripIds }
  }, [jmState.tlList])

  // console.log('router', router)

  const { iwMediaList, coverUrl } = useMemo(() => {
    const coverUrl =
      jmState.jmDetail?.media?.filter((v) => v.type === 'image')?.[0]?.url || ''

    const mediaList = jmState.tlList.reduce((t, v) => {
      t = t.concat(
        (v?.media || [])
          ?.filter((v) => v.type === 'image')
          ?.map((sv) => {
            const mi: IWMediaItem = {
              ...sv,
              tlItem: v,
            }
            return mi
          })
      )
      return t
    }, [] as IWMediaItem[])

    return { coverUrl, iwMediaList: mediaList }
  }, [jmState.tlList, jmState.jmDetail])

  const [playVidUrl, setPlayVidUrl] = useState({
    tlId: '',
    mediaIndex: -1,
    url: '',
  })

  return (
    <div
      className={`jm-detail-page ${preview ? 'preview' : ''} ${
        !isJmDetailPage ? 'page-transition' : ''
      } ${config.deviceType + (config.fullScreen ? ' enlarge ' : '')}`}
    >
      <saki-scroll-view
        ref={bindEvent(
          {
            distancetoborder: (e) => {
              // console.log(e.detail.top>0)

              if ((e.detail.top !== 0) !== jmState.startScroll) {
                // setStartScroll(e.detail.top !== 0)
                dispatch(
                  setJMState({
                    type: 'startScroll',
                    value: e.detail.top !== 0,
                  })
                )
              }
            },
          },
          (e) => {
            scrollViewEl.current = e
          }
        )}
        mode="Custom"
        // scroll-bar='Hidden'
      >
        <div className="jmd-media">
          {jmId ? (
            <>
              <div className="jmd-map">
                <div
                  className="map"
                  id={'jmd-map-' + (preview ? 'pre-' : '') + jmId}
                >
                  <LayerButtons
                    mapLayer={mapLayer}
                    // style={{
                    //   left: '20px',
                    //   top: '60px',
                    //   // bottom: selectPolylineId ? '240px' : '160px',
                    // }}
                    // modalConfig={{
                    //   vertical: 'Top',
                    //   horizontal: 'Left',
                    //   offsetX: '20px',
                    //   offsetY: '160px',
                    // }}
                    mapLayerType={mapLayerType}
                    featuresList={mapLayerFeaturesList}
                  ></LayerButtons>
                </div>
              </div>
              {/* <saki-carousel
                ref={bindEvent(
                  {
                    resizeChange: (e) => {
                      // console.log('carousel', e)
                    },
                    switchIndex: (e) => {
                      console.log('switchIndex', e)

                      carouselNavMap.current[jmId]?.switch(e.detail)
                    },
                  },
                  (e) => {
                    carouselMap.current[jmId] = e
                  }
                )}
                margin="0 0 10px 0"
                width="100%"
                height="100%"
                // height='calc(100% - 60px)'
                // autoplay
                arrows
                // dots
              >
                <saki-carousel-item>
                  <div className="jmd-map">
                    <div className="map" id={'jmd-map-' + jmId}></div>
                  </div>
                </saki-carousel-item>
                {jmState.jmDetail.media?.map((v, i) => {
                  return v.type === 'image' ? (
                    <saki-carousel-item key={i}>
                      <saki-images
                        width="100%"
                        height="100%"
                        objectFit="cover"
                        src={getSAaSSImageUrl(v.url || '', 'mid')}
                      ></saki-images>
                      ;
                    </saki-carousel-item>
                  ) : (
                    ''
                  )
                })}
              </saki-carousel> */}
              <div
                // style={{
                // 	width:
                // 		60 * (Number(jmState.jmDetail.media?.length) + 1) + 'px',
                // }}
                className="jmd-carnav"
              >
                {coverUrl && iwMediaList.length ? (
                  <SakiButton
                    onTap={() => {
                      loadModal('ImagesWaterfall', () => {
                        dispatch(
                          layoutSlice.actions.setOpenImagesWaterfallModal(true)
                        )
                        dispatch(
                          layoutSlice.actions.setOpenImagesWaterfallModalMediaList(
                            {
                              mediaList: iwMediaList,
                              title: jmState.jmDetail.name || '',
                            }
                          )
                        )
                      })
                    }}
                    padding="0"
                    border-radius="18px"
                    border="none"
                    margin={'0 0 10px 0'}
                  >
                    <div className="jmd-c-cover">
                      <SakiImages
                        width={'140px'}
                        height={'80px'}
                        objectFit="cover"
                        borderRadius="10px"
                        src={getSAaSSImageUrl(coverUrl, 'small')}
                      ></SakiImages>
                      <div className="cover-text">
                        <span>{`${t('title', {
                          ns: 'imagesWaterfallModal',
                        })} ${iwMediaList.length}`}</span>
                        <SakiIcon
                          type="Right"
                          color="#fff"
                          width="10px"
                          height="10px"
                          margin="0 0 0 4px"
                        ></SakiIcon>
                      </div>
                    </div>
                  </SakiButton>
                ) : (
                  ''
                )}
                <div className="jmd-c-btns">
                  {/* {viewMomentMapTrackId ? (
										<SakiButton
											onTap={() => {
												setViewMomentMapTrackId('')
												scrollViewEl.current?.scrollto?.('top')
											}}
											padding='6px 10px'
											height='36px'
											border-radius='18px'
											margin={'0 0 0 6px'}
											type='Primary'
										>
											<span
												style={{
													whiteSpace: 'nowrap',
												}}
											>
												{t('viewAllMomentMapTrack')}
											</span>
										</SakiButton>
									) : (
										''
									)} */}

                  <saki-segmented
                    ref={bindEvent({
                      changevalue: async (e) => {
                        console.log('SetConfigure segmented', e, showType)

                        if (e.detail === 'VisitedCities') {
                          ;(e.target as any)?.setValue(showType)

                          loadModal('VisitedCities', () => {
                            dispatch(
                              layoutSlice.actions.setOpenVisitedCitiesModal({
                                visible: true,
                                title: t('cityTrajectory', {
                                  ns: 'visitedCitiesModal',
                                  name: jmState.jmDetail?.name || '',
                                }),
                                tripIds,
                              })
                            )
                          })
                          return
                        }
                        if (e.detail === 'ViewAllMomentMapTrack') {
                          setViewMomentMapTrackId('')
                          scrollViewEl.current?.scrollto?.('top')
                          setShowType('ViewAllMomentMapTrack')
                          return
                        }
                        setShowType(e.detail)
                      },
                    })}
                    // width='200px'
                    height="40px"
                    border-radius="20px"
                    value={showType}
                    bg-color="rgba(255,255,255,0.7)"
                  >
                    <saki-segmented-item
                      padding="2px 8px"
                      value={'ViewAllMomentMapTrack'}
                    >
                      <span>{t('allMomentMapTrack')}</span>
                    </saki-segmented-item>
                    {viewMomentMapTrackId ? (
                      <saki-segmented-item
                        padding="2px 8px"
                        value={'ViewMomentMapTrack'}
                      >
                        <span>{t('momentMapTrack')}</span>
                      </saki-segmented-item>
                    ) : (
                      ''
                    )}

                    <saki-segmented-item
                      padding="2px 8px"
                      value={'VisitedCities'}
                    >
                      <span>
                        {t('title', {
                          ns: 'visitedCitiesModal',
                        })}
                      </span>
                    </saki-segmented-item>
                  </saki-segmented>

                  {/* <SakiButton
										onTap={() => {
											setViewMomentMapTrackId('')
											scrollViewEl.current?.scrollto?.('top')
										}}
										padding='6px 10px'
										height='36px'
										border-radius='18px'
										margin={'0 0 0 6px'}
										type='Primary'
									>
										<span
											style={{
												whiteSpace: 'nowrap',
											}}
										>
											{t('viewAllMomentMapTrack')}
										</span>
									</SakiButton> */}
                </div>

                {/* <saki-carousel-nav
                  ref={bindEvent(
                    {
                      switchIndex: async (e) => {
                        console.log('switchIndex selectvalue', e)
                        ;(await carouselMap.current[jmId].getScrollIndex()) !== e.detail &&
                          carouselMap.current[jmId].switch(e.detail)
                      },
                    },
                    (e) => {
                      carouselNavMap.current[jmId] = e
                    }
                  )}
                  // margin='0 0 10px 0'
                  width="100%"
                  // height='60px'
                  justify-content="flex-end"
                >
                  <saki-carousel-nav-item
                    border-radius="6px"
                    width="50px"
                    height="50px"
                    padding="2px"
                    margin="0 0 10px 10px"
                  >
                    <span className="jmd-media-map-nav-text">{t('map')}</span>
                  </saki-carousel-nav-item>
                  {jmState.jmDetail.media?.map((v, i) => {
                    return v.type === 'image' ? (
                      <saki-carousel-nav-item
                        border-radius="6px"
                        width="50px"
                        height="50px"
                        margin="0 0 10px 10px"
                        key={i}
                      >
                        <SakiImages
                          width="100%"
                          height="100%"
                          objectFit="cover"
                          src={getSAaSSImageUrl(v.url || '', 'thumbnail')}
                        ></SakiImages>
                        ;
                      </saki-carousel-nav-item>
                    ) : (
                      ''
                    )
                  })}
                </saki-carousel-nav> */}
              </div>
            </>
          ) : (
            ''
          )}
        </div>

        {jmState.jmDetail.name ? (
          <div
            style={
              {
                // marginTop: config.deviceWH.h - 200 + 'px',
              }
            }
            className={'jmd-main '}
          >
            <div className="jmd-name">
              <h3>{jmState.jmDetail.name}</h3>

              {preview ? (
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      // addOnlineVideo([])
                      copyJMUrl(jmId)
                    },
                  })}
                  margin={'0 10px 0 0'}
                  // bg-color="transparent"
                  type="CircleIconGrayHover"
                >
                  <SakiIcon
                    // width='14px'
                    // height='14px'
                    color="#555"
                    type="Share"
                  ></SakiIcon>
                </saki-button>
              ) : (
                ''
              )}
            </div>
            <div className="jmd-desc">
              <div
                dangerouslySetInnerHTML={{
                  __html: jmState.jmDetail.desc || '',
                }}
              />
            </div>

            <div className="jmd-city">
              {(showAllCityIds.includes('detail')
                ? cityNamesList
                : cityNamesList.filter((_, i) => i < 9)
              ).map((v, i) => {
                return (
                  <span className="cn" key={i}>
                    {v}
                  </span>
                )
              })}
              {cityNamesList.length > 9 ? (
                <span
                  ref={bindEvent({
                    click: () => {
                      setShowAllCityIds(
                        showAllCityIds.includes('detail')
                          ? showAllCityIds.filter((v) => v !== 'detail')
                          : showAllCityIds.concat(['detail'])
                      )
                    },
                  })}
                  className="more"
                >
                  {!showAllCityIds.includes('detail')
                    ? t('expandCities', {
                        ns: 'journeyMemoriesModal',
                        num: cityNamesList.length - 9,
                      })
                    : t('collapseCities', {
                        ns: 'journeyMemoriesModal',
                      })}
                </span>
              ) : (
                ''
              )}
            </div>
            {jmState.jmDetail?.statistics?.count ? (
              <div className="jm-statistics">
                <div className="item-s-item">
                  {`${t('durationFull', {
                    ns: 'tripPage',
                    days: `${jmState.jmDetail?.statistics?.days}天`,
                    time: `${formatTimestamp(
                      Number(jmState.jmDetail?.statistics?.time),
                      true
                    )}`,
                  })}`}
                </div>

                <div className="item-s-item">
                  {`${jmState.jmDetail?.statistics?.count}次行程 · ${
                    Math.round(
                      (jmState.jmDetail?.statistics?.distance || 0) / 10
                    ) / 100
                  } km`}
                </div>

                <div className="item-s-item">
                  {t('maxSpeed', {
                    ns: 'tripPage',
                  })}{' '}
                  {(jmState.jmDetail?.statistics?.maxSpeed?.num || 0) <= 0
                    ? 0
                    : Math.round(
                        ((jmState.jmDetail?.statistics?.maxSpeed?.num || 0) *
                          3600) /
                          100
                      ) / 10}{' '}
                  km/h
                </div>
                <div className="item-s-item">
                  {t('maxAltitude', {
                    ns: 'tripPage',
                  })}{' '}
                  {(jmState.jmDetail?.statistics?.maxAltitude?.num || 0) <= 0
                    ? 0
                    : Math.round(
                        (jmState.jmDetail?.statistics?.maxAltitude?.num || 0) *
                          10
                      ) / 10}{' '}
                  m
                </div>
                {/* <div className='info-item'>平均时速 10'05</div> */}
              </div>
            ) : (
              ''
            )}
            <div className="jmd-info">
              <span>
                {t('numCities', {
                  ns: 'tripPage',
                  num: cityNamesList.length,
                })}
              </span>

              <span>{`·`}</span>
              {jmState.jmDetail.lastUpdateTime ? (
                <span>
                  {t('lastUpdatedAt', {
                    date: jmLastUpdateTimeMoment.format('YYYY.MM.DD'),
                    time: jmLastUpdateTimeMoment.format('HH:mm:ss'),
                  })}
                </span>
              ) : (
                ''
              )}
              <span>{`·`}</span>
              <span>
                {t('createdAt', {
                  date: jmCreateTimeMoment.format('YYYY.MM.DD'),
                  time: jmCreateTimeMoment.format('HH:mm:ss'),
                })}
              </span>
            </div>

            {!jmState.jmDetail.timeline?.length && false ? (
              <div className="jmd-timeline-none">{t('timelineEmpty')}</div>
            ) : (
              <>
                <div className="jmd-timeline-title">
                  <div className="jmd-tl-t-left">
                    <span className="title">{t('moment')}</span>
                    <saki-dropdown
                      visible={showTLSortDP}
                      floating-direction="Left"
                      ref={bindEvent({
                        close: () => {
                          setShowTLSortDP(false)
                        },
                      })}
                    >
                      <SakiButton
                        onTap={() => {
                          setShowTLSortDP(true)
                        }}
                        padding="4px 2px 4px 6px"
                        margin="0 0 0 6px"
                        border="none"
                        type="Normal"
                      >
                        <span>
                          {!jmState.tlSort
                            ? t('sort', {
                                ns: 'prompt',
                              })
                            : t(jmState.tlSort, {
                                ns: 'prompt',
                              })}
                        </span>
                        <saki-icon
                          margin="0 6px 0 0"
                          color="#aaa"
                          type="BottomTriangle"
                        ></saki-icon>
                      </SakiButton>
                      <div slot="main">
                        <saki-menu
                          ref={bindEvent({
                            selectvalue: async (e) => {
                              dispatch(
                                setJMState({
                                  type: 'tlSort',
                                  value: e.detail.value,
                                })
                              )

                              dispatch(
                                setJMState({
                                  type: 'tlList',
                                  value: sortTlList(
                                    [...jmState.tlList],
                                    e.detail.value
                                  ),
                                })
                              )

                              setShowTLSortDP(false)
                            },
                          })}
                        >
                          <saki-menu-item
                            active={jmState.tlSort === 'ascending'}
                            padding="10px 18px"
                            value={'ascending'}
                          >
                            <div className="dp-menu-item">
                              <span>
                                {t('ascending', {
                                  ns: 'prompt',
                                })}
                              </span>
                            </div>
                          </saki-menu-item>
                          <saki-menu-item
                            active={jmState.tlSort === 'descending'}
                            padding="10px 18px"
                            value={'descending'}
                          >
                            <div className="dp-menu-item">
                              <span>
                                {t('descending', {
                                  ns: 'prompt',
                                })}
                              </span>
                            </div>
                          </saki-menu-item>
                        </saki-menu>
                      </div>
                    </saki-dropdown>
                  </div>

                  {!preview && (
                    <SakiButton
                      onTap={() => {
                        goPage('AddJMTimeline')
                      }}
                      padding="10px 10px"
                      border="none"
                      type="Normal"
                    >
                      {/* <saki-icon
                  margin='0 6px 0 0'
                  color='#aaa'
                  type='Add'
                ></saki-icon> */}
                      <span>{t('addMoment')}</span>
                    </SakiButton>
                  )}
                </div>

                <div className="jmd-timeline">
                  {jmState.tlList.map((v, i) => {
                    let maxCreateTripTime = 0
                    let minCreateTripTime = 9999999999
                    v.trips?.forEach((sv) => {
                      maxCreateTripTime = Math.max(
                        maxCreateTripTime,
                        Number(sv.createTime)
                      )
                      minCreateTripTime = Math.min(
                        minCreateTripTime,
                        Number(sv.createTime)
                      )
                    })

                    let shortDesc = stripHtmlTags(v?.desc || '')

                    if (shortDesc.length >= 50) {
                      shortDesc = shortDesc.slice(0, 50) + '...'
                    }

                    return (
                      <div className="jmd-tl-item" key={i}>
                        <div className="item-header">
                          <span className="date">
                            {`${moment(minCreateTripTime * 1000).format(
                              'YYYY.MM.DD'
                            )} - ${moment(maxCreateTripTime * 1000).format(
                              'YYYY.MM.DD'
                            )}`}
                          </span>

                          <saki-dropdown
                            visible={activeJMTLdDropdown === v.id}
                            floating-direction="Left"
                            ref={bindEvent({
                              close: () => {
                                setActiveJMTLDropdown('')
                              },
                            })}
                          >
                            <saki-button
                              ref={bindEvent({
                                tap: () => {
                                  setActiveJMTLDropdown(v.id || '')
                                },
                              })}
                              bg-color="transparent"
                              type="CircleIconGrayHover"
                            >
                              <saki-icon
                                // width='14px'
                                // height='14px'
                                color="#999"
                                type="More"
                              ></saki-icon>
                            </saki-button>
                            <div slot="main">
                              <saki-menu
                                ref={bindEvent({
                                  selectvalue: async (e) => {
                                    console.log(e.detail.value)
                                    switch (e.detail.value) {
                                      case 'Edit':
                                        dispatch(
                                          setJMState({
                                            type: 'editJMTL',
                                            value: v,
                                          })
                                        )
                                        goPage('EditJMTimeline')
                                        break
                                      case 'Delete':
                                        deleteMoment(v.id || '')
                                        break
                                      case 'ViewMomentMapTrack':
                                        setShowType('ViewMomentMapTrack')
                                        setViewMomentMapTrackId(v?.id || '')
                                        scrollViewEl.current?.scrollto?.('top')
                                        break

                                      default:
                                        break
                                    }
                                    setActiveJMTLDropdown('')
                                  },
                                })}
                              >
                                <saki-menu-item
                                  padding="10px 18px"
                                  value={'ViewMomentMapTrack'}
                                >
                                  <div className="dp-menu-item">
                                    <span>
                                      {t('viewMomentMapTrack', {
                                        ns: 'journeyMemoriesModal',
                                      })}
                                    </span>
                                  </div>
                                </saki-menu-item>
                                <saki-menu-item
                                  padding="10px 18px"
                                  disabled={preview}
                                  value={'Edit'}
                                >
                                  <div className="dp-menu-item">
                                    <span>
                                      {t('updateMoment', {
                                        ns: 'journeyMemoriesModal',
                                      })}
                                    </span>
                                  </div>
                                </saki-menu-item>
                                <saki-menu-item
                                  padding="10px 18px"
                                  disabled={preview}
                                  value={'Delete'}
                                >
                                  <div className="dp-menu-item">
                                    <span>
                                      {t('deleteMoment', {
                                        ns: 'journeyMemoriesModal',
                                      })}
                                    </span>
                                  </div>
                                </saki-menu-item>
                              </saki-menu>
                            </div>
                          </saki-dropdown>
                        </div>
                        <div className="item-continer">
                          <div className="item-name">
                            <span className="name">{v.name}</span>
                          </div>
                          <div className="item-desc">
                            <div
                              className="desc"
                              dangerouslySetInnerHTML={{ __html: v.desc || '' }}
                            />
                            {/* <span className='desc'>{v.desc}</span> */}
                          </div>
                          <div className="item-city">
                            {(showAllCityIds.includes(v?.id || '')
                              ? cityNamesMap[v?.id || '']
                              : cityNamesMap[v?.id || ''].filter(
                                  (_, i) => i < 9
                                )
                            )?.map((sv, si) => {
                              return (
                                <span className="cn" key={si}>
                                  {sv}
                                </span>
                              )
                            })}

                            {cityNamesMap[v?.id || '']?.length > 9 ? (
                              <span
                                ref={bindEvent({
                                  click: () => {
                                    setShowAllCityIds(
                                      showAllCityIds.includes(v?.id || '')
                                        ? showAllCityIds.filter(
                                            (sv) => sv !== v?.id || ''
                                          )
                                        : showAllCityIds.concat([v?.id || ''])
                                    )
                                  },
                                })}
                                className="more"
                              >
                                {!showAllCityIds.includes(v?.id || '')
                                  ? t('expandCities', {
                                      ns: 'journeyMemoriesModal',
                                      num:
                                        cityNamesMap[v?.id || '']?.length - 9,
                                    })
                                  : t('collapseCities', {
                                      ns: 'journeyMemoriesModal',
                                    })}
                              </span>
                            ) : (
                              ''
                            )}
                          </div>
                          {v.statistics?.count ? (
                            <div className="jm-statistics">
                              <div className="item-s-item">
                                {`${t('durationFull', {
                                  ns: 'tripPage',
                                  days: `${v.statistics?.days}天`,
                                  time: `${formatTimestamp(
                                    Number(v.statistics?.time),
                                    true
                                  )}`,
                                })}`}
                              </div>

                              <div className="item-s-item">
                                {`${v.statistics?.count}次行程 · ${
                                  Math.round(
                                    (v?.statistics?.distance || 0) / 10
                                  ) / 100
                                } km`}
                              </div>

                              <div className="item-s-item">
                                {t('maxSpeed', {
                                  ns: 'tripPage',
                                })}{' '}
                                {(v?.statistics?.maxSpeed?.num || 0) <= 0
                                  ? 0
                                  : Math.round(
                                      ((v?.statistics?.maxSpeed?.num || 0) *
                                        3600) /
                                        100
                                    ) / 10}{' '}
                                km/h
                              </div>
                              <div className="item-s-item">
                                {t('maxAltitude', {
                                  ns: 'tripPage',
                                })}{' '}
                                {(v?.statistics?.maxAltitude?.num || 0) <= 0
                                  ? 0
                                  : Math.round(
                                      (v?.statistics?.maxAltitude?.num || 0) *
                                        10
                                    ) / 10}{' '}
                                m
                              </div>
                              {/* <div className='info-item'>平均时速 10'05</div> */}
                            </div>
                          ) : (
                            ''
                          )}

                          {playVidUrl.url && playVidUrl.tlId === v.id ? (
                            <div className="item-video">
                              <div
                                className="vid"
                                dangerouslySetInnerHTML={{
                                  __html: playVidUrl.url,
                                }}
                              ></div>
                            </div>
                          ) : (
                            ''
                          )}

                          <div className="item-media">
                            <saki-viewer>
                              <div className="item-media-list saki-gallery">
                                {v.media
                                  ?.filter((v) => v.type === 'image')
                                  ?.map((sv, si) => {
                                    return (
                                      <a
                                        className="im-img"
                                        data-src={getSAaSSImageUrl(
                                          sv.url || '',
                                          'big'
                                        )}
                                        data-sub-html={`
                                    <h4>${v.name}</h4>
                                    <p>${shortDesc}</p>
                                  `}
                                        key={si}
                                      >
                                        <img
                                          style={{
                                            display: 'none',
                                          }}
                                          src={getSAaSSImageUrl(
                                            sv.url || '',
                                            'small'
                                          )}
                                          alt="Image 1"
                                        />
                                        <SakiImages
                                          width={
                                            config.deviceWH.w < 450
                                              ? '80px'
                                              : '120px'
                                          }
                                          height={
                                            config.deviceWH.w < 450
                                              ? '80px'
                                              : '120px'
                                          }
                                          objectFit="cover"
                                          borderRadius="10px"
                                          src={getSAaSSImageUrl(
                                            sv.url || '',
                                            'small'
                                          )}
                                        ></SakiImages>
                                      </a>
                                    )
                                  })}
                                {v.media
                                  ?.filter(
                                    (v) =>
                                      v.type === 'onlineVideo' &&
                                      (v.url?.includes('bilibili.com') ||
                                        v.url?.includes('youtube.com'))
                                  )
                                  ?.map((sv, si) => {
                                    // const vUrl =

                                    // const regex = /src=(["'])(.*?)\1/
                                    // const match = sv.url?.match(regex)

                                    // let videoUrl = match?.[2] || ''
                                    // videoUrl =updateIframeSrc(iframe)
                                    // console.log('ooooooooo', match?.[2] || '')

                                    const url = updateIframeSrc(sv?.url || '')

                                    // if (match) {
                                    //   const src = match[2] // 捕获组 2 是 src 的值
                                    //   console.log(src) // 输出：//player.bilibili.com/player.html?isOutside=true&aid=114262756301084&bvid=BV14GZhYEEjU&cid=29181544624&p=1&&autoplay=0
                                    // } else {
                                    //   console.log('No src attribute found')
                                    // }

                                    const isActive =
                                      playVidUrl?.tlId === v?.id &&
                                      playVidUrl?.mediaIndex === si &&
                                      playVidUrl?.url === url

                                    console.log('isActive', isActive)

                                    return (
                                      <div
                                        key={si}
                                        ref={
                                          bindEvent({
                                            click: () => {
                                              setPlayVidUrl(
                                                isActive
                                                  ? {
                                                      tlId: '',
                                                      mediaIndex: -1,
                                                      url: '',
                                                    }
                                                  : {
                                                      tlId: v?.id || '',
                                                      mediaIndex: si,
                                                      url,
                                                    }
                                              )
                                            },
                                          }) as any
                                        }
                                        className={
                                          'item-m-l-vid-item ' +
                                          (isActive ? 'active' : '')
                                        }
                                        style={{
                                          width:
                                            config.deviceWH.w < 450
                                              ? '80px'
                                              : '120px',
                                          height:
                                            config.deviceWH.w < 450
                                              ? '80px'
                                              : '120px',
                                        }}
                                      >
                                        <div className="play-icon">
                                          {isActive ? (
                                            <SakiIcon
                                              type="Close"
                                              color="#fff"
                                              width="38px"
                                              height="38px"
                                            ></SakiIcon>
                                          ) : (
                                            <SakiIcon
                                              type="Play"
                                              color="#fff"
                                              width="38px"
                                              height="38px"
                                            ></SakiIcon>
                                          )}
                                        </div>
                                        <div
                                          className="vid"
                                          dangerouslySetInnerHTML={{
                                            __html: url,
                                          }}
                                        ></div>
                                      </div>
                                    )
                                  })}
                              </div>
                            </saki-viewer>
                            {/* <div className={'gallery' + v.id}>
                          {v.media?.map((sv, si) => {
                            return (
                              <a data-src={sv.url || ''} key={si}>
                                <img src={sv.url || ''} alt='Image 1' />
                              </a>
                            )
                          })}
                        </div> */}

                            {/* <saki-carousel
                          ref={bindEvent(
                            {
                              resizeChange: (e) => {
                                // console.log('carousel', e)
                              },
                              switchIndex: (e) => {
                                console.log('switchIndex', e)

                                carouselNavMap.current[v?.id || '']?.switch(
                                  e.detail
                                )
                              },
                            },
                            (e) => {
                              carouselMap.current[v?.id || ''] = e
                            }
                          )}
                          margin='0 0 6px 0'
                          width='100%'
                          height='250px'
                          border-radius='10px'
                          // autoplay
                          arrows
                          dots
                        >
                          {v.media
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.map((v, i) => {
                              return v.type === 'image' ? (
                                <saki-carousel-item key={i}>
                                  <saki-images
                                    width='100%'
                                    height='100%'
                                    objectFit='cover'
                                    src={getSAaSSImageUrl(v.url || '', 'mid')}
                                  ></saki-images>
                                  ;
                                </saki-carousel-item>
                              ) : (
                                ''
                              )
                            })}
                        </saki-carousel>
                        <saki-carousel-nav
                          ref={bindEvent(
                            {
                              switchIndex: (e) => {
                                console.log('switchIndex selectvalue', e)

                                carouselMap.current[v?.id || ''].switch(
                                  e.detail
                                )
                              },
                            },
                            (e) => {
                              carouselNavMap.current[v?.id || ''] = e
                            }
                          )}
                          margin='0 0 10px 0'
                          width='100%'
                          // height='60px'
                          justify-content='flex-end'
                        >
                          {v.media
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.concat(v.media)
                            ?.map((v, i) => {
                              return v.type === 'image' ? (
                                <saki-carousel-nav-item
                                  border-radius='6px'
                                  width='50px'
                                  height='50px'
                                  key={i}
                                >
                                  <SakiImages
                                    width='100%'
                                    height='100%'
                                    objectFit='cover'
                                    src={getSAaSSImageUrl(
                                      v.url || '',
                                      'small'
                                    )}
                                  ></SakiImages>
                                  ;
                                </saki-carousel-nav-item>
                              ) : (
                                ''
                              )
                            })}
                        </saki-carousel-nav> */}
                          </div>
                          <div className="item-trips">
                            <div
                              className={
                                'item-t-list ' +
                                (loadMoreList.includes(v?.id || '')
                                  ? 'full'
                                  : 'min')
                              }
                            >
                              {v.trips?.map((sv, si) => {
                                return (
                                  <TripListItemComponent
                                    trip={sv}
                                    type={sv.type as any}
                                    onTap={(id) => {
                                      loadModal('TripHistory', () => {
                                        if (!preview) {
                                          dispatch(
                                            layoutSlice.actions.setOpenTripItemModal(
                                              {
                                                visible: true,
                                                id: id || '',
                                              }
                                            )
                                          )
                                          return
                                        }
                                        dispatch(
                                          layoutSlice.actions.setOpenTripHistoryModal(
                                            true
                                          )
                                        )
                                      })
                                    }}
                                    key={si}
                                  />
                                )
                              })}
                            </div>

                            {Number(v.trips?.length) > 2 &&
                            !loadMoreList.includes(v?.id || '') ? (
                              <SakiScrollLoading
                                onTap={() => {
                                  setLoadMoreList(
                                    loadMoreList.concat(v?.id || '')
                                  )
                                }}
                                type="loaded"
                              />
                            ) : (
                              ''
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {jmState.loadTimelineListStatus !== 'noMore' ? (
                  <saki-scroll-loading
                    margin="30px 0"
                    type={jmState.loadTimelineListStatus}
                  ></saki-scroll-loading>
                ) : (
                  ''
                )}
              </>
            )}
          </div>
        ) : jmState.loadTimelineDetailStatus === 'loading' ? (
          <div className="jmd-loading">{t('loadingDetail')}</div>
        ) : (
          <div className="jmd-none">{t('404')}</div>
        )}
      </saki-scroll-view>
    </div>
  )
}

const addOnlineVideo = (mediaList: MediaItem[]) => {
  return new Promise<
    {
      label: string
      value: string
    }[]
  >(async (res, rej) => {
    // let oldPassword = ''
    const multipleInputs: MultipleInput[] = []

    let id = 0
    const addInput = (value: string) => {
      id += 1

      const label = `#${id}Video`

      const input: MultipleInput = {
        label,
        value: `${value}`,
        placeholder: `#${id} ${t('onlineVideo', {
          ns: 'journeyMemoriesModal',
        })}`,
        type: 'Textarea',
        border: '1px solid #eee',
        placeholderAnimation: '',
        padding: '6px 30px 6px 6px',
        borderRadius: '4px',
        closeIcon: true,
        onClear() {
          console.log('clear')
          mp1.removeInput(input.label)
        },
        onChange(value) {
          if (!value) {
            mp1.setInput({
              label,
              type: 'error',
              v: t('cannotBeEmpty', {
                ns: 'prompt',
              }),
            })
            return
          }
          // if (!/^[\s*\S+?]{6,16}$/.test(value.trim())) {
          //   mp1.setInput({
          //     label: 'oldPassword',
          //     type: 'error',
          //     v: t('passwordLengthLimited', {
          //       ns: 'prompt',
          //     }),
          //   })
          //   return
          // }
          input.value = value.trim()
          mp1.setInput({
            label,
            type: 'error',
            v: '',
          })
          return
        },
      }

      mp1.addInput(input)
    }

    const mp1 = multiplePrompts({
      title: t('onlineVideo', {
        ns: 'journeyMemoriesModal',
      }),
      multipleInputs: multipleInputs,
      closeIcon: true,
      flexButton: false,
      buttons: [
        {
          label: 'forgetPassword',
          text: t('addOnlineVideo', {
            ns: 'journeyMemoriesModal',
          }),
          type: 'Normal',
          async onTap() {
            addInput('')
          },
        },
        {
          label: 'Save',
          text: t('save', {
            ns: 'prompt',
          }),
          type: 'Primary',
          async onTap() {
            console.log('multipleInputs', multipleInputs)

            res(
              multipleInputs
                .filter((v) => !!v.value)
                .map((v) => {
                  return {
                    label: v.label,
                    value: v.value || '',
                  }
                })
            )
            mp1.close()
          },
        },
      ],
    })
    mp1.open()

    if (mediaList.length === 0) {
      addInput('')
      return
    }
    mediaList
      .filter((v) => v.type === 'onlineVideo')
      .forEach((v) => {
        addInput(v?.url || '')
      })
  })
}

const AddJourneyMemoriesTimelinePage = () => {
  const { t, i18n } = useTranslation('journeyMemoriesModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)

  const jmState = useSelector((state: RootState) => state.journeyMemory)

  const dispatch = useDispatch<AppDispatch>()

  const [openFilterModal, setOpenFilterModal] = useState(false)
  const [openPositionShareDropdown, setOpenPositionShareDropdown] =
    useState(false)
  const [selectLogo, setSelectLogo] = useState(false)

  // const [filterConfig, setFilterConfig] =
  // 	useState<protoRoot.configure.Configure.Filter.IFilterItem>({
  // 		startDate: '',
  // 		endDate: '',
  // 		selectedVehicleIds: [] as string[],
  // 		selectedTripTypes: [] as string[],
  // 		selectedTripIds: [] as string[],
  // 		shortestDistance: 0,
  // 		longestDistance: 500,
  // 		showCustomTrip: false,
  // 	})

  const [id, setId] = useState('')
  const [logo, setLogo] = useState('')
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [desc, setDesc] = useState('')
  const [tripIds, setTripIds] = useState([] as string[])
  const [media, setMedia] = useState<MediaItem[]>([
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
    // {
    // 	type: 'image',
    // 	url: 'https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg',
    // },
  ])

  const richtextEl = useRef<any>()

  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )
  useEffect(() => {
    if (jmState.pageTypes.includes('EditJMTimeline')) {
      setLoadStatus('loaded')
      setId(jmState.editJMTL.id || '')
      setName(jmState.editJMTL.name || '')
      setNameErr('')
      setDesc(jmState.editJMTL.desc || '')
      richtextEl.current?.setValue(jmState.editJMTL.desc || '')
      setMedia(
        (jmState.editJMTL.media || []).map((v, i) => {
          return {
            ...v,
            id: i + getShortId(9),
          }
        })
      )
      setTripIds(jmState.editJMTL.tripIds || [])
      return
    }
    setId('')
    setLogo('')
    setName('')
    setNameErr('')
    setDesc('')
    richtextEl.current?.setValue('')
    setTripIds([])
    setMedia([])
  }, [jmState.pageTypes])

  const addJMTL = async () => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')

    const mediaList = await uploadFiles(media)

    const params: protoRoot.journeyMemory.AddJMTimeline.IRequest = {
      desc,
      media: mediaList.map((v) => {
        return {
          type: v.type,
          url: v.url,
          width: v.width || 0,
          height: v.height || 0,
        }
      }),
      tripIds,
    }

    const res = await httpApi.v1.AddJMTimeline({
      id: jmState.jmDetail.id,
      name,
      ...params,
    })

    console.log('AddJMTimeline', res.data.journeyMemoryTimeline, params)
    if (res.code === 200 && res.data.journeyMemoryTimeline) {
      setLoadStatus('loaded')
      backPage(-1)

      dispatch(
        setJMState({
          type: 'loadTimelineDetailStatus',
          value: 'loaded',
        })
      )
      dispatch(
        methods.journeyMemory.GetJMTLList({
          id: jmState.jmDetail.id || '',
          pageNum: 1,
        })
      ).unwrap()

      snackbar({
        message: t('createdSuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  const updateJMTL = async () => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')

    const mediaList = await uploadFiles(media)

    const params: protoRoot.journeyMemory.UpdateJMTimeline.IRequest = {
      name,
      desc,
      media: mediaList.map((v) => {
        return {
          type: v.type,
          url: v.url,
          width: v.width || 0,
          height: v.height || 0,
        }
      }),
      tripIds,
    }

    const res = await httpApi.v1.UpdateJMTimeline({
      id: jmState.jmDetail.id,
      timelineId: jmState.editJMTL.id,
      ...params,
    })

    console.log('UpdateJMTimeline', res, params)
    if (res.code === 200) {
      setLoadStatus('loaded')

      dispatch(
        setJMState({
          type: 'loadTimelineDetailStatus',
          value: 'loaded',
        })
      )
      backPage(-1)
      dispatch(
        setJMState({
          type: 'tlList',
          value: sortTlList(
            [
              ...jmState.tlList.map((v) => {
                if (v.id === jmState.editJMTL.id) {
                  return {
                    ...v,
                    ...params,
                  }
                }

                return v
              }),
            ],
            jmState.tlSort
          ),
        })
      )
      // await dispatch(
      // 	journeyMemoryMethods.GetJMList({
      // 		pageNum: 1,
      // 	})
      // ).unwrap()

      snackbar({
        message: t('updatedSuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  const trips = useMemo(() => {
    const trips = trip.tripStatistics?.filter((v) => v.type === 'All')
    // console.log('baseTrips jm', trips)
    return trips[0]?.list || []
  }, [trip.tripStatistics])

  const { disableSelectedTrips } = useMemo(() => {
    const disableSelectedTrips = jmState.tlList.reduce((ids, v) => {
      if (v.id === id) {
        return ids
      }
      return ids.concat(v?.tripIds || [])
    }, [] as string[])

    return { disableSelectedTrips }
  }, [jmState.tlList, id])

  const onlineVideoList = media?.filter((v) => v.type === 'onlineVideo')

  return (
    <div className="add-jmtl-page page-transition">
      <SakiScrollView mode="Custom" scroll-bar="Hidden">
        <div className="av-main">
          {/* {id ? (
					<div className='av-item'>
						<span>{t('id')}</span>
						<span
							style={{
								color: '#999',
							}}
						>
							{id || ''}
						</span>
					</div>
				) : (
					''
				)} */}

          <saki-input
            ref={bindEvent({
              changevalue: (e: any) => {
                // console.log(e)
                setNameErr(
                  !e.detail
                    ? t('cannotBeEmpty', {
                        ns: 'prompt',
                      })
                    : ''
                )
                setName(e.detail)
              },
            })}
            value={name}
            placeholder={t('namePlaceholder')}
            width={'100%'}
            height={'56px'}
            type={'Text'}
            margin="20px 0 0"
            placeholder-animation="MoveUp"
            max-length={30}
            error={nameErr}
            // errorColor={v.errorColor}
            // errorFontSize={v.errorFontSize}
          ></saki-input>

          <saki-richtext
            ref={bindEvent(
              {
                changevalue: (e) => {
                  // console.log('datadata', e.detail.richText)
                  setDesc(e.detail.richText || '')
                },
                submit: () => {},
              },
              (e: any) => {
                richtextEl.current = e
                richtextEl.current?.setToolbar?.({
                  container: [],
                })
              }
            )}
            theme="snow"
            toolbar="false"
            toolbar-padding="0px"
            // max-height='250px'
            min-height="120px"
            width="100%"
            padding="0px"
            margin="16px 0 0"
            font-size="14px"
            min-length="0"
            max-length="10000"
            clear-all-styles-when-pasting
            short-enter="NewLine"
            editor-background-color="rgb(243,243,243)"
            editor-border-radius="10px"
            editor-padding="10px"
            value={desc}
            placeholder={t('descPlaceholder')}
          />

          <div className="av-item">
            <span>
              {t('pageTitle', {
                ns: 'tripHistoryPage',
              })}
            </span>

            <saki-button
              ref={bindEvent({
                tap: () => {
                  setOpenFilterModal(true)
                },
              })}
              margin="20px 0 0"
              padding="10px 10px"
              type="Primary"
            >
              <span>
                {tripIds?.length
                  ? t('selectedTripsCount', {
                      length: tripIds.length,
                    })
                  : t('selectTrips')}
              </span>
            </saki-button>
          </div>
          <FilterComponent
            visible={openFilterModal}
            onclose={() => {
              setOpenFilterModal(false)
            }}
            onLoad={(fc, trips) => {
              console.log('FilterTrips onload', fc, trips)

              setTripIds(trips?.map((v) => v.id || ''))
              // setFilterConfig(fc)
              dispatch(
                setJMState({
                  type: 'filterConfig',
                  value: fc,
                })
              )

              storage.global.setSync('jm-filterConfig', fc)

              setOpenFilterModal(false)
            }}
            dataList
            trips={trips}
            selectTripIds={tripIds || []}
            disableSelectedTrips={disableSelectedTrips}
            selectTypes={jmState.filterConfig?.selectedTripTypes || []}
            distanceRange={{
              min: Number(jmState.filterConfig?.distanceRange?.min) || 0,
              max: Number(jmState.filterConfig?.distanceRange?.max) || 500,
            }}
            date
            startDate={jmState.filterConfig?.startDate || ''}
            endDate={jmState.filterConfig?.endDate || ''}
            selectVehicle
            selectVehicleIds={jmState.filterConfig?.selectedVehicleIds || []}
            customTripSwitch
            showCustomTrip={jmState.filterConfig?.showCustomTrip || false}
          />

          <div className="av-item media">
            <span>{t('cover')}</span>
            <CoverListComponent
              media={media.filter((v) => v.type !== 'onlineVideo')}
              onMedia={(media) => {
                setMedia(media)
              }}
            />
          </div>
          <div className="av-item" style={{}}>
            <div className="av-i-title">
              <span>{t('onlineVideo')}</span>
              <span>{t('onlineVideoDesc')}</span>
            </div>
            <div className="av-i-right">
              <saki-button
                ref={bindEvent({
                  tap: async () => {
                    const res = await addOnlineVideo(onlineVideoList)

                    console.log('addOnlineVideo', res)
                    setMedia(
                      media
                        .filter((v) => v.type !== 'onlineVideo')
                        .concat(
                          res.map((v): MediaItem => {
                            return {
                              type: 'onlineVideo',
                              url: v.value,
                              id: v.label,
                            }
                          })
                        )
                    )
                  },
                })}
                padding="10px 10px"
                type="Primary"
              >
                <span>
                  {onlineVideoList.length
                    ? t('addedOnelineVideoCount', {
                        length: onlineVideoList.length,
                      })
                    : t('addOnlineVideo')}
                </span>
              </saki-button>
            </div>
            {/* <CoverListComponent
              media={media}
              onMedia={(media) => {
                setMedia(media)
              }}
            /> */}
          </div>

          {jmState.pageTypes.includes('EditJM') ? (
            <div className="av-item">
              <span>{t('positionShare')}</span>

              <saki-dropdown
                visible={openPositionShareDropdown}
                floating-direction="Left"
                z-index="1000"
                ref={bindEvent({
                  close: () => {
                    setOpenPositionShareDropdown(false)
                  },
                })}
              >
                <saki-button
                  border="none"
                  bg-hover-color="transparent"
                  bg-active-color="transparent"
                  padding="0px"
                  ref={bindEvent({
                    tap: () => {
                      setOpenPositionShareDropdown(true)
                    },
                  })}
                >
                  <saki-icon
                    width="12px"
                    height="12px"
                    color="#999"
                    margin="0 0 0 6px"
                    type="Bottom"
                  ></saki-icon>
                </saki-button>
                <div slot="main">
                  <saki-menu
                    ref={bindEvent({
                      selectvalue: async (e) => {
                        setOpenPositionShareDropdown(false)
                      },
                    })}
                  >
                    {[5, 1, -1].map((v, i) => {
                      return (
                        <saki-menu-item
                          key={i}
                          // width={dropdownWidth}
                          padding="10px 18px"
                          value={v}
                        ></saki-menu-item>
                      )
                    })}
                  </saki-menu>
                </div>
              </saki-dropdown>
            </div>
          ) : (
            ''
          )}
          <div className="av-item av-buttons">
            <saki-button
              ref={bindEvent({
                tap: () => {
                  if (!id) {
                    addJMTL()
                    return
                  }
                  updateJMTL()
                },
              })}
              margin="20px 0 0"
              padding="10px 10px"
              type="Primary"
              disabled={!name || !tripIds.length}
              loading={loadStatus === 'loading'}
            >
              {jmState.pageTypes.includes('EditJMTimeline')
                ? t('updateMoment')
                : t('addMoment')}
            </saki-button>
          </div>
        </div>
      </SakiScrollView>
    </div>
  )
}

export const CoverListComponent = ({
  media,
  onMedia,
  maxLength = 12,
}: {
  media: MediaItem[]
  onMedia: (media: MediaItem[]) => void
  maxLength?: number
}) => {
  return (
    <saki-drag-sort
      ref={bindEvent({
        dragdone: async (e) => {
          console.log('saki-drag-sort', media, e)

          onMedia(
            (await (e.target as any)?.swapSort?.(
              media,
              e.detail.oldIndex,
              e.detail.newIndex
            )) || []
          )
        },
      })}
      // sort={
      // 	config.deviceType !== 'Mobile' || config.platform === 'Electron'
      // }
      sort={true}
      padding="0px"
    >
      <div
        style={{
          maxWidth:
            media.length >= 2 ? '270px' : (media.length + 1) * 90 + 'px',
        }}
        className={
          'drag-sort av-i-media ' + (media.length >= 2 ? 'grid' : 'flex')
        }
      >
        {media
          // .concat(media)
          // .concat(media)
          // .concat(media)
          .map((v, i) => {
            return (
              <div
                ref={
                  bindEvent({
                    click: () => {
                      alert({
                        title: t('delete', {
                          ns: 'prompt',
                        }),
                        content: t('deleteImage', {
                          ns: 'prompt',
                        }),
                        cancelText: t('cancel', {
                          ns: 'prompt',
                        }),
                        confirmText: t('delete', {
                          ns: 'prompt',
                        }),
                        onCancel() {},
                        async onConfirm() {
                          onMedia(media.filter((_, si) => si !== i))
                        },
                      }).open()
                    },
                  }) as any
                }
                className="media-item"
                key={v.id}
              >
                {v.type === 'image' ? (
                  <SakiImages
                    width="80px"
                    height="80px"
                    objectFit={'cover'}
                    borderRadius="10px"
                    src={getSAaSSImageUrl(v.url || '', 'thumbnail')}
                  ></SakiImages>
                ) : (
                  ''
                )}
              </div>
            )
          })}
        {media.length < maxLength ? (
          <div
            ref={
              bindEvent({
                click: async () => {
                  const files = await selectFiles()

                  if (files?.length) {
                    const tmedia = [...media]

                    for (let i = 0; i < files.length; i++) {
                      if (tmedia.length >= maxLength) {
                        snackbar({
                          message: t('mediaLimitExceeded', {
                            ns: 'prompt',
                          }),
                          autoHideDuration: 2000,
                          vertical: 'top',
                          horizontal: 'center',
                          backgroundColor: 'var(--saki-default-color)',
                          color: '#fff',
                        }).open()
                        break
                      }

                      const info = await images.getExif(files[i])
                      tmedia.push({
                        type: 'image',
                        url: URL.createObjectURL(files[i]),
                        file: files[i],
                        id: getShortId(9),
                        width: info?.ImageWidth || 0,
                        height: info?.ImageHeight || 0,
                      })
                    }

                    onMedia(tmedia)
                  }
                },
              }) as any
            }
            className="media-item disabled-sort"
          >
            <SakiIcon
              color="#999"
              width="24px"
              height="24px"
              type="Add"
            ></SakiIcon>
          </div>
        ) : (
          ''
        )}
      </div>
    </saki-drag-sort>
  )
}

export default JourneyMemoriesModal
