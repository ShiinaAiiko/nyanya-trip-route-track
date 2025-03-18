import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import exp from 'constants'
// import thunk from 'redux-thunk'
import { useDispatch } from 'react-redux'

import { apiSlice, apiMethods } from './api'
import { userSlice, userMethods } from './user'
import { layoutSlice, layoutMethods } from './layout'
import { ssoSlice, ssoMethods } from './sso'
import { configSlice, configMethods } from './config'
import { geoSlice, geoMethods } from './geo'
import { tripSlice, tripMethods } from './trip'
import { storageSlice, storageMethods } from './storage'
import { vehicleSlice, vehicleMethods } from './vehicle'
import { positionSlice, positionMethods } from './position'
import { citySlice, cityMethods } from './city'
import { journeyMemorySlice, journeyMemoryMethods } from './journeyMemory'
import { Dispatch } from 'react'


// export interface IContext<T = any> {
//   state: T
//   dispatch: Dispatch<{
//     type: string
//     payload?: Partial<T>
//   }>
// }


export const reducer = <T>(preState: T, newState: Partial<T>) => {
  return {
    ...preState,
    ...newState,
  }
}

export interface IContext<T = any> {
  state: T
  setState: Dispatch<Partial<T>>,
}
// export interface IContext<T = any> {
//   state: T
//   setState: Dispatch<React.SetStateAction<string | null>>,
//   // setState: Dispatch<Partial<T>>,
// }


export interface ActionParams<T = any> {
  type: string
  payload: T
}


const rootReducer = combineReducers({
  config: configSlice.reducer,
  api: apiSlice.reducer,
  user: userSlice.reducer,
  layout: layoutSlice.reducer,
  sso: ssoSlice.reducer,
  geo: geoSlice.reducer,
  trip: tripSlice.reducer,
  storage: storageSlice.reducer,
  vehicle: vehicleSlice.reducer,
  position: positionSlice.reducer,
  city: citySlice.reducer,
  journeyMemory: journeyMemorySlice.reducer
})

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export {
  apiSlice,
  tripSlice,
  userSlice,
  geoSlice,
  configSlice,
  ssoSlice,
  layoutSlice,
  storageSlice,
  vehicleSlice,
  positionSlice, citySlice, journeyMemorySlice
}
export const methods = {
  config: configMethods,
  api: apiMethods,
  user: userMethods,
  layout: layoutMethods,
  sso: ssoMethods,
  geo: geoMethods,
  trip: tripMethods,
  storage: storageMethods,
  vehicle: vehicleMethods,
  position: positionMethods,
  city: cityMethods,
  journeyMemory: journeyMemoryMethods
}

// console.log(store.getState())

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()

export default store
