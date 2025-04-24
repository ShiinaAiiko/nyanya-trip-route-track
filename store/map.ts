import Leaflet, { latLng, map } from 'leaflet'
import { protoRoot } from '../protos'
import {
  formatPositionsStr,
  getDistance,
  getLatLng,
  getSpeedColor,
  getZoom,
} from '../plugins/methods'
import store, { methods } from '.'
import { storage } from './storage'
import {
  CityDistrictsType,
  cityNameMarkerCache,
  createCityBoundaries,
  deleteAllCityGeojsonMap,
  formartCities,
  getFullCityHierarchyIds,
  loadCityBoundaries,
  updateCityMarkers,
} from './city'
import {
  AsyncQueue,
  Debounce,
  deepCopy,
  imageColorInversion,
} from '@nyanyajs/utils'

// config.configure?.trackRouteColor

// 3. 全局缓存（实例安全版）

export const clearLayer = ({
  map,
  type,
}: {
  map: Leaflet.Map
  type: ('Polyline' | 'CityName')[]
}) => {
  const L: typeof Leaflet = (window as any).L

  if (type.includes('CityName')) {
    const currentcityNameMarkerCache = cityNameMarkerCache.get(map)!
    console.log(
      'CityName',
      type.includes('CityName'),
      currentcityNameMarkerCache
    )
    currentcityNameMarkerCache?.forEach((marker, key) => {
      console.log('CityName', marker)
      // map.removeLayer(marker)
      removeLayer(map, marker)
      currentcityNameMarkerCache.delete(key)
    })
  }

  map.eachLayer((layer) => {
    // console.log('clearLayer', layer)

    if (type.includes('Polyline')) {
      if (
        layer instanceof L.Polyline ||
        layer instanceof (L as any).Polycolor
      ) {
        // const cityId = layer.getPopup()?.getContent()?.toString() || ""

        // map.removeLayer(layer)

        // console.log("clearLayer Polyline", layer)
        removeLayer(map, layer)
      }
    }
    if (type.includes('CityName')) {
      console.log(
        'CityName',
        (layer as any)?._icon?.classList.contains('map-city-marker')
      )
      if ((layer as any)?._icon?.classList?.contains?.('map-city-marker')) {
        // const cityId = layer.getPopup()?.getContent()?.toString() || ""

        // map.removeLayer(layer)

        // console.log("clearLayer Polyline", layer)
        removeLayer(map, layer)
      }
    }
  })
}

export const removeLayer = (map: Leaflet.Map, layer: Leaflet.Layer) => {
  layer.removeFrom(map)
  layer.removeEventListener('click')
  map.removeLayer(layer)
}

export const zoomFunc = (map: Leaflet.Map, filterCityIds: string[], e: any) => {
  const { city } = store.getState()
  const { cityDistricts } = city
  // console.log('CityName', zoomFunc)
  const cities: {
    [id: string]: protoRoot.city.ICityItem
  } = {}

  Object.keys(cityDistricts).forEach((k) => {
    cityDistricts[k].forEach((v) => {
      // console.log('renderPolyline filterCityIds', filterCityIds.includes(v.id || ''))
      if (
        !cities[v.id || ''] &&
        (filterCityIds?.length ? filterCityIds.includes(v.id || '') : true)
      ) {
        cities[v.id || ''] = v
      }
    })
  })

  const citiesArr = formartCities(
    Object.keys(cities)
      .map((v) => {
        return cities[v]
      })
      .filter((v) => Number(v.level) <= 5)
  )

  // console.log(
  //   'mapLayer?.cityName renderPolyline updateMarkers',
  //   e.target._zoom,
  //   cities,
  //   citiesArr
  // )
  if (map) {
    updateCityMarkers(map, citiesArr, e.target._zoom)
  }
  // map.current &&
  // 	createCityMarkers(
  // 		map.current,
  // 		citiesArr,
  // 		e.target._zoom,
  // 		'VisitedCities'
  // 	)
}

const renderPolylineAQ = new AsyncQueue({
  maxQueueConcurrency: 20,
})

