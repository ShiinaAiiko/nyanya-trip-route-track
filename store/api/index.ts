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
				correctedTripData: '/trip/correctedData',
				updateTrip: '/trip/update',
				deleteTrip: '/trip/delete',
				getTrip: '/trip/get',
				getTripPositions: '/trip/positions/get',
				getTripHistoryPositions: '/trip/history/positions/get',
				getHistoricalStatistics: '/trip/historicalStatistics/get',
				getTripList: '/trip/list/get',
				getTripStatistics: '/trip/statistics/get',
			},
		},
	},
	reducers: {},
	extraReducers: (builder) => {},
})
