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
import { set } from 'nprogress'

export const R = new NRequest()

export type DeviceType = 'Mobile' | 'Pad' | 'PC'
export type LanguageType = Languages | 'system'
export let deviceType: DeviceType | undefined

export let osmMap = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export let cnMap =
	'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
cnMap =
	'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}'

export let maps = [
	{
		key: 'System',
		url: 'System',
	},
	{
		key: 'OpenStreetMap',
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	},
	{
		key: 'Amap',
		url: 'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
	},
	{
		key: 'GeoQNight',
		url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}',
	},
	{
		key: 'GeoQGrey',
		url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}',
	},
	{
		key: 'GeoQStreet',
		url: 'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetWarm/MapServer/tile/{z}/{y}/{x}',
	},
	{
		key: 'GeoQStreetPOI',
		url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}',
	},
]

export const language: LanguageType = defaultLanguage as any

export let country = ''
export let connectionOSM = true

const getMapUrlAuto = () => {
	setTimeout(() => {
		const { config } = store.getState()

		let key = ''
		if (config.map.key === 'System') {
			if (config.country && config.connectionOSM !== 0) {
				if (config.country === 'China') {
					key = 'GeoQStreetPOI'
				} else {
					if (config.connectionOSM === 1) {
						key = 'OpenStreetMap'
					} else {
						key = 'GeoQStreetPOI'
					}
				}
			} else {
				return
			}
		} else {
			key = config.map.key
		}
		console.log(
			'getMapUrlAuto',
			config.map.key,
			config.country,
			config.connectionOSM,
			key
		)
		const v = maps.filter((v) => {
			return v.key === key
		})[0]
		console.log(v.url)
		store.dispatch(configSlice.actions.setMapUrl(v.url))
	}, 0)
}

export const configSlice = createSlice({
	name: 'config',
	initialState: {
		language: language,
		lang: '',
		languages: ['system', ...languages],
		deviceType,
		country: '',
		connectionOSM: 0,
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
		map: {
			key: 'System',
			url: '',
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
			country = state.country

			getMapUrlAuto()
		},
		setConnectionOSM: (state, params: ActionParams<number>) => {
			state.connectionOSM = params.payload

			getMapUrlAuto()
		},
		setMapUrl: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			state.map.url = params.payload
		},
		setMapKey: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			const v = maps.filter((v) => {
				return v.key === params.payload
			})[0]
			state.map = v
		},
	},
})
export const configMethods = {
	init: createAsyncThunk('config/init', async (_, thunkAPI) => {
		const language = (await storage.global.get('language')) || 'system'
		thunkAPI.dispatch(configMethods.setLanguage(language))

		const map = (await storage.global.get('map')) || 'System'
		thunkAPI.dispatch(configMethods.setMapKey(map))
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
	setMapKey: createAsyncThunk(
		'config/setMapKey',
		async (mapKey: string, thunkAPI) => {
			thunkAPI.dispatch(configSlice.actions.setMapKey(mapKey))
			await storage.global.set('map', mapKey)
			getMapUrlAuto()
		}
	),
}
