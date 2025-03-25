import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams, layoutSlice, methods, RootState } from '.'
import { UserAgent } from '@nyanyajs/utils/dist/userAgent'
import nyanyajs, { deepCopy } from '@nyanyajs/utils'

// import { WebStorage } from './ws'
import { storage } from './storage'
import { getI18n } from 'react-i18next'

import { stringify } from 'querystring'
import { resolve } from 'path'
import { nanoid } from 'nanoid'
import { client } from './sso'
import { alert, snackbar } from '@saki-ui/core'
import i18n from '../plugins/i18n/i18n'
import { loadModal } from './layout'

export const modeName = 'user'

const t = i18n.t

export const userMethods = {
  Init: createAsyncThunk<
    void,
    void,
    {
      state: RootState
    }
  >(modeName + '/Init', async (_, thunkAPI) => {
    thunkAPI.dispatch(
      userSlice.actions.setUserAgent(
        nyanyajs.userAgent(window.navigator.userAgent)
      )
    )
  }),
  InitUser: createAsyncThunk<
    void,
    void,
    {
      state: RootState
    }
  >(modeName + '/InitUser', async (_, thunkAPI) => {
    // 获取配置
    // console.log(await storage.config.get('language'))
    // thunkAPI.dispatch(userSlice.actions.setInit(false))
    const { user, config } = thunkAPI.getState()
    console.log('校验token是否有效')
    const token = await storage.global.get('token')
    const deviceId = await storage.global.get('deviceId')
    const userInfo = await storage.global.get('userInfo')
    if (token) {
      thunkAPI.dispatch(
        userSlice.actions.login({
          token: token,
          deviceId: deviceId,
          userInfo: userInfo,
        })
      )
      // 检测网络状态情况
      await thunkAPI
        .dispatch(
          methods.user.checkToken({
            token,
            deviceId,
          })
        )
        .unwrap()
    } else {
      thunkAPI.dispatch(userSlice.actions.logout({}))
    }
    thunkAPI.dispatch(userSlice.actions.setInit(true))
  }),
  checkToken: createAsyncThunk(
    modeName + '/checkToken',
    async (
      {
        token,
        deviceId,
      }: {
        token: string
        deviceId: string
      },
      thunkAPI
    ) => {
      try {
        const res = await client?.checkToken({
          token,
          deviceId,
        })
        console.log('res checkToken GetVehicles', res)
        if (res) {
          // console.log('登陆成功')
          thunkAPI.dispatch(
            userSlice.actions.login({
              token: res.token,
              deviceId: res.deviceId,
              userInfo: res.userInfo,
            })
          )

          thunkAPI.dispatch(
            userSlice.actions.setIsLogin(true)
          )

        } else {
          thunkAPI.dispatch(userSlice.actions.logout({}))
        }
      } catch (error) { }
    }
  ),
  logout: createAsyncThunk(modeName + '/logout', async (_, thunkAPI) => {
    alert({
      title: t('logout', {
        ns: 'prompt',
      }),
      content: t('logoutContent', {
        ns: 'prompt',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('logout', {
        ns: 'prompt',
      }),
      onCancel() { },
      async onConfirm() {
        thunkAPI.dispatch(userSlice.actions.logout({}))
        snackbar({
          message: t('logoutSuccessfully', {
            ns: 'prompt',
          }),
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
          backgroundColor: 'var(--saki-default-color)',
          color: '#fff',
        }).open()
      },
    }).open()
  }),
  loginAlert: createAsyncThunk(modeName + '/loginAlert', async (_, thunkAPI) => {
    alert({
      title: t('login', {
        ns: 'common',
      }),
      content: t('noLoginTrip', {
        ns: 'prompt',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('login', {
        ns: 'common',
      }),
      onCancel() { },
      async onConfirm() {

        loadModal('Login', () => {
          thunkAPI.dispatch(layoutSlice.actions.setOpenLoginModal(true))
        })

      },
    }).open()
  }),
}

export type UserInfo = {
  uid: string
  username: string
  email: string
  phone: string
  nickname: string
  avatar: string
  bio: string
  city: string[]
  gender: -1 | 1 | 2 | 3 | 4 | 5
  birthday: string
  status: -1 | 0 | 1
  additionalInformation: {
    [k: string]: any
  }
  appData: {
    [k: string]: any
  }
  creationTime: number
  lastUpdateTime: number
  lastSeenTime: number
}

export let userInfo: UserInfo = {
  uid: '',
  username: '',
  email: '',
  phone: '',
  nickname: '',
  avatar: '',
  bio: '',
  city: [],
  gender: -1,
  birthday: '',
  status: -1,
  additionalInformation: {},
  appData: {},
  creationTime: -1,
  lastUpdateTime: -1,
  lastSeenTime: -1,
}
// export let userAgent = nyanyajs.userAgent(window.navigator.userAgent)
export const userSlice = createSlice({
  name: modeName,
  initialState: {
    userAgent: {} as UserAgent,
    token: '',
    deviceId: '',
    userInfo,
    isLogin: false,
    isInit: false,
  },
  reducers: {
    setInit: (state, params: ActionParams<boolean>) => {
      state.isInit = params.payload
    },
    setIsLogin: (state, params: ActionParams<boolean>) => {
      state.isLogin = params.payload
    },
    setUserAgent: (state, params: ActionParams<UserAgent>) => {
      state.userAgent = params.payload
    },
    login: (
      state,
      params: ActionParams<{
        token: string
        deviceId: string
        userInfo: UserInfo
      }>
    ) => {
      const { token, deviceId, userInfo } = params.payload
      state.token = token || ''
      state.deviceId = deviceId || ''
      state.userInfo = userInfo || Object.assign({}, userInfo)

      console.log('user GetVehicles', deepCopy(state))
      if (token) {
        storage.global.setSync('token', token)
        storage.global.setSync('deviceId', deviceId)
        storage.global.setSync('userInfo', userInfo)
      }
      setTimeout(() => {
        // store.dispatch(storageSlice.actions.init(userInfo.uid))
      })
      // store.dispatch(userSlice.actions.init({}))
    },
    logout: (state, _) => {
      storage.global.delete('token')
      storage.global.delete('deviceId')
      storage.global.delete('userInfo')
      state.token = ''
      state.deviceId = ''
      state.userInfo = Object.assign({}, userInfo)
      state.isLogin = false
    },
  },
})
