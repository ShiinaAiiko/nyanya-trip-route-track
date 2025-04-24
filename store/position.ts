import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import Leaflet from 'leaflet'
import store, { ActionParams } from '.'
import { Debounce, WebStorage } from '@nyanyajs/utils'
import { protoRoot } from '../protos'
import { httpApi } from '../plugins/http/api'
import * as geolib from 'geolib'
import { getDistance, getLatLng } from '../plugins/methods'
import { getIconType } from '../components/Vehicle'
// import { User } from './user'
// import { WebStorage } from '@nyanyajs/utils'

let realTimePositionTimer: NodeJS.Timeout
let realTimePositionList: protoRoot.position.GetUserPositionAndVehiclePosition.Response.IPositionItem[] =
  []

let realTimePositionListMarker: {
  [id: string]: Leaflet.Marker<any> | undefined
} = {}

const d = new Debounce()
// const [selectRealTimeMarkkerId, setSelectRealTimeMarkkerId] = useState('')

export const initSyncPosition = (
  map: Leaflet.Map,
  showPositionMarker: boolean
) => {
  clearInterval(realTimePositionTimer)

  d.increase(() => {
    const { config, user, position, trip } = store.getState()

    let b =
      config.userPositionShare >= 0 &&
      user.isLogin &&
      map &&
      (trip.startTrip ? config.syncLocationWhileTraveling : true) &&
      showPositionMarker
    console.log(
      'initSyncPosition',
      b,
      config.syncLocationWhileTraveling,
      position.syncPositionIntervalTime
    )

    if (b && map) {
      getUserPositionAndVehiclePosition(map)
      realTimePositionTimer = setInterval(() => {
        getUserPositionAndVehiclePosition(map)
      }, position.syncPositionIntervalTime * 1000)

      return
    }
    clearRealTimePositionListMarker()
  }, 700)
}

export const clearRealTimePositionListMarker = () => {
  console.log(
    'initSyncPosition clearRealTimePositionListMarker',
    realTimePositionListMarker
  )
  Object.keys(realTimePositionListMarker).forEach((id) => {
    realTimePositionListMarker[id]?.remove()
    delete realTimePositionListMarker[id]
  })
  realTimePositionListMarker = {}
}

