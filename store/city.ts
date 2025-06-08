import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'

import { Feature, Geometry } from 'geojson'
import Leaflet from 'leaflet'
import { protoRoot, ForEachLongToNumber } from '../protos'
import {
  formatPositionsStr,
  getDistance,
  parseQuery,
  random,
} from '../plugins/methods'
import { eventListener, R, TabsTripType } from './config'
import { httpApi } from '../plugins/http/api'
import store, { layoutSlice, methods, tripSlice } from '.'
import { isLinearGradient } from 'html2canvas/dist/types/css/types/image'
import i18n from '../plugins/i18n/i18n'
import { snackbar } from '@saki-ui/core'
import { Debounce, AsyncQueue, deepCopy } from '@nyanyajs/utils'
import { t } from 'i18next'
import { nominatimUrl, toolApiUrl } from '../config'

// import { AsyncQueue } from "./asyncQueue";

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export type GeoJSON = GeoJSONPolygon | GeoJSONMultiPolygon

interface Address {
  town: string
  city: string
  state: string
  'ISO3166-2-lvl4': string
  country: string
  country_code: string
}

interface ReverseGeocode {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  category: string
  type: string
  place_rank: number
  importance: number
  addresstype: string
  name: string
  display_name: string
  address: Address
  boundingbox: string[]
  geojson: GeoJSON
}

const modelName = 'city'

export type CityDistrictsType = 'country' | 'state' | 'region' | 'city' | 'town'

export const cityState = {
  cities: [] as protoRoot.city.ICityItem[],
  cityDistricts: {} as Record<string, protoRoot.city.ICityItem[]>,
  updateCitiesTime: 0,
  cityInfo: {
    country: '',
    state: '',
    region: '',
    city: '',
    town: '',
    road: '',
    address: '',
    lat: 0,
    lng: 0,
  },
}

export const ethnicReg =
  /傣族|布朗族|独龙族|佤族|怒族|景颇族|普米族|德昂族|拉祜族|阿昌族|纳西族|哈尼族|藏族|蒙古族|回族|维吾尔族|壮族|苗族|彝族|布依族|朝鲜族|满族|侗族|瑶族|白族|土家族|哈萨克族|黎族|傈僳族|东乡族|仡佬族|拉祜族|佤族|水族|土族|羌族|达斡尔族|仫佬族|锡伯族|柯尔克孜族|景颇族|撒拉族|布朗族|毛南族|塔吉克族|普米族|阿昌族|怒族|乌孜别克族|俄罗斯族|鄂温克族|崩龙族|裕固族|保安族|京族|独龙族|赫哲族|高山族/g

export const ethnicZHTWReg =
  /傣族|布朗族|獨龍族|佤族|怒族|景頗族|普米族|德昂族|拉祜族|阿昌族|納西族|哈尼族|藏族|蒙古族|回族|維吾爾族|壯族|苗族|彝族|布依族|朝鮮族|滿族|侗族|瑤族|白族|土家族|哈薩克族|黎族|傈僳族|東鄉族|仡佬族|拉祜族|佤族|水族|土族|羌族|達斡爾族|仫佬族|錫伯族|柯爾克孜族|景頗族|撒拉族|布朗族|毛南族|塔吉克族|普米族|阿昌族|怒族|烏孜別克族|俄羅斯族|鄂溫克族|崩龍族|裕固族|保安族|京族|獨龍族|赫哲族|高山族/g
export const cityType =
  /省|自治区|直辖市|特别行政区|市|自治州|盟|地区|县|自治县|旗|自治旗|特区|林区|区|镇|乡|街道|村|社区/g
export const cityZHTWType =
  /省|自治區|直轄市|特別行政區|市|自治州|盟|地區|縣|自治縣|旗|自治旗|特區|林區|區|鎮|鄉|街道|村|社區/g

export const ethnicGroups = [
  '蒙古族',
  '回族',
  '藏族',
  '维吾尔族',
  '苗族',
  '彝族',
  '壮族',
  '布依族',
  '朝鲜族',
  '满族',
  '侗族',
  '瑶族',
  '白族',
  '土家族',
  '哈尼族',
  '哈萨克族',
  '傣族',
  '黎族',
  '傈僳族',
  '佤族',
  '畲族',
  '高山族',
  '拉祜族',
  '水族',
  '东乡族',
  '纳西族',
  '景颇族',
  '柯尔克孜族',
  '土族',
  '达斡尔族',
  '仫佬族',
  '羌族',
  '布朗族',
  '撒拉族',
  '毛南族',
  '仡佬族',
  '锡伯族',
  '阿昌族',
  '普米族',
  '塔吉克族',
  '怒族',
  '乌孜别克族',
  '俄罗斯族',
  '鄂温克族',
  '德昂族',
  '保安族',
  '裕固族',
  '京族',
  '塔塔尔族',
  '独龙族',
  '鄂伦春族',
  '赫哲族',
  '门巴族',
  '珞巴族',
  '基诺族',
]