export const renderPolyline = async ({
  map,
  trips,
  speedColor = 'auto',
  weight = 2,
  clickFunc,
  showTripTrackRoute = true,
  showCityName = false,
  showCityBoundariesType = '',
  filterAccuracy,
  alert = false,
  speedRange,
  altitudeRange,
}: {
  map: Leaflet.Map
  trips: protoRoot.trip.ITripPositions[]
  speedColor: string
  weight?: number
  clickFunc?: RenderPolylineItemClickFunc
  showTripTrackRoute?: boolean
  showCityName?: boolean
  showCityBoundariesType?: CityDistrictsType | ''
  filterAccuracy: 'Low' | 'Medium' | 'High' | 'NoFilter'
  alert?: boolean
  speedRange?: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
  altitudeRange?: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
}) => {
  let loadBaseData: ReturnType<typeof snackbar> | undefined
  if (alert) {
    loadBaseData = snackbar({
      message: i18n.t('renderingTracks', {
        ns: 'prompt',
      }),
      vertical: 'top',
      horizontal: 'center',
      backgroundColor: 'var(--saki-default-color)',
      color: '#fff',
    })
  }
  loadBaseData?.open()

  let zoom = map.getZoom() || 14

  let minLat = 100000
  let minLon = 100000
  let maxLat = -100000
  let maxLon = -100000

  // console.log('renderPolyline', trips)

  const typeList = ['Polyline']

  if (!showCityName) {
    typeList.push('CityName')
    map.off('moveend')
    map.off('zoomend')
  }

  deleteAllCityGeojsonMap(map.getContainer().id)

  clearLayer({
    map: map,
    type: typeList as any,
  })

  let renderedNum = 0

  for (let i = 0; i < trips.length; i++) {
    const v = trips[i]
    let positions = v.positionList || []
    if (!positions.length) {
      positions = formatPositionsStr(Number(v.startTime), v?.positions || [])
    }
    const latArr = positions.map((v) => Number(v.latitude)) || []
    const lngArr = positions.map((v) => Number(v.longitude)) || []
    minLat = Math.min(minLat, ...latArr)
    minLon = Math.min(minLon, ...lngArr)
    maxLat = Math.max(maxLat, ...latArr)
    maxLon = Math.max(maxLon, ...lngArr)

    showTripTrackRoute &&
      renderPolylineAQ.increase(async () => {
        // console.log('renderPolyline renderPolylineAQ', v, i)

        // console.log('renderPolyline 11111111', v.id, v, v.permissions?.customTrip ? 'NoFilter' : filterAccuracy)
        map &&
          (await renderPolylineItem({
            params: {
              tripId: v.id || '',
              map,
              positions,
              type: v?.type || '',
              speedColor,
              weight,
              speedRange,
              altitudeRange,
              // filterAccuracy: filterAccuracy,
              filterAccuracy: v.permissions?.customTrip
                ? 'NoFilter'
                : filterAccuracy,
            },
            clickFunc,
          }))

        renderedNum++
        loadBaseData?.setMessage(
          i18n.t('tracksRendered', {
            ns: 'prompt',
            num: renderedNum,
          })
        )
      })
  }
  if (map) {
    const tempLatLon = {
      lat: (minLat + maxLat) / 2,
      lon: (minLon + maxLon) / 2,
    }
    zoom = getZoom(minLat, minLon, maxLat, maxLon)
    map.setView(
      [tempLatLon.lat, tempLatLon.lon],
      // [
      //   120.3814, -1.09],
      zoom
    )
  }

  showTripTrackRoute && (await renderPolylineAQ.wait.waiting())

  // trips.forEach((v) => {})

  loadBaseData?.setMessage(
    i18n.t('renderingCity', {
      ns: 'prompt',
    })
  )

  let cityIds: string[] = []

  // console.log('mapLayer?.cityName', showCityName)

  if (showCityName || showCityBoundariesType !== '') {
    let tripIds = trips.map((v) => v.id || '')
    const cities = await store
      .dispatch(
        methods.city.GetAllCitiesVisitedByUser({
          tripIds: tripIds,
        })
      )
      .unwrap()
    console.log('renderPolyline gcv', cities)

    // cityIds

    const tripsDetails = await storage.trips.mget(tripIds)

    tripsDetails.forEach((v) => {
      cityIds = cityIds.concat(
        v.value?.cities?.map((sv) => sv.cityId || '') || []
      )
    })
    console.log('renderPolyline tripsDetails', tripsDetails)
    console.log('renderPolyline cityIds', cityIds)

    const { city } = store.getState()
    cityIds = getFullCityHierarchyIds(city.cities, cityIds)

    if (showCityName) {
      // map.off()
      // map.off('moveend')
      // map.off('zoomend')

      setTimeout(() => {
        zoomFunc(map, cityIds, {
          target: {
            _zoom: zoom,
          },
        })
      }, 300)
      map?.on('moveend', (e: any) => {
        zoomFunc(map, cityIds, e)
      })
      map?.on('zoomend', (e: any) => {
        zoomFunc(map, cityIds, e)
      })
    }

    if (showCityBoundariesType !== '') {
      const cityBoundaries = await loadCityBoundaries(
        city.cityDistricts[showCityBoundariesType]?.filter((v) => {
          return cityIds.includes(v.id || '')
        }) || []
      )
      // console.log('renderPolyline gcv GetCityBoundaries', map.getContainer().id, cityBoundaries)

      cityBoundaries.forEach((v) => {
        map &&
          v.level > 1 &&
          createCityBoundaries({
            map: map,
            cityGeojson: v.geojson,
            style: {
              color: '#f29cb2', // 边界颜色
              weight: 2, // 边界粗细
              opacity: 0.5, // 透明度
              fillColor: '#f29cb2', // 填充颜色
              fillOpacity: 0.1, // 填充透明度
            },
            cityId: v.cityId,
            key: map.getContainer().id,
          })
      })
    }
  }

  loadBaseData?.close()
}

