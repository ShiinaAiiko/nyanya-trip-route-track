import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import axios from 'axios'
import { getUrl } from '..'
import { R } from '../../../../store/config'

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
	async AddTripMark(params: protoRoot.trip.AddTripMark.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.AddTripMark.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.AddTripMark.IRequest>(
					params,
					protoRoot.trip.AddTripMark.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.addTripMark),
			},
			protoRoot.trip.AddTripMark.Response
		)
	},
	async AddTripToOnline(params: protoRoot.trip.AddTripToOnline.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.AddTripToOnline.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.AddTripToOnline.IRequest>(
					params,
					protoRoot.trip.AddTripToOnline.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.addTripToOnline),
			},
			protoRoot.trip.AddTripToOnline.Response
		)
	},
	async UpdateTripPosition(params: protoRoot.trip.UpdateTripPosition.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.UpdateTripPosition.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.UpdateTripPosition.IRequest>(
					params,
					protoRoot.trip.UpdateTripPosition.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateTripPosition),
			},
			protoRoot.trip.UpdateTripPosition.Response
		)
	},
	async FinishTrip(params: protoRoot.trip.FinishTrip.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.FinishTrip.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.FinishTrip.IRequest>(
					params,
					protoRoot.trip.FinishTrip.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.finishTrip),
			},
			protoRoot.trip.FinishTrip.Response
		)
	},
	async CorrectedTripData(params: protoRoot.trip.CorrectedTripData.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.CorrectedTripData.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.CorrectedTripData.IRequest>(
					params,
					protoRoot.trip.CorrectedTripData.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.correctedTripData),
			},
			protoRoot.trip.CorrectedTripData.Response
		)
	},
	async UpdateTrip(params: protoRoot.trip.UpdateTrip.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.UpdateTrip.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.UpdateTrip.IRequest>(
					params,
					protoRoot.trip.UpdateTrip.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.updateTrip),
			},
			protoRoot.trip.UpdateTrip.Response
		)
	},
	async DeleteTrip(params: protoRoot.trip.DeleteTrip.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.DeleteTrip.IResponse>(
			{
				method: 'POST',
				data: PARAMS<protoRoot.trip.DeleteTrip.IRequest>(
					params,
					protoRoot.trip.DeleteTrip.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.deleteTrip),
			},
			protoRoot.trip.DeleteTrip.Response
		)
	},
	async GetTrip(params: protoRoot.trip.GetTrip.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.GetTrip.IResponse>(
			{
				method: 'GET',
				data: PARAMS<protoRoot.trip.GetTrip.IRequest>(
					params,
					protoRoot.trip.GetTrip.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getTrip),
			},
			protoRoot.trip.GetTrip.Response
		)
	},
	async GetTripPositions(params: protoRoot.trip.GetTripPositions.IRequest) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.GetTripPositions.IResponse>(
			{
				method: 'GET',
				data: PARAMS<protoRoot.trip.GetTripPositions.IRequest>(
					params,
					protoRoot.trip.GetTripPositions.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getTripPositions),
			},
			protoRoot.trip.GetTripPositions.Response
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
	async GetTripHistoryPositions(
		params: protoRoot.trip.GetTripHistoryPositions.IRequest
	) {
		const { apiUrls } = store.getState().api

		// console.log('GetTripHistoryPositions',params)
		// return await R.request({
		// 	method: 'GET',
		// 	data: params,
		// 	url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getTripHistoryPositions),
		// })

		return await Request<protoRoot.trip.GetTripHistoryPositions.IResponse>(
			{
				method: 'GET',
				data: PARAMS<protoRoot.trip.GetTripHistoryPositions.IRequest>(
					params,
					protoRoot.trip.GetTripHistoryPositions.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getTripHistoryPositions),
			},
			protoRoot.trip.GetTripHistoryPositions.Response
		)
  },
  
	async GetHistoricalStatistics(
		params: protoRoot.trip.GetHistoricalStatistics.IRequest
	) {
		const { apiUrls } = store.getState().api

		return await Request<protoRoot.trip.GetHistoricalStatistics.IResponse>(
			{
				method: 'GET',
				data: PARAMS<protoRoot.trip.GetHistoricalStatistics.IRequest>(
					params,
					protoRoot.trip.GetHistoricalStatistics.Request
				),
				url: getUrl(apiUrls.v1.baseUrl, apiUrls.v1.getHistoricalStatistics),
			},
			protoRoot.trip.GetHistoricalStatistics.Response
		)
	},
}
