package models

import (
	"errors"
	"time"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	mongodb "github.com/ShiinaAiiko/nyanya-trip-route-track/server/db/mongo"
	"github.com/cherrai/nyanyago-utils/fileStorageDB"
	"github.com/cherrai/nyanyago-utils/validation"
	"go.mongodb.org/mongo-driver/mongo"
)

type TripPosition struct {
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
	Distance        float64 `bson:"distance" json:"distance,omitempty"`
	MaxSpeed        float64 `bson:"maxSpeed" json:"maxSpeed,omitempty"`
	AverageSpeed    float64 `bson:"averageSpeed" json:"averageSpeed,omitempty"`
	MaxAltitude     float64 `bson:"maxAltitude" json:"maxAltitude,omitempty"`
	MinAltitude     float64 `bson:"minAltitude" json:"minAltitude,omitempty"`
	ClimbAltitude   float64 `bson:"climbAltitude" json:"climbAltitude,omitempty"`
	DescendAltitude float64 `bson:"descendAltitude" json:"descendAltitude,omitempty"`
}

type TripPermissions struct {
	// 为空则不支持分享
	// 传了则视为分享权限，可无视用户校验
	// ShareKey string `bson:"shareKey" json:"shareKey,omitempty"`
	AllowShare bool `bson:"allowShare" json:"allowShare,omitempty"`

	CustomTrip bool `bson:"customTrip" json:"customTrip,omitempty"`
	// Share bool `bson:"share" json:"share,omitempty"`
}

type TripMark struct {
	Timestamp int64 `bson:"timestamp" json:"timestamp,omitempty"`
}

type TripCityEntryTimeItem struct {
	Timestamp int64 `bson:"timestamp" json:"timestamp,omitempty"`
}
type TripCity struct {
	// Id         string                   `bson:"_id" json:"id,omitempty"`
	CityId     string                   `bson:"cityId" json:"cityId,omitempty"`
	EntryTimes []*TripCityEntryTimeItem `bson:"entryTimes" json:"entryTimes,omitempty"`
}

type Trip struct {
	// 使用短ID
	Id string `bson:"_id" json:"id,omitempty"`
	// 非必填
	Name string `bson:"name" json:"name,omitempty"`
	// Running、Bike、Drive、Motorcycle、Walking、PowerWalking
	Type        string           `bson:"type" json:"type,omitempty"`
	Positions   []*TripPosition  `bson:"positions" json:"positions,omitempty"`
	Marks       []*TripMark      `bson:"marks" json:"marks,omitempty"`
	Cities      []*TripCity      `bson:"cities" json:"cities,omitempty"`
	Statistics  *TripStatistics  `bson:"statistics" json:"statistics,omitempty"`
	Permissions *TripPermissions `bson:"permissions" json:"permissions,omitempty"`
	AuthorId    string           `bson:"authorId" json:"authorId,omitempty"`
	VehicleId   string           `bson:"vehicleId" json:"vehicleId,omitempty"`

	// 1 normal 0 ing -1 delete
	Status int64 `bson:"status" json:"status,omitempty"`
	// CreateTime Unix timestamp
	CreateTime int64 `bson:"createTime" json:"createTime,omitempty"`
	// LastUpdateTime Unix timestamp
	LastUpdateTime int64 `bson:"lastUpdateTime" json:"lastUpdateTime,omitempty"`
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

	if s.Positions == nil {
		s.Positions = []*TripPosition{}
	}
	if s.Marks == nil {
		s.Marks = []*TripMark{}
	}
	if s.Cities == nil {
		s.Cities = []*TripCity{}
	}
	if s.Statistics == nil {
		s.Statistics = &TripStatistics{}
	}
	if s.Permissions == nil {
		s.Permissions = &TripPermissions{}
	}
	if s.CreateTime == 0 {
		s.CreateTime = unixTimeStamp
	}
	if s.LastUpdateTime == 0 {
		s.LastUpdateTime = unixTimeStamp
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

type TripFsDB struct {
	Trip       *fileStorageDB.Model[*Trip]
	TripIds    *fileStorageDB.Model[[]string]
	Expiration time.Duration
}

var tripFsDB *TripFsDB

func (s *Trip) GetFsDB() *TripFsDB {
	if tripFsDB != nil {
		return tripFsDB
	}

	tripDB, err := fileStorageDB.CreateModel[*Trip](conf.FsDB, s.GetCollectionName())
	if err != nil {
		log.Error(err)
		return nil
	}
	tripIdsDB, err := fileStorageDB.CreateModel[[]string](conf.FsDB, s.GetCollectionName()+"list")
	if err != nil {
		log.Error(err)
		return nil
	}
	db := new(TripFsDB)
	db.Trip = tripDB
	db.TripIds = tripIdsDB
	db.Expiration = 15 * time.Minute

	tripFsDB = db
	return db
}

func (s *Trip) GetCollection() *mongo.Collection {
	return mongodb.GetCollection(conf.Config.Mongodb.Currentdb.Name, s.GetCollectionName())
}

func (s *Trip) Validate() error {
	return validation.ValidateStruct(
		s,
		validation.Parameter(&s.Id, validation.Required(), validation.Type("string")),
		validation.Parameter(&s.Type, validation.Required(), validation.Enum([]string{
			"Running",
			"Bike",
			"Drive",
			"Motorcycle",
			"Walking",
			"PowerWalking",
			"Train",
			"PublicTransport",
			"Plane"})),
		validation.Parameter(&s.AuthorId, validation.Required()),
		validation.Parameter(&s.Status, validation.Enum([]int64{1, 0, -1})),
		validation.Parameter(&s.CreateTime, validation.Required()),
		validation.Parameter(&s.LastUpdateTime, validation.Required()),
		validation.Parameter(&s.StartTime, validation.Required()),
		validation.Parameter(&s.DeleteTime, validation.Required()),
	)
}