export interface RenderPolylineItemParams {
  tripId: string
  map: Leaflet.Map

  positions: protoRoot.trip.ITripPosition[]
  type: string
  weight?: number
  speedColor: string
  filterAccuracy: 'Low' | 'Medium' | 'High' | 'NoFilter'
  speedRange?: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
  altitudeRange?: protoRoot.configure.Configure.Filter.FilterItem.IRangeItem
}

export type RenderPolylineItemClickFuncReRender = (
  params: RenderPolylineItemParams
) => Promise<{
  params: RenderPolylineItemParams
  clickFunc?: RenderPolylineItemClickFunc
  remove: () => void
}>

export type RenderPolylineItemClickFunc = ({
  params,
  reRender,
}: {
  params: RenderPolylineItemParams
  reRender: RenderPolylineItemClickFuncReRender
}) => void

import * as turf from '@turf/turf'
import { snackbar } from '@saki-ui/core'
import i18n from '../plugins/i18n/i18n'
import { maps } from './config'
import { log } from 'console'

// 简化折线，保留速度关键点
// async function simplifyWithSpeed(
//   id: string,
//   coords: protoRoot.trip.ITripPosition[],
//   tolerance: number = 0.0001,
//   speedThreshold: number = 5
// ): Promise<protoRoot.trip.ITripPosition[]> {
//   const k = `${id},${tolerance},${speedThreshold}`
//   const cachePositions = await storage.simplifyTripPositions.get(k)

//   // console.log('renderPolyline cachePositions', cachePositions?.length)
//   if (cachePositions?.length || false) {
//     return cachePositions
//   }
//   // 过滤无效点（latitude 或 longitude 为 null）
//   const validCoords = coords.filter(
//     (point) => typeof point.latitude === 'number' && typeof point.longitude === 'number'
//   )

//   if (validCoords.length < 2) return validCoords

//   // 转换为 Turf 的 LineString 格式（仅使用经纬度）
//   const lineString = turf.lineString(validCoords.map((point) => [point.longitude!, point.latitude!]))

//   // 标准简化（保留几何形状）
//   const simplified = turf.simplify(lineString, { tolerance, highQuality: true })
//   const simplifiedCoords = simplified.geometry.coordinates.map(([lng, lat]) => ({
//     latitude: lat,
//     longitude: lng,
//   }))

//   // 恢复速度信息，保留速度变化点
//   const result: protoRoot.trip.ITripPosition[] = []
//   let lastSpeed = validCoords[0].speed ?? 0