export const getSimpleCityName = (cityName: string, type: string) => {
  cityName = cityName?.replace(ethnicReg, '')?.replace(ethnicZHTWReg, '')

  if (type === 'city') {
    cityName = cityName
      ?.replace(/(?<=..)(自治县|县|市|旗|自治旗|区|新区)/, '')
      ?.replace(/(?<=..)(自治縣|縣|市|旗|自治旗|區|新區)/, '')
  }
  if (type === 'town') {
    cityName = cityName?.replace(/镇|街道/g, '')?.replace(/鎮|街道/g, '')
  }
  if (type === 'state' || type === 'region') {
    cityName = cityName?.replace(cityType, '')?.replace(cityZHTWType, '')
  }

  return cityName
}

import area from '@turf/area'
import { useRouter } from 'next/router'

export const calculateArea = (boundary: GeoJSON): number => {
  // 使用 @turf/area 计算面积（返回平方米）
  const areaInSquareMeters = area(boundary)
  // 转换为平方公里
  const areaInSquareKilometers = areaInSquareMeters / 1_000_000
  return Number(areaInSquareKilometers.toFixed(2)) // 保留两位小数
}

export const getAllCityAreas = (cityBoundaries: GeoJSON[]): number => {
  let cityArea = 0
  cityBoundaries.forEach((city) => {
    cityArea += calculateArea(city)
  })
  return cityArea
}

const cityMarkerMap: {
  [key: string]: {
    [id: string]: Leaflet.Marker<any>
  }
} = {}

export const convertCityLevelToTypeString = (level: number) => {
  if (level === 1) {
    return 'country'
  } else if (level === 2) {
    return 'state'
  } else if (level === 3) {
    return 'region'
  } else if (level === 4) {
    return 'city'
  } else {
    return 'town'
  }
}

export const deleteCityMarker = (cityId: string, key: string) => {
  let marker = cityMarkerMap?.[key]?.[cityId]
  if (!marker) return

  marker?.remove()
  delete cityMarkerMap[key][cityId]
}
export const deleteAllCityMarker = (key: string) => {
  cityMarkerMap?.[key] &&
    Object.keys(cityMarkerMap?.[key]).forEach((k) => {
      deleteCityMarker(k, key)
    })

  delete cityMarkerMap?.[key]
}

export const createCityMarker = (
  map: Leaflet.Map,
  cityName: string,
  [lat, lng]: number[],
  level: number,
  cityId: string,
  key: string
) => {
  let marker = cityMarkerMap?.[key]?.[cityId]
  if (marker) return marker

  const L: typeof Leaflet = (window as any).L

  let iconSize = 10
  if (level === 4) {
    iconSize = 11
  }
  if (level === 3) {
    iconSize = 13
  }
  if (level === 2) {
    iconSize = 15
  }
  if (level === 1) {
    iconSize = 16
  }

  marker = L.marker([lat, lng], {
    icon: L.divIcon({
      html: `<div class='map-city-marker-wrap h${level}'>
        <span class="h${level}">${cityName}</span>
      </div>`,
      className: 'map-city-marker ',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    }),
  })
    .addTo(map)
    .openPopup()

  if (!cityMarkerMap[key]) {
    cityMarkerMap[key] = {}
  }

  cityMarkerMap[key][cityId] = marker

  return marker
}

export const formartCities = (cities: protoRoot.city.ICityItem[]) => {
  const citiesArr = cities.map((v): CityInfo => {
    return {
      id: v.id || '',
      name: getSimpleCityName(
        getCityName(v.name) || '',
        convertCityLevelToTypeString(v.level || 1)
      ),
      lat: v.coords?.latitude || 0,
      lng: v.coords?.longitude || 0,
      coordinates: [v.coords?.latitude || 0, v.coords?.longitude || 0],
      level: v.level || 0,
      levelStr: convertCityLevelToTypeString(v.level || 1),
      parentCityId: v.parentCityId || '',
    }
  })

  // 直辖市单独处理
  cities.forEach((v) => {
    if (v.level === 2 && v.cities?.[0]?.level === 4) {
      // console.log("ucm 直辖市单独处理", v)

      citiesArr.unshift({
        id: v.id || '',
        name: getSimpleCityName(
          getCityName(v.name) || '',
          convertCityLevelToTypeString(v.level || 1)
        ),
        lat: v.coords?.latitude || 0,
        lng: v.coords?.longitude || 0,
        coordinates: [v.coords?.latitude || 0, v.coords?.longitude || 0],
        level: v.level || 0,
        levelStr: convertCityLevelToTypeString(v.level + 1 || 1),
        parentCityId: v.parentCityId || '',
      })
    }
  })

  citiesArr.forEach((v) => {
    if (v.parentCityId) {
      v.parentCity = citiesArr.filter((sv) => sv.id === v.parentCityId)?.[0]
    }
  })

  return citiesArr
}

