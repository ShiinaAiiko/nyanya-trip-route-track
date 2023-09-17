import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import { getI18n } from 'react-i18next'
import store, { ActionParams } from '.'
import { WebStorage, NRequest, SAaSS, NEventListener } from '@nyanyajs/utils'

import { Languages, languages, defaultLanguage } from '../plugins/i18n/i18n'
import { storage } from './storage'

export const R = new NRequest()

export type DeviceType = 'Mobile' | 'Pad' | 'PC'
export type LanguageType = Languages | 'system'
export let deviceType: DeviceType | undefined

export let cnMap =
	'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
cnMap =
	'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}'

export const language: LanguageType = defaultLanguage as any
export const configSlice = createSlice({
	name: 'config',
	initialState: {
		language: language,
		lang: '',
		languages: ['system', ...languages],
		deviceType,
		country: '',
		connectionOSM: true,
		speedColor: {
			running: {
				minSpeed: 1.38,
				maxSpeed: 4.16,
			},
			bike: {
				minSpeed: 4.16,
				maxSpeed: 8.33,
			},
			drive: {
				minSpeed: 8.33,
				maxSpeed: 16.66,
			},
		} as {
			[type: string]: {
				minSpeed: number
				maxSpeed: number
			}
		},
	},
	reducers: {
		setLanguage: (
			state,
			params: {
				payload: LanguageType
				type: string
			}
		) => {
			state.language = params.payload
		},
		setLang: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			state.lang = params.payload
		},
		setDeviceType: (state, params: ActionParams<DeviceType>) => {
			state.deviceType = params.payload
		},
		setCountry: (state, params: ActionParams<string>) => {
			state.country = params.payload
		},
		setConnectionOSM: (state, params: ActionParams<boolean>) => {
			state.connectionOSM = params.payload
		},
	},
})
export const configMethods = {
	init: createAsyncThunk('config/init', async (_, thunkAPI) => {
		const language = (await storage.global.get('language')) || 'system'
		thunkAPI.dispatch(configMethods.setLanguage(language))
	}),
	setLanguage: createAsyncThunk(
		'config/setLanguage',
		async (language: LanguageType, thunkAPI) => {
			thunkAPI.dispatch(configSlice.actions.setLanguage(language))

			// console.log('navigator.language', language, navigator.language)
			if (language === 'system') {
				const languages = ['zh-CN', 'zh-TW', 'en-US']
				if (languages.indexOf(navigator.language) >= 0) {
					getI18n().changeLanguage(navigator.language)
				} else {
					switch (navigator.language.substring(0, 2)) {
						case 'zh':
							getI18n().changeLanguage('zh-CN')
							break
						case 'en':
							getI18n().changeLanguage('en-US')
							break

						default:
							getI18n().changeLanguage('en-US')
							break
					}
				}
			} else {
				getI18n().changeLanguage(language)
			}

			store.dispatch(configSlice.actions.setLang(getI18n().language))

			await storage.global.set('language', language)
		}
	),
	getDeviceType: createAsyncThunk('config/getDeviceType', (_, thunkAPI) => {
		console.log('getDeviceType', document.body.offsetWidth)

		if (document.body.offsetWidth <= 768) {
			thunkAPI.dispatch(configSlice.actions.setDeviceType('Mobile'))
			return
		}
		if (document.body.offsetWidth <= 1024 && document.body.offsetWidth > 768) {
			thunkAPI.dispatch(configSlice.actions.setDeviceType('Pad'))
			return
		}
		thunkAPI.dispatch(configSlice.actions.setDeviceType('PC'))
	}),
}
