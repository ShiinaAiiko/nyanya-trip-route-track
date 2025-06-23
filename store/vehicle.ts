import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { protoRoot } from '../protos'
import { formatPositionsStr, getDistance } from '../plugins/methods'
import { TabsTripType } from './config'
import { httpApi } from '../plugins/http/api'
import store from '.'

export interface Statistics {
  speed: number
  maxSpeed: number
  maxAltitude: number
  climbAltitude: number
  descendAltitude: number
  averageSpeed: number
  distance: number
}

const modelName = 'vehicle'

export const state = {
  vehicles: [] as protoRoot.trip.IVehicleItem[],
  pageNum: 1,
  pageSize: 15,
  loadStatus: 'loaded' as 'loading' | 'loaded' | 'noMore',
  defaultVehicleId: '',
}

export const vehicleSlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setDefaultVehicleId: (
      state,
      params: {
        payload: (typeof state)['defaultVehicleId']
        type: string
      }
    ) => {
      console.log('setDefaultVehicleId', params.payload)
      state.defaultVehicleId = params.payload
      storage.global.set('defaultVehicleId', params.payload)
    },
    setVehicles: (
      state,
      params: {
        payload: (typeof state)['vehicles']
        type: string
      }
    ) => {
      state.vehicles = params.payload
    },
    setPageNum: (
      state,
      params: {
        payload: (typeof state)['pageNum']
        type: string
      }
    ) => {
      state.pageNum = params.payload
    },
    setLoadStatus: (
      state,
      params: {
        payload: (typeof state)['loadStatus']
        type: string
      }
    ) => {
      state.loadStatus = params.payload
    },
  },
})

export const vehicleMethods = {
  Init: createAsyncThunk(modelName + '/Init', async (_, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    dispatch(
      vehicleSlice.actions.setDefaultVehicleId(
        (await storage.global.get('defaultVehicleId')) || ''
      )
    )

    // await dispatch(
    //   vehicleMethods.GetVehicles({
    //     type: 'All',
    //     pageNum: 1,
    //   })
    // ).unwrap()
  }),
  GetVehicles: createAsyncThunk(
    modelName + '/GetVehicles',
    async (
      {
        type = 'All',
        pageNum,
      }: {
        type: string
        pageNum?: number
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch
      if (pageNum === 1) {
        dispatch(vehicleSlice.actions.setVehicles([]))
        dispatch(vehicleSlice.actions.setPageNum(1))
        dispatch(vehicleSlice.actions.setLoadStatus('loaded'))
      }

      const { vehicle } = store.getState()

      if (vehicle.loadStatus === 'loading' || vehicle.loadStatus === 'noMore')
        return
      dispatch(vehicleSlice.actions.setLoadStatus('loading'))

      const res = await httpApi.v1.GetVehicles({
        type,
        pageNum: vehicle.pageNum,
        pageSize: vehicle.pageSize,
      })

      console.log('GetVehicles', res)
      if (res.code === 200 && res.data?.list?.length) {
        const tempList = (vehicle.pageNum === 1 ? [] : vehicle.vehicles).concat(
          res.data.list
        )

        dispatch(vehicleSlice.actions.setVehicles(tempList))
        dispatch(vehicleSlice.actions.setPageNum(vehicle.pageNum + 1))

        if (res.data.total === vehicle.pageSize) {
          dispatch(vehicleSlice.actions.setLoadStatus('loaded'))
          dispatch(vehicleMethods.GetVehicles({ type }))
          return
        }
      }

      // const state = store.getState()

      // if (state.vehicle.vehicles.length) {
      //   const { vehicle } = state
      //   dispatch(
      //     vehicleSlice.actions.setDefaultVehicleId(
      //       vehicle.vehicles.filter(
      //         (v) => (v.id || '') === vehicle.defaultVehicleId
      //       ).length >= 1
      //         ? vehicle.defaultVehicleId
      //         : ''
      //     )
      //   )
      // }

      dispatch(vehicleSlice.actions.setLoadStatus('noMore'))
    }
  ),
}