// export const getFullCityHierarchyIdsItem = (cities: typeof cityState.cities, ids: string[] = [], id: string) => {
//   cities.forEach((v) => {
//     if (v.id === id) {
//       ids.push(id)
//     } else {
//       ids.push(id)

//       getFullCityHierarchyIdsItem(cities, ids, id)
//     }
//   })

//   return ids
// }

export const getFullCityHierarchyIds = (
  cities: typeof cityState.cities,
  cityIds: string[]
) => {
  let tempCityIds: string[] = []

  // console.log('renderPolyline cityDistricts', cities)

  cities?.forEach((v) => {
    v.cities?.forEach((sv) => {
      sv.cities?.forEach((ssv) => {
        ssv.cities?.forEach((sssv) => {
          if (cityIds.includes(sssv.id || '')) {
            tempCityIds = tempCityIds.concat([
              v.id || '',
              sv.id || '',
              ssv.id || '',
              sssv.id || '',
            ])
          }
          sssv.cities?.forEach((ssssv) => {
            if (cityIds.includes(ssssv.id || '')) {
              tempCityIds = tempCityIds.concat([
                v.id || '',
                sv.id || '',
                ssv.id || '',
                sssv.id || '',
                ssssv.id || '',
              ])
            }
          })
        })
      })
    })

    tempCityIds = Array.from(new Set(tempCityIds))
  })

  // console.log('renderPolyline getFullCityHierarchyIds tempCityIds', tempCityIds)
  return tempCityIds
}

// 1. 类型定义（完全保持您的原始接口）
export interface CityInfo {
  id: string
  name: string
  lat: number
  lng: number
  coordinates: number[]
  level: number
  levelStr: string
  parentCityId: string
  parentCity?: CityInfo
}

// 2. 配置常量（保持您的原始命名和值）
const levelMap: { [key: number]: string[] } = {
  0: ['country'],
  4: ['state'],
  6: ['region'],
  7: ['region', 'city'],
  9: ['region', 'city', 'town'],
  11: ['city', 'town'],
}

const minPixelDistance = 50 // 保持您原始的50像素距离

// 3. 全局缓存（实例安全版）
export const cityNameMarkerCache = new WeakMap<L.Map, Map<string, L.Marker>>()

// 4. 核心函数（完全保持您的业务逻辑）
export function updateCityMarkers(
  map: L.Map,
  citiesArr: CityInfo[],
  zoom: number
) {
  if (!map) return
  const L: typeof Leaflet = (window as any).L

  // console.log('citiesArr', citiesArr)
  // console.log('CityName', updateCityMarkers)

  // 初始化当前地图的缓存
  if (!cityNameMarkerCache.has(map)) {
    cityNameMarkerCache.set(map, new Map())
  }
  const currentcityNameMarkerCache = cityNameMarkerCache.get(map)!

  // 1. 获取当前应显示的层级（完全一致）
  let displayLevels: string[] = []
  for (const [zoomLevel, levels] of Object.entries(levelMap)) {
    if (zoom >= parseInt(zoomLevel)) {
      displayLevels = levels
    } else {
      break
    }
  }

  // 2. 筛选要显示的城市（保持递归添加父级逻辑）
  const citiesToDisplay: CityInfo[] = []
  const addedNames = new Set<string>()

  citiesArr.forEach((city) => {
    if (!displayLevels.includes(city.levelStr)) return

    // 添加当前城市（确保名称唯一）
    if (!addedNames.has(city.name)) {
      citiesToDisplay.push(city)
      addedNames.add(city.name)
    }

    // 完全保持您的父级添加逻辑
    let parentId = city.parentCityId
    while (parentId) {
      const parentCity = citiesArr.find((c) => c.id === parentId)
      if (
        parentCity &&
        displayLevels.includes(parentCity.levelStr) &&
        !addedNames.has(parentCity.name)
      ) {
        citiesToDisplay.push(parentCity)
        addedNames.add(parentCity.name)
      }
      parentId = parentCity?.parentCityId || ''
    }
  })

  // 3. 网格分区（完全一致）
  const gridSize = 1 / Math.pow(2, zoom - 5)
  const grid: { [key: string]: CityInfo[] } = {}

  citiesToDisplay.forEach((city) => {
    const [lat, lng] = city.coordinates
    const gridKey = `${Math.floor(lat / gridSize)}-${Math.floor(
      lng / gridSize
    )}`
    if (!grid[gridKey]) {
      grid[gridKey] = []
    }
    grid[gridKey].push(city)
  })

  // 4. 网格内过滤（严格保持您的层级关系检查）
  const filteredGrid: { [key: string]: CityInfo[] } = {}

  for (const gridKey in grid) {
    const gridCities = grid[gridKey]

    // 完全保持您的优先级排序逻辑
    gridCities.sort((a, b) => {
      const priorityA = levelPriority(a.levelStr, displayLevels)
      const priorityB = levelPriority(b.levelStr, displayLevels)
      return priorityA - priorityB
    })

    // 完全保持您的层级关系检查
    const selectedCities: CityInfo[] = []
    for (const city of gridCities) {
      const isRelated = selectedCities.some((selected) =>
        isInSameHierarchy(selected, city, citiesArr)
      )
      if (!isRelated) {
        selectedCities.push(city)
      }
    }
    filteredGrid[gridKey] = selectedCities
  }

  // 5. 像素距离检测（完全一致的计算公式）
  const finalCities: CityInfo[] = []
  const usedPositions: { x: number; y: number }[] = []

  Object.values(filteredGrid)
    .flat()
    .forEach((city) => {
      const point = map.latLngToLayerPoint(L.latLng(city.coordinates as any))
      const isTooClose = usedPositions.some((pos) => {
        const dx = point.x - pos.x
        const dy = point.y - pos.y
        return Math.sqrt(dx * dx + dy * dy) < minPixelDistance
      })

      if (!isTooClose) {
        finalCities.push(city)
        usedPositions.push({ x: point.x, y: point.y })
      }
    })

  // 6. 更新标记（保持原始渲染逻辑）
  const bounds = map.getBounds()
  const existingMarkers = new Set<string>()

  // 添加新标记
  finalCities.forEach((city) => {
    if (bounds.contains(city.coordinates as any)) {
      let markerKey = `${city.name}`
      let tempCity: CityInfo | undefined = city
      // console.log('tempCity', tempCity)
      let i = 0
      while (tempCity?.parentCity) {
        tempCity = tempCity.parentCity
        if (tempCity) {
          markerKey = `${tempCity?.name || ''}${markerKey}`
        }
        i++
        if (i > 5) {
          break
        }
      }

      existingMarkers.add(markerKey)

      if (!currentcityNameMarkerCache.has(markerKey)) {
        const marker = L.marker(city.coordinates as any, {
          icon: getIconByLevel(city),
        }).bindPopup(markerKey)
        map.addLayer(marker)
        currentcityNameMarkerCache.set(markerKey, marker)
      }
    }
  })

  // 清理旧标记
  currentcityNameMarkerCache.forEach((marker, key) => {
    if (!existingMarkers.has(key) || !bounds.contains(marker.getLatLng())) {
      map.removeLayer(marker)
      currentcityNameMarkerCache.delete(key)
    }
  })
}

