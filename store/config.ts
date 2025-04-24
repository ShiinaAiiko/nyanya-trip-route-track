import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { getI18n } from 'react-i18next'
import store, { ActionParams } from '.'
import {
  WebStorage,
  NRequest,
  SAaSS,
  NEventListener,
  deepCopy,
  Debounce,
} from '@nyanyajs/utils'

import {
  Languages,
  languages,
  defaultLanguage,
  changeLanguage,
} from '../plugins/i18n/i18n'
import { storage } from './storage'
import { set } from 'nprogress'
import { exitFullscreen, fullScreen, isFullScreen } from '../plugins/methods'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import screenfull from 'screenfull'
import { config } from 'process'

export const R = new NRequest()

export const d = new Debounce()

export type TripType =
  | 'Running'
  | 'Bike'
  | 'Drive'
  | 'Motorcycle'
  | 'Walking'
  | 'PowerWalking'
  | 'Train'
  | 'Plane'
  | 'PublicTransport'
  | 'Local'

export type TabsTripType =
  | 'All'
  | 'Running'
  | 'Bike'
  | 'Drive'
  | 'Motorcycle'
  | 'Walking'
  | 'PowerWalking'
  | 'Train'
  | 'Plane'
  | 'PublicTransport'
  | 'Local'

export type MapColorMode = 'Normal' | 'Gray' | 'Dark' | 'Black'
export type CityBoundariesType = 'country' | 'state' | 'region' | 'city'
export type TrackSpeedColorType = 'RedGreen' | 'PinkBlue'
export type TrackRouteColorType = 'Blue' | 'Pink' | 'Red'

export type DeviceType = 'Mobile' | 'Pad' | 'PC'
export type LanguageType = Languages | 'system'
export let deviceType: DeviceType | undefined

export let osmMap = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export let cnMap =
  'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
cnMap =
  'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}'

