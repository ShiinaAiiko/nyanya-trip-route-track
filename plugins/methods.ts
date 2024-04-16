import React, { useEffect, useState } from 'react'
import qs from 'qs'
import { RootState } from '../store'

import { useSelector, useStore, useDispatch } from 'react-redux'

import axios, { AxiosRequestConfig } from 'axios'

import store, { userSlice } from '../store'
import { connectionOSM, country, speedColorRGBs } from '../store/config'
import { protoRoot } from '../protos'

export const getRegExp = (type: 'email') => {
	return /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/
}

export const copyText = (text: string) => {
	if (window.isSecureContext && navigator.clipboard) {
		navigator.clipboard.writeText(text)
	} else {
		const textArea = document.createElement('textarea')
		textArea.value = text
		document.body.appendChild(textArea)
		textArea.focus()
		textArea.select()
		try {
			document.execCommand('copy')
		} catch (err) {
			console.error('Unable to copy to clipboard', err)
		}
		document.body.removeChild(textArea)
	}
}

export const random = (min: number, max: number) => {
	var newMin = min || 0
	var newMax = max || 10
	return min !== undefined && max !== undefined
		? String(Math.floor(Math.random() * (newMax - newMin) + newMin))
		: String(Math.floor(Math.random() * 10))
}
export const getRandomPassword = (
	num: number = 0,
	include: ('Number' | 'Character')[]
) => {
	let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
	let number = '0123456789'
	let character = '#$%&()*+,-.:;<=>?@[]^_{|}~'

	let randStr = '' + alphabet

	if (include.includes('Number')) {
		randStr += number
	}
	if (include.includes('Character')) {
		randStr += character
	}

	let randNum = Number(random(0, alphabet.length - 1))
	let str = randStr.substring(randNum, randNum + 1)

	for (let i = 1; i < num; i++) {
		randNum = Number(random(0, randStr.length - 1))
		str += randStr.substring(randNum, randNum + 1)
	}
	return str
}
export const getSpeedColor = (
	currentSpeed: number,
	minSpeed: number,
	maxSpeed: number
) => {
	if (currentSpeed < minSpeed) {
		return speedColorRGBs[0]
	}
	if (currentSpeed > maxSpeed) {
		return speedColorRGBs[speedColorRGBs.length - 1]
	}

	return speedColorRGBs[
		Math.floor((currentSpeed - minSpeed) / ((maxSpeed - minSpeed) / 20))
	]
}

// 单位米
export const getDistance = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
) => {
	let radLat1 = (lat1 * Math.PI) / 180.0
	let radLat2 = (lat2 * Math.PI) / 180.0
	let a = radLat1 - radLat2
	let b = (lon1 * Math.PI) / 180.0 - (lon2 * Math.PI) / 180.0
	let s =
		2 *
		Math.asin(
			Math.sqrt(
				Math.pow(Math.sin(a / 2), 2) +
					Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)
			)
		)
	s = s * 6378.137
	s = Math.round(s * 1000000) / 1000
	return s
}

export const formatTime = (startTime: number, endTime: number) => {
	const timestamp = Math.floor(endTime) - Math.floor(startTime)

	const h = Math.floor(timestamp / 3600)
	const m = Math.floor(timestamp / 60) % 60
	const s = Math.floor(timestamp % 60)
	return h + 'h ' + m + 'm ' + s + 's'
}

export const formatDistance = (distance: number) => {
	if (distance < 1000) {
		return Math.round(distance || 0) + ' m'
	}
	if (distance < 1000 * 10) {
		return Math.round((distance || 0) / 10) / 100 + ' km'
	}
	return Math.round((distance || 0) / 100) / 10 + ' km'
}

export const getZoom = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
) => {
	const distance = getDistance(lat1, lon1, lat2, lon2)
	// console.log('distancedistance', distance)
	// const distance = 500000
	// let tempNum = -1
	if (distance >= 500000) {
		return 6
	}
	if (distance >= 100000) {
		return 7
	}
	if (distance >= 50000) {
		return 8
	}
	if (distance >= 30000) {
		return 9
	}
	if (distance >= 10000) {
		return 10
	}
	if (distance >= 5000) {
		return 11
	}
	if (distance >= 1500) {
		return 12
	}
	if (distance >= 900) {
		return 13
	}
	return 14
}

const coordtransform = require('coordtransform')
const latlngCache: {
	[url: string]: {
		[latlng: string]: number[]
	}
} = {}
export const getLatLng = (lat: number, lng: number) => {
	let key = String(lat) + String(lng)
	const { config } = store.getState()

	if (latlngCache[config.mapUrl]?.[key]) return latlngCache[config.mapUrl][key]

	// console.log('getLatLnggetLatLng')

	if (config.mapUrl.indexOf('openstreetmap') < 0) {
		const gcj02towgs84 = coordtransform.wgs84togcj02(lng, lat)
		// console.log('gcj02towgs84', gcj02towgs84)

		lng = gcj02towgs84[0]
		lat = gcj02towgs84[1]
	}
	!latlngCache[config.mapUrl] && (latlngCache[config.mapUrl] = {})
	latlngCache[config.mapUrl][key] = [lat, lng]

	return [lat, lng]
}

export const formatPositionsStr = (
	startTime: number,
	positions: string[]
): protoRoot.trip.ITripPosition[] => {
	return positions
		.map((v): protoRoot.trip.ITripPosition => {
			const vArr = v.split('-')
			// console.log('vArr', v, vArr)
			return {
				latitude: Number(vArr[0]),
				longitude: Number(vArr[1]),
				altitude: Number(vArr[2]),
				altitudeAccuracy: Number(vArr[3]),
				accuracy: Number(vArr[4]),
				heading: Number(vArr[5]),
				speed: Number(vArr[6]),
				timestamp: Number(startTime) + Number(vArr[7]),
			}
		})
		.filter((v, i) => {
			const gss = !(
				(v.speed === null || v.altitude === null)
				// ||
				// v.accuracy === null ||
				// (v.accuracy || 0) > 20
			)
			return gss && !(Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0)
		})
}

export const Query = (
	url: string,
	query: {
		[k: string]: string
	}
) => {
	let obj: {
		[k: string]: string
	} = {}
	let o = Object.assign(obj, query)
	let s = qs.stringify(
		Object.keys(o).reduce(
			(fin, cur) => (o[cur] !== '' ? { ...fin, [cur]: o[cur] } : fin),
			{}
		)
	)
	return url + (s ? '?' + s : '')
}