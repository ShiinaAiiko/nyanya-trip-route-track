import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { deepCopy } from '@nyanyajs/utils'
import moment from 'moment'
import {
  networkConnectionStatusDetection,
  networkConnectionStatusDetectionEnum,
} from '@nyanyajs/utils/dist/common/common'
import { R } from './config'
import { toolApiUrl } from '../config'
import { getDistance } from '../plugins/methods'
import { getShortCityName, voiceBroadcast } from './city'
import store from '.'
import { protoRoot } from '../protos'
import { detectTurns, GpsPoint } from './trip'

// export interface RoadInfo {
//   type:
//     | 'motorway'
//     | 'trunk'
//     | 'primary'
//     | 'secondary'
//     | 'tertiary'
//     | 'unclassified'
//   country: string
//   roadCode: string
//   roudName: {
//     zhCN: string
//     zhTW: string
//     enUS: string
//   }
//   shortCityName: string
//   names?: Record<string, string>
// }

let lastGetRoadInfoTime = 0
export let updateRoadTime = 30
let loadGetRoadInfoStatus = 'loaded'
let lastPosition = {} as GeolocationPosition
let lastRoadVoiceStr = ''
let tempPositionsByRoads: GpsPoint[] = []

const defaultState = {
  position: {} as GeolocationPosition,
  selectPosition: {
    latitude: -10000,
    longitude: -10000,
  },
  watchUpdateTime: 0,
}

export const getRoadId = (roadInfo: protoRoot.road.IRoadInfo[]) => {
  let id = ''
  roadInfo.forEach((v) => {
    id +=
      (v.code || '') +
      (v.type || '') +
      (v.shortCityName || '') +
      (v.name?.en || '') +
      (v.name?.zhHans || '') +
      (v.name?.zhHant || '')
  })

  return id
}

const modelName = 'geo'

export const geoSlice = createSlice({
  name: modelName,
  initialState: defaultState,
  reducers: {
    setPosition: (
      state,
      params: {
        payload: GeolocationPosition
        type: string
      }
    ) => {
      const v = params.payload
      // const v = deepCopy(params.payload)
      // if (v?.coords?.longitude) {
      //   v.coords.longitude = Number(v.coords.longitude.toFixed(3))
      // }
      state.position = v

      // state.position = {
      // 	coords: {
      // 		accuracy: v.coords.accuracy,
      // 		altitude: v.coords.altitude,
      // 		altitudeAccuracy: v.coords.altitudeAccuracy,
      // 		heading: v.coords.heading,
      // 		latitude: v.coords.latitude,
      // 		longitude: v.coords.longitude,
      // 		speed: v.coords.speed,
      // 	},
      // 	timestamp: v.timestamp,
      // }
      // console.log(v)
      if (state.position?.timestamp) {
        storage.global.set('currentPosition', {
          coords: {
            longitude: state.position.coords.longitude,
            latitude: state.position.coords.latitude,
          },
        })
      }
    },
    setSelectPosition: (
      state,
      params: {
        payload: (typeof state)['selectPosition']
        type: string
      }
    ) => {
      state.selectPosition = params.payload
    },
    setWatchUpdateTime: (
      state,
      params: {
        payload: (typeof state)['watchUpdateTime']
        type: string
      }
    ) => {
      state.watchUpdateTime = params.payload
    },
  },
})

