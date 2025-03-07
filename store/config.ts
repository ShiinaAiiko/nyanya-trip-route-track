import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { getI18n } from 'react-i18next'
import store, { ActionParams } from '.'
import { WebStorage, NRequest, SAaSS, NEventListener, deepCopy } from '@nyanyajs/utils'

import { Languages, languages, defaultLanguage } from '../plugins/i18n/i18n'
import { storage } from './storage'
import { set } from 'nprogress'
import { exitFullscreen, fullScreen, isFullScreen } from '../plugins/methods'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import screenfull from 'screenfull'

export const R = new NRequest()

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
    url: "https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=1&scl=0&size=0"
  },
  {
    key: 'AmapAreaMark',
    url: "https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=5&scl=0&size=0",
  },
  {
    key: 'AmapAreaRoad',
    url: "https://wprd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&style=7&ltype=3&scl=0&size=0"
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

export const getTrackSpeedColors = (type: 'RedGreen' | 'PinkBlue') => {
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

const getMapUrlAuto = (type: "Normal" | "TrackRoute", mapKey: string) => {
  setTimeout(() => {
    const { config } = store.getState()

    if (!config.configure?.baseMap?.mapKey) return

    let key = ''
    if (mapKey === 'AutoSelect') {
      if (config.country && config.connectionOSM !== 0) {
        if (config.country === 'China') {
          key = 'AmapSatellite'
        } else {
          if (config.connectionOSM === 1) {
            key = 'GoogleSatellite'
          } else {
            key = 'AmapSatellite'
          }
        }
      } else {
        return
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
    // console.log('v?.url', v?.url)
    if (type === 'TrackRoute') {
      store.dispatch(configSlice.actions.setTrackRouteMapUrl(v?.url))
      return
    }
    store.dispatch(configSlice.actions.setMapUrl(v?.url))
  }, 0)
}

export const getSpeedColorSliderRange = (type: string) => {
  switch (type) {
    case "plane":
      return [50, 500]
    case "train":
      return [50, 300]
    case "running":
      return [3, 40]
    case "walking":
      return [3, 40]
    case "powerwalking":
      return [3, 40]
    case "bike":
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
    minSpeed: number,
    maxSpeed: number,
  }
}
const configure: protoRoot.configure.IConfigure = {
  speedColorLimit: defaultSpeedColorLimit,
  baseMap: {
    mapKey: "AutoSelect",
    mapMode: "Normal"
  },
  trackRouteMap: {
    mapKey: "AutoSelect",
    mapMode: "Normal"
  },
  trackSpeedColor: 'RedGreen' as 'RedGreen' | 'PinkBlue',
  trackRouteColor: 'Red' as 'Blue' | 'Pink' | 'Red',

  showAvatarAtCurrentPosition: true,

  polylineWidth: {
    ongoingTrip: 4,
    historyTripTrack: 1,
    historyTripTrackSelectedTrip: 2,
    reviewTrip: 6,
  },

  speedAnimation: false,
  filter: {
    tripHistory: {
      startDate: "",
      endDate: "",
      selectedVehicleIds: [],
      selectedTripTypes: [],
      shortestDistance: 0,
      longestDistance: 0,
    },
    // 还没搞
    trackRoute: {
      startDate: "",
      endDate: "",
      selectedVehicleIds: [] as string[],
      selectedTripTypes: [] as string[],
      selectedTripIds: [] as string[],
      shortestDistance: 0,
      longestDistance: 500,
    },
  },
  roadColorFade: false,
  lastUpdateTime: -1,
}

export const configSlice = createSlice({
  name: 'config',
  initialState: {
    configure,
    initConfigure: false,
    mapRecommend: {
      baseMap: [{
        mapKey: "AmapSatellite",
        mapMode: "Normal"
      }, {
        mapKey: "AmapArea",
        mapMode: "Normal"
      }, {
        mapKey: "AmapArea",
        mapMode: "Black"
      }, {
        mapKey: "AmapAreaRoad",
        mapMode: "Gray"
      }, {
        mapKey: "GoogleSatellite",
        mapMode: "Normal"
      },],
      trackRouteMap: [{
        mapKey: "AmapArea",
        mapMode: "Normal"
      }, {
        mapKey: "AmapArea",
        mapMode: "Black"
      }, {
        mapKey: "AmapSatellite",
        mapMode: "Normal"
      }, {
        mapKey: "AmapAreaRoad",
        mapMode: "Gray"
      },],
      roadColorFadeMap: [{
        mapKey: "AmapAreaRoad"
      }, {
        mapKey: "AmapFull"
      }]
    },

    speedColorRGBs,
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
    mapUrl: '',
    // trackRouteMapKey: 'AutoSelect',
    trackRouteMapUrl: '',
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


    connectionBaseMapUrl: true,
    connectionTrackRouteMapUrl: true,
  },
  reducers: {
    setConnectionTrackRouteMapUrl: (
      state,
      params: {
        payload: typeof state["connectionTrackRouteMapUrl"]
        type: string
      }
    ) => {
      state.connectionTrackRouteMapUrl = params.payload
    },
    setConnectionBaseMapUrl: (
      state,
      params: {
        payload: typeof state["connectionBaseMapUrl"]
        type: string
      }
    ) => {
      state.connectionBaseMapUrl = params.payload
    },
    setSyncLocationWhileTraveling: (
      state,
      params: {
        payload: typeof state["syncLocationWhileTraveling"]
        type: string
      }
    ) => {
      state.syncLocationWhileTraveling = params.payload
      storage.global.setSync('syncLocationWhileTraveling', params.payload)
    },
    setConfigure: (
      state,
      params: {
        payload: typeof state["configure"]
        type: string
      }
    ) => {
      let obj: typeof state["configure"] = deepCopy({
        ...configure,
        ...params.payload
      })

      if (obj.filter?.trackRoute) {
        if (!obj?.filter?.trackRoute?.shortestDistance) {
          obj.filter.trackRoute.shortestDistance = configure.filter?.trackRoute?.shortestDistance
        }
        if (!obj?.filter?.trackRoute?.longestDistance) {
          obj.filter.trackRoute.longestDistance = configure.filter?.trackRoute?.longestDistance
        }
      }

      !obj.trackSpeedColor &&
        (obj.trackSpeedColor = configure.trackSpeedColor)
      !obj.trackRouteColor &&
        (obj.trackRouteColor = configure.trackRouteColor)

      if (obj.polylineWidth) {
        !obj.polylineWidth?.ongoingTrip &&
          (obj.polylineWidth.ongoingTrip = configure.polylineWidth?.ongoingTrip)
        !obj.polylineWidth?.historyTripTrack &&
          (obj.polylineWidth.historyTripTrack = configure.polylineWidth?.historyTripTrack)
        !obj.polylineWidth?.historyTripTrackSelectedTrip &&
          (obj.polylineWidth.historyTripTrackSelectedTrip = configure.polylineWidth?.historyTripTrackSelectedTrip)
        !obj.polylineWidth?.reviewTrip &&
          (obj.polylineWidth.reviewTrip = configure.polylineWidth?.reviewTrip)
      }

      state.configure = obj

      state.speedColorRGBs = getTrackSpeedColors((String(obj?.trackSpeedColor) || "RedGreen") as any)

      getMapUrlAuto("Normal", obj.baseMap?.mapKey || "AutoSelect")
      getMapUrlAuto("TrackRoute", obj.trackRouteMap?.mapKey || "AutoSelect")

      storage.global.setSync('configure', {
        ...obj,
        filter: {
          ...obj["filter"],
          trackRoute: {
            ...obj["filter"]?.["trackRoute"],
            selectedTripIds: []
          }
        }
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

      getMapUrlAuto("Normal", state.configure?.baseMap?.mapKey || "AutoSelect")
      getMapUrlAuto("TrackRoute", state.configure?.trackRouteMap?.mapKey || "AutoSelect")

    },
    setConnectionOSM: (state, params: ActionParams<number>) => {
      state.connectionOSM = params.payload

      getMapUrlAuto("Normal", state.configure?.baseMap?.mapKey || "AutoSelect")
      getMapUrlAuto("TrackRoute", state.configure?.trackRouteMap?.mapKey || "AutoSelect")

    },
    setMapUrl: (
      state,
      params: {
        payload: string
        type: string
      }
    ) => {
      // console.log('v?.url initMap params.payload', params.payload)
      state.mapUrl = params.payload
    },
    setTrackRouteMapUrl: (
      state,
      params: {
        payload: string
        type: string
      }
    ) => {
      state.trackRouteMapUrl = params.payload
    },
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

    let configureTemp = (await storage.global.get('configure')) || configure
    // configureTemp = configure
    thunkAPI.dispatch(configSlice.actions.setConfigure(
      configureTemp
    ))


    const slwt = await storage.global.get('syncLocationWhileTraveling')
    thunkAPI.dispatch(configSlice.actions.setSyncLocationWhileTraveling(
      typeof slwt === "boolean" ? slwt : true))


    const language = (await storage.global.get('language')) || 'system'
    thunkAPI.dispatch(configMethods.setLanguage(language))


    // const showDetailedDataForMultipleHistoricalTrips =
    //   (await storage.global.get(
    //     'showDetailedDataForMultipleHistoricalTrips'
    //   )) || false
    // thunkAPI.dispatch(
    //   configSlice.actions.setShowDetailedDataForMultipleHistoricalTrips(
    //     showDetailedDataForMultipleHistoricalTrips
    //   )
    // )


    console.log(" isFullScreen(document.body)", isFullScreen(document.body))
    thunkAPI.dispatch(
      configSlice.actions.setFullScreen(
        isFullScreen(document.body)
      )
    )


    // thunkAPI.dispatch(configSlice.actions.setUserPositionShare(Number(await storage.global.get('userPositionShare')) || -1))



  }),

  GetConfigure: createAsyncThunk(
    'config/GetConfigure',
    async (_, thunkAPI) => {
      const { config } = store.getState()

      const res = await httpApi.v1.GetConfigure({
      })

      console.log("GetConfigure", res,
        Number(res.data.configure?.lastUpdateTime),
        Number(config.configure?.lastUpdateTime))
      if (res.code === 200 && res.data.configure) {
        if (Number(res.data.configure?.lastUpdateTime) > Number(config.configure?.lastUpdateTime)) {

          const c = res.data.configure
          const conf = {
            ...config.configure,
            speedColorLimit: c.speedColorLimit,
            trackSpeedColor: c.trackSpeedColor,
            trackRouteColor: c.trackRouteColor,
            showAvatarAtCurrentPosition: c.showAvatarAtCurrentPosition,
            polylineWidth: c.polylineWidth,
            filter: {
              ...(config.configure.filter || configure.filter),
              trackRoute: c.filter?.trackRoute
            },
            lastUpdateTime: c.lastUpdateTime
          }
          thunkAPI.dispatch(configSlice.actions.setConfigure(
            conf
          ))
        }
      }

    }
  ),
  SetConfigure: createAsyncThunk(
    'config/SetConfigure',
    async (configure: protoRoot.configure.IConfigure, thunkAPI) => {
      const { config } = store.getState()
      console.log("SyncConfigure", config.initConfigure)
      if (!config.initConfigure) return

      configure.lastUpdateTime = Math.floor(new Date().getTime() / 1000)
      thunkAPI.dispatch(configSlice.actions.setConfigure(
        configure
      ))

      const obj = {
        ...configure,
        filter: {
          ...configure["filter"],
          trackRoute: {
            ...configure["filter"]?.["trackRoute"],
            selectedTripIds: []
          }
        }
      }
      await storage.global.set('configure', obj)
      const res = await (httpApi).v1.SyncConfigure({
        configure: obj
      })

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
          getI18n().changeLanguage(navigator.language)
        } else {
          switch (navigator.language.substring(0, 2)) {
            case 'zh':
              getI18n().changeLanguage('zh-CN')
              break
            case 'en':
              getI18n().changeLanguage('en-US')
              break

            default:
              getI18n().changeLanguage('en-US')
              break
          }
        }
      } else {
        getI18n().changeLanguage(language)
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
        positionShare: b
      })
      console.log("UpdateUserPositionShare", res)
      if (res.code === 200) {
        thunkAPI.dispatch(configSlice.actions.setUserPositionShare(b))
      }

    }
  ),
  getUserPositionShare: createAsyncThunk(
    'config/getUserPositionShare',
    async (_, thunkAPI) => {
      const res = await httpApi.v1.GetUserPositionShare({})
      console.log("GetUserPositionShare", res)
      if (res.code === 200) {
        thunkAPI.dispatch(configSlice.actions.setUserPositionShare(Number(res.data.positionShare) || -1))
        return
      }

      thunkAPI.dispatch(configSlice.actions.setUserPositionShare(-1))
    }
  ),
}
