package dbxV1

import (
	"context"
	"errors"
	"time"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/nshortid"
	"github.com/cherrai/nyanyago-utils/nstrings"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	log = nlog.New()
)

type TripDbx struct {
}

func (t *TripDbx) GetShortId(digits int) string {
	str := nshortid.GetShortId(digits)

	shortUrl, err := t.GetTrip(str, "", "")
	if shortUrl == nil || err != nil {
		return str
	}
	return t.GetShortId(digits)
}

func (t *TripDbx) GetShareKey(digits int) string {
	str := nshortid.GetShortId(digits)

	shareKey, err := t.GetTripByShareKey(str)
	if shareKey == "" || err != nil {
		return str
	}
	return t.GetShortId(digits)
}

func (t *TripDbx) AddTrip(trip *models.Trip) (*models.Trip, error) {
	// 1、插入数据
	trip.Id = t.GetShortId(9)

	err := trip.Default()
	if err != nil {
		return nil, err
	}
	// log.Info("shortUrl", shortUrl)

	_, err = trip.GetCollection().InsertOne(context.TODO(), trip)
	if err != nil {
		return nil, err
	}
	// log.Info("shortUrl", shortUrl)
	return trip, nil
}

func (t *TripDbx) UpdateTrip(authorId, id string, shareKey, name string) error {
	trip := new(models.Trip)

	update := bson.M{}
	if shareKey != "" {
		update["permissions.shareKey"] = shareKey
		if shareKey == "disable" {
			update["permissions.shareKey"] = ""
		}
	}
	if name != "" {
		update["name"] = name
	}

	updateResult, err := trip.GetCollection().UpdateMany(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id": id,
				},
				{
					"authorId": authorId,
					"status":   1,
				},
			},
		}, bson.M{
			"$set": update,
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("delete fail")
	}

	// 删除对应redis
	t.DeleteRedisData(authorId, id)
	return nil
}

func (t *TripDbx) DeleteTrip(authorId, id string) error {
	trip := new(models.Trip)

	updateResult, err := trip.GetCollection().UpdateMany(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id": id,
				},
				{
					"authorId": authorId,
					"status":   1,
				},
			},
		}, bson.M{
			"$set": bson.M{
				"deleteTime": time.Now().Unix(),
				"status":     -1,
			},
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("delete fail")
	}
	// 删除对应redis
	t.DeleteRedisData(authorId, id)
	return nil
}

