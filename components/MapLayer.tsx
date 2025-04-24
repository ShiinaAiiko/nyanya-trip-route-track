import React, { useEffect, useMemo, useState } from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, { RootState, AppDispatch, methods, layoutSlice } from '../store'
import { useRouter } from 'next/router'

import { sakisso, version } from '../config'

import { alert, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { useTranslation } from 'react-i18next'
import {
  configMethods,
  configSlice,
  getSpeedColorSliderRange,
  maps,
  getTrackSpeedColorRGBs,
  defaultSpeedColorLimit,
  getTrackRouteColor,
  eventListener,
  defaultMapLayerItem,
  TrackSpeedColorType,
  getMapUrlAuto,
} from '../store/config'
import { parseQuery, Query } from '../plugins/methods'
import { storage, storageMethods } from '../store/storage'
import { imageColorInversion } from '@nyanyajs/utils/dist/images/imageColorInversion'

import { getPositionShareText } from './Vehicle'
import { getSpeed } from 'geolib'
import { protoRoot } from '../protos'
import { defaultMapLayerModalFeaturesList, loadModal } from '../store/layout'
import {
  SakiAsideModal,
  SakiButton,
  SakiDropdown,
  SakiIcon,
  SakiTitle,
} from './saki-ui-react/components'
import { getMapThumbnail } from '../store/map'
import NoSSR from './NoSSR'
import { deepCopy } from '@nyanyajs/utils'

const zIndex = 2100

const getMapThumbnailUrl = (mapKey: string, roadColorFadeMap: string[]) => {
  let url = '/images/mapThumbnail/small/'

  if (roadColorFadeMap.includes(mapKey)) {
    url = url + mapKey + 'Fade.jpg'
  } else {
    url = url + mapKey + '.jpg'
  }

  return url
}

export const LayerButtons = ({
  show = true,
  // layer = false,
  // mapUrl = '',
  style = {
    left: '20px',
    bottom: '50px',
  },
  modalConfig = {
    vertical: 'Bottom',
    horizontal: 'Left',
    offsetX: '20px',
    offsetY: '50px',
  },
  mapLayerType,
  featuresList = deepCopy(defaultMapLayerModalFeaturesList),
  mapLayer,
}: {
  show?: boolean
  // layer?: boolean
  // mapUrl?: string
  // roadColorFade?: boolean
  style?: {
    left?: string
    right?: string
    top?: string
    bottom?: string
  }
  modalConfig?: {
    vertical: 'Bottom' | 'Top' | 'Center'
    horizontal: 'Center' | 'Left' | 'Right'
    offsetX: string
    offsetY: string
  }

  mapLayerType: keyof protoRoot.configure.Configure.IMapLayer
  featuresList?: typeof defaultMapLayerModalFeaturesList
  mapLayer?: protoRoot.configure.Configure.MapLayer.IMapLayerItem | null
}) => {
  const { t, i18n } = useTranslation('mapLayerModal')

  const dispatch = useDispatch<AppDispatch>()
  const config = useSelector((state: RootState) => state.config)
  const layout = useSelector((state: RootState) => state.layout)
  // https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z
  //webrd02.is.ptile?x=1629&y=845&z=11&lang=zh_cn&size=1&scale=1&style=8

  // const [isConnection, setIsConnection] = useState(false)
  // const [imgSrc, setImgSrc] = useState('')

  // useEffect(() => {
  //   const init = async () => {
  //     const mapThumbnail = await getMapThumbnail(mapUrl, roadColorFade)

  //     setIsConnection(mapThumbnail.isConnection)
  //     setImgSrc(mapThumbnail.url)
  //   }
  //   init()
  // }, [mapUrl, roadColorFade])

  const { mapLayerConfig, mapUrl } = useMemo(() => {
    const mapLayerConfig = config.configure?.mapLayer?.[mapLayerType]

    const mapUrl = getMapUrlAuto(
      mapLayerConfig?.mapKey || defaultMapLayerItem.mapKey,
      config.country,
      config.connectionOSM
    )

    return {
      mapLayerConfig,
      mapUrl,
      // roadColorFade: mapLayerConfig?.roadColorFade || false,
    }
  }, [mapLayerType, config.configure, config.country, config.connectionOSM])

  useEffect(() => {
    layout.openMapLayerModal.visible &&
      dispatch(
        layoutSlice.actions.setOpenMapLayerModalFeaturesList(featuresList)
      )
  }, [featuresList, layout.openMapLayerModal.visible])

  return (
    <NoSSR>
      <div
        style={{
          ...style,
        }}
        className={
          'layer-buttons ' + config.deviceType + ' ' + (show ? 'show' : 'hide')
        }
      >
        <saki-button
          ref={bindEvent({
            tap: () => {
              mapLayerConfig &&
                loadModal('MapLayer', () => {
                  dispatch(
                    layoutSlice.actions.setOpenMapLayerModal({
                      visible: true,
                      mapLayerType,
                      modalConfig,
                      // mapLayerConfig,
                    })
                  )
                })
              // loadModal('Settings', () => {
              // 	dispatch(layoutSlice.actions.setSettingType('Maps'))
              // 	dispatch(layoutSlice.actions.setOpenSettingsModal(true))
              // })
            },
          })}
          // padding="24px"
          // width="60px"
          // height="60px"
          padding="0"
          // margin="16px 0 0 0"
          // type="CircleIconGrayHover"
          border="none"
          border-radius="10px"
          box-shadow="0 0 10px rgba(0, 0, 0, 0.3)"
        >
          <div className="layer-main">
            <img
              src={
                getMapThumbnailUrl(
                  maps?.filter((v) => v.url === mapUrl)?.[0]?.key ||
                    'AutoSelect',
                  (mapLayer?.roadColorFade &&
                    config.mapRecommend.roadColorFadeMap.map(
                      (v) => v.mapKey
                    )) ||
                    []
                )
                // '/images/mapThumbnail/small/' +
                // (maps?.filter((v) => v.url === mapUrl)?.[0]?.key ||
                //   'AutoSelect') +
                // '.jpg'
                // isConnection
                //   ? imgSrc
                //   : 'https://webrd02.is.autonavi.com/appmaptile?x=1629&y=845&z=11&lang=zh_cn&size=1&scale=1&style=8'
              }
            ></img>
            <div className="layer-button">
              <saki-icon
                color="#fff"
                width={config.deviceType === 'Mobile' ? '14px' : '16px'}
                height={config.deviceType === 'Mobile' ? '14px' : '16px'}
                type="Layer"
              ></saki-icon>
              <span>图层</span>
              {/* <saki-icon color="var(--saki-default-color)" width="28px" height="28px" type="Layer"></saki-icon> */}
            </div>
          </div>
        </saki-button>
      </div>
    </NoSSR>
  )
}

const MapLayerModal = () => {
  const { t, i18n } = useTranslation('mapLayerModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)

  const dispatch = useDispatch<AppDispatch>()
  // const [menuType, setMenuType] = useState('Appearance')
  // const [menuType, setMenuType] = useState(type || 'Account')

  return (
    <SakiAsideModal
      onClose={() => {
        dispatch(
          layoutSlice.actions.setOpenMapLayerModal({
            visible: false,
          })
        )
      }}
      onLoaded={() => {
        eventListener.dispatch('loadModal:MapLayer', true)
      }}
      width="100%"
      height="100%"
      max-width={config.deviceType === 'Mobile' ? '100%' : '360px'}
      max-height={config.deviceType === 'Mobile' ? '70%' : '600px'}
      vertical={
        config.deviceType === 'Mobile'
          ? 'Bottom'
          : layout.openMapLayerModal.modalConfig.vertical
      }
      horizontal={
        config.deviceType === 'Mobile'
          ? 'Center'
          : layout.openMapLayerModal.modalConfig.horizontal
      }
      offset-x={
        config.deviceType === 'Mobile'
          ? '0px'
          : layout.openMapLayerModal.modalConfig.offsetX
      }
      offset-y={
        config.deviceType === 'Mobile'
          ? '0px'
          : layout.openMapLayerModal.modalConfig.offsetY
      }
      mask={config.deviceType === 'Mobile'}
      mask-closable={config.deviceType === 'Mobile'}
      maskBackgroundColor={'rgba(0,0,0,0.3)'}
      border-radius={config.deviceType === 'Mobile' ? '10px 10px 0 0' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      background-color="#fff"
      visible={layout.openMapLayerModal.visible}
      overflow="hidden"
      zIndex={zIndex}
    >
      <div className={'map-layer-modal ' + config.deviceType}>
        <div className="ml-header">
          <saki-modal-header
            border
            back-icon={false}
            close-icon={true}
            right-width={'56px'}
            ref={bindEvent({
              close() {
                dispatch(
                  layoutSlice.actions.setOpenMapLayerModal({
                    visible: false,
                  })
                )
              },
            })}
            title={t('title')}
          />
        </div>
        <div className="settings-main">
          <Maps
            featuresList={layout.openMapLayerModal.featuresList}
            mapLayerType={layout.openMapLayerModal.mapLayerType}
          ></Maps>
        </div>
      </div>
    </SakiAsideModal>
  )
}

const Maps = ({
  mapLayerType,
  featuresList,
}: // mapLayerConfig,
{
  mapLayerType: keyof protoRoot.configure.Configure.IMapLayer
  featuresList: typeof defaultMapLayerModalFeaturesList
  // mapLayerConfig: protoRoot.configure.Configure.MapLayer.IMapLayerItem
}) => {
  const { t, i18n } = useTranslation('mapLayerModal')
  const config = useSelector((state: RootState) => state.config)
  const layout = useSelector((state: RootState) => state.layout)

  const dispatch = useDispatch<AppDispatch>()

  const [openMapUrlDowndrop, setOpenMapUrlDowndrop] = useState(false)
  const [speedColorType, setSpeedColorType] = useState(
    Object.keys(config.configure?.general?.speedColorLimit || {})?.[0]
  )
  const [speedColorLimit, setSpeedColorLimit] = useState(
    config.configure.general?.speedColorLimit
  )

  const speedColorLimitItem = useMemo(() => {
    return (speedColorLimit as any)?.[
      speedColorType
    ] as protoRoot.configure.Configure.SpeedColorLimit.ISpeedColorLimitItem
  }, [speedColorType, speedColorLimit])

  const [openSpeedColorTypeDropdown, setOpenSpeedColorTypeDropdown] =
    useState(false)

  const [openTrackRouteMapUrlDowndrop, setOpenTrackRouteMapUrlDowndrop] =
    useState(false)

  const sliderRange = getSpeedColorSliderRange(speedColorType)

  const [mapLayers, setMapLayers] = useState<
    {
      isConnection: boolean
      mapThumbnailUrl: string
      mapUrl: string
      mapKey: string
    }[]
  >([])

  const [mapDisplayList, setMapDisplayList] = useState<
    {
      type: string
      text: string
      icon: string
      method: string
      value: boolean | string
      showDropdown?: boolean
      dropdownItems?: string[]
    }[]
  >([
    {
      type: 'roadColorFade',
      text: t('roadColorFade', {
        ns: 'settings',
      }),
      icon: 'Road',
      method: 'switch',
      value: true,
    },
    {
      type: 'showAvatarAtCurrentPosition',
      text: t('showAvatarAtCurrentPosition', {
        ns: 'settings',
      }),
      icon: 'UserLine',
      method: 'switch',
      value: false,
    },
    {
      type: 'showSpeedColor',
      text: t('speedColor', {
        ns: 'settings',
      }),
      icon: 'Route',
      method: 'switch',
      value: false,
    },
    {
      type: 'cityName',
      text: t('cityName', {
        ns: 'settings',
      }),
      icon: 'City',
      method: 'switch',
      value: false,
    },
    {
      type: 'cityBoundaries',
      text: t('cityBoundaries', {
        ns: 'settings',
      }),
      icon: 'CityFill',
      method: 'dropdown',
      showDropdown: false,
      dropdownItems: ['noDisplay', 'country', 'state', 'region', 'city'],
      value: '',
    },
    {
      type: 'tripTrackRoute',
      text: t('tripTrackRoute', {
        ns: 'settings',
      }),
      icon: 'TripRoute',
      method: 'switch',
      value: false,
    },
    {
      type: 'speedAnimation',
      text: t('speedAnimation', {
        ns: 'settings',
      }),
      icon: 'StarFill',
      method: 'switch',
      value: false,
    },
    {
      type: 'turnOnVoice',
      text: t('turnOnVoice', {
        ns: 'settings',
      }),
      icon: 'MicroPhoneFill',
      method: 'switch',
      value: false,
    },
    {
      type: 'showPositionMarker',
      text: t('showPositionMarker', {
        ns: 'settings',
      }),
      icon: 'PositionShare',
      method: 'switch',
      value: false,
    },
  ])

  const [hideRoadColorFadeMapTip, setHideRoadColorFadeMapTip] = useState(false)

  useEffect(() => {
    const init = async () => {
      setHideRoadColorFadeMapTip(
        (await storage.global.get('hideRoadColorFadeMapTip')) || false
      )

      const tempMapLayers: typeof mapLayers = []
      for (let i = 0; i < maps.length; i++) {
        const v = maps[i]
        // const mapThumbnail = await getMapThumbnail(v.url, false)

        tempMapLayers.push({
          isConnection: true,
          mapThumbnailUrl: '',
          // isConnection: mapThumbnail.isConnection,
          // mapThumbnailUrl: mapThumbnail.url,
          mapUrl: v.url,
          mapKey: v.key,
        })

        setMapLayers(tempMapLayers)
      }
    }
    init()
  }, [])

  const [mapLayerConfigure, setMapLayerConfigure] =
    useState<protoRoot.configure.Configure.MapLayer.IMapLayerItem>({})

  useEffect(() => {
    const mapLayerConfig = config.configure.mapLayer?.[mapLayerType]

    if (mapLayerConfig) {
      console.log(
        'mapLayerConfig',
        mapLayerType,
        config.configure.mapLayer,
        mapLayerConfig,
        mapDisplayList
      )
      mapDisplayList.forEach((v) => {
        v.value = (mapLayerConfig as any)[v.type]
      })

      setMapLayerConfigure(mapLayerConfig)
    }
  }, [mapLayerType, config.configure])

  const [mapAutoKey, setMapAutoKey] = useState('')

  useEffect(() => {
    const mapUrl = getMapUrlAuto(
      'AutoSelect',
      config.country,
      config.connectionOSM
    )
    setMapAutoKey(
      maps?.filter((v) => v.url === mapUrl)?.[0]?.key || 'AutoSelect'
    )

    // console.log(
    //   'mapLayerConfig',
    //   mapLayerConfigure.mapKey === 'AutoSelect'
    //     ? maps?.filter((v) => v.url === mapUrl)?.[0]?.key || 'AutoSelect'
    //     : 'AutoSelect'
    // )
  }, [config.country, config.connectionOSM])

  const { speedColorRGBs, mapUrl } = useMemo(() => {
    const speedColorRGBs = getTrackSpeedColorRGBs(
      (mapLayerConfigure?.trackSpeedColor as TrackSpeedColorType) ||
        defaultMapLayerItem.trackSpeedColor
    )

    const mapUrl = getMapUrlAuto(
      mapLayerConfigure?.mapKey || defaultMapLayerItem.mapKey,
      config.country,
      config.connectionOSM
    )

    // console.log('mapUrl', mapUrl)

    return { speedColorRGBs, mapUrl }
  }, [mapLayerConfigure, config.country, config.connectionOSM])

  // 私有化配置
  const setConfig = (configure: typeof mapLayerConfigure) => {
    if (!mapLayerConfigure?.mapKey) return

    const tempConfigure = {
      ...config.configure,
      mapLayer: {
        ...config.configure.mapLayer,
      },
    }

    console.log('setConfig', configure, mapLayerType, tempConfigure)
    if (tempConfigure.mapLayer?.[mapLayerType]) {
      tempConfigure.mapLayer[mapLayerType] = {
        ...tempConfigure.mapLayer[mapLayerType],
        ...configure,
      }
    }

    setMapLayerConfigure({
      ...configure,
    })
    dispatch(methods.config.SetConfigure(tempConfigure))
  }

  // // 全局配置
  // useEffect(() => {
  // }, [speedColorLimit])

  return (
    <div
      style={{
        // display: show ? 'block' : 'none',
        height: '100%',
      }}
      className="map-layer-setting-maps scrollBarHover"
    >
      {featuresList.mapLayer ? (
        <>
          <SakiTitle margin="0 0 6px 0" color="default" level={5}>
            <span>
              {t('basemap', {
                ns: 'settings',
              })}
            </span>
          </SakiTitle>

          {new Array(Math.ceil(mapLayers.length / 4)).fill(0).map((_, i) => {
            console.log('mapLayers', i)
            const subLayers = mapLayers.slice(i * 4, (i + 1) * 4)
            if (subLayers.length < 4) {
              for (let i = 0; i <= 4 - subLayers.length; i++) {
                subLayers.push({
                  mapKey: 'none',
                  mapUrl: 'none',
                  mapThumbnailUrl: 'none',
                  isConnection: false,
                })
              }
            }
            return (
              <div
                className={
                  'sm-map-layer ' +
                  (Math.ceil(mapLayers.length / 4) === i + 1 ? 'last' : '')
                }
                key={i}
              >
                {subLayers.map((v, i) => {
                  return v.mapKey !== 'none' ? (
                    <SakiButton
                      // ref={
                      //   bindEvent({
                      //     tap: () => {
                      //       // loadModal('MapLayer', () => {
                      //       //   dispatch(layoutSlice.actions.setOpenMapLayerModal(true))
                      //       // })
                      //     },
                      //   }) as any
                      // }
                      onTap={() => {
                        setConfig({
                          ...mapLayerConfigure,
                          mapKey: v.mapKey,
                        })
                      }}
                      // padding="24px"
                      width="50px"
                      margin="0 0 0 0"
                      // type="CircleIconGrayHover"
                      bgHoverColor="none"
                      bgActiveColor="none"
                      border="none"
                      border-radius="10px"
                      key={i}
                    >
                      <div
                        className={
                          'layer-main ' +
                          ' ' +
                          (mapLayerConfigure.mapKey === v.mapKey
                            ? 'active'
                            : '')
                        }
                      >
                        <img
                          src={
                            '/images/mapThumbnail/small/' +
                            (v.mapKey === 'AutoSelect'
                              ? mapAutoKey
                              : v.mapKey) +
                            '.jpg'
                            // v.isConnection
                            //   ? v.mapThumbnailUrl
                            //   : 'https://webrd02.is.autonavi.com/appmaptile?x=1629&y=845&z=11&lang=zh_cn&size=1&scale=1&style=8'
                          }
                        ></img>
                        <div className="layer-button text-two-elipsis">
                          {/* <saki-icon color="#fff" width="16px" height="16px" type="Layer"></saki-icon> */}
                          <span>
                            {/* {v.mapKey} */}
                            {t(v.mapKey, {
                              ns: 'settings',
                            })}
                          </span>
                          {/* <saki-icon color="var(--saki-default-color)" width="28px" height="28px" type="Layer"></saki-icon> */}
                        </div>
                      </div>
                    </SakiButton>
                  ) : (
                    <div
                      style={{
                        width: '50px',
                      }}
                    ></div>
                  )
                })}
              </div>
            )
          })}
        </>
      ) : (
        ''
      )}

      {featuresList.mapMode ? (
        <>
          <SakiTitle margin="16px 0 10px 0" color="default" level={5}>
            <span>
              {t('appearanceSettings', {
                ns: 'settings',
              })}
            </span>
          </SakiTitle>

          <div className="sm-segmented">
            <saki-segmented
              ref={bindEvent({
                changevalue: (e) => {
                  // console.log('SetConfigure segmented', e)

                  setConfig({
                    ...mapLayerConfigure,
                    mapMode: e.detail,
                  })
                },
              })}
              width="100%"
              height="34px"
              border-radius="17px"
              margin="0px 0 0"
              value={mapLayerConfigure.mapMode || 'Normal'}
              // value={config.configure.baseMap?.mapMode || 'Normal'}
              bg-color="#eee"
            >
              {['Normal', 'Gray', 'Dark', 'Black'].map((v, i) => {
                return (
                  <saki-segmented-item padding="2px 14px" value={v} key={i}>
                    <span>
                      {t(v.toLowerCase() + 'Mode', {
                        ns: 'settings',
                      })}
                    </span>
                  </saki-segmented-item>
                )
              })}
            </saki-segmented>
          </div>
        </>
      ) : (
        ''
      )}

      <SakiTitle margin="20px 0 10px 0" color="default" level={5}>
        <span>
          {t('mapDisplay', {
            ns: 'settings',
          })}
        </span>
      </SakiTitle>

      <div className="sm-map-display">
        {mapDisplayList
          ?.filter((v) => (featuresList as any)[v.type])
          ?.map((v) => {
            return (
              <div
                key={v.type}
                ref={
                  bindEvent({
                    click: () => {
                      // console.log('setConfig', v.type, v.value)

                      if (v.method === 'switch') {
                        const tempMapDisplayList = mapDisplayList.map((sv) => {
                          return {
                            ...sv,
                            value:
                              sv.type === v.type && sv.method === 'switch'
                                ? !sv.value
                                : sv.value,
                          }
                        })
                        // console.log('setConfig', tempMapDisplayList)
                        const tempConfig = {
                          ...mapLayerConfigure,
                        }
                        tempMapDisplayList.forEach((v) => {
                          ;(tempConfig as any)[v.type] = v.value
                        })

                        setMapDisplayList(tempMapDisplayList)
                        setConfig(tempConfig)
                      }
                      if (v.method === 'dropdown') {
                        setMapDisplayList(
                          mapDisplayList.map((sv) => {
                            return {
                              ...sv,
                              showDropdown:
                                sv.type === v.type && sv.method === 'dropdown'
                                  ? true
                                  : sv.showDropdown,
                            }
                          })
                        )
                      }
                    },
                  }) as any
                }
                className={'map-display-item ' + (v.value ? 'active' : '')}
              >
                <div className="mdi-icon">
                  <SakiIcon
                    type={v.icon as any}
                    color={v.value ? '#fff' : '#999'}
                  ></SakiIcon>
                </div>
                <div className="mdi-name text-two-elipsis">
                  {v.method === 'switch' ? (
                    <span>{v.text}</span>
                  ) : (
                    <saki-dropdown
                      visible={v.showDropdown}
                      floating-direction="Left"
                      z-index={zIndex + 10}
                      ref={bindEvent({
                        close: () => {
                          setMapDisplayList(
                            mapDisplayList.map((sv) => {
                              return {
                                ...sv,
                                showDropdown:
                                  sv.type === v.type && sv.method === 'dropdown'
                                    ? false
                                    : sv.showDropdown,
                              }
                            })
                          )
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
                            setMapDisplayList(
                              mapDisplayList.map((sv) => {
                                return {
                                  ...sv,
                                  showDropdown:
                                    sv.type === v.type &&
                                    sv.method === 'dropdown'
                                      ? true
                                      : sv.showDropdown,
                                }
                              })
                            )
                          },
                        })}
                      >
                        <span className="name">
                          {v.type === 'cityBoundaries' && v.value
                            ? t(String(v.value), {
                                ns: 'visitedCitiesModal',
                              })
                            : v.text}
                        </span>
                        <saki-icon
                          width="8px"
                          height="8px"
                          color={v.value ? 'var(--saki-default-color)' : '#999'}
                          margin="0 0 0 2px"
                          type="Bottom"
                        ></saki-icon>
                      </saki-button>
                      <div slot="main">
                        <saki-menu
                          ref={bindEvent({
                            selectvalue: async (e) => {
                              console.log(e.detail.value)

                              const tempMapDisplayList = mapDisplayList.map(
                                (sv) => {
                                  return {
                                    ...sv,
                                    showDropdown:
                                      sv.type === v.type &&
                                      sv.method === 'dropdown'
                                        ? false
                                        : sv.showDropdown,
                                    value:
                                      sv.type === v.type &&
                                      sv.method === 'dropdown'
                                        ? e.detail.value === 'noDisplay'
                                          ? ''
                                          : e.detail.value
                                        : sv.value,
                                  }
                                }
                              )
                              // console.log('setConfig', tempMapDisplayList)
                              const tempConfig = {
                                ...mapLayerConfigure,
                              }
                              tempMapDisplayList.forEach((v) => {
                                ;(tempConfig as any)[v.type] = v.value
                              })

                              setMapDisplayList(tempMapDisplayList)
                              setConfig(tempConfig)
                            },
                          })}
                        >
                          {v.dropdownItems?.map((v, i) => {
                            return (
                              <saki-menu-item
                                key={i}
                                // width={dropdownWidth}
                                padding="10px 18px"
                                value={v}
                              >
                                <div className="note-item">
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      color: '#666',
                                    }}
                                    className="text-elipsis"
                                  >
                                    {t(v, {
                                      ns: 'visitedCitiesModal',
                                    })}
                                  </span>
                                </div>
                              </saki-menu-item>
                            )
                          })}
                        </saki-menu>
                      </div>
                    </saki-dropdown>
                  )}
                </div>
              </div>
            )
          })}
      </div>
      {!hideRoadColorFadeMapTip &&
      mapDisplayList.filter((v) => v.type === 'roadColorFade')?.[0]?.value ? (
        <div className="sm-tip">
          <span>
            *{' '}
            {t('roadColorFadeTip', {
              ns: 'settings',
              maps: config.mapRecommend.roadColorFadeMap
                .map((v, i) => {
                  return (
                    t(v.mapKey, {
                      ns: 'settings',
                    }) +
                    (i === config.mapRecommend.roadColorFadeMap.length - 1
                      ? config.lang === 'en-US'
                        ? ','
                        : ''
                      : ',')
                  )
                })
                .join(' '),
            })}
          </span>
          <SakiButton
            onTap={() => {
              alert({
                title: t('doNotShowAgainTitle', {
                  ns: 'prompt',
                }),
                content: t('doNotShowAgainContent', {
                  ns: 'prompt',
                }),
                cancelText: t('cancel', {
                  ns: 'prompt',
                }),
                confirmText: t('confirm', {
                  ns: 'prompt',
                }),
                onCancel() {},
                async onConfirm() {
                  setHideRoadColorFadeMapTip(true)

                  await storage.global.set('hideRoadColorFadeMapTip', true)
                },
              }).open()
            }}
            width="20px"
            height="20px"
            type="CircleIconGrayHover"
          >
            <SakiIcon
              color="#aaa"
              width="12px"
              height="12px"
              type="Close"
            ></SakiIcon>
          </SakiButton>
        </div>
      ) : (
        ''
      )}

      {featuresList.trackSpeedColor ? (
        <>
          <SakiTitle margin="20px 0 10px 0" color="default" level={5}>
            <span>
              {t('trackSpeed​Color', {
                ns: 'settings',
              })}
            </span>
          </SakiTitle>

          <div className="sm-item sm-track-speed-color">
            <saki-checkbox
              ref={bindEvent({
                async selectvalue(e) {
                  // dispatch(
                  //   methods.config.SetConfigure({
                  //     ...config.configure,
                  //     trackSpeedColor: e.detail.value,
                  //   })
                  // )
                  setConfig({
                    ...mapLayerConfigure,
                    trackSpeedColor: e.detail.value,
                  })
                },
              })}
              value={mapLayerConfigure.trackSpeedColor || 'RedGreen'}
              flex-direction="Column"
              type="Radio"
            >
              {['RedGreen', 'PinkBlue'].map((v, i) => {
                const rgbs = getTrackSpeedColorRGBs(v as any)
                return (
                  <saki-checkbox-item key={i} margin="6px 8px 6px 0" value={v}>
                    <saki-row
                      justify-content="space-between"
                      align-items="center"
                      margin="0 0 0 2px"
                    >
                      <span className="sm-sc-name">
                        {t(v, {
                          ns: 'settings',
                        })}
                      </span>
                      <div className="sm-sc-color">
                        <div
                          style={{
                            background: `linear-gradient(45deg, ${rgbs[0]},${
                              rgbs[rgbs.length - 1]
                            })`,
                          }}
                          className="sm-sc-line"
                        ></div>
                      </div>
                    </saki-row>
                  </saki-checkbox-item>
                )
              })}
            </saki-checkbox>
          </div>
        </>
      ) : (
        ''
      )}

      {featuresList.trackRouteColor ? (
        <>
          <SakiTitle margin="20px 0 10px 0" color="default" level={5}>
            <span>
              {t('trackRouteColor', {
                ns: 'settings',
              })}
            </span>
          </SakiTitle>
          <div className="sm-item sm-track-speed-color">
            <saki-checkbox
              ref={bindEvent({
                async selectvalue(e) {
                  setConfig({
                    ...mapLayerConfigure,
                    trackRouteColor: e.detail.value,
                  })
                },
              })}
              value={mapLayerConfigure.trackRouteColor || 'Red'}
              flex-direction="Column"
              type="Radio"
            >
              {['Red', 'Blue', 'Pink'].map((v, i) => {
                return (
                  <saki-checkbox-item key={i} margin="6px 8px 6px 0" value={v}>
                    <saki-row
                      justify-content="space-between"
                      align-items="center"
                      margin="0 0 0 2px"
                    >
                      <span className="sm-sc-name">
                        {t(v.toLowerCase(), {
                          ns: 'settings',
                        })}
                      </span>
                      <div className="sm-sc-color">
                        <div
                          style={{
                            backgroundColor: getTrackRouteColor(
                              v as any,
                              false
                            ),
                          }}
                          className="sm-sc-line"
                        ></div>
                      </div>
                    </saki-row>
                  </saki-checkbox-item>
                )
              })}
            </saki-checkbox>
          </div>
        </>
      ) : (
        ''
      )}

      {featuresList.polylineWidth ? (
        <>
          <SakiTitle margin="20px 0 10px 0" color="default" level={5}>
            <span>
              {t('tripTrackWidth', {
                ns: 'settings',
              })}
            </span>
          </SakiTitle>

          <div className="sm-track-width">
            <span className="sm-tw-name">
              {t('tripTrackWidth', {
                ns: 'settings',
              })}
            </span>
            <saki-input
              ref={bindEvent({
                changevalue: (v) => {
                  setConfig({
                    ...mapLayerConfigure,
                    polylineWidth: Number(v.detail) || 4,
                  })
                },
              })}
              style={{
                flex: '1',
              }}
              width="100%"
              type="Range"
              value={mapLayerConfigure.polylineWidth}
              min="1"
              max="10"
            ></saki-input>
            <span className="sm-tw-num">
              {Number(mapLayerConfigure.polylineWidth) || 0}px
            </span>
          </div>
        </>
      ) : (
        ''
      )}

      {/* <div className="sm-track-width">
        <span className="sm-tw-name">
          {t('historyTripTrack', {
            ns: 'settings',
          })}
        </span>
        <saki-input
          ref={bindEvent({
            changevalue: (v) => {
              dispatch(
                methods.config.SetConfigure({
                  ...config.configure,
                  polylineWidth: {
                    ...config.configure.polylineWidth,
                    historyTripTrack: Number(v.detail) || 1,
                  },
                })
              )
            },
          })}
          style={{
            flex: '1',
          }}
          width="100%"
          type="Range"
          value={config.configure.polylineWidth?.historyTripTrack}
          min="1"
          max="10"
        ></saki-input>
        <span className="sm-tw-num">
          {Number(config.configure.polylineWidth?.historyTripTrack) || 0}
          px
        </span>
      </div>

      <div className="sm-track-width">
        <span className="sm-tw-name">
          {t('historyTripTrackSelectedTrip', {
            ns: 'settings',
          })}
        </span>
        <saki-input
          ref={bindEvent({
            changevalue: (v) => {
              dispatch(
                methods.config.SetConfigure({
                  ...config.configure,
                  polylineWidth: {
                    ...config.configure.polylineWidth,
                    historyTripTrackSelectedTrip: Number(v.detail) || 2,
                  },
                })
              )
            },
          })}
          style={{
            flex: '1',
          }}
          width="100%"
          type="Range"
          value={config.configure.polylineWidth?.historyTripTrackSelectedTrip}
          min="1"
          max="10"
        ></saki-input>
        <span className="sm-tw-num">
          {Number(
            config.configure.polylineWidth?.historyTripTrackSelectedTrip
          ) || 0}
          px
        </span>
      </div>

      <div className="sm-track-width">
        <span className="sm-tw-name">
          {t('reviewTrip', {
            ns: 'settings',
          })}
        </span>
        <saki-input
          ref={bindEvent({
            changevalue: (v) => {
              dispatch(
                methods.config.SetConfigure({
                  ...config.configure,
                  polylineWidth: {
                    ...config.configure.polylineWidth,
                    reviewTrip: Number(v.detail) || 6,
                  },
                })
              )
            },
          })}
          style={{
            flex: '1',
          }}
          width="100%"
          type="Range"
          value={config.configure.polylineWidth?.reviewTrip}
          min="1"
          max="10"
        ></saki-input>
        <span className="sm-tw-num">
          {Number(config.configure.polylineWidth?.reviewTrip) || 0}px
        </span>
      </div> */}

      {featuresList.speedColorLimit ? (
        <>
          <SakiTitle margin="20px 0 10px 0" color="default" level={5}>
            <span>
              {t('speedColorLimit', {
                ns: 'tripPage',
              })}
            </span>
            <span
              style={{
                color: '#aaa',
                fontSize: '10px',
                margin: '0px 0 0 10px',
                fontStyle: 'italic',
                // transform: 'translate(0,2px)',
              }}
            >
              全局
            </span>
          </SakiTitle>

          <div className="sm-speed-color-range">
            <div className="sm-sc-type">
              <span>
                {t('type', {
                  ns: 'tripPage',
                })}
              </span>
              <saki-dropdown
                visible={openSpeedColorTypeDropdown}
                floating-direction="Left"
                z-index={zIndex + 10}
                ref={bindEvent({
                  close: () => {
                    setOpenSpeedColorTypeDropdown(false)
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
                      setOpenSpeedColorTypeDropdown(true)
                    },
                  })}
                >
                  <span
                    style={{
                      color: '#666',
                    }}
                    className="name"
                  >
                    {t(speedColorType, {
                      ns: 'tripPage',
                    })}
                  </span>
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
                        setSpeedColorType(e.detail.value)
                        setOpenSpeedColorTypeDropdown(false)
                      },
                    })}
                  >
                    {Object.keys(
                      config.configure?.general?.speedColorLimit || {}
                    ).map((v, i) => {
                      return (
                        <saki-menu-item
                          key={i}
                          padding="10px 18px"
                          value={v}
                          active={speedColorType === v}
                        >
                          <div className="note-item">
                            <span className="text-elipsis">
                              {t(v, {
                                ns: 'tripPage',
                              })}
                            </span>
                          </div>
                        </saki-menu-item>
                      )
                    })}
                  </saki-menu>
                </div>
              </saki-dropdown>
            </div>

            <div className="sm-sc-speed">
              <span>
                {t('minSpeed', {
                  ns: 'tripPage',
                }) +
                  ' ' +
                  Math.round(
                    (config.configure?.general?.speedColorLimit as any)?.[
                      speedColorType
                    ].minSpeed * 3.6
                  )}
                km/h
              </span>
              <span>
                {t('maxSpeed', {
                  ns: 'tripPage',
                }) +
                  ' ' +
                  Math.round(
                    (config.configure?.general?.speedColorLimit as any)?.[
                      speedColorType
                    ].maxSpeed * 3.6
                  )}
                km/h
              </span>
            </div>

            <div className="sm-sc-range">
              <saki-slider
                ref={bindEvent({
                  changevalue(e) {
                    // console.log('onChangevalue', e)

                    if (e.detail?.length === 2) {
                      const obj: any = {
                        ...config.configure?.general?.speedColorLimit,
                      }
                      obj[speedColorType] = {
                        minSpeed:
                          e.detail?.[0] / 3.6 || speedColorLimitItem.minSpeed,
                        maxSpeed:
                          e.detail?.[1] / 3.6 || speedColorLimitItem.maxSpeed,
                      }

                      console.log('SetConfigure slider', e)

                      setSpeedColorLimit(obj)

                      dispatch(
                        methods.config.SetConfigure({
                          ...config.configure,
                          general: {
                            ...config.configure.general,
                            speedColorLimit: obj,
                          },
                        })
                      )
                      // dispatch(
                      //   methods.config.SetConfigure({
                      //     ...config.configure,
                      //     speedColorLimit: obj,
                      //   })
                      // )
                    }
                  },
                })}
                min={sliderRange[0]}
                max={sliderRange[1]}
                value={[
                  Math.round((speedColorLimitItem.minSpeed || 0) * 3.6 * 100) /
                    100,
                  Math.round((speedColorLimitItem.maxSpeed || 0) * 3.6 * 100) /
                    100,
                ].join(';')}
                bg-color="rgb(243,243,243)"
                bg-hover-color="#eee"
                track-color={[
                  `linear-gradient(45deg, ${speedColorRGBs[0]},${
                    speedColorRGBs[speedColorRGBs.length - 1]
                  })`,
                ].join(';')}
                marks={[
                  {
                    val: sliderRange[0],
                    text: sliderRange[0] + 'km/h',
                    style: {
                      color: 'var(--saki-default-color)',
                      fontSize: '12px',
                      margin: '-4px 0 0',
                      // fontWeight: 700,
                    },
                  },
                  {
                    val:
                      Math.round(
                        defaultSpeedColorLimit[speedColorType].minSpeed *
                          3.6 *
                          100
                      ) / 100,
                    // text: speedColorLimit.minSpeed * 3.6 + 'km/h',
                    style: {
                      color: 'var(--saki-default-color)',
                      fontSize: '12px',
                      margin: '-4px 0 0',
                      // fontWeight: 700,
                    },
                  },
                  {
                    val:
                      Math.round(
                        defaultSpeedColorLimit[speedColorType].maxSpeed *
                          3.6 *
                          100
                      ) / 100,
                    // text: speedColorLimit.maxSpeed * 3.6 + 'km/h',
                    style: {
                      color: 'var(--saki-default-color)',
                      fontSize: '12px',
                      margin: '-4px 0 0',
                      // fontWeight: 700,
                    },
                  },
                  {
                    val: sliderRange[1],
                    text: sliderRange[1] + 'm/h',
                    style: {
                      color: 'var(--saki-default-color)',
                      fontSize: '12px',
                      margin: '-4px 0 0',
                      // fontWeight: 700,
                    },
                  },
                ]
                  .map((v) => JSON.stringify(v))
                  .join(';')}
                tool-tip={true}
                disabled={false}
                width={'100%'}
                max-width={'100%'}
                height={'12px'}
                font-size="12px"
                margin="10px 0 16px"
                border-radius="6px"
              ></saki-slider>
            </div>
          </div>
        </>
      ) : (
        ''
      )}
    </div>
  )
}

export default MapLayerModal
