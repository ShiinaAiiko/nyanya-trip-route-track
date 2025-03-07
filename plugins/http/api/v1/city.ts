import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

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
  async GetAllCitiesVisitedByUser(params: protoRoot.city.GetAllCitiesVisitedByUser.IRequest) {
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
}