func (t *TripDbx) GetTrip(id string, authorId string, shareKey string) (*models.Trip, error) {
	trip := new(models.Trip)

	key := conf.Redisdb.GetKey("GetTrip")
	err := conf.Redisdb.GetStruct(key.GetKey(id), trip)
	// log.Info(trip)
	// log.Info("trip.Permissions.ShareKey", trip.Permissions.ShareKey, shareKey)
	if shareKey != "" && trip != nil && trip.Permissions != nil && trip.Permissions.ShareKey == shareKey {
		return trip, nil
	}
	if authorId != "" && trip != nil && trip.AuthorId == authorId {
		return trip, nil
	}
	if err != nil {
		params := bson.M{
			"_id": id,
		}
		if shareKey != "" {
			params["permissions.shareKey"] = shareKey
		} else {
			params["authorId"] = authorId
		}

		err := trip.GetCollection().FindOne(context.TODO(), params).Decode(trip)
		if err != nil {
			return nil, err
		}
	}
	err = conf.Redisdb.SetStruct(key.GetKey(id), trip, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return trip, nil
}

func (t *TripDbx) GetTripByShareKey(shareKey string) (string, error) {
	trip := new(models.Trip)

	key := conf.Redisdb.GetKey("GetTripByShareKey")
	nv, err := conf.Redisdb.Get(key.GetKey(shareKey))
	if err != nil {
		return "", err
	}
	sk := nv.String()
	if sk != "" {
		return sk, nil

	}
	params := bson.M{
		"permissions.shareKey": shareKey,
	}

	opts := options.FindOne().SetProjection(
		bson.D{
			{"permissions", 1},
		},
	)
	err = trip.GetCollection().FindOne(
		context.TODO(), params, opts,
	).Decode(trip)

	if err != nil {
		return "", err
	}
	err = conf.Redisdb.Set(key.GetKey(shareKey), trip.Permissions.ShareKey, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return trip.Permissions.ShareKey, nil
}

func (t *TripDbx) GetTrips(authorId, typeStr string, pageNum, pageSize int64, startTime, endTime int64) ([]*models.Trip, error) {
	trip := new(models.Trip)
	var results []*models.Trip

	key := conf.Redisdb.GetKey("GetTrips")
	err := conf.Redisdb.GetStruct(key.GetKey(
		authorId+typeStr+
			nstrings.ToString(pageNum)+
			nstrings.ToString(pageSize)+
			nstrings.ToString(startTime)+
			nstrings.ToString(endTime),
	), results)
	if err != nil || true {

		match := bson.M{
			"authorId": authorId,
			"status":   1,
			"createTime": bson.M{
				"$gte": startTime,
				"$lt":  endTime,
			},
		}
		if typeStr != "All" {
			match["type"] = typeStr
		}
		params := []bson.M{
			{
				"$match": bson.M{
					"$and": []bson.M{
						match,
					},
				},
			}, {
				"$sort": bson.M{
					"createTime": -1,
				},
			},
			{
				"$skip": pageSize * (pageNum - 1),
			},
			{
				"$limit": pageSize,
			},
			{
				"$project": bson.M{
					"_id":         1,
					"name":        1,
					"type":        1,
					"statistics":  1,
					"permissions": 1,
					"startTime":   1,
					"endTime":     1,
					"createTime":  1,
				},
			},
		}

		opts, err := trip.GetCollection().Aggregate(context.TODO(), params)
		if err != nil {
			// log.Error(err)
			return nil, err
		}
		if err = opts.All(context.TODO(), &results); err != nil {
			// log.Error(err)
			return nil, err
		}
	}
	err = conf.Redisdb.SetStruct(key.GetKey(
		authorId+typeStr+
			nstrings.ToString(pageNum)+
			nstrings.ToString(pageSize)+
			nstrings.ToString(startTime)+
			nstrings.ToString(endTime)), results, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return results, nil
}

func (t *TripDbx) GetTripsBaseData(authorId, typeStr string, startTime, endTime int64) ([]*models.Trip, error) {
	trip := new(models.Trip)
	var results []*models.Trip

	key := conf.Redisdb.GetKey("GetTrips")
	err := conf.Redisdb.GetStruct(key.GetKey(authorId+typeStr+nstrings.ToString(startTime)+nstrings.ToString(endTime)), results)
	if err != nil || true {
		match := bson.M{
			"authorId": authorId,
			"status":   1,
		}
		if typeStr != "All" {
			match["type"] = typeStr
		}
		params := []bson.M{
			{
				"$match": bson.M{
					"$and": []bson.M{
						match,
						{
							"createTime": bson.M{
								"$gte": startTime,
								"$lt":  endTime,
							},
						},
					},
				},
			}, {
				"$sort": bson.M{
					"createTime": -1,
				},
			},
			{
				"$project": bson.M{
					"_id":         1,
					"name":        1,
					"type":        1,
					"statistics":  1,
					"permissions": 1,
					"startTime":   1,
					"endTime":     1,
					"createTime":  1,
				},
			},
		}

		opts, err := trip.GetCollection().Aggregate(context.TODO(), params)
		if err != nil {
			// log.Error(err)
			return nil, err
		}
		if err = opts.All(context.TODO(), &results); err != nil {
			// log.Error(err)
			return nil, err
		}
	}
	err = conf.Redisdb.SetStruct(key.GetKey(authorId+typeStr+nstrings.ToString(startTime)+nstrings.ToString(endTime)), results, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return results, nil
}

func (t *TripDbx) DeleteRedisData(authorId, id string) error {
	log.Info("DeleteRedisData", authorId, id)

	key := conf.Redisdb.GetKey("GetTrip")
	err := conf.Redisdb.Delete(key.GetKey(id))
	if err != nil {
		return err
	}
	return nil
}
