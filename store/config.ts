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

export type TripType =
	| 'Running'
	| 'Bike'
	| 'Drive'
	| 'Motorcycle'
	| 'Walking'
	| 'PowerWalking'
	| 'Local'
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
		key: 'AutoSelect',
		url: 'AutoSelect',
	},
	{
		key: 'OpenStreetMap',
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	},
	{
		key: 'Google',
		url: 'https://www.google.com/maps/vt?lyrs=m@189&gl=cn&x={x}&y={y}&z={z}',
	},
	{
		key: 'GoogleSatellite',
		url: 'https://www.google.com/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}',
	},
	{
		key: 'Amap',
		url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
	},
	{
		key: 'AmapSatellite',
		url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
	},
	{
		key: 'GeoQBase',
		url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}',
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
		key: 'GeoQWarm',
		url: 'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetWarm/MapServer/tile/{z}/{y}/{x}',
	},
	{
		key: 'GeoQStreet',
		url: 'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetWarm/MapServer/tile/{z}/{y}/{x}',
	},
]

export const language: LanguageType = defaultLanguage as any

export let country = ''
export let connectionOSM = true

export let speedColorRGBs: string[] = []

export let eventListener = new NEventListener()

export const getSpeedColors = (type: 'RedGreen' | 'PinkBlue') => {
	speedColorRGBs = []
	if (type === 'PinkBlue') {
		let r = 88
		let g = 200
		let b = 242
		for (let i = 0; i < 20; i++) {
			g = 200 - Math.floor((19 / 10) * i)
			if (i < 10) {
				r = 140 + Math.floor(((200 - 92) / 10) * i)
			} else {
				b = 242 - Math.floor(((200 - 128) / 10) * (i - 10))
			}

			speedColorRGBs.push(`rgb(${r},${g},${b})`)
		}
		return
	}

	let r = 140
	let g = 200
	let b = 70
	for (let i = 0; i < 20; i++) {
		if (i < 10) {
			r = 140 + Math.floor(((200 - 100) / 10) * i)
		} else {
			g = 200 - Math.floor(((200 - 100) / 10) * (i - 10))
		}

		speedColorRGBs.push(`rgb(${r},${g},${b})`)
	}
}

export const getTrackRouteColor = (type: 'Blue' | 'Pink' | 'Red') => {
	if (type === 'Blue') {
		return '#4af0fe'
	}
	if (type === 'Pink') {
		return '#f29cb2'
	}
	return '#e66e46'
}

const getMapUrlAuto = () => {
	setTimeout(() => {
		const { config } = store.getState()

		let key = ''
		if (config.mapKey === 'AutoSelect') {
			if (config.country && config.connectionOSM !== 0) {
				if (config.country === 'China') {
					key = 'Amap'
				} else {
					if (config.connectionOSM === 1) {
						key = 'OpenStreetMap'
					} else {
						key = 'Amap'
					}
				}
			} else {
				return
			}
		} else {
			key = config.mapKey
		}
		// console.log(
		// 	'getMapUrlAuto',
		// 	config.map.key,
		// 	config.country,
		// 	config.connectionOSM,
		// 	key
		// )
		const v = maps.filter((v) => {
			return v.key === key
		})[0]
		console.log(v?.url)
		store.dispatch(configSlice.actions.setMapUrl(v?.url))
	}, 0)
}

const getTrackRouteMapUrlAuto = () => {
	setTimeout(() => {
		const { config } = store.getState()

		let key = ''
		if (config.trackRouteMapKey === 'AutoSelect') {
			if (config.country && config.connectionOSM !== 0) {
				if (config.country === 'China') {
					key = 'GeoQNight'
				} else {
					if (config.connectionOSM === 1) {
						key = 'OpenStreetMap'
					} else {
						key = 'GeoQNight'
					}
				}
			} else {
				return
			}
		} else {
			key = config.trackRouteMapKey
		}
		const v = maps.filter((v) => {
			return v.key === key
		})[0]
		store.dispatch(configSlice.actions.setTrackRouteMapUrl(v?.url))
	}, 0)
}

const tempRealtimeTravelTrackWidth = 4
const tempHistoryTravelTrackWidth = 1

