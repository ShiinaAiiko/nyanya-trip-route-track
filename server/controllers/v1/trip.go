package controllersV1

import (
	"errors"
	"time"

	dbxv1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/dbx/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/protos"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/middleware"
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
	postions := []*protos.TripPosition{}

	for _, v := range v.Positions {
		postions = append(postions, &protos.TripPosition{
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

	// log.Info(len(v.Positions), len(postions))

	trip := &protos.Trip{
		Id:        v.Id,
		Name:      v.Name,
		Positions: postions,
		Type:      v.Type,
		AuthorId:  v.AuthorId,
		Statistics: &protos.TripStatistics{
			Distance:     v.Statistics.Distance,
			MaxSpeed:     v.Statistics.MaxSpeed,
			MaxAltitude:  v.Statistics.MaxAltitude,
			AverageSpeed: v.Statistics.AverageSpeed,
		},
		Status:     v.Status,
		CreateTime: v.CreateTime,
		StartTime:  v.StartTime,
		EndTime:    v.EndTime,
	}
	if v.Permissions != nil {
		trip.Permissions = &protos.TripPermissions{
			ShareKey: v.Permissions.ShareKey,
		}
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
		// validation.Parameter(&data.StartTime, validation.Required()),
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

	addTrip, err := tripDbx.AddTrip(&models.Trip{
		Type: data.Type,
		// Postions: []*models.TripPostion{},
		// Statistics: &models.TripStatistics{
		// 	// TotalDistance: data.Statistics.TotalDistance,
		// 	// MaxSpeed:      data.Statistics.MaxSpeed,
		// 	// AverageSpeed:  data.Statistics.AverageSpeed,
		// 	// MaxAltitude:   data.Statistics.MaxAltitude,
		// },
		// Postions: []*models.TripPostion{},
		AuthorId:  userInfo.Uid,
		Status:    0,
		StartTime: time.Now().Unix(),
		// EndTime:   data.EndTime,
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

func (fc *TripController) AddTripToOnline(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.AddTripToOnline_Request)
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
		validation.Parameter(&data.Positions, validation.Length(1, 100000000), validation.Required()),
		validation.Parameter(&data.StartTime, validation.Greater(int64(0)), validation.Required()),
		validation.Parameter(&data.EndTime, validation.Greater(int64(0)), validation.Required()),
		validation.Parameter(&data.CreateTime, validation.Greater(int64(0)), validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	if err = validation.ValidateStruct(
		data.Statistics,
		validation.Parameter(&data.Statistics.Distance, validation.GreaterEqual(float64(50)), validation.Required()),
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

	postions := []*models.TripPosition{}

	for _, v := range data.Positions {
		postions = append(postions, &models.TripPosition{
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
	// log.Info("userInfo", userInfo)

	addTrip, err := tripDbx.AddTrip(&models.Trip{
		Type:      data.Type,
		Positions: postions,
		Statistics: &models.TripStatistics{
			Distance:     data.Statistics.Distance,
			MaxSpeed:     data.Statistics.MaxSpeed,
			AverageSpeed: data.Statistics.AverageSpeed,
			MaxAltitude:  data.Statistics.MaxAltitude,
		},
		AuthorId:   userInfo.Uid,
		Status:     1,
		CreateTime: data.CreateTime,
		StartTime:  data.StartTime,
		EndTime:    data.EndTime,
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

func (fc *TripController) UpdateTripPosition(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.UpdateTripPosition_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}

	// 3、验证参数
	if err = validation.ValidateStruct(
		data,
		validation.Parameter(&data.Id, validation.Required()),
		validation.Parameter(&data.Positions, validation.Length(1, 100000000), validation.Required()),
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

	postions := []*models.TripPosition{}

	for _, v := range data.Positions {
		postions = append(postions, &models.TripPosition{
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

	err = tripDbx.UpdateTripPosition(
		userInfo.Uid, data.Id, postions,
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}
	protoData := &protos.UpdateTripPosition_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) TestDataAndPermanentlyDeleteTrip(c *gin.Context, id string) error {
	getTrip, err := tripDbx.GetTripById(id)
	if err != nil || getTrip == nil {
		return errors.New("content does not exist")
	}
	// 少于10个坐标视为无效数据
	if getTrip.Status == 0 && (len(getTrip.Positions) < 10 || getTrip.Statistics.Distance < 50) {
		if err = tripDbx.PermanentlyDeleteTrip(id); err != nil {
			return err
		}
		return errors.New("deleted successfully")
	}
	return nil
}

func (fc *TripController) FinishTrip(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.FinishTrip_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}

	// 3、验证参数
	if err = validation.ValidateStruct(
		data,
		validation.Parameter(&data.Id, validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	if err = validation.ValidateStruct(
		data.Statistics,
		validation.Parameter(&data.Statistics.Distance, validation.Required()),
		validation.Parameter(&data.Statistics.MaxSpeed, validation.Required()),
		validation.Parameter(&data.Statistics.AverageSpeed, validation.Required()),
		validation.Parameter(&data.Statistics.MaxAltitude, validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)

		// log.Info(err)
		// 检测是否需要删除
		if data.Statistics.Distance < 50 {
			if err := fc.TestDataAndPermanentlyDeleteTrip(c, data.Id); err != nil {
				if err.Error() != "deleted successfully" {
					res.Errors(err)
					res.Code = 10017
					res.Call(c)
					return
				}
			}
			protoData := &protos.FinishTrip_Response{
				Deleted: true,
			}
			res.Code = 200
			res.Data = protos.Encode(protoData)

			res.Call(c)
			return
		}

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

	if data.Statistics.Distance < 50 {
		if err := fc.TestDataAndPermanentlyDeleteTrip(c, data.Id); err != nil {
			res.Errors(err)
			if err.Error() == "deleted successfully" {
				protoData := &protos.FinishTrip_Response{
					Deleted: true,
				}
				res.Data = protos.Encode(protoData)
				res.Code = 200
			} else {
				res.Code = 10017
			}
			res.Call(c)
			return
		}
	}

	err = tripDbx.FinishTrip(
		userInfo.Uid, data.Id,
		&models.TripStatistics{
			Distance:     data.Statistics.Distance,
			MaxSpeed:     data.Statistics.MaxSpeed,
			AverageSpeed: data.Statistics.AverageSpeed,
			MaxAltitude:  data.Statistics.MaxAltitude,
		},
		&models.TripPermissions{
			ShareKey: "",
		},
		time.Now().Unix(),
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}

	protoData := &protos.FinishTrip_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) UpdateTrip(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.UpdateTrip_Request)
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
		validation.Parameter(&data.Id, validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	if data.Type != "" {
		if err = validation.ValidateStruct(
			data,
			validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"Running", "Bike", "Drive"})),
		); err != nil {
			res.Errors(err)
			res.Code = 10002
			res.Call(c)
			return
		}
	}
	sk := ""
	if data.ShareKey != "" {
		if err = validation.ValidateStruct(
			data,
			validation.Parameter(&data.ShareKey, validation.Required(), validation.Enum([]string{"Generate", "Delete"})),
		); err != nil {
			res.Errors(err)
			res.Code = 10002
			res.Call(c)
			return
		}
		if data.ShareKey == "Generate" {
			sk = tripDbx.GetShareKey(9)
		}
		if data.ShareKey == "Delete" {
			sk = "disable"
		}
	}

	userInfoAny, exists := c.Get("userInfo")
	if !exists {
		res.Errors(err)
		res.Code = 10004
		res.Call(c)
		return
	}
	userInfo := userInfoAny.(*sso.UserInfo)

	// log.Info(userInfo.Uid, data.Id, sk, data.Name, data.Type)
	err = tripDbx.UpdateTrip(
		userInfo.Uid, data.Id, sk, data.Name, data.Type,
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}
	if sk == "disable" {
		sk = ""
	}

	protoData := &protos.UpdateTrip_Response{
		ShareKey: sk,
		Name:     data.Name,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) DeleteTrip(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.DeleteTrip_Request)
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
		validation.Parameter(&data.Id, validation.Required()),
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

	if err := fc.TestDataAndPermanentlyDeleteTrip(c, data.Id); err != nil {
		res.Errors(err)
		if err.Error() == "deleted successfully" {
			res.Code = 200
		} else {
			res.Code = 10017
		}
		res.Call(c)
		return
	}

	err = tripDbx.DeleteTrip(
		userInfo.Uid, data.Id,
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10017
		res.Call(c)
		return
	}

	protoData := &protos.DeleteTrip_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) GetTrip(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetTrip_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}

	// 3、验证参数
	if err = validation.ValidateStruct(
		data,
		validation.Parameter(&data.Id, validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	authorId := ""
	// 校验身份
	if data.ShareKey == "" {
		if code := middleware.CheckAuthorize(c); code == 10004 {
			res.Code = 10004
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
		authorId = userInfoAny.(*sso.UserInfo).Uid
	}

	// log.Info(data.Id, authorId, data.ShareKey)
	getTrip, err := tripDbx.GetTrip(data.Id, authorId, data.ShareKey)
	// log.Info("getTrip, err ", getTrip, err)
	if err != nil || getTrip == nil {
		res.Errors(err)
		res.Code = 10006
		res.Call(c)
		return
	}
	// log.Info(data.Id, authorId, data.ShareKey)

	protoData := &protos.GetTrip_Response{
		Trip: formartTrip(getTrip),
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
		validation.Parameter(&data.PageNum, validation.GreaterEqual(int64(1)), validation.Required()),
		validation.Parameter(&data.PageSize, validation.NumRange(int64(1), int64(50)), validation.Required()),
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
		if v.Status != 1 {
			continue
		}
		distance += v.Statistics.Distance
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
