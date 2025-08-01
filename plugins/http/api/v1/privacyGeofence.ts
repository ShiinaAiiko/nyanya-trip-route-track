import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const privacyGeofenceApi = {
  async SetPrivacyGeofence(
    params: protoRoot.privacyGeofence.SetPrivacyGeofence.IRequest
  ) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.privacyGeofence.SetPrivacyGeofence.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.privacyGeofence.SetPrivacyGeofence.IRequest>(
          params,
          protoRoot.privacyGeofence.SetPrivacyGeofence.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.setPrivacyGeofence),
      },
      protoRoot.privacyGeofence.SetPrivacyGeofence.Response
    )
  },
  async GetPrivacyGeofence(
    params: protoRoot.privacyGeofence.GetPrivacyGeofence.IRequest
  ) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.privacyGeofence.GetPrivacyGeofence.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.privacyGeofence.GetPrivacyGeofence.IRequest>(
          params,
          protoRoot.privacyGeofence.GetPrivacyGeofence.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getPrivacyGeofence),
      },
      protoRoot.privacyGeofence.GetPrivacyGeofence.Response
    )
  },
}