export let maps = [
  {
    key: 'AutoSelect',
    url: '',
  },
  {
    key: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  // {
  // 	key: 'OpenStreetMapHumanitarian',
  // 	url: 'https://tile-c.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  // },
  {
    key: 'Google',
    url: 'https://www.google.com/maps/vt?lyrs=m@189&gl=cn&x={x}&y={y}&z={z}',
  },
  {
    key: 'GoogleSatellite',
    url: 'https://www.google.com/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}',
  },
  {
    key: 'AmapFull',
    // 地图+标记
    // url: "http://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=5&scl=0&size=0",
    // 地图+路网
    // url: "http://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=3&scl=0&size=0"
    // 路网+标记
    // url: "http://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=2&scl=0&size=0"
    // 地图
    // url: "https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=1&scl=0&size=0"
    // 地图+路网+标记
    url: 'https://webrd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
  },
  {
    key: 'AmapArea',
    url: 'https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=1&scl=0&size=0',
  },
  {
    key: 'AmapAreaMark',
    url: 'https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=5&scl=0&size=0',
  },
  {
    key: 'AmapAreaRoad',
    url: 'https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=3&scl=0&size=0',
  },
  {
    key: 'AmapSatellite',
    // url: 'https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=6&ltype=0&scl=0&size=0',
    url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
  },
  // {
  //   key: 'GeoQBase',
  //   url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}',
  // },
  // {
  //   key: 'GeoQNight',
  //   url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}',
  // },
  // {
  //   key: 'GeoQGrey',
  //   url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}',
  // },
  // {
  //   key: 'GeoQWarm',
  //   url: 'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetWarm/MapServer/tile/{z}/{y}/{x}',
  // },
  {
    key: 'TianDiTuSatellite',
    url: 'https://t0.tianditu.gov.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}&tk=174705aebfe31b79b3587279e211cb9a',
  },
]

export const language: LanguageType = defaultLanguage as any

export let country = ''
export let connectionOSM = true

let speedColorRGBs: string[] = []

export let eventListener = new NEventListener()

export const getTrackSpeedColorRGBs = (type: TrackSpeedColorType) => {
  let speedColorRGBs = []
  if (type === 'PinkBlue') {
    let r = 88
    let g = 200
    let b = 242
    for (let i = 0; i < 20; i++) {
      g = 200 - Math.floor((19 / 10) * i)
      if (i < 10) {
        r = 140 + Math.floor(((200 - 92) / 10) * i)
      } else {
        b = 242 - Math.floor(((200 - 128) / 10) * (i - 10))
      }

      speedColorRGBs.push(`rgb(${r},${g},${b})`)
    }
    return speedColorRGBs
  }

  let r = 140
  let g = 200
  let b = 70
  for (let i = 0; i < 20; i++) {
    if (i < 10) {
      r = 140 + Math.floor(((200 - 100) / 10) * i)
    } else {
      g = 200 - Math.floor(((200 - 100) / 10) * (i - 10))
    }

    speedColorRGBs.push(`rgb(${r},${g},${b})`)
  }

  return speedColorRGBs
}

export const getTrackRouteColor = (
  type: 'Blue' | 'Pink' | 'Red',
  lightColor: boolean
) => {
  if (type === 'Blue') {
    if (lightColor) {
      return '#6a8b8e'
    }
    return '#4af0fe'
  }
  if (type === 'Pink') {
    if (lightColor) {
      return '#836d72'
    }
    return '#f29cb2'
  }
  if (lightColor) {
    // return '#e66e4680'
    return '#866c64'
  }
  return '#e66e46'
}

export const getMapUrlAuto = (
  mapKey: string,
  country: string,
  connectionOSM: number
) => {
  // setTimeout(() => {
  // const { config } = store.getState()
  if (!mapKey) return ''

  let key = ''
  // console.log('dddddd mapKey', mapKey, country, connectionOSM !== 0)
  if (mapKey === 'AutoSelect') {
    if (country && connectionOSM !== 0) {
      if (country === 'China') {
        key = 'AmapSatellite'
      } else {
        if (connectionOSM === 1) {
          key = 'GoogleSatellite'
        } else {
          key = 'AmapSatellite'
        }
      }
    } else {
      return ''
    }
  } else {
    key = mapKey
  }
  // console.log(
  // 	'getMapUrlAuto',
  // 	config.map.key,
  // 	config.country,
  // 	config.connectionOSM,
  // 	key
  // )
  const v = maps.filter((v) => {
    return v.key === key
  })[0]

  // console.log('dddddd mapKey', mapKey, v)
  // console.log('v?.url', v?.url)
  // if (type === 'TrackRoute') {
  //   // store.dispatch(configSlice.actions.setTrackRouteMapUrl(v?.url))
  //   return v?.url || ''
  // }
  // store.dispatch(configSlice.actions.setMapUrl(v?.url))

  return v?.url || ''

  // }, 0)
}

export const getSpeedColorSliderRange = (type: string) => {
  switch (type) {
    case 'plane':
      return [50, 500]
    case 'train':
      return [50, 300]
    case 'running':
      return [3, 40]
    case 'walking':
      return [3, 40]
    case 'powerwalking':
      return [3, 40]
    case 'bike':
      return [5, 60]

    default:
      return [20, 120]
  }
}

export const defaultSpeedColorLimit = {
  running: {
    minSpeed: 1.39,
    maxSpeed: 4.16,
  },
  bike: {
    minSpeed: 4.16,
    maxSpeed: 8.33,
  },
  drive: {
    minSpeed: 8.33,
    maxSpeed: 22.22,
  },
  motorcycle: {
    minSpeed: 8.33,
    maxSpeed: 22.22,
  },
  walking: {
    minSpeed: 8.33,
    maxSpeed: 16.66,
  },
  powerwalking: {
    minSpeed: 1.38,
    maxSpeed: 2.77,
  },
  plane: {
    minSpeed: 22.22,
    maxSpeed: 100,
  },
  train: {
    minSpeed: 22.22,
    maxSpeed: 70,
  },
  publictransport: {
    minSpeed: 8.33,
    maxSpeed: 22.22,
  },
} as {
  [k: string]: {
    minSpeed: number
    maxSpeed: number
  }
}

export const defaultMapLayerItem = {
  mapKey: 'AutoSelect',
  mapMode: 'Normal' as MapColorMode,
  roadColorFade: true,
  showAvatarAtCurrentPosition: true,
  showSpeedColor: true,
  cityName: true,
  cityBoundaries: '' as CityBoundariesType | '',
  tripTrackRoute: true,
  speedAnimation: true,
  turnOnVoice: true,
  showPositionMarker: true,
  trackSpeedColor: 'RedGreen' as TrackSpeedColorType,
  trackRouteColor: 'Red' as TrackRouteColorType,
  polylineWidth: 4,
}

export const defaultMapLayer = {
  indexPage: {
    ...defaultMapLayerItem,
    polylineWidth: 4,
    speedAnimation: false,
  },
  trackRoutePage: {
    ...defaultMapLayerItem,
    showSpeedColor: false,
    polylineWidth: 2,
  },
  tripItemPage: {
    ...defaultMapLayerItem,
    polylineWidth: 4,
    cityBoundaries: '',
  },
  journeyMemoriesPage: {
    ...defaultMapLayerItem,
    polylineWidth: 2,
    cityBoundaries: '',
  },
  findLocationModal: {
    ...defaultMapLayerItem,
  },
  createCustomTripModal: {
    ...defaultMapLayerItem,
    polylineWidth: 4,
  },
  replayTripModal: {
    ...defaultMapLayerItem,
    polylineWidth: 4,
    speedAnimation: false,
    cityBoundaries: '',
  },
  visitedCitiesModal: {
    ...defaultMapLayerItem,
    cityBoundaries: 'region',
  },
}
const defaultConfigure: protoRoot.configure.IConfigure = {
  general: {
    speedColorLimit: defaultSpeedColorLimit,
  },

  mapLayer: defaultMapLayer,

  filter: {
    tripHistory: {
      startDate: '',
      endDate: '',
      selectedVehicleIds: [],
      selectedTripTypes: [],
      distanceRange: {
        min: 0,
        max: 500,
      },
      speedRange: {
        min: 0,
        max: 380,
      },
      altitudeRange: {
        min: 0,
        max: 8848,
      },
      // shortestDistance: 0,
      // longestDistance: 0,
    },
    // 还没搞
    trackRoute: {
      startDate: '',
      endDate: '',
      selectedVehicleIds: [] as string[],
      selectedTripTypes: [] as string[],
      selectedTripIds: [] as string[],
      distanceRange: {
        min: 0,
        max: 500,
      },
      speedRange: {
        min: 0,
        max: 380,
      },
      altitudeRange: {
        min: 0,
        max: 8848,
      },
      // shortestDistance: 0,
      // longestDistance: 500,
      showCustomTrip: false,
      showFullData: false,
    },
  },
  lastUpdateTime: -1,
}

export const checkMapUrl = async (mapUrl: string) => {
  if (!mapUrl) return

  // console.log('checkMapUrl', mapUrl)
  const xyz = [812, 421, 10]

  let url = mapUrl
    .replace('{s}', 'a')
    .replace('{x}', String(xyz[0]))
    .replace('{y}', String(xyz[1]))
    .replace('{z}', String(xyz[2]))

  // console.log('checkMapUrl', type, url)
  try {
    const res = await fetch(url)
    // console.log('checkMapUrl res', res, type)
    // console.log('checkMapUrl', url, type, router, res)
    store.dispatch(configSlice.actions.setConnectionMapUrl(res.ok))
    // if (type === 'BaseMap') {
    // 	dispatch(configSlice.actions.setConnectionBaseMapUrl(res.ok))
    // 	return
    // }
    // dispatch(configSlice.actions.setConnectionTrackRouteMapUrl(res.ok))
  } catch (error) {
    // console.log('checkMapUrl error', error, type)
    store.dispatch(configSlice.actions.setConnectionMapUrl(false))
    // if (type === 'BaseMap') {
    // 	dispatch(configSlice.actions.setConnectionBaseMapUrl(false))
    // 	return
    // }
    // dispatch(configSlice.actions.setConnectionTrackRouteMapUrl(false))
  }
}

const mapLayerDeb = new Debounce()

export const getMapLayer = (
  mapLayerType: keyof protoRoot.configure.Configure.IMapLayer
) => {
  const { config } = store.getState()
  const { configure, country, connectionOSM } = config

  const mapLayer = configure.mapLayer?.[mapLayerType]

  const speedColorRGBs = getTrackSpeedColorRGBs(
    (mapLayer?.trackSpeedColor as TrackSpeedColorType) ||
      defaultMapLayerItem.trackSpeedColor
  )
  // console.log(
  //   'dddddd getMapLayer',
  //   mapLayer,
  //   config.country,
  //   config.connectionOSM,
  //   configure
  // )

  const mapUrl = getMapUrlAuto(
    mapLayer?.mapKey || defaultMapLayerItem.mapKey,
    country,
    connectionOSM
  )
  mapUrl &&
    mapLayerDeb.increase(() => {
      checkMapUrl(mapUrl)
    }, 1000)

  return {
    mapLayerType,
    mapLayer,
    speedColorRGBs,
    mapUrl,
  }
}

export const configSlice = createSlice({
  name: 'config',
  initialState: {
    configure: defaultConfigure,
    initConfigure: false,
    mapRecommend: {
      baseMap: [
        {
          mapKey: 'AmapSatellite',
          mapMode: 'Normal',
        },
        {
          mapKey: 'AmapArea',
          mapMode: 'Normal',
        },
        {
          mapKey: 'AmapArea',
          mapMode: 'Black',
        },
        {
          mapKey: 'AmapAreaRoad',
          mapMode: 'Gray',
        },
        {
          mapKey: 'GoogleSatellite',
          mapMode: 'Normal',
        },
      ],
      trackRouteMap: [
        {
          mapKey: 'AmapArea',
          mapMode: 'Normal',
        },
        {
          mapKey: 'AmapArea',
          mapMode: 'Black',
        },
        {
          mapKey: 'AmapSatellite',
          mapMode: 'Normal',
        },
        {
          mapKey: 'AmapAreaRoad',
          mapMode: 'Gray',
        },
      ],
      roadColorFadeMap: [
        {
          mapKey: 'AmapAreaRoad',
        },
        {
          mapKey: 'AmapFull',
        },
      ],
    },

    // speedColorRGBs,
    language: language,
    lang: '',
    languages: ['system', ...languages],
    deviceType,
    deviceWH: {
      w: 0,
      h: 0,
    },
    country: '',
    connectionOSM: 0,
    fullScreen: false,
    // mapKey: 'AutoSelect',
    // mapUrl: '',
    // trackRouteMapKey: 'AutoSelect',
    // trackRouteMapUrl: '',
    // map: {
    // 	key: 'AutoSelect',
    // 	url: '',
    // },

    tripTypes: [
      'Running',
      'Bike',
      'Drive',
      'Walking',
      'PowerWalking',
      'Motorcycle',
      'Train',
      'PublicTransport',
      'Plane',
      'Local',
    ] as TripType[],

    // trackRoute: {
    //   selectedTripTypes: [] as string[],
    //   selectedTripIds: [] as string[],
    //   selectedVehicleIds: [] as string[],
    //   selectedDate: {
    //     startDate: '',
    //     endDate: '',
    //   },
    // },

    updateTimeForTripHistoryList: 0,

    showDetailedDataForMultipleHistoricalTrips: true,

    hideLoading: false,

    userPositionShare: -1,

    showIndexPageButton: true,
    syncLocationWhileTraveling: true,

    connectionMapUrl: true,
    turnOnCityVoice: true,
    // connectionBaseMapUrl: true,
    // connectionTrackRouteMapUrl: true,
  },
  reducers: {
    setTurnOnCityVoice: (
      state,
      params: {
        payload: (typeof state)['turnOnCityVoice']
        type: string
      }
    ) => {
      state.turnOnCityVoice = params.payload

      storage.global.setSync('turnOnCityVoice', params.payload ? 1 : -1)
    },
    setConnectionMapUrl: (
      state,
      params: {
        payload: (typeof state)['connectionMapUrl']
        type: string
      }
    ) => {
      state.connectionMapUrl = params.payload
    },
    // setConnectionTrackRouteMapUrl: (
    //   state,
    //   params: {
    //     payload: typeof state["connectionTrackRouteMapUrl"]
    //     type: string
    //   }
    // ) => {
    //   state.connectionTrackRouteMapUrl = params.payload
    // },
    // setConnectionBaseMapUrl: (
    //   state,
    //   params: {
    //     payload: typeof state["connectionBaseMapUrl"]
    //     type: string
    //   }
    // ) => {
    //   state.connectionBaseMapUrl = params.payload
    // },
    setSyncLocationWhileTraveling: (
      state,
      params: {
        payload: (typeof state)['syncLocationWhileTraveling']
        type: string
      }
    ) => {
      state.syncLocationWhileTraveling = params.payload
      storage.global.setSync('syncLocationWhileTraveling', params.payload)
    },
    setConfigure: (
      state,
      params: {
        payload: (typeof state)['configure']
        type: string
      }
    ) => {
      let obj: (typeof state)['configure'] = deepCopy({
        ...defaultConfigure,
        ...params.payload,
      })

      if (obj.filter?.trackRoute) {
        if (!obj?.filter?.trackRoute?.distanceRange) {
          obj.filter.trackRoute.distanceRange =
            defaultConfigure.filter?.trackRoute?.distanceRange
        }
        if (!obj?.filter?.trackRoute?.speedRange) {
          obj.filter.trackRoute.speedRange =
            defaultConfigure.filter?.trackRoute?.speedRange
        }
        if (!obj?.filter?.trackRoute?.altitudeRange) {
          obj.filter.trackRoute.altitudeRange =
            defaultConfigure.filter?.trackRoute?.altitudeRange
        }
      }

      // console.log(
      //   'objobj FilterTrips',
      //   params.payload.filter?.trackRoute,
      //   obj.filter?.trackRoute
      // )

      if (!obj.general) {
        obj.general = defaultConfigure.general
      } else {
        !obj.general?.speedColorLimit &&
          (obj.general.speedColorLimit =
            defaultConfigure.general?.speedColorLimit)
      }

      if (!obj.mapLayer) {
        obj.mapLayer = defaultMapLayer
      } else {
        Object.keys(defaultMapLayer).forEach((k: string) => {
          const key: keyof typeof defaultMapLayer = k as any
          if (!obj.mapLayer?.[key]) {
            ;(obj.mapLayer as any)[key] = defaultMapLayer[key]
          }
        })
      }

      // console.log('dddddd obj', obj)

      state.configure = obj

      // state.speedColorRGBs = getTrackSpeedColors(
      //   (String(obj?.trackSpeedColor) || 'RedGreen') as any
      // )

      // getMapUrlAuto('Normal', obj.baseMap?.mapKey || 'AutoSelect')
      // getMapUrlAuto('TrackRoute', obj.trackRouteMap?.mapKey || 'AutoSelect')

      storage.global.setSync('configure', {
        ...obj,
        filter: {
          ...obj['filter'],
          trackRoute: {
            ...obj['filter']?.['trackRoute'],
            selectedTripIds: [],
          },
        },
      })
    },
    setInitConfigure: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.initConfigure = params.payload
    },
    setShowIndexPageButton: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.showIndexPageButton = params.payload
    },
    setUserPositionShare: (
      state,
      params: {
        payload: number
        type: string
      }
    ) => {
      state.userPositionShare = params.payload
      storage.global.setSync('userPositionShare', params.payload)
    },
    setHideLoading: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.hideLoading = params.payload
    },
    // setShowDetailedDataForMultipleHistoricalTrips: (
    //   state,
    //   params: {
    //     payload: boolean
    //     type: string
    //   }
    // ) => {
    //   state.showDetailedDataForMultipleHistoricalTrips = params.payload
    //   storage.global.setSync(
    //     'showDetailedDataForMultipleHistoricalTrips',
    //     params.payload
    //   )
    // },
    // setTrackRouteSelectedTripTypes: (
    //   state,
    //   params: {
    //     payload: string[]
    //     type: string
    //   }
    // ) => {
    //   state.trackRoute.selectedTripTypes = params.payload
    // },
    // setTrackRouteSelectedTripIds: (
    //   state,
    //   params: {
    //     payload: string[]
    //     type: string
    //   }
    // ) => {
    //   state.trackRoute.selectedTripIds = params.payload
    // },
    // setTrackRouteSelectedVehicleIds: (
    //   state,
    //   params: {
    //     payload: string[]
    //     type: string
    //   }
    // ) => {
    //   state.trackRoute.selectedVehicleIds = params.payload
    // },
    // setTrackRouteSelectedStartDate: (
    //   state,
    //   params: {
    //     payload: string
    //     type: string
    //   }
    // ) => {
    //   state.trackRoute.selectedDate.startDate = params.payload
    // },
    // setTrackRouteSelectedEndDate: (
    //   state,
    //   params: {
    //     payload: string
    //     type: string
    //   }
    // ) => {
    //   state.trackRoute.selectedDate.endDate = params.payload
    // },
    setUpdateTimeForTripHistoryList: (
      state,
      params: {
        payload: number
        type: string
      }
    ) => {
      state.updateTimeForTripHistoryList = params.payload
    },
    setLanguage: (
      state,
      params: {
        payload: LanguageType
        type: string
      }
    ) => {
      state.language = params.payload
    },
    setLang: (
      state,
      params: {
        payload: string
        type: string
      }
    ) => {
      state.lang = params.payload
    },
    setDeviceType: (state, params: ActionParams<DeviceType>) => {
      state.deviceType = params.payload
    },
    setDeviceWH: (state, params: ActionParams<void>) => {
      state.deviceWH = {
        w: window.innerWidth,
        h: window.innerHeight,
      }
    },
    setCountry: (state, params: ActionParams<string>) => {
      state.country = params.payload
      country = state.country

      // getMapUrlAuto('Normal', state.configure?.baseMap?.mapKey || 'AutoSelect')
      // getMapUrlAuto(
      //   'TrackRoute',
      //   state.configure?.trackRouteMap?.mapKey || 'AutoSelect'
      // )
    },
    setConnectionOSM: (state, params: ActionParams<number>) => {
      state.connectionOSM = params.payload

      // getMapUrlAuto('Normal', state.configure?.baseMap?.mapKey || 'AutoSelect')
      // getMapUrlAuto(
      //   'TrackRoute',
      //   state.configure?.trackRouteMap?.mapKey || 'AutoSelect'
      // )
    },
    // setMapUrl: (
    //   state,
    //   params: {
    //     payload: string
    //     type: string
    //   }
    // ) => {
    //   // console.log('v?.url initMap params.payload', params.payload)
    //   state.mapUrl = params.payload
    // },
    // setTrackRouteMapUrl: (
    //   state,
    //   params: {
    //     payload: string
    //     type: string
    //   }
    // ) => {
    //   state.trackRouteMapUrl = params.payload
    // },
    setFullScreen: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.fullScreen = params.payload
    },
  },
})

