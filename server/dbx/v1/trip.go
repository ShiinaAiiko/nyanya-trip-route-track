package dbxV1

import (
	"context"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/nshortid"
	"github.com/cherrai/nyanyago-utils/nstrings"
	"go.mongodb.org/mongo-driver/bson"
)

var (
	log = nlog.New()
)

type TripDbx struct {
}

func (t *TripDbx) GetShortId(digits int) string {
	str := nshortid.GetShortId(digits)

	shortUrl, err := t.GetTrip(str)
	if shortUrl == nil || err != nil {
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

func (t *TripDbx) GetTrip(shortId string) (*models.Trip, error) {
	trip := new(models.Trip)

	key := conf.Redisdb.GetKey("GetTrip")
	err := conf.Redisdb.GetStruct(key.GetKey(shortId), trip)
	if err != nil {

		params := bson.M{}
		if shortId != "" {
			params["shortId"] = shortId
		}

		err := trip.GetCollection().FindOne(context.TODO(), params).Decode(trip)
		if err != nil {
			return nil, err
		}
	}
	err = conf.Redisdb.SetStruct(key.GetKey(shortId), trip, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return trip, nil
}

func (t *TripDbx) GetTrips(authorId, typeStr string, pageNum, pageSize int64, startTime, endTime int64) ([]*models.Trip, error) {
	trip := new(models.Trip)
	var results []*models.Trip

	key := conf.Redisdb.GetKey("GetTrips")
	err := conf.Redisdb.GetStruct(key.GetKey(authorId+typeStr), results)
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
	err = conf.Redisdb.SetStruct(key.GetKey(authorId+typeStr), results, key.GetExpiration())
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
					"_id":        1,
					"type":       1,
					"statistics": 1,
					"startTime":  1,
					"endTime":    1,
					"createTime": 1,
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

// func (t *TripDbx) UpdateVisitHistoryOfShortUrl(shortId string) error {
// 	shortUrl := new(models.Trip)
// 	_, err := shortUrl.GetCollection().UpdateOne(context.TODO(), bson.M{
// 		"$and": []bson.M{

// 			{
// 				"shortId": shortId,
// 			},
// 			{
// 				"status": 1,
// 			},
// 		},
// 	}, bson.M{
// 		"$set": bson.M{
// 			"lastVisitTime": time.Now().Unix(),
// 		},
// 		"$inc": bson.M{
// 			"usageStats.visits": 1,
// 		},
// 	})
// 	if err != nil {
// 		return err
// 	}

// 	key := conf.Redisdb.GetKey("GetShortUrl")
// 	err = conf.Redisdb.GetStruct(key.GetKey(shortId), shortUrl)
// 	if err != nil {
// 		log.Info(err)
// 		conf.Redisdb.Delete(key.GetKey(shortId))
// 	}
// 	shortUrl.UsageStats.Visits += 1
// 	err = conf.Redisdb.SetStruct(key.GetKey(shortId), shortUrl, key.GetExpiration())
// 	if err != nil {
// 		log.Info(err)
// 		conf.Redisdb.Delete(key.GetKey(shortId))
// 	}
// 	return nil
// }
