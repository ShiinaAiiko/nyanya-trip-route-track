import React, { memo, use, useEffect, useMemo, useRef, useState } from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, {
  RootState,
  AppDispatch,
  useAppDispatch,
  methods,
  configSlice,
  userSlice,
  layoutSlice,
  tripSlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent, progressBar } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { Chart } from 'chart.js/auto'
import {
  formatAvgPace,
  formatDistance,
  formatTime,
  formatTimestamp,
  getDistance,
  getLatLng,
  getSpeedColor,
  getZoom,
  isResumeTrip,
  isRoadColorFade,
  roadColorFade,
  // testGpsData,
} from '../plugins/methods'
import Leaflet from 'leaflet'
import html2canvas from 'html2canvas'
import {
  cnMap,
  eventListener,
  getMapLayer,
  getTrackRouteColor,
  maps,
  osmMap,
} from '../store/config'
import NoSSR from './NoSSR'
import { useRouter } from 'next/router'
import { Debounce, deepCopy } from '@nyanyajs/utils'
import { VehicleLogo } from './Vehicle'
import { initTripCity, initTripItemCity } from '../store/trip'
import {
  CityInfo,
  convertCityLevelToTypeString,
  createCityBoundaries,
  createCityMarker,
  deleteAllCityGeojsonMap,
  deleteAllCityMarker,
  deleteCityGeojsonMap,
  deleteCityMarker,
  formartCities,
  GeoJSON,
  getCityName,
  getSimpleCityName,
  updateCityMarkers,
} from '../store/city'
import {
  CityTimeLineComponent,
  CityTimeLineItem,
  formatTimeLineCities,
} from './VisitedCities'
import { loadModal } from '../store/layout'
import { clearLayer, createIconMarker, renderPolyline } from '../store/map'
import {
  SakiButton,
  SakiIcon,
  SakiRow,
  SakiTitle,
} from './saki-ui-react/components'
import { LayerButtons } from './MapLayer'