export const configMethods = {
  init: createAsyncThunk('config/init', async (_, thunkAPI) => {
    let configureTemp =
      (await storage.global.get('configure')) || defaultConfigure
    // configureTemp = configure
    thunkAPI.dispatch(configSlice.actions.setConfigure(configureTemp))

    const slwt = await storage.global.get('syncLocationWhileTraveling')
    thunkAPI.dispatch(
      configSlice.actions.setSyncLocationWhileTraveling(
        typeof slwt === 'boolean' ? slwt : true
      )
    )

    // const language = (await storage.global.get('language')) || 'system'
    // thunkAPI.dispatch(configMethods.setLanguage(language))

    const turnOnCityVoice = (await storage.global.get('turnOnCityVoice')) || 1
    thunkAPI.dispatch(
      configSlice.actions.setTurnOnCityVoice(turnOnCityVoice === 1)
    )

    // const showDetailedDataForMultipleHistoricalTrips =
    //   (await storage.global.get(
    //     'showDetailedDataForMultipleHistoricalTrips'
    //   )) || false
    // thunkAPI.dispatch(
    //   configSlice.actions.setShowDetailedDataForMultipleHistoricalTrips(
    //     showDetailedDataForMultipleHistoricalTrips
    //   )
    // )

    console.log(' isFullScreen(document.body)', isFullScreen(document.body))
    thunkAPI.dispatch(
      configSlice.actions.setFullScreen(isFullScreen(document.body))
    )

    // console.log('dddddd', 22222222222)
    // thunkAPI.dispatch(configSlice.actions.setUserPositionShare(Number(await storage.global.get('userPositionShare')) || -1))
  }),

  GetConfigure: createAsyncThunk('config/GetConfigure', async (_, thunkAPI) => {
    const { config } = store.getState()

    const res = await httpApi.v1.GetConfigure({})

    // console.log("filter1 GetConfigure", res,
    //   res.code === 200 && res.data.configure,
    //   Number(res.data.configure?.lastUpdateTime), Number(config.configure?.lastUpdateTime),
    //   Number(res.data.configure?.lastUpdateTime) > Number(config.configure?.lastUpdateTime),
    // )
    if (res.code === 200 && res.data.configure) {
      if (
        Number(res.data.configure?.lastUpdateTime) >=
        Number(config.configure?.lastUpdateTime)
      ) {
        const c = res.data.configure
        const conf = {
          ...config.configure,

          filter: {
            ...(config.configure.filter || defaultConfigure.filter),
            trackRoute:
              c.filter?.trackRoute || defaultConfigure.filter?.trackRoute,
          },
          general: {
            ...(config.configure.general || defaultConfigure.general),
            speedColorLimit:
              c.general?.speedColorLimit ||
              defaultConfigure.general?.speedColorLimit,
          },
          mapLayer: {
            ...(config.configure.mapLayer || defaultConfigure.mapLayer),
          },
          lastUpdateTime: c.lastUpdateTime,
        }
        console.log('filter1 GetConfigure', conf, config.configure)
        thunkAPI.dispatch(configSlice.actions.setConfigure(conf))
      }
    }
  }),
  SetConfigure: createAsyncThunk(
    'config/SetConfigure',
    async (configure: protoRoot.configure.IConfigure, thunkAPI) => {
      const { config } = store.getState()
      // console.log('SyncConfigure FilterTrips', configure, config.initConfigure)
      if (!config.initConfigure) return

      configure.lastUpdateTime = Math.floor(new Date().getTime() / 1000)
      thunkAPI.dispatch(configSlice.actions.setConfigure(configure))

      const obj = {
        ...configure,
        filter: {
          ...configure['filter'],
          trackRoute: {
            ...configure['filter']?.['trackRoute'],
            // selectedTripIds: []
          },
        },
      }
      await storage.global.set('configure', obj)
      d.increase(async () => {
        const res = await httpApi.v1.SyncConfigure({
          configure: obj,
        })
        console.log('filter1', res, obj)
      }, 700)
    }
  ),
  setLanguage: createAsyncThunk(
    'config/setLanguage',
    async (language: LanguageType, thunkAPI) => {
      thunkAPI.dispatch(configSlice.actions.setLanguage(language))

      // console.log('navigator.language', language, navigator.language)
      if (language === 'system') {
        const languages = ['zh-CN', 'zh-TW', 'en-US']
        if (languages.indexOf(navigator.language) >= 0) {
          changeLanguage(navigator.language)
        } else {
          switch (navigator.language.substring(0, 2)) {
            case 'zh':
              changeLanguage('zh-CN')
              break
            case 'en':
              changeLanguage('en-US')
              break

            default:
              changeLanguage('en-US')
              break
          }
        }
      } else {
        changeLanguage(language)
      }

      store.dispatch(configSlice.actions.setLang(getI18n().language))

      await storage.global.set('language', language)
    }
  ),
  getDeviceType: createAsyncThunk('config/getDeviceType', (_, thunkAPI) => {
    console.log('getDeviceType', document.body.offsetWidth)

    thunkAPI.dispatch(configSlice.actions.setDeviceWH())
    if (document.body.offsetWidth <= 768) {
      thunkAPI.dispatch(configSlice.actions.setDeviceType('Mobile'))
      return
    }
    if (document.body.offsetWidth <= 1024 && document.body.offsetWidth > 768) {
      thunkAPI.dispatch(configSlice.actions.setDeviceType('Pad'))
      return
    }
    thunkAPI.dispatch(configSlice.actions.setDeviceType('PC'))
  }),

  fullScreen: createAsyncThunk(
    'config/fullScreen',
    async (b: boolean, thunkAPI) => {
      // screenfull.toggle()
      if (b) {
        fullScreen(document.body)
      } else {
        exitFullscreen(document.body)
      }
      thunkAPI.dispatch(configSlice.actions.setFullScreen(b))
      // thunkAPI.dispatch(configSlice.actions.setFullScreen(screenfull.isFullscreen))
    }
  ),
  updateUserPositionShare: createAsyncThunk(
    'config/updateUserPositionShare',
    async (b: number, thunkAPI) => {
      const res = await httpApi.v1.UpdateUserPositionShare({
        positionShare: b,
      })
      console.log('UpdateUserPositionShare', res)
      if (res.code === 200) {
        thunkAPI.dispatch(configSlice.actions.setUserPositionShare(b))
      }
    }
  ),
  getUserPositionShare: createAsyncThunk(
    'config/getUserPositionShare',
    async (_, thunkAPI) => {
      const res = await httpApi.v1.GetUserPositionShare({})
      console.log('GetUserPositionShare', res)
      if (res.code === 200) {
        thunkAPI.dispatch(
          configSlice.actions.setUserPositionShare(
            Number(res.data.positionShare) || -1
          )
        )
        return
      }

      thunkAPI.dispatch(configSlice.actions.setUserPositionShare(-1))
    }
  ),
}
