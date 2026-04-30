import { useTranslation } from 'react-i18next'
import { protoRoot } from '../../protos'
import { useSelector } from 'react-redux'
import {
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  CityInfo,
  convertCityLevelToTypeString,
  createCityMarker,
  deleteAllCityMarker,
  filterGridPoints,
  levelMap,
  regeo,
} from '../../store/city'
import {
  AppDispatch,
  layoutSlice,
  methods,
  reducer,
  RootState,
} from '../../store'
import { httpApi } from '../../plugins/http/api'
import { AsyncQueue, Debounce, deepCopy, getShortId } from '@nyanyajs/utils'

import { alert, bindEvent, multiplePrompts, snackbar } from '@saki-ui/core'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import axios from 'axios'
import moment from 'moment'
import {
  copyOrOpenAlert,
  copyText,
  formatDurationI18n,
  getLatLng,
  getLatLngGcj02ToWgs84,
  getZoom,
  isRoadColorFade,
  normalizeLeafletCoordinates,
  parseQuery,
  Query,
  roadColorFade,
  stripHtmlTags,
  toFixed,
} from '../../plugins/methods'
import {
  DataContext,
  initValue,
  TimelineDaysItem,
} from '../../components/Roadbook/Context'

import * as Leaflet from 'leaflet'
import {
  clearLayer,
  removeLayer,
  renderPolyline,
  renderPolylineItem,
} from '../../store/map'
import {
  createMyPositionMarker,
  createWaypointMarker,
} from '../../store/position'
import {
  changeLanguage,
  defaultLanguage,
  languages,
} from '../../plugins/i18n/i18n'
import { getLayout } from '../../layouts/Trip'
import { LayerButtons } from '../../components/MapLayer'
import { SakiTransitionRender } from '../../components/SakiTransitionRender'
import { RoadBookDetailPage } from '../../components/Roadbook/Detail'
import { AddRoadBookPage } from '../../components/Roadbook/Add'
import NoSSR from '../../components/NoSSR'
import {
  SakiAvatar,
  SakiButton,
  SakiIcon,
  SakiMenuItem,
  SakiScrollLoading,
  SakiScrollView,
  SakiTitle,
} from '../../components/saki-ui-react/components'
import Head from 'next/head'
import {
  eventListener,
  getMapLayer,
  getTrackRouteColor,
} from '../../store/config'
import { createDistanceScaleControl } from '../../plugins/map'
import { RoadbookHistoryVersionItem, storage } from '../../store/storage'
import ButtonsComponent from '../../components/Buttons'

