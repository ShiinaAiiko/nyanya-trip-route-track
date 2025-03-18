import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const fileApi = {
  async GetUploadToken(params: protoRoot.file.GetUploadToken.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.file.GetUploadToken.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.file.GetUploadToken.IRequest>(
          params,
          protoRoot.file.GetUploadToken.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.GetUploadToken),
      },
      protoRoot.file.GetUploadToken.Response
    )
  },
}