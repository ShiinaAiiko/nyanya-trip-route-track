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
  exitFullscreen,
  formatAvgPace,
  formatDistance,
  formatTime,
  fullScreen,
  getAngle,
  getDistance,
  getLatLng,
  getLatLngGcj02ToWgs84,
  getSpeedColor,
  getZoom,
  isFullScreen,
  isPointInPolygon,
  isRoadColorFade,
  removePolylinePointByLatLng,
  roadColorFade,
} from '../plugins/methods'
import TripItemComponent from './TripItem'

import { Debounce, deepCopy, getShortId, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet, { latLng } from 'leaflet'
import SpeedMeterComponent from './Dashboard'
import { Statistics } from '../store/trip'
import { eventListener, getMapLayer, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
  createCustomTripPointMarker,
  createCustomTripPointMarkerIcon,
  createMyPositionMarker,
  createOtherPositionMarker,
} from '../store/position'
import { LayerButtons } from './MapLayer'
import { loadModal } from '../store/layout'

const PrivacyGeofenceModal = () => {
  const { t, i18n } = useTranslation('privacyGeofenceModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)

  const dispatch = useDispatch<AppDispatch>()

  const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
    mapLayer: true,
    mapMode: true,
    roadColorFade: true,
    showAvatarAtCurrentPosition: false,
    showSpeedColor: false,
    cityName: false,
    cityBoundaries: false,
    tripTrackRoute: false,
    speedAnimation: false,
    turnOnVoice: false,
    showPositionMarker: false,
    trackSpeedColor: true,
    trackRouteColor: false,
    polylineWidth: true,
    speedColorLimit: false,
  })

  const { mapLayer, speedColorRGBs, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('privacyGeofenceModal')

    return ml
  }, [
    config.configure,
    config.country,
    config.connectionOSM,
    config.initConfigure,
  ])

  const loadedMap = useRef(false)
  const map = useRef<Leaflet.Map>()
  const layer = useRef<any>()
  const targetMarker = useRef<Leaflet.Marker<any>>()
  const marker = useRef<Leaflet.Marker<any>>()

  const customTripPoints = useRef<
    {
      id: string
      latlng: {
        lat: number
        lng: number
      }
      distance: number
      marker?: Leaflet.Marker<any>
    }[]
  >([])

  const [addedNewPrivacyGeofence, setAddedNewPrivacyGeofence] = useState(false)

  const privacyGeofencePoints = useRef<
    {
      id: string
      area: number
      points: {
        id: string
        latlng: {
          lat: number
          lng: number
        }
        distance: number
        marker?: Leaflet.Marker<any>
      }[]
      createTime: number
      lastUpdateTime: number
    }[]
  >([])

  const polylineMap = useRef<Record<string, Leaflet.Polyline<any>>>({})
  const markerMap = useRef<Record<string, Leaflet.Marker<any>>>({})

  const polyline = useRef<Leaflet.Polyline<any>>()

  const [selectGpsNodeIndex, setSelectGpsNodeIndex] = useState(-1)
  const selectGpsNodeId = useRef('')
  const [selectPGPId, setSelectPGPId] = useState('')
  const [type, setType] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const [showTag, setShowTag] = useState(true)

  const [isChanged, setIsChanged] = useState(false)

  const [myPosition, setMyPosition] = useState<protoRoot.trip.ITripPosition>()

  useEffect(() => {
    const init = async () => {
      const b = await storage.global.get('showcustomTripPositionsTag')
      setShowTag(typeof b === 'boolean' ? b : showTag)

      const refreshMapSizeDebounce = new Debounce()
      window.addEventListener('resize', () => {
        refreshMapSizeDebounce.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      })
    }
    init()
  }, [])

  const addedNewPrivacyGeofenceSnackbar = useRef(
    snackbar({
      message: t('mapClickAddNode', {
        ns: 'privacyGeofenceModal',
      }),
      vertical: 'bottom',
      horizontal: 'center',
      backgroundColor: 'var(--saki-default-color)',
      color: '#fff',
      closeIcon: true,
      onTap() {
        setAddedNewPrivacyGeofence(false)
      },
    })
  )

  const selectPrivacyGeofenceSnackbar = useRef(
    snackbar({
      message: t('mapClickAddNode', {
        ns: 'privacyGeofenceModal',
      }),
      vertical: 'bottom',
      horizontal: 'center',
      backgroundColor: 'var(--saki-default-color)',
      closeIcon: true,
      color: '#fff',
      onTap() {
        setSelectGpsNodeIndex(-1)
        setSelectPGPId('')
        selectGpsNodeId.current = ''
      },
    })
  )

  useEffect(() => {
    if (addedNewPrivacyGeofence) {
      addedNewPrivacyGeofenceSnackbar.current?.open()
    } else {
      addedNewPrivacyGeofenceSnackbar.current?.close()
    }
  }, [addedNewPrivacyGeofence])

  useEffect(() => {
    if (selectGpsNodeIndex === -1) {
      const el = document.querySelectorAll('.map-custom-trip-marker.active')
      el.forEach((el) => {
        el.classList.remove('active')
      })
    } else {
      const el = document.querySelector(
        '.map-custom-trip-marker.' + selectGpsNodeId.current
      )
      el?.classList.add('active')
      console.log(el)
    }
  }, [selectGpsNodeIndex])

  useEffect(() => {
    if (!layout.openPrivacyGeofenceModal) {
      setMyPosition(undefined)
    } else {
      storage.global
        .get('privacyGeofencePoints')
        .then(async (pgPoints: typeof privacyGeofencePoints.current) => {
          console.log('pgPoints', pgPoints)
          if (pgPoints?.length) {
            privacyGeofencePoints.current = pgPoints
          }

          await dispatch(methods.trip.GetPrivacyGeofence()).unwrap()

          const { trip } = store.getState()

          privacyGeofencePoints.current =
            trip.privacyGeofencePoints?.map((v) => {
              return {
                id: v.id || '',
                area: 0,
                points:
                  v.coords?.map((sv) => {
                    return {
                      id: getShortId(11),
                      latlng: {
                        lat: Number(sv.latitude),
                        lng: Number(sv.longitude),
                      },
                      distance: 0,
                    }
                  }) || [],

                createTime: Number(v.createTime) || 0,
                lastUpdateTime: Number(v.lastUpdateTime) || 0,
              }
            }) || []

          !loadedMap.current &&
            d.current.increase(() => {
              clearMap()
              initMap()
            }, 700)
        })
    }
  }, [layout.openPrivacyGeofenceModal])

  useEffect(() => {
    try {
      if (geo.position) {
        setMyPosition({
          longitude: geo.position.coords.longitude || 0,
          latitude: geo.position.coords.latitude || 0,
          altitude: geo.position.coords.altitude || -1,
          altitudeAccuracy: geo.position.coords.altitudeAccuracy || -1,
          accuracy: geo.position.coords.accuracy || -1,
          heading: geo.position.coords.heading || -1,
          speed: geo.position.coords.speed || -1,
          timestamp: geo.position.timestamp || 0,
        })
      }
    } catch (error) {}
  }, [geo.position?.timestamp])

  useEffect(() => {
    bindMapClickEvent()
  }, [selectGpsNodeIndex, addedNewPrivacyGeofence, selectPGPId, mapUrl])

  // useEffect(() => {
  // 	console.log('customTripPoints', customTripPoints.current)
  // }, [customTripPoints])

  const d = useRef(new Debounce())

  useEffect(() => {
    if (layout.openPrivacyGeofenceModal && mapUrl) {
      d.current.increase(() => {
        clearMap()
        initMap()
      }, 700)
      return
    }
    clearMap()
  }, [
    mapUrl,
    layout.openPrivacyGeofenceModal,
    speedColorRGBs,
    mapLayer?.polylineWidth,
  ])

  const clearMap = () => {
    console.log('clearMap')
    loadedMap.current = false
    map.current?.remove()
    map.current = undefined
    marker.current?.remove()
    marker.current = undefined
    targetMarker.current?.remove()
    targetMarker.current = undefined
    polyline.current?.remove()
    polyline.current = undefined

    polygon.current?.remove()
    polygon.current = undefined

    Object.keys(markerMap.current).forEach((id) => {
      markerMap.current[id]?.remove()
      delete markerMap.current[id]
    })

    Object.keys(polylineMap.current).forEach((id) => {
      polylineMap.current[id]?.remove()
      delete polylineMap.current[id]
    })
  }

  useEffect(() => {}, [mapUrl])

  const initMap = async () => {
    const L: typeof Leaflet = (window as any).L

    const myPositionGPS = getLatLng(
      mapUrl,
      myPosition?.latitude || 0,
      myPosition?.longitude || 0
    )
    const zoom = 15

    const [lat, lon] = [myPositionGPS[0], myPositionGPS[1]]

    if (L && !loadedMap.current) {
      if (map.current) {
        clearMap()
      }
      if (!map.current) {
        map.current = L.map('pg-map', {
          renderer: L.canvas(),
          preferCanvas: true,
          zoomControl: false,
          minZoom: 3,
          maxZoom: 18,
          trackResize: false,
          zoomDelta: 0.5,
          zoomSnap: 0.5,

          attributionControl: false,

          maxBoundsViscosity: 1.0,
          maxBounds: [
            [-85, -179],
            [85, 179],
          ],
        })

        // 检测地址如果在中国就用高德地图
        map.current.setView([lat, lon], zoom)

        layer.current = (L.tileLayer as any)
          .colorScale(mapUrl, {})
          .addTo(map.current)

        layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
        layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
        layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')

        mapLayer && roadColorFade(mapLayer, layer.current)
        bindMapClickEvent()
      }

      marker.current = createMyPositionMarker(
        map.current,
        [myPositionGPS[0], myPositionGPS[1]],
        mapLayer?.showAvatarAtCurrentPosition || false,
        false
      )

      if (privacyGeofencePoints.current?.length) {
        const speedColorLimit = (
          config.configure.general?.speedColorLimit as any
        )['drive' as any]
        const color = getSpeedColor(
          40,
          speedColorLimit.minSpeed,
          speedColorLimit.maxSpeed,
          speedColorRGBs
        )

        let minLat = 999999
        let minLng = 999999
        let maxLat = -999999
        let maxLng = -999999

        privacyGeofencePoints.current.forEach((pgPoints) => {
          if (!L || !map.current) return

          const pl = L.polyline(
            pgPoints.points.map((v) => {
              minLat = Math.min(v.latlng.lat, minLat)
              minLng = Math.min(v.latlng.lng, minLng)
              maxLat = Math.max(v.latlng.lat, maxLat)
              maxLng = Math.max(v.latlng.lng, maxLng)
              return getLatLng(mapUrl, v.latlng.lat, v.latlng.lng) as any
            }),
            {
              color,
              weight: Number(mapLayer?.polylineWidth),
            }
          ).addTo(map.current)
          polylineMap.current[pgPoints.id] = pl
        })
        console.log(
          'pgPoints ',
          minLat,
          maxLat,
          minLng,
          maxLng,
          privacyGeofencePoints.current
        )

        calcDistance()
        drawGeofence()

        let lat = (maxLat + minLat) / 2
        let lng = (maxLng + minLng) / 2
        let zoom = getZoom(minLat, minLng, maxLat, maxLng)
        map.current.setView([lat, lng], zoom)
      }

      loadedMap.current = true
    }

    if (map.current && L) {
      marker.current?.setLatLng([myPositionGPS[0], myPositionGPS[1]])
    }
  }

  const bindMapClickEvent = () => {
    map.current?.removeEventListener('click')
    map.current?.on('click', (e) => {
      // console.log('click pbindMapClickEvent', e, polygon.current)
      // let latlng = e.latlng

      // const latlng = getLatLngGcj02ToWgs84(
      //   mapUrl,
      //   popLocation.lat,
      //   popLocation.lng
      // )
      const latlng = getLatLngGcj02ToWgs84(mapUrl, e.latlng.lat, e.latlng.lng)

      const point = {
        id: getShortId(11),
        latlng: {
          lat: latlng[0],
          lng: latlng[1],
          // lat: latlng.lat,
          // lng: latlng.lng,
        },
        distance: -1,
      }

      if (addedNewPrivacyGeofence) {
        const id = getShortId(11)
        privacyGeofencePoints.current.push({
          id: id,
          area: 0,
          points: [point],
          createTime: moment().unix(),
          lastUpdateTime: moment().unix(),
        })

        showSelectPrivacyGeofenceSnackbar(
          privacyGeofencePoints.current.length,
          id
        )

        setAddedNewPrivacyGeofence(false)
        setIsChanged(true)
      } else {
        if (selectPGPId) {
          privacyGeofencePoints.current.some((v, i) => {
            if (v.id === selectPGPId) {
              if (selectGpsNodeIndex < 0) {
                v.points.push(point)
              } else {
                v.points.splice(selectGpsNodeIndex, 0, point)
              }
              v.lastUpdateTime = moment().unix()

              return true
            }
          })
          setIsChanged(true)
        }
      }

      savePositionsToLocal()

      addPolyline()
      setSelectGpsNodeIndex(-1)
      if (selectGpsNodeId.current) {
        selectGpsNodeId.current = ''
      }
    })
  }

  const addPolyline = () => {
    const { config } = store.getState()
    const L: typeof Leaflet = (window as any).L
    if (!L || !map.current) return

    if (privacyGeofencePoints.current?.length) {
      calcDistance()
      drawGeofence()
      privacyGeofencePoints.current.forEach((pgPoints) => {
        if (!L || !map.current) return

        console.log('pgPoints', selectGpsNodeIndex, pgPoints.points)
        const vPoint =
          pgPoints.points[
            selectGpsNodeIndex >= 0
              ? selectGpsNodeIndex
              : pgPoints.points.length - 1
          ]?.latlng

        if (!vPoint) return

        const vLatlon = [vPoint.lat, vPoint.lng]

        // marker.setIcon(createCustomTripPointMarkerIcon(1))

        if (pgPoints.points.length === 1) {
          return
        }

        const lvPoint = pgPoints.points[pgPoints.points.length - 2].latlng

        const lvLatlon = [lvPoint.lat, lvPoint.lng]

        const speedColorLimit = (
          config.configure.general?.speedColorLimit as any
        )['drive' as any]
        const color = getSpeedColor(
          40,
          speedColorLimit.minSpeed,
          speedColorLimit.maxSpeed,
          speedColorRGBs
        )

        if (polylineMap.current[pgPoints.id]) {
          if (selectGpsNodeIndex < 0) {
            polylineMap.current[pgPoints.id].addLatLng(
              getLatLng(mapUrl, vLatlon[0], vLatlon[1]) as any
            )
          } else {
            const latlngs = polylineMap.current[pgPoints.id].getLatLngs()

            latlngs.splice(
              selectGpsNodeIndex,
              0,
              getLatLng(mapUrl, vLatlon[0], vLatlon[1]) as any
            )
            polylineMap.current[pgPoints.id].setLatLngs(latlngs)
          }
        } else {
          const pl = L.polyline(
            [
              getLatLng(mapUrl, lvLatlon[0], lvLatlon[1]) as any,
              getLatLng(mapUrl, vLatlon[0], vLatlon[1]) as any,
            ],
            {
              // smoothFactor:10,
              // snakingSpeed: 200,
              color, //线的颜色
              weight: Number(mapLayer?.polylineWidth), //线的粗细
              // opacity: 0.3,
            }
          ).addTo(map.current)
          // playline.set
          console.log('playline', pl)
          polylineMap.current[pgPoints.id] = pl
        }
      })
    }
  }

  const calcDistance = () => {
    let tDistance = 0

    privacyGeofencePoints.current.forEach((v, i) => {
      v.points.forEach((sv, si) => {
        if (!map.current) return

        const vlatlon = sv.latlng

        if (si === 0) {
          if (sv.distance !== 0) {
            markerMap.current[sv.id]?.setIcon(
              createCustomTripPointMarkerIcon(0, sv.id)
            )
          }
          sv.distance = 0
          tDistance = 0
        } else {
          const lvlatlon = v.points[si - 1].latlng
          const cdistance = getDistance(
            vlatlon.lat,
            vlatlon.lng,
            lvlatlon.lat,
            lvlatlon.lng
          )
          tDistance += cdistance
        }
        // console.log('tDistance', tDistance, sv.distance, markerMap.current[sv.id])
        if (markerMap.current[sv.id]) {
          // if (sv.distance !== tDistance) {
          markerMap.current[sv.id].setIcon(
            createCustomTripPointMarkerIcon(tDistance, sv.id)
          )
          // }
        } else {
          const marker = createCustomTripPointMarker(
            map.current,
            tDistance,
            sv.id,
            getLatLng(mapUrl, vlatlon.lat, vlatlon.lng)
          )

          let clickTime = 0

          marker.addEventListener('click', (e) => {
            if (new Date().getTime() - clickTime <= 500) {
              deleteMarker(marker, v.id, vlatlon)
              return
            }
            console.log(e.originalEvent.target)
            const el = e.originalEvent.target as Element
            console.log('deleteMarker localName', el.localName)

            clickTime = new Date().getTime()

            if (el.localName === 'saki-icon') {
              deleteMarker(marker, v.id, vlatlon)
              return
            }

            showSelectPrivacyGeofenceSnackbar(i + 1, v.id)

            privacyGeofencePoints.current.forEach((v) => {
              v.points.forEach((sv, si) => {
                if (!markerMap.current[sv.id]) return
                const latlng = markerMap.current[sv.id].getLatLng()
                const tempVLatlng = getLatLng(mapUrl, vlatlon.lat, vlatlon.lng)

                console.log('deleteMarker latlng', tempVLatlng, latlng)
                if (
                  tempVLatlng[0] === latlng.lat &&
                  tempVLatlng[1] === latlng.lng
                ) {
                  if (selectGpsNodeId.current === sv.id) {
                    setSelectGpsNodeIndex(-1)
                    selectGpsNodeId.current = ''
                    return true
                  }
                  setSelectGpsNodeIndex(si + 1)
                  selectGpsNodeId.current = sv.id
                  return true
                }
              })
            })
          })
          markerMap.current[sv.id] = marker
        }

        sv.distance = tDistance
      })
    })
  }

  const polygon = useRef<Leaflet.Polygon<any>>()

  const drawGeofence = () => {
    const latlngs = ((privacyGeofencePoints.current.map((v) => {
      return v.points.map((sv) => {
        const latlng = getLatLng(mapUrl, sv.latlng.lat, sv.latlng.lng)
        // console.log('latlng', sv.latlng, latlng)
        return latlng
        return [sv.latlng.lat, sv.latlng.lng]
      })
    }) as any) || []) as number[][][]

    if (!latlngs.length) {
      return
    }

    const L: typeof Leaflet = (window as any).L
    if (!L || !map.current) return

    // 为每个子多边形添加文字标注
    privacyGeofencePoints.current.forEach((v, index) => {
      if (!L || !map.current) return
      // 计算子多边形的中心点（简单平均法）
      const subPolygon = v.points.map((sv) => {
        return [sv.latlng.lat, sv.latlng.lng]
      })
      const lats = subPolygon.map((point) => point[0])
      const lngs = subPolygon.map((point) => point[1])
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

      // 添加文字标注
      if (centerLat && centerLng) {
        if (markerMap.current[v.id]) {
          markerMap.current[v.id].setLatLng(
            getLatLng(mapUrl, centerLat, centerLng) as any
          )
          return
        }

        markerMap.current[v.id] = L.marker(
          getLatLng(mapUrl, centerLat, centerLng) as any,
          {
            icon: L.divIcon({
              html: `<span>${t('title', {
                ns: 'privacyGeofenceModal',
              })} #${index + 1}</span>`,
              className: 'pg-polygon-label',
              iconSize: [120, 20], // 根据文字调整
            }),
            zIndexOffset: -10, // 确保文字在 Polygon 下层
          }
        ).addTo(map.current)
      }
    })

    if (polygon.current) {
      polygon.current.setLatLngs(latlngs as any)
      return
    }

    const speedColorLimit = (config.configure.general?.speedColorLimit as any)[
      'drive' as any
    ]
    const color = getSpeedColor(
      40,
      speedColorLimit.minSpeed,
      speedColorLimit.maxSpeed,
      speedColorRGBs
    )

    polygon.current = L.polygon(latlngs as any, {
      color, // 边框颜色
      fillOpacity: 0.3, // 填充透明度
    }).addTo(map.current)
    console.log('privacyGeofencePointsPolygon', latlngs, polygon.current)

    polygon.current.addEventListener('click', (e) => {
      // console.log('click polygon.current', e, polygon.current)

      privacyGeofencePoints.current.some((v, index) => {
        const subPolygon = v.points.map((sv) => {
          const latlng = getLatLng(mapUrl, sv.latlng.lat, sv.latlng.lng)
          return latlng
        })
        if (isPointInPolygon([e.latlng.lat, e.latlng.lng], subPolygon)) {
          console.log(`polygon 点击了第 ${index + 1} 个子多边形`, subPolygon)

          setTimeout(() => {
            showSelectPrivacyGeofenceSnackbar(index + 1, v.id)
          }, 300)

          return true
        }
      })
    })
  }

  const showSelectPrivacyGeofenceSnackbar = (num: number, id: string) => {
    selectPrivacyGeofenceSnackbar.current.setMessage(
      t('selectedPGPoints', {
        ns: 'privacyGeofenceModal',
        num: num,
      })
    )

    setSelectPGPId(id)
    selectPrivacyGeofenceSnackbar?.current?.open()
  }

  const deleteMarker = (
    marker: Leaflet.Marker<any>,
    id: string,
    vlatlon: {
      lat: number
      lng: number
    }
  ) => {
    console.log('deleteMarker', id, vlatlon)
    privacyGeofencePoints.current.some((v, i) => {
      if (v.id === id) {
        v.points.some((sv, si) => {
          if (!markerMap.current[sv.id]) return

          const latlng = markerMap.current[sv.id].getLatLng()

          const tempVLatlng = getLatLng(mapUrl, vlatlon.lat, vlatlon.lng)

          if (tempVLatlng[0] === latlng.lat && tempVLatlng[1] === latlng.lng) {
            v.points.splice(si, 1)

            v.lastUpdateTime = moment().unix()

            savePositionsToLocal()

            polylineMap.current[id] &&
              removePolylinePointByLatLng(polylineMap.current[id], [
                tempVLatlng[0],
                tempVLatlng[1],
              ])
            marker?.remove()

            if (!v.points.length) {
              privacyGeofencePoints.current.splice(i, 1)

              markerMap.current[v.id]?.remove()
              polylineMap.current[v.id]?.remove()
            }

            return true
          }
        })
        if (v.points.length === 0) {
          polylineMap.current[id]?.remove()

          delete polylineMap.current[id]
        }
        return true
      }
    })

    calcDistance()
    drawGeofence()

    setIsChanged(true)

    setSelectGpsNodeIndex(-1)
    selectGpsNodeId.current = ''
  }

  const savePositionsToLocal = async () => {
    console.log('pgPoints savePositionsToLocal', privacyGeofencePoints.current)
    await storage.global.set(
      'privacyGeofencePoints',
      privacyGeofencePoints.current
    )
  }

  const save = async () => {
    if (loading) return
    setLoading(true)

    const res = await httpApi.v1.SetPrivacyGeofence({
      points: privacyGeofencePoints.current.map((v) => {
        return {
          id: v.id,
          coords: v.points.map((sv) => {
            return {
              latitude: sv.latlng.lat,
              longitude: sv.latlng.lng,
            }
          }),
          createTime: v.createTime,
          lastUpdateTime: v.lastUpdateTime,
        }
      }),
    })
    console.log('SetPrivacyGeofence', res)

    if (res.code === 200) {
      // await clear()
      snackbar({
        message: t('updatedSuccessfully', {
          ns: 'prompt',
        }),
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
        autoHideDuration: 2000,
      }).open()
    }
    setLoading(false)
  }

  const clear = async () => {
    await storage.global.delete('privacyGeofencePoints')

    privacyGeofencePoints.current = []

    Object.keys(markerMap.current).forEach((id) => {
      markerMap.current[id]?.remove()
      delete markerMap.current[id]
    })

    Object.keys(polylineMap.current).forEach((id) => {
      polylineMap.current[id]?.remove()
      delete polylineMap.current[id]
    })

    polygon.current?.remove()
    polygon.current = undefined

    setSelectGpsNodeIndex(-1)
    setSelectPGPId('')
    selectGpsNodeId.current = ''
    selectPrivacyGeofenceSnackbar?.current?.close()

    setIsChanged(true)
  }

  const deletePGP = (id: string) => {
    alert({
      title: t('deletePG', {
        ns: 'privacyGeofenceModal',
      }),
      content: t('deletePGContent', {
        ns: 'privacyGeofenceModal',
        name: `隐私围栏 #${privacyGeofencePoints.current.reduce((t, v, i) => {
          if (v.id === id) {
            t = i + 1
          }
          return t
        }, 0)}`,
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('delete', {
        ns: 'prompt',
      }),
      onCancel() {},
      async onConfirm() {
        privacyGeofencePoints.current = privacyGeofencePoints.current.filter(
          (v) => {
            markerMap.current[v.id]?.remove()
            delete markerMap.current[v.id]

            polylineMap.current[v.id]?.remove()
            delete polylineMap.current[v.id]

            v.points.forEach((sv) => {
              markerMap.current[sv.id]?.remove()
              delete markerMap.current[sv.id]
            })
            return v.id !== id
          }
        )

        calcDistance()
        drawGeofence()

        setIsChanged(true)

        setSelectGpsNodeIndex(-1)
        selectGpsNodeId.current = ''
        setSelectPGPId('')
        selectPrivacyGeofenceSnackbar?.current?.close()
      },
    }).open()
  }

  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(layoutSlice.actions.setOpenPrivacyGeofenceModal(false))
        },
        loaded() {
          eventListener.dispatch('loadModal:PrivacyGeofence', true)
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
      visible={layout.openPrivacyGeofenceModal}
    >
      <div
        className={
          'privacy-geofence-modal ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : ' ') +
          (!showTag ? 'showTag ' : ' ')
        }
      >
        <div className="pg-header">
          <saki-modal-header
            // border
            back-icon={false}
            close-icon={true}
            right-width={'74px'}
            ref={bindEvent({
              close() {
                dispatch(layoutSlice.actions.setOpenPrivacyGeofenceModal(false))
              },
            })}
            title={
              selectGpsNodeIndex >= 0
                ? t('insertAfterThisGPSNode', {
                    ns: 'createCustomTripModal',
                  })
                : t('title', {
                    ns: 'privacyGeofenceModal',
                  })
              // +  (customTripPoints.current.length
              // 		? ' [' + customTripPoints.current.length + ']'
              // 		: '')
            }
          >
            <div
              style={{
                margin: '0 10px 0 0',
              }}
              title=""
              slot="right"
            >
              <saki-row>
                <saki-button
                  ref={bindEvent({
                    tap: async () => {
                      setAddedNewPrivacyGeofence(!addedNewPrivacyGeofence)
                    },
                  })}
                  type="CircleIconGrayHover"
                >
                  <saki-icon
                    color={
                      addedNewPrivacyGeofence
                        ? 'var(--saki-default-color)'
                        : '#666'
                    }
                    type={'Add'}
                  ></saki-icon>
                </saki-button>
                {selectPGPId ? (
                  <saki-button
                    ref={bindEvent({
                      tap: () => {
                        deletePGP(selectPGPId)
                      },
                    })}
                    type="CircleIconGrayHover"
                  >
                    <saki-icon color={'#666'} type={'TrashFill'}></saki-icon>
                  </saki-button>
                ) : (
                  ''
                )}
                <saki-button
                  ref={bindEvent({
                    tap: async () => {
                      setShowTag(!showTag)

                      await storage.global.set(
                        'showcustomTripPositionsTag',
                        !showTag
                      )
                    },
                  })}
                  type="CircleIconGrayHover"
                >
                  <saki-icon
                    color="#666"
                    type={showTag ? 'EyeSlash' : 'Eye'}
                  ></saki-icon>
                </saki-button>
                <saki-button
                  ref={bindEvent({
                    tap: async () => {
                      alert({
                        title: t('deleteAllPG', {
                          ns: 'privacyGeofenceModal',
                        }),
                        content: t('deleteAllPGContent', {
                          ns: 'privacyGeofenceModal',
                        }),
                        cancelText: t('cancel', {
                          ns: 'prompt',
                        }),
                        confirmText: t('clear', {
                          ns: 'prompt',
                        }),
                        onCancel() {},
                        async onConfirm() {
                          console.log('polyline.current', polyline.current)

                          clear()
                        },
                      }).open()
                    },
                  })}
                  type="CircleIconGrayHover"
                >
                  <saki-icon color="#666" type="ClearFill"></saki-icon>
                </saki-button>
                <saki-button
                  ref={bindEvent({
                    tap: async () => {
                      loadModal('Settings', () => {
                        dispatch(layoutSlice.actions.setSettingType('Maps'))
                        dispatch(layoutSlice.actions.setOpenSettingsModal(true))
                      })
                    },
                  })}
                  margin="0 0 0 2px"
                  type="CircleIconGrayHover"
                  loading={loading}
                >
                  <saki-icon color="#666" type="Settings"></saki-icon>
                </saki-button>
                {isChanged ? (
                  <saki-button
                    ref={bindEvent({
                      tap: async () => {
                        save()
                      },
                    })}
                    margin="0 0 0 2px"
                    type="CircleIconGrayHover"
                    loading={loading}
                  >
                    <saki-icon color="#666" type="Hook"></saki-icon>
                  </saki-button>
                ) : (
                  ''
                )}
              </saki-row>
            </div>
          </saki-modal-header>
        </div>
        <div className="pg-main">
          <div
            id={'pg-map'}
            className={isRoadColorFade(mapLayer) ? 'roadColorFade' : ''}
          >
            <LayerButtons
              mapLayer={mapLayer}
              mapLayerType={mapLayerType}
              featuresList={mapLayerFeaturesList}
            ></LayerButtons>
          </div>
        </div>
      </div>
    </saki-modal>
  )
}

export default PrivacyGeofenceModal
