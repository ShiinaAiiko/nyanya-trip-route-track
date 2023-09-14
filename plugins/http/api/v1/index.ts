import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import axios from 'axios'
import { getUrl } from '..'

export const v1 = {
	async AddTrip(params: protoRoot.trip.AddTrip.IRequest) {
    const { apiUrls } = store.getState().api
    
		return await Request<protoRoot.trip.AddTrip.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.AddTrip.IRequest>(
					params,
					protoRoot.trip.AddTrip.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.addTrip),
			},
			protoRoot.trip.AddTrip.Response
		)
	},
	async GetTrips(params: protoRoot.trip.GetTrips.IRequest) {
    const { apiUrls } = store.getState().api
    
		return await Request<protoRoot.trip.GetTrips.IResponse>(
			{
				method: 'GET',
				data: PARAMS<protoRoot.trip.GetTrips.IRequest>(
					params,
					protoRoot.trip.GetTrips.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getTripList),
			},
			protoRoot.trip.GetTrips.Response
		)
	},
	async GetTripStatistics(params: protoRoot.trip.GetTripStatistics.IRequest) {
    const { apiUrls } = store.getState().api
    
		return await Request<protoRoot.trip.GetTripStatistics.IResponse>(
			{
				method: 'GET',
				data: PARAMS<protoRoot.trip.GetTripStatistics.IRequest>(
					params,
					protoRoot.trip.GetTripStatistics.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getTripStatistics),
			},
			protoRoot.trip.GetTripStatistics.Response
		)
	},
}