// 辅助函数（完全保持您的原始实现）
function isInSameHierarchy(
  city1: CityInfo,
  city2: CityInfo,
  allCities: CityInfo[]
): boolean {
  let current = city1
  while (current.parentCityId) {
    if (current.parentCityId === city2.id) return true
    current = allCities.find((c) => c.id === current.parentCityId) || current
    if (current === city1) break
  }

  current = city2
  while (current.parentCityId) {
    if (current.parentCityId === city1.id) return true
    current = allCities.find((c) => c.id === current.parentCityId) || current
    if (current === city2) break
  }

  return false
}

function levelPriority(level: string, displayLevels: string[]): number {
  const basePriorities: Record<string, number> = {
    country: 0,
    state: 1,
    region: 2,
    city: 3,
    town: 4,
  }
  return displayLevels.includes(level) ? basePriorities[level] ?? 5 : Infinity
}

function getIconByLevel(cityInfo: CityInfo): L.DivIcon {
  const { level, name } = cityInfo
  let iconSize = 0
  if (level === 4) iconSize = 9
  if (level === 3) iconSize = 10
  if (level === 2) iconSize = 12
  if (level === 1) iconSize = 14

  const L: typeof Leaflet = (window as any).L
  return L.divIcon({
    html: `<div class='map-city-marker-wrap h${level}'>
        <span class="h${level}">${name}</span>
      </div>`,
    className: `map-city-marker h${level}`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  })
}

// function getIconByLevel(city: CityInfo): L.DivIcon {
//   const L: typeof Leaflet = (window as any).L
//   const sizes = [8, 9, 10, 12, 14] // 对应level 0-4
//   const size = sizes[Math.min(city.level, 4)] || 8

//   return L.divIcon({
//     html: `<div class='map-city-marker-wrap h${city.level}'>
//       <span class="h${city.level}">${city.name}</span>
//     </div>`,
//     className: 'map-city-marker',
//     iconSize: [size, size],
//     iconAnchor: [size / 2, size / 2],
//   })
// }

