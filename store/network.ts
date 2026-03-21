import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Debounce } from '@nyanyajs/utils'
import { ActionParams } from '.'

const listenNetworkChange = (f: () => void) => {
  const d = new Debounce()
  window.addEventListener('online', () => {
    d.increase(() => {
      f()
    }, 300)
  })

  window.addEventListener('offline', () => {
    d.increase(() => {
      f()
    }, 300)
  })

  const conn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection

  if (conn) {
    // 监听网络变化（网络类型、速度、延迟等）
    conn.addEventListener('change', () => {
      d.increase(() => {
        f()
      }, 300)
    })
  }
}

const defaultState = {
  modelName: 'nextwork',
  status: 'offline' as 'online' | 'offline',
}

export const networkSlice = createSlice({
  name: defaultState.modelName,
  initialState: defaultState,
  reducers: {
    setStatus: (state, params: ActionParams<(typeof state)['status']>) => {
      state.status = params.payload
    },
  },
})

export const networkMethods = {
  Init: createAsyncThunk(
    defaultState.modelName + '/Init',
    async (_, thunkAPI) => {
      thunkAPI.dispatch(
        networkSlice.actions.setStatus(navigator.onLine ? 'online' : 'offline')
      )

      listenNetworkChange(() => {
        thunkAPI.dispatch(
          networkSlice.actions.setStatus(
            navigator.onLine ? 'online' : 'offline'
          )
        )
      })
    }
  ),
}
