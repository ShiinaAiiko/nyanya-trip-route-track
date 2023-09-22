import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { protoRoot } from '../protos'

const modelName = 'trip'
const state = {
	detailPage: {
		trip: undefined as protoRoot.trip.ITrip | null | undefined,
	},
}
export const tripSlice = createSlice({
	name: modelName,
	initialState: state,
	reducers: {
		setTripForDetailPage: (
			state,
			params: {
				payload: (typeof state)['detailPage']['trip']
				type: string
			}
		) => {
			if (!params.payload) {
				state.detailPage.trip = {}
				return
			}

			state.detailPage.trip = {
				...params.payload,
			}
		},
	},
})

export const tripMethods = {}
