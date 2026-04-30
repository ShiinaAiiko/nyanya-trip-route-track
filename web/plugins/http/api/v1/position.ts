import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const positionApi = {
  async UpdateUserPosition(params: protoRoot.position.UpdateUserPosition.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.position.UpdateUserPosition.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.position.UpdateUserPosition.IRequest>(
          params,
          protoRoot.position.UpdateUserPosition.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateUserPosition),
      },
      protoRoot.position.UpdateUserPosition.Response
    )
  },
  async UpdateUserPositionShare(params: protoRoot.position.UpdateUserPositionShare.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.position.UpdateUserPositionShare.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.position.UpdateUserPositionShare.IRequest>(
          params,
          protoRoot.position.UpdateUserPositionShare.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateUserPositionShare),
      },
      protoRoot.position.UpdateUserPositionShare.Response
    )
  },
  async GetUserPositionShare(params: protoRoot.position.GetUserPositionShare.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.position.GetUserPositionShare.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.position.GetUserPositionShare.IRequest>(
          params,
          protoRoot.position.GetUserPositionShare.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getUserPositionShare),
      },
      protoRoot.position.GetUserPositionShare.Response
    )
  },
  async GetUserPositionAndVehiclePosition(params: protoRoot.position.GetUserPositionAndVehiclePosition.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.position.GetUserPositionAndVehiclePosition.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.position.GetUserPositionAndVehiclePosition.IRequest>(
          params,
          protoRoot.position.GetUserPositionAndVehiclePosition.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getUserPositionAndVehiclePosition),
      },
      protoRoot.position.GetUserPositionAndVehiclePosition.Response
    )
  },

}
