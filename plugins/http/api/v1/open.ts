import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'


export const openApi = {
  async OpenGetTripStatistics(params: protoRoot.trip.GetTripStatistics.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.trip.GetTripStatistics.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.trip.GetTripStatistics.IRequest>(
          params,
          protoRoot.trip.GetTripStatistics.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.openGetTripStatistics),
      },
      protoRoot.trip.GetTripStatistics.Response
    )
  },
}