//   simplifiedCoords.forEach(({ latitude, longitude }, i) => {
//     // 查找最近的原始点
//     const closest = validCoords.reduce((prev, curr) => {
//       const distCurr = Math.hypot(curr.latitude! - latitude, curr.longitude! - longitude)
//       const distPrev = Math.hypot(prev.latitude! - latitude, prev.longitude! - longitude)
//       return distCurr < distPrev ? curr : prev
//     })

//     const currentSpeed = closest.speed ?? lastSpeed

//     // 保留首点、末点或速度变化大的点
//     if (i === 0 || i === simplifiedCoords.length - 1 || Math.abs(currentSpeed - lastSpeed) > speedThreshold) {
//       result.push({
//         ...closest,
//         latitude,
//         longitude,
//       })
//       lastSpeed = currentSpeed
//     }
//   })

//   storage.simplifyTripPositions.setSync(k, result)

//   return result
// }

async function simplifyTrip(
  id: string,
  speedColor: string,
  coords: protoRoot.trip.ITripPosition[],
  options: {
    tolerance?: number // 几何简化强度 (默认0.00001)
    speedThreshold?: number // 速度变化阈值 m/s (默认0.5)
    minTimeInterval?: number // 最小时间间隔 ms (默认5000=5秒)
    minPointsInterval?: number // 最小点间隔 (默认15个点)
  } = {}
): Promise<protoRoot.trip.ITripPosition[]> {
  // 参数合并默认值
  const {
    tolerance = 0.00001,
    speedThreshold = 0.5,
    minTimeInterval = 5000,
    minPointsInterval = 15,
  } = options

  // 缓存逻辑
  const cacheKey = `${id}_${
    speedColor === 'auto'
  }_${tolerance}_${speedThreshold}_${minTimeInterval}_${minPointsInterval}`
  const cached = await storage.simplifyTripPositions.get(cacheKey)
  if (cached) return cached

  // 1. 数据预处理（过滤无效点+时间戳转换）
  const validCoords = coords
    .filter(
      (p) => p.latitude != null && p.longitude != null && p.timestamp != null
    )
    .map((p) => ({
      ...p,
      timestamp:
        typeof p.timestamp === 'number'
          ? p.timestamp * 1000
          : p.timestamp!.toNumber() * 1000, // 秒→毫秒
    }))

  if (validCoords.length < 3) return validCoords

  // 2. Turf简化
  const simplified = turf.simplify(
    turf.lineString(validCoords.map((p) => [p.longitude!, p.latitude!])),
    {
      tolerance,
      highQuality: true,
    }
  )

  // 3. 关键点保留逻辑
  const result: protoRoot.trip.ITripPosition[] = [validCoords[0]]
  let lastKeptIndex = 0
  let lastKeptTime = validCoords[0].timestamp!

  simplified.geometry.coordinates.forEach(([lng, lat], i) => {
    if (i === 0) return

    // 查找最近原始点（带速度和时间戳）
    const closest = findClosestOriginalPoint(validCoords, lng, lat)
    const currentTime = Number(closest.timestamp!)
    const currentSpeed = closest.speed ?? 0

    // 保留条件
    const shouldKeep =
      i === simplified.geometry.coordinates.length - 1 || // 终点
      Math.abs(currentSpeed - (result[result.length - 1].speed ?? 0)) >
        speedThreshold || // 速度变化
      currentTime - lastKeptTime >= minTimeInterval || // 时间间隔
      i - lastKeptIndex >= minPointsInterval // 密度控制

    if (shouldKeep) {
      result.push({
        ...closest,
        latitude: lat,
        longitude: lng,
        timestamp: Math.floor(currentTime / 1000), // 毫秒→秒
      })
      lastKeptIndex = i
      lastKeptTime = currentTime
    }
  })

  storage.simplifyTripPositions.setSync(cacheKey, result)
  return result
}

