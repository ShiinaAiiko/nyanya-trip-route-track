import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const navigationApi = {
  async GetNavigationData(
    params: protoRoot.navigation.GetNavigationData.IRequest
  ) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.navigation.GetNavigationData.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.navigation.GetNavigationData.IRequest>(
          params,
          protoRoot.navigation.GetNavigationData.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.GetNavigationData),
      },
      protoRoot.navigation.GetNavigationData.Response
    )
  },
}
