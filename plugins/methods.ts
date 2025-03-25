import React, { useEffect, useState } from 'react'
import qs from 'qs'
import { RootState } from '../store'

import { useSelector, useStore, useDispatch } from 'react-redux'

import axios, { AxiosRequestConfig } from 'axios'
import Leaflet from 'leaflet'

import store, { userSlice } from '../store'
import { connectionOSM, country } from '../store/config'
import { protoRoot } from '../protos'
// import { imageColorInversion } from './imageColorInversion'
import { imageColorInversion } from '@nyanyajs/utils/dist/images/imageColorInversion'

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
  maxSpeed: number, speedColorRGBs: string[]
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

export const formatTimestamp = (timestamp: number, full = true) => {
  const h = Math.floor(timestamp / 3600)
  const m = Math.floor(timestamp / 60) % 60
  const s = Math.floor(timestamp % 60)
  if (full) return h + 'h ' + m + 'm ' + s + 's'
  return (h === 0 ? "" : (h + 'h ')) + (m === 0 ? "" : (m + 'm ')) + (s === 0 ? "" : (s + 's '))
}

export const formatTime = (startTime: number, endTime: number) => {
  const timestamp = Math.floor(endTime) - Math.floor(startTime)
  return formatTimestamp(timestamp)
}

export const formatAvgPace = (
  distance: number,
  startTime: number,
  endTime: number
) => {
  const pace = (Number(endTime) - Number(startTime)) / ((distance || 0) / 1000)

  return `${Math.floor(pace / 60) % 60}'${Math.floor(pace % 60)}"`
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
  // console.log('distancedistance', lat1, lon1, lat2, lon2, distance)
  // const distance = 500000
  // let tempNum = -1
  if (distance >= 5000000) {
    return 3
  }
  if (distance >= 4500000) {
    return 3.5
  }
  if (distance >= 3000000) {
    return 4
  }
  if (distance >= 1400000) {
    return 5
  }
  if (distance >= 800000) {
    return 5.5
  }
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


// 转换坐标系
export const getLatLng = (mapUrl: string, lat: number, lng: number) => {
  let key = String(lat) + String(lng)

  if (latlngCache[mapUrl]?.[key]) return latlngCache[mapUrl][key]

  if (
    mapUrl.indexOf('google.com') >= 0 ||
    mapUrl.indexOf('autonavi.com') >= 0 ||
    mapUrl.indexOf('geoq.cn') >= 0
  ) {
    const gcj02towgs84 = coordtransform.wgs84togcj02(lng, lat)
    // console.log('gcj02towgs84', gcj02towgs84)

    lng = gcj02towgs84[0]
    lat = gcj02towgs84[1]
  }
  // if (
  // 	location.pathname.indexOf('trackRoute') >= 0
  // 		? config.trackRouteMapKey.indexOf('TianDiTu') >= 0 ||
  // 		  config.trackRouteMapKey.indexOf('OpenStreetMap') >= 0
  // 		: config.mapKey.indexOf('TianDiTu') >= 0 ||
  // 		  config.mapKey.indexOf('OpenStreetMap') >= 0
  // ) {
  // 	const gcj02towgs84 = coordtransform.gcj02towgs84(lng, lat)
  // 	// console.log('gcj02towgs84', gcj02towgs84)

  // 	lng = gcj02towgs84[0]
  // 	lat = gcj02towgs84[1]
  // }
  !latlngCache[mapUrl] && (latlngCache[mapUrl] = {})
  latlngCache[mapUrl][key] = [lat, lng]

  return [lat, lng]
}

export const getLatLngGcj02ToWgs84 = (mapUrl: string, lat: number, lng: number) => {
  let key = String(lat) + String(lng) + "gcj02towgs84"

  if (latlngCache[mapUrl]?.[key]) return latlngCache[mapUrl][key]

  if (
    mapUrl.indexOf('google.com') >= 0 ||
    mapUrl.indexOf('autonavi.com') >= 0 ||
    mapUrl.indexOf('geoq.cn') >= 0
  ) {
    const gcj02towgs84 = coordtransform.gcj02towgs84(lng, lat)

    lng = gcj02towgs84[0]
    lat = gcj02towgs84[1]
  }
  // if (
  // 	location.pathname.indexOf('trackRoute') >= 0
  // 		? config.trackRouteMapKey.indexOf('TianDiTu') >= 0 ||
  // 		  config.trackRouteMapKey.indexOf('OpenStreetMap') >= 0
  // 		: config.mapKey.indexOf('TianDiTu') >= 0 ||
  // 		  config.mapKey.indexOf('OpenStreetMap') >= 0
  // ) {
  // 	const gcj02towgs84 = coordtransform.gcj02towgs84(lng, lat)
  // 	// console.log('gcj02towgs84', gcj02towgs84)

  // 	lng = gcj02towgs84[0]
  // 	lat = gcj02towgs84[1]
  // }
  !latlngCache[mapUrl] && (latlngCache[mapUrl] = {})
  latlngCache[mapUrl][key] = [lat, lng]

  return [lat, lng]
}

const FormatGeoKey = (keys: string[], latlon: string) => {
  const latlons = latlon.split('.')

  return keys[Number(latlons[0])] + latlons[1]
}

const formatTripPositions = (
  trip: protoRoot.trip.ITripPositions
): protoRoot.trip.ITripPositions => {
  let startLat = 0
  let startLon = 0

  const { startTime,
    positions, positionList } = trip

  if (positionList?.length) {
    trip.positions = []
    return {
      ...trip,
      positionList: positionList,
      positions: []
    }
  }

  if (!positions?.length) {
    return {
      ...trip,

      positionList: positionList,
      positions: []
    }
  }


  const posList = formatPositionsStr(Number(trip?.startTime), trip?.positions || [])

  return {
    ...trip,
    positionList: posList,
    positions: []
  }
}



export const formatPositionsStr = (
  startTime: number,
  positions: string[]
): protoRoot.trip.ITripPosition[] => {
  let startLat = 0
  let startLon = 0
  return positions
    .map((v, i): protoRoot.trip.ITripPosition => {
      const vArr = v.split('_')
      // console.log('vArr', v, vArr)
      // let lat = Number(FormatGeoKey(keys, vArr[0]))
      // let lon = Number(FormatGeoKey(keys, vArr[1]))
      let lat = Number(vArr[0])
      let lon = Number(vArr[1])
      if (i !== 0) {
        lat = Math.floor(startLat - lat) / 100000000
        lon = Math.floor(startLon - lon) / 100000000
      }
      startLat = lat * 100000000
      startLon = lon * 100000000
      // if (i < 100) {
      // 	console.log(
      // 		'latlon pospos1',
      // 		lat,
      // 		lon,
      // 		Number(vArr[0]),
      // 		Number(vArr[1]),
      // 		vArr
      // 	)
      // }

      return {
        latitude: lat,
        longitude: lon,
        altitude: Number(vArr[2]),
        speed: Number(vArr[3]),
        timestamp: Number(vArr[4]) > 1540915200 ? Number(vArr[4]) :
          Number(startTime) + Number(vArr[4]),
        heading: Number(vArr[5]),
        altitudeAccuracy: Number(vArr[8]),
        accuracy: Number(vArr[7]),
        // heading: Number(vArr[7]),
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


export const getAngle = (
  lat_a: number,
  lng_a: number,
  lat_b: number,
  lng_b: number,
) => {
  let a = ((90 - lat_b) * Math.PI) / 180
  let b = ((90 - lat_a) * Math.PI) / 180
  let AOC_BOC = ((lng_b - lng_a) * Math.PI) / 180
  let cosc =
    Math.cos(a) * Math.cos(b) + Math.sin(a) * Math.sin(b) * Math.cos(AOC_BOC)
  let sinc = Math.sqrt(1 - cosc * cosc)
  let sinA = (Math.sin(a) * Math.sin(AOC_BOC)) / sinc
  let A = (Math.asin(sinA) * 180) / Math.PI
  let res = 0
  if (lng_b > lng_a && lat_b > lat_a) res = A
  else if (lng_b > lng_a && lat_b < lat_a) res = 180 - A
  else if (lng_b < lng_a && lat_b < lat_a) res = 180 - A
  else if (lng_b < lng_a && lat_b > lat_a) res = 360 + A
  else if (lng_b > lng_a && lat_b == lat_a) res = 90
  else if (lng_b < lng_a && lat_b == lat_a) res = 270
  else if (lng_b == lng_a && lat_b > lat_a) res = 0
  else if (lng_b == lng_a && lat_b < lat_a) res = 180
  return res || 0
}

export const fullScreen = (el: HTMLElement) => {
  const ele = el as any
  if (ele.requestFullscreen) {
    ele.requestFullscreen();
  } else if (ele.mozRequestFullScreen) {
    ele.mozRequestFullScreen();
  } else if (ele.webkitRequestFullscreen) {
    ele.webkitRequestFullscreen();
  } else if (ele.msRequestFullscreen) {
    ele.msRequestFullscreen();
  }
}

export const exitFullscreen = (el: HTMLElement) => {
  const ele = el as any
  const docAny = document as any
  if (docAny.exitFullScreen) {
    docAny.exitFullScreen();
  } else if (docAny.mozCancelFullScreen) {
    docAny.mozCancelFullScreen();
  } else if (docAny.webkitExitFullscreen) {
    docAny.webkitExitFullscreen();
  } else if (ele.msExitFullscreen) {
    ele.msExitFullscreen();
  }
}

export const isFullScreen = (el: HTMLElement) => {
  const ele = el as any
  const docAny = document as any
  return !!(
    ele.fullscreen ||
    ele.mozFullScreen ||
    ele.webkitIsFullScreen ||
    ele.webkitFullScreen ||
    ele.msFullScreen ||
    docAny.fullscreen ||
    docAny.mozFullScreen ||
    docAny.webkitIsFullScreen ||
    docAny.webkitFullScreen ||
    docAny.msFullScreen
  );
}


export const getTimeLimit = (time: "All" | "Day" | "Week" | "Month" | "Year") => {
  let startTime = 1540915200
  switch (time) {
    // 所有时间从2018年开始
    case 'All':
      break
    // 最近10年
    case 'Year':
      startTime =
        Math.floor(new Date().getTime() / 1000) - 365 * 10 * 24 * 3600
      break
    // 最近12个月
    case 'Month':
      startTime = Math.floor(new Date().getTime() / 1000) - 365 * 24 * 3600
      break
    // 最近12个周
    case 'Week':
      startTime =
        Math.floor(new Date().getTime() / 1000) -
        (11 * 7 + new Date().getDay()) * 24 * 3600
      break
    // 最近30天
    case 'Day':
      startTime = Math.floor(new Date().getTime() / 1000) - 30 * 24 * 3600
      break

    default:
      break
  }
  return startTime
}

export const isRoadColorFade = () => {
  const { config } = store.getState()
  const b = config.configure.roadColorFade && config.mapRecommend.roadColorFadeMap.filter((v => {
    if (location.pathname.indexOf("trackRoute") >= 0) {
      return config.configure.trackRouteMap?.mapKey === v.mapKey
    }
    return config.configure.baseMap?.mapKey === v.mapKey
  }))?.length
  return b

}

export const roadColorFade = (layer: any) => {
  const b = isRoadColorFade()
  layer.on('tileload', async (e: any) => {
    const imgEl = e.tile as HTMLImageElement
    // console.log('colorInversion', e, imgEl)

    if (imgEl.src.indexOf('blob') >= 0) {
      return
    }
    if (b) {
      imgEl.classList.remove('roadColorFade-active')
      //           rgba[0] >= 180 &&
      //           rgba[0] <= 255 &&
      //           rgba[1] >= 90 &&
      //           rgba[1] <= 228 &&
      //           rgba[2] >= 16 &&
      //           rgba[2] <= 195

      // 233, 204, 104
      // 229, 185, 36
      // 228, 188, 47
      // 228, 179, 8
      // 226, 184, 39
      // 229, 194, 69
      // 229, 195, 80
      // 226, 171, 0

      // 78, 185, 209
      // 81, 186, 209

      // 58, 177, 203
      let result = await imageColorInversion({
        imgEl,
      },
        [
          [[180, 255], [90, 228], [0, 195], [1, 1]],
          // 56, 176, 203
          // [[58, 189], [177, 227], [203, 241], [1, 1]],
          // [[146, 202], [122, 190], [190, 221], [1, 1]],
          // [[56, 197], [176, 232], [203, 239], [1, 1]],
          // // 96, 193, 106
          // [[70, 216], [185, 237], [82, 209], [1, 1]],
        ],
        // [
        [233, 233, 233, 1],
        // [233, 233, 233, 1],
        // [233, 233, 233, 1],
        // ]
      )

      // console.log("result", result)
      imgEl.src = result?.objectURL || ""
      imgEl.classList.add('roadColorFade-active')
    }
  })
}


export const isResumeTrip = (trip: protoRoot.trip.ITrip) => {
  return (Number(trip.createTime) + 3 * 3600) >= Math.floor(new Date().getTime() / 1000)
}

export const removePolylinePointByIndex = (polyline: Leaflet.Polyline<any>, targetIndex: number) => {
  const L: typeof Leaflet = (window as any).L
  if (L) {
    let latlngs = polyline.getLatLngs();
    if (!Array.isArray(latlngs)) return;

    if (targetIndex >= 0) {
      latlngs.splice(targetIndex, 1);
      polyline.setLatLngs(latlngs);
    }
  }
}
export const removePolylinePointByLatLng = (polyline: Leaflet.Polyline<any>, targetLatLng: number[]) => {
  const L: typeof Leaflet = (window as any).L
  if (L) {
    let latlngs = polyline.getLatLngs();
    if (!Array.isArray(latlngs)) return;

    let targetIndex = -1;

    latlngs.forEach((latlng, index) => {
      if ((latlng as any)["lat"] === targetLatLng[0] && (latlng as any)["lng"] === targetLatLng[1]) {
        targetIndex = index
      }
    });

    if (targetIndex !== -1) {
      latlngs.splice(targetIndex, 1);
      polyline.setLatLngs(latlngs);
    }
  }
}

function normalizeLng(lng: number) {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}


export const toFixed = (num: number, fractionDigits: number = 10) => {
  const n = Math.pow(10, fractionDigits)
  return Math.round(num * n) / n
}

export function stripHtmlTags(html: string): string {
  if (typeof html !== 'string') return '';

  // 移除 HTML 标签
  let text = html.replace(/<[^>]*>/g, '');

  return text;
}
