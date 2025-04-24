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
  formatTimestamp,
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
import { Chart } from 'chart.js'
import { Debounce, deepCopy, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet from 'leaflet'
import SpeedMeterComponent from './SpeedMeter'
import { Statistics } from '../store/trip'
import { eventListener, getMapLayer, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
  createMyPositionMarker,
  createOtherPositionMarker,
} from '../store/position'
import { LayerButtons } from './MapLayer'
import { removeLayer } from '../store/map'

const FindLocationComponent = () => {
  const { t, i18n } = useTranslation('vehicleModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const geo = useSelector((state: RootState) => state.geo)
  const user = useSelector((state: RootState) => state.user)

  const dispatch = useDispatch<AppDispatch>()

  const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
    mapLayer: true,
    mapMode: true,
    roadColorFade: true,
    showAvatarAtCurrentPosition: true,
    showSpeedColor: false,
    cityName: false,
    cityBoundaries: false,
    tripTrackRoute: false,
    speedAnimation: false,
    turnOnVoice: false,
    showPositionMarker: false,
    trackSpeedColor: false,
    trackRouteColor: false,
    polylineWidth: false,
    speedColorLimit: false,
  })

  const { mapLayer, speedColorRGBs, mapLayerType, mapUrl } = useMemo(() => {
    const ml = getMapLayer('findLocationModal')

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
  const polyline = useRef<Leaflet.Polyline<any>>()

  const [targetPosition, setTargetPosition] =
    useState<protoRoot.trip.ITripPosition>()
  const [targetVehicle, setTargetVehicle] =
    useState<protoRoot.trip.IVehicleItem>()
  const [targetUserInfo, setTargetUserInfo] = useState<UserInfo>()

  const [myPosition, setMyPosition] = useState<protoRoot.trip.ITripPosition>()

  useEffect(() => {
    bindEventListener()
  }, [])
  useEffect(() => {
    if (!layout.openFindLocationModal) {
      setMyPosition(undefined)
      setTargetPosition(undefined)
      setTargetVehicle(undefined)
      setTargetUserInfo(undefined)
    }
  }, [layout.openFindLocationModal])

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

  const bindEventListener = () => {
    eventListener.removeEvent('find-location')
    eventListener.on('find-location', (e) => {
      console.log('bindEvent', e)
      const { vehicle, user } = store.getState()
      // setTargetPosition(e.position)
      const tVehicle = vehicle.vehicles.filter((v) => v.id === e.vehicleId)?.[0]

      console.log('tVehicle', tVehicle, e)
      if (tVehicle?.position) {
        setTargetVehicle(tVehicle)
        setTargetPosition(tVehicle.position)
        setTargetUserInfo(user.userInfo)
        return
      }
    })
  }

  useEffect(() => {
    if (
      layout.openFindLocationModal &&
      targetVehicle?.id &&
      targetUserInfo?.uid &&
      targetPosition?.latitude &&
      myPosition?.latitude
    ) {
      initMap()
      return
    }
    clearMap()
  }, [
    layout.openFindLocationModal,
    targetPosition,
    myPosition,
    targetVehicle,
    targetUserInfo,
  ])

  useEffect(() => {
    layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
    layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
    layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')
  }, [mapLayer?.mapMode])

  useEffect(() => {
    if (mapUrl) {
      loadedMap.current = false
      initMap()
    }
  }, [mapUrl, mapLayer?.roadColorFade, mapLayer?.showAvatarAtCurrentPosition])

  const clearMap = () => {
    console.log('clearMap')
    loadedMap.current = false
    map.current?.remove()
    map.current = undefined
    marker.current?.remove()
    marker.current = undefined
    targetMarker.current?.remove()
    targetMarker.current = undefined
  }

  const initMap = () => {
    const L: typeof Leaflet = (window as any).L

    const targetPositionGPS = getLatLng(
      mapUrl,
      targetPosition?.latitude || 0,
      targetPosition?.longitude || 0
    )
    const myPositionGPS = getLatLng(
      mapUrl,
      myPosition?.latitude || 0,
      myPosition?.longitude || 0
    )
    const zoom = getZoom(
      targetPositionGPS[0],
      targetPositionGPS[1],
      myPositionGPS[0],
      myPositionGPS[1]
    )

    const [lat, lon] = [
      (targetPositionGPS[0] + myPositionGPS[0]) / 2,
      (targetPositionGPS[1] + myPositionGPS[1]) / 2,
    ]

    if (L && !loadedMap.current) {
      if (map.current) {
        clearMap()
      }
      if (!map.current) {
        map.current = L.map('fl-map', {
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

        // 检测地址如果在中国就用高德地图
        map.current.setView([lat, lon], zoom)

        layer.current = (L.tileLayer as any)
          .colorScale(mapUrl, {})
          .addTo(map.current)

        layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
        layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
        layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')

        mapLayer && roadColorFade(mapLayer, layer.current)
      }

      marker.current = createMyPositionMarker(
        map.current,
        [myPositionGPS[0], myPositionGPS[1]],
        mapLayer?.showAvatarAtCurrentPosition || false
      )
      targetMarker.current = createOtherPositionMarker(
        map.current,
        [targetPositionGPS[0], targetPositionGPS[1]],
        {
          type: targetVehicle?.id ? 'Vehicle' : 'User',
          vehicleInfo: targetVehicle,
          userInfo: targetUserInfo,
        }
      )
      loadedMap.current = true
    }

    if (map.current && L) {
      marker.current?.setLatLng([myPositionGPS[0], myPositionGPS[1]])
      targetMarker.current?.setLatLng([
        targetPositionGPS[0],
        targetPositionGPS[1],
      ])
      polyline.current?.remove()
      polyline.current = L.polyline(
        [
          [targetPositionGPS[0], targetPositionGPS[1]],
          [myPositionGPS[0], myPositionGPS[1]],
        ],
        {
          dashArray: [12, 12],
          smoothFactor: 10,
          color: '#f29cb2',
          // color: getTrackRouteColor('Red', false),
          weight: 2,
        }
      ).addTo(map.current)
    }
  }

  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(layoutSlice.actions.setOpenFindLocationModal(false))
        },
        loaded() {
          eventListener.dispatch('loadModal:FindLocation', true)
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
      visible={layout.openFindLocationModal}
    >
      <div
        className={
          'find-location-component ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : '')
        }
      >
        <div className="th-header">
          <saki-modal-header
            // border
            back-icon={true}
            close-icon={false}
            right-width={'56px'}
            ref={bindEvent({
              back() {
                dispatch(layoutSlice.actions.setOpenFindLocationModal(false))
              },
            })}
            title={t('findLocation', {
              ns: 'vehicleModal',
            })}
          ></saki-modal-header>
        </div>
        <div className="fl-main">
          <div
            id={'fl-map'}
            className={
              mapLayer && isRoadColorFade(mapLayer) ? 'roadColorFade' : ''
            }
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

export default FindLocationComponent