/** 优化后的原始点查找 */
function findClosestOriginalPoint(
  points: protoRoot.trip.ITripPosition[],
  lng: number,
  lat: number
): protoRoot.trip.ITripPosition {
  let minDist = Infinity
  let closest = points[0]
  const searchRadius = 0.001 // 约100米范围内的点

  for (const p of points) {
    if (p.longitude == null || p.latitude == null) continue
    // 快速距离估算
    const dist = Math.pow(p.longitude - lng, 2) + Math.pow(p.latitude - lat, 2)
    if (dist < minDist && dist < searchRadius) {
      minDist = dist
      closest = p
    }
  }
  return closest
}
export const renderPolylineItem = async ({
  params,
  clickFunc,
}: {
  params: RenderPolylineItemParams
  clickFunc?: RenderPolylineItemClickFunc
}): Promise<Leaflet.Layer | undefined> => {
  const L: typeof Leaflet = (window as any).L

  const { config } = store.getState()

  let { weight, positions, speedColor, map, type, tripId } = params

  // console.log('positions1', positions.length)
  if (!positions?.length) return undefined
  // console.time('getLatLnggetLatLng')

  let tolerance = 0.00001
  let speedThreshold = 0.1

  if (params.filterAccuracy === 'High') {
    tolerance = 0.00003
  }
  if (params.filterAccuracy === 'Medium') {
    tolerance = 0.0001
  }
  if (params.filterAccuracy === 'Low') {
    tolerance = 0.0006
  }

  // console.log('renderPolyline 11111111', positions?.length)

  const isSpeedRange =
    params.speedRange &&
    !(params.speedRange?.min === 0 && params.speedRange?.max === 380)
  const isAltitudeRange =
    params.altitudeRange &&
    !(params.altitudeRange?.min === 0 && params.altitudeRange?.max === 8848)

  const tempPositions =
    params.filterAccuracy === 'NoFilter' || isSpeedRange || isAltitudeRange
      ? positions
      : await simplifyTrip(params.tripId, params.speedColor, positions, {
          tolerance,
          speedThreshold,
          minTimeInterval: 5000,
          minPointsInterval: 15,
        })
  // : await simplifyWithSpeed(params.tripId, positions, tolerance, speedThreshold)

  // console.log(
  //   'renderPolyline 11111111',
  //   tripId,
  //   params.filterAccuracy,
  //   // tempPositions,
  //   tempPositions?.length,
  //   positions?.length
  // )

  // let maxSpeedPosition = tempPositions[0]

  let tracks: {
    latLngs: number[][]
    colors: string[]
  }[] = []

  let isPass = false

  let latLngs: number[][] = []
  let colors: string[] = []

  tempPositions
    .filter((v) => {
      return !(Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0)
    })
    ?.forEach((v, i, arr) => {
      // maxSpeedPosition =
      //   Number(maxSpeedPosition.speed) < Number(v.speed) ? v : maxSpeedPosition

      const speedColorLimit = (
        config.configure.general?.speedColorLimit as any
      )[(type?.toLowerCase() || 'running') as any]

      const mapUrl = (params.map as any)?.mapUrl || ''
      const speedColorRGBs = (params.map as any)?.speedColorRGBs || []

      if (!isSpeedRange && !isAltitudeRange) {
        latLngs.push(
          getLatLng(mapUrl, v.latitude || 0, v.longitude || 0) as any
        )
        colors.push(
          speedColor === 'auto'
            ? getSpeedColor(
                v.speed || 0,
                speedColorLimit.minSpeed,
                speedColorLimit.maxSpeed,
                speedColorRGBs
              )
            : speedColor
        )

        return
      }

      if (isSpeedRange && params.speedRange) {
        const min = params.speedRange.min || 0
        const max =
          (Number(params.speedRange?.max) >= 380
            ? 10000
            : Number(params.speedRange.max)) || 0

        const speed = (Number(v.speed) || 0) * 3.6
        isPass = speed >= min && speed <= max
      }
      if (isAltitudeRange && params.altitudeRange) {
        const min = params.altitudeRange.min || 0
        const max =
          (Number(params.altitudeRange?.max) >= 8848
            ? 1000000
            : Number(params.altitudeRange.max)) || 0

        const altitude = Number(v.altitude) || 0
        isPass = altitude >= min && altitude <= max
      }

      if (isPass) {
        latLngs.push(
          getLatLng(mapUrl, v.latitude || 0, v.longitude || 0) as any
        )
        colors.push(
          speedColor === 'auto'
            ? getSpeedColor(
                v.speed || 0,
                speedColorLimit.minSpeed,
                speedColorLimit.maxSpeed,
                speedColorRGBs
              )
            : speedColor
        )
      } else {
        latLngs.length &&
          colors.length &&
          tracks.push(
            deepCopy({
              latLngs,
              colors,
            })
          )

        latLngs = []
        colors = []
      }

      // map.current &&
      // 	L.polyline(
      // 		[
      // 			getLatLng(lv.latitude || 0, lv.longitude || 0) as any,
      // 			getLatLng(v.latitude || 0, v.longitude || 0) as any,
      // 		],
      // 		{
      // 			// smoothFactor:10,
      // 			// snakingSpeed: 200,
      // 			color: getSpeedColor(
      // 				v.speed || 0,
      // 				speedColorLimit.minSpeed,
      // 				speedColorLimit.maxSpeed
      // 			), //线的颜色
      // 			weight: config.mapPolyline.realtimeTravelTrackWidth,
      // 			// weight: config.mapPolyline.historyTravelTrackWidth,
      // 			// opacity: 0.3,
      // 		}
      // 	).addTo(map.current)
    })

  if (latLngs.length) {
    tracks.push({
      latLngs,
      colors,
    })
  }

  tracks = tracks.filter((v) => {
    if (v.latLngs.length <= 1) return false
    let distance = 0

    v.latLngs.forEach((sv, i) => {
      if (i === 0) return
      distance += getDistance(
        sv[0],
        sv[1],
        v.latLngs[i - 1]?.[0],
        v.latLngs[i - 1]?.[1]
      )
    })

    if (distance < 50) {
      return false
    }
    // console.log('trackssss', distance, v.latLngs.length)

    return true
  })

  const tempTrack =
    speedColor === 'auto'
      ? tracks
      : [
          tracks.reduce(
            (t, v) => {
              // const lastPosition = {
              //   latLngs: [] as number[],
              //   colors: '',
              // }

              // if (t.latLngs.length > 0) {
              //   // lastPosition.latLngs = t.latLngs[t.latLngs.length - 1]
              //   // lastPosition.colors = t.colors[t.latLngs.length - 1]
              //   t.colors[t.latLngs.length - 1] = 'rgb(0,0,0)'
              // }

              // if (lastPosition.latLngs.length) {
              //   t.latLngs = t.latLngs.concat(lastPosition.latLngs)
              //   t.colors = t.colors.concat('rgb(0,0,0)')
              // }

              // console.log('trackssss', deepCopy(t))

              // if (t.latLngs.length > 0) {
              //   t.colors[t.latLngs.length - 1] = null
              // }

              t.latLngs.push(v.latLngs)
              t.colors.push(v.colors)
              // t.colors = t.colors.concat(v.colors)

              // if (t.latLngs.length > 0) {
              //   t.colors[t.latLngs.length - 1] = null
              // }

              return t
            },
            {
              latLngs: [] as number[][][],
              colors: [] as string[][],
            }
          ),
        ]

  // console.log(
  //   'trackssss',
  //   tempTrack,
  //   tracks,
  //   // !isSpeedRange && !isAltitudeRange,
  //   // isSpeedRange,
  //   // isAltitudeRange,
  //   params.positions.length,
  //   tempPositions.length
  // )
  let layer: any

  tempTrack.forEach((v) => {
    const { latLngs, colors } = v
    // if (latLngs.length <= 1) return
    // console.log('trackssss', latLngs)

    // if ((isSpeedRange ||isAltitudeRange)&&latLngs.length>) {

    //   return
    // }
    if (speedColor === 'auto') {
      // console.log('LLLL', L)
      layer = (L as any)
        .polycolor(latLngs, {
          colors: colors,
          useGradient: true,
          weight: weight,
          noClip: true,
          // renderer: L.canvas(),
        })
        .addTo(map)
    } else {
      layer = L.polyline(latLngs as any, {
        color: speedColor,
        weight: weight,
        smoothFactor: 1,
        noClip: true,
        // renderer: L.canvas(),
      }).addTo(map)
    }

    speedColor !== 'auto' &&
      clickFunc &&
      layer?.addEventListener('click', () => {
        clickFunc({
          params,
          reRender: async (params) => {
            removeLayer(map, layer)
            let tempLayer = await renderPolylineItem({
              params: params,
              clickFunc,
            })

            return {
              params: params,
              clickFunc,
              remove() {
                tempLayer && removeLayer(map, tempLayer)
              },
            }
          },
        })
      })
  })

  return layer

  // console.timeEnd('getLatLnggetLatLng')
}