export const loadCityBoundaries = async (
  tCityDistricts: protoRoot.city.ICityItem[]
) => {
  const cities = tCityDistricts

  // console.log('citiescities', cities)
  const citiesNames = cities.reduce(
    (tv, cv) => {
      if (
        tv.filter((sv) => {
          return sv.cityId === cv.id
        })?.length === 0
      ) {
        const lat = cv.coords?.latitude || 0
        const lng = cv.coords?.longitude || 0

        tv.push({
          cityId: cv.id || '',
          level: cv.level || 0,
          name: cv.fullName?.zhCN || '',
        })
      }

      return tv
    },
    [] as {
      cityId: string
      level: number
      name: string
    }[]
  )

  if (!cities?.length) {
    return []
  }

  const cityBoundaries = await store
    .dispatch(
      methods.city.GetCityBoundaries({
        cities: citiesNames,
      })
    )
    .unwrap()
  // console.log('gcv GetCityBoundaries', cityBoundaries)

  // setCityBoundaries(cityBoundaries)

  return cityBoundaries
}
// 定义类型
type CityGeojsonMap = Record<string, Record<string, Leaflet.GeoJSON>>

// 初始化 cityGeojsonMap
const cityGeojsonMap: CityGeojsonMap = {}

// 删除单个城市的 GeoJSON
export const deleteCityGeojsonMap = (cityId: string, key: string): void => {
  const cityMap = cityGeojsonMap[key]
  if (!cityMap) return

  const marker = cityMap[cityId]
  if (!marker) return

  marker.remove()
  delete cityMap[cityId]
}

// 删除指定 key 下的所有 GeoJSON
export const deleteAllCityGeojsonMap = (key: string): void => {
  const cityMap = cityGeojsonMap[key]
  if (!cityMap) return

  // 批量移除所有 marker
  for (const cityId in cityMap) {
    cityMap[cityId].remove()
  }

  // 清空整个 key 的内容
  delete cityGeojsonMap[key]
}
// 创建城市边界
export const createCityBoundaries = ({
  map,
  cityGeojson,
  style = {
    color: '#f29cb2',
    weight: 2,
    opacity: 0.65,
    fillColor: '#f29cb2',
    fillOpacity: 0.05,
  },
  cityId,
  key,
}: {
  map: Leaflet.Map
  cityGeojson: Geometry
  style?: {
    color: string
    weight: number
    opacity: number
    fillColor: string
    fillOpacity: number
  }
  cityId: string
  key: string
}) => {
  if (!map) return
  // 直接检查是否存在 GeoJSON
  const cityMap = cityGeojsonMap[key] || (cityGeojsonMap[key] = {})
  const existingGeojson = cityMap[cityId]
  if (existingGeojson) return existingGeojson

  // 构造边界数据
  const boundaryData: Feature = {
    type: 'Feature',
    geometry: cityGeojson,
    properties: { name: cityId },
  }

  // 创建 GeoJSON 并添加到地图
  const L: typeof Leaflet = (window as any).L
  const geojson = L.geoJSON(boundaryData, { style })?.addTo(map)
  cityMap[cityId] = geojson

  return geojson
}

const getFullCities = (cities: protoRoot.city.ICityItem[], id: string) => {
  let cCities = cities.filter((v) => v.id === id)

  if (cCities?.[0]?.parentCityId) {
    cCities = getFullCities(cities, cCities?.[0]?.parentCityId).concat(cCities)
  }

  // console.log("cRes2", cCities)

  return cCities
}

const getCenterCityD = new Debounce()

export const getCenterCity = async (
  lat: number,
  lng: number,
  f: (cityInfo: (typeof cityState)['cityInfo']) => void
) => {
  const res = await regeo({
    lat,
    lng,
  })
  console.log('center', res)

  res && f(res)
}

export const watchCenterCity = async (
  map: Leaflet.Map,
  f: (cityInfo: (typeof cityState)['cityInfo']) => void
) => {
  const center: L.LatLng = map.getCenter()
  getCenterCity(center.lat, center.lng, f)

  map.on('moveend', () => {
    getCenterCityD.increase(async () => {
      try {
        if (!map?.getCenter) return
        const center: L.LatLng = map.getCenter()
        getCenterCity(center.lat, center.lng, f)
      } catch (error) {
        console.error(error)
      }
    }, 1000)
  })
}

