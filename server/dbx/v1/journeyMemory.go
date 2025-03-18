package dbxV1

import (
	"context"
	"errors"
	"time"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/mitchellh/mapstructure"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type JourneyMemoryDbx struct {
	jm *models.JourneyMemory
}

var jmProject = bson.M{
	"_id":              1,
	"name":             1,
	"desc":             1,
	"media":            1,
	"timeline.tripIds": 1,
	"timeline.id":      1,
	"authorId":         1,
	"status":           1,
	"createTime":       1,
	"lastUpdateTime":   1,
	"deleteTime":       1,
}

func (d *JourneyMemoryDbx) AddJM(jm *models.JourneyMemory) (*models.JourneyMemory, error) {
	// 1、插入数据
	err := jm.Default()
	if err != nil {
		return nil, err
	}

	_, err = jm.GetCollection().InsertOne(context.TODO(), jm)
	if err != nil {
		return nil, err
	}

	return jm, nil
}

func (d *JourneyMemoryDbx) UpdateJM(id, authorId, name, desc string, media []*models.JourneyMemoryMediaItem) error {
	setUp := bson.M{
		"lastUpdateTime": time.Now().Unix(),
	}

	if name != "" {
		setUp["name"] = name
	}

	if desc != "" {
		setUp["desc"] = desc
	}
	if len(media) > 0 {
		setUp["media"] = media
	}

	updateResult, err := d.jm.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":      id,
					"authorId": authorId,
				},
			},
		}, bson.M{
			"$set": setUp,
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("update fail")
	}

	d.DeleteRedisData(id)

	return nil
}

func (d *JourneyMemoryDbx) DeleteJM(id, authorId string) error {
	updateResult, err := d.jm.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":      id,
					"authorId": authorId,
				},
			},
		}, bson.M{
			"$set": bson.M{
				"status":     -1,
				"deleteTime": time.Now().Unix(),
			},
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("delete fail")
	}

	d.DeleteRedisData(id)

	return nil
}

func (d *JourneyMemoryDbx) GetJM(id, authorId string) (*models.JourneyMemory, error) {
	jm := new(models.JourneyMemory)

	key := conf.Redisdb.GetKey("GetJM")
	err := conf.Redisdb.GetStruct(key.GetKey(id), jm)

	// log.Error("GetCity", city)
	if err != nil || true {
		match := []bson.M{
			{
				"_id": id,
			},
		}
		if authorId != "" {
			match = append(match, bson.M{
				"authorId": authorId,
			})
		}

		// log.Info("name != ", name != "")

		params := []bson.M{
			{
				"$match": bson.M{
					"$and": match,
				},
			}, {
				"$sort": bson.M{
					"createTime": -1,
				},
			},
			{
				"$project": jmProject,
			},
			{
				"$skip": 0,
			},
			{
				"$limit": 1,
			},
		}

		aOptions := options.Aggregate()
		aOptions.SetAllowDiskUse(true)

		var results []*models.JourneyMemory

		opts, err := jm.GetCollection().Aggregate(context.TODO(), params,
			aOptions)
		if err != nil {
			log.Error(err)
			return nil, err
		}
		if err = opts.All(context.TODO(), &results); err != nil {
			log.Error(err)
			return nil, err
		}

		if len(results) == 0 {
			return nil, err
		}
		jm = results[0]
	}
	err = conf.Redisdb.SetStruct(key.GetKey(id), jm, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return jm, nil
}

func (d *JourneyMemoryDbx) GetJMList(
	authorId string,
	pageNum, pageSize int32) ([]*models.JourneyMemory, error) {
	var results []*models.JourneyMemory

	match := bson.M{
		"authorId": authorId,
		"status": bson.M{
			"$in": []int64{1, 0},
		},
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
				"lastUpdateTime": -1,
			},
		},
		{
			"$skip": pageSize * (pageNum - 1),
		},
		{
			"$limit": pageSize,
		},
		{
			"$project": jmProject,
		},
	}

	opts, err := d.jm.GetCollection().Aggregate(context.TODO(), params)
	if err != nil {
		// log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		// log.Error(err)
		return nil, err
	}

	return results, nil
}

func (d *JourneyMemoryDbx) DeleteRedisData(id string) error {
	key := conf.Redisdb.GetKey("GetJM")

	if err := conf.Redisdb.Delete(key.GetKey(id)); err != nil {
		return err
	}

	return nil
}

