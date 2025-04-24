import { createSlice, createAsyncThunk, combineReducers, configureStore } from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams } from '.'
import { WebStorage } from '@nyanyajs/utils'
import { protoRoot } from '../protos'
import { GeoJSON } from './city'
// import { User } from './user'
// import { WebStorage } from './webStorage'

export let storage = {
  global: new WebStorage({
    storage: 'IndexedDB',
    baseLabel: 'global',
  }),
  // token: new WebStorage<string, string>({
  // 	storage: 'IndexedDB',
  // 	baseLabel: 'token',
  // }),
  trips: new WebStorage<string, protoRoot.trip.ITrip>({
    storage: 'IndexedDB',
    baseLabel: 'trips',
  }),
  tripPositions: new WebStorage<string, protoRoot.trip.ITripPositions>({
    storage: 'IndexedDB',
    baseLabel: 'tripPositions',
  }),
  simplifyTripPositions: new WebStorage<string, protoRoot.trip.ITripPosition[]>({
    storage: 'IndexedDB',
    baseLabel: 'simplifyTripPositions',
  }),
  cityDetails: new WebStorage<string, protoRoot.trip.ITripCity>({
    storage: 'IndexedDB',
    baseLabel: 'cityDetails',
  }),
  cityBoundaries: new WebStorage<string, GeoJSON>({
    storage: 'IndexedDB',
    baseLabel: 'cityBoundaries',
  }),
}

export const storageSlice = createSlice({
  name: 'storage',
  initialState: {
    // 未来改nodefs
  },
  reducers: {
    init: (state) => {
      let uid = 0
    },
  },
})

export const storageMethods = {
  init: createAsyncThunk('storage/init', async ({}, thunkAPI) => {
    return
  }),
  clearCache: createAsyncThunk('storage/clearCache', async ({}, thunkAPI) => {
    console.log('storageMethods ')
    // storage.tripPositions.deleteAll()
  }),
}
