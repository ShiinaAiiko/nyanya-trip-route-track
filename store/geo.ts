import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { deepCopy } from '@nyanyajs/utils'

const modelName = 'geo'
export const geoSlice = createSlice({
  name: modelName,
  initialState: {
    position: {} as GeolocationPosition,
    selectPosition: {
      latitude: -10000,
      longitude: -10000,
    },
    watchUpdateTime: 0,
  },
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
}
