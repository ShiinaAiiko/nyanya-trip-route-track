import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'
import {
  networkConnectionStatusDetection,
  networkConnectionStatusDetectionEnum,
} from '@nyanyajs/utils/dist/common/common'
import { R } from '../../../../store/config'
import { toolApiUrl } from '../../../../config'

export const cityApi = {
  async UpdateCity(params: protoRoot.city.UpdateCity.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.city.UpdateCity.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.city.UpdateCity.IRequest>(
          params,
          protoRoot.city.UpdateCity.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateCity),
      },
      protoRoot.city.UpdateCity.Response
    )
  },
  async GetCityDetails(params: protoRoot.city.GetCityDetails.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.city.GetCityDetails.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.city.GetCityDetails.IRequest>(
          params,
          protoRoot.city.GetCityDetails.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getCityDetails),
      },
      protoRoot.city.GetCityDetails.Response
    )
  },
  async GetAllCitiesVisitedByUser(
    params: protoRoot.city.GetAllCitiesVisitedByUser.IRequest
  ) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.city.GetAllCitiesVisitedByUser.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.city.GetAllCitiesVisitedByUser.IRequest>(
          params,
          protoRoot.city.GetAllCitiesVisitedByUser.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getAllCitiesVisitedByUser),
      },
      protoRoot.city.GetAllCitiesVisitedByUser.Response
    )
  },

  searchWaypoint: async ({
    keywords,
    lang,
  }: {
    keywords: string
    lang?: string
  }) => {
    const { config } = store.getState()

    const url = `https://nominatim.openstreetmap.org/search?q=${keywords}&format=jsonv2&addressdetails=1&accept-language=${
      lang || config.lang
    }`

    const connectionOpenStreetMap = await networkConnectionStatusDetection(
      networkConnectionStatusDetectionEnum.openStreetMap
    )
    console.log(
      'searchWaypoint1 networkConnectionStatusDetection connectionOpenStreetMap',
      connectionOpenStreetMap
    )
    // if (connectionOpenStreetMap) {
    //   const res = await R.request({
    //     method: 'GET',
    //     url,
    //   })
    //   if (res.data) {
    //     return res.data
    //   }
    // }

    const res = await R.request({
      method: 'GET',
      url: connectionOpenStreetMap
        ? url
        : `${
            toolApiUrl
          }/api/v1/net/httpProxy?method=GET&url=${encodeURIComponent(url)}`,
    })

    let data = res?.data?.data as any
    if (connectionOpenStreetMap) {
      data = res?.data
    }

    if (!data?.length) {
      const res = await R.request({
        method: 'GET',
        url: `https://nominatim.aiiko.club/search?q=${keywords}&format=jsonv2&addressdetails=1&accept-language=${
          lang || config.lang
        }`,
      })

      return res?.data
    }
    return data
  },
}