export const geoMethods = {
  Init: createAsyncThunk(modelName + '/Init', async (_, thunkAPI) => {
    const cp = await storage.global.get('currentPosition')
    console.log('initMap1 currentPosition', cp)

    thunkAPI.dispatch(
      geoSlice.actions.setPosition(
        cp?.coords?.latitude
          ? cp
          : {
              coords: {
                latitude: 29.556324,
                longitude: 106.57882,
              },
            }
      )
    )
  }),
  GetRoadInfo: createAsyncThunk(
    modelName + '/GetRoadInfo',
    async (
      {
        position,
        runNow = false,
      }: {
        position: (typeof defaultState)['position']
        runNow?: boolean
      },
      thunkAPI
    ) => {
      const riList: protoRoot.road.IRoadInfo[] = []
      const { config, city } = store.getState()
      try {
        // console.log(
        //   'GetRoadInfo lastGetRoadInfoTime',
        //   lastGetRoadInfoTime,
        //   lastGetRoadInfoTime <= position.timestamp,
        //   loadGetRoadInfoStatus === 'loaded',
        //   getDistance(
        //     lastPosition?.coords?.latitude || 0,
        //     lastPosition?.coords?.longitude || 0,
        //     position.coords.latitude,
        //     position.coords.longitude
        //   )
        // )
        if (
          runNow ||
          (lastGetRoadInfoTime <= position.timestamp &&
            loadGetRoadInfoStatus === 'loaded' &&
            getDistance(
              lastPosition?.coords?.latitude || 0,
              lastPosition?.coords?.longitude || 0,
              position.coords.latitude,
              position.coords.longitude
            ) >= 10) ||
          detectTurns(tempPositionsByRoads)
        ) {
          tempPositionsByRoads = []
          loadGetRoadInfoStatus = 'loading'
          let url = `https://nominatim.openstreetmap.org/reverse?lat=${
            position.coords.latitude
            // 23.2231152
            // 29.419453
          }&lon=${
            position.coords.longitude
            // 113.4652915
            // 105.597674
          }&format=json&zoom=16&addressdetails=1&namedetails=1`

          const connectionStatusOpenMeteo =
            await networkConnectionStatusDetection(
              networkConnectionStatusDetectionEnum.openStreetMap
            )

          const res = await R.request({
            method: 'GET',
            url: connectionStatusOpenMeteo
              ? url
              : `${toolApiUrl}/api/v1/net/httpProxy?method=GET&url=${encodeURIComponent(
                  url
                )}`,
          })

          let data = res?.data?.data as any
          if (connectionStatusOpenMeteo) {
            data = res?.data
          }

          // console.log('GetRoadInfo data', data)

          if (
            data.osm_type === 'way' &&
            data.class === 'highway' &&
            data.type !== 'construction'
          ) {
            let cityName = city.cityInfo.state
            if (runNow) {
              const res = await R.request({
                method: 'GET',
                url:
                  toolApiUrl +
                  `/api/v1/geocode/regeo?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`,
              })
              const data = res?.data?.data as any

              cityName = data.state
            }
            // const shortName = '渝'
            const shortName = (await getShortCityName(cityName)) || ''

            // console.log('shortName', shortName)

            const codes: string[] =
              data?.namedetails?.ref
                ?.replace(',', ';')
                ?.split(';')
                ?.map((v: string) => v.trim())
                ?.filter((v: string) => !!v) || []

            const altNamesZh = data.namedetails?.['alt_name:zh']
              ?.replace(',', ';')
              ?.split(';')
              ?.map((v: string) => v.trim())
              ?.filter((v: string) => !!v)
            const altNamesZhHant = data.namedetails?.['alt_name:zh-Hant']
              ?.replace(',', ';')
              ?.split(';')
              ?.map((v: string) => v.trim())
              ?.filter((v: string) => !!v)
            const altNamesZhHans = data.namedetails?.['alt_name:zh-Hans']
              ?.replace(',', ';')
              ?.split(';')
              ?.map((v: string) => v.trim())
              ?.filter((v: string) => !!v)
            const altNamesEN = data.namedetails?.['alt_name:en']
              ?.replace(',', ';')
              ?.split(';')
              ?.map((v: string) => v.trim())
              ?.filter((v: string) => !!v)
            const altNames = data.namedetails?.['alt_name']
              ?.replace(',', ';')
              ?.split(';')
              ?.map((v: string) => v.trim())
              ?.filter((v: string) => !!v)

            const defaultZHCN =
              data?.namedetails?.['name:zh-Hans'] ||
              data?.namedetails?.['name:zh'] ||
              data?.namedetails?.['name'] ||
              ''
            const defaultZHTW =
              data?.namedetails?.['name:zh-Hant'] ||
              data?.namedetails?.['name:zh-Hans'] ||
              data?.namedetails?.['name:zh'] ||
              data?.namedetails?.['name'] ||
              ''
            const defaultEN =
              data?.namedetails?.['name:en'] ||
              data?.namedetails?.['name'] ||
              ''
            if (codes.length) {
              codes.forEach((code, index) => {
                const ri: protoRoot.road.IRoadInfo = {
                  type: data.type,
                  // country: data.address?.country_code || 'cn',
                  code: code.trim() || '',
                  name: {
                    zhHans:
                      index === 0
                        ? defaultZHCN
                        : altNamesZhHans?.[index - 1] ||
                          altNamesZh?.[index - 1] ||
                          altNames?.[index - 1] ||
                          '',
                    zhHant:
                      index === 0
                        ? defaultZHTW
                        : altNamesZhHant?.[index - 1] ||
                          altNamesZh?.[index - 1] ||
                          altNames?.[index - 1] ||
                          '',
                    en:
                      index === 0
                        ? defaultEN
                        : altNamesEN?.[index - 1] ||
                          altNames?.[index - 1] ||
                          '',
                  },
                  shortCityName: shortName,
                }

                riList.push(ri)
              })
            } else {
              if (data?.namedetails?.['name']) {
                const ri: protoRoot.road.IRoadInfo = {
                  type: data.type,
                  code: '',
                  name: {
                    zhHans: defaultZHCN,
                    zhHant: defaultZHTW,
                    en: defaultEN,
                  },
                  shortCityName: shortName,
                }

                riList.push(ri)
              }
            }

            // console.log(
            //   'GetRoadInfo data getShortCityName ri',
            //   moment(position.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            //   riList
            // )
          }

          if (!riList.length) {
            const ri: protoRoot.road.IRoadInfo = {
              type: 'motorway',
              code: 'A404',
              name: {
                zhHans: '',
                zhHant: '',
                en: '',
              },
              shortCityName: 'A',
            }

            riList.push(ri)
          }
          if (!runNow) {
            lastGetRoadInfoTime = position.timestamp + updateRoadTime * 1000
            lastPosition = position

            console.log(
              'config.turnOnCityVoice',
              config.turnOnCityVoice,
              runNow
            )

            if (config.turnOnCityVoice) {
              const str = riList
                ?.filter((v) => {
                  return v.code !== 'A404'
                })
                .reduce((arr, v) => {
                  let name =
                    ((v.name as any)?.[
                      config.lang === 'zh-CN'
                        ? 'zhHans'
                        : config.lang === 'zh-TW'
                        ? 'zhHant'
                        : 'en'
                    ] || (v.name as any)['zhHans']) + ''

                  arr.push(v.code + name)
                  return arr
                }, [] as string[])
                .join('、')

              if (lastRoadVoiceStr !== str && str) {
                lastRoadVoiceStr = str
                voiceBroadcast(str, false)
              }
            }
          }
          loadGetRoadInfoStatus = 'loaded'

          return {
            status: 'loaded',
            riList,
          }
        } else {
          tempPositionsByRoads.push({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading || 0,
            timestamp: position.timestamp || 0,
          })
        }
        return {
          status: 'noMore',
          riList,
        }
      } catch (error) {
        console.error(error)
        loadGetRoadInfoStatus = 'loaded'
        return {
          status: 'noMore',
          riList,
        }
      }
    }
  ),
}