// memo()
const TripItemComponent = memo(
  ({
    tripId,
    // shareKey,
    isShare,
    onBack,
    onDelete,
    onTrip,
  }: // trip,
  {
    isShare: boolean
    tripId: string
    // shareKey: string
    onBack: () => void
    onDelete: (tripId: string) => void
    onTrip: (trip?: protoRoot.trip.ITrip) => void
  }) => {
    // console.log('TripItemComponent', tripId)
    const { t, i18n } = useTranslation('tripItemPage')
    const layout = useSelector((state: RootState) => state.layout)
    const config = useSelector((state: RootState) => state.config)
    const user = useSelector((state: RootState) => state.user)
    const geo = useSelector((state: RootState) => state.geo)
    const vehicle = useSelector((state: RootState) => state.vehicle)
    const { trip, cityBoundaries } = useSelector(
      (state: RootState) => state.trip.detailPage
    )

    // const tempCitiesTimeline = useMemo(() => {
    //   const citiles = trip?.cities?.reduce((val, cv) => {
    //     val =
    //       val.concat(
    //         cv?.entryTimes
    //           ?.map((v) => {
    //             const cityItem: protoRoot.city.ICityItem = deepCopy(
    //               cv.cityDetails?.filter((sv) => sv.id === cv.cityId)?.[0]
    //             ) as any

    //             if (cityItem) {
    //               cityItem.fullName = {}
    //               cityItem.name &&
    //                 Object.keys(cityItem.name).forEach((lang: any) => {
    //                   ;(cityItem.fullName as any)[lang] = cv.cityDetails
    //                     ?.map((v) => getCityName(v.name))
    //                     .join(',')
    //                 })

    //               cityItem.firstEntryTime = v.timestamp
    //             }
    //             return cityItem
    //           })
    //           .filter((v) => v) || []
    //       ) || []
    //     return val
    //   }, [] as protoRoot.city.ICityItem[])
    //   citiles?.sort(
    //     (a, b) => Number(a.firstEntryTime) - Number(b.firstEntryTime)
    //   )

    //   const tempCitiesTimeline: CityTimeLineItem[] = []

    //   citiles?.forEach((v) => {
    //     const date =
    //       getCityName(v.fullName)
    //         ?.split(',')
    //         .filter((v, i, arr) => {
    //           return i < arr.length - 2 && i > 0
    //         })
    //         .join(' · ') || ''

    //     const lastItem = tempCitiesTimeline[tempCitiesTimeline.length - 1]
    //     if (!lastItem || lastItem.date !== date) {
    //       tempCitiesTimeline.push({
    //         date,
    //         list: [],
    //       })
    //     }

    //     tempCitiesTimeline[tempCitiesTimeline.length - 1].list.push(v)
    //   })

    //   console.log('tempCitiesTimeline', tempCitiesTimeline)
    //   return tempCitiesTimeline
    // }, [trip])

    const speedChart = useRef<Chart<'line', any[], unknown>>()
    const map = useRef<Leaflet.Map>()
    const getTripDebounce = useRef(new Debounce())
    const outSpeedLineChartDebounce = useRef(new Debounce())
    const loadedMap = useRef(false)
    const layer = useRef<any>()
    const maxSpeedMarker = useRef<Leaflet.Marker<any>>()

    const router = useRouter()

    const dispatch = useDispatch<AppDispatch>()
    // const [menuType, setMenuType] = useState('Appearance')
    // const [menuType, setMenuType] = useState(type || 'Account')
    const [closeIcon, setCloseIcon] = useState(true)
    const [showItemPage, setShowItemPage] = useState(false)
    const [startScroll, setStartScroll] = useState(false)
    const [mounted, setMounted] = useState(false)

    // const [currentMapUrl, setCurrentMapUrl] = useState('')
    const [openMoreDropDownMenu, setOpenMoreDropDownMenu] = useState(false)

    const [shareImageDataBase, setShareImageDataBase] = useState<string>('')
    const [generatingSharedData, setGeneratingSharedData] = useState(false)

    const [openTimelineFilterTypeDropDown, setOpenTimelineFilterTypeDropDown] =
      useState(false)
    const [timelineFilterType, setTimeLineFilterType] = useState('All')

    const [loadStatus, setLoadStatus] = useState<
      'loading' | 'loaded' | 'noMore'
    >('loaded')
    // const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

    const [mapLayerFeaturesList, setMapLayerFeaturesList] = useState({
      mapLayer: true,
      mapMode: true,
      roadColorFade: true,
      showAvatarAtCurrentPosition: false,
      showSpeedColor: false,
      cityName: true,
      cityBoundaries: true,
      tripTrackRoute: false,
      speedAnimation: false,
      turnOnVoice: false,
      showPositionMarker: false,
      trackSpeedColor: true,
      trackRouteColor: true,
      polylineWidth: true,
      speedColorLimit: true,
    })

    const { mapLayer, speedColorRGBs, mapLayerType, mapUrl } = useMemo(() => {
      const ml = getMapLayer('tripItemPage')
      console.log('dddddd', ml)

      const tempFeaturesList = {
        ...mapLayerFeaturesList,
        trackSpeedColor: !!ml.mapLayer?.showSpeedColor,
        trackRouteColor: !ml.mapLayer?.showSpeedColor,
        polylineWidth: !!ml.mapLayer?.tripTrackRoute,
        speedColorLimit: !!ml.mapLayer?.tripTrackRoute,
      }

      tempFeaturesList.trackSpeedColor = !ml.mapLayer?.tripTrackRoute
        ? false
        : tempFeaturesList.trackSpeedColor
      tempFeaturesList.trackRouteColor = !ml.mapLayer?.tripTrackRoute
        ? false
        : tempFeaturesList.trackRouteColor

      setMapLayerFeaturesList(tempFeaturesList)

      return ml
    }, [
      config.configure,
      config.country,
      config.connectionOSM,
      config.initConfigure,
    ])

    useEffect(() => {
      setMounted(true)

      const refreshMapSizeDebounce = new Debounce()
      window.addEventListener('resize', () => {
        refreshMapSizeDebounce.increase(() => {
          map.current?.invalidateSize(true)
        }, 400)
      })
      eventListener.on('tripItemResize', (v) => {
        refreshMapSizeDebounce.increase(() => {
          console.log('tripItemResize', 'tripItemResize')
          map.current?.invalidateSize(true)
        }, 400)
      })

      // eventListener.on('editTrip', (v) => {
      // 	console.log(v, trip)
      // 	if (trip?.id === v.id) {
      // 		const obj: any = {}

      // 		v.type && (obj['type'] = v.type)

      // 		console.log(obj, {
      // 			...trip,
      // 			...obj,
      // 		})
      // 		setTrip({
      // 			...trip,
      // 			...obj,
      // 		})
      // 	}
      // })
    }, [])
    // useEffect(() => {
    // 	if (tripId) {
    // 		getTrip()
    // 	} else {
    // 		setTrip(undefined)
    // 	}
    // }, [tripId])

    useEffect(() => {
      // console.log('replayTripId initMap', tripId, shareKey, user.isLogin)

      // console.log('setTripForDetailPage initMap', tripId, map.current)

      if (tripId) {
        getTrip()
        return
      }
      dispatch(tripSlice.actions.setTripForDetailPage(undefined))

      speedChart.current?.destroy()
      speedChart.current = undefined
      map.current?.remove()
      map.current = undefined
      loadedMap.current = false
      setShareImageDataBase('')

      // setTrip(undefined)
    }, [tripId, user.isLogin])

    useEffect(() => {
      isShare && map && outShareImage()
    }, [isShare, map])

    useEffect(() => {
      if (tripId && trip?.id && map.current && !speedChart.current) {
        outSpeedLineChart()
      }
    }, [trip?.id, map.current, speedChart.current])

    useEffect(() => {
      layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
      layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
      layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')
    }, [mapLayer?.mapMode])

    useEffect(() => {
      console.log('initMap', trip, loadedMap.current)
      if (trip?.id) {
        initMap()
      }
    }, [tripId, trip?.id])
    useEffect(() => {
      console.log('initMap mapUrl', trip, loadedMap.current)
      if (mapUrl) {
        loadedMap.current = false
        initMap()
      }
    }, [mapUrl, mapLayer?.roadColorFade])

    useEffect(() => {
      if (map.current) {
        ;(map.current as any).mapUrl = mapUrl
        ;(map.current as any).speedColorRGBs = speedColorRGBs
      }
    }, [map.current, speedColorRGBs, mapUrl])
    const initMap = () => {
      const L: typeof Leaflet = (window as any).L

      console.log('---initMap---', loadedMap.current, trip?.id)

      if (L && tripId && !loadedMap.current && trip?.id && trip?.id !== '404') {
        loadedMap.current = true
        console.log(
          '---initMap--- 里面',
          document.querySelector('#tic-map'),
          map.current,
          loadedMap.current
        )
        if (map.current) {
          map.current?.off()
          map.current?.remove()
          map.current = undefined

          maxSpeedMarker.current?.remove()
          maxSpeedMarker.current = undefined
        }
        if (!map.current) {
          map.current = L.map('tic-map', {
            renderer: L.canvas(),
            preferCanvas: true,
            zoomControl: false,
            minZoom: 3,
            maxZoom: 18,
            trackResize: false,
            zoomDelta: 0.5,
            zoomSnap: 0.5,

            zoom: 15,
            attributionControl: false,
            // center: [Number(res?.data?.lat), Number(res?.data?.lon)],
          })
        }

        console.log(geo.position)
        let lat = geo.position?.coords?.latitude || 0
        let lon = geo.position?.coords?.longitude || 0
        let zoom = 13

        let positions = trip?.positions || []

        positions = positions.filter((v, i) => {
          const gss = !(v.speed === null || v.altitude === null)

          if (v.speed && v.speed > 45) {
            // console.log(v.speed, v.timestamp)
          }
          return gss
        })
        if (positions.length) {
          const startPosition = positions[0]
          const endPosition = positions[positions.length - 1]

          lat =
            (startPosition.latitude || 0) -
            ((startPosition.latitude || 0) - (endPosition.latitude || 0)) / 2
          lon =
            (startPosition.longitude || 0) -
            ((startPosition.longitude || 0) - (endPosition.longitude || 0)) / 2
          zoom = getZoom(
            startPosition.latitude || 0,
            startPosition.longitude || 0,
            lat,
            lon
          )
        }

        const latlng = getLatLng(mapUrl, lat, lon)

        console.log('latlng', latlng, [lat, lon])
        lat = latlng[0]
        lon = latlng[1]

        if (map.current) {
          // 检测地址如果在中国就用高德地图

          // console.log('mapUrl v?.url', mapUrl)
          map.current.setView(
            [lat, lon],
            // [
            //   120.3814, -1.09],
            zoom
          )

          // setCurrentMapUrl(mapUrl)
          layer.current = (L.tileLayer as any)
            .colorScale(
              mapUrl,
              // maps.filter((v) => v.key === 'GeoQNight')?.[0]?.url ||
              // 	mapUrl,
              {
                // errorTileUrl: osmMap,
                maxZoom: 18,
                // attribution: `&copy;`,
              }
            )
            .addTo(map.current)
          layer.current?.setGrayscale?.(mapLayer?.mapMode === 'Gray')
          layer.current?.setDarkscale?.(mapLayer?.mapMode === 'Dark')
          layer.current?.setBlackscale?.(mapLayer?.mapMode === 'Black')

          mapLayer && roadColorFade(mapLayer, layer.current)

          map.current.panTo([lat, lon], {
            animate: false,
          })
          if (trip?.positions) {
            console.time('getLatLnggetLatLng')

            // testGpsData
            // .map((v) => {
            // 	return {
            // 		coords: {
            // 			latitude: v.latitude,
            // 			longitude: v.longitude,
            // 			altitude: v.altitude,
            // 			altitudeAccuracy: v.altitudeAccuracy,
            // 			accuracy: v.accuracy,
            // 			speed: v.speed,
            // 			heading: v.heading,
            // 		},
            // 		timestamp: v.timestamp,
            // 	}
            // })

            // const latLngs: number[][] = []
            // const colors: string[] = []

            let maxSpeedPosition = positions[0]

            positions
              .filter((v) => {
                return !(
                  Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0
                )
              })
              ?.forEach((v, i, arr) => {
                maxSpeedPosition =
                  Number(maxSpeedPosition.speed) < Number(v.speed)
                    ? v
                    : maxSpeedPosition

                // const speedColorLimit = (
                //   config.configure.general?.speedColorLimit as any
                // )[(trip?.type?.toLowerCase() || 'running') as any]

                // latLngs.push(
                //   getLatLng(mapUrl, v.latitude || 0, v.longitude || 0) as any
                // )
                // colors.push(
                //   getSpeedColor(
                //     v.speed || 0,
                //     speedColorLimit.minSpeed,
                //     speedColorLimit.maxSpeed,
                //     speedColorRGBs
                //   )
                // )
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

            // console.log('LLLL', L)
            // const polycolor = (L as any)
            //   .polycolor(latLngs, {
            //     colors: colors,
            //     useGradient: true,
            //     weight: mapLayer?.polylineWidth,
            //   })
            //   .addTo(map.current)
            // console.log(
            //   'fTripPositions polyline',
            //   polycolor?.addTo,
            //   map.current,
            //   positions
            // )
            // console.log('LLLLplayline', playline)
            // console.log('LLLLplayline', playline, playline.setLatLngs(latLngs))

            // console.log('config.mapPolyline.width', config.mapPolyline.width)

            if (positions?.[0]) {
              createIconMarker({
                map: map.current,
                latlng: getLatLng(
                  mapUrl,
                  positions[0]?.latitude || 0,
                  positions[0]?.longitude || 0
                ),
                type: 'StartPosition',
              })
            }
            if (positions?.[positions.length - 1]) {
              createIconMarker({
                map: map.current,
                latlng: getLatLng(
                  mapUrl,
                  positions[positions.length - 1]?.latitude || 0,
                  positions[positions.length - 1]?.longitude || 0
                ),
                type: 'EndPosition',
              })
            }

            if (maxSpeedPosition) {
              createIconMarker({
                map: map.current,
                maxSpeed: maxSpeedPosition?.speed || 0,
                latlng: getLatLng(
                  mapUrl,
                  maxSpeedPosition.latitude || 0,
                  maxSpeedPosition.longitude || 0
                ),
                type: 'MaxSpeed',
              })
            }
            console.timeEnd('getLatLnggetLatLng')
          }

          // 添加城市marker
          // console.log('citymarker', trip.cities)

          // deleteAllCityMarker('tripItem')
          // deleteAllCityGeojsonMap('tripItem')
          // // createCityMarkers(map.current, trip?.cities || [], zoom, 'tripItem')
          // console.log('updateCityMarkers trip?.cities', trip?.cities)

          // let cities: {
          //   [id: string]: protoRoot.city.ICityItem
          // } = {}

          // trip?.cities?.forEach((v) => {
          //   v.cityDetails?.forEach((sv) => {
          //     if (!cities[sv.id || '']) {
          //       cities[sv.id || ''] = sv
          //     }
          //   })
          // })

          // console.log('ucm cities', cities)

          // const tempCities = Object.keys(cities).map((k) => cities[k])

          // tempCities.forEach((v) => {
          //   v.cities = tempCities.filter((sv) => v.id === sv.parentCityId)
          // })

          // const citiesArr = formartCities(tempCities)

          // updateCityMarkers(map.current, citiesArr, zoom)

          // map.current.on('moveend', (e) => {
          //   // console.log('citymarker moveEnd', e)
          //   map.current &&
          //     updateCityMarkers(map.current, citiesArr, e.target._zoom)
          // })
          // map.current.on('zoomend', (e) => {
          //   // console.log('zoomEvent', e.target._zoom)
          //   map.current &&
          //     updateCityMarkers(map.current, citiesArr, e.target._zoom)
          // })

          // console.log('cityBoundaries', cityBoundaries)
        }
        // L.marker([lat, lon]).addTo(m).openPopup()

        // setTimeout(() => {
        // 	outShareImage()
        // }, 1000)
        // console.log('connectionOSM', connectionOSM)

        // console.log('map', map)
      }

      // setTimeout(() => {
      //   outShareImage()
      // }, 500);
    }
    useEffect(() => {
      loadData()
    }, [
      map.current,
      mapLayer?.cityName,
      mapLayer?.cityBoundaries,
      mapLayer?.polylineWidth,
      mapLayer?.trackSpeedColor,
      config.configure.general?.speedColorLimit,
    ])

    const d = useRef(new Debounce())

    const loadData = () => {
      d.current.increase(() => {
        // map.current &&
        //   clearLayer({
        //     map: map.current,
        //     type: ['Polyline'],
        //   })

        map.current &&
          renderPolyline({
            map: map.current,
            alert: true,

            showTripTrackRoute: true,
            showCityName: mapLayer?.cityName || false,
            showCityBoundariesType: (mapLayer?.cityBoundaries || '') as any,

            trips: [
              {
                ...(trip as any),
                positionList: trip?.positions,
              },
            ],
            speedColor: mapLayer?.showSpeedColor
              ? 'auto'
              : getTrackRouteColor(
                  (mapLayer?.trackRouteColor as any) || 'Red',
                  false
                ),
            weight: Number(mapLayer?.polylineWidth),
            clickFunc({ params, reRender }) {},
            filterAccuracy: 'High',
          })
      }, 700)
    }

    const createCityMarkers = (
      map: Leaflet.Map,
      cities: protoRoot.trip.ITripCity[],
      zoom: number,
      key = 'tripItem'
    ) => {
      console.log('citymarker', cities, zoom)
      // console.log('citymarker', map.getBounds())
      if (!cities.length) return

      const bound = map.getBounds()

      let level = 1

      if (zoom >= 4) {
        level = 1
      }
      if (zoom >= 4.5) {
        level = 2
      }
      if (zoom >= 6) {
        level = 3
      }
      if (zoom >= 8) {
        level = 4
      }
      if (zoom >= 10) {
        level = 5
      }

      const tempCities = cities.reduce(
        (cities, v) => {
          v.cityDetails?.forEach((sv) => {
            if (!sv?.id) return
            cities[sv.id] = sv
          })
          return cities
        },
        {} as {
          [id: string]: protoRoot.city.ICityItem
        }
      )
      const tempCityBoundaries = cityBoundaries.reduce(
        (cities, v) => {
          cities[v.cityId] = v.geojson
          return cities
        },
        {} as {
          [id: string]: GeoJSON
        }
      )

      Object.keys(tempCities).forEach((cityId) => {
        const city = tempCities[cityId]

        if (
          !city?.coords ||
          Number(city.level) > level ||
          (level !== 1 && Number(city.level) === 1)
        ) {
          deleteCityMarker(cityId, key)
          deleteCityGeojsonMap(cityId, key)
          // console.log('citymarker 缩放范围外', city)
          return
        }
        if (
          !bound.contains([
            Number(city.coords.latitude),
            Number(city.coords.longitude),
          ])
        ) {
          deleteCityMarker(cityId, key)
          deleteCityGeojsonMap(cityId, key)
          // console.log('citymarker 离开范围', city)
          return
        }
        // console.log('citymarker 进入范围', city)

        createCityMarker(
          map,
          city.name?.zhCN || '',
          [Number(city.coords.latitude), Number(city.coords.longitude)],
          Number(city.level),
          cityId,
          key
        )

        createCityBoundaries({
          map,
          cityGeojson: tempCityBoundaries[cityId],
          cityId,
          key,
        })

        console.log('tempCityBoundaries', tempCityBoundaries[cityId])
      })
    }

    const outSpeedLineChart = () => {
      try {
        // const startTime = Number(trip?.startTime)
        // const endTime = Number(trip?.endTime)
        // console.log(
        // 	'outSpeedLineChart',
        // 	startTime,
        // 	endTime,
        // 	endTime - startTime,
        // 	trip?.positions
        // )

        console.log('idddddd', trip)
        if (speedChart.current) return
        const el = document.getElementById('speed-chart')

        let labels: any[] = []
        let speedData: number[] = []
        let altitudeData: number[] = []

        trip?.positions?.forEach((v, i) => {
          // if (i > 10) return
          labels.push(Math.round((v.distance || 0) / 10) / 100 + 'km')
          speedData.push((v.speed || 0) < 0 ? 0 : (v.speed || 0) * 3.6)
          altitudeData.push(v.altitude || 0)
        })
        // console.log('labels', labels)
        // console.log('speedData', speedData)
        // console.log('altitudeData', altitudeData)
        const data = {
          labels: labels,
          datasets: [
            // {
            // 	label: 'Cubic interpolation (monotone)',
            // 	data: datapoints,
            // 	borderColor: 'rgb(75, 192, 192)',
            // 	fill: false,
            // 	cubicInterpolationMode: 'monotone',
            // 	tension: 0.4,
            // },
            {
              label:
                t('speed', {
                  ns: 'tripPage',
                }) + ' (km/h)',
              data: speedData,
              pointBorderWidth: 0,
              pointRadius: 0,
              borderColor: speedColorRGBs[0],
              backgroundColor: speedColorRGBs[0],
              fill: false,
              cubicInterpolationMode: 'monotone',
              tension: 0.5,
              yAxisID: 'y1',
            },
            {
              label:
                t('altitude', {
                  ns: 'tripPage',
                }) + ' (m)',
              data: altitudeData,
              pointBorderWidth: 0,
              pointRadius: 0,
              borderColor: speedColorRGBs[speedColorRGBs.length - 1],
              backgroundColor: speedColorRGBs[speedColorRGBs.length - 1],
              fill: true,
              cubicInterpolationMode: 'monotone',
              tension: 0.4,
              yAxisID: 'y',
            },
          ],
        }

        if (el) {
          speedChart.current = new Chart(el as any, {
            type: 'line',
            data: data as any,

            options: {
              aspectRatio: 2,
              responsive: true,
              onResize(chart, size) {
                // console.log('onresize', chart, chart.aspectRatio, size)
                if (size.width <= 730) {
                  chart.options.aspectRatio = 1.5
                } else {
                  if (size.width <= 1024) {
                    chart.options.aspectRatio = 2
                  } else {
                    chart.options.aspectRatio = 2.5
                  }
                }
                chart.update()
              },
              plugins: {
                title: {
                  display: true,
                  text: '',
                },
              },
              interaction: {
                intersect: false,
              },
              scales: {
                // x: {
                // 	display: false,
                // 	title: {
                // 		display: true,
                // 	},
                // },
                y: {
                  display: true,
                  title: {
                    display: true,
                    text:
                      t('altitude', {
                        ns: 'tripPage',
                      }) + ' (m)',
                  },
                  // suggestedMin: -10,
                  // suggestedMax: 200,
                  grid: {
                    color: speedColorRGBs[0],
                    lineWidth: 1,
                    drawOnChartArea: false, // only want the grid lines for one axis to show up
                  },
                  // min: 30,   // 最小值
                  // max: 80  // 最大值
                },
                y1: {
                  // type: 'linear',
                  display: true,
                  position: 'right',
                  min: -60,
                  max: Math.max(120, Math.max(...speedData) + 10),
                  ticks: {
                    stepSize: 10, // 可选：设置刻度间隔
                  },
                  title: {
                    display: true,
                    text:
                      t('speed', {
                        ns: 'tripPage',
                      }) + ' (km/h)',
                  },

                  // grid line settings
                  grid: {
                    color: speedColorRGBs[speedColorRGBs.length - 1],
                    lineWidth: 1,
                    drawOnChartArea: false, // only want the grid lines for one axis to show up
                  },
                },
              },
            },
          })
        }
      } catch (error) {
        console.error(error)
      }
    }

    const outShareImage = async () => {
      setGeneratingSharedData(true)
      const pb = snackbar({
        message: t('generatingSharingContent', {
          ns: 'prompt',
        }),
        vertical: 'center',
        horizontal: 'center',
        padding: '14px 20px',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
        closeIcon: true,
      })
      pb.open()
      setTimeout(async () => {
        // 生成地图图片
        let mapEl: any = document.querySelector('#tic-map')
        let contentEl: any = document.querySelector('.ti-m-content')

        if (mapEl && contentEl) {
          console.log('mapEl.scrollHeight', mapEl.offsetHeight)
          const mapCvs = await html2canvas(mapEl, {
            backgroundColor: 'white',
            useCORS: true,
            scale: 1,
            height: mapEl.offsetHeight,
            windowHeight: mapEl.offsetHeight,
          })

          // 生成内容图
          const contentCvs = await html2canvas(contentEl, {
            backgroundColor: 'white',
            useCORS: true,
            scale: 1,
            height: contentEl.scrollHeight,
            windowHeight: contentEl.scrollHeight,
          })

          // const mapPng = mapCvs.toDataURL('image/png', 1)
          // const contentPng = contentCvs.toDataURL('image/png', 1)

          //创建新的canvas并绘制两个图片数据
          var shareImageCvs = document.createElement('canvas')
          var ctx = shareImageCvs.getContext('2d')
          if (ctx) {
            shareImageCvs.width = Math.max(mapCvs.width, contentCvs.width)
            shareImageCvs.height = mapCvs.height + contentCvs.height
            // console.log(mapCvs.height, contentCvs.height)
            // console.log(shareImageCvs.width, shareImageCvs.height)
            ctx.drawImage(mapCvs, 0, 0)
            ctx.drawImage(contentCvs, 0, mapCvs.height)
          }
          //将新的canvas转换为图片数据并保存
          setShareImageDataBase(shareImageCvs.toDataURL('image/png', 1))
          setGeneratingSharedData(false)
          pb.close()
          // var finalDataURL = newCanvas.toDataURL('image/png')
          // var link = document.createElement('a')
          // link.download = 'merged.png'
          // link.href = finalDataURL
          // link.click()
          // document.body?.appendChild(mapCvs)
          // document.body?.appendChild(contentCvs)
        }
      }, 500)
    }

    const getTrip = async () => {
      getTripDebounce.current.increase(async () => {
        if (loadStatus === 'loading') return
        setLoadStatus('loading')

        const trip = await dispatch(
          methods.trip.GetTrip({
            tripId,
          })
        ).unwrap()

        if (trip) {
          console.log('initMap GetTrip', trip)
          onTrip(trip || undefined)
          setLoadStatus('noMore')

          // initTripCity(trip)

          // setTimeout(() => {
          // 	dispatch(
          // 		tripSlice.actions.setReplayTripId({
          // 			id: trip?.id || '',
          // 			shareKey,
          // 		})
          // 	)
          // 	dispatch(layoutSlice.actions.setOpenReplayTripModal(true))
          // }, 1000)
        }
      }, 300)
    }

    const cancelVehicle = async () => {
      const res = await httpApi.v1.UpdateTrip({
        id: trip?.id || '',
        vehicleId: 'CancelVehicle',
      })

      if (res.code === 200) {
        const t = {
          ...trip,
          vehicleId: '',
          vehicle: undefined,
        }
        onTrip(t)
        dispatch(tripSlice.actions.setTripForDetailPage(t))
      }
    }

    const copyUrl = () => {
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

      window.navigator.clipboard.writeText(
        location.origin +
          (config.language === 'system' ? '' : '/' + config.language) +
          '/trip/detail' +
          '?id=' +
          tripId
      )
    }

    const switchShareKey = async (copy: boolean) => {
      alert({
        title: !trip?.permissions?.allowShare
          ? t('enableShare', {
              ns: 'prompt',
            })
          : t('disableShare', {
              ns: 'prompt',
            }),
        content: !trip?.permissions?.allowShare
          ? t('enableShareContent', {
              ns: 'prompt',
            })
          : t('disableShareContent', {
              ns: 'prompt',
            }),
        cancelText: t('cancel', {
          ns: 'prompt',
        }),
        confirmText: !trip?.permissions?.allowShare
          ? t('share', {
              ns: 'prompt',
            })
          : t('unshare', {
              ns: 'prompt',
            }),
        onCancel() {},
        async onConfirm() {
          // onDelete(tripId)
          // onBack()

          const res = await httpApi.v1.UpdateTrip({
            id: tripId,
            allowShare: !trip?.permissions?.allowShare ? 'Allow' : 'NotAllow',
          })
          console.log('res', res, !!trip?.permissions?.allowShare)
          if (res.code === 200) {
            // if (trip?.permissions?.shareKey) {
            // }
            dispatch(
              tripSlice.actions.setTripForDetailPage({
                ...trip,
                permissions: {
                  ...(trip?.permissions || {}),
                  allowShare: !trip?.permissions?.allowShare,
                },
              })
            )

            snackbar({
              message: !trip?.permissions?.allowShare
                ? '分享成功！'
                : '已成功取消分享',
              vertical: 'top',
              horizontal: 'center',
              backgroundColor: 'var(--saki-default-color)',
              color: '#fff',
              autoHideDuration: 2000,
            }).open()
            if (!trip?.permissions?.allowShare && copy) {
              copyUrl()
            }
            return
          }

          snackbar({
            message: res.msg,
            vertical: 'top',
            horizontal: 'center',
            autoHideDuration: 2000,
            closeIcon: true,
          }).open()
        },
      }).open()
    }

    const finishTrip = async (correctedData: boolean) => {
      if (!trip?.id) return

      // 需要获取trip
      // let endTime = 0
      // if (trip?.positions?.length && trip?.positions?.length >= 10) {
      // 	endTime =
      // 		Number(trip?.positions[trip?.positions.length - 1].timestamp) || 0
      // }
      // if ((trip?.statistics?.distance || tDistance || 0) < 50) {
      // 	deleteTrip()
      // 	return
      // }
      const params: protoRoot.trip.FinishTrip.IRequest = {
        id: trip?.id || '',
      }

      // if (Number(trip.endTime) < 1) {
      // 	params.endTime = endTime
      // }

      console.log('params', params, trip?.positions, trip)
      if (correctedData) {
        const res = await httpApi.v1.CorrectedTripData(params as any)
        console.log('FinishTrip', res)
        if (res.code === 200) {
          getTrip()
          return
        }

        snackbar({
          message: res.error || res.msg,
          autoHideDuration: 2000,
          vertical: 'top',
          horizontal: 'center',
        }).open()
        return
      }

      const res = await httpApi.v1.FinishTrip(params)
      console.log('FinishTrip', res)
      if (res.code === 200) {
        if (res?.data?.deleted) {
          snackbar({
            message: '距离过短, 距离需过50m才会记录',
            autoHideDuration: 2000,
            vertical: 'top',
            horizontal: 'center',
          }).open()
          return
        }
        getTrip()
        return
      }

      snackbar({
        message: res.error || res.msg,
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
      }).open()
    }

    const deleteTrip = async () => {
      // onBack()

      alert({
        title: t('delete', {
          ns: 'prompt',
        }),
        content:
          (trip?.statistics?.distance || 0) < 50
            ? t('deleteThisTrip50m', {
                ns: 'prompt',
              })
            : t('deleteThisTrip', {
                ns: 'prompt',
              }),
        cancelText: t('cancel', {
          ns: 'prompt',
        }),
        confirmText: t('delete', {
          ns: 'prompt',
        }),
        onCancel() {},
        async onConfirm() {
          // onDelete(tripId)
          if (!trip?.authorId) {
            storage.trips.delete(trip?.id || '')
            snackbar({
              message: t('deletedSuccessfully', {
                ns: 'prompt',
              }),
              vertical: 'top',
              horizontal: 'center',
              backgroundColor: 'var(--saki-default-color)',
              color: '#fff',
              autoHideDuration: 2000,
            }).open()
            onDelete(tripId)
            return
          }
          const res = await httpApi.v1.DeleteTrip({
            id: tripId,
          })
          if (res.code === 200) {
            snackbar({
              message: t('deletedSuccessfully', {
                ns: 'prompt',
              }),
              vertical: 'top',
              horizontal: 'center',
              backgroundColor: 'var(--saki-default-color)',
              color: '#fff',
              autoHideDuration: 2000,
            }).open()
            onDelete(tripId)
            return
          }

          snackbar({
            message: res.msg,
            vertical: 'top',
            horizontal: 'center',
            autoHideDuration: 2000,
            closeIcon: true,
          }).open()
        },
      }).open()
    }

    const addTripToOnline = async () => {
      console.log('AddTripToOnline')

      const params: protoRoot.trip.AddTripToOnline.IRequest = {
        type: trip?.type,
        positions: trip?.positions?.map((v): protoRoot.trip.ITripPosition => {
          return {
            latitude: v.latitude,
            longitude: v.longitude,
            altitude: v.altitude,
            altitudeAccuracy: v.altitudeAccuracy,
            accuracy: v.accuracy,
            heading: v.heading,
            speed: v.speed,
            timestamp: v.timestamp,
          }
        }),
        marks: trip?.marks || [],
        createTime: trip?.createTime,
        startTime: trip?.startTime,
        endTime: trip?.endTime,
        // startTime: Math.floor(startTime / 1000),
      }
      console.log(params)
      const res = await httpApi.v1.AddTripToOnline(params)
      console.log('AddTripToOnline', res)
      if (res.code === 200 && res?.data?.trip) {
        const localTripId = trip?.id
        alert({
          title: t('delete', {
            ns: 'prompt',
          }),
          content: t('deleteLocalTrip', {
            ns: 'prompt',
          }),
          cancelText: t('cancel', {
            ns: 'prompt',
          }),
          confirmText: t('delete', {
            ns: 'prompt',
          }),
          onCancel() {},
          async onConfirm() {
            storage.trips.delete(localTripId || '')
            snackbar({
              message: t('deletedSuccessfully', {
                ns: 'prompt',
              }),
              vertical: 'top',
              horizontal: 'center',
              backgroundColor: 'var(--saki-default-color)',
              color: '#fff',
              autoHideDuration: 2000,
            }).open()
          },
        }).open()

        if (res.data.trip?.statistics) {
          res.data.trip.statistics.minAltitude = Math.min(
            ...(res?.data?.trip?.positions?.map((v) => v.altitude || 0) || [0])
          )
        }
        console.log(res?.data?.trip)
        dispatch(tripSlice.actions.setTripForDetailPage(res?.data?.trip))

        initTripItemCity(res?.data?.trip, true, true).finally(() => {
          getTrip()
        })
      }
    }

    const getFullDistance = (distance: number) => {
      return distance > 1000
        ? Math.round(distance / 100) / 10 + 'km'
        : distance + 'm'
    }

    const { tripProgress } = useMemo(() => {
      const tripProgress: {
        type:
          | 'Driving'
          | 'Park'
          | 'PassTunnel'
          | 'StartTrip'
          | 'EndTrip'
          | 'EnterNewCity'
          | 'TrafficLight'
          | 'TripMark'
          | 'TemporaryPark'
        time: number
        drivingTime: number
        distance: number
        distanceProgress: number
        avgSpeed?: number
        maxSpeed?: number
        city?: protoRoot.city.ICityItem
      }[] = []

      const citiles = trip?.cities?.reduce((val, cv) => {
        val =
          val.concat(
            cv?.entryTimes
              ?.map((v) => {
                const cityItem: protoRoot.city.ICityItem = deepCopy(
                  cv.cityDetails?.filter((sv) => sv.id === cv.cityId)?.[0]
                ) as any

                if (cityItem) {
                  cityItem.fullName = {}
                  cityItem.name &&
                    Object.keys(cityItem.name).forEach((lang: any) => {
                      ;(cityItem.fullName as any)[lang] = cv.cityDetails
                        ?.map((v) => getCityName(v.name))
                        .join(',')
                    })

                  cityItem.firstEntryTime = v.timestamp
                }
                return cityItem
              })
              .filter((v) => v) || []
          ) || []

        return val
      }, [] as protoRoot.city.ICityItem[])

      let totalDistance = 0
      let distance = 0
      let tempDistance = 0
      let addedCitiIdMap = [] as string[]
      let drivingTime = Number(trip?.positions?.[0]?.timestamp) || 0

      let maxSpeed = 0
      trip?.positions?.forEach((v, i) => {
        if (i === 0 || !trip?.positions?.length) return

        const pos = trip.positions[i - 1]
        const nextPos = trip.positions[i]

        const time = Number(pos.timestamp)
        const nextTime = Number(nextPos.timestamp)

        const timestamp = nextTime - time

        distance = getDistance(
          Number(pos.latitude),
          Number(pos.longitude),
          Number(nextPos.latitude),
          Number(nextPos.longitude)
        )

        totalDistance += distance
        tempDistance += distance

        maxSpeed = Math.max(maxSpeed, Number(v.speed))

        if (i === 1) {
          tripProgress.push({
            type: 'StartTrip',
            time: time,
            drivingTime: 0,
            distance: 0,
            distanceProgress: 0,
          })
        }

        if (timestamp >= 5) {
          tripProgress.push({
            type: 'Driving',
            time: time,
            drivingTime: time - drivingTime,
            distance: tempDistance,
            distanceProgress: totalDistance,
            maxSpeed,
            avgSpeed: tempDistance / (time - drivingTime),
          })
          console.log(
            'ttttttt',
            timestamp,
            drivingTime,
            time,
            time - drivingTime
          )
          if (distance / timestamp > 1) {
            tripProgress.push({
              type: 'PassTunnel',
              time: time,
              drivingTime: timestamp,
              distance: distance,
              distanceProgress: totalDistance,
              maxSpeed,
              avgSpeed: distance / timestamp,
            })
          } else {
            tripProgress.push({
              type:
                // timestamp < 10
                //   ? 'TemporaryPark'
                //   :
                timestamp < 120 ? 'TrafficLight' : 'Park',
              time: time,
              drivingTime: timestamp,
              distance: distance,
              distanceProgress: totalDistance,
            })
          }
          tempDistance = 0
          maxSpeed = 0

          drivingTime = nextTime
        }

        citiles?.some((sv) => {
          if (
            !addedCitiIdMap.includes(sv?.id || '') &&
            Number(nextPos.timestamp) >= Number(sv.firstEntryTime)
          ) {
            tripProgress.push({
              type: 'EnterNewCity',
              time: Number(sv.firstEntryTime) || 0,
              drivingTime: 0,
              distance: 0,
              distanceProgress: totalDistance,
              city: sv,
            })
            addedCitiIdMap.push(sv?.id || '')
            return true
          }
        })
        trip?.marks?.some((sv) => {
          if (
            !addedCitiIdMap.includes(String(sv.timestamp)) &&
            Number(nextPos.timestamp) >= Number(sv.timestamp)
          ) {
            tripProgress.push({
              type: 'TripMark',
              time: Number(sv.timestamp) || 0,
              drivingTime: 0,
              distance: 0,
              distanceProgress: totalDistance,
            })
            addedCitiIdMap.push(String(sv.timestamp))
            return true
          }
        })
      })

      const lastTime =
        Number(trip?.positions?.[trip?.positions?.length - 1]?.timestamp) || 0
      if (tempDistance > 0) {
        tripProgress.push({
          type: 'Driving',
          time: lastTime,
          drivingTime: lastTime - drivingTime,
          distance: tempDistance,
          distanceProgress: totalDistance,
          maxSpeed,
          avgSpeed: tempDistance / (lastTime - drivingTime),
        })
      }

      tripProgress.push({
        type: 'EndTrip',
        time: lastTime,
        drivingTime: 0,
        distance: totalDistance,
        distanceProgress: totalDistance,
      })

      // console.log('tripProgress', trip, addedCitiIdMap, citiles, tripProgress)
      return { tripProgress }
    }, [trip])

    // const isDetailPage = useMemo(() => {
    //   return location.pathname.includes('/trip/detail')
    // }, [tripId])

    return (
      <div className="trip-item-component">
        {trip?.id ? (
          trip?.id === '404' ? (
            <span className="ti-loading">
              {t('trip404', {
                ns: 'tripPage',
              })}
            </span>
          ) : (
            <>
              <div className="ti-map-wrap">
                <div
                  id={'tic-map'}
                  className={
                    mapLayer && isRoadColorFade(mapLayer) ? 'roadColorFade' : ''
                  }
                >
                  <LayerButtons
                    mapLayer={mapLayer}
                    style={{
                      right: '20px',
                      bottom: '20px',
                    }}
                    modalConfig={{
                      vertical: 'Top',
                      horizontal: 'Right',
                      offsetX: '20px',
                      offsetY: '160px',
                    }}
                    mapLayerType={mapLayerType}
                    featuresList={mapLayerFeaturesList}
                  ></LayerButtons>
                </div>
                <div className="ti-replay">
                  <saki-button
                    ref={bindEvent({
                      tap: () => {
                        loadModal('ReplayTrip', () => {
                          dispatch(
                            tripSlice.actions.setReplayTripId({
                              id: trip?.id || '',
                            })
                          )
                          dispatch(
                            layoutSlice.actions.setOpenReplayTripModal(true)
                          )
                        })
                      },
                    })}
                    width="50px"
                    height="50px"
                    margin="0px"
                    bg-color="rgba(0,0,0,0.3)"
                    bg-hover-color="rgba(0,0,0,0.4)"
                    bg-active-color="rgba(0,0,0,0.5)"
                    type="CircleIconGrayHover"
                  >
                    <saki-icon
                      width="24px"
                      height="24px"
                      color="#fff"
                      type={'Play'}
                    ></saki-icon>
                  </saki-button>
                </div>
              </div>

              <saki-scroll-view
                ref={bindEvent({
                  distancetoborder: (e) => {
                    // console.log(e.detail.top>0)

                    setStartScroll(e.detail.top !== 0)
                  },
                })}
                mode="Auto"
                scroll-bar="Hidden"
              >
                <div
                  className={'ti-main ' + (startScroll ? 'startScroll' : '')}
                >
                  <div className="ti-wrap">
                    <div className="ti-m-content">
                      <div className="ti-m-c-header">
                        <div className="ti-title">
                          {t((trip?.type || '')?.toLowerCase(), {
                            ns: 'tripPage',
                          })}
                          {' · '}
                          {moment(Number(trip?.createTime) * 1000).format(
                            'YYYY-MM-DD HH:mm:ss'
                          )}

                          {!trip?.authorId
                            ? ' · ' +
                              t('local', {
                                ns: 'tripPage',
                              })
                            : ''}

                          {trip.permissions?.customTrip
                            ? ' · ' +
                              t('customTrip', {
                                ns: 'tripPage',
                              })
                            : ''}

                          {/* {' · ' +
                     (!trip?.permissions?.shareKey
                       ? t('enableShare', {
                           ns: 'prompt',
                         })
                       : t('disableShare', {
                           ns: 'prompt',
                         }))} */}
                        </div>
                        <div className="ti-more">
                          <SakiButton
                            onTap={() => {
                              if (router.pathname.includes('/trip/detail')) {
                                copyUrl()
                                return
                              }
                              outShareImage()
                            }}
                            margin={'0 4px 0 0'}
                            // bg-color="transparent"
                            type="CircleIconGrayHover"
                          >
                            <SakiIcon
                              width="14px"
                              height="14px"
                              color="#555"
                              type="Share"
                            ></SakiIcon>
                          </SakiButton>
                          {user.isLogin ? (
                            <saki-dropdown
                              visible={openMoreDropDownMenu}
                              floating-direction="Left"
                              z-index="1099"
                              ref={bindEvent({
                                close: (e) => {
                                  setOpenMoreDropDownMenu(false)
                                },
                              })}
                            >
                              <saki-button
                                ref={bindEvent({
                                  tap: () => {
                                    setOpenMoreDropDownMenu(
                                      !openMoreDropDownMenu
                                    )
                                  },
                                })}
                                type="CircleIconGrayHover"
                              >
                                <saki-icon color="#999" type="More"></saki-icon>
                              </saki-button>

                              <div slot="main">
                                <saki-menu
                                  ref={bindEvent({
                                    selectvalue: async (e) => {
                                      console.log(e.detail.value)
                                      switch (e.detail.value) {
                                        case 'Share':
                                          console.log(trip)
                                          switchShareKey(true)
                                          break
                                        case 'AddTripToOnline':
                                          addTripToOnline()
                                          break
                                        case 'FinishTrip':
                                          finishTrip(false)
                                          break
                                        case 'ResumeTrip':
                                          trip?.id &&
                                            dispatch(
                                              methods.trip.ResumeTrip({
                                                trip,
                                              })
                                            )
                                          break
                                        case 'initTripCity':
                                          initTripItemCity(
                                            trip,
                                            true,
                                            true
                                          ).finally(() => {
                                            getTrip()
                                          })

                                          break
                                        case 'CorrectedData':
                                          finishTrip(true)
                                          break
                                        case 'CancelVehicle':
                                          cancelVehicle()

                                          break
                                        case 'Edit':
                                          trip &&
                                            loadModal('TripEdit', () => {
                                              dispatch(
                                                layoutSlice.actions.setEditTripModal(
                                                  {
                                                    visible: true,
                                                    trip: trip,
                                                  }
                                                )
                                              )
                                            })

                                          break
                                        // case 'Replay':
                                        // 	dispatch(
                                        // 		tripSlice.actions.setReplayTripId({
                                        // 			id: trip?.id || '',
                                        // 			shareKey,
                                        // 		})
                                        // 	)
                                        // 	dispatch(
                                        // 		layoutSlice.actions.setOpenReplayTripModal(
                                        // 			true
                                        // 		)
                                        // 	)
                                        // 	break
                                        case 'Delete':
                                          deleteTrip()
                                          break

                                        default:
                                          break
                                      }
                                      setOpenMoreDropDownMenu(false)
                                    },
                                  })}
                                >
                                  {isResumeTrip(trip) ? (
                                    <>
                                      <saki-menu-item
                                        padding="10px 18px"
                                        value={'ResumeTrip'}
                                      >
                                        <div className="tb-h-r-user-item">
                                          <span>
                                            {t('resumeTrip', {
                                              ns: 'tripPage',
                                            })}
                                          </span>
                                        </div>
                                      </saki-menu-item>
                                    </>
                                  ) : (
                                    ''
                                  )}
                                  {user.isLogin ? (
                                    trip?.status === 1 ? (
                                      <>
                                        <saki-menu-item
                                          padding="10px 18px"
                                          value={'Edit'}
                                        >
                                          <div className="tb-h -r-user-item">
                                            <span>
                                              {t('edit', {
                                                ns: 'common',
                                              })}
                                            </span>
                                          </div>
                                        </saki-menu-item>
                                        {trip?.vehicle?.id ? (
                                          <saki-menu-item
                                            padding="10px 18px"
                                            value={'CancelVehicle'}
                                          >
                                            <div className="tb-h -r-user-item">
                                              <span>
                                                {t('cancelVehicle', {
                                                  ns: 'vehicleModal',
                                                })}
                                              </span>
                                            </div>
                                          </saki-menu-item>
                                        ) : (
                                          ''
                                        )}
                                        {/* <saki-menu-item
                               padding='10px 18px'
                               value={'Replay'}
                             >
                               <div className='tb-h -r-user-item'>
                                 <span>
                                   {t('replay', {
                                     ns: 'common',
                                   })}
                                 </span>
                               </div>
                             </saki-menu-item> */}
                                        {/* {trip?.statistics?.distance !==
                               trip?.positions?.[trip?.positions.length - 1]
                                 ?.distance || 0 ? (
                               <saki-menu-item
                                 padding='10px 18px'
                                 value={'CorrectedData'}
                               >
                                 <div className='tb-h-r-user-item'>
                                   <span>
                                     {t('correctedData', {
                                       ns: 'tripPage',
                                     })}
                                   </span>
                                 </div>
                               </saki-menu-item>
                             ) : (
                               ''
                             )} */}
                                        {user.isLogin ? (
                                          <saki-menu-item
                                            padding="10px 18px"
                                            value={'Share'}
                                          >
                                            <div className="tb-h-r-user-item">
                                              <span>
                                                {!trip?.permissions?.allowShare
                                                  ? t('share', {
                                                      ns: 'prompt',
                                                    })
                                                  : t('unshare', {
                                                      ns: 'prompt',
                                                    })}
                                              </span>
                                            </div>
                                          </saki-menu-item>
                                        ) : (
                                          ''
                                        )}
                                      </>
                                    ) : trip?.status !== 1 || !trip?.status ? (
                                      <>
                                        <saki-menu-item
                                          padding="10px 18px"
                                          value={'FinishTrip'}
                                        >
                                          <div className="tb-h-r-user-item">
                                            <span>
                                              {t('finishTrip', {
                                                ns: 'tripPage',
                                              })}
                                            </span>
                                          </div>
                                        </saki-menu-item>
                                      </>
                                    ) : (
                                      ''
                                    )
                                  ) : (
                                    ''
                                  )}
                                  {!trip?.authorId && user.isLogin ? (
                                    <saki-menu-item
                                      padding="10px 18px"
                                      value={'AddTripToOnline'}
                                    >
                                      <div className="tb-h-r-user-item">
                                        <span>
                                          {t('addTripToOnline', {
                                            ns: 'tripPage',
                                          })}
                                        </span>
                                      </div>
                                    </saki-menu-item>
                                  ) : (
                                    ''
                                  )}
                                  {user.isLogin && Number(trip.status) >= 1 ? (
                                    <>
                                      <saki-menu-item
                                        padding="10px 18px"
                                        value={'initTripCity'}
                                        // disabled={!!trip?.cities?.length}
                                      >
                                        <div className="tb-h-r-user-item">
                                          <span>
                                            {t('initTripCity', {
                                              ns: 'tripPage',
                                            })}
                                          </span>
                                        </div>
                                      </saki-menu-item>
                                    </>
                                  ) : (
                                    ''
                                  )}
                                  <saki-menu-item
                                    padding="10px 18px"
                                    value={'Delete'}
                                  >
                                    <div className="tb-h-r-user-item">
                                      <span>
                                        {t('delete', {
                                          ns: 'prompt',
                                        })}
                                      </span>
                                    </div>
                                  </saki-menu-item>
                                </saki-menu>
                              </div>
                            </saki-dropdown>
                          ) : (
                            ''
                          )}
                        </div>
                      </div>
                      <div className="ti-distance">
                        <div className="ti-d-left">
                          <div className="ti-d-value">
                            <span>
                              {Math.round(
                                (trip?.statistics?.distance || 0) / 10
                              ) / 100}
                            </span>
                          </div>
                          <div className="ti-d-unit">km</div>
                        </div>
                        <div className="ti-d-right">
                          <div className="ti-d-vehicle">
                            <saki-button
                              border="none"
                              bg-color="rgba(247,247,247,0)"
                              padding="6px 10px"
                              border-radius="10px"
                              ref={bindEvent({
                                tap: () => {
                                  if (!user.isLogin) {
                                    dispatch(methods.user.loginAlert())
                                    return
                                  }
                                  dispatch(
                                    layoutSlice.actions.setOpenVehicleModal(
                                      true
                                    )
                                  )
                                },
                              })}
                            >
                              <VehicleLogo
                                icon={trip?.vehicle?.type || ''}
                                style={{
                                  margin: '0 6px 0 0',
                                }}
                              ></VehicleLogo>

                              <span
                                style={{
                                  color: '#666',
                                }}
                              >
                                {trip?.vehicle?.name || ''}
                              </span>
                            </saki-button>
                          </div>
                        </div>
                      </div>
                      <div className="ti-color">
                        <div
                          style={{
                            color: speedColorRGBs[0],
                          }}
                          className="ti-c-min"
                        >
                          {t('slowest', {
                            ns: 'tripPage',
                          })}
                        </div>
                        <div
                          style={{
                            background: `linear-gradient(45deg, ${
                              speedColorRGBs[0]
                            },${speedColorRGBs[speedColorRGBs.length - 1]})`,
                          }}
                          className="ti-c-line"
                        ></div>
                        <div
                          style={{
                            color: speedColorRGBs[speedColorRGBs.length - 1],
                          }}
                          className="ti-c-max"
                        >
                          {t('fastest', {
                            ns: 'tripPage',
                          })}
                        </div>
                      </div>
                      <div className="ti-trip-progress"></div>
                      <div className={'ti-data ' + config.lang}>
                        <div className="ti-d-top">
                          <div className="ti-d-item">
                            <span className="value">
                              {(trip?.statistics?.maxSpeed || 0) <= 0
                                ? 0
                                : Math.round(
                                    ((trip?.statistics?.maxSpeed || 0) * 3600) /
                                      100
                                  ) / 10}
                            </span>
                            <span className="name">
                              {t('maxSpeed', {
                                ns: 'tripPage',
                              }) + ' (km/h)'}
                            </span>
                          </div>
                          <div className="ti-d-item time">
                            <span className="value">
                              {Number(trip?.endTime || 0) > 0
                                ? formatTime(
                                    Number(trip?.startTime),
                                    Number(trip?.endTime)
                                  )
                                : t('unfinished', {
                                    ns: 'tripPage',
                                  })}
                            </span>
                            <span className="name">
                              {t('duration', {
                                ns: 'tripPage',
                              })}
                            </span>
                          </div>
                          <div className="ti-d-item">
                            <span className="value">
                              {(trip?.statistics?.maxAltitude || 0) <= 0
                                ? 0
                                : Math.round(
                                    (trip?.statistics?.maxAltitude || 0) * 10
                                  ) / 10}
                            </span>
                            <span className="name">
                              {t('maxAltitude', {
                                ns: 'tripPage',
                              }) + ' (m)'}
                            </span>
                          </div>
                        </div>
                        <div className={'ti-d-bottom ' + config.deviceType}>
                          {trip?.type === 'Walking' ||
                          trip?.type === 'PowerWalking' ||
                          trip?.type === 'Running' ? (
                            <span className="ti-d-b-item">
                              <span>
                                {t('averagePace', {
                                  ns: 'tripPage',
                                }) + ' '}
                              </span>
                              <span>
                                {formatAvgPace(
                                  trip?.statistics?.distance || 0,
                                  Number(trip?.startTime) || 0,
                                  Number(trip?.endTime) || 0
                                )}
                              </span>
                            </span>
                          ) : (
                            ''
                          )}

                          <span className="ti-d-b-item">
                            <span>
                              {t('averageSpeed', {
                                ns: 'tripPage',
                              }) + ' '}
                            </span>
                            <span>
                              {Math.round(
                                ((trip?.statistics?.averageSpeed || 0) * 3600) /
                                  100
                              ) / 10}{' '}
                              km/h
                            </span>
                          </span>
                          {/* <span
                     className='ti-d-b-item'
                     style={{
                       margin: '0 6px',
                     }}
                   >
                     -
                   </span> */}
                          <span className="ti-d-b-item">
                            <span>
                              {t('averageAltitude', {
                                ns: 'tripPage',
                              }) + ' '}
                            </span>
                            <span>
                              {Math.round(
                                (((trip?.statistics?.maxAltitude || 0) -
                                  (trip?.statistics?.minAltitude || 0)) /
                                  2 +
                                  (trip?.statistics?.minAltitude || 0)) *
                                  10
                              ) / 10}{' '}
                              m
                            </span>
                          </span>
                          {/* <span
                     className='ti-d-b-item'
                     style={{
                       margin: '0 6px',
                     }}
                   >
                     -
                   </span> */}
                          <span className="ti-d-b-item">
                            <span>
                              {t('minAltitude', {
                                ns: 'tripPage',
                              }) + ' '}
                            </span>
                            <span>
                              {Math.round(
                                (trip?.statistics?.minAltitude || 0) * 10
                              ) / 10}{' '}
                              m
                            </span>
                          </span>

                          <span className="ti-d-b-item">
                            <span>
                              {t('climbAltitude', {
                                ns: 'tripPage',
                              }) + ' '}
                            </span>
                            <span>
                              {Math.round(
                                (trip?.statistics?.climbAltitude || 0) * 10
                              ) / 10}{' '}
                              m
                            </span>
                          </span>

                          <span className="ti-d-b-item">
                            <span>
                              {t('descendAltitude', {
                                ns: 'tripPage',
                              }) + ' '}
                            </span>
                            <span>
                              {Math.round(
                                (trip?.statistics?.descendAltitude || 0) * 10
                              ) / 10}{' '}
                              m
                            </span>
                          </span>

                          <span className="ti-d-b-item">
                            <span>
                              {t('tripMark', {
                                ns: 'tripPage',
                              }) + ' '}
                            </span>
                            <span>{trip?.marks?.length}</span>
                          </span>
                        </div>
                      </div>
                      {/* {trip?.type === 'Running' ? (
<div className='ti-pace'>
 <saki-title level='4' color='default'>
   配速
 </saki-title>
</div>
) : (
''
)} */}

                      <canvas
                        id="speed-chart"
                        // width={
                        // 	300
                        // 	// config.deviceType === 'Mobile'
                        // 	// 	? h * 1.5
                        // 	// 	: config.deviceType === 'Pad'
                        // 	// 	? h * 2
                        // 	// 	: h * 2.5
                        // 	// config.deviceType === 'Mobile'
                        // 	// 	? 300
                        // 	// 	: config.deviceType === 'Pad'
                        // 	// 	? 400
                        // 	// 	: 500
                        // }
                        // height='200'
                      ></canvas>
                    </div>

                    <SakiRow
                      margin="10px 0 0"
                      alignItems="flex-end"
                      justifyContent="flex-start"
                    >
                      <SakiTitle color="#000" level={2} margin="0 0 0 20px">
                        {t('tripTimeline', {
                          ns: 'tripPage',
                        })}
                      </SakiTitle>
                      <saki-dropdown
                        visible={openTimelineFilterTypeDropDown}
                        floating-direction="Left"
                        z-index="1099"
                        ref={bindEvent({
                          close: (e) => {
                            setOpenTimelineFilterTypeDropDown(false)
                          },
                        })}
                      >
                        <SakiButton
                          onTap={() => {
                            setOpenTimelineFilterTypeDropDown(true)
                          }}
                          padding="4px 2px 4px 6px"
                          margin="0 0 0 6px"
                          border="none"
                          type="Normal"
                        >
                          <span>
                            {timelineFilterType === 'All'
                              ? t('filter', {
                                  ns: 'prompt',
                                })
                              : t(timelineFilterType, {
                                  ns: 'tripPage',
                                })}
                          </span>
                          <saki-icon
                            margin="0 6px 0 0"
                            color="#aaa"
                            type="BottomTriangle"
                          ></saki-icon>
                        </SakiButton>

                        <div slot="main">
                          <saki-menu
                            ref={bindEvent({
                              selectvalue: (e) => {
                                setTimeLineFilterType(e.detail.value)
                                setOpenTimelineFilterTypeDropDown(false)
                              },
                            })}
                          >
                            {[
                              'All',
                              'Driving',
                              'Park',
                              // 'TemporaryPark',
                              'TrafficLight',
                              'PassTunnel',
                              'EnterNewCity',
                              'TripMark',
                            ].map((v, i) => {
                              return (
                                <saki-menu-item
                                  active={timelineFilterType === v}
                                  padding="10px 18px"
                                  value={v}
                                  key={i}
                                >
                                  <div className="tb-h-r-user-item">
                                    <span>
                                      {t(v, {
                                        ns: 'tripPage',
                                      })}
                                    </span>
                                  </div>
                                </saki-menu-item>
                              )
                            })}
                          </saki-menu>
                        </div>
                      </saki-dropdown>
                    </SakiRow>

                    <div className="ti-tripProgress">
                      {/* <div className="ti-progress"></div> */}
                      <div className="ti-list">
                        {(timelineFilterType === 'All'
                          ? tripProgress
                          : tripProgress.filter(
                              (v) =>
                                v.type === timelineFilterType ||
                                v.type === 'StartTrip' ||
                                v.type === 'EndTrip'
                            )
                        ).map((v, i) => {
                          const distanceProgress =
                            Math.round(v.distanceProgress * 10) / 10
                          const distance = Math.round(v.distance * 10) / 10

                          const totalTime = v.time - tripProgress[0].time

                          const fn = getCityName(v.city?.fullName)?.split(',')

                          let fullName1 =
                            fn
                              .filter(
                                (v, i, arr) => i >= arr.length - 2 && i !== 0
                              )
                              ?.join(' ') || ''
                          let fullName2 =
                            fn
                              .filter(
                                (v, i, arr) => i <= arr.length - 3 && i !== 0
                              )
                              ?.join(' ') || ''

                          return (
                            <div className="tp-item" key={i}>
                              <div className="tp-i-header">
                                {/* {distanceProgress}, {v.type} */}
                                <span>
                                  {`${moment(v.time * 1000).format(
                                    'MM.DD HH:mm'
                                  )} | ${t('driveDistance2', {
                                    ns: 'tripPage',
                                    distance: getFullDistance(distanceProgress),
                                  })}`}
                                </span>
                                {/* <span>{v.type}</span>
                       <span>/</span>
                       <span>{`已行驶 ${formatTime(
                         tripProgress[0].time,
                         v.time,
                         ['h', 'm']
                       )} · ${
                         distanceProgress > 1000
                           ? Math.round(distanceProgress / 100) / 10 + 'km'
                           : distanceProgress + 'm'
                       }`}</span> */}
                              </div>
                              <div className="tp-i-content">
                                <div className="tp-i-c-type">
                                  <span>
                                    {v.type === 'EnterNewCity'
                                      ? `${fullName1}`
                                      : t(
                                          v.type.slice(0, 1).toLowerCase() +
                                            v.type.slice(1),
                                          {
                                            ns: 'tripPage',
                                          }
                                        )}
                                  </span>
                                  <span>
                                    {v.type === 'EnterNewCity' ? fullName2 : ''}
                                  </span>
                                </div>
                                <div className="tp-i-c-content">
                                  {v.type === 'EnterNewCity' ? (
                                    <span>{`${t('eetryTime', {
                                      ns: 'tripPage',
                                      time: moment(v.time * 1000).format(
                                        'MM.DD HH:mm'
                                      ),
                                    })}`}</span>
                                  ) : v.type === 'PassTunnel' ? (
                                    <span>{`${t('tunnelLength', {
                                      ns: 'tripPage',
                                      distance: getFullDistance(distance),
                                    })} · ${t('driveTime', {
                                      ns: 'tripPage',
                                      time: formatTimestamp(
                                        v.drivingTime,
                                        false,
                                        ['h', 'm', 's']
                                      ),
                                    })} · ${t('averageSpeed', {
                                      ns: 'tripPage',
                                    })} · ${
                                      Math.round(
                                        ((v?.avgSpeed || 0) * 3600) / 100
                                      ) / 10
                                    } km/h`}</span>
                                  ) : v.type === 'Driving' ? (
                                    <span>{`${t('driveDistance', {
                                      ns: 'tripPage',
                                      distance: getFullDistance(distance),
                                    })} · ${t('driveTime', {
                                      ns: 'tripPage',
                                      time: formatTimestamp(
                                        v.drivingTime,
                                        false,
                                        ['h', 'm', 's']
                                      ),
                                    })} · ${t('maxSpeed', {
                                      ns: 'tripPage',
                                    })} ${
                                      Math.round(
                                        ((v?.maxSpeed || 0) * 3600) / 100
                                      ) / 10
                                    } km/h · ${t('averageSpeed', {
                                      ns: 'tripPage',
                                    })} ${
                                      Math.round(
                                        ((v?.avgSpeed || 0) * 3600) / 100
                                      ) / 10
                                    } km/h`}</span>
                                  ) : v.type === 'Park' ||
                                    v.type === 'TemporaryPark' ? (
                                    <span>{`${t('parkTime', {
                                      ns: 'tripPage',
                                      time: formatTimestamp(
                                        v.drivingTime,
                                        false,
                                        ['h', 'm', 's']
                                      ),
                                    })}`}</span>
                                  ) : v.type === 'TrafficLight' ? (
                                    <span>{`${t('trafficLightTime', {
                                      ns: 'tripPage',
                                      time: formatTimestamp(
                                        v.drivingTime,
                                        false,
                                        ['h', 'm', 's']
                                      ),
                                    })}`}</span>
                                  ) : (
                                    ''
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* {trip?.marks?.length ? (
               <div className="ti-marks">
                 <SakiTitle level={2}>
                   {t('tripMark', {
                     ns: 'tripPage',
                   })}
                 </SakiTitle>

                 <div className="ti-m-list">
                   {trip?.marks?.map((v, i, arr) => {
                     return (
                       <div className="ti-m-l-item" key={i}>
                         <div className="ti-m-l-i-index">
                           <span># {arr.length - i}</span>
                         </div>
                         <div className="ti-m-l-i-createtime text-elipsis">
                           {moment(Number(v.timestamp) * 1000).format(
                             'YYYY-MM-DD HH:mm:ss'
                           )}
                         </div>
                       </div>
                     )
                   })}
                 </div>
               </div>
             ) : (
               ''
             )} */}

                    {/* {tempCitiesTimeline?.length ? (
               <div className="ti-cities">
                 <CityTimeLineComponent
                   cities={tempCitiesTimeline}
                   layout="TripItem"
                 />
               </div>
             ) : (
               ''
             )}

             <div className="ti-buttons">
               <saki-button
                 ref={bindEvent({
                   tap: () => {
                     outShareImage()
                     console.log('share')
                     // node &&
                     // 	domtoimage
                     // 		.toPng(node)
                     // 		.then((dataUrl) => {
                     // 			var img = new Image()
                     // 			img.src = dataUrl
                     // 			document.body.appendChild(img)
                     // 		})
                     // 		.catch(function (error) {
                     // 			console.error('oops, something went wrong!', error)
                     // 		})
                   },
                 })}
                 margin="0px 0 20px"
                 width="200px"
                 padding="10px 10px"
                 type="Primary"
                 loading={generatingSharedData}
               >
                 {t('share', {
                   ns: 'prompt',
                 })}
               </saki-button>
             </div> */}
                  </div>
                </div>
              </saki-scroll-view>

              <NoSSR>
                <saki-modal
                  ref={bindEvent({
                    close() {
                      setShareImageDataBase('')
                    },
                  })}
                  width="100%"
                  height="100%"
                  max-width={config.deviceType === 'Mobile' ? '80%' : '480px'}
                  max-height={config.deviceType === 'Mobile' ? '80%' : '580px'}
                  mask
                  border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
                  border={config.deviceType === 'Mobile' ? 'none' : ''}
                  mask-closable="false"
                  background-color="rgba(0,0,0,0.3)"
                  visible={!!shareImageDataBase}
                  z-index={1010}
                >
                  <div className={'ti-share-component ' + config.deviceType}>
                    <div className="ts-main">
                      <div className="ts-m-cvs">
                        <img src={shareImageDataBase} alt="" />
                      </div>
                      <div className="ts-m-footer">
                        <div className="buttons-header">
                          <saki-modal-header
                            border
                            right-width={'56px'}
                            close-icon={true}
                            ref={bindEvent({
                              close() {
                                console.log('setShareImageDataBase')
                                setShareImageDataBase('')
                              },
                            })}
                            title={t('share', {
                              ns: 'prompt',
                            })}
                          />
                        </div>
                        <div className="buttons-main">
                          <saki-button
                            ref={bindEvent({
                              tap: () => {
                                let link = document.createElement('a')
                                link.download = trip?.id + '.png'
                                link.href = shareImageDataBase
                                link.click()
                              },
                            })}
                            padding="10px 10px"
                            border="none"
                            // padding="2"
                          >
                            <div className="buttons-item">
                              <div className="bi-icon download">
                                <saki-icon
                                  color="#fff"
                                  type="Download"
                                ></saki-icon>
                              </div>
                              <span>
                                {t('saveImage', {
                                  ns: 'prompt',
                                })}
                              </span>
                            </div>
                          </saki-button>
                          {user.isLogin ? (
                            <saki-button
                              ref={bindEvent({
                                tap: () => {
                                  if (trip?.permissions?.allowShare) {
                                    copyUrl()
                                    return
                                  }
                                  switchShareKey(true)
                                },
                              })}
                              padding="10px 10px"
                              border="none"
                              // padding="2"
                            >
                              <div className="buttons-item">
                                <div className="bi-icon link">
                                  <saki-icon
                                    color="#fff"
                                    type="Link"
                                  ></saki-icon>
                                </div>
                                <span>
                                  {t('copyLink', {
                                    ns: 'prompt',
                                  })}
                                </span>
                              </div>
                            </saki-button>
                          ) : (
                            ''
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </saki-modal>
              </NoSSR>
            </>
          )
        ) : (
          <span className="ti-loading">
            {t('loadingData', {
              ns: 'prompt',
            })}
          </span>
        )}
      </div>
    )
  }
)

export default TripItemComponent