const getUserPositionAndVehiclePosition = async (map: Leaflet.Map) => {
  const { geo, user, trip, vehicle, config, position } = store.getState()
  const { startTrip } = trip

  let params = {
    latitude: Number(geo.position.coords.latitude),
    longitude: Number(geo.position.coords.longitude),
    // latitude: 29.87393227,
    // longitude: 106.38437646,
    // latitude: -7.928675,
    // longitude: 110.917969,
  }
  let maxDistance = (startTrip ? 4 : 1500) * 1000
  let now = 32503651200
  const res = await httpApi.v1.GetUserPositionAndVehiclePosition({
    maxDistance,
    latitudeLimit: [
      geolib.computeDestinationPoint(params, maxDistance, 0).latitude,
      geolib.computeDestinationPoint(params, maxDistance, 180).latitude,
    ],
    longitudeLimit: [
      geolib.computeDestinationPoint(params, maxDistance, 90).longitude,
      geolib.computeDestinationPoint(params, maxDistance, 270).longitude,
    ],
    timeLimit: [0, now + 10],
  })
  console.log(
    'initSyncPosition 同步 getUserPositionAndVehiclePosition',
    res,
    position.syncPositionIntervalTime
  )
  if (res.code === 200 && res.data?.list) {
    const newList = res.data?.list || []
    const oldObj: {
      [
        id: string
      ]: protoRoot.position.GetUserPositionAndVehiclePosition.Response.IPositionItem
    } = Object.fromEntries(
      realTimePositionList.map((v) => [
        String(v?.vehicleInfo?.id || v?.userInfo?.uid || ''),
        v,
      ])
    )

    console.log(
      'getUserPositionAndVehiclePosition distance',
      realTimePositionList,
      oldObj,
      newList,
      realTimePositionListMarker
    )

    let iTime = 30

    newList.some((v) => {
      const id = String(v?.vehicleInfo?.id || v?.userInfo?.uid || '')
      const oldV = oldObj[id]?.position
      // console.log('old distance', id, v)
      if (!oldV) return
      let distance = getDistance(
        Number(v.position?.latitude),
        Number(v.position?.longitude),
        Number(oldV.latitude),
        Number(oldV.longitude)
      )
      // console.log('distance', distance)
      // 1、检测是否有在跑的。
      const driving = distance > 5
      if (driving) {
        iTime = (v?.userInfo?.uid || '') === user.userInfo.uid ? 22 : 15
      } else {
        v.position = {
          ...v.position,
          speed: 0,
        }
      }

      let distanceToMe = getDistance(
        params.latitude,
        params.longitude,
        Number(oldV.latitude),
        Number(oldV.longitude)
      )
      // 2、检测是否5公里以内的
      // console.log('distance', distance, distanceToMe)
      if (distanceToMe < 2 * 1000) {
        console.log('distanceToMe', oldObj[id], distanceToMe)
        iTime =
          (v?.userInfo?.uid || '') === user.userInfo.uid ? 8 : driving ? 5 : 8
      }

      if (iTime === 2) {
        return true
      }
      return false
    })

    store.dispatch(positionSlice.actions.setSyncPositionIntervalTime(iTime))

    realTimePositionList = newList

    // 为地图添加图标
    const L: typeof Leaflet = (window as any).L
    if (!map || !L) return

    realTimePositionList.forEach((v) => {
      if (!v.position?.latitude || !map) return

      const id = String(v?.vehicleInfo?.id || v?.userInfo?.uid || '')

      if (startTrip) {
        if (v.type === 'User' && v.userInfo?.uid === user.userInfo.uid) {
          if (realTimePositionListMarker?.[id]) {
            realTimePositionListMarker?.[id]?.remove()
            delete realTimePositionListMarker?.[id]
          }
          return
        }
        if (
          v.type === 'Vehicle' &&
          v.vehicleInfo?.id === vehicle.defaultVehicleId
        ) {
          if (realTimePositionListMarker?.[id]) {
            realTimePositionListMarker?.[id]?.remove()
            delete realTimePositionListMarker?.[id]
          }
          return
        }
      }

      // console.log('同步', v, startTrip)

      const [lat, lon] = getLatLng(
        (map as any).mapUrl,
        Number(v.position?.latitude),
        Number(v.position?.longitude)
      ) as any

      // 选择了就要panto
      if (id === position.selectRealTimeMarkerId) {
        map.panTo([lat, lon], {
          animate: false,
        })
      }

      if (!realTimePositionListMarker[id]) {
        realTimePositionListMarker[id] = createOtherPositionMarker(
          map,
          [lat, lon],
          v
        )

        bindRealTimePositionMarkerClickEvent(id)
        return
      }
      realTimePositionListMarker[id]?.setLatLng([lat, lon])
    })

    if (
      realTimePositionList.length !==
      Object.keys(realTimePositionListMarker).length
    ) {
      console.log('检测是否有被删除的marker，有则清除')
      const newObj: {
        [
          id: string
        ]: protoRoot.position.GetUserPositionAndVehiclePosition.Response.IPositionItem
      } = Object.fromEntries(
        realTimePositionList.map((v) => [
          String(v?.vehicleInfo?.id || v?.userInfo?.uid || ''),
          v,
        ])
      )
      Object.keys(realTimePositionListMarker).forEach((v) => {
        if (!newObj[v]) {
          realTimePositionListMarker[v]?.remove()
          delete realTimePositionListMarker[v]
        }
      })
    }
    return
  }

  store.dispatch(positionSlice.actions.setSyncPositionIntervalTime(30))

  clearRealTimePositionListMarker()
}

const bindRealTimePositionMarkerClickEvent = (id: string) => {
  const marker = realTimePositionListMarker[id]
  marker?.removeEventListener('click')
  marker?.on('click', (e) => {
    const { startTrip } = store.getState().trip
    // console.log('realTimePositionListMarker click', e, startTrip)
    if (!startTrip) {
      // map-marker-realtime-position-avatar
      document.querySelector('.' + id)?.classList.add('active')
      store.dispatch(positionSlice.actions.setSelectRealTimeMarkerId(id))
    }
  })
}

export const bindRealTimePositionListMarkerClickEvent = () => {
  Object.keys(realTimePositionListMarker).forEach((id) => {
    bindRealTimePositionMarkerClickEvent(id)
  })
}

export const createOtherPositionMarker = (
  map: Leaflet.Map,
  [lat, lon]: number[],
  positionItem: protoRoot.position.GetUserPositionAndVehiclePosition.Response.IPositionItem
) => {
  try {
    const { user, config } = store.getState()
    const L: typeof Leaflet = (window as any).L

    const id = positionItem?.vehicleInfo?.id || positionItem?.userInfo?.uid

    console.log('createOtherPositionMarker', map)

    return L.marker([lat, lon], {
      icon: L.divIcon({
        html: `<div 
      class='map-marker-realtime-position-avatar ${id}'>
          <saki-avatar
      width='${positionItem.type === 'User' ? '28px' : '18px'}'
      height='${positionItem.type === 'User' ? '28px' : '18px'}'
      border-radius='50%'
      border='2px solid #fff'
      border-hover='2px solid #fff'
      border-active='2px solid #fff'
      box-shadow='${
        positionItem.type === 'User' ? '0 0 10px rgba(0, 0, 0, 0.2)' : ''
      }'
      default-icon={'UserLine'}
      nickname='${positionItem.userInfo?.nickname}'
      src='${positionItem.userInfo?.avatar}'
      alt=''
    ></saki-avatar>
    ${
      positionItem.type === 'Vehicle'
        ? `<div class="map-marker-realtime-position-icon">
      <saki-icon
  width="22px"
  height="22px"
  color='#fff'
  type='${getIconType(positionItem.vehicleInfo?.type || '')}'
></saki-icon>
</div>`
        : ''
    }

    </div>`,
        className: 'map-marker-realtime-position ' + positionItem.type,
        iconSize: [28, 28],
      }),
    })
      .addTo(map)
      .openPopup()
  } catch (error) {
    console.info(error)
  }
}

