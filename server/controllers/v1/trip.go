package controllersV1

import (
	dbxv1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/dbx/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/protos"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/response"
	"github.com/cherrai/nyanyago-utils/nint"
	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/validation"
	sso "github.com/cherrai/saki-sso-go"

	// "github.com/cherrai/nyanyago-utils/validation"
	"github.com/gin-gonic/gin"
)

var (
	log     = nlog.New()
	tripDbx = dbxv1.TripDbx{}
)

type TripController struct {
}

func formartTrip(v *models.Trip) *protos.Trip {

	postions := []*protos.TripPostion{}

	for _, v := range v.Postions {
		postions = append(postions, &protos.TripPostion{
			Latitude:         v.Latitude,
			Longitude:        v.Longitude,
			Altitude:         v.Altitude,
			AltitudeAccuracy: v.AltitudeAccuracy,
			Accuracy:         v.Accuracy,
			Heading:          v.Heading,
			Speed:            v.Speed,
			Timestamp:        v.Timestamp,
		})
	}

	trip := &protos.Trip{
		Id:       v.Id,
		Name:     v.Name,
		Postions: postions,
		Type:     v.Type,
		AuthorId: v.AuthorId,
		Statistics: &protos.TripStatistics{
			TotalDistance: v.Statistics.TotalDistance,
			MaxSpeed:      v.Statistics.MaxSpeed,
			MaxAltitude:   v.Statistics.MaxAltitude,
			AverageSpeed:  v.Statistics.AverageSpeed,
		},
		Status:     v.Status,
		CreateTime: v.CreateTime,
		StartTime:  v.StartTime,
		EndTime:    v.EndTime,
	}

	return trip
}

func (fc *TripController) AddTrip(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.AddTrip_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}

	// log.Info("data", data)

	// 3、验证参数
	if err = validation.ValidateStruct(
		data,
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"Running", "Bike", "Drive"})),
		validation.Parameter(&data.Postions, validation.Length(10, 100000000), validation.Required()),
		// validation.Parameter(&data.Status, validation.Required(), validation.Enum([]int64{1, -1})),
		validation.Parameter(&data.StartTime, validation.Required()),
		validation.Parameter(&data.EndTime, validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}
	if err = validation.ValidateStruct(
		data.Statistics,
		validation.Parameter(&data.Statistics.TotalDistance, validation.Required()),
		validation.Parameter(&data.Statistics.MaxSpeed, validation.Required()),
		validation.Parameter(&data.Statistics.AverageSpeed, validation.Required()),
		validation.Parameter(&data.Statistics.MaxAltitude, validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	userInfoAny, exists := c.Get("userInfo")
	if !exists {
		res.Errors(err)
		res.Code = 10004
		res.Call(c)
		return
	}
	userInfo := userInfoAny.(*sso.UserInfo)

	// log.Info("userInfo", userInfo)

	postions := []*models.TripPostion{}

	for _, v := range data.Postions {
		postions = append(postions, &models.TripPostion{
			Latitude:         v.Latitude,
			Longitude:        v.Longitude,
			Altitude:         v.Altitude,
			AltitudeAccuracy: v.AltitudeAccuracy,
			Accuracy:         v.Accuracy,
			Heading:          v.Heading,
			Speed:            v.Speed,
			Timestamp:        v.Timestamp,
		})
	}

	addTrip, err := tripDbx.AddTrip(&models.Trip{
		Type:     data.Type,
		Postions: postions,
		Statistics: &models.TripStatistics{
			TotalDistance: data.Statistics.TotalDistance,
			MaxSpeed:      data.Statistics.MaxSpeed,
			AverageSpeed:  data.Statistics.AverageSpeed,
			MaxAltitude:   data.Statistics.MaxAltitude,
		},
		AuthorId:  userInfo.Uid,
		Status:    1,
		StartTime: data.StartTime,
		EndTime:   data.EndTime,
	})
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}
	// log.Info(addTrip)

	// authorId := c.MustGet("userInfo").(*sso.UserInfo).Uid

	protoData := &protos.AddTrip_Response{
		Trip: formartTrip(addTrip),
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) GetTrips(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetTrips_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}

	log.Info("data", data)

	// 3、验证参数
	if err = validation.ValidateStruct(
		data,
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"All", "Running", "Bike", "Drive"})),
		validation.Parameter(&data.TimeLimit, validation.Length(2, 2), validation.Required()),
		validation.Parameter(&data.PageNum, validation.GreaterEqual(1), validation.Required()),
		validation.Parameter(&data.PageSize, validation.NumRange(1, 50), validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	userInfoAny, exists := c.Get("userInfo")
	if !exists {
		res.Errors(err)
		res.Code = 10004
		res.Call(c)
		return
	}
	userInfo := userInfoAny.(*sso.UserInfo)

	getTrips, err := tripDbx.GetTrips(userInfo.Uid, data.Type, data.PageNum, data.PageSize, data.TimeLimit[0],
		data.TimeLimit[1])
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}
	log.Info(getTrips)
	if len(getTrips) == 0 {
		res.Errors(err)
		res.Code = 10006
		res.Call(c)
		return

	}

	// // authorId := c.MustGet("userInfo").(*sso.UserInfo).Uid
	trips := []*protos.Trip{}
	for _, v := range getTrips {
		trips = append(trips, formartTrip(v))
	}
	protoData := &protos.GetTrips_Response{
		List:  trips,
		Total: nint.ToInt64(len(trips)),
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) GetTripStatistics(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetTripStatistics_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}

	log.Info("data", data)

	// 3、验证参数
	if err = validation.ValidateStruct(
		data,
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"All", "Running", "Bike", "Drive"})),
		validation.Parameter(&data.TimeLimit, validation.Length(2, 2), validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	userInfoAny, exists := c.Get("userInfo")
	if !exists {
		res.Errors(err)
		res.Code = 10004
		res.Call(c)
		return
	}
	userInfo := userInfoAny.(*sso.UserInfo)

	log.Info("data.TimeLimit", data.TimeLimit)
	getTripsBaseData, err := tripDbx.GetTripsBaseData(
		userInfo.Uid, data.Type, data.TimeLimit[0],
		data.TimeLimit[1],
	)
	log.Info("getTripsBaseData", getTripsBaseData)
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	time := int64(0)
	distance := float64(0)
	trips := []*protos.Trip{}
	for _, v := range getTripsBaseData {
		distance += v.Statistics.TotalDistance
		time += v.EndTime - v.StartTime
		trips = append(trips, formartTrip(v))
	}

	protoData := &protos.GetTripStatistics_Response{
		Count:    nint.ToInt64(len(getTripsBaseData)),
		Distance: distance,
		Time:     time,
		List:     trips,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}
