package dbxV1

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/protos"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/response"
	"github.com/cherrai/nyanyago-utils/narrays"
	"github.com/cherrai/nyanyago-utils/nint"
	"github.com/cherrai/nyanyago-utils/nstrings"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CityDbx struct {
}

var cityProject = bson.M{
	"_id":            1,
	"name":           1,
	"parentCityId":   1,
	"coords":         1,
	"level":          1,
	"status":         1,
	"createTime":     1,
	"lastUpdateTime": 1,
}

func (t *CityDbx) AddAndGetFullCity(ci *protos.UpdateCity_Request_City) (city *models.City, err error) {

	cities := []string{
		ci.Country,
		ci.State,
		ci.Region,
		ci.City,
		ci.Town,
	}
	// log.Info("city", city, ci, cities)

	pId := ""

	for cIndex := 0; cIndex < 5; cIndex++ {
		cName := cities[cIndex]
		if cName == "" {
			continue
		}

		cCities := narrays.Filter(cities, func(sv string, si int) bool {
			return si <= cIndex
		})

		// log.Error(cCities, cName, strings.Join(cCities, ""), pId, cIndex+1)
		city, err = t.AddAndGetCity(cName, strings.Join(cCities, ""), pId, cIndex+1)
		// log.Info("GetCity", cCities, strings.Join(cCities, ""), cName, city, err)
		if err != nil {
			return nil, err
		}
		pId = city.Id
	}

	return city, nil
}

func (t *CityDbx) GetCityCoords(fullName string) (*models.CityCoords, error) {

	coords := new(models.CityCoords)

	resp, err := conf.RestyClient.R().SetQueryParams(map[string]string{}).
		Get(
			conf.ToolApiUrl + "/api/v1/geocode/geo?address=" +
				fullName + "&platform=Amap",
			// "https://tools.aiiko.club/api/v1/geocode/geo?address=" +
			// 	fullName + "&platform=Amap",
		)
	if err != nil {
		log.Error(err)
		return nil, err
	}

	res := new(response.ResponseType)

	// log.Info("resp.Body()", resp.String())
	if err = json.Unmarshal(resp.Body(), res); err != nil {
		return nil, err
	}
	// log.Info("resp.Body()", res)

	if res.Code != 200 {
		return nil, errors.New(res.Msg)
	}

	data := res.Data.(map[string]any)

	lat, err := strconv.ParseFloat(nstrings.StringOr(nstrings.ToString(data["latitude"]), "0"), 64)
	if err == nil {
		coords.Latitude = lat
	}
	lng, err := strconv.ParseFloat(nstrings.StringOr(nstrings.ToString(data["longitude"]), "0"), 64)
	if err == nil {
		coords.Longitude = lng
	}

	return coords, nil
}

func (t *CityDbx) AddAndGetCity(name string, fullName string, parentCityId string, level int) (*models.City, error) {
	city, err := t.GetCity("", name, fullName)
	log.Warn("AddAndGetCity", city, err)
	if err != nil {
		return nil, err
	}
	if city == nil {
		coords, err := t.GetCityCoords(fullName)
		if err != nil {
			return nil, err
		}
		city = &models.City{
			Name: &models.CityName{
				ZhCN: name,
			},
			Coords:       coords,
			ParentCityId: parentCityId,
			Level:        level,
			Status:       1,
		}
		if err = city.Default(); err != nil {
			return nil, err
		}
		log.Info("AddCity", city)

		city, err = t.AddCity(city)
		if err != nil {
			return nil, err
		}

	}
	if city.Coords == nil || (city.Coords.Latitude == 0 && city.Coords.Longitude == 0) {
		coords, err := t.GetCityCoords(fullName)
		if err != nil {
			return nil, err
		}
		log.Error(coords)

		if err := t.UpdateCity(city.Id, fullName, coords); err != nil {
			log.Error(err)
			return city, err
		}
		city.Coords = coords
	}
	log.Info("city.Coords", city.Coords)

	return city, nil
}
func (t *CityDbx) AddCity(city *models.City) (*models.City, error) {
	// 1、插入数据
	err := city.Default()
	if err != nil {
		return nil, err
	}

	_, err = city.GetCollection().InsertOne(context.TODO(), city)
	if err != nil {
		return nil, err
	}

	return city, nil
}

