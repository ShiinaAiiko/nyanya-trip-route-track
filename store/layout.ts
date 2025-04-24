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
// import { MediaItem } from './file'

export const layoutMethods = {}

export type ModalType =
  | 'TripEdit'
  | 'Settings'
  | 'Login'
  | 'TripHistory'
  | 'ReplayTrip'
  | 'AddVehicle'
  | 'VisitedCities'
  | 'JourneyMemories'
  | 'CreateCustomTrip'
  | 'FindLocation'
  | 'ImagesWaterfall'
  | 'MapLayer'

export interface IWMediaItem
  extends protoRoot.journeyMemory.IJourneyMemoryMediaItem {
  tlItem: protoRoot.journeyMemory.IJourneyMemoryTimelineItem
}

export const defaultMapLayerModalFeaturesList = {
  mapLayer: true,
  mapMode: true,
  roadColorFade: true,
  showAvatarAtCurrentPosition: true,
  showSpeedColor: true,
  cityName: true,
  cityBoundaries: true,
  tripTrackRoute: true,
  speedAnimation: true,
  turnOnVoice: true,
  showPositionMarker: true,
  trackSpeedColor: true,
  trackRouteColor: true,
  polylineWidth: true,
  speedColorLimit: true,
}

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
    openVisitedCitiesModal: {
      visible: false,
      title: '',
      tripIds: [] as string[],
    },
    openJourneyMemoriesModal: false,
    openHistoricalTripsDetailedDataModal: false,
    openStatisticsModal: {
      visible: false,
      type: '' as TabsTripType,
    },
    openTripItemModal: {
      visible: false,
      id: '',
    },
    openMapLayerModal: {
      visible: false,
      mapLayerType: '' as keyof protoRoot.configure.Configure.IMapLayer,
      mapLayerConfig:
        {} as protoRoot.configure.Configure.MapLayer.IMapLayerItem,
      modalConfig: {
        vertical: 'Bottom',
        horizontal: 'Left',
        offsetX: '20px',
        offsetY: '50px',
      } as {
        vertical: 'Bottom' | 'Top' | 'Center'
        horizontal: 'Center' | 'Left' | 'Right'
        offsetX: string
        offsetY: string
      },
      featuresList: defaultMapLayerModalFeaturesList,
    },
    openTripTrackRoute: false,
    openTripFilterModal: false,
    openImagesWaterfallModal: {
      visible: false,
      title: '',
      mediaList: [] as IWMediaItem[],
    },
    editTripModal: false,
    editTripData: undefined as protoRoot.trip.ITrip | undefined,
    settingType: '',
    tripHistoryType: 'All' as TabsTripType,

    loadModals: {} as {
      [type: string]: (() => void)[]
    },
  },
  reducers: {
    setLoadModals: (
      state,
      params: {
        payload: typeof state.loadModals
        type: string
      }
    ) => {
      console.log('TripHistory', params.payload)
      state.loadModals = params.payload
    },
    setOpenImagesWaterfallModalMediaList: (
      state,
      params: {
        payload: {
          mediaList: IWMediaItem[]
          title: string
        }
        type: string
      }
    ) => {
      state.openImagesWaterfallModal.mediaList = params.payload.mediaList
      state.openImagesWaterfallModal.title = params.payload.title || ''
    },
    setOpenImagesWaterfallModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openImagesWaterfallModal.visible = params.payload
      if (!params.payload) {
        state.openImagesWaterfallModal.mediaList = []
      }
    },
    setOpenJourneyMemoriesModal: (
      state,
      params: {
        payload: boolean
        type: string
      }
    ) => {
      state.openJourneyMemoriesModal = params.payload
      // console.log('setOpenJourneyMemoriesModal ', state.openJourneyMemoriesModal)
    },
    setOpenVisitedCitiesModal: (
      state,
      params: {
        payload: {
          visible: boolean
          title?: string
          tripIds?: string[]
        }
        type: string
      }
    ) => {
      state.openVisitedCitiesModal.visible = params.payload.visible
      state.openVisitedCitiesModal.title = params.payload?.title || ''
      state.openVisitedCitiesModal.tripIds = params.payload?.tripIds || []
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
    setOpenMapLayerModalFeaturesList: (
      state,
      params: {
        payload: typeof defaultMapLayerModalFeaturesList
        type: string
      }
    ) => {
      state.openMapLayerModal.featuresList = params.payload
    },
    setOpenMapLayerModal: (
      state,
      params: {
        payload: {
          visible: boolean
          mapLayerType?: keyof protoRoot.configure.Configure.IMapLayer
          mapLayerConfig?: protoRoot.configure.Configure.MapLayer.IMapLayerItem

          modalConfig?: typeof state.openMapLayerModal.modalConfig
        }
        type: string
      }
    ) => {
      if (params.payload.mapLayerType) {
        state.openMapLayerModal.mapLayerType = params.payload.mapLayerType
      }
      if (params.payload.mapLayerConfig) {
        state.openMapLayerModal.mapLayerConfig = params.payload.mapLayerConfig
      }
      if (params.payload.modalConfig) {
        state.openMapLayerModal.modalConfig = params.payload.modalConfig
      }

      state.openMapLayerModal.visible = params.payload.visible
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

export const loadModal = (type: ModalType, onLoad: () => void) => {
  const { layout } = store.getState()

  const results = { ...layout.loadModals }

  if (!results[type]) {
    results[type] = []
  }
  results[type].push(onLoad)
  store.dispatch(layoutSlice.actions.setLoadModals(results))
}
