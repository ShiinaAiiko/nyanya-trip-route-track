import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const configureApi = {
  async SyncConfigure(params: protoRoot.configure.SyncConfigure.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.configure.SyncConfigure.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.configure.SyncConfigure.IRequest>(
          params,
          protoRoot.configure.SyncConfigure.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.syncConfigure),
      },
      protoRoot.configure.SyncConfigure.Response
    )
  },
  async GetConfigure(params: protoRoot.configure.GetConfigure.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.configure.GetConfigure.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.configure.GetConfigure.IRequest>(
          params,
          protoRoot.configure.GetConfigure.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getConfigure),
      },
      protoRoot.configure.GetConfigure.Response
    )
  },

}