export const citySlice = createSlice({
  name: modelName,
  initialState: cityState,
  reducers: {
    setUpdateCitiesTime: (
      state,
      params: {
        payload: number
        type: string
      }
    ) => {
      state.updateCitiesTime = params.payload
    },
    setCities: (
      state,
      params: {
        payload: typeof cityState.cities
        type: string
      }
    ) => {
      state.cities = params.payload
      state.updateCitiesTime = Math.floor(new Date().getTime() / 1000) + 10 * 60

      console.log('renderPolyline cityDistricts', params.payload)
      const tempCityDistricts: typeof cityState.cityDistricts = {
        country: [],
        state: [],
        region: [],
        city: [],
        town: [],
      }

      const formatCityDistricts = (
        cities: protoRoot.city.ICityItem[],
        parentCity?: protoRoot.city.ICityItem
      ) => {
        cities?.forEach((v) => {
          // if (String(v?.name) === '贵阳市' && v.coords) {
          // 	v.coords.latitude = 26.5878031
          // 	v.coords.longitude = 106.7086936
          // }

          v.fullName = {}
          v.name &&
            Object.keys(v.name).forEach((lang: any) => {
              let pFullName = (parentCity?.fullName as any)?.[lang] || ''

              ;(v.fullName as any)[lang] =
                (pFullName ? pFullName + ',' : '') +
                ((v.name as any)[lang] || '')
            })

          if (v.level === 2) {
            if (v.cities?.[0]?.level === 4) {
              tempCityDistricts['region'].push(v)
            }
          }
          tempCityDistricts[convertCityLevelToTypeString(Number(v.level))].push(
            v
          )
          v.cities?.length && formatCityDistricts(v.cities || [], v)
        })
      }

      formatCityDistricts(params.payload || [])

      state.cityDistricts = tempCityDistricts
    },
    setCityInfo: (
      state,
      params: {
        payload: typeof cityState.cityInfo
        type: string
      }
    ) => {
      state.cityInfo = params.payload
    },
  },
})

export const regeo = async ({ lat, lng }: { lat: number; lng: number }) => {
  const res = await R.request({
    method: 'GET',
    url:
      // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
      // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
      // `https://nominatim.aiiko.club/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&accept-language=zh-CN`,
      toolApiUrl +
      `/api/v1/geocode/regeo?latitude=${lat}&longitude=${lng}&platform=Amap`,
    // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lon}&platform=Amap`
  })
  if (!res?.data) {
    return
  }
  // const data: ReverseGeocode = res.data as any
  // if (!((data.addresstype === "town" && data.name.lastIndexOf("镇") === data.name.length - 1) || (data.addresstype === "suburb" && data.name.lastIndexOf("街道") === data.name.length - 2)) && zoom > 12) {
  //   dispatch(
  //     methods.city.GetCity({
  //       lat: lat,
  //       lng: lng,
  //       zoom: zoom - 1
  //     })
  //   )
  //   return
  // }
  const data = res.data.data as any
  // console.log('GetCity', toolApiUrl, data)
  if (!data?.country || res?.data?.code !== 200) return
  let newCi: (typeof cityState)['cityInfo'] = {
    country: data.country,
    state: data.state,
    region: data.region,
    city: data.city,
    town: data.town,
    road: data.road,
    address: [data.country, data.state, data.region, data.city, data.town]
      .filter((v) => v)
      .join('·'),
    lat,
    lng,
  }

  return newCi
}

export const getCityName = (
  cityName: protoRoot.city.ICityName | null | undefined
): string => {
  if (!cityName) return ''
  let lang = ''
  switch (i18n.language) {
    case 'en-US':
      lang = 'en'
      break
    case 'zh-CN':
      lang = 'zhHans'

      break
    case 'zh-TW':
      lang = 'zhHant'

      break

    default:
      lang = 'en'
      break
  }

  let name = (cityName as any)[lang]
  // console.log("getCityName", cityName, name, lang)
  return name
}

export const voiceBroadcast = (city: string) => {
  // const tripArrivalMessages = [
  //   '你已经到了 {{city}}，记下这一站喽',
  //   '抵达 {{city}}！旅途的小标记 +1',
  //   '现在是 {{city}}，继续出发咯',
  //   '{{city}}，打卡成功～前方还有很多风景',
  //   '你好呀，{{city}}！旅程继续咯',
  //   '{{city}} 到啦，这段路也成了回忆的一部分',
  //   '成功抵达 {{city}}，愿这站也值得收藏',
  //   '已进入 {{city}}，小小记录仪已就位',
  //   '旅程更新：你现在在 {{city}}',
  //   '到达 {{city}}～继续向前走，不回头',
  //   '终于到了 {{city}}，这次的风景很美哦',
  //   '欢迎来到 {{city}}，新的冒险开始了',
  //   '{{city}}，新的印记！继续探索这个地方吧',
  //   '到了 {{city}}，踏上了这片神奇的土地',
  //   '抵达 {{city}}，旅途中的每一站都是故事',
  //   '哇，{{city}}！继续往前走，精彩还在后头',
  //   '成功到达 {{city}}，放慢脚步享受这一站的魅力',
  //   '终于在 {{city}}，小小的心情有了归属',
  //   '你已经来到了 {{city}}，让我们继续前行吧',
  //   '当前所在：{{city}}，风景就在前方',
  // ]

  // for (let i = 0; i < 50; i++) {
  //   console.log('VoiceBroadcast', random(0, tripArrivalMessages.length))
  // }

  // const text = tripArrivalMessages[
  //   Number(random(0, tripArrivalMessages.length))
  // ].replace('{{city}}', city)

  const text = t('voiceBroadcastText', {
    ns: 'tripPage',
    city: city,
  })

  const msgSnackbar = snackbar({
    message: text,
    vertical: 'center',
    horizontal: 'center',
    backgroundColor: 'var(--saki-default-color)',
    color: '#fff',
    autoHideDuration: 12000,
  })

  msgSnackbar.open()
  ;(window as any).responsiveVoice.speak(
    text,
    'Chinese Female', // 中文女声
    {
      pitch: 1, // 音调
      rate: 1, // 语速
      volume: 2, // 音量
      onend: () => {
        msgSnackbar.close()
        console.log('播放完成！')
      },
    }
  )
}

