
import Leaflet from 'leaflet'
import { protoRoot } from '../protos'
import { formatPositionsStr, getLatLng, getSpeedColor, getZoom } from '../plugins/methods'
import store from '.'

// config.configure?.trackRouteColor

export const clearLayer = ({ map, type }: {
  map: Leaflet.Map,
  type: "Polyline"
}) => {

  map.eachLayer((layer) => {
    const L: typeof Leaflet = (window as any).L



    console.log("clearLayer", layer)

    if (type === "Polyline") {
      if (layer instanceof L.Polyline || layer instanceof (L as any).Polycolor) {
        // const cityId = layer.getPopup()?.getContent()?.toString() || ""

        // map.removeLayer(layer)

        // console.log("clearLayer Polyline", layer)
        map.removeLayer(layer)
      }

    }
  })
}

export const renderPolyline = (
  { map, trips, speedColor,
    weight = 2,
  }: {
    map: Leaflet.Map,
    trips: protoRoot.trip.ITripPositions[],
    speedColor: string
    weight?: number,
  }
) => {
  const { config } = store.getState()

  let minLat = 100000
  let minLon = 100000
  let maxLat = -100000
  let maxLon = -100000

  trips.forEach((v) => {
    const positions = formatPositionsStr(
      Number(v.startTime),
      v?.positions || []
    )
    const latArr = positions.map((v) => Number(v.latitude)) || []
    const lngArr = positions.map((v) => Number(v.longitude)) || []
    minLat = Math.min(minLat, ...latArr)
    minLon = Math.min(minLon, ...lngArr)
    maxLat = Math.max(maxLat, ...latArr)
    maxLon = Math.max(maxLon, ...lngArr)

    map && renderPolylineItem(
      {
        map,
        positions,
        type: v?.type || '',
        speedColor, weight
      }
    )
  })

  if (map) {
    const tempLatLon = {
      lat: (minLat + maxLat) / 2,
      lon: (minLon + maxLon) / 2,
    }
    map.setView(
      [tempLatLon.lat, tempLatLon.lon],
      // [
      //   120.3814, -1.09],
      getZoom(minLat, minLon, maxLat, maxLon)
    )
  }
}

export const renderPolylineItem = ({

  map, positions, type, weight = 2, speedColor

}: {

  map: Leaflet.Map,
  positions: protoRoot.trip.ITripPosition[],
  type: string,
  weight?: number,
  speedColor: string
}
) => {
  const L: typeof Leaflet = (window as any).L

  const { config } = store.getState()

  // console.log('positions1', positions.length)
  if (positions?.length) {
    console.time('getLatLnggetLatLng')
    const latLngs: number[][] = []
    const colors: string[] = []

    let maxSpeedPosition = positions[0]

    positions
      .filter((v) => {
        return !(Number(v.speed || 0) < 0 || Number(v.altitude || 0) < 0)
      })
      ?.forEach((v, i, arr) => {
        maxSpeedPosition =
          Number(maxSpeedPosition.speed) < Number(v.speed)
            ? v
            : maxSpeedPosition

        const speedColorLimit = (config.configure.speedColorLimit as any)[
          (type?.toLowerCase() || 'running') as any
        ]
        latLngs.push(
          getLatLng(config.mapUrl, v.latitude || 0, v.longitude || 0) as any
        )
        colors.push(

          speedColor === "auto" ?
            getSpeedColor(
              v.speed || 0,
              speedColorLimit.minSpeed,
              speedColorLimit.maxSpeed,
              config.speedColorRGBs
            ) : speedColor
        )
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

    if (speedColor === "auto") {
      // console.log('LLLL', L)
      (L as any)
        .polycolor(latLngs, {
          colors: colors,
          useGradient: true,
          weight: weight,
        })
        .addTo(map)

    } else {
      L.polyline(latLngs as any, {
        color: speedColor,
        weight: weight,
        smoothFactor: 1,
        noClip: true,
      }).addTo(map)

    }

    // console.log('fTripPositions polyline', polycolor?.addTo, map)
    // console.log('LLLLplayline', playline)
    // console.log('LLLLplayline', playline, playline.setLatLngs(latLngs))

    // console.log('config.mapPolyline.width', config.mapPolyline.width)

    console.timeEnd('getLatLnggetLatLng')
  }
}