export const configSlice = createSlice({
	name: 'config',
	initialState: {
		language: language,
		lang: '',
		languages: ['system', ...languages],
		deviceType,
		country: '',
		connectionOSM: 0,
		mapPolyline: {
			realtimeTravelTrackWidth: tempRealtimeTravelTrackWidth,
			historyTravelTrackWidth: tempHistoryTravelTrackWidth,
		},
		mapKey: 'AutoSelect',
		mapUrl: 'AutoSelect',
		trackRouteMapKey: 'AutoSelect',
		trackRouteMapUrl: 'AutoSelect',
		// map: {
		// 	key: 'AutoSelect',
		// 	url: '',
		// },
		speedColorLimit: {
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
				maxSpeed: 22.22,
			},
			motorcycle: {
				minSpeed: 8.33,
				maxSpeed: 22.22,
			},
			walking: {
				minSpeed: 8.33,
				maxSpeed: 16.66,
			},
			powerwalking: {
				minSpeed: 1.38,
				maxSpeed: 2.77,
			},
		} as {
			[type: string]: {
				minSpeed: number
				maxSpeed: number
			}
		},

		speedColorType: 'RedGreen' as 'RedGreen' | 'PinkBlue',
		trackRouteColor: 'Blue' as 'Blue' | 'Pink' | 'Red',
		tripTypes: [
			'Running',
			'Bike',
			'Drive',
			'Walking',
			'PowerWalking',
			'Motorcycle',
			'Local',
		] as TripType[],

		selectedTripTypes: [] as string[],
		selectedTripIds: [] as string[],

		updateTimeForTripHistoryList: 0,
	},
	reducers: {
		setTrackRouteColor: (
			state,
			params: {
				payload: 'Blue' | 'Pink' | 'Red'
				type: string
			}
		) => {
			state.trackRouteColor = params.payload
		},
		setSelectedTripTypes: (
			state,
			params: {
				payload: string[]
				type: string
			}
		) => {
			state.selectedTripTypes = params.payload
		},
		setSelectedTripIds: (
			state,
			params: {
				payload: string[]
				type: string
			}
		) => {
			state.selectedTripIds = params.payload
		},
		setUpdateTimeForTripHistoryList: (
			state,
			params: {
				payload: number
				type: string
			}
		) => {
			state.updateTimeForTripHistoryList = params.payload
		},
		setSpeedColorType: (
			state,
			params: {
				payload: 'RedGreen' | 'PinkBlue'
				type: string
			}
		) => {
			state.speedColorType = params.payload
		},
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
			getTrackRouteMapUrlAuto()
		},
		setConnectionOSM: (state, params: ActionParams<number>) => {
			state.connectionOSM = params.payload

			getMapUrlAuto()
			getTrackRouteMapUrlAuto()
		},
		setMapUrl: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			state.mapUrl = params.payload
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
			state.mapKey = v.key
			state.mapUrl = v.url
		},
		setTrackRouteMapUrl: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			state.trackRouteMapUrl = params.payload
		},
		setTrackRouteMapKey: (
			state,
			params: {
				payload: string
				type: string
			}
		) => {
			const v = maps.filter((v) => {
				return v.key === params.payload
			})[0]
			state.trackRouteMapKey = v.key
			state.trackRouteMapUrl = v.url
		},
		setRealtimeTravelTrackWidth: (
			state,
			params: {
				payload: number
				type: string
			}
		) => {
			state.mapPolyline.realtimeTravelTrackWidth = params.payload
			storage.global.setSync(
				'mapPolylineRealtimeTravelTrackWidth',
				params.payload
			)
		},
		setHistoryTravelTrackWidth: (
			state,
			params: {
				payload: number
				type: string
			}
		) => {
			state.mapPolyline.historyTravelTrackWidth = params.payload
			storage.global.setSync(
				'mapPolylineHistoryTravelTrackWidth',
				params.payload
			)
		},
	},
})
export const configMethods = {
	init: createAsyncThunk('config/init', async (_, thunkAPI) => {
		const language = (await storage.global.get('language')) || 'system'
		thunkAPI.dispatch(configMethods.setLanguage(language))

		const map = (await storage.global.get('map')) || 'AutoSelect'
		thunkAPI.dispatch(configMethods.setMapKey(map))
		const trackRouteMap =
			(await storage.global.get('trackRouteMap')) || 'AutoSelect'
		thunkAPI.dispatch(configMethods.setTrackRouteMapKey(trackRouteMap))

		const speedColorType =
			(await storage.global.get('speedColorType')) || 'RedGreen'
		thunkAPI.dispatch(configMethods.setSpeedColorType(speedColorType))
		const trackRouteColor =
			(await storage.global.get('trackRouteColor')) || 'Blue'
		thunkAPI.dispatch(configMethods.setTrackRouteColor(trackRouteColor))

		thunkAPI.dispatch(
			configSlice.actions.setRealtimeTravelTrackWidth(
				(await storage.global.get('mapPolylineRealtimeTravelTrackWidth')) ||
					tempRealtimeTravelTrackWidth
			)
		)
		thunkAPI.dispatch(
			configSlice.actions.setHistoryTravelTrackWidth(
				(await storage.global.get('mapPolylineHistoryTravelTrackWidth')) ||
					tempHistoryTravelTrackWidth
			)
		)
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
	setTrackRouteMapKey: createAsyncThunk(
		'config/setTrackRouteMapKey',
		async (mapKey: string, thunkAPI) => {
			thunkAPI.dispatch(configSlice.actions.setTrackRouteMapKey(mapKey))
			await storage.global.set('trackRouteMap', mapKey)
			getTrackRouteMapUrlAuto()
		}
	),
	setSpeedColorType: createAsyncThunk(
		'config/setSpeedColorType',
		async (type: 'RedGreen' | 'PinkBlue', thunkAPI) => {
			thunkAPI.dispatch(configSlice.actions.setSpeedColorType(type))
			getSpeedColors(type)
			await storage.global.set('speedColorType', type)
		}
	),
	setTrackRouteColor: createAsyncThunk(
		'config/setTrackRouteColor',
		async (type: 'Blue' | 'Pink' | 'Red', thunkAPI) => {
			thunkAPI.dispatch(configSlice.actions.setTrackRouteColor(type || 'Blue'))
			await storage.global.set('trackRouteColor', type)
		}
	),
}
