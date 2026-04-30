import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'

export const journeyMemoryApi = {
  async AddJM(params: protoRoot.journeyMemory.AddJM.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.AddJM.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.journeyMemory.AddJM.IRequest>(
          params,
          protoRoot.journeyMemory.AddJM.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.addJM),
      },
      protoRoot.journeyMemory.AddJM.Response
    )
  },
  async UpdateJM(params: protoRoot.journeyMemory.UpdateJM.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.UpdateJM.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.journeyMemory.UpdateJM.IRequest>(
          params,
          protoRoot.journeyMemory.UpdateJM.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateJM),
      },
      protoRoot.journeyMemory.UpdateJM.Response
    )
  },
  async GetJMDetail(params: protoRoot.journeyMemory.GetJMDetail.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.GetJMDetail.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.journeyMemory.GetJMDetail.IRequest>(
          params,
          protoRoot.journeyMemory.GetJMDetail.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getJMDetail),
      },
      protoRoot.journeyMemory.GetJMDetail.Response
    )
  },
  async GetJMList(params: protoRoot.journeyMemory.GetJMList.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.GetJMList.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.journeyMemory.GetJMList.IRequest>(
          params,
          protoRoot.journeyMemory.GetJMList.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getJMList),
      },
      protoRoot.journeyMemory.GetJMList.Response
    )
  },
  async DeleteJM(params: protoRoot.journeyMemory.DeleteJM.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.DeleteJM.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.journeyMemory.DeleteJM.IRequest>(
          params,
          protoRoot.journeyMemory.DeleteJM.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.deleteJM),
      },
      protoRoot.journeyMemory.DeleteJM.Response
    )
  },
  async AddJMTimeline(params: protoRoot.journeyMemory.AddJMTimeline.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.AddJMTimeline.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.journeyMemory.AddJMTimeline.IRequest>(
          params,
          protoRoot.journeyMemory.AddJMTimeline.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.AddJMTimeline),
      },
      protoRoot.journeyMemory.AddJMTimeline.Response
    )
  },
  async UpdateJMTimeline(params: protoRoot.journeyMemory.UpdateJMTimeline.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.UpdateJMTimeline.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.journeyMemory.UpdateJMTimeline.IRequest>(
          params,
          protoRoot.journeyMemory.UpdateJMTimeline.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.UpdateJMTimeline),
      },
      protoRoot.journeyMemory.UpdateJMTimeline.Response
    )
  },
  async GetJMTimelineList(params: protoRoot.journeyMemory.GetJMTimelineList.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.GetJMTimelineList.IResponse>(
      {
        method: 'GET',
        data: PARAMS<protoRoot.journeyMemory.GetJMTimelineList.IRequest>(
          params,
          protoRoot.journeyMemory.GetJMTimelineList.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.GetJMTimelineList),
      },
      protoRoot.journeyMemory.GetJMTimelineList.Response
    )
  },
  async DeleteJMTimeline(params: protoRoot.journeyMemory.DeleteJMTimeline.IRequest) {
    const { apiUrls } = store.getState().api

    return await Request<protoRoot.journeyMemory.DeleteJMTimeline.IResponse>(
      {
        method: 'POST',
        data: PARAMS<protoRoot.journeyMemory.DeleteJMTimeline.IRequest>(
          params,
          protoRoot.journeyMemory.DeleteJMTimeline.Request
        ),
        url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.DeleteJMTimeline),
      },
      protoRoot.journeyMemory.DeleteJMTimeline.Response
    )
  },
}