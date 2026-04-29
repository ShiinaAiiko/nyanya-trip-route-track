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
import { t } from './i18n/i18n'
import { alert, snackbar } from '@saki-ui/core'
import { edgeTTS } from '../config'

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
  maxSpeed: number,
  speedColorRGBs: string[]
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

export const formatDurationI18n = (
  timestamp: number,
  full = true,
  fields: string[] = ['h', 'm', 's']
) => {
  const h = Math.floor(timestamp / 3600)
  const m = Math.floor(timestamp / 60) % 60
  const s = Math.floor(timestamp % 60)

  let str = ''
  if (full) {
    str =
      h +
      t('hourTime', {
        ns: 'prompt',
      }) +
      (m +
        t('minuteTime', {
          ns: 'prompt',
        })) +
      (s +
        t('secondTime', {
          ns: 'prompt',
        }))
  } else {
    str =
      (h === 0 && fields.includes('h')
        ? ''
        : h +
          t('hourTime', {
            ns: 'prompt',
          })) +
      (m === 0 && fields.includes('m')
        ? ''
        : m +
          t('minuteTime', {
            ns: 'prompt',
          })) +
      (s === 0 && fields.includes('s')
        ? ''
        : s +
          t('secondTime', {
            ns: 'prompt',
          }))
  }

  return str.trim()
}

// export const formatTimestamp = (
//   timestamp: number,
//   full = true,
//   fields: string[] = ['h', 'm', 's']
// ) => {
//   const h = Math.floor(timestamp / 3600)
//   const m = Math.floor(timestamp / 60) % 60
//   const s = Math.floor(timestamp % 60)
//   if (full)
//     return (
//       (fields.includes('h') ? h + 'h ' : '') +
//       (fields.includes('m') ? m + 'm ' : '') +
//       (fields.includes('s') ? s + 's ' : '')
//     )
//   return (
//     (h === 0 && fields.includes('h') ? '' : h + 'h ') +
//     (m === 0 && fields.includes('m') ? '' : m + 'm ') +
//     (s === 0 && fields.includes('s') ? '' : s + 's ')
//   )
// }

export const formatTime = (
  startTime: number,
  endTime: number,
  full: boolean = false,
  fields: string[] = ['h', 'm', 's']
) => {
  const timestamp = Math.floor(endTime) - Math.floor(startTime)
  return formatDurationI18n(timestamp, full, fields)
}

export const formatAvgPace = (
  distance: number,
  startTime: number,
  endTime: number
) => {
  const pace = (Number(endTime) - Number(startTime)) / ((distance || 0) / 1000)

  return `${Math.floor(pace / 60) % 60}'${Math.floor(pace % 60)}"`
}

// 定义 GPS 数据点接口
interface GPSPoint {
  latitude: number // 纬度（度）
  longitude: number // 经度（度）
  timestamp: number // 时间戳（毫秒）
}

// 地球重力加速度常数 (m/s²)
const GRAVITY = 9.81

// 计算 G 值的函数
export function calculateGValue(points: GPSPoint[]): number | null {
  if (points.length < 2) {
    console.error('需要至少两个 GPS 数据点来计算 G 值')
    return null
  }

  // 取最后两个点（假设最新点为刹车或加速度变化点）
  const point1 = points[points.length - 2]
  const point2 = points[points.length - 1]

  // 计算时间差（秒）
  const deltaTime = (point2.timestamp - point1.timestamp) / 1000

  if (deltaTime <= 0) {
    console.error('时间戳无效或时间差为零')
    return null
  }

  // 计算距离（米）
  const distance = getDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  )

  // 计算速度 (m/s)
  const velocity = distance / deltaTime

  // 如果有更多点，可以计算速度变化来得到加速度
  let acceleration: number
  if (points.length >= 3) {
    const point0 = points[points.length - 3]
    const prevDeltaTime = (point1.timestamp - point0.timestamp) / 1000
    if (prevDeltaTime <= 0) {
      console.error('前一时间戳无效')
      return null
    }
    const prevDistance = getDistance(
      point0.latitude,
      point0.longitude,
      point1.latitude,
      point1.longitude
    )
    const prevVelocity = prevDistance / prevDeltaTime

    // 计算加速度 (m/s²)
    acceleration = (velocity - prevVelocity) / deltaTime
  } else {
    // 只有两点时，假设初速度为 0（仅粗略估计）
    acceleration = velocity / deltaTime
  }

  // 计算 G 值
  const gValue = acceleration / GRAVITY

  // console.log(
  //   'calculateGValue',
  //   gValue,
  //   point2.timestamp,
  //   point1.timestamp,
  //   deltaTime
  // )

  return Math.abs(gValue) // 返回绝对值，避免负值（视方向而定）
}

