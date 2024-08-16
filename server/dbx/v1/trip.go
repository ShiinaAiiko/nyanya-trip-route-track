package dbxV1

import (
	"context"
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/methods"
	"github.com/cherrai/nyanyago-utils/narrays"
	"github.com/cherrai/nyanyago-utils/ncommon"
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

func (t *TripDbx) AddTripMark(id, authorId string,
	mark *models.TripMark) error {
	trip := new(models.Trip)

	setUp := bson.M{}

	updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":      id,
					"authorId": authorId,
					"status":   0,
				},
			},
		}, bson.M{
			"$push": bson.M{
				"marks": mark,
			},
			"$set": setUp,
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("update fail")
	}

	// 删除对应redis
	t.DeleteRedisData(authorId, id)
	return nil
}

func (t *TripDbx) UpdateTripPosition(authorId, id string, positions []*models.TripPosition, distance float64) error {
	trip := new(models.Trip)

	if len(positions) == 0 {
		return nil
	}

	setUp := bson.M{}

	if distance > 0 {
		setUp["statistics.distance"] = distance
	}

	updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":      id,
					"authorId": authorId,
					"status":   0,
				},
			},
		}, bson.M{
			"$push": bson.M{
				"positions": bson.M{
					"$each": positions,
				},
			},
			"$set": setUp,
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

func (t *TripDbx) FinishTrip(authorId, id string,
	statistics *models.TripStatistics,
	permissions *models.TripPermissions, endTime int64) error {

	trip := new(models.Trip)

	updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":      id,
					"authorId": authorId,
					"status":   0,
				},
			},
		}, bson.M{
			"$set": bson.M{
				"status":      1,
				"statistics":  statistics,
				"permissions": permissions,
				"endTime":     endTime,
			},
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("update fail")
	}

	// 删除对应redis
	t.DeleteRedisData(authorId, id)
	return nil
}

func (t *TripDbx) CheckPositions(trip *models.Trip) error {
	if trip.Status == 1 {
		existsTimestamp := []int64{}
		newPositions := []*models.TripPosition{}
		for _, v := range trip.Positions {
			if !methods.GSS(v, trip.StartTime, trip.EndTime) ||
				narrays.Includes(existsTimestamp, v.Timestamp) {
				continue
			}
			existsTimestamp = append(existsTimestamp, v.Timestamp)
			newPositions = append(newPositions, v)
		}
		log.Error(" newPositions  ", trip.StartTime,
			trip.EndTime,
			len(existsTimestamp), len(trip.Positions),
			len(newPositions))
		if err := t.UpdateTripAllPositions(trip.AuthorId, trip.Id, newPositions); err != nil {

			return err
		}
		// 每次在这之后都要重新获取一次统计
		t.GetTripStatistics(trip.Id, 0, true)
	}
	return nil
}

func (t *TripDbx) FilterPositions(positions []*models.TripPosition,
	startTime int64, endTime int64) (
	[]*models.TripPosition, []int64,
) {

	sort.Slice(positions, func(a, b int) bool {
		return positions[a].Timestamp < positions[b].Timestamp
	})
	existsTimestamp := []int64{}
	return narrays.Filter(positions, func(v *models.TripPosition) bool {
		if narrays.Includes(existsTimestamp, v.Timestamp) {
			return false
		}
		b := methods.GSS(v, startTime, endTime)
		// log.Info("b", b)
		if b {
			existsTimestamp = append(existsTimestamp, v.Timestamp)
		}
		return b
	}), existsTimestamp
}