const RoadBookPage = () => {
  const { t, i18n } = useTranslation('roadBookPage')
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)

  const dispatch = useDispatch<AppDispatch>()

  const [state, setState] = useReducer(reducer<typeof initValue>, initValue)

  const router = useRouter()

  const [mounted, setMounted] = useState(false)

  const [loadedMap, setLoadedMap] = useState(false)
  const map = useRef<Leaflet.Map>()
  const marker = useRef<Leaflet.Marker<any>>()
  const layer = useRef<any>()

  const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
    mapLayer: true,
    mapMode: true,
    roadColorFade: true,
    showAvatarAtCurrentPosition: true,
    showSpeedColor: false,
    cityName: true,
    cityBoundaries: false,
    tripTrackRoute: false,
    speedAnimation: false,
    turnOnVoice: false,
    showPositionMarker: true,
    trackSpeedColor: false,
    trackRouteColor: true,
    polylineWidth: true,
    speedColorLimit: false,
    headingUp: false,
  })

  const { speedColorRGBs, mapLayer, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('roadbookPage')

    // console.log('speedColorRGBs', ml)
    return ml
  }, [
    config.configure,
    config.country,
    config.connectionOSM,
    config.initConfigure,
  ])

  // const [pageTypes, setPageTypes] = useState<
  //   ('Add' | 'List' | 'Detail' | 'Edit' | '')[]
  // >(['List'])
  // const [headerTitle, setHeaderTitle] = useState('')
  // const [headerSubtitle, setHeaderSubtitle] = useState('')
  // const [pageTitle, setPageTitle] = useState('')

  const [showDetailMoreDP, setShowDetailMoreDP] = useState(false)
  const [showVersionHistoryDP, setShowVersionHistoryDP] = useState(false)
  const [activeRIdDropdown, setActiveRIdDropdown] = useState('')
  const refreshMapSizeDebounce = useRef(new Debounce())

  useEffect(() => {
    dispatch(layoutSlice.actions.setLayoutHeaderLogoText(t('pageTitle')))
  }, [config.lang])

  useEffect(() => {
    console.log('GetRoadbookList setMounted')
    setMounted(true)

    dispatch(layoutSlice.actions.setLayoutHeaderFixed(true))
    const init = async () => {
      eventListener.on('roadbook:ResetMap', () => {
        setLoadedMap(false)
      })

      window.addEventListener('resize', () => {
        refreshMapSizeDebounce.current.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      })
    }
    init()
  }, [])

  useEffect(() => {
    dispatch(layoutSlice.actions.setBottomNavigator(!state.fullScreen))
    dispatch(layoutSlice.actions.setLayoutHeader(!state.fullScreen))
  }, [state.fullScreen])

  useEffect(() => {
    refreshMapSizeDebounce.current.increase(() => {
      map.current?.invalidateSize(true)
    }, 400)
  }, [config.deviceWH.w, config.deviceWH.h, state.fullScreen, state.fullMap])

  state.backPage = () => {
    const nextPage = state.pageTypes.slice(0, state.pageTypes.length - 1)
    setState({
      pageTypes: nextPage?.length === 0 ? ['List'] : nextPage,
      fullMap: nextPage[nextPage.length - 1] === 'List' ? false : state.fullMap,
    })

    if (lastPageType === 'Detail' || nextPage[nextPage.length - 1] === 'List') {
      router.push(
        Query(router.asPath.split('?')[0], {
          ...parseQuery(router.asPath),
          id: '',
        })
      )
    }
  }

  useEffect(() => {
    if (config.deviceType === 'Mobile') {
      setState({
        fullMap: !!state.selectedTimelineId,
      })
    }
  }, [state.selectedTimelineId, config.deviceType])

  state.deleteRoadbook = async (id: string) => {
    alert({
      title: t('deleteRoadBook', {
        ns: 'roadBookPage',
      }),
      content: t('deleteRoadBookContent', {
        ns: 'roadBookPage',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('delete', {
        ns: 'prompt',
      }),
      onCancel() {},
      async onConfirm() {
        const res = await httpApi.v1.DeleteRoadbook({
          id,
        })
        if (res.code === 200) {
          setState({
            list: state.list?.filter((v) => v.id !== id),
          })
          state.backPage()

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
          return
        }
        snackbar({
          message: res.msg + ';' + res.error,
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
        }).open()
      },
    }).open()
  }

  state.share = (roadbookItem: protoRoot.roadbook.IRoadbookItem) => {
    const url = `${location.origin}/${
      router.query?.lang ? router.query?.lang + '/' : ''
    }roadbook?id=${roadbookItem.id || ''}`
    const copyText = `${roadbookItem.title}
${url}`

    if (roadbookItem.permissions?.allowShare) {
      copyOrOpenAlert(copyText, url)
      return
    }

    alert({
      title: t('allowShare', {
        ns: 'roadBookPage',
      }),
      content: t('allowShareContent', {
        ns: 'roadBookPage',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('share', {
        ns: 'prompt',
      }),
      onCancel() {},
      async onConfirm() {
        const res = await httpApi.v1.UpdateRoadbook({
          ...roadbookItem,
          permissions: {
            ...roadbookItem?.permissions,
            allowShare: true,
          },
        })

        if (res.code === 200) {
          copyOrOpenAlert(copyText, url)
          return
        }
        snackbar({
          message: res.msg + ';' + res.error,
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
        }).open()
      },
    }).open()
  }

  const updateRoadbookD = useRef(new Debounce())

  state.updateRoadbook = () => {
    updateRoadbookD.current.increase(async () => {
      const { roadBookItem, loadStatus, setLoadStatus } = {
        roadBookItem: state.roadBookItem,
        loadStatus: state.loadDetailStatus,
        setLoadStatus: (v: typeof state.loadDetailStatus) => {
          setState({
            loadDetailStatus: v,
          })
        },
      }

      if (state.historyVersion.selectedVersion >= 0) {
        snackbar({
          message: t('needsSaveBeforeUpdate', {}),
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
        }).open()
        return
      }
      if (loadStatus === 'loading' || loadStatus === 'noMore') {
        return
      }

      setLoadStatus('loading')
      const res = await httpApi.v1.UpdateRoadbook({
        id: roadBookItem?.id,
        title: roadBookItem?.title || '',
        desc: roadBookItem?.desc || '',
        startTime: roadBookItem?.startTime,
        timelines: roadBookItem?.timelines,
        permissions: roadBookItem?.permissions,
      })
      console.log('GetRoadbookDetail res', res)

      setLoadStatus('loaded')

      if (res.code === 200) {
        state.historyVersion.save(roadBookItem)
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

        return
      }

      snackbar({
        message: res.msg + ';' + res.error,
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
      }).open()
    }, 1000)
  }

  state.openPopup = (tlId: string, wId: string) => {
    console.log('openPopup', tlId, wId)

    state.roadBookItem?.timelines?.forEach((v) => {
      if (v.id === tlId) {
        v.waypoints?.forEach((sv) => {
          if (sv.id === wId) {
            map.current?.setView(
              // [29.886385, 106.276923],
              getLatLng(
                mapUrl,
                Number(sv.coords?.latitude),
                Number(sv.coords?.longitude)
              ) as any,
              // [
              //   120.3814, -1.09],
              13
            )
          }
        })
      }
    })

    // state.waypointsMakers.some((v) => {
    //   if (v.tlId === tlId && v.wId === wId) {
    //     // v.marker?.toggleTooltip()

    //     const latlng = v.marker.getLatLng()
    //     map.current?.setView(
    //       // [29.886385, 106.276923],
    //       [latlng.lat, latlng.lng],
    //       // [
    //       //   120.3814, -1.09],
    //       13
    //     )
    //     return true
    //   }
    // })
  }
  state.showPolyline = (tlId: string, wId: string) => {
    // console.log('openPopup', tlId, wId)

    state.roadBookItem?.timelines?.some((v, i, arr) => {
      if (v.id === tlId) {
        v?.waypoints?.some((sv, si, sarr) => {
          if (sv.id === wId) {
            // v.marker?.toggleTooltip()
            const lastWp = sarr[si + 1]

            const zoom = getZoom(
              lastWp.coords?.latitude || 0,
              lastWp.coords?.longitude || 0,
              sv.coords?.latitude || 0,
              sv.coords?.longitude || 0
            )

            let minLat = Math.min(
              lastWp.coords?.latitude || 0,
              sv.coords?.latitude || 0
            )
            let minLon = Math.min(
              lastWp.coords?.longitude || 0,
              sv.coords?.longitude || 0
            )
            let maxLat = Math.max(
              lastWp.coords?.latitude || 0,
              sv.coords?.latitude || 0
            )
            let maxLon = Math.max(
              lastWp.coords?.longitude || 0,
              sv.coords?.longitude || 0
            )
            const tempLatLon = {
              lat: (minLat + maxLat) / 2,
              lng: (minLon + maxLon) / 2,
            }

            map.current?.setView(
              // [29.886385, 106.276923],
              [tempLatLon.lat, tempLatLon.lng],
              zoom + 2
            )

            return true
          }
        })

        return true
      }
    })
  }

  state.showLatlng = (
    lat: number,
    lng: number,
    address: string,
    autoZoom: boolean = true
  ) => {
    if (!map.current) return

    state.customMarker && removeLayer(map.current, state.customMarker)

    let latlng = getLatLng(mapUrl, lat, lng)
    // latlng = [lat, lng]
    const marker = createWaypointMarker({
      map: map.current,
      lat: latlng[0],
      lng: latlng[1],
      title: ``,
      subtitle: ``,
      type: 'Waypoint',
      alwaysShowTooltip: true,
      tooltipText: address || '',
      color: 'Red',
    })
    setState({
      customMarker: marker,
    })

    map.current?.setView(
      // [29.886385, 106.276923],
      [latlng[0], latlng[1]],
      // [
      //   120.3814, -1.09],
      autoZoom ? 11 : map.current.getZoom()
    )

    return {
      close: () => {
        if (!map.current) return
        marker && removeLayer(map.current, marker)
      },
    }
  }

  state.deleteNavigationData = (
    v: protoRoot.roadbook.IRoadbookWaypointItem
  ) => {
    storage.navigationPolylines.delete(v.navigation?.urls?.shortUrl || '')

    return {
      ...v,
      navigation: {
        distance: 0,
        duration: 0,
        travelMode: '',
        urls: {
          domainUrl: '',
          shortUrl: '',
          url: '',
        },
      },
      lastNavigationTime: -1,
    }
  }

  state.getTimelineDays = (timelineDays: TimelineDaysItem[], tlId: string) => {
    return (
      timelineDays?.filter((sv) => sv.id === tlId)?.[0] || {
        id: '',
        daysIntoTrip: 0,
        startDate: '',
        endDate: '',
      }
    )
  }

  const lastPageType = useMemo(() => {
    const lastPageType = state.pageTypes[state.pageTypes.length - 1]

    return lastPageType
  }, [state.pageTypes?.length])

  useEffect(() => {
    const roadBookItem = state.roadBookItem
    switch (lastPageType) {
      case 'List':
        setState({
          headerTitle: t('pageTitle'),
          pageTitle: '',
          headerSubtitle: ``,
          pageNum: 1,
          loadStatus: 'loaded',
          polylines: [],
          roadBookItem: undefined,
          updateWaypointId: '',
          selectedTimelineId: '',
          addNewWaypointAfterThisWaypointId: '',
        })
        setLoadedMap(false)

        dispatch(
          layoutSlice.actions.setOpenAiChatModalInfo({
            type: 'roadbook',
            subtitle: t('aiModelSubtitle', {
              ns: 'roadBookPage',
            }),
          })
        )

        break

      case 'Add':
        setState({
          headerTitle: t('createRoadBook'),
          pageTitle: '',
          headerSubtitle: ``,
        })

        break
      case 'Detail':
        if (!roadBookItem?.startTime) {
          setState({
            headerTitle: t('loadingData', {
              ns: 'prompt',
            }),
            pageTitle: '',
            headerSubtitle: '',
          })
          return
        }
        const startTimeDate = moment(Number(roadBookItem?.startTime) * 1000)

        const tlDays = state.getTimelineDays(
          state.initTimelineDays(roadBookItem),
          roadBookItem?.id || ''
        )

        setState({
          headerTitle: roadBookItem?.title || '',
          pageTitle: roadBookItem?.title || '',
          headerSubtitle: `${tlDays.startDate} - ${tlDays.endDate}`,
        })

        break

      default:
        break
    }
  }, [state.pageTypes, config.lang, state.roadBookItem])

  useEffect(() => {
    if (
      router.query?.id &&
      !state.pageTypes.includes('Detail') &&
      !state.pageTypes.includes('Edit')
    ) {
      setState({
        pageTypes: state.pageTypes.concat('Detail'),
      })
    }
  }, [router])

  useEffect(() => {
    const L: typeof Leaflet = (window as any).L
    // console.log(
    //   'initMap1',
    //   config.country && !loadedMap,
    //   config.country,
    //   !loadedMap,
    //   geo.position?.coords?.latitude,
    //   L
    // )
    if (config.country && !loadedMap) {
      initMap()
    }
  }, [config.country, loadedMap, geo.position, mapUrl])

  useEffect(() => {
    setLoadedMap(false)
  }, [mapUrl, mapLayer?.roadColorFade])

  const initMap = () => {
    const L: typeof Leaflet = (window as any).L

    if (
      L &&
      !loadedMap &&
      geo.position?.coords?.latitude !== undefined &&
      mapUrl
    ) {
      console.log('initMap1 开始加载！')
      const [lat, lon] = getLatLng(
        mapUrl,
        toFixed(geo.position?.coords.latitude) || 0,
        toFixed(geo.position?.coords.longitude) || 0
      )
      if (map.current) {
        map.current?.remove()
        marker.current?.remove()
        map.current = undefined
        marker.current = undefined
      }
      if (!map.current) {
        map.current = L.map('rpm-map', {
          renderer: L.canvas(),
          // renderer: L.svg(),

          preferCanvas: true,
          zoomControl: false,
          minZoom: 3,
          maxZoom: 18,
          trackResize: false,
          zoomDelta: 0.5,
          zoomSnap: 0.5,

          // 这个会导致线条更新失败
          // ...({ rotate: true, bearing: 0 } as any),

          zoom: 15,
          attributionControl: false,
          // center: [Number(res?.data?.lat), Number(res?.data?.lon)],
        })

        // 检测地址如果在中国就用高德地图
        map.current.setView(
          // [29.886385, 106.276923],
          [lat, lon],
          // [
          //   120.3814, -1.09],
          15
        )

        let color = { r: 12, g: 12, b: 83 }

        layer.current = (L.tileLayer as any)
          .colorScale(mapUrl, {
            time: Date.now(),
            // isDarkscale: true,
            // isGrayscale: true,
            // isBlackscale: true,
            // className:""
            // errorTileUrl: osmMap,
            // attribution: `&copy;`,
          })
          .addTo(map.current)

        console.log('mapUrl', config, mapUrl)

        layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
        layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
        layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')

        console.log('layer.current', layer.current)

        mapLayer && roadColorFade(mapLayer, layer.current)

        console.log('layer', layer)

        createDistanceScaleControl(
          map.current,
          config.deviceType === 'Mobile' ? 80 : 100,
          {
            position: 'bottomleft',
            y: '5px',
          }
        )

        bindMapEvent()

        initMyPositionMarker()
        // map.current.on('zoom', (e) => {
        //   console.log('zoomEvent', e.target._zoom)
        // })
        // map.current.on('movestart', (e) => {
        //   console.log('movestart', e.target)
        // })
      }
      setTimeout(() => {
        setLoadedMap(true)
      }, 50)
    }
  }

  useEffect(() => {
    bindMapEvent()
  }, [state.selectWaypointOnMap.allow, state.selectedTimelineId])

  const bindMapEvent = () => {
    if (!map.current) return

    map.current?.removeEventListener('moveend')
    map.current?.removeEventListener('zoomend')
    map?.current?.on('moveend', () => {
      eventListener.getEventNames().forEach((v) => {
        if (v.includes('MoveEnd')) {
          eventListener.dispatch(v, undefined)
        }
      })
      eventListener.dispatch('InitCityMarkerMoveEnd', undefined)
    })
    map?.current?.on('zoomend', () => {
      eventListener.getEventNames().forEach((v) => {
        if (v.includes('ZoomEnd')) {
          eventListener.dispatch(v, undefined)
        }
      })
      eventListener.dispatch('InitCityMarkerZoomEnd', undefined)
    })

    map.current?.removeEventListener('click')
    state.selectedTimelineId &&
      state.selectWaypointOnMap.allow &&
      map.current.on('click', (e) => {
        let popLocation = e.latlng
        // console.log(
        //   'searchWaypointsByCoordinates',
        //   state.selectWaypointOnMap.allow,
        //   popLocation,
        //   {
        //     latitude: Math.round(popLocation.lat * 1000000) / 1000000,
        //     longitude: Math.round(popLocation.lng * 1000000) / 1000000,
        //   }
        // )

        let latlng = getLatLngGcj02ToWgs84(
          mapUrl,
          popLocation.lat,
          popLocation.lng
        )

        // latlng = [popLocation.lat, popLocation.lng]

        const latlng2 = normalizeLeafletCoordinates(latlng[0], latlng[1])

        setState({
          selectWaypointOnMap: {
            ...state.selectWaypointOnMap,
            coordinates: {
              lat: latlng2.lat,
              lng: latlng2.lng,
            },
          },
        })
      })
  }

  useEffect(() => {
    initMyPositionMarker()
  }, [
    geo.position,
    mapUrl,
    mapLayer?.showAvatarAtCurrentPosition,
    mapLayer?.headingUp,
    user.isInit,
  ])

  const lastAvatar = useRef('')
  const initMyPositionMarker = () => {
    if (map.current && mapUrl && geo.position.coords?.latitude) {
      const [lat, lon] = getLatLng(
        mapUrl,
        toFixed(geo?.position?.coords.latitude) || 0,
        toFixed(geo?.position?.coords.longitude) || 0
      )

      if (!marker.current || lastAvatar.current !== user.userInfo.avatar) {
        // if (!iconOptions.iconUrl) {
        // 	delete iconOptions.iconUrl
        // }
        if (marker.current) {
          removeLayer(map.current, marker.current)
        }

        marker.current = createMyPositionMarker(
          map.current,
          [lat, lon],
          mapLayer?.showAvatarAtCurrentPosition || false,
          mapLayer?.headingUp || false
        )
        lastAvatar.current = user.userInfo.avatar
      }
      marker.current.setLatLng([lat, lon])
    }
    // console.log('geo.position', geo.position)
  }
  const initRenderPolylinesDebounce = useRef(new Debounce())

  useEffect(() => {
    // console.log('renderPolyline', state.polylines)

    const init = async () => {
      // console.log('initRenderPolylinesDebounce init')
      initRenderPolylinesDebounce.current.increase(async () => {
        console.log('initRenderPolylinesDebounce1 deb')
        if (!map.current) return
        clearLayer({
          map: map.current,
          type: ['Polyline'],
        })

        let minLat = 100000
        let minLon = 100000
        let maxLat = -100000
        let maxLon = -100000

        if (state.polylines?.length) {
          for (let i = 0; i < state.polylines.length; i++) {
            await renderPolylineItem({
              params: {
                tripId: '',
                map: map.current,
                positions: state.polylines[i].polyline.map((v) => {
                  const latlng = getLatLng(mapUrl, v.lat, v.lng)

                  minLat = Math.min(minLat, latlng[0])
                  minLon = Math.min(minLon, latlng[1])
                  maxLat = Math.max(maxLat, latlng[0])
                  maxLon = Math.max(maxLon, latlng[1])

                  return {
                    latitude: latlng[0],
                    longitude: latlng[1],
                  }
                }),
                type: '',
                speedColor: getTrackRouteColor(
                  (mapLayer?.trackRouteColor as any) || 'Red',
                  false
                ),
                weight: Number(mapLayer?.polylineWidth),
                filterAccuracy: 'NoFilter',
                privacyGeofence: mapLayer?.privacyGeofence || false,
              },
            })
          }

          // await renderPolyline({
          //   map: map.current,
          //   alert: true,

          //   showTripTrackRoute: true,
          //   showCityName: mapLayer?.cityName || false,
          //   showCityBoundariesType: '',
          //   allowZoom: false,
          //   allowSetView: false,

          //   trips: state.polylines
          //     .filter((v) => {
          //       // return v.waypointId === 'xkW6dleBOcd'
          //       return true
          //     })
          //     .map((v) => {
          //       // console.log('polyline1 renderPolyline({', v)
          //       return {
          //         positionList: v.polyline?.map((v) => {
          //           const latlng = getLatLng(mapUrl, v.lat, v.lng)

          //           minLat = Math.min(minLat, latlng[0])
          //           minLon = Math.min(minLon, latlng[1])
          //           maxLat = Math.max(maxLat, latlng[0])
          //           maxLon = Math.max(maxLon, latlng[1])

          //           return {
          //             latitude: latlng[0],
          //             longitude: latlng[1],
          //           }
          //         }),
          //       }
          //     }),
          //   speedColor: getTrackRouteColor(
          //     (mapLayer?.trackRouteColor as any) || 'Red',
          //     false
          //   ),
          //   weight: Number(mapLayer?.polylineWidth),
          //   clickFunc({ params, reRender }) {},
          //   filterAccuracy: 'NoFilter',
          //   privacyGeofence: mapLayer?.privacyGeofence || false,
          // })
        }

        state.roadBookItem?.timelines
          ?.filter((v) => v.waypoints?.length)
          ?.forEach((v, i, arr) => {
            // if (i < arr.length - 1) return
            const L: typeof Leaflet = (window as any).L
            if (!map.current || !L) return
            // console.log('polyline1', v, i)

            // 不同日子之间进行连接
            const curCoords = v.waypoints?.[v.waypoints?.length - 1]?.coords
            // console.log('polyline1 curCoords', i, curCoords)

            const nextTlCoords = arr[i + 1]?.waypoints?.[0]?.coords
            // console.log('polyline1 curCoords', i, nextTlCoords)

            if (nextTlCoords) {
              minLat = Math.min(
                minLat,
                Number(curCoords?.latitude),
                Number(nextTlCoords?.latitude)
              )
              minLon = Math.min(
                minLon,
                Number(curCoords?.longitude),
                Number(nextTlCoords?.longitude)
              )
              maxLat = Math.max(
                maxLat,
                Number(curCoords?.latitude),
                Number(nextTlCoords?.latitude)
              )
              maxLon = Math.max(
                maxLon,
                Number(curCoords?.longitude),
                Number(nextTlCoords?.longitude)
              )

              L.polyline(
                [
                  getLatLng(
                    mapUrl,
                    Number(curCoords?.latitude),
                    Number(curCoords?.longitude)
                  ) as any,
                  getLatLng(
                    mapUrl,
                    Number(nextTlCoords?.latitude),
                    Number(nextTlCoords?.longitude)
                  ),
                ],
                {
                  dashArray: [10, 10],
                  smoothFactor: 10,
                  color: getTrackRouteColor(
                    (mapLayer?.trackRouteColor as any) || 'Red',
                    false
                  ),
                  // color: getTrackRouteColor('Red', false),
                  weight: Number(mapLayer?.polylineWidth),
                }
              ).addTo(map.current)
            }
            v?.waypoints?.forEach((sv, si, sarr) => {
              // console.log('polyline1 curCoords', si, sv.address, sv)
              if (
                !map.current ||
                !L ||
                si === sarr.length - 1 ||
                sv.navigation?.distance
              ) {
                return
              }
              const curCoords = sv?.coords
              const nextWPCoords = sarr[si + 1]?.coords
              console.log(
                'polyline1 curCoords',
                si,
                sv.address,
                curCoords,
                nextWPCoords
              )

              // console.log('polyline1 curCoords', si, sv.address, nextTlCoords)

              nextWPCoords &&
                L.polyline(
                  [
                    getLatLng(
                      mapUrl,
                      Number(curCoords?.latitude),
                      Number(curCoords?.longitude)
                    ) as any,
                    getLatLng(
                      mapUrl,
                      Number(nextWPCoords?.latitude),
                      Number(nextWPCoords?.longitude)
                    ),
                  ],
                  {
                    dashArray: [10, 10],
                    smoothFactor: 10,
                    color: getTrackRouteColor(
                      (mapLayer?.trackRouteColor as any) || 'Red',
                      false
                    ),
                    // color: getTrackRouteColor('Red', false),
                    weight: Number(mapLayer?.polylineWidth),
                  }
                ).addTo(map.current)
            })

            // v.waypoints?.forEach((sv, si, sarr) => {
            //   const nextWP = sarr[si + 1]
            //   nextWP.coords
            // })
          })

        // const tempLatLon = {
        //   lat: (minLat + maxLat) / 2,
        //   lng: (minLon + maxLon) / 2,
        // }

        // if (tempLatLon.lat !== 0) {
        //   const zoom = getZoom(minLat, minLon, maxLat, maxLon)

        //   map.current?.setView(
        //     // [29.886385, 106.276923],
        //     [tempLatLon.lat, tempLatLon.lng],
        //     zoom + (config.deviceType === 'Mobile' ? 0 : 1)
        //   )

        //      console.log(
        //     'tempLatLon',
        //     zoom,
        //     tempLatLon,
        //     minLat,
        //     minLon,
        //     maxLat,
        //     maxLon
        //   )
        // }

        // initCityMarker()
      }, 700)
    }
    init()

    // console.log('initRenderPolylinesDebounce map.current')

    // map.current?.on('zoom move', () => {
    //   console.log('initRenderPolylinesDebounce zoomend')
    //   // 可以加個 debounce 再保險一點（可選）
    //   // map.current?.invalidateSize()
    //   init()
    // })

    return () => {
      // map.current?.off('zoom move')
    }
  }, [
    state.polylines,
    mapLayer?.trackRouteColor,
    mapLayer?.polylineWidth,
    mapUrl,
    config.deviceType,
    loadedMap,
  ])

  useEffect(() => {
    if (!map.current) return

    initWaypointMarker()
    initCityMarker()
  }, [
    state.roadBookItem?.timelines,
    mapLayer?.cityName,
    mapLayer?.showPositionMarker,
    state.expandTimelineIds,
    loadedMap,
  ])

  const initWaypointMarker = () => {
    if (!map.current) return
    clearLayer({
      map: map.current,
      type: ['Waypoint'],
    })
    if (state.roadBookItem?.timelines && map.current) {
      // console.log(
      //   'createWaypointMarker timelines',
      //   state.roadBookItem?.timelines
      // )

      const tempWaypointsMakers: typeof state.waypointsMakers = []

      let minLat = 100000
      let minLon = 100000
      let maxLat = -100000
      let maxLon = -100000

      const timelineDays = state.initTimelineDays(state.roadBookItem)

      state.roadBookItem?.timelines.forEach((v, i) => {
        v.waypoints?.forEach((sv, si) => {
          if (!map.current) return

          if (!state.expandTimelineIds?.length) {
            minLat = Math.min(minLat, sv.coords?.latitude || 0)
            minLon = Math.min(minLon, sv.coords?.longitude || 0)
            maxLat = Math.max(maxLat, sv.coords?.latitude || 0)
            maxLon = Math.max(maxLon, sv.coords?.longitude || 0)
          }

          if (state.expandTimelineIds.includes(v.id || '')) {
            minLat = Math.min(minLat, sv.coords?.latitude || 0)
            minLon = Math.min(minLon, sv.coords?.longitude || 0)
            maxLat = Math.max(maxLat, sv.coords?.latitude || 0)
            maxLon = Math.max(maxLon, sv.coords?.longitude || 0)
          }

          // 渲染waypoint的标记
          const latlng = getLatLng(
            mapUrl,
            Number(sv.coords?.latitude),
            Number(sv.coords?.longitude)
          )

          if (mapLayer?.showPositionMarker) {
            const marker = createWaypointMarker({
              map: map.current,
              lat: latlng[0],
              lng: latlng[1],
              title: `${si + 1}`,
              subtitle: `D${state.getTimelineDays(timelineDays, v.id || '').daysIntoTrip}`,
              type: 'Waypoint',
              alwaysShowTooltip: mapLayer?.cityName
                ? state.expandTimelineIds.includes(v.id || '')
                : false,
              tooltipText: sv.address || '',
              // color: 'Blue',
              color: 'Pink',
            })

            marker &&
              tempWaypointsMakers.push({
                tlId: v.id || '',
                wId: sv.id || '',
                marker,
              })

            // 渲染timeline的标记
            if (si === 0) {
              // console.log('initMap createWaypointMarker timelines', v, sv)

              const marker = createWaypointMarker({
                map: map.current,
                lat: latlng[0],
                lng: latlng[1],
                title: `D${state.getTimelineDays(timelineDays, v.id || '').daysIntoTrip}`,
                subtitle: ``,
                type: 'Day',
                alwaysShowTooltip: mapLayer?.cityName || false,
                tooltipText: t('days', {
                  day: state.getTimelineDays(timelineDays, v.id || '')
                    .daysIntoTrip,
                }),
                // color: 'Pink',
                color: 'Blue',
              })

              marker &&
                tempWaypointsMakers.push({
                  tlId: v.id || '',
                  wId: '',
                  marker,
                })
            }
          }
        })
      })

      const tempLatLon = {
        lat: (minLat + maxLat) / 2,
        lng: (minLon + maxLon) / 2,
      }

      if (tempLatLon.lat !== 0) {
        const zoom = getZoom(minLat, minLon, maxLat, maxLon)

        map.current?.setView(
          // [29.886385, 106.276923],
          [tempLatLon.lat, tempLatLon.lng],
          zoom + (config.deviceType === 'Mobile' ? 0 : 1)
        )
        console.log(
          'tempLatLon',
          zoom,
          tempLatLon,
          minLat,
          minLon,
          maxLat,
          maxLon
        )
      }

      setState({
        waypointsMakers: tempWaypointsMakers,
      })
    }
  }

  const initCityMarkerDeb = useRef(new Debounce())
  const initCityMarker = () => {
    eventListener.removeEvent('InitCityMarkerMoveEnd')
    eventListener.removeEvent('InitCityMarkerZoomEnd')
    initCityMarkerDeb.current.increase(() => {
      if (!map.current) return
      // console.log(
      //   'finalCities createCityMarker CityName',
      //   !mapLayer?.showPositionMarker && mapLayer?.cityName
      // )
      clearLayer({
        map: map.current,
        type: ['CityName'],
      })
      deleteAllCityMarker('roadbook')

      if (!mapLayer?.showPositionMarker && map.current) {
        const tempWaypointsMakers: typeof state.waypointsMakers = []

        const cities: CityInfo[] = []

        state.roadBookItem?.timelines?.forEach((v, i) => {
          v.waypoints?.forEach((sv, si) => {
            // 渲染waypoint的标记
            const latlng = getLatLng(
              mapUrl,
              Number(sv.coords?.latitude),
              Number(sv.coords?.longitude)
            )
            if (!map.current || !latlng[0] || !latlng[1]) return

            // console.log('createCityMarker CityName', latlng, mapLayer?.cityName)

            if (!mapLayer?.cityName) {
              const marker = createCityMarker(
                map.current,
                '',
                [latlng[0], latlng[1]],
                4,
                sv.id || '',
                'roadbook'
              )
              marker &&
                tempWaypointsMakers.push({
                  tlId: v.id || '',
                  wId: sv.id || '',
                  marker,
                })
            } else {
              cities.push({
                id: (v.id || '') + ',' + (sv.id || ''),
                name: sv.address || '',
                lat: latlng[0],
                lng: latlng[1],
                coordinates: [latlng[0], latlng[1]],
                level: 4,
                levelStr: convertCityLevelToTypeString(4),
                parentCityId: '',
              })
            }
          })
        })
        if (cities.length) {
          // console.log('finalCities', cities, mapLayer?.cityName)

          const f = () => {
            if (!map.current) return

            clearLayer({
              map: map.current,
              type: ['CityName'],
            })
            deleteAllCityMarker('roadbook')

            const finalCities = filterGridPoints({
              map: map.current,
              citiesArr: cities,
              levelMap: {
                0: ['city'],
                4: ['city'],
                6: ['city'],
                7: ['city'],
                9: ['city'],
                11: ['city'],
              },
              zoom: map.current?.getZoom(),
            })

            // console.log('finalCities', cities, finalCities, mapLayer?.cityName)

            finalCities?.forEach((v) => {
              if (!map.current) return
              const marker = createCityMarker(
                map.current,
                v.name,
                [v.lat, v.lng],
                4,
                v.id || '',
                'roadbook'
              )

              let ids = v.id.split(',')
              marker &&
                tempWaypointsMakers.push({
                  tlId: ids[0],
                  wId: ids[1],
                  marker,
                })
            })
          }

          const initGridCityMarkerDeb = new Debounce()
          f()
          eventListener.on('InitCityMarkerMoveEnd', () => {
            initGridCityMarkerDeb.increase(() => {
              f()
            }, 50)
          })
          eventListener.on('InitCityMarkerZoomEnd', () => {
            initGridCityMarkerDeb.increase(() => {
              f()
            }, 50)
          })
        }
        setState({
          waypointsMakers: tempWaypointsMakers,
        })
      }
    }, 100)
  }

  const { pageNum, pageSize, list, loadStatus, setLoadStatus } = {
    pageNum: state.pageNum,
    pageSize: state.pageSize,
    list: state.list,
    loadStatus: state.loadStatus,
    setLoadStatus: (v: typeof state.loadStatus) => {
      setState({
        loadStatus: v,
      })
    },
  }

  // const [list, setList] = useState<protoRoot.roadbook.IRoadbookItem[]>([])
  // const [pageNum, setPageNum] = useState(1)
  // const [pageSize, setPageSize] = useState(10)
  // const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
  //   'loaded'
  // )

  useEffect(() => {
    if (user.isLogin) {
      eventListener.on('AIRoadbookAgent:create_roadbook', async (val) => {
        // getDetail()
        console.log('AIRoadbook:create_roadbook')
        const rb = JSON.parse(val)

        if (lastPageType === 'List') {
          setState({
            pageNum: 1,
          })
        }
        console.log('AIRoadbook:create_roadbook', router.asPath, rb)
        if (rb?.roadbookId) {
          router.push(
            Query(router.asPath.split('?')[0], {
              id: rb?.roadbookId,
            })
          )
        }
      })
    }

    if (user.isLogin && lastPageType === 'List' && pageNum === 1) {
      console.log('GetRoadbookList user')

      getRBList()

      // setTimeout(() => {
      //   loadModal('TripHistory', () => {
      //     dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
      //   })
      // }, 1000)
    }
  }, [user.isLogin, state.pageTypes, pageNum])

  useEffect(() => {
    console.log('GetRoadbookList state.list', state.list)
  }, [state.list])

  const getRBList = async () => {
    if (loadStatus === 'loading' || loadStatus === 'noMore') return

    setLoadStatus('loading')

    const res = await httpApi.v1.GetRoadbookList({
      ids: [],
      pageNum,
      pageSize,
    })
    console.log('GetRoadbookList res', res)

    if (res.code === 200) {
      if (!res.data?.list?.length) return

      setState({
        list: (pageNum === 1 ? [] : list).concat(res?.data?.list),
        pageNum: pageNum + 1,
      })

      if (res.data?.list?.length === pageSize) {
        setLoadStatus('loaded')
        return
      }
      setLoadStatus('noMore')

      return
    }

    setLoadStatus('loaded')

    snackbar({
      message: res.msg + ';' + res.error,
      autoHideDuration: 2000,
      vertical: 'top',
      horizontal: 'center',
    }).open()
  }

  const [historyVersionRBList, setHistoryVersionRBList] = useState<
    RoadbookHistoryVersionItem[]
  >([])

  state.historyVersion.init = async (rb?: protoRoot.roadbook.IRoadbookItem) => {
    setHistoryVersionRBList(
      rb?.id && user.userInfo.uid === rb.authorId
        ? (await storage.roadbookHistoryVersion.get(rb.id)) || []
        : []
    )
  }

  const historyVersionDeb = useRef(new Debounce())
  state.historyVersion.save = async (rb?: protoRoot.roadbook.IRoadbookItem) => {
    historyVersionDeb.current.increase(async () => {
      if (rb?.id && user.userInfo.uid === rb.authorId) {
        let rbList = (await storage.roadbookHistoryVersion.get(rb.id)) || []
        rbList.length >= 100 && rbList.shift()

        rbList.push({
          saveTime: moment().unix(),
          rb,
        })

        console.log('AIRoadbook  saveLocalHistoryVersion', rbList)

        rbList.sort((a, b) => b.saveTime - a.saveTime)

        setHistoryVersionRBList(rbList)

        await storage.roadbookHistoryVersion.set(rb.id, rbList)
      }
    }, 5000)
  }

  return (
    <>
      <DataContext.Provider value={{ state, setState }}>
        <Head>
          <title>
            {(state.pageTitle && state.pageTypes.includes('Detail')
              ? state.pageTitle + ' - '
              : '') +
              t('pageTitle') +
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
              '--devicewh-h': config.deviceWH.h + 'px',
            } as any
          }
          className={'roadbook-page '}
        >
          <div
            className={
              'rp-main ' +
              config.deviceType +
              ' ' +
              (state.fullMap ? 'fullMap' : '') +
              ' ' +
              (state.fullScreen ? 'fullScreen' : '') +
              ' '
            }
          >
            <div className={'rpm-left ' + config.deviceType}>
              <NoSSR>
                <saki-modal-header
                  // border
                  back-icon={state.pageTypes.length > 1}
                  close-icon={false}
                  left-width={'calc(100% - 60px)'}
                  // right-width={'60px'}
                  center-width={config.deviceType === 'Mobile' ? '0px' : '0px'}
                  padding={'0 10px 0 10px'}
                  ref={bindEvent({
                    close() {},
                    back() {
                      state.backPage()
                    },
                  })}
                  background-color={'#fff'}
                  title={''}
                >
                  <div className="rpmlh-left" slot="left">
                    <span className="rpmlhl-title">{state.headerTitle}</span>
                    {state.headerSubtitle ? (
                      <span className="rpmlhl-subtitle">
                        {state.headerSubtitle}
                      </span>
                    ) : (
                      ''
                    )}
                  </div>
                  <div className="rpmlh-right" style={{}} slot="right">
                    {(lastPageType === 'List' || lastPageType === 'Detail') &&
                    config.deviceType === 'Mobile' ? (
                      <SakiButton
                        onTap={() => {
                          setState({
                            fullMap: !state.fullMap,
                          })
                        }}
                        type="CircleIconGrayHover"
                      >
                        <SakiIcon
                          // width='14px'
                          // height='14px'
                          color={'#555'}
                          type={state.fullMap ? 'ZoomOut' : 'ZoomIn'}
                        ></SakiIcon>
                      </SakiButton>
                    ) : (
                      ''
                    )}

                    {lastPageType === 'List' ? (
                      list.length ? (
                        <SakiButton
                          onTap={() => {
                            if (!user.isLogin) {
                              dispatch(methods.user.loginAlert())
                              return
                            }
                            setState({
                              pageTypes: state.pageTypes.concat('Add'),
                            })
                          }}
                          type="CircleIconGrayHover"
                        >
                          <SakiIcon
                            // width='14px'
                            // height='14px'
                            color="#999"
                            type="Add"
                          ></SakiIcon>
                        </SakiButton>
                      ) : (
                        ''
                      )
                    ) : lastPageType === 'Detail' ? (
                      <>
                        {user.userInfo.uid === state.roadBookItem?.authorId ? (
                          <>
                            <saki-dropdown
                              visible={showVersionHistoryDP}
                              floating-direction="Left"
                              ref={bindEvent({
                                close: () => {
                                  setShowVersionHistoryDP(false)
                                },
                              })}
                            >
                              <saki-button
                                ref={bindEvent({
                                  tap: async () => {
                                    setHistoryVersionRBList([])
                                    await state.historyVersion.init(
                                      state.roadBookItem
                                    )
                                    setShowVersionHistoryDP(true)
                                  },
                                })}
                                type="CircleIconGrayHover"
                                loading={state.loadDetailStatus === 'loading'}
                              >
                                <saki-icon
                                  // width='14px'
                                  // height='14px'
                                  color="#999"
                                  type="Time"
                                ></saki-icon>
                              </saki-button>
                              <div slot="main">
                                <SakiTitle
                                  fontSize="11px"
                                  padding="0 12px"
                                  margin="6px 0"
                                  fontWeight="400"
                                  color="#aaa"
                                >
                                  {t('historyVersion', {
                                    num: historyVersionRBList?.length,
                                  })}
                                </SakiTitle>

                                <SakiScrollView maxHeight="300px">
                                  <saki-menu
                                    ref={bindEvent({
                                      selectvalue: async (e) => {
                                        console.log(e.detail.value)

                                        let st = Number(e.detail.value)
                                        const curRB =
                                          historyVersionRBList.filter(
                                            (v) => v.saveTime === st
                                          )?.[0]

                                        alert({
                                          title: t('restore'),
                                          content: t('restoreContent', {
                                            time: moment(
                                              curRB.saveTime * 1000
                                            ).format('YYYY.MM.DD HH:mm:ss'),
                                          }),
                                          cancelText: t('cancel', {
                                            ns: 'prompt',
                                          }),
                                          onCancel() {},
                                          confirmText: t('restore', {
                                            ns: 'prompt',
                                          }),
                                          onConfirm() {
                                            setState({
                                              ...state,
                                              roadBookItem: curRB.rb,
                                              historyVersion: {
                                                ...state.historyVersion,
                                                oldRB: state.roadBookItem,
                                                selectedVersion: st,
                                              },
                                            })
                                            setHistoryVersionRBList([])
                                          },
                                        }).open()

                                        setShowVersionHistoryDP(false)
                                      },
                                    })}
                                    padding={'0'}
                                  >
                                    {historyVersionRBList?.map((v, i) => {
                                      return (
                                        <SakiMenuItem
                                          key={i}
                                          subtitle={''}
                                          padding="10px 18px"
                                          value={String(v.saveTime)}
                                        >
                                          <div className="dp-menu-item">
                                            <span>
                                              {moment(v.saveTime * 1000).format(
                                                'YYYY.MM.DD HH:mm:ss'
                                              )}
                                            </span>
                                          </div>
                                        </SakiMenuItem>
                                      )
                                    })}
                                  </saki-menu>
                                </SakiScrollView>
                              </div>
                            </saki-dropdown>
                            <saki-dropdown
                              visible={showDetailMoreDP}
                              floating-direction="Left"
                              ref={bindEvent({
                                close: () => {
                                  setShowDetailMoreDP(false)
                                },
                              })}
                            >
                              <saki-button
                                ref={bindEvent({
                                  tap: () => {
                                    setShowDetailMoreDP(true)
                                  },
                                })}
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
                                          setTimeout(() => {
                                            setState({
                                              pageTypes:
                                                state.pageTypes.concat('Edit'),
                                            })
                                          }, 50)
                                          break
                                        case 'Delete':
                                          state.deleteRoadbook(
                                            state.roadBookItem?.id || ''
                                          )

                                        default:
                                          break
                                      }
                                      setShowDetailMoreDP(false)
                                    },
                                  })}
                                >
                                  <saki-menu-item
                                    padding="10px 18px"
                                    value={'Edit'}
                                  >
                                    <div className="dp-menu-item">
                                      <span>{t('editRoadBook')}</span>
                                    </div>
                                  </saki-menu-item>
                                  <saki-menu-item
                                    padding="10px 18px"
                                    value={'Delete'}
                                  >
                                    <div className="dp-menu-item">
                                      <span>{t('deleteRoadBook')}</span>
                                    </div>
                                  </saki-menu-item>
                                </saki-menu>
                              </div>
                            </saki-dropdown>
                          </>
                        ) : (
                          ''
                        )}
                      </>
                    ) : (
                      ''
                    )}
                  </div>
                </saki-modal-header>
              </NoSSR>
              <div className="rpml-main ">
                {state.pageTypes.filter((v) => v === 'List').length > 0 ? (
                  <>
                    <div className="rpmlm-list scrollBarHover">
                      {!list.length ? (
                        <div className={'rpmlml-none ' + config.deviceType}>
                          <NoSSR>
                            <saki-button
                              ref={bindEvent({
                                tap: () => {
                                  console.log('addJourneyMemory')

                                  if (!user.isLogin) {
                                    dispatch(methods.user.loginAlert())
                                    return
                                  }
                                  setState({
                                    pageTypes: state.pageTypes.concat('Add'),
                                  })
                                },
                              })}
                              margin="0px 0 20px"
                              width="200px"
                              padding="10px 10px"
                              type="Primary"
                              loading={loadStatus === 'loading'}
                            >
                              {t('createRoadBook', {})}
                            </saki-button>
                          </NoSSR>
                        </div>
                      ) : (
                        <div style={{}} className={'rpmlml-layer '}>
                          <div className="rpmlml-list">
                            <saki-card
                              padding="0"
                              title={''}
                              hide-title
                              hide-subtitle
                            >
                              {list.map((v, i) => {
                                const {
                                  getStraightLineDistanceToNextwaypoint,
                                } =
                                  state.getStraightLineDistanceToNextwaypoint(v)

                                const day =
                                  state.getTimelineDays(
                                    state.initTimelineDays(v),
                                    v?.id || ''
                                  ).daysIntoTrip || 0

                                let time = 0

                                const distance = `${
                                  Math.round(
                                    (v?.timelines?.reduce((t, v) => {
                                      v.waypoints?.forEach((sv, si, arr) => {
                                        time += sv.navigation?.duration || 0
                                        t +=
                                          Number(sv.navigation?.distance) ||
                                          getStraightLineDistanceToNextwaypoint(
                                            v.id || '',
                                            sv.id || ''
                                          )
                                      })
                                      return t
                                    }, 0) || 0) / 10
                                  ) / 100
                                }${t('km', {
                                  ns: 'unit',
                                })}`
                                const waypoints =
                                  v?.timelines?.reduce((t, v) => {
                                    v.waypoints?.forEach((sv) => {
                                      t += 1
                                    })
                                    return t
                                  }, 0) || 0

                                return (
                                  <saki-card-item
                                    ref={bindEvent({
                                      tap: () => {
                                        setState({
                                          pageTypes:
                                            state.pageTypes.concat('Detail'),
                                          roadBookItem: v,
                                        })

                                        router.push(
                                          Query(router.asPath.split('?')[0], {
                                            id: v.id || '',
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
                                          <SakiAvatar
                                            width="50px"
                                            height="50px"
                                            border-radius="6px"
                                            margin="0 10px 0 0"
                                            lazyload={false}
                                            nickname={String(day)}
                                            src={''}
                                          ></SakiAvatar>
                                        </div>
                                        <div className="jmi-right">
                                          <div className="jmi-r-left">
                                            <div className="name">
                                              <div>{v.title}</div>
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
                                            visible={activeRIdDropdown === v.id}
                                            floating-direction="Left"
                                            ref={bindEvent({
                                              close: () => {
                                                setActiveRIdDropdown('')
                                              },
                                            })}
                                          >
                                            <saki-button
                                              ref={bindEvent({
                                                tap: () => {
                                                  setActiveRIdDropdown(
                                                    v.id || ''
                                                  )
                                                },
                                              })}
                                              bg-color="transparent"
                                              type="CircleIconGrayHover"
                                            >
                                              <saki-icon
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
                                                        setState({
                                                          pageTypes:
                                                            state.pageTypes.concat(
                                                              'Edit'
                                                            ),

                                                          roadBookItem:
                                                            state.list.filter(
                                                              (v) =>
                                                                v.id ===
                                                                activeRIdDropdown
                                                            )?.[0],
                                                        })
                                                        router.push(
                                                          Query(
                                                            router.asPath.split(
                                                              '?'
                                                            )[0],
                                                            {
                                                              id: v.id || '',
                                                            }
                                                          )
                                                        )
                                                        break
                                                      case 'Delete':
                                                        state.deleteRoadbook(
                                                          v?.id || ''
                                                        )
                                                        break

                                                      default:
                                                        break
                                                    }
                                                    setActiveRIdDropdown('')
                                                  },
                                                })}
                                              >
                                                <saki-menu-item
                                                  padding="10px 18px"
                                                  value={'Edit'}
                                                >
                                                  <div className="dp-menu-item">
                                                    <span>
                                                      {t('editRoadBook')}
                                                    </span>
                                                  </div>
                                                </saki-menu-item>
                                                <saki-menu-item
                                                  padding="10px 18px"
                                                  value={'Delete'}
                                                >
                                                  <div className="dp-menu-item">
                                                    <span>
                                                      {t('deleteRoadBook')}
                                                    </span>
                                                  </div>
                                                </saki-menu-item>
                                              </saki-menu>
                                            </div>
                                          </saki-dropdown>
                                        </div>
                                      </div>
                                      <div className="jmi-bottom">
                                        <div className="jm-statistics">
                                          <div className="item-s-item">
                                            {`${t('dataFull', {
                                              ns: 'roadBookPage',
                                              day,
                                              distance,
                                              waypoints,
                                              time: formatDurationI18n(
                                                time,
                                                false,
                                                ['h', 'm', 's']
                                              ),
                                            })}`}
                                          </div>

                                          <div className="item-s-item"></div>
                                        </div>
                                      </div>
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

                          <NoSSR>
                            <SakiScrollLoading
                              onTap={() => {
                                setState({
                                  pageNum: 1,
                                  loadStatus: 'loaded',
                                })
                              }}
                              language={config.lang}
                              type={loadStatus}
                            ></SakiScrollLoading>
                          </NoSSR>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  ''
                )}
                <SakiTransitionRender
                  mounted={mounted}
                  setClassName={'avp'}
                  ssr={false}
                  show={
                    state.pageTypes.filter((v) => v === 'Add' || v === 'Edit')
                      .length > 0
                  }
                >
                  <AddRoadBookPage
                    onAdded={(rb) => {
                      state.backPage()
                      setState({
                        pageNum: 1,
                        loadStatus: 'loaded',
                      })
                      // setList([rb].concat(list))
                    }}
                  />
                </SakiTransitionRender>
                <SakiTransitionRender
                  mounted={mounted}
                  setClassName={'avp'}
                  ssr={true}
                  show={
                    state.pageTypes.filter((v) => v === 'Detail').length > 0
                  }
                >
                  <RoadBookDetailPage
                    show={
                      state.pageTypes.filter((v) => v === 'Detail').length > 0
                    }
                  />
                </SakiTransitionRender>
              </div>
            </div>
            <div className="rpm-right">
              <div
                id="rpm-map"
                className={
                  config.deviceType +
                  ' ' +
                  (mapLayer && isRoadColorFade(mapLayer) ? 'roadColorFade' : '')
                }
              >
                <LayerButtons
                  mapLayer={mapLayer}
                  show={!state.fullScreen}
                  style={
                    config.deviceType === 'Mobile'
                      ? {
                          left: '10px',
                          bottom: '32px',
                        }
                      : {
                          right: '20px',
                          top: '60px',
                        }
                  }
                  modalConfig={{
                    vertical: 'Top',
                    horizontal: 'Right',
                    offsetX: '20px',
                    offsetY: '140px',
                  }}
                  featuresList={mapLayerFeaturesList}
                  mapLayerType={mapLayerType}
                ></LayerButtons>
              </div>
              <ButtonsComponent
                position={
                  config.deviceType === 'Mobile'
                    ? state.fullMap
                      ? {
                          right: 10,
                          bottom: 70,
                        }
                      : state.fullScreen
                        ? {
                            right: 10,
                            bottom: 40,
                          }
                        : {
                            right: 10,
                            top: 90,
                          }
                    : {
                        right: 20,
                        bottom: 40,
                      }
                }
                buttonStyle={
                  config.deviceType === 'Mobile'
                    ? {
                        width: '30px',
                        height: '30px',
                        margin: '8px 0 0',
                        iconSize: '16px',
                      }
                    : {
                        width: '36px',
                        height: '36px',
                        margin: '10px 0 0',
                        iconSize: '18px',
                      }
                }
                // indexPage
                // trackRoute
                // realTimePosition
                // filter
                // layer
                aichat
                // mark
                currentPosition={!state.fullScreen}
                fullScreen
                zoom={!state.fullScreen}
                onCurrentPosition={() => {
                  if (geo.position) {
                    const [lat, lon] = getLatLng(
                      mapUrl,
                      toFixed(geo.position?.coords.latitude) || 0,
                      toFixed(geo.position?.coords.longitude) || 0
                    )
                    map.current?.setView([lat, lon], 15)
                  }
                }}
                onZoom={(type) => {
                  if (!map.current) return

                  const latlng = map.current?.getCenter()

                  map.current?.setView(
                    [latlng.lat, latlng.lng],
                    map.current?.getZoom() + (type === 'ZoomIn' ? 0.5 : -0.5)
                  )
                }}
                onFullScreen={(b) => {
                  setState({
                    fullScreen: b,
                  })
                }}
              ></ButtonsComponent>
            </div>
          </div>
        </div>
      </DataContext.Provider>
    </>
  )
}

RoadBookPage.getLayout = getLayout

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

export default RoadBookPage
