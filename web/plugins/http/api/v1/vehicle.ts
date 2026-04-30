import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const vehicleApi = {
  async AddVehicle(params: protoRoot.vehicle.AddVehicle.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.vehicle.AddVehicle.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.vehicle.AddVehicle.IRequest>(
          params,
          protoRoot.vehicle.AddVehicle.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.addVehicle),
      },
      protoRoot.vehicle.AddVehicle.Response
    )
  },
  async UpdateVehicle(params: protoRoot.vehicle.UpdateVehicle.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.vehicle.UpdateVehicle.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.vehicle.UpdateVehicle.IRequest>(
          params,
          protoRoot.vehicle.UpdateVehicle.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateVehicle),
      },
      protoRoot.vehicle.UpdateVehicle.Response
    )
  },
  async DeleteVehicle(params: protoRoot.vehicle.DeleteVehicle.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.vehicle.DeleteVehicle.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.vehicle.DeleteVehicle.IRequest>(
          params,
          protoRoot.vehicle.DeleteVehicle.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.deleteVehicle),
      },
      protoRoot.vehicle.DeleteVehicle.Response
    )
  },
  async GetVehicles(params: protoRoot.vehicle.GetVehicles.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.vehicle.GetVehicles.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.vehicle.GetVehicles.IRequest>(
          params,
          protoRoot.vehicle.GetVehicles.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getVehicles),
      },
      protoRoot.vehicle.GetVehicles.Response
    )
  },

}