export const createIconMarker = ({
  map,
  maxSpeed = 0,
  latlng,
  type,
}: {
  map: Leaflet.Map
  maxSpeed?: number
  latlng: number[]
  type: 'StartPosition' | 'EndPosition' | 'MaxSpeed'
}) => {
  const L: typeof Leaflet = (window as any).L

  let icon: any
  if (type === 'StartPosition') {
    icon = L.icon({
      className: 'icon-marker map_position_start_icon',
      iconUrl: '/position_start_green.png',
      iconSize: [28, 28],
      // shadowSize: [36, 36],
      iconAnchor: [14, 25],
      // shadowAnchor: [4, 62],
      // popupAnchor: [-3, -76],
    })
  } else if (type === 'MaxSpeed') {
    icon = L.divIcon({
      html: `<div class='map-max-speed-marker-wrap'>
    
          <div class="msm-icon">
            <saki-icon margin="-1px 0 0 -1px" color="var(--saki-default-color)" size="10px" type="Rocket"></saki-icon>
          </div>
          <div class="msm-speed">
            <span>${Math.round((maxSpeed * 3600) / 100) / 10}</span>
          <span>km/h</span>
          </div>
    
          </div>`,
      className: 'icon-marker map-max-speed-marker ',
      iconSize: undefined,
    })
  } else {
    icon = L.icon({
      className: 'icon-marker map_position_end_icon',
      iconUrl: '/position_end_black.png',
      iconSize: [26, 34],
      // iconUrl: '/position_start.png',
      // iconSize: [28, 28],
      // shadowSize: [36, 36],
      iconAnchor: [0, 30],
      // shadowAnchor: [4, 62],
      // popupAnchor: [-3, -76],
    })
  }

  // console.log("createIconMarker", icon, map)
  return (
    L.marker(latlng as any, {
      icon,
    })
      .addTo(map)
      // .bindPopup(
      // 	`${ipInfoObj.ipv4}`
      // 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
      // )
      .openPopup()
  )
}

