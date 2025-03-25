import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
  PayloadAction,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { protoRoot, ForEachLongToNumber } from '../protos'
import { formatPositionsStr, getDistance } from '../plugins/methods'
import { eventListener, R, TabsTripType } from './config'
import { httpApi } from '../plugins/http/api'
import store, { layoutSlice, methods } from '.'
import { isLinearGradient } from 'html2canvas/dist/types/css/types/image'
import i18n from '../plugins/i18n/i18n'
import { alert, snackbar } from '@saki-ui/core'
import { AsyncQueue, Debounce, deepCopy, Wait } from '@nyanyajs/utils'
import { t } from 'i18next'
import { toolApiUrl } from '../config'
import { GeoJSON } from './city'
import moment from 'moment'
import { getAllTripPositions } from './trip'


const modelName = 'journeyMemory'




export const state = {
  pageTypes: [] as ('AddJM' | 'EditJM' | 'AddTripHere' | "JMDetail" | "AddJMTimeline" | 'EditJMTimeline' | '')[],
  loadBaseDataStatus: '',
  startScroll: false,
  loadStatus: "loaded",
  loadTimelineDetailStatus: "loaded",
  loadTimelineListStatus: "loaded",
  editJMTL: {} as protoRoot.journeyMemory.IJourneyMemoryTimelineItem,
  editJM: {} as protoRoot.journeyMemory.IJourneyMemoryItem,
  addTheVehicleIdOfTripHere: '',
  pageNum: 1,
  pageSize: 15,
  list: [] as protoRoot.journeyMemory.IJourneyMemoryItem[],
  tlList: [] as protoRoot.journeyMemory.IJourneyMemoryTimelineItem[],
  jmDetail: {} as protoRoot.journeyMemory.IJourneyMemoryItem,
  tlPageNum: 1,
  tlPageSize: 100,
  filterConfig: {
    startDate: '',
    endDate: '',
    selectedVehicleIds: [] as string[],
    selectedTripTypes: [] as string[],
    selectedTripIds: [] as string[],
    shortestDistance: 0,
    longestDistance: 500,
    showCustomTrip: false,
  } as protoRoot.configure.Configure.Filter.IFilterItem
}


type State = typeof state



type SetStatePayload<K extends keyof State> = {
  type: K;
  value: State[K];
};


export const journeyMemorySlice = createSlice({
  name: modelName,
  initialState: state,
  reducers: {
    setJMState: <K extends keyof State>(
      state: State,
      action: PayloadAction<SetStatePayload<K>>
    ) => {
      console.log("jmstate", action)
      state[action.payload.type] = action.payload.value
    },
  },
})

