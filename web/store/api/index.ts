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
        clearTripCities: '/trip/cities/clear',
        clearTripRoads: '/trip/roads/clear',
        UpdateTripAddresses: '/trip/addresses/update',
        UpdateTripNetworkStatus: '/trip/networkStatus/update',
        UpdateTripWeather: '/trip/weather/update',

        addVehicle: '/vehicle/add',
        getVehicles: '/vehicle/get/list',
        updateVehicle: '/vehicle/update',
        deleteVehicle: '/vehicle/delete',

        updateUserPosition: '/position/user/update',
        getUserPositionAndVehiclePosition: '/position/list/get',
        updateUserPositionShare: '/position/user/share/update',
        getUserPositionShare: '/position/user/share/get',

        syncConfigure: '/configure/sync',
        getConfigure: '/configure/get',

        updateCity: '/city/update',
        getCityDetails: '/city/details/list/get',
        getAllCitiesVisitedByUser: '/city/user/list/get',

        updateRoad: '/road/update',

        openGetTripStatistics: '/open/trip/statistics/get',

        addJM: '/journeyMemory/add',
        updateJM: '/journeyMemory/update',
        getJMDetail: '/journeyMemory/detail/get',
        getJMList: '/journeyMemory/list/get',
        deleteJM: '/journeyMemory/delete',
        AddJMTimeline: '/journeyMemory/timeline/add',
        UpdateJMTimeline: '/journeyMemory/timeline/update',
        GetJMTimelineList: '/journeyMemory/timeline/list/get',
        DeleteJMTimeline: '/journeyMemory/timeline/delete',

        addRoadbook: '/roadbook/add',
        GetRoadbookList: '/roadbook/list/get',
        GetRoadbookDetail: '/roadbook/detail/get',
        UpdateRoadbook: '/roadbook/update',
        DeleteRoadbook: '/roadbook/delete',

        GetUploadToken: '/file/getUploadToken',
        GetAppToken: '/file/appToken/get',

        setPrivacyGeofence: '/privacyGeofence/set',
        getPrivacyGeofence: '/privacyGeofence/get',

        GetNavigationData: '/navigation/get',

        AIRoadbook: '/ai/roadbook',
        AICoDriver: '/ai/coDriver',
      },
    },
  },
  reducers: {},
  extraReducers: (builder) => {},
})
