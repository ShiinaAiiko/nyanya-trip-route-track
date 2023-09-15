package models

import (
	"errors"
	"time"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	mongodb "github.com/ShiinaAiiko/nyanya-trip-route-track/server/db/mongo"
	"github.com/cherrai/nyanyago-utils/validation"
	"go.mongodb.org/mongo-driver/mongo"
)

type TripPostion struct {
	Latitude  float64 `bson:"latitude" json:"latitude,omitempty"`
	Longitude float64 `bson:"longitude" json:"longitude,omitempty"`
	// -1 则是数据不存在
	Altitude float64 `bson:"altitude" json:"altitude,omitempty"`
	// -1 则是数据不存在
	AltitudeAccuracy float64 `bson:"altitudeAccuracy" json:"altitudeAccuracy,omitempty"`
	// -1 则是数据不存在
	Accuracy float64 `bson:"accuracy" json:"accuracy,omitempty"`
	// -1 则是数据不存在
	Heading float64 `bson:"heading" json:"heading,omitempty"`
	// -1 则是数据不存在
	Speed     float64 `bson:"speed" json:"speed,omitempty"`
	Timestamp int64   `bson:"timestamp" json:"timestamp,omitempty"`
}

type TripStatistics struct {
	TotalDistance float64 `bson:"totalDistance" json:"totalDistance,omitempty"`
	MaxSpeed      float64 `bson:"maxSpeed" json:"maxSpeed,omitempty"`
	AverageSpeed  float64 `bson:"averageSpeed" json:"averageSpeed,omitempty"`
	MaxAltitude   float64 `bson:"maxAltitude" json:"maxAltitude,omitempty"`
}

type TripPermissions struct {
	// 为空则不支持分享
	// 传了则视为分享权限，可无视用户校验
	ShareKey string `bson:"shareKey" json:"shareKey,omitempty"`
}

type Trip struct {
	// 使用短ID
	Id string `bson:"_id" json:"id,omitempty"`
	// 非必填
	Name string `bson:"name" json:"name,omitempty"`
	// Running、Bike、Drive
	Type        string           `bson:"type" json:"type,omitempty"`
	Postions    []*TripPostion   `bson:"postion" json:"postion,omitempty"`
	Statistics  *TripStatistics  `bson:"statistics" json:"statistics,omitempty"`
	Permissions *TripPermissions `bson:"permissions" json:"permissions,omitempty"`
	AuthorId    string           `bson:"authorId" json:"authorId,omitempty"`
	// 1 normal -1 delete
	Status int64 `bson:"status" json:"status,omitempty"`
	// CreateTime Unix timestamp
	CreateTime int64 `bson:"createTime" json:"createTime,omitempty"`
	// StartTime Unix timestamp
	StartTime int64 `bson:"startTime" json:"startTime,omitempty"`
	// EndTime Unix timestamp
	EndTime int64 `bson:"endTime" json:"endTime,omitempty"`
	// DeleteTime Unix timestamp
	DeleteTime int64 `bson:"deleteTime" json:"deleteTime,omitempty"`
}

func (s *Trip) Default() error {
	// 使用短ID
	// if s.Id == primitive.NilObjectID {
	// 	s.Id = primitive.NewObjectID()
	// }
	unixTimeStamp := time.Now().Unix()

	s.Status = 1
	if s.CreateTime == 0 {
		s.CreateTime = unixTimeStamp
	}
	if s.EndTime == 0 {
		s.EndTime = -1
	}
	if s.DeleteTime == 0 {
		s.DeleteTime = -1
	}

	if err := s.Validate(); err != nil {
		return errors.New(s.GetCollectionName() + " Validate: " + err.Error())
	}
	return nil
}

func (s *Trip) GetCollectionName() string {
	return "Trip"
}

func (s *Trip) GetCollection() *mongo.Collection {
	return mongodb.GetCollection(conf.Config.Mongodb.Currentdb.Name, s.GetCollectionName())
}

func (s *Trip) Validate() error {
	return validation.ValidateStruct(
		s,
		validation.Parameter(&s.Id, validation.Required(), validation.Type("string")),
		validation.Parameter(&s.Type, validation.Required(), validation.Enum([]string{"Running", "Bike", "Drive"})),
		validation.Parameter(&s.AuthorId, validation.Required()),
		validation.Parameter(&s.Status, validation.Required(), validation.Enum([]int64{1, -1})),
		validation.Parameter(&s.CreateTime, validation.Required()),
		validation.Parameter(&s.StartTime, validation.Required()),
		validation.Parameter(&s.DeleteTime, validation.Required()),
	)
}
