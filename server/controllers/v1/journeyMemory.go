package controllersV1

import (
	"time"

	dbxV1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/dbx/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/protos"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/response"
	"github.com/cherrai/nyanyago-utils/narrays"
	"github.com/cherrai/nyanyago-utils/nint"
	"github.com/cherrai/nyanyago-utils/validation"
	sso "github.com/cherrai/saki-sso-go"
	"github.com/gin-gonic/gin"
	"github.com/jinzhu/copier"
)

// "github.com/cherrai/nyanyago-utils/validation"

var (
	jmDbx = dbxV1.JourneyMemoryDbx{}
)

type JourneyMemoryController struct {
}

func (fc *JourneyMemoryController) AddJM(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.AddJM_Request)
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
		validation.Parameter(&data.Name, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.Desc, validation.Type("string")),
		validation.Parameter(&data.Media),
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
	authorId := userInfo.Uid

	// log.Info("userInfo", userInfo)

	jm, err := jmDbx.AddJM(&models.JourneyMemory{
		Name: data.Name,
		Desc: data.Desc,
		Media: narrays.Map(data.Media, func(v *protos.JourneyMemoryMediaItem, index int) *models.JourneyMemoryMediaItem {
			return &models.JourneyMemoryMediaItem{
				Type: v.Type,
				Url:  v.Url,
			}
		}),
		AuthorId: authorId,
	})
	log.Info("AddJM", jm, err)
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	// authorId := c.MustGet("userInfo").(*sso.UserInfo).Uid

	jmProto := new(protos.JourneyMemoryItem)

	if err := copier.Copy(jmProto, jm); err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	protoData := &protos.AddJM_Response{
		JourneyMemory: jmProto,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) UpdateJM(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.UpdateJM_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.Name, validation.Type("string")),
		validation.Parameter(&data.Desc, validation.Type("string")),
		validation.Parameter(&data.Media),
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
	authorId := userInfo.Uid

	// log.Info("userInfo", userInfo)

	if err = jmDbx.UpdateJM(data.Id, authorId, data.Name, data.Desc,

		narrays.Map(data.Media, func(v *protos.JourneyMemoryMediaItem, index int) *models.JourneyMemoryMediaItem {
			return &models.JourneyMemoryMediaItem{
				Type: v.Type,
				Url:  v.Url,
			}
		}),
	); err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}

	protoData := &protos.UpdateJM_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) GetJMDetail(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetJMDetail_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
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

	jm, err := jmDbx.GetJM(
		data.Id, userInfo.Uid,
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	jmProto := new(protos.JourneyMemoryItem)

	if err := copier.Copy(jmProto, jm); err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	tripIds := []string{}
	for _, sv := range jmProto.Timeline {
		tripIds = append(tripIds, sv.TripIds...)
	}

	if len(tripIds) != 0 {
		trips, err := tripDbx.GetTripsBaseData(
			tripIds,
			userInfo.Uid, "All",
			1, 100000,
			0,
			time.Now().Unix(),
			[]string{},
			0,
			500*1000,
		)
		if err != nil {
			res.Errors(err)
			res.Code = 10001
			res.Call(c)
			return
		}

		ts := tripDbx.FormatTripStatistics(trips)
		jmProto.Statistics = ts
	}

	protoData := &protos.GetJMDetail_Response{
		JourneyMemory: jmProto,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) GetJMList(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetJMList_Request)
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
		validation.Parameter(&data.PageNum, validation.GreaterEqual(int32(1)), validation.Required()),
		validation.Parameter(&data.PageSize, validation.NumRange(int32(1), int32(1000000)), validation.Required()),
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

	jmList, err := jmDbx.GetJMList(
		userInfo.Uid,
		data.PageNum, data.PageSize,
	)
	if err != nil {
		res.Errors(err)
		res.Code = 10006
		res.Call(c)
		return
	}
	log.Info("getTrips", jmList)
	if len(jmList) == 0 {
		res.Errors(err)
		res.Code = 10006
		res.Call(c)
		return

	}

	// // authorId := c.MustGet("userInfo").(*sso.UserInfo).Uid
	jmListProto := []*protos.JourneyMemoryItem{}
	for _, v := range jmList {
		jmProto := new(protos.JourneyMemoryItem)

		copier.Copy(jmProto, v)

		tripIds := []string{}
		for _, sv := range v.Timeline {
			tripIds = append(tripIds, sv.TripIds...)
		}

		log.Info("tripIds", tripIds)

		if len(tripIds) != 0 {
			trips, err := tripDbx.GetTripsBaseData(
				tripIds,
				userInfo.Uid, "All",
				1, 100000,
				0,
				time.Now().Unix(),
				[]string{},
				0,
				500*1000,
			)
			if err != nil {
				res.Errors(err)
				res.Code = 10001
				res.Call(c)
				return
			}

			ts := tripDbx.FormatTripStatistics(trips)
			jmProto.Statistics = ts
		}

		jmListProto = append(jmListProto, jmProto)
	}
	protoData := &protos.GetJMList_Response{
		List:  jmListProto,
		Total: nint.ToInt32(len(jmListProto)),
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) DeleteJM(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.DeleteJM_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
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
	authorId := userInfo.Uid

	// log.Info("userInfo", userInfo)

	if err = jmDbx.DeleteJM(data.Id, authorId); err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}

	protoData := &protos.DeleteJM_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) AddJMTimeline(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.AddJMTimeline_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.Name, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.Desc, validation.Type("string")),
		validation.Parameter(&data.Media),
		validation.Parameter(&data.TripIds, validation.Required()),
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
	authorId := userInfo.Uid

	// log.Info("userInfo", userInfo)

	jmTimelineItem := &models.JourneyMemoryTimeLineItem{
		Name: data.Name,
		Desc: data.Desc,
		Media: narrays.Map(data.Media, func(v *protos.JourneyMemoryMediaItem, index int) *models.JourneyMemoryMediaItem {
			return &models.JourneyMemoryMediaItem{
				Type: v.Type,
				Url:  v.Url,
			}
		}),
		TripIds: data.TripIds,
	}

	if err := jmDbx.AddJMTimeline(data.Id, authorId, jmTimelineItem); err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	// authorId := c.MustGet("userInfo").(*sso.UserInfo).Uid

	jmProto := new(protos.JourneyMemoryTimelineItem)

	if err := copier.Copy(jmProto, jmTimelineItem); err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	protoData := &protos.AddJMTimeline_Response{
		JourneyMemoryTimeline: jmProto,
	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) UpdateJMTimeline(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.UpdateJMTimeline_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.TimelineId, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.Name, validation.Type("string")),
		validation.Parameter(&data.Desc, validation.Type("string")),
		validation.Parameter(&data.Media),
		validation.Parameter(&data.TripIds),
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
	authorId := userInfo.Uid

	// log.Info("userInfo", userInfo)

	if err = jmDbx.UpdateJMTimeline(
		data.Id, authorId, data.TimelineId,
		data.Name, data.Desc, narrays.Map(data.Media, func(v *protos.JourneyMemoryMediaItem, index int) *models.JourneyMemoryMediaItem {
			return &models.JourneyMemoryMediaItem{
				Type: v.Type,
				Url:  v.Url,
			}
		}), data.TripIds); err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}

	protoData := &protos.UpdateJMTimeline_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) GetJMTimelineList(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.GetJMTimelineList_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.PageNum, validation.GreaterEqual(int32(1)), validation.Required()),
		validation.Parameter(&data.PageSize, validation.NumRange(int32(1), int32(100000)), validation.Required()),
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
	authorId := userInfo.Uid

	results, err := jmDbx.GetJMTimelineList(
		data.Id, authorId, data.PageNum, data.PageSize)

	log.Info("GetJMTimelineList", results, err)
	if err != nil {
		res.Errors(err)
		res.Code = 10016
		res.Call(c)
		return
	}

	// authorId := c.MustGet("userInfo").(*sso.UserInfo).Uid

	protoData := &protos.GetJMTimelineList_Response{
		List:  []*protos.JourneyMemoryTimelineItem{},
		Total: int32(len(results)),
	}

	cityIds := []string{}

	for _, v := range results {
		jmProto := new(protos.JourneyMemoryTimelineItem)

		if err := copier.Copy(jmProto, v); err != nil {
			res.Errors(err)
			res.Code = 10001
			res.Call(c)
			return
		}

		if len(v.TripIds) != 0 {
			trips, err := tripDbx.GetTripsBaseData(
				v.TripIds,
				userInfo.Uid, "All",
				1, 100000,
				0,
				time.Now().Unix(),
				[]string{},
				0,
				500*1000,
			)
			if err != nil {
				res.Errors(err)
				res.Code = 10001
				res.Call(c)
				return
			}

			ts := tripDbx.FormatTripStatistics(trips)

			jmProto.Statistics = ts

			jmProto.Trips = []*protos.Trip{}
			for _, sv := range trips {
				tripProto := new(protos.Trip)
				if err := copier.Copy(tripProto, sv); err != nil {
					res.Errors(err)
					res.Code = 10001
					res.Call(c)
					return
				}

				cityIds = append(cityIds, narrays.Map(sv.Cities, func(v *models.TripCity, index int) string {
					return v.CityId
				})...)

				jmProto.Trips = append(jmProto.Trips, tripProto)
			}

		}

		protoData.List = append(protoData.List, jmProto)
	}

	cities, err := cityDbx.GetCities(cityIds)
	if err != nil {
		res.Errors(err)
		res.Code = 10006
		res.Call(c)
		return
	}

	citiesProto := []*protos.CityItem{}
	for _, v := range cities {
		cityProto := new(protos.CityItem)
		if err := copier.Copy(cityProto, v); err != nil {
			res.Errors(err)
			res.Code = 10001
			res.Call(c)
			return
		}

		citiesProto = append(citiesProto, cityProto)
	}

	for _, v := range protoData.List {

		for _, sv := range v.Trips {

			for _, ssv := range sv.Cities {
				cityProto := new(protos.CityItem)
				if err := copier.Copy(cityProto, sv); err != nil {
					res.Errors(err)
					res.Code = 10001
					res.Call(c)
					return
				}

				fullCities := cityDbx.GetFullCityForCitiesProto(ssv.CityId, citiesProto)

				narrays.Reverse(&fullCities)

				ssv.CityDetails = fullCities

			}

			// log.Info("ssv.CityDetails", len(sv.Cities))
		}

		// tripAllPostions, err := tripDbx.GetTripAllPositions(
		// 	authorId, "All", 1, 1000,
		// 	[]string{"Xj2gPZBlq"}, 0, time.Now().Unix(), []string{})
		// log.Info("tripAllPostions", tripAllPostions, err)

		// // 测试用本地文件路径
		// bgFilePath := "./static/tripThumbnailBg.png"
		// // 测试用 URL

		// gpsPoints := [][]methods.GPSPoint{}

		// for _, v := range tripAllPostions[0:1] {
		// 	tempGpsPoints := []methods.GPSPoint{}

		// 	for _, sv := range v.Positions {
		// 		if sv.Latitude != 0 && sv.Longitude != 0 {
		// 			tempGpsPoints = append(tempGpsPoints, methods.GPSPoint{
		// 				Lat: sv.Latitude,
		// 				Lng: sv.Longitude,
		// 			})
		// 		}
		// 	}

		// 	gpsPoints = append(gpsPoints, tempGpsPoints)

		// 	log.Info("gpsPoints", len(tempGpsPoints))
		// }
		// log.Info("gpsPoints", (gpsPoints))

		// log.Info("tripAllPostions[0:1] ", tripAllPostions[0:1])

		// // 配置参数（用本地文件）
		// optionsFile := methods.GenerateRouteImageOptions{
		// 	GPSPoints:    gpsPoints,
		// 	LineColor:    color.RGBA{255, 0, 0, 255}, // 红色 #ff0000
		// 	LineWidth:    3,
		// 	BgImage:      bgFilePath,
		// 	IsBgImageURL: false,
		// 	PaddingX:     30, // 自定义水平边界距离
		// 	PaddingY:     40, // 自定义垂直边界距离
		// 	OutputPath:   "./static/route-from-file.png",
		// 	Quality:      80, // 80% 质量
		// }
		// // 生成图片（本地文件）
		// resultFile, err := methods.GenerateRouteImage(optionsFile)
		// if err != nil {
		// 	log.Error("生成图片（文件）失败:", err)
		// 	return
		// }
		// log.Info("Base64 (文件):", resultFile.Base64[:100]+"...")
		// log.Info("图片保存到:", resultFile.ImagePath)

	}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}

func (fc *JourneyMemoryController) DeleteJMTimeline(c *gin.Context) {
	// 1、请求体
	var res response.ResponseProtobufType
	res.Code = 200

	// 2、获取参数
	data := new(protos.DeleteJMTimeline_Request)
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
		validation.Parameter(&data.Id, validation.Type("string"), validation.Required()),
		validation.Parameter(&data.TimelineId, validation.Type("string"), validation.Required()),
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
	authorId := userInfo.Uid

	// log.Info("userInfo", userInfo)

	if err = jmDbx.DeleteJMTimeline(
		data.Id, authorId, data.TimelineId); err != nil {
		res.Errors(err)
		res.Code = 10011
		res.Call(c)
		return
	}

	protoData := &protos.DeleteJMTimeline_Response{}

	res.Data = protos.Encode(protoData)

	res.Call(c)
}