// deleteStatus -1 删除失败 0 不需要删除 1 删除成功
func (t *TripDbx) GetTripStatistics(
	id string,
	endTime int64,
	syncDataToDatabase bool,
) (*models.TripStatistics, int, error) {
	ts := new(models.TripStatistics)
	// log.Info("GetStatistics", id)

	trip, err := t.GetTripPositions(id, "", "")

	if endTime == 0 {
		endTime = trip.EndTime
	}

	ts.Distance = 0
	ts.MaxSpeed = 0
	ts.MaxAltitude = 0
	ts.MinAltitude = 0
	ts.ClimbAltitude = 0
	ts.DescendAltitude = 0
	ts.AverageSpeed = 0
	// log.Info("trip", trip, id, trip.StartTime, endTime)
	positions, _ := t.FilterPositions(trip.Positions, trip.StartTime, endTime)
	// log.Info("positions", len(positions))
	for i, v := range positions {
		ts.MaxSpeed = ncommon.IfElse(v.Speed > ts.MaxSpeed, v.Speed, ts.MaxSpeed)
		ts.MaxAltitude = ncommon.IfElse(v.Altitude > ts.MaxAltitude, v.Altitude, ts.MaxAltitude)
		ts.MinAltitude = ncommon.IfElse(v.Altitude < ts.MinAltitude, v.Altitude, ts.MinAltitude)

		if i == 0 {
			ts.MinAltitude = v.Altitude
			continue
		}
		lv := positions[i-1]

		// log.Info(v, lv)
		// log.Info(methods.GetGeoDistance(v.Latitude, v.Longitude, lv.Latitude, lv.Longitude))
		ts.Distance += methods.GetGeoDistance(v.Latitude, v.Longitude, lv.Latitude, lv.Longitude)

		if v.Altitude > lv.Altitude {
			ts.ClimbAltitude += v.Altitude - lv.Altitude
		}
		if v.Altitude < lv.Altitude {
			ts.DescendAltitude += lv.Altitude - v.Altitude
		}

	}

	ts.AverageSpeed = ts.Distance / (float64(endTime) - float64(trip.StartTime))

	ts.Distance = math.Round(ts.Distance*1000) / 1000
	ts.MaxSpeed = math.Round(ts.MaxSpeed*1000) / 1000
	ts.MaxAltitude = math.Round(ts.MaxAltitude*1000) / 1000
	ts.MinAltitude = math.Round(ts.MinAltitude*1000) / 1000
	ts.ClimbAltitude = math.Round(ts.ClimbAltitude*1000) / 1000
	ts.DescendAltitude = math.Round(ts.DescendAltitude*1000) / 1000
	ts.AverageSpeed = math.Round(ts.AverageSpeed*1000) / 1000

	// log.Info("distance", len(positions), ts.Distance)
	// log.Info("maxSpeed", ts.MaxSpeed)
	// log.Info("MaxAltitude", ts.MaxAltitude)
	// log.Info("MinAltitude", ts.MinAltitude)
	// log.Info("ClimbAltitude", ts.ClimbAltitude)
	// log.Info("DescendAltitude", ts.DescendAltitude)
	// log.Info("AverageSpeed", ts.AverageSpeed, ts.AverageSpeed*3.6)

	if syncDataToDatabase {
		if ts.Distance < 50 && trip.Status == 1 {
			if err = t.DeleteTrip(
				"", trip.Id,
			); err != nil {
				return ts, -1, err
			}
			return ts, 1, err
		}

		err = t.CorrectedTripData(
			"", trip.Id,
			ts,
		)
		if err != nil {
			return ts, 0, err
		}
	}
	return ts, 0, err
}

func (t *TripDbx) CheckEndTime(v *models.Trip) *models.Trip {
	if v.EndTime < v.StartTime {
		vTrip, err := t.GetTripPositions(v.Id, v.AuthorId, "")
		if err != nil && len(vTrip.Positions) == 0 {
			log.Error(err)
			return v
		}
		// for _, sv := range vTrip.Positions {
		// 	log.Info("v.EndTime<v.StartTime", sv.Timestamp/1000, v.StartTime, sv.Timestamp/1000 < v.StartTime)

		// }

		log.Info("vTrip.Positions", vTrip)
		log.Info("vTrip.Positions", vTrip.Id, len(vTrip.Positions))
		if len(vTrip.Positions) <= 0 {
			return v
		}
		endTime := vTrip.Positions[len(vTrip.Positions)-1].Timestamp / 1000
		if endTime < v.StartTime {
			// log.Info("v.EndTime<v.StartTime", v.EndTime, v.StartTime)
			return v
		}
		updateResult, err := vTrip.GetCollection().UpdateOne(context.TODO(),
			bson.M{
				"$and": []bson.M{
					{
						"_id": v.Id,
					},
				},
			}, bson.M{
				"$set": bson.M{
					"endTime": endTime,
				},
			}, options.Update().SetUpsert(false))

		if err != nil {
			log.Error(err)
			return v
		}
		if updateResult.ModifiedCount == 0 {
			log.Error("updateResult.ModifiedCount", updateResult.ModifiedCount)
			return v
		}

		// 删除对应redis
		t.DeleteRedisData(v.AuthorId, v.Id)

		v.EndTime = endTime

	}
	return v
}