const asyncQueue = new AsyncQueue({
  maxQueueConcurrency: 5,
})

export const cityMethods = {
  GetCity: createAsyncThunk(
    modelName + '/GetCity',
    async (
      {
        lat,
        lng,
        customGPS = false,
      }: {
        lat: number
        lng: number
        customGPS?: boolean
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch

      const t = i18n.t

      try {
        const { city, config, user } = store.getState()
        let ci: typeof cityState.cityInfo = {
          ...city.cityInfo,
        }
        let newCi = await regeo({
          lat,
          lng,
        })

        // console.log('regeo', newCi)

        if (!newCi) return

        if (!customGPS && config.turnOnCityVoice) {
          // 不包括国家
          let msg = ''
          if (ci.country && newCi.country && newCi.country !== ci.country) {
            msg = `${newCi.country}·${newCi.state}·${newCi.region}·${newCi.city}·${newCi.town}`
          } else if (ci.state && newCi.state && newCi.state !== ci.state) {
            msg = `${newCi.state}·${newCi.region || newCi.city} `
          } else if (ci.region && newCi.region && newCi.region !== ci.region) {
            msg = `${newCi.region || newCi.state}·${newCi.city} `
          } else if (
            (ci.city && newCi.city && newCi.city !== ci.city) ||
            (ci.town && newCi.town && newCi.town !== ci.town)
          ) {
            msg = `${newCi.city || newCi.region}·${newCi.town} `
          }

          // msg = "贵州省安顺市镇宁布依族苗族自治县黄果树瀑布景区"

          // 缺乏i18n
          if (msg) {
            voiceBroadcast(msg)

            // if ("speechSynthesis" in window) {
            //   // 清空队列
            //   window.speechSynthesis.cancel();

            //   // 创建语音对象
            //   const utterance = new SpeechSynthesisUtterance(text);
            //   utterance.lang = "zh-TW";
            //   utterance.pitch = 1;
            //   utterance.rate = 1;

            //   // 等待语音加载
            //   window.speechSynthesis.onvoiceschanged = () => {
            //     const voices = window.speechSynthesis.getVoices();
            //     utterance.voice = voices.find(voice => voice.lang === "zh-TW") ||
            //       voices.find(voice => voice.lang.startsWith("zh")) ||
            //       voices[0]; // 回退到第一个可用语音
            //   };

            //   // 添加事件监听
            //   utterance.addEventListener("end", () => {
            //     console.log("Speech synthesis finished.");
            //     msgSnackbar.close();
            //   });
            //   utterance.addEventListener("error", (err) => {
            //     console.error("Speech synthesis error:", err);
            //   });

            //   // 开始播放
            //   if (window.speechSynthesis.speaking) {
            //     console.warn("Speech synthesis is already speaking. Cancelling...");
            //     window.speechSynthesis.cancel();
            //   }
            //   window.speechSynthesis.speak(utterance);
            // } else {

            //   console.error("Sorry, your browser does not support speech synthesis.");
            // }
          }
        }

        dispatch(
          citySlice.actions.setCityInfo({
            ...ci,
            ...newCi,
          })
        )
      } catch (error) {
        console.error(error)
      }
    }
  ),
  GetAllCitiesVisitedByUser: createAsyncThunk(
    modelName + '/GetAllCitiesVisitedByUser',
    async (
      {
        tripIds,
      }: {
        tripIds: string[]
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch

      const { city } = store.getState()

      // if (
      //   city.cities.length &&
      //   city.updateCitiesTime > Math.floor(new Date().getTime() / 1000)
      // ) {
      //   return city.cities
      // }
      try {
        let jmId = ''
        const urlQuery = parseQuery(location.href)
        if (location.pathname.includes('/journeyMemories/detail')) {
          jmId = urlQuery?.id || ''
        }
        let tripId = ''
        if (location.pathname.includes('/trip/detail')) {
          tripId = urlQuery?.id || ''
        }

        const cities = await storage.global.get(
          'GetAllCitiesVisitedByUser' + jmId + tripId
        )

        // console.log(
        //   'renderPolyline cityDistricts',
        //   cities,
        //   cities?.updateCitiesTime > Math.floor(new Date().getTime() / 1000),
        //   cities?.updateCitiesTime,
        //   Math.floor(new Date().getTime() / 1000)
        // )
        if (
          cities?.cities?.length > 0 &&
          cities?.updateCitiesTime > Math.floor(new Date().getTime() / 1000)
        ) {
          dispatch(citySlice.actions.setCities(cities?.cities || []))
          // return (cities?.cities || []) as protoRoot.city.ICityItem[]
        }

        const res = await httpApi.v1.GetAllCitiesVisitedByUser({
          tripIds,
          jmId,
          tripId,
        })
        console.log('renderPolyline res gcv', tripIds, res)
        if (res.code === 200) {
          await storage.global.set(
            'GetAllCitiesVisitedByUser' + jmId + tripId,
            {
              cities: res.data?.cities || [],
              updateCitiesTime:
                Math.floor(new Date().getTime() / 1000) + 10 * 60,
            }
          )

          dispatch(citySlice.actions.setCities(res.data?.cities || []))
        }
        return res.data?.cities || []
      } catch (error) {
        console.error(error)
        return []
      }
    }
  ),
  GetCityDetails: createAsyncThunk(
    modelName + '/GetCityDetails',
    async (
      {
        trip,
      }: {
        trip: protoRoot.trip.ITrip
      },
      thunkAPI
    ) => {
      const dispatch = thunkAPI.dispatch

      try {
        const ids = trip?.cities?.map((v) => v.cityId || '') || []

        if (!ids.length) return trip.cities

        const cRes = await httpApi.v1.GetCityDetails({
          ids,
          tripId: trip.id,
        })
        console.log('GetCityDetails cRes', cRes)
        if (cRes.code === 200) {
          // const promiseAll: any[] = []
          // ids?.forEach(v => {

          //   trip.cities?.some(sv => {
          //     if (v === sv.cityId) {

          //       return true
          //     }
          //   })
          //   // const fullCities = getFullCities(cRes.data?.cities || [], v || "")
          //   // promiseAll.push(storage.cityDetails.set(v, {
          //   //   cityDetails: fullCities,
          //   //   city: fullCities.filter((_, i) => i >= 1).map(v => v.name?.["zhCN"] || "").join("·"),
          //   //   cityId: v
          //   // }))
          // })

          // await Promise.all(promiseAll)

          trip.cities?.forEach((v) => {
            const fullCities = getFullCities(
              cRes.data?.cities || [],
              v.cityId || ''
            )

            v.city = fullCities
              .filter((_, i) => i >= 1)
              .map((v) => getCityName(v.name) || '')
              .join('·')

            v.cityDetails = fullCities

            // const cityInfo = storage.cityDetails.getSync(v.cityId || "")
            // // console.log("cityInfo", cityInfo, v.cityId, res.data?.trip?.cities)
            // if (cityInfo) {
            //   v.city = cityInfo.city
            //   v.cityDetails = cityInfo.cityDetails
            // }
          })
          // dispatch(tripSlice.actions.setTripForDetailPage(tripDetail))
        }
        return trip.cities
      } catch (error) {
        console.error(error)
      }
    }
  ),
  GetCityBoundaries: createAsyncThunk(
    modelName + '/GetCityBoundaries',
    async (
      {
        cities,
      }: {
        cities: {
          cityId: string
          level: number
          name: string
        }[]
      },
      thunkAPI
    ) => {
      try {
        // console.log('cityBoundariesaq', cities, cities)

        const cityBoundaries: {
          cityId: string
          level: number
          geojson: GeoJSON
        }[] = []

        const posAll: any[] = []

        for (let i = 0; i < cities.length; i++) {
          asyncQueue.increase(async () => {
            const cityId = cities[i].cityId || ''
            let geojson = await storage.cityBoundaries.get(cityId)

            // console.log("cityBoundariesaq1", geojson)
            if (!geojson) {
              const res = await R.request({
                method: 'GET',
                url:
                  // nominatimUrl
                  // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=104.978701,24.900169&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
                  // `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=fb7fdf3663af7a532b8bdcd1fc3e6776&radius=100&extensions=all`
                  `${nominatimUrl}/search?q=${cities[i].name}&format=jsonv2&addressdetails=1&polygon_geojson=1&accept-language=zh-CN`,
                // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lon}&platform=Amap`
              })

              const data: ReverseGeocode[] = res.data as any

              console.log('gcv', data)
              if (data) {
                const geoRes = data.filter(
                  (v) =>
                    v.geojson.type === 'Polygon' ||
                    v.geojson.type === 'MultiPolygon'
                )?.[0]

                geojson = geoRes?.geojson
                if (geojson) {
                  await storage.cityBoundaries.set(cityId, geojson)
                }
                // console.log('cityBoundariesaq555', geojson, cities[i].name)
              }
            }
            geojson &&
              cityBoundaries.push({
                cityId: cityId,
                level: cities[i]?.level || 0,
                geojson: geojson,
              })
          })
        }

        await asyncQueue.wait.waiting()

        // console.log('cityBoundariesaq3', cityBoundaries.length, cities.length)

        return cityBoundaries
      } catch (error) {
        console.error(error)
        return []
      }
    }
  ),
}