func (d *JourneyMemoryDbx) AddJMTimeline(id, authorId string, jmt *models.JourneyMemoryTimeLineItem) error {
	// 1、插入数据

	if len(jmt.Media) == 0 {
		jmt.Media = []*models.JourneyMemoryMediaItem{}
	}

	if len(jmt.TripIds) == 0 {
		jmt.TripIds = []string{}
	}
	jmt.Id = d.jm.GetJMTLShortId(9)
	jmt.Status = 1
	jmt.CreateTime = time.Now().Unix()

	updateResult, err := d.jm.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":      id,
					"authorId": authorId,
					"status":   1,
				},
			},
		}, bson.M{
			"$push": bson.M{
				"timeline": jmt,
			},
			"$set": bson.M{
				"lastUpdateTime": time.Now().Unix(),
			},
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("update fail")
	}

	// 删除对应redis
	d.DeleteRedisData(id)
	return nil
}

func (d *JourneyMemoryDbx) UpdateJMTimeline(
	id, authorId, timelineId, name, desc string,
	media []*models.JourneyMemoryMediaItem, tripIds []string) error {

	// 1、插入数据

	setUp := bson.M{
		"lastUpdateTime": time.Now().Unix(),
	}
	if name != "" {
		setUp["timeline.$.name"] = name
	}
	if desc != "" {
		setUp["timeline.$.desc"] = desc
	}
	if len(media) != 0 {
		setUp["timeline.$.media"] = media
	}
	if len(tripIds) != 0 {
		setUp["timeline.$.tripIds"] = tripIds
	}
	if len(setUp) > 1 {
		setUp["timeline.$.lastUpdateTime"] = time.Now().Unix()
	}

	updateResult, err := d.jm.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":         id,
					"authorId":    authorId,
					"status":      1,
					"timeline.id": timelineId,
				},
			},
		}, bson.M{
			"$set": setUp,
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("update fail")
	}

	// 删除对应redis
	d.DeleteRedisData(id)
	return nil
}

func (d *JourneyMemoryDbx) GetJMTimelineList(
	id, authorId string, pageNum, pageSize int32) ([]*models.JourneyMemoryTimeLineItem, error) {

	log.Info(id, authorId, pageNum, pageSize, pageSize*(pageNum-1))

	params := []bson.M{
		{
			"$match": bson.M{
				"$and": []bson.M{
					{
						"_id": id,
					}, {
						"authorId": authorId,
					}, {
						"status": bson.M{
							"$in": []int{1},
						},
					},
				},
			},
		},
		{
			"$unwind": "$timeline",
		},
		// {
		// 	"$project": jmTimelineProject,
		// },
		{
			"$sort": bson.M{
				"createTime": -1,
			},
		},
		{
			"$match": bson.M{
				"$and": []bson.M{
					{
						"timeline.status": bson.M{
							"$in": []int32{1},
						},
					},
				},
			},
		},
		{
			"$skip": pageSize * (pageNum - 1),
		},
		{
			"$limit": pageSize,
		},
	}

	aOptions := options.Aggregate()
	aOptions.SetAllowDiskUse(true)

	var results []map[string]any

	opts, err := d.jm.GetCollection().Aggregate(context.TODO(), params,
		aOptions)
	if err != nil {
		log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		log.Error(err)
		return nil, err
	}

	tlResults := []*models.JourneyMemoryTimeLineItem{}

	for _, v := range results {

		tl := new(models.JourneyMemoryTimeLineItem)

		err := mapstructure.Decode(v["timeline"], tl)
		if err != nil {
			return nil, err
		}

		tlResults = append(tlResults, tl)
	}

	if len(results) == 0 {
		return nil, err
	}

	return tlResults, nil
}

func (d *JourneyMemoryDbx) DeleteJMTimeline(
	id, authorId, timelineId string) error {

	// 1、插入数据

	setUp := bson.M{
		"timeline.$.status":         -1,
		"timeline.$.lastUpdateTime": time.Now().Unix(),
	}

	updateResult, err := d.jm.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id":         id,
					"authorId":    authorId,
					"status":      1,
					"timeline.id": timelineId,
				},
			},
		}, bson.M{
			"$set": setUp,
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if updateResult.ModifiedCount == 0 {
		return errors.New("delete fail")
	}

	// 删除对应redis
	d.DeleteRedisData(id)
	return nil
}