// // 示例：两个 GPS 点
// const pointA = { lat: 39.9042, lon: 116.4074, elev: 50 } // 北京某点
// const pointB = { lat: 39.9142, lon: 116.4174, elev: 100 } // 附近某点
// console.log(
//   calculateSlope(
//     pointA.lat,
//     pointA.lon,
//     pointA.elev,
//     pointB.lat,
//     pointB.lon,
//     pointB.elev
//   )
// )
export const calculateSlope = (
  lat1: number,
  lon1: number,
  elev1: number,
  lat2: number,
  lon2: number,
  elev2: number
) => {
  // 转换为弧度
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  lat1 = toRadians(lat1)
  lon1 = toRadians(lon1)
  lat2 = toRadians(lat2)
  lon2 = toRadians(lon2)

  // Haversine 公式计算水平距离
  const R = 6371000 // 地球半径（米）
  const dLat = lat2 - lat1
  const dLon = lon2 - lon1
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const horizontalDistance = R * c || 0

  // 计算高度差
  const verticalDistance = elev2 - elev1 || 0

  // 计算坡度
  // const slopePercent = 30
  const slopePercent = (verticalDistance / horizontalDistance) * 100 || 0
  const slopeDegrees =
    Math.atan(verticalDistance / horizontalDistance) * (180 / Math.PI) || 0

  return {
    horizontalDistance: horizontalDistance, // 水平距离（米）
    verticalDistance: verticalDistance, // 高度差（米）
    slopePercent: slopePercent || 0, // 百分比坡度
    slopeDegrees: slopeDegrees, // 角度坡度
  }
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

export function normalizeLeafletCoordinates(lat: number, lng: number) {
  // 验证纬度
  if (lat < -90 || lat > 90) {
    return {
      lat,
      lng,
    }
  }

  // 规范化经度
  const normalizedLng = ((lng + 180) % 360) - 180

  // 返回规范化后的坐标
  return {
    lat,
    lng: normalizedLng,
  }
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

export const getLatLngGcj02ToWgs84 = (
  mapUrl: string,
  lat: number,
  lng: number
) => {
  let key = String(lat) + String(lng) + 'gcj02towgs84'

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

  const { startTime, positions, positionList } = trip

  if (positionList?.length) {
    trip.positions = []
    return {
      ...trip,
      positionList: positionList,
      positions: [],
    }
  }

  if (!positions?.length) {
    return {
      ...trip,

      positionList: positionList,
      positions: [],
    }
  }

  const posList = formatPositionsStr(
    Number(trip?.startTime),
    trip?.positions || []
  )

  return {
    ...trip,
    positionList: posList,
    positions: [],
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
        timestamp:
          Number(vArr[4]) > 1540915200
            ? Number(vArr[4])
            : Number(startTime) + Number(vArr[4]),
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

export const parseQuery = (url: string): Record<string, string> => {
  const query: Record<string, string> = {}
  // const url = location.href
  const queryString = url.split('?')[1]

  if (queryString) {
    const pairs = queryString.split('&')
    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      if (key) {
        query[decodeURIComponent(key)] = decodeURIComponent(value || '')
      }
    }
  }

  return query
}

export const getAngle = (
  lat_a: number,
  lng_a: number,
  lat_b: number,
  lng_b: number
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
    ele.requestFullscreen()
  } else if (ele.mozRequestFullScreen) {
    ele.mozRequestFullScreen()
  } else if (ele.webkitRequestFullscreen) {
    ele.webkitRequestFullscreen()
  } else if (ele.msRequestFullscreen) {
    ele.msRequestFullscreen()
  }
}

export const exitFullscreen = (el: HTMLElement) => {
  const ele = el as any
  const docAny = document as any
  if (docAny.exitFullScreen) {
    docAny.exitFullScreen()
  } else if (docAny.mozCancelFullScreen) {
    docAny.mozCancelFullScreen()
  } else if (docAny.webkitExitFullscreen) {
    docAny.webkitExitFullscreen()
  } else if (ele.msExitFullscreen) {
    ele.msExitFullscreen()
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
  )
}

export const getTimeLimit = (
  time: 'All' | 'Day' | 'Week' | 'Month' | 'Year'
) => {
  let startTime = 1540915200
  switch (time) {
    // 所有时间从2018年开始
    case 'All':
      break
    // 最近10年
    case 'Year':
      startTime = Math.floor(new Date().getTime() / 1000) - 365 * 10 * 24 * 3600
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

export const isRoadColorFade = (
  mapLayer:
    | protoRoot.configure.Configure.MapLayer.IMapLayerItem
    | null
    | undefined
) => {
  const { config } = store.getState()
  const b =
    mapLayer?.roadColorFade &&
    config.mapRecommend.roadColorFadeMap.filter((v) => {
      return mapLayer?.mapKey === v.mapKey
    })?.length
  return !!b
}

export const roadColorFade = (
  mapLayer:
    | protoRoot.configure.Configure.MapLayer.IMapLayerItem
    | null
    | undefined,
  layer: any
) => {
  const b = isRoadColorFade(mapLayer)
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
      let result = await imageColorInversion(
        {
          imgEl,
        },
        [
          [
            [180, 255],
            [90, 228],
            [0, 195],
            [1, 1],
          ],
          // 56, 176, 203
          // [[58, 189], [177, 227], [203, 241], [1, 1]],
          // [[146, 202], [122, 190], [190, 221], [1, 1]],
          // [[56, 197], [176, 232], [203, 239], [1, 1]],
          // // 96, 193, 106
          // [[70, 216], [185, 237], [82, 209], [1, 1]],
        ],
        // [
        [233, 233, 233, 1]
        // [233, 233, 233, 1],
        // [233, 233, 233, 1],
        // ]
      )

      // console.log("result", result)
      imgEl.src = result?.objectURL || ''
      imgEl.classList.add('roadColorFade-active')
    }
  })
}

export const isResumeTrip = (trip: protoRoot.trip.ITrip) => {
  return (
    Number(trip.createTime) + 3 * 3600 >=
    Math.floor(new Date().getTime() / 1000)
  )
}

export const removePolylinePointByIndex = (
  polyline: Leaflet.Polyline<any>,
  targetIndex: number
) => {
  const L: typeof Leaflet = (window as any).L
  if (L) {
    let latlngs = polyline.getLatLngs()
    if (!Array.isArray(latlngs)) return

    if (targetIndex >= 0) {
      latlngs.splice(targetIndex, 1)
      polyline.setLatLngs(latlngs)
    }
  }
}
export const removePolylinePointByLatLng = (
  polyline: Leaflet.Polyline<any>,
  targetLatLng: number[]
) => {
  const L: typeof Leaflet = (window as any).L
  if (L) {
    let latlngs = polyline.getLatLngs()
    if (!Array.isArray(latlngs)) return

    let targetIndex = -1

    latlngs.forEach((latlng, index) => {
      if (
        (latlng as any)['lat'] === targetLatLng[0] &&
        (latlng as any)['lng'] === targetLatLng[1]
      ) {
        targetIndex = index
      }
    })

    if (targetIndex !== -1) {
      latlngs.splice(targetIndex, 1)
      polyline.setLatLngs(latlngs)
    }
  }
}

function normalizeLng(lng: number) {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

export const toFixed = (num: number, fractionDigits: number = 10) => {
  const n = Math.pow(10, fractionDigits)
  return Math.round(num * n) / n
}

export function stripHtmlTags(html: string): string {
  if (typeof html !== 'string') return ''

  // 移除 HTML 标签
  let text = html.replace(/<[^>]*>/g, '')

  return text
}

export const newStripHtmlTags = (html: string) => {
  if (!html) return ''

  return (
    html
      // 1. 处理常见的换行标签，替换为真正的换行符
      .replace(/<\/p>|<br\s*\/?>|<\/div>/gi, '\n')
      // 2. 去除所有剩余的 HTML 标签
      .replace(/<[^>]+>/g, '')
      // 3. 处理可能产生的多余空行（可选：将连续三个及以上换行缩减为两个）
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // 4. 去除首尾空白字符
      .trim()
  )
}

// 判断点是否在多边形内（射线法）
export function isPointInPolygon(point: number[], polygon: number[][]) {
  const x = point[0],
    y = point[1]
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1]
    const xj = polygon[j][0],
      yj = polygon[j][1]

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

export function getLatLngUnit(
  latitude: number,
  longitude: number
): { lat: string; lng: string } {
  const lat = latitude >= 0 ? 'N' : 'S'
  const lng = longitude >= 0 ? 'E' : 'W'

  return { lat, lng }
}

export const copyOrOpenAlert = (text: string, url: string) => {
  alert({
    title: t('share', {
      ns: 'prompt',
    }),
    content: text,
    cancelText: t('copy', {
      ns: 'common',
    }),
    confirmText: t('copyOrOpen', {
      ns: 'prompt',
    }),
    onCancel() {
      copyText(text)

      snackbar({
        message: t('copySuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    },
    async onConfirm() {
      copyText(text)

      snackbar({
        message: t('copySuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()

      window.open(url)
    },
  }).open()
}

export const cleanMarkdown = (text: string): string => {
  return (
    text
      // 1. 去除代码块
      .replace(/```[\s\S]*?```/g, '')
      // 2. 去除行内代码
      .replace(/`(.+?)`/g, '$1')
      // 3. 去除粗体和斜体 (***, **, *)
      .replace(/[\*_]{1,3}(.+?)[\*_]{1,3}/g, '$1')
      // 4. 去除标题 (### Title)
      .replace(/^#+\s+/gm, '')
      // 5. 去除链接 [text](url) -> 只保留 text
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      // 6. 去除图片 ![alt](url) -> 全部去掉
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // 7. 去除引用符号 (>)
      .replace(/^>\s+/gm, '')
      // 8. 去除水平线 (---, ***)
      .replace(/^[-\*_]{3,}\s*$/gm, '')
      // 9. 去除多余的换行，换成空格或停顿
      .replace(/\n+/g, ' ')
      // 10. 特殊符号清理（比如你的 UI 里常有的 ⚠️）
      .replace(/[⚠️🛑🛡️📌]/g, '')
      .trim()
  )
}

interface VoiceTask {
  text: string
  key: string
  lang: string
  resolve: (key: string) => void
}

let currentAudio: AudioBufferSourceNode | null = null
let queue: VoiceTask[] = []
let isProcessing = false
let currentProcessingTask: VoiceTask | null = null

const VOICE_CONFIG: Record<string, string> = {
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'zh-TW': 'zh-TW-HsiaoChenNeural',
  'en-US': 'en-US-AvaNeural',
}

/**
 * 停止播放
 * @param targetKey 如果传入 key，则只有当前播放的是该 key 时才停止；不传则全部停止并清空队列
 */
export const StopVoiceBroadcast = (targetKey?: string) => {
  // 1. 如果指定了 key 且当前正在播的不是它，则只从队列移除
  if (targetKey) {
    if (currentProcessingTask?.key === targetKey) {
      stopCurrentExecution()
    } else {
      queue = queue.filter((task) => task.key !== targetKey)
    }
    return
  }

  // 2. 全部停止
  queue = []
  stopCurrentExecution()
}

// 内部私有方法：停止当前物理播放
const stopCurrentExecution = () => {
  if (currentAudio) {
    currentAudio.stop()
    currentAudio = null
  }
  if ((window as any).responsiveVoice?.isPlaying()) {
    ;(window as any).responsiveVoice.cancel()
  }
  // 触发当前任务的结束
  isProcessing = false
  currentProcessingTask?.resolve(currentProcessingTask.key)
  currentProcessingTask = null
}

/**
 * 队列处理器
 */
const processQueue = async () => {
  if (isProcessing || queue.length === 0) return

  isProcessing = true
  const task = queue.shift()
  if (!task) {
    isProcessing = false
    return
  }

  currentProcessingTask = task

  // 执行播放逻辑
  await executeBroadcast(task)

  // 播放结束后逻辑
  isProcessing = false
  currentProcessingTask = null
  task.resolve(task.key) // 通知调用方 ：播报完毕

  // 继续下一条
  processQueue()
}

/**
 * 核心播放逻辑（原逻辑封装）
 */
const executeBroadcast = (task: VoiceTask) => {
  return new Promise((resolve) => {
    const { text, key, lang } = task

    const fallbackSpeak = () => {
      if ((window as any).responsiveVoice) {
        if (currentProcessingTask?.key !== task.key) {
          return resolve(key)
        }

        ;(window as any).responsiveVoice.speak(
          text,
          lang === 'en-US' ? 'US English Female' : 'Chinese Female',
          {
            onend: () => resolve(key),
            onerror: () => resolve(key),
          }
        )
      } else {
        resolve(key)
      }
    }

    const runTTS = async () => {
      let audioCtx: AudioContext | null = null
      try {
        if (currentProcessingTask?.key !== task.key) {
          return resolve(key)
        }
        const response = await fetch(`${edgeTTS.url}/v1/audio/speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${edgeTTS.apiKey}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: VOICE_CONFIG[lang] || VOICE_CONFIG['zh-CN'],
            response_format: 'mp3',
            speed: 1,
          }),
        })
        // console.log('AI领航员 runTTS', response)

        if (!response.ok) throw new Error('TTS 请求失败')

        // 新的播放逻辑，和音乐App共存

        // --- 修改部分开始：改用 Web Audio API 播放 ---

        // 1. 获取 ArrayBuffer 而不是 Blob
        const arrayBuffer = await response.arrayBuffer()

        // 2. 身份声明 (核心：告诉车机这是“导航”或“瞬时”消息)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing'
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'AI 语音播报',
            album: '语音导航播报', // 某些车机会识别这个关键词，从而不切断音乐
          })
          navigator.mediaSession.setActionHandler('play', () => {})
        }

        const nav = navigator as any
        if (nav?.audioSession) {
          nav.audioSession.type = 'transient'
        }

        // 2. 初始化 AudioContext（单例模式更佳，这里演示基础用法）
        // 某些浏览器要求必须在点击事件后初始化，或调用 resume()
        audioCtx = new (
          window.AudioContext || (window as any)?.webkitAudioContext
        )()

        // 3. 解码音频数据
        let audioBuffer
        try {
          audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        } catch (decodeError) {
          console.error('音频解码失败:', decodeError)
          throw new Error('DECODE_ERROR') // 抛出异常进入统一的 catch
        }

        // 4. 创建音频源节点
        const source = audioCtx.createBufferSource()
        currentAudio = source
        console.log('runTTS source', source, audioCtx)

        source.buffer = audioBuffer

        // // 5. 连接到输出设备
        // source.connect(audioCtx.destination)

        // 1. 创建增益节点 (音量控制器)
        const gainNode = audioCtx.createGain()

        // 2. 设置音量值 (0.0 到 1.0 之间，1.0 是原音，也可以超过 1.0 放大)
        const volume = 1
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)

        // 3. 连接音频链
        // Source -> GainNode -> Destination
        source.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        // 6. 监听结束
        source.onended = () => {
          console.log('runTTS source.onended', audioCtx)
          // 释放资源
          audioCtx?.close()
          audioCtx = null
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none'
          }
          resolve(key)
        }

        if (currentProcessingTask?.key !== task.key) {
          audioCtx?.close()
          return resolve(key)
        }

        // 4. 执行播放
        // 注意：在车机 Android 上，如果 AudioContext.state 为 'suspended'，通常需要 resume
        if (audioCtx?.state === 'suspended') {
          await audioCtx.resume()
        }

        // 7. 开始播放
        source.start(0)

        // --- 修改部分结束 ---

        // 原来播放逻辑
        // const blob = await response.blob()
        // const audioUrl = URL.createObjectURL(blob)

        // // console.log('AI领航员 audioUrl', audioUrl)

        // currentAudio = new Audio(audioUrl)

        // currentAudio.onended = () => {
        //   URL.revokeObjectURL(audioUrl)
        //   resolve(key)
        // }

        // currentAudio.onerror = () => {
        //   URL.revokeObjectURL(audioUrl)
        //   fallbackSpeak()
        // }

        // if (currentProcessingTask?.key !== task.key) {
        //   return resolve(key)
        // }
        // await currentAudio.play()
      } catch (error) {
        console.error('AI领航员播放流程出错:', error)
        audioCtx?.close()
        audioCtx = null
        fallbackSpeak()
      }
    }

    runTTS()
  })
}

/**
 * 外部调用接口
 */
export const WebVoiceBroadcast = (
  text: string,
  key: string,
  lang: string = 'zh-CN'
): Promise<string> => {
  return new Promise((resolve) => {
    // 将新任务加入队列
    queue.push({ text, key, lang, resolve })
    // 尝试启动处理器
    processQueue()
  })
}

export class SpeechPilot {
  private recognition: any = null
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private SILENCE_TIMEOUT = 5000 // 5秒静音阈值

  onClose?: () => void

  constructor({
    autoStopTimeout,
    onClose,
  }: {
    autoStopTimeout?: number
    onClose?: () => void
  }) {
    this.SILENCE_TIMEOUT = autoStopTimeout || 5000
    this.onClose = onClose
    this.initRecognition()
  }

  private initRecognition() {
    const SpeechApi =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition

    if (!SpeechApi) {
      console.error('当前环境不支持 Web Speech API')
      return
    }

    this.recognition = new SpeechApi()

    // 配置
    this.recognition.continuous = true // 核心：连续识别
    this.recognition.interimResults = true // 实时反馈
    this.recognition.lang = 'zh-CN' // 中文识别

    // 监听识别事件
    this.recognition.onresult = (event: any) => {
      this.resetSilenceTimer() // 只要有声音产生，就重置5秒计时

      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }

      this.onSpeechUpdate(
        transcript,
        event.results[event.results.length - 1].isFinal
      )
    }

    this.recognition.onend = () => {
      this.clearTimer()
      this.onClose?.()
      console.log('识别链路关闭')
    }

    this.recognition.onerror = (err: any) => {
      console.error('语音识别错误:', err.error)
      this.clearTimer()
      this.onClose?.()
    }
  }

  // 供外部重写的钩子函数
  public onSpeechUpdate = (text: string, isFinal: boolean) => {
    console.log(`${isFinal ? '最终结果' : '中间过程'}: ${text}`)
  }

  // 启动识别
  public start() {
    if (!this.recognition) return
    try {
      this.recognition.start()
      this.resetSilenceTimer()
      console.log('领航员开始倾听...')
    } catch (e) {
      console.warn('识别已在运行中')
    }
  }

  // 需求1：手动停止
  public stopManually() {
    if (this.recognition) {
      this.recognition.stop() // 停止录音，触发 onend
      this.clearTimer()
      this.onClose?.()
      console.log('手动停止识别')
    }
  }

  // 需求2：逻辑管理 - 重置静音计时器
  private resetSilenceTimer() {
    this.clearTimer()
    this.silenceTimer = setTimeout(() => {
      console.log('检测到5秒静音，自动停止...')
      this.stopManually()
    }, this.SILENCE_TIMEOUT)
  }

  private clearTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }
}
