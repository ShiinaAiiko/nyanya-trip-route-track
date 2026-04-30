import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const roadApi = {
  async UpdateRoad(params: protoRoot.road.UpdateRoad.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.road.UpdateRoad.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.road.UpdateRoad.IRequest>(
          params,
          protoRoot.road.UpdateRoad.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateRoad),
      },
      protoRoot.road.UpdateRoad.Response
    )
  },
}