func (t *TripDbx) CorrectedTripData(authorId, id string,
	statistics *models.TripStatistics) error {

	trip := new(models.Trip)

	filter := bson.M{
		"_id": id,
	}
	if authorId != "" {
		filter["authorId"] = authorId
	}

	updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				filter,
			},
		}, bson.M{
			"$set": bson.M{
				"status":     1,
				"statistics": statistics,
			},
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("update fail")
	}

	// 删除对应redis
	t.DeleteRedisData(authorId, id)
	return nil
}

func (t *TripDbx) UpdateTrip(authorId, id string, shareKey, name, typeStr string) error {
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
	if typeStr != "" {
		update["type"] = typeStr
	}

	// log.Info(authorId, id, update)

	updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
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
		return errors.New("update fail")
	}

	// 删除对应redis
	t.DeleteRedisData(authorId, id)
	return nil
}
func (t *TripDbx) PermanentlyDeleteTrip(id string) error {
	trip := new(models.Trip)

	deleteResult, err := trip.GetCollection().DeleteOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id": id,
				},
			},
		})

	if err != nil {
		return err
	}
	if deleteResult.DeletedCount == 0 {
		return errors.New("delete fail")
	}
	// 删除对应redis
	t.DeleteRedisData("", id)
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
				// {
				// 	"authorId": authorId,
				// 	// "status":   1,
				// },
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

