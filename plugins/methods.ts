import React, { useEffect, useState } from 'react'
import qs from 'qs'
import { RootState } from '../store'

import { useSelector, useStore, useDispatch } from 'react-redux'

import axios, { AxiosRequestConfig } from 'axios'

import store, { userSlice } from '../store'

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

let r = 140
let g = 200
let b = 70
export const rgbs: string[] = []
for (let i = 0; i < 20; i++) {
	if (i < 10) {
		r = 140 + Math.floor(((200 - 100) / 10) * i)
	} else {
		g = 200 - Math.floor(((200 - 100) / 10) * (i - 10))
	}

	rgbs.push(`rgb(${r},${g},${b})`)
}

export const getSpeedColor = (
	currentSpeed: number,
	minSpeed: number,
	maxSpeed: number
) => {
	if (currentSpeed < minSpeed) {
		return rgbs[0]
	}
	if (currentSpeed > maxSpeed) {
		return rgbs[rgbs.length - 1]
	}

	return rgbs[
		Math.floor((currentSpeed - minSpeed) / ((maxSpeed - minSpeed) / 20))
	]
}

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
	s = Math.round(s * 10000) / 10
	return s
}

export const formatTime = (startTime: number, endTime: number) => {
	const timestamp = Math.floor(endTime) - Math.floor(startTime)

	const h = Math.floor(timestamp / 3600)
	const m = Math.floor(timestamp / 60) % 60
	const s = Math.floor(timestamp % 60)
	return h + 'h ' + m + 'm ' + s + 's'
}

export const getZoom = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
) => {
	const distance = getDistance(lat1, lon1, lat2, lon2)
	// const distance = 500000
	if (distance >= 500000) {
		return 7.3
  }
	if (distance >= 100000) {
		return 9
  }
	if (distance >= 50000) {
		return 10
  }
	if (distance >= 10000) {
		return 12
  }
	if (distance >= 5000) {
		return 13
  }
	if (distance >= 1500) {
		return 14
  }
	if (distance >= 900) {
		return 15
	}
  return 16
}