export const checkMapUrl = async (url: string) => {
  if (!url) return false

  // console.log('checkMapUrl', type, url)
  try {
    const res = await fetch(url)
    return res.ok
  } catch (error) {
    return false
  }
}

export const getMapKeyOrUrl = (mapUrl: string) => {
  const url =
    mapUrl
      ?.replace('{s}', 'a')
      ?.replace('{x}', '1629')
      ?.replace('{y}', '845')
      ?.replace('{z}', '11') || ''

  let mapKey = ''
  maps.forEach((v) => {
    if (v.url === mapUrl) {
      mapKey = v.key
    }
  })

  return { url, mapKey }
}

const isRoadColorFade = (roadColorFade: boolean, mapKey: string) => {
  const { config } = store.getState()
  const b =
    roadColorFade &&
    config.mapRecommend.roadColorFadeMap.filter((v) => {
      return mapKey === v.mapKey
    })?.length
  return b
}

export const getMapThumbnail = async (
  mapUrl: string,
  roadColorFade: boolean
) => {
  return new Promise<{
    url: string
    isConnection: boolean
  }>(async (res, rej) => {
    const { url, mapKey } = getMapKeyOrUrl(mapUrl)

    const isConnection = await checkMapUrl(url)

    if (isConnection && isRoadColorFade(roadColorFade, mapKey)) {
      const imgEl = document.createElement('img')
      imgEl.src = url
      imgEl.crossOrigin = 'anonymous'

      imgEl.onload = async () => {
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
          ],
          [233, 233, 233, 1]
        )

        res({ url: result?.objectURL || '', isConnection })
      }
    } else {
      res({ url, isConnection })
    }
  })
}