// 这个是重新设置positions，所以需要重新完成
func (t *TripDbx) UpdateTripAllPositions(authorId, id string, positions []*models.TripPosition) error {
	trip := new(models.Trip)

	log.Info("UpdateTripAllPositions", len(positions))
	updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id": id,
				},
			},
		}, bson.M{
			"$set": bson.M{
				"positions": positions,
				"status":    0,
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

var tripProject = bson.M{
	"_id":  1,
	"name": 1,
	"type": 1,
	// "positions.latitude":  1,
	// "positions.longitude": 1,
	// "positions.altitude":  1,
	// "positions.accuracy":  1,
	// "positions.speed":     1,
	// "positions.timestamp": 1,
	"marks":       1,
	"statistics":  1,
	"permissions": 1,
	"authorId":    1,
	"status":      1,
	"createTime":  1,
	"startTime":   1,
	"endTime":     1,
	"deleteTime":  1,
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
		}

		if authorId != "" {
			params["authorId"] = authorId
		}

		opts := options.FindOne().SetProjection(
			tripProject,
		)
		err := trip.GetCollection().FindOne(context.TODO(), params, opts).Decode(trip)
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

var tripPositionsProject = bson.M{
	"_id":                  1,
	"name":                 1,
	"type":                 1,
	"positions.latitude":   1,
	"positions.longitude":  1,
	"positions.altitude":   1,
	"positions.accuracy":   1,
	"positions.speed":      1,
	"positions.timestamp":  1,
	"permissions.shareKey": 1,
	"authorId":             1,
	"status":               1,
	"startTime":            1,
	"endTime":              1,
}

func (t *TripDbx) GetTripPositions(id string, authorId string, shareKey string) (*models.Trip, error) {
	trip := new(models.Trip)

	key := conf.Redisdb.GetKey("GetTripPositions")
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
		}

		if authorId != "" {
			params["authorId"] = authorId
		}

		opts := options.FindOne().SetProjection(
			tripPositionsProject,
		)
		err := trip.GetCollection().FindOne(context.TODO(), params, opts).Decode(trip)
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

func (t *TripDbx) GetTripById(id string) (*models.Trip, error) {
	trip := new(models.Trip)

	key := conf.Redisdb.GetKey("GetTrip")
	err := conf.Redisdb.GetStruct(key.GetKey(id), trip)
	if err != nil {
		params := bson.M{
			"_id": id,
		}
		opts := options.FindOne().SetProjection(
			tripProject,
		)
		err := trip.GetCollection().FindOne(context.TODO(), params, opts).Decode(trip)
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

func (t *TripDbx) GetTripAllPositions(authorId, typeStr string, pageNum, pageSize int64, ids []string) ([]*models.Trip, error) {
	trip := new(models.Trip)
	var results []*models.Trip

	key := conf.Redisdb.GetKey("GetAllTripPositions")

	err := conf.Redisdb.GetStruct(key.GetKey(
		authorId+typeStr+
			nstrings.ToString(pageNum)+
			nstrings.ToString(pageSize)+
			strings.Join(ids, "-"),
	), results)
	// log.Info("GetAllTripPositions redis", err)
	if err != nil {
		match := bson.M{
			"authorId": authorId,
			"status": bson.M{
				"$in": []int64{1, 0},
			},
		}
		if typeStr != "All" {
			match["type"] = typeStr
		}
		if len(ids) > 0 {
			match["_id"] = bson.M{
				"$nin": ids,
			}

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
				"$project": tripPositionsProject,
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
	err = conf.Redisdb.SetStruct(key.GetKey(
		authorId+typeStr+
			nstrings.ToString(pageNum)+
			nstrings.ToString(pageSize)+
			strings.Join(ids, "-"),
	),
		results, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return results, nil
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
			"status": bson.M{
				"$in": []int64{1, 0},
			},
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
					"status":     1,
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
					"authorId":    1,
					"status":      1,
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

func (t *TripDbx) GetHistoricalStatisticsData(authorId, typeStr, dataType string) (*models.Trip, error) {
	trip := new(models.Trip)
	var results []*models.Trip

	match := bson.M{
		"authorId": authorId,
		"status": bson.M{
			"$in": []int64{1},
		},
	}
	project := bson.M{
		"_id":      1,
		"authorId": 1,
	}
	sort := bson.M{}

	if typeStr != "All" {
		match["type"] = typeStr
	}

	if dataType == "maxSpeed" {
		project["statistics.maxSpeed"] = 1
		sort["statistics.maxSpeed"] = -1
	}
	if dataType == "maxDistance" {
		project["statistics.distance"] = 1
		sort["statistics.distance"] = -1
	}
	if dataType == "averageSpeed" {
		project["statistics.averageSpeed"] = 1
		sort["statistics.averageSpeed"] = -1
	}
	if dataType == "maxAltitude" {
		project["statistics.maxAltitude"] = 1
		sort["statistics.maxAltitude"] = -1
	}
	if dataType == "minAltitude" {
		project["statistics.minAltitude"] = 1
		sort["statistics.minAltitude"] = -1
	}
	if dataType == "climbAltitude" {
		project["statistics.climbAltitude"] = 1
		sort["statistics.climbAltitude"] = -1
	}
	if dataType == "descendAltitude" {
		project["statistics.descendAltitude"] = 1
		sort["statistics.descendAltitude"] = -1
	}

	params := []bson.M{
		{
			"$match": bson.M{
				"$and": []bson.M{
					match,
				},
			},
		}, {
			"$project": project,
		}, {
			"$sort": sort,
		}, {
			"$skip": 0,
		}, {
			"$limit": 1,
		},
	}

	opts, err := trip.GetCollection().Aggregate(context.TODO(), params)
	if err != nil {
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, nil
	}

	return results[0], nil
}

func (t *TripDbx) GetTripsBaseData(authorId, typeStr string, startTime, endTime int64) ([]*models.Trip, error) {
	trip := new(models.Trip)
	var results []*models.Trip

	key := conf.Redisdb.GetKey("GetTrips")
	err := conf.Redisdb.GetStruct(key.GetKey(authorId+typeStr+nstrings.ToString(startTime)+nstrings.ToString(endTime)), results)
	if err != nil || true {
		match := bson.M{
			"authorId": authorId,
			"status": bson.M{
				"$in": []int64{1, 0},
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
					"status":      1,
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
	key = conf.Redisdb.GetKey("GetTripPositions")
	err = conf.Redisdb.Delete(key.GetKey(id))
	if err != nil {
		return err
	}
	return nil
}
