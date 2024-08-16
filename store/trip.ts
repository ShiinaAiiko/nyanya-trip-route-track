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

const modelName = 'trip'

export const state = {
	detailPage: {
		trip: undefined as protoRoot.trip.ITrip | null | undefined,
	},
	tripStatistics: [] as {
		type: TabsTripType
		count: number
		distance: number
		uselessData: string[]
		time: number
		list: protoRoot.trip.ITrip[]
	}[],
}

// export const isCorrectedData = async (trip: protoRoot.trip.ITrip) => {
// 	let tDistance = 0
// 	const tripPositions = await storage.tripPositions.get(trip?.id || '')

// 	if (!tripPositions) return -1
// 	if (tripPositions.correctedData) return tripPositions.correctedData

// 	const positions = formatPositionsStr(
// 		Number(tripPositions.startTime),
// 		tripPositions.positions || []
// 	)
// 	positions?.forEach((v, i) => {
// 		if (i > 0) {
// 			const lv = positions?.[i - 1]
// 			if (lv) {
// 				// console.log(
// 				// 	'distance',
// 				// 	getDistance(
// 				// 		v.latitude || 0,
// 				// 		v.longitude || 0,
// 				// 		lv.latitude || 0,
// 				// 		lv.longitude || 0
// 				// 	)
// 				// )
// 				tDistance += getDistance(
// 					v.latitude || 0,
// 					v.longitude || 0,
// 					lv.latitude || 0,
// 					lv.longitude || 0
// 				)

// 				tDistance = Math.round(tDistance * 10000) / 10000
// 			}
// 		}
// 	})

// 	console.log(
// 		'isCorrectedData',
// 		positions,
// 		tDistance,
// 		trip.statistics?.distance
// 	)

// 	trip.id &&
// 		(await storage.tripPositions.set(trip.id, {
// 			...tripPositions,
// 			correctedData: tDistance !== trip.statistics?.distance ? 1 : -1,
// 		}))

// 	return tDistance !== trip.statistics?.distance ? 1 : -1
// }

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

			let tDistance = 0

			// params.payload.positions?.sort((a, b) => {
			// 	return Number(a.timestamp) - Number(b.timestamp)
			// })

			params.payload.positions = params.payload.positions
				// ?.filter((v, i) => {
				// 	if (i > 0 && params.payload) {
				// 		const lv = params.payload.positions?.[i - 1]
				// 		if (lv) {
				// 			const speed =
				// 				getDistance(
				// 					v.latitude || 0,
				// 					v.longitude || 0,
				// 					lv.latitude || 0,
				// 					lv.longitude || 0
				// 				) /
				// 				(Number(v.timestamp) - Number(lv.timestamp))

				// 			return speed > 0
				// 		}
				// 	}
				// })
				?.map((v, i) => {
					if (i > 0 && params.payload) {
						const lv = params.payload.positions?.[i - 1]
						if (lv) {
							// console.log(
							// 	'distance',
							// 	getDistance(
							// 		v.latitude || 0,
							// 		v.longitude || 0,
							// 		lv.latitude || 0,
							// 		lv.longitude || 0
							// 	),
							// )
							tDistance += getDistance(
								v.latitude || 0,
								v.longitude || 0,
								lv.latitude || 0,
								lv.longitude || 0
							)
							tDistance = Math.round(tDistance * 10000) / 10000
						}
					}
					return {
						...v,
						distance: tDistance,
					}
				})

			state.detailPage.trip = {
				...params.payload,
			}
		},
		setTripStatistics: (
			state,
			params: {
				payload: (typeof state)['tripStatistics']
				type: string
			}
		) => {
			console.log('getTDistance1', params.payload)
			state.tripStatistics = params.payload
		},
	},
})

export const tripMethods = {}
