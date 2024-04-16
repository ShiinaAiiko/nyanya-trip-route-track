package controllersV1

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	dbxv1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/dbx/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/protos"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/middleware"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/response"
	"github.com/cherrai/nyanyago-utils/narrays"
	"github.com/cherrai/nyanyago-utils/nint"
	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/nstrings"
	"github.com/cherrai/nyanyago-utils/validation"
	sso "github.com/cherrai/saki-sso-go"
	"github.com/jinzhu/copier"

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
		postions = append(postions, formartPosition(&protos.TripPosition{
			Latitude:         v.Latitude,
			Longitude:        v.Longitude,
			Altitude:         v.Altitude,
			AltitudeAccuracy: v.AltitudeAccuracy,
			Accuracy:         v.Accuracy,
			Heading:          v.Heading,
			Speed:            v.Speed,
			Timestamp:        v.Timestamp,
		}))
	}

	// log.Info(len(v.Positions), len(postions))

	trip := &protos.Trip{
		Id:        v.Id,
		Name:      v.Name,
		Positions: postions,
		Type:      v.Type,
		AuthorId:  v.AuthorId,
		Statistics: &protos.TripStatistics{
			Distance:        v.Statistics.Distance,
			MaxSpeed:        v.Statistics.MaxSpeed,
			MaxAltitude:     v.Statistics.MaxAltitude,
			AverageSpeed:    v.Statistics.AverageSpeed,
			ClimbAltitude:   v.Statistics.ClimbAltitude,
			DescendAltitude: v.Statistics.DescendAltitude,
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

func formartPosition(v *protos.TripPosition) *protos.TripPosition {
	heading, err := strconv.ParseFloat(fmt.Sprintf("%.3f", v.Heading), 64)
	if err != nil {
		log.Error(err)
	} else {
		v.Heading = heading
	}
	speed, err := strconv.ParseFloat(fmt.Sprintf("%.3f", v.Speed), 64)
	if err != nil {
		log.Error(err)
	} else {
		v.Speed = speed
	}
	altitude, err := strconv.ParseFloat(fmt.Sprintf("%.3f", v.Altitude), 64)
	if err != nil {
		log.Error(err)
	} else {
		v.Altitude = altitude
	}
	accuracy, err := strconv.ParseFloat(fmt.Sprintf("%.2f", v.Accuracy), 64)
	if err != nil {
		log.Error(err)
	} else {
		v.Accuracy = accuracy
	}
	altitudeAccuracy, err := strconv.ParseFloat(fmt.Sprintf("%.2f", v.AltitudeAccuracy), 64)
	if err != nil {
		log.Error(err)
	} else {
		v.AltitudeAccuracy = altitudeAccuracy
	}

	return v
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
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{
			"Running",
			"Bike",
			"Drive",
			"Motorcycle",
			"Walking",
			"PowerWalking"})),
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
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{
			"Running",
			"Bike",
			"Drive",
			"Motorcycle",
			"Walking",
			"PowerWalking",
		})),
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
		Type:       data.Type,
		Positions:  postions,
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

	s, err := tripDbx.GetTripStatistics(addTrip.Id, addTrip.EndTime)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}
	if s.Distance < 50 {
		if err = tripDbx.DeleteTrip(
			"", addTrip.Id,
		); err != nil {
			res.Errors(err)
			res.Code = 10017
			res.Call(c)
			return
		}
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	addTrip.Statistics = s

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
		userInfo.Uid, data.Id, postions, data.Distance,
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
	log.Info(data)

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

	endTime := time.Now().Unix()

	if data.EndTime > 0 {
		endTime = data.EndTime
	}

	s, err := tripDbx.GetTripStatistics(data.Id, endTime)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}
	if s.Distance < 50 {
		if err = tripDbx.DeleteTrip(
			"", data.Id,
		); err != nil {
			res.Errors(err)
			res.Code = 10017
			res.Call(c)
			return
		}
		// if err := fc.TestDataAndPermanentlyDeleteTrip(c, data.Id); err != nil {
		// 	if err.Error() != "deleted successfully" {
		// 		res.Errors(err)
		// 		res.Code = 10017
		// 		res.Call(c)
		// 		return
		// 	}
		// }
		protoData := &protos.FinishTrip_Response{
			Deleted: true,
		}
		res.Code = 200
		res.Data = protos.Encode(protoData)

		res.Call(c)
		return
	}

	err = tripDbx.FinishTrip(
		userInfo.Uid, data.Id,
		s,
		&models.TripPermissions{
			ShareKey: "",
		},
		endTime,
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

func (fc *TripController) CorrectedTripData(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.CorrectedTripData_Request)
	var err error
	if err = protos.DecodeBase64(c.GetString("data"), data); err != nil {
		res.Error = err.Error()
		res.Code = 10002
		res.Call(c)
		return
	}
	log.Info(data)

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

	s, err := tripDbx.GetTripStatistics(data.Id, 0)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}
	log.Info(s.Distance)
	log.Info(userInfo.Uid, data.Id,
		s)
	err = tripDbx.CorrectedTripData(
		userInfo.Uid, data.Id,
		s,
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}

	protoData := &protos.CorrectedTripData_Response{}

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
			validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"Running",
				"Bike",
				"Drive",
				"Motorcycle",
				"Walking",
				"PowerWalking"})),
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

	log.Info("sk", sk, data.ShareKey)

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

	// if err := tripDbx.DeleteTrip("", data.Id); err != nil {
	// 	res.Errors(err)
	// 	if err.Error() == "deleted successfully" {
	// 		res.Code = 200
	// 	} else {
	// 		res.Code = 10017
	// 	}
	// 	res.Call(c)
	// 	return
	// }

	if err = tripDbx.DeleteTrip(
		userInfo.Uid, data.Id,
	); err != nil {
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

	pTrip := formartTrip(getTrip)
	pTrip.Positions = []*protos.TripPosition{}

	protoData := &protos.GetTrip_Response{
		Trip: pTrip,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) GetTripPositions(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetTripPositions_Request)
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

	positions := []string{}

	vPositions, existsTimestamp := tripDbx.FilterPositions(
		getTrip.Positions, getTrip.CreateTime, getTrip.EndTime)

	for _, v := range vPositions {
		// if end {
		// 	continue
		// }

		pv := new(protos.TripPosition)
		copier.Copy(pv, v)

		pv = formartPosition(pv)

		// log.Info("pv.Latitude", pv.Latitude)
		// log.Info("pv.Heading", pv.Heading)
		positions = append(positions,
			nstrings.ToString(pv.Latitude)+"-"+
				nstrings.ToString(pv.Longitude)+"-"+
				nstrings.ToString(pv.Altitude)+"-"+
				nstrings.ToString("")+"-"+
				// nstrings.ToString(pv.AltitudeAccuracy)+"-"+
				nstrings.ToString("")+"-"+
				// nstrings.ToString(pv.Accuracy)+"-"+
				nstrings.ToString("")+"-"+
				// nstrings.ToString(pv.Heading)+"-"+
				nstrings.ToString(pv.Speed)+"-"+
				nstrings.ToString((pv.Timestamp/1000)-getTrip.StartTime))
	}

	log.Error("newPositions", len(existsTimestamp), len(getTrip.Positions))
	if len(existsTimestamp) != len(getTrip.Positions) {
		existsTimestamp = []int64{}
		newPositions := []*models.TripPosition{}
		for _, v := range getTrip.Positions {
			if narrays.Includes(existsTimestamp, v.Timestamp) {
				continue
			}
			existsTimestamp = append(existsTimestamp, v.Timestamp)
			newPositions = append(newPositions, v)
		}
		log.Error("newPositions", len(existsTimestamp), len(getTrip.Positions), len(newPositions))
		getTrip.Status = 0
		if err = tripDbx.UpdateTripAllPositions(getTrip.AuthorId, getTrip.Id, newPositions); err != nil {
			res.Errors(err)
			res.Code = 10001
			res.Call(c)
			return
		}
	}

	tripPositions := protos.TripPositions{
		StartTime: getTrip.StartTime,
		Positions: positions,
		Total:     nint.ToInt64(len(getTrip.Positions)),
		Id:        getTrip.Id,
		Type:      getTrip.Type,
		Status:    getTrip.Status,
	}

	protoData := &protos.GetTripPositions_Response{
		TripPositions: &tripPositions,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *TripController) GetTripHistoryPositions(c *gin.Context) {
	// 1、请求体
	var res response.ResponseType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetTripHistoryPositions_Request)
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
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{
			"All", "Running",
			"Bike",
			"Drive",
			"Motorcycle",
			"Walking",
			"PowerWalking"})),
		validation.Parameter(&data.PageNum, validation.GreaterEqual(int64(1)), validation.Required()),
		validation.Parameter(&data.PageSize, validation.NumRange(int64(1), int64(50)), validation.Required()),
	); err != nil {
		res.Errors(err)
		res.Code = 10002
		res.Call(c)
		return
	}

	authorId := ""
	// 校验身份
	// if data.ShareKey == "" {
	// 	if code := middleware.CheckAuthorize(c); code == 10004 {
	// 		res.Code = 10004
	// 		res.Call(c)
	// 		return
	// 	}
	userInfoAny, exists := c.Get("userInfo")
	if !exists {
		res.Errors(err)
		res.Code = 10004
		res.Call(c)
		return
	}
	authorId = userInfoAny.(*sso.UserInfo).Uid
	// }

	log.Info(authorId)
	trips, err := tripDbx.GetTripAllPositions(authorId, data.Type, data.PageNum, data.PageSize, data.Ids)
	log.Info("trips, err ", trips, err)
	if err != nil || len(trips) == 0 {
		res.Errors(err)
		res.Code = 10006
		res.Call(c)
		return
	}
	// log.Info(data.Id, authorId, data.ShareKey)

	protoData := &protos.GetTripHistoryPositions_Response{}
	for _, v := range trips {

		s, err := tripDbx.GetTripStatistics(v.Id, 0)
		if err != nil {
			res.Errors(err)
			res.Code = 10011
			res.Call(c)
			return
		}
		log.Info(s.Distance)
		err = tripDbx.CorrectedTripData(
			authorId, v.Id,
			s,
		)
		log.Error(err)

		tripPositions := new(protos.TripPositions)
		positions := []string{}

		vPositions, existsTimestamp := tripDbx.FilterPositions(
			v.Positions, v.StartTime, v.EndTime)

		for _, sv := range vPositions {

			pv := new(protos.TripPosition)
			copier.Copy(pv, sv)

			pv = formartPosition(pv)

			positions = append(positions,
				nstrings.ToString(pv.Latitude)+"-"+
					nstrings.ToString(pv.Longitude),
				// nstrings.ToString("")+"-"+
				// // nstrings.ToString(pv.Altitude)+"-"+
				// nstrings.ToString("")+"-"+
				// // nstrings.ToString(pv.AltitudeAccuracy)+"-"+
				// nstrings.ToString("")+"-"+
				// // nstrings.ToString(pv.Accuracy)+"-"+
				// nstrings.ToString("")+"-"+
				// // nstrings.ToString(pv.Heading)+"-"+
				// nstrings.ToString("")+"-"+
				// // nstrings.ToString(pv.Speed)+"-"+
				// nstrings.ToString("")+"-",
				// nstrings.ToString((pv.Timestamp/1000)-v.StartTime)
			)
		}

		tripPositions.StartTime = v.StartTime
		tripPositions.Id = v.Id
		tripPositions.Type = v.Type
		tripPositions.Positions = positions
		tripPositions.Status = v.Status
		tripPositions.Total = nint.ToInt64(len(positions))

		protoData.List = append(protoData.List, tripPositions)

		if len(existsTimestamp) != len(v.Positions) {
			existsTimestamp = []int64{}
			newPositions := []*models.TripPosition{}
			for _, sv := range v.Positions {
				if narrays.Includes(existsTimestamp, sv.Timestamp) {
					continue
				}
				existsTimestamp = append(existsTimestamp, sv.Timestamp)
				newPositions = append(newPositions, sv)
			}
			tripPositions.Status = 0
			log.Error("newPositions", len(newPositions))
			if err = tripDbx.UpdateTripAllPositions(v.AuthorId, v.Id, newPositions); err != nil {
				res.Errors(err)
				res.Code = 10001
				res.Call(c)
				return
			}
		}
	}

	protoData.Total = nint.ToInt64(len(protoData.List))

	log.Info(protoData.Total)
	res.Data = protoData

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
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"All", "Running",
			"Bike",
			"Drive",
			"Motorcycle",
			"Walking",
			"PowerWalking"})),
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
		validation.Parameter(&data.Type, validation.Required(), validation.Enum([]string{"All", "Running",
			"Bike",
			"Drive",
			"Motorcycle",
			"Walking",
			"PowerWalking"})),
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
	// log.Info("getTripsBaseData", getTripsBaseData)
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	time := int64(0)
	uselessData := []string{}
	distance := float64(0)
	trips := []*protos.Trip{}
	for _, v := range getTripsBaseData {
		if v.Status == 0 && v.Statistics.Distance < 50 {
			uselessData = append(uselessData, v.Id)
		}
		if v.Status != 1 {
			continue
		}
		distance += v.Statistics.Distance
		time += v.EndTime - v.StartTime
		trips = append(trips, formartTrip(v))
	}

	protoData := &protos.GetTripStatistics_Response{
		Count:       nint.ToInt64(len(getTripsBaseData)),
		Distance:    distance,
		UselessData: uselessData,
		Time:        time,
		List:        trips,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}