export const journeyMemoryMethods = {
  GetJMList: createAsyncThunk(modelName + '/GetJMList', async (
    { pageNum }: {
      pageNum: number
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    const { user, trip, journeyMemory } = store.getState()


    if (pageNum === 1) {
      dispatch(
        setJMState({
          type: "list",
          value: []
        })
      )
    } else {
      if (journeyMemory.loadStatus === "loading" || journeyMemory.loadStatus === "noMore") return
    }

    dispatch(
      setJMState({
        type: 'loadStatus',
        value: "loading"
      })
    )
    try {
      const res = await httpApi.v1.GetJMList({
        pageNum,
        pageSize: journeyMemory.pageSize,
      })
      console.log('GetJMList', res)
      if (res.code === 200 && res?.data?.list?.length) {
        dispatch(
          setJMState({
            type: 'list',
            value: res?.data?.list || [],
          })
        )

        if (res?.data?.list?.length === journeyMemory.pageSize) {
          dispatch(
            setJMState({
              type: 'loadStatus',
              value: "loaded"
            })
          )
          dispatch(
            setJMState({
              type: "pageNum",
              value: journeyMemory.pageNum + 1
            })
          )
        } else {
          dispatch(
            setJMState({
              type: 'loadStatus',
              value: "noMore"
            })
          )
        }
      }
    } catch (error) {
      console.error(error)
    }

  }),
  GetJMTLList: createAsyncThunk(modelName + '/GetJMTLList', async (
    { id, pageNum }: {
      pageNum: number
      id: string
    }, thunkAPI) => {
    const dispatch = thunkAPI.dispatch

    const { user, trip, journeyMemory } = store.getState()


    console.log('GetJMTimelineList', pageNum)
    if (pageNum === 1) {
      dispatch(
        setJMState({
          type: "tlList",
          value: []
        })
      )
    } else {
      if (journeyMemory.loadTimelineListStatus === "loading" || journeyMemory.loadTimelineListStatus === "noMore") return
    }

    dispatch(
      setJMState({
        type: 'loadTimelineListStatus',
        value: "loading"
      })
    )




    try {
      const res = await httpApi.v1.GetJMTimelineList({
        id,
        pageNum,
        pageSize: journeyMemory.tlPageSize,
      })
      console.log('GetJMTimelineList', res)
      if (res.code === 200 && res?.data?.list?.length) {
        dispatch(
          setJMState({
            type: 'tlList',
            value: sortTlList(res?.data?.list || []),
          })
        )

        const allPosRes = await getAllTripPositions({
          ids: res.data?.list?.reduce((ids, v) => {
            return ids.concat(v.tripIds || [])
          }, [] as string[]),
          pageSize: 15,
          loadingSnackbar: true,
        })
        console.log("getAllTripPositions allres", allPosRes)


        if (res?.data?.list?.length === journeyMemory.tlPageSize) {
          dispatch(
            setJMState({
              type: 'loadTimelineListStatus',
              value: "loaded"
            })
          )
          dispatch(
            setJMState({
              type: "tlPageNum",
              value: journeyMemory.tlPageNum = 1
            })
          )
        }
      }
      dispatch(
        setJMState({
          type: 'loadTimelineListStatus',
          value: "noMore"
        })
      )
    } catch (error) {
      console.error(error)
    }

  }),
}

export const { setJMState } = journeyMemorySlice.actions as {
  setJMState: <K extends keyof State>(payload: SetStatePayload<K>) => PayloadAction<SetStatePayload<K>>;
};

export const goPage = (pageType: typeof state["pageTypes"][number]) => {
  const jmState = store.getState().journeyMemory
  store.dispatch(
    setJMState({
      type: 'pageTypes',
      value: jmState.pageTypes.concat(pageType),
    })
  )
}

export const getCurrentPageType = () => {
  const jmState = store.getState().journeyMemory
  return jmState.pageTypes
    .slice(
      (jmState.pageTypes.length - 2, jmState.pageTypes.length - 1)
    )?.[0]
}

export const backPage = (pageIndex: number) => {
  const jmState = store.getState().journeyMemory
  store.dispatch(
    setJMState({
      type: 'pageTypes',
      value: jmState.pageTypes.slice(
        0,
        (jmState.pageTypes.length + pageIndex) < 0 ? 0 : (jmState.pageTypes.length + pageIndex)
      ),
    })
  )

}


export const sortTlList = (list: protoRoot.journeyMemory.IJourneyMemoryTimelineItem[]) => {



  const tempList = list.map(v => {
    let maxCreateTripTime = 0
    let minCreateTripTime = 9999999999
    v.trips?.forEach((sv) => {
      maxCreateTripTime = Math.max(
        maxCreateTripTime,
        Number(sv.createTime)
      )
      minCreateTripTime = Math.min(
        minCreateTripTime,
        Number(sv.createTime)
      )
    })
    return {
      maxCreateTripTime,
      minCreateTripTime,
      tl: v
    }
  })

  tempList.sort((a, b) => b.maxCreateTripTime - a.maxCreateTripTime)

  return tempList.map(v => v.tl)
}


export const deleteJM = (id: string) => {
  alert({
    title: t('deleteJourneyMemory', {
      ns: 'journeyMemoriesModal',
    }),
    content: t('confirmDeleteJourneyMemory', {
      ns: 'journeyMemoriesModal',
    }),
    cancelText: t('cancel', {
      ns: 'prompt',
    }),
    confirmText: t('delete', {
      ns: 'prompt',
    }),
    onCancel() { },
    async onConfirm() {
      const jmState = store.getState().journeyMemory
      const res = await httpApi.v1.DeleteJM({
        id,
      })

      console.log('DeleteJM', res)

      if (res.code === 200) {
        backPage(-2)

        store.dispatch(
          setJMState({
            type: "jmDetail",
            value: {}
          })
        )
        store.dispatch(
          setJMState({
            type: 'list',
            value: jmState.list.filter((v) => {
              return v.id !== id
            }),
          })
        )
        snackbar({
          message: t('deletedSuccessfully', {
            ns: 'prompt',
          }),
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
        }).open()
      }
    },
  }).open()
}