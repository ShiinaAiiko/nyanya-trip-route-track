import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'

export const layoutMethods = {}
export const layoutSlice = createSlice({
	name: 'layout',
	initialState: {
		header: false,
		footer: true,
		bottomNavigator: true,
		headerLogoText: '',
		openSettingsModal: false,
		openLoginModal: false,
		openTripHistoryModal: false,
		settingType: '',
		tripHistoryType: 'All' as 'All' | 'Running' | 'Bike' | 'Drive',
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
	},
})
