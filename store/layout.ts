import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { protoRoot } from '../protos'
import { TabsTripType } from './config'
import store, { methods } from '.'
import { alert } from '@saki-ui/core'

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
    openVehicleModal: false,
    openReplayTripModal: false,
    openFindLocationModal: false,
    openCreateCustomTripModal: false,
    openVisitedCitiesModal: false,
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
    openTripFilterModal: false,
    editTripModal: false,
    editTripData: undefined as protoRoot.trip.ITrip | undefined,
    settingType: '',
    tripHistoryType: 'All' as TabsTripType,
  },
  reducers: {
    setOpenVisitedCitiesModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openVisitedCitiesModal = params.payload
    },
    setOpenCreateCustomTripModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openCreateCustomTripModal = params.payload
    },
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
    setOpenFindLocationModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openFindLocationModal = params.payload
    },

    setOpenReplayTripModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openReplayTripModal = params.payload
    },

    setOpenTripFilterModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openTripFilterModal = params.payload
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
    setOpenVehicleModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openVehicleModal = params.payload
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
