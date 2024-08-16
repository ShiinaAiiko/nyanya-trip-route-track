import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import { protoRoot } from '../protos'
import { TabsTripType } from './config'

export const layoutMethods = {}
export const layoutSlice = createSlice({
	name: 'layout',
	initialState: {
		header: false,
		footer: true,
		bottomNavigator: true,
		headerLogoText: '',
		headerFiexd: false,
		openSettingsModal: false,
		openLoginModal: false,
		openTripHistoryModal: false,
		openHistoricalTripsDetailedDataModal: false,
		openStatisticsModal: {
			visible: false,
			type: '' as TabsTripType,
		},
		openTripItemModal: {
			visible: false,
			id: '',
		},
		openMapLayerModal: false,
		openTripTrackRoute: false,
		openTripTrackFilterModal: false,
		editTripModal: false,
		editTripData: undefined as protoRoot.trip.ITrip | undefined,
		settingType: '',
		tripHistoryType: 'All' as TabsTripType,
	},
	reducers: {
		setLayoutHeader: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.header = params.payload
		},
		setOpenTripTrackRoute: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.openTripTrackRoute = params.payload
		},
		setOpenTripTrackFilterModal: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.openTripTrackFilterModal = params.payload
		},
		setOpenMapLayerModal: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.openMapLayerModal = params.payload
		},
		setEditTripModal: (
			state,
			params: {
				payload: {
					visible: boolean
					trip?: protoRoot.trip.ITrip
				}
				type: string
			}
		) => {
			state.editTripModal = params.payload.visible
			state.editTripData = params.payload.trip
		},
		setLayoutHeaderFixed: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.headerFiexd = params.payload
		},
		setLayoutHeaderLogoText: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			state.headerLogoText = params.payload
		},
		setLayoutFooter: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.footer = params.payload
		},
		setBottomNavigator: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.bottomNavigator = params.payload
		},
		setOpenSettingsModal: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.openSettingsModal = params.payload
		},
		setOpenLoginModal: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			state.openLoginModal = params.payload
		},
		setOpenTripHistoryModal: (
			state,
			params: {
				payload: boolean
				type: string
			}
		) => {
			console.log(params.payload, 'setOpenTripHistoryModal')
			state.openTripHistoryModal = params.payload
		},
		setOpenStatisticsModal: (
			state,
			params: {
				payload: (typeof state)['openStatisticsModal']
				type: string
			}
		) => {
			state.openStatisticsModal = params.payload
		},
		setOpenTripItemModal: (
			state,
			params: {
				payload: (typeof state)['openTripItemModal']
				type: string
			}
		) => {
			state.openTripItemModal = params.payload
		},
		setSettingType: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			state.settingType = params.payload
		},
		setTripHistoryType: (
			state,
			params: {
				payload: (typeof state)['tripHistoryType']
				type: string
			}
		) => {
			state.tripHistoryType = params.payload
		},
		setOpenHistoricalTripsDetailedDataModal: (
			state,
			params: {
				payload: (typeof state)['openHistoricalTripsDetailedDataModal']
				type: string
			}
		) => {
			state.openHistoricalTripsDetailedDataModal = params.payload
		},
	},
})
