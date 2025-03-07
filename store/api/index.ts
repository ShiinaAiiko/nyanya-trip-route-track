import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { server } from '../../config'

export const apiMethods = {}

export const apiSlice = createSlice({
  name: 'api',
  initialState: {
    apiUrl: server.url,
    apiUrls: {
      v1: {
        baseUrl: '/api/v1',
        addTrip: '/trip/add',
        addTripMark: '/trip/mark/add',
        addTripToOnline: '/trip/addTripToOnline',
        updateTripPosition: '/trip/position/update',
        finishTrip: '/trip/finish',
        resumeTrip: '/trip/resume',
        correctedTripData: '/trip/correctedData',
        updateTrip: '/trip/update',
        updateTrips: '/trip/list/update',
        deleteTrip: '/trip/delete',
        getTrip: '/trip/get',
        getTripPositions: '/trip/positions/get',
        getTripHistoryPositions: '/trip/history/positions/get',
        getHistoricalStatistics: '/trip/historicalStatistics/get',
        getTripList: '/trip/list/get',
        getTripStatistics: '/trip/statistics/get',

        addVehicle: '/vehicle/add',
        getVehicles: '/vehicle/get/list',
        updateVehicle: '/vehicle/update',
        deleteVehicle: '/vehicle/delete',

        updateUserPosition: "/position/user/update",
        getUserPositionAndVehiclePosition: "/position/list/get",
        updateUserPositionShare: "/position/user/share/update",
        getUserPositionShare: "/position/user/share/get",

        syncConfigure: "/configure/sync",
        getConfigure: "/configure/get",


        updateCity: "/city/update",
        getCityDetails: "/city/details/list/get",
        getAllCitiesVisitedByUser: "/city/user/list/get",


        openGetTripStatistics: "/open/trip/statistics/get",
      },
    },
  },
  reducers: {},
  extraReducers: (builder) => { },
})