func (t *CityDbx) UpdateCity(id, fullName string, coords *models.CityCoords) error {
	city := new(models.City)

	setUp := bson.M{
		"lastUpdateTime": time.Now().Unix(),
	}

	if coords != nil {
		setUp["coords"] = coords
	}

	updateResult, err := city.GetCollection().UpdateOne(context.TODO(),
		bson.M{
			"$and": []bson.M{
				{
					"_id": id,
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
	t.DeleteRedisData(id, fullName)
	return nil
}

func (t *CityDbx) GetCity(id string, name string, fullName string) (*models.City, error) {
	city := new(models.City)

	key := conf.Redisdb.GetKey("GetCity")
	err := conf.Redisdb.GetStruct(key.GetKey(id+fullName), city)

	// log.Error("GetCity", city)
	if err != nil || true {
		match := []bson.M{}
		if id != "" {
			match = append(match, bson.M{
				"_id": id,
			})
		}
		if name != "" {
			nameMatch := []bson.M{}

			for _, v := range models.CityNameLanguages {
				nameMatch = append(nameMatch, bson.M{
					"name." + v: name,
				})
			}
			match = append(match, bson.M{
				"$or": nameMatch,
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
				"$project": cityProject,
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

		log.Info("match", match, id, name, fullName)

		var results []*models.City

		opts, err := city.GetCollection().Aggregate(context.TODO(), params,
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
		city = results[0]
	}
	err = conf.Redisdb.SetStruct(key.GetKey(id+fullName), city, key.GetExpiration())
	if err != nil {
		log.Info(err)
	}

	return city, nil
}

func (t *CityDbx) GetFullCityForCitiesProto(id string, cities []*protos.CityItem) (citiesProto []*protos.CityItem) {

	for _, v := range cities {
		if v.Id == id {
			citiesProto = append(citiesProto, v)
			if v.ParentCityId != "" {
				citiesProto = append(citiesProto, t.GetFullCityForCitiesProto(v.ParentCityId, cities)...)
			}
			return
		}
	}

	return
}

// func (t *CityDbx) GetCities(ids []string) (cities []*models.City, err error) {

// 	for _, id := range ids {
// 		pCities, err := t.GetFullCities(id)
// 		if err != nil {
// 			return nil, nil
// 		}
// 		cities = append(cities, pCities...)

// 	}

//		return cities, nil
//	}

func (t *CityDbx) getCities(ids []string, lastResultIds []string) ([]*models.City, error) {
	city := new(models.City)

	ids = narrays.StructDeduplication(
		narrays.Filter(ids,
			func(value string, index int) bool {
				return !narrays.Includes(lastResultIds, value)
			}), func(a string, b string) bool {
			return a == b
		})
	// log.Info("ids", ids)

	if len(ids) == 0 {
		return nil, nil
	}
	log.Info(len(ids))

	var err error
	var results []*models.City

	// key := conf.Redisdb.GetKey("GetCities")

	// mKey := key.CreateMKey(ids...)

	// conf.Redisdb.Delete(key.GetKey("sD3Lsp8SG"))

	// cmds, emptyKeyIndices, err := conf.Redisdb.MGet(mKey.GetMKey())

	emptyKeys := ids

	// emptyKeys := mKey.GetEmptyKeys(emptyKeyIndices...)

	// log.Info("cmds", len(cmds), len(ids), ids, err)
	// log.Info("emptyKeys", len(emptyKeyIndices), emptyKeyIndices, emptyKeys)

	// for _, v := range cmds {
	// 	city := new(models.City)
	// 	v.Struct(city)
	// 	results = append(results, city)
	// }

	if err != nil || len(emptyKeys) != 0 {
		params := []bson.M{
			{
				"$match": bson.M{
					"_id": bson.M{
						"$in": emptyKeys,
					},
				},
			},
			{
				"$project": cityProject,
			},
		}

		aOptions := options.Aggregate()
		aOptions.SetAllowDiskUse(true)

		// var results []map[string]any

		var newResults []*models.City

		opts, err := city.GetCollection().Aggregate(context.TODO(), params,
			aOptions)
		if err != nil {
			log.Error(err)
			return nil, err
		}
		if err = opts.All(context.TODO(), &newResults); err != nil {
			log.Error(err)
			return nil, err
		}

		results = append(results, newResults...)

		if len(results) == 0 {
			return nil, nil
		}

	}

	// redis
	// values := map[string]any{}
	// for _, v := range results {
	// 	values[key.GetKey(v.Id)] = v
	// }

	// // log.Info("results", len(results), len(values))

	// err = conf.Redisdb.MSetStruct(values, key.GetExpiration())
	// if err != nil {
	// 	log.Info(err)
	// }
	// log.Error("results", len(results), len(values))

	parentIds := narrays.Filter(narrays.Map(results, func(v *models.City, i int) string {
		return v.ParentCityId
	}),
		func(v string, i int) bool {
			return v != ""
		})

	// log.Info("parentIds", parentIds)

	if len(parentIds) == 0 {
		return results, nil
	}
	parentResult, err := t.getCities(parentIds, append(lastResultIds, ids...))
	if err != nil {
		log.Error(err)
		return nil, err
	}
	results = append(results, parentResult...)

	return results, nil
}

// 缺redis
func (t *CityDbx) GetCities(ids []string) ([]*models.City, error) {
	return t.getCities(ids, []string{})
}

func (t *CityDbx) DeleteRedisData(id string, fullName string) error {

	key := conf.Redisdb.GetKey("GetCity")

	if err := conf.Redisdb.Delete(key.GetKey(id + fullName)); err != nil {
		return err
	}

	if err := conf.Redisdb.Delete(key.GetKey(id + "")); err != nil {
		return err
	}

	if err := conf.Redisdb.Delete(key.GetKey("" + fullName)); err != nil {
		return err
	}

	return nil
}

func (t *CityDbx) InitTripPositionCity(tripId string) error {
	trip, err := tripDbx.GetTripById(tripId)
	if err != nil {
		return err
	}
	tripPositions, err := tripDbx.GetTripPositions(trip.Id, trip.AuthorId, "")
	if err != nil {
		return err
	}

	nextPosTime := int64(0)
	count := 1
	for _, v := range tripPositions.Positions {

		if v.Timestamp > nextPosTime {
			log.Info(count, v.Latitude, v.Timestamp)
			nextPosTime = v.Timestamp + 20*1000
			count++
		}
	}
	// log.Info("tripPositions", len(tripPositions.Positions))

	return nil
}

type UserVisitedCities struct {
	CityId         string
	FirstEntryTime int64
	LastEntryTime  int64
	EntryCount     int32
}

// 缺redis
func (t *CityDbx) GetAllCitiesVisitedByUser(authorId string) (cities []*UserVisitedCities, err error) {
	trip := new(models.Trip)

	params := []bson.M{
		{
			"$match": bson.M{
				"authorId": authorId,
				"status":   1,
				"cities": bson.M{
					"$exists": true,
					"$not": bson.M{
						"$size": 0,
					},
				},
			},
		},
		{
			"$unwind": "$cities",
		},
		{
			"$unwind": "$cities.entryTimes",
		}, {
			"$group": bson.M{
				"_id":            "$cities.cityId",
				"firstEntryTime": bson.M{"$min": "$cities.entryTimes"},
				"lastEntryTime":  bson.M{"$max": "$cities.entryTimes"},
				"entryCount":     bson.M{"$sum": 1},
			},
		},
		{
			"$project": bson.M{
				"_id":            0,
				"cityId":         "$_id",
				"firstEntryTime": "$firstEntryTime.timestamp",
				"lastEntryTime":  "$lastEntryTime.timestamp",
				"entryCount":     1,
			},
		},
	}

	var results []map[string]any
	opts, err := trip.GetCollection().Aggregate(context.TODO(), params)
	if err != nil {
		// log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		// log.Error(err)
		return nil, err
	}

	// log.Info("results", results)

	// type CityIdType struct {
	// 	CityId    string
	// 	EntryTime int64
	// }

	// cityIds := []*CityIdType{}

	for _, v := range results {
		// log.Info(v)

		// if nstrings.ToString(v["cityId"]) == "" {
		// 	log.Info(v)
		// }

		cities = append(cities, &UserVisitedCities{
			CityId:         nstrings.ToString(v["cityId"]),
			FirstEntryTime: nint.ToInt64(v["firstEntryTime"]),
			LastEntryTime:  nint.ToInt64(v["firstEntryTime"]),
			EntryCount:     v["entryCount"].(int32),
		})

		// log.Info(v["entryCount"], nint.ToInt32())
		// for _, sv := range v.Cities {

		// 	cityIds = append(cityIds, &CityIdType{
		// 		CityId: sv.CityId,
		// 		EntryTime: nmath.Min(narrays.Map(sv.EntryTimes, func(v *models.TripCityEntryTimeItem, index int) int64 {
		// 			return v.Timestamp
		// 		})...),
		// 	})
		// }
		// cities = append(cities, v.Cities)
		// log.Info("cityIds", cityIds)

		// cityIdsMap := map[string]int64{}

		// for _, v := range cityIds {

		// 	if cityIdsMap[v.CityId] == 0 || cityIdsMap[v.CityId] > v.EntryTime {
		// 		cityIdsMap[v.CityId] = v.EntryTime
		// 	}
		// }
		// log.Info("cityIdsMap", cityIdsMap)

	}

	return cities, nil
}

func (t *CityDbx) InitCityes() (cities *map[string]int64, err error) {
	trip := new(models.Trip)

	var results []*models.Trip

	params := []bson.M{
		{
			"$match": bson.M{
				"$and": []bson.M{
					bson.M{
						// "_id": "T1HAZSw5G",
						"_id": bson.M{
							"$in": []string{"HjFiAGJwf"},
							// "$in": []string{"GfhyeHASJ", "smYOp1MrX", "l8LRZP67g", "tG0Bo3t3t"},
						},
						// "createTime": bson.M{
						// 	"$lte": 1710486182,
						// 	"$gte": 0,
						// },
						"cities": bson.M{
							"$exists": true,
							"$not": bson.M{
								"$size": 0,
							},
						},
					},
				},
			},
		},
		{
			"$project": bson.M{
				"_id":    1,
				"cities": 1,
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

	log.Info("results", results)

	type CityIdType struct {
		Id        string
		EntryTime int64
	}

	for _, v := range results {
		for _, sv := range v.Cities {

			log.Info(sv.CityId)

			updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
				bson.M{
					"$and": []bson.M{
						{
							"_id": v.Id,
							// "cities._id": sv.Id,
						},
					},
				}, bson.M{
					"$set": bson.M{
						"cities": []*models.TripCity{},
					},
				}, options.Update().SetUpsert(false))

			log.Info(updateResult, err)

		}
		// cities = append(cities, v.Cities)
	}

	return nil, nil
}

func (t *CityDbx) InitAddCityesForTrip() (cities *map[string]int64, err error) {
	trip := new(models.Trip)

	var results []*models.Trip

	params := []bson.M{
		{
			"$match": bson.M{
				"$and": []bson.M{
					bson.M{
						"createTime": bson.M{
							"$lte": 1736230041,
							"$gte": 1735193241,
						},
					},
				},
			},
		},
		{
			"$sort": bson.M{
				"createTime": -1,
			},
		},
		{
			"$skip": 0,
		},
		{
			"$limit": 1,
		},
		{
			"$project": bson.M{
				"_id":        1,
				"createTime": 1,
				"cities":     1,
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

	log.Info("results", results)

	for _, v := range results {
		t := time.Unix(v.CreateTime, 0)
		log.Info(v.Id, t.Format("2006-01-02 15:04:05"), len(v.Cities))

	}

	return nil, nil
}

func (t *CityDbx) SetSubCityLevel(cityId string, level int) (cities *map[string]int64, err error) {
	city := new(models.City)

	log.Info("cityId", cityId, level)

	params := []bson.M{
		{
			"$match": bson.M{
				"parentCityId": cityId,
			},
		},
	}

	aOptions := options.Aggregate()
	aOptions.SetAllowDiskUse(true)

	var results []*models.City

	opts, err := city.GetCollection().Aggregate(context.TODO(), params,
		aOptions)
	if err != nil {
		log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		log.Error(err)
		return nil, err
	}

	log.Info("results", results)
	for _, v := range results {

		log.Info(v.Name.ZhCN)

		updateResult, err := city.GetCollection().UpdateOne(context.TODO(),
			bson.M{
				"$and": []bson.M{
					{
						"_id": v.Id,
					},
				},
			}, bson.M{
				"$set": bson.M{
					"level": level,
				},
			}, options.Update().SetUpsert(false))

		log.Info(updateResult, err)

		t.SetSubCityLevel(v.Id, level+1)

	}
	// trip := new(models.Trip)

	// var results []*models.Trip

	// params := []bson.M{
	// 	{
	// 		"$match": bson.M{
	// 			"$and": []bson.M{
	// 				bson.M{
	// 					// "_id": "T1HAZSw5G",
	// 					"cities": bson.M{
	// 						"$exists": true,
	// 						"$not": bson.M{
	// 							"$size": 0,
	// 						},
	// 					},
	// 				},
	// 			},
	// 		},
	// 	},
	// 	{
	// 		"$project": bson.M{
	// 			"_id":    1,
	// 			"cities": 1,
	// 		},
	// 	},
	// }

	// opts, err := trip.GetCollection().Aggregate(context.TODO(), params)
	// if err != nil {
	// 	// log.Error(err)
	// 	return nil, err
	// }
	// if err = opts.All(context.TODO(), &results); err != nil {
	// 	// log.Error(err)
	// 	return nil, err
	// }

	// log.Info("results", results)

	// type CityIdType struct {
	// 	Id        string
	// 	EntryTime int64
	// }

	// for _, v := range results {
	// 	for _, sv := range v.Cities {

	// 		log.Info(sv.Id, sv.CityId)

	// 		updateResult, err := trip.GetCollection().UpdateOne(context.TODO(),
	// 			bson.M{
	// 				"$and": []bson.M{
	// 					{
	// 						"_id":        v.Id,
	// 						"cities._id": sv.Id,
	// 					},
	// 				},
	// 			}, bson.M{
	// 				"$set": bson.M{
	// 					"cities.$.cityId": sv.Id,
	// 					"cities.$._id":    "",
	// 				},
	// 			}, options.Update().SetUpsert(false))

	// 		log.Info(updateResult, err)

	// 	}
	// 	// cities = append(cities, v.Cities)
	// }

	return nil, nil
}

// func (t *CityDbx) GetUserAllCities(authorId string) (cities *map[string]int64, err error) {
// 	trip := new(models.Trip)

// 	var results []*models.Trip

// 	params := []bson.M{
// 		{
// 			"$match": bson.M{
// 				"$and": []bson.M{
// 					{
// 						"authorId": authorId,
// 						"status": bson.M{
// 							"$in": []int64{1, 0},
// 						},
// 						"cities": bson.M{
// 							"$exists": true,
// 							"$not": bson.M{
// 								"$size": 0,
// 							},
// 						},
// 					},
// 				},
// 			},
// 		}, {
// 			"$sort": bson.M{
// 				"status":     1,
// 				"createTime": -1,
// 			},
// 		},
// 		// {
// 		// 	"$skip": pageSize * (pageNum - 1),
// 		// },
// 		// {
// 		// 	"$limit": pageSize,
// 		// },
// 		{
// 			"$project": bson.M{
// 				"_id":    1,
// 				"cities": 1,
// 			},
// 		},
// 	}

// 	opts, err := trip.GetCollection().Aggregate(context.TODO(), params)
// 	if err != nil {
// 		// log.Error(err)
// 		return nil, err
// 	}
// 	if err = opts.All(context.TODO(), &results); err != nil {
// 		// log.Error(err)
// 		return nil, err
// 	}

// 	log.Info("results", results)

// 	type CityIdType struct {
// 		CityId    string
// 		EntryTime int64
// 	}

// 	cityIds := []*CityIdType{}

// 	for _, v := range results {
// 		for _, sv := range v.Cities {

// 			cityIds = append(cityIds, &CityIdType{
// 				CityId: sv.CityId,
// 				EntryTime: nmath.Min(narrays.Map(sv.EntryTimes, func(v *models.TripCityEntryTimeItem, index int) int64 {
// 					return v.Timestamp
// 				})...),
// 			})
// 		}
// 		// cities = append(cities, v.Cities)
// 	}
// 	log.Info("cityIds", cityIds)

// 	cityIdsMap := map[string]int64{}

// 	for _, v := range cityIds {

// 		if cityIdsMap[v.CityId] == 0 || cityIdsMap[v.CityId] > v.EntryTime {
// 			cityIdsMap[v.CityId] = v.EntryTime
// 		}
// 	}
// 	log.Info("cityIdsMap", cityIdsMap)

// 	return &cityIdsMap, nil
// }
