
import Leaflet, { map } from 'leaflet'
import { protoRoot } from '../protos'
import { formatPositionsStr, getLatLng, getSpeedColor, getZoom } from '../plugins/methods'
import store from '.'

// config.configure?.trackRouteColor

export const clearLayer = ({ map, type }: {
  map: Leaflet.Map,
  type: "Polyline" | "CityName"
}) => {
  const L: typeof Leaflet = (window as any).L

  map.eachLayer((layer) => {
    console.log("clearLayer", layer)

    if (type === "Polyline") {
      if (layer instanceof L.Polyline || layer instanceof (L as any).Polycolor) {
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

export const renderPolyline = (
  { map, trips, speedColor,
    weight = 2,
    clickFunc
  }: {
    map: Leaflet.Map,
    trips: protoRoot.trip.ITripPositions[],
    speedColor: string
    weight?: number,
    clickFunc?: RenderPolylineItemClickFunc
  }
) => {

  let minLat = 100000
  let minLon = 100000
  let maxLat = -100000
  let maxLon = -100000

  trips.forEach((v) => {
    let positions = v.positionList || []
    if (!positions.length) {
      positions = formatPositionsStr(
        Number(v.startTime),
        v?.positions || []
      )
    }
    const latArr = positions.map((v) => Number(v.latitude)) || []
    const lngArr = positions.map((v) => Number(v.longitude)) || []
    minLat = Math.min(minLat, ...latArr)
    minLon = Math.min(minLon, ...lngArr)
    maxLat = Math.max(maxLat, ...latArr)
    maxLon = Math.max(maxLon, ...lngArr)

    map && renderPolylineItem(
      {
        params: {
          tripId: v.id || "",
          map,
          positions,
          type: v?.type || '',
          speedColor, weight,
        },
        clickFunc,
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


export interface RenderPolylineItemParams {
  tripId: string,
  map: Leaflet.Map,
  positions: protoRoot.trip.ITripPosition[],
  type: string,
  weight?: number,
  speedColor: string,
}

export type RenderPolylineItemClickFuncReRender = (params: RenderPolylineItemParams) => {
  params: RenderPolylineItemParams
  clickFunc?: RenderPolylineItemClickFunc
  remove: () => void
}

export type RenderPolylineItemClickFunc = (
  { params, reRender }: {
    params: RenderPolylineItemParams
    reRender: RenderPolylineItemClickFuncReRender
  }) => void

export const renderPolylineItem = ({
  params, clickFunc
}: {
  params: RenderPolylineItemParams
  clickFunc?: RenderPolylineItemClickFunc
}
): Leaflet.Layer | undefined => {
  const L: typeof Leaflet = (window as any).L


  const { config } = store.getState()

  let { weight, positions, speedColor, map, type, tripId } = params



  // console.log('positions1', positions.length)
  if (!positions?.length) return undefined
  // console.time('getLatLnggetLatLng')
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

  let layer: any
  if (speedColor === "auto") {
    // console.log('LLLL', L)
    layer = (L as any)
      .polycolor(latLngs, {
        colors: colors,
        useGradient: true,
        weight: weight,
      })
      .addTo(map)

  } else {
    layer = L.polyline(latLngs as any, {
      color: speedColor,
      weight: weight,
      smoothFactor: 1,
      noClip: true,
    }).addTo(map)

  }

  clickFunc && layer?.addEventListener('click', () => {
    clickFunc({
      params,
      reRender: (params) => {
        removeLayer(map, layer)
        let tempLayer = renderPolylineItem({
          params: params,
          clickFunc
        })

        return {
          params: params,
          clickFunc,
          remove() {
            tempLayer && removeLayer(map, tempLayer)
          },
        }
      }
    })
  })
  return layer

  // console.timeEnd('getLatLnggetLatLng')


}


export const createIconMarker = (
  { map,
    maxSpeed = 0, latlng, type, }:
    {
      map: Leaflet.Map,
      maxSpeed?: number
      latlng: number[], type: "StartPosition" | "EndPosition" | "MaxSpeed"
    }
) => {
  const L: typeof Leaflet = (window as any).L

  let icon: any
  if (type === "StartPosition") {
    icon = L.icon({
      className: 'icon-marker map_position_start_icon',
      iconUrl: '/position_start_green.png',
      iconSize: [28, 28],
      // shadowSize: [36, 36],
      iconAnchor: [14, 25],
      // shadowAnchor: [4, 62],
      // popupAnchor: [-3, -76],
    })
  } else if (type === "MaxSpeed") {
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
      className:
        'icon-marker map-max-speed-marker ',
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
  return L.marker(
    latlng as any,
    {
      icon,
    }
  )
    .addTo(map)
    // .bindPopup(
    // 	`${ipInfoObj.ipv4}`
    // 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
    // )
    .openPopup()
}