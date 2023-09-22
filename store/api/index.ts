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
				addTripToOnline: '/trip/addTripToOnline',
				updateTripPosition: '/trip/position/update',
				finishTrip: '/trip/finish',
				updateTrip: '/trip/update',
				deleteTrip: '/trip/delete',
				getTrip: '/trip/get',
				getTripList: '/trip/list/get',
				getTripStatistics: '/trip/statistics/get',
			},
		},
	},
	reducers: {},
	extraReducers: (builder) => {},
})
