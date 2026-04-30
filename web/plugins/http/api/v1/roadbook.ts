import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const roadbookApi = {
  async AddRoadbook(params: protoRoot.roadbook.AddRoadbook.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.roadbook.AddRoadbook.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.roadbook.AddRoadbook.IRequest>(
          params,
          protoRoot.roadbook.AddRoadbook.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.addRoadbook),
      },
      protoRoot.roadbook.AddRoadbook.Response
    )
  },
  async GetRoadbookList(params: protoRoot.roadbook.GetRoadbookList.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.roadbook.GetRoadbookList.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.roadbook.GetRoadbookList.IRequest>(
          params,
          protoRoot.roadbook.GetRoadbookList.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.GetRoadbookList),
      },
      protoRoot.roadbook.GetRoadbookList.Response
    )
  },
  async GetRoadbookDetail(
    params: protoRoot.roadbook.GetRoadbookDetail.IRequest
  ) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.roadbook.GetRoadbookDetail.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.roadbook.GetRoadbookDetail.IRequest>(
          params,
          protoRoot.roadbook.GetRoadbookDetail.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.GetRoadbookDetail),
      },
      protoRoot.roadbook.GetRoadbookDetail.Response
    )
  },
  async UpdateRoadbook(params: protoRoot.roadbook.UpdateRoadbook.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.roadbook.UpdateRoadbook.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.roadbook.UpdateRoadbook.IRequest>(
          params,
          protoRoot.roadbook.UpdateRoadbook.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.UpdateRoadbook),
      },
      protoRoot.roadbook.UpdateRoadbook.Response
    )
  },
  async DeleteRoadbook(params: protoRoot.roadbook.DeleteRoadbook.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.roadbook.DeleteRoadbook.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.roadbook.DeleteRoadbook.IRequest>(
          params,
          protoRoot.roadbook.DeleteRoadbook.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.DeleteRoadbook),
      },
      protoRoot.roadbook.DeleteRoadbook.Response
    )
  },
}
