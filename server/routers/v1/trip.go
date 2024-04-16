package routerV1

import (
	controllersV1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/controllers/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/middleware"
)

func (r *Routerv1) InitTrip() {
	tc := new(controllersV1.TripController)

	role := middleware.RoleMiddlewareOptions{
		BaseUrl: r.BaseUrl,
	}
	r.Group.POST(
		role.SetRole("/trip/add", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.AddTrip)

	r.Group.POST(
		role.SetRole("/trip/addTripToOnline", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.AddTripToOnline)

	r.Group.POST(
		role.SetRole("/trip/position/update", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.UpdateTripPosition)

	r.Group.POST(
		role.SetRole("/trip/finish", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.FinishTrip)

	r.Group.POST(
		role.SetRole("/trip/correctedData", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.CorrectedTripData)

	r.Group.POST(
		role.SetRole("/trip/update", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.UpdateTrip)

	r.Group.POST(
		role.SetRole("/trip/delete", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.DeleteTrip)

	r.Group.GET(
		role.SetRole("/trip/get", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          false,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.GetTrip)

	r.Group.GET(
		role.SetRole("/trip/positions/get", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          false,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.GetTripPositions)

	r.Group.GET(
		role.SetRole("/trip/history/positions/get", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.GetTripHistoryPositions)

	r.Group.GET(
		role.SetRole("/trip/list/get", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.GetTrips)

	r.Group.GET(
		role.SetRole("/trip/statistics/get", &middleware.RoleOptionsType{
			CheckApp:           false,
			Authorize:          true,
			RequestEncryption:  false,
			ResponseEncryption: false,
			ResponseDataType:   "protobuf",
		}),
		tc.GetTripStatistics)
}