// export const createMaxSpeedMarker = (map: Leaflet.Map, maxSpeed: number, [lat, lon]: number[]) => {
//   const L: typeof Leaflet = (window as any).L

//   console.log("maxSpeed", maxSpeed)
//   return L.marker([lat, lon], {
//     icon: L.divIcon({
//       html: `<div class='map-max-speed-marker-wrap'>

//       <div class="msm-icon">
//         <saki-icon margin="-1px 0 0 -1px" color="var(--saki-default-color)" size="10px" type="Rocket"></saki-icon>
//       </div>
//       <div class="msm-speed">
//         <span>${Math.round((maxSpeed * 3600) / 100) / 10}</span>
//       <span>km/h</span>
//       </div>

//       </div>`,
//       className:
//         'map-max-speed-marker ',
//       iconSize: undefined,
//     }),
//   })
//     .addTo(map)
//     .openPopup()
// }

export const createCustomTripPointMarkerIcon = (
  distance: number,
  id: string
) => {
  const L: typeof Leaflet = (window as any).L
  return L.divIcon({
    html: `<div class='map-custom-trip-marker-wrap'>
    <div class="msm-speed">
      <span>${Math.round((distance || 0) / 10) / 100}</span>
    <span>km</span>
    </div>
    <div class="msm-icon">
      <saki-icon color="var(--saki-default-color)" width="12px" height="12px" size="10px" type="Close"></saki-icon>
    </div>

    </div>`,
    className: 'map-custom-trip-marker ' + id,
    iconSize: undefined,
  })
}

export const createCustomTripPointMarker = (
  map: Leaflet.Map,
  distance: number,
  id: string,
  [lat, lon]: number[]
) => {
  const L: typeof Leaflet = (window as any).L

  return L.marker([lat, lon], {
    icon: createCustomTripPointMarkerIcon(distance, id),
  })
    .addTo(map)
    .openPopup()
}

export const createMyPositionMarker = (
  map: Leaflet.Map,
  [lat, lon]: number[],
  showAvatarAtCurrentPosition: boolean
) => {
  const { user, config } = store.getState()
  const L: typeof Leaflet = (window as any).L

  return (
    L.marker([lat, lon], {
      icon: L.divIcon({
        html: `<div class='map_current_position_icon-wrap'>
      <div class='icon'></div>
      ${
        user.userInfo?.uid && showAvatarAtCurrentPosition
          ? `<div class='saki-avatar'><saki-avatar
        width='${22}px'
        height='${22}px'
        border-radius='50%'
        border='2px solid #fff'
        border-hover='2px solid #fff'
        border-active='2px solid #fff'
        default-icon={'UserLine'}
        nickname='${user.userInfo?.nickname}'
        src='${user.userInfo?.avatar}'
        alt=''
      ></saki-avatar></div>`
          : ''
      }

      </div>`,
        className:
          'map_current_position_icon ' +
          (user?.userInfo?.uid && showAvatarAtCurrentPosition
            ? ' avatar'
            : ' noAvatar'),
        // iconUrl: user?.userInfo?.avatar || '',
        // iconUrl: '/current_position_50px.png',
        // iconUrl: user?.userInfo?.avatar || '/current_position_50px.png',
        iconSize: [26, 26], // size of the icon
        // shadowSize: [36, 36], // size of the shadow
        // iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
        // shadowAnchor: [4, 62], // the same for the shadow
        // popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
      }),
    })
      .addTo(map)
      // .bindPopup(
      // 	`${ipInfoObj.ipv4}`
      // 	// `${ipInfoObj.country}, ${ipInfoObj.regionName}, ${ipInfoObj.city}`
      // )
      .openPopup()
  )
}

export let state = {
  syncPositionIntervalTime: 5,
  selectRealTimeMarkerId: '',
}

export const positionSlice = createSlice({
  name: 'position',
  initialState: state,
  reducers: {
    setSyncPositionIntervalTime: (
      state,
      params: {
        payload: (typeof state)['syncPositionIntervalTime']
        type: string
      }
    ) => {
      state.syncPositionIntervalTime = params.payload
    },
    setSelectRealTimeMarkerId: (
      state,
      params: {
        payload: (typeof state)['selectRealTimeMarkerId']
        type: string
      }
    ) => {
      state.selectRealTimeMarkerId = params.payload
    },
  },
})

export const positionMethods = {
  init: createAsyncThunk('position/init', async ({}, thunkAPI) => {
    return
  }),
}
