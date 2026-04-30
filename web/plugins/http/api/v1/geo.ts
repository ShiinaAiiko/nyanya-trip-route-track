import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'
import {
  networkConnectionStatusDetection,
  networkConnectionStatusDetectionEnum,
} from '@nyanyajs/utils/dist/common/common'
import { R } from '../../../../store/config'
import { toolApiUrl } from '../../../../config'

export const geoApi = {
  Regeo: async ({
    lat,
    lng,
    lang,
  }: {
    lat: number
    lng: number
    lang: string
  }) => {
    const { config } = store.getState()

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${
      lat
    }&lon=${lng}&zoom=18&addressdetails=1&namedetails=1&accept-language=${
      lang || config.lang
    }`
    const connectionOpenStreetMap = await networkConnectionStatusDetection(
      networkConnectionStatusDetectionEnum.openStreetMap
    )
    if (connectionOpenStreetMap) {
      const res = await R.request({
        method: 'GET',
        url: url,
      })
      console.log('GetTripAddresses regeo', res.data)
      if (res.data) {
        return res.data
      }
    }

    const res = await R.request({
      method: 'GET',
      url: connectionOpenStreetMap
        ? url
        : `${
            toolApiUrl
          }/api/v1/net/httpProxy?method=GET&url=${encodeURIComponent(url)}`,
      // `https://tools.aiiko.club/api/v1/geocode/regeo?latitude=${lat}&longitude=${lon}&platform=Amap`
    })
    let data = res?.data?.data as any

    return data
  },
}
