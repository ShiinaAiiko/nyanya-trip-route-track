package main

import (
	"context"
	"os"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	mongodb "github.com/ShiinaAiiko/nyanya-trip-route-track/server/db/mongo"
	redisdb "github.com/ShiinaAiiko/nyanya-trip-route-track/server/db/redis"
	dbxv1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/dbx/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/gin_service"

	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/nredis"
	sso "github.com/cherrai/saki-sso-go"

	// sfu "github.com/pion/ion-sfu/pkg/sfu"

	"github.com/go-redis/redis/v8"
)

var (
	log     = nlog.New()
	tripDbx = dbxv1.TripDbx{}
)

// 文件到期后根据时间进行删除 未做
func main() {
	nlog.SetPrefixTemplate("[{{Timer}}] [{{Type}}] [{{Date}}] [{{File}}]@{{Name}}")
	nlog.SetName("SAaSS")

	conf.G.Go(func() error {
		configPath := ""
		for k, v := range os.Args {
			switch v {
			case "--config":
				if os.Args[k+1] != "" {
					configPath = os.Args[k+1]
				}

			}
		}
		if configPath == "" {
			log.Error("Config file does not exist.")
			return nil
		}
		conf.GetConfig(configPath)

		// Connect to redis.
		redisdb.ConnectRedis(&redis.Options{
			Addr:     conf.Config.Redis.Addr,
			Password: conf.Config.Redis.Password, // no password set
			DB:       conf.Config.Redis.DB,       // use default DB
		})
		conf.Redisdb = nredis.New(context.Background(), &redis.Options{
			Addr:     conf.Config.Redis.Addr,
			Password: conf.Config.Redis.Password, // no password set
			DB:       conf.Config.Redis.DB,       // use default DB
		}, conf.BaseKey, log)
		conf.Redisdb.CreateKeys(conf.RedisCacheKeys)

		conf.SSO = sso.New(&sso.SakiSsoOptions{
			AppId:  conf.Config.SSO.AppId,
			AppKey: conf.Config.SSO.AppKey,
			Host:   conf.Config.SSO.Host,
			Rdb:    conf.Redisdb,
		})
		mongodb.ConnectMongoDB(conf.Config.Mongodb.Currentdb.Uri, conf.Config.Mongodb.Currentdb.Name)

		// ntimer.SetTimeout(func() {
		// 	// 2代表精度，这种方式会有小数点后无效的0的情况
		// 	a := 9.286157608032227
		// 	log.Info(strconv.FormatFloat(a, 'f', 3, 64))
		// 	// 效果同上
		// 	log.Info(fmt.Sprintf("%.3f", a))
		// 	log.Info(strconv.ParseFloat(fmt.Sprintf("%.3f", a), 64))
		// 	// g可以去掉小数点后无效的0
		// 	log.Info(fmt.Sprintf("%g", a))
		// 	// 效果同上，可以去掉0，但是达不到保留指定位数的效果
		// 	log.Info(strconv.FormatFloat(a, 'g', -1, 64))

		// }, 1000)

		// ntimer.SetTimeout(func() {
		// 	// folder := "./data"
		// 	// files, _ := ioutil.ReadDir(folder)
		// 	// for _, file := range files {
		// 	// 	if !file.IsDir() {
		// 	// 		jsonFile, _ := os.Open(folder + "/" + file.Name())
		// 	// 		defer jsonFile.Close()
		// 	// 		decoder := json.NewDecoder(jsonFile)

		// 	// 		mt := new(models.Trip)
		// 	// 		//Decode从输入流读取下一个json编码值并保存在v指向的值里
		// 	// 		err := decoder.Decode(&mt)
		// 	// 		if err != nil {
		// 	// 			fmt.Println("Error:", err)
		// 	// 		}
		// 	// 		log.Info("mt", folder+"/"+file.Name(), mt.Id, len(mt.Positions))
		// 	// 		addTrip, err := tripDbx.AddTrip(mt)
		// 	// 		log.Info("	addTrip, err ", addTrip, err)
		// 	// 	}
		// 	// }

		// 	// AszmV32Jc
		// 	// ajSVMD0R5
		// 	// FJO6cjMBV

		// 	trips, err := tripDbx.GetTrips("78L2tkleM", "Drive", 1, 20, 1715089938, 1715489938)

		// 	log.Info(len(trips), err)
		// 	for _, v := range trips {
		// 		tripPositions, err := tripDbx.GetTripPositions(v.Id, "", "")
		// 		log.Info(len(tripPositions.Positions), err)

		// 		// for _, v := range trip.Positions {

		// 		// 	// log.Info("gss", methods.GSS(v, trip.StartTime, trip.EndTime))
		// 		// }

		// 		vPositions, existsTimestamp := tripDbx.FilterPositions(tripPositions.Positions, tripPositions.StartTime, tripPositions.EndTime)
		// 		log.Info("vPositions", len(vPositions), len(existsTimestamp))
		// 		if len(existsTimestamp) != len(tripPositions.Positions) && len(tripPositions.Positions) > 15000 {

		// 			// tripDbx.PermanentlyDeleteTrip(v.Id)
		// 			newTrip := &models.Trip{
		// 				Type:      v.Type,
		// 				Positions: vPositions,

		// 				Marks: v.Marks,
		// 				// Statistics: ts,
		// 				AuthorId:   v.AuthorId,
		// 				Status:     0,
		// 				CreateTime: v.CreateTime,
		// 				StartTime:  v.StartTime,
		// 				EndTime:    v.EndTime,
		// 			}
		// 			jsonStr, _ := json.Marshal(newTrip)
		// 			log.Info(len(jsonStr))
		// 			log.Info("更新数据，超长数据", len(vPositions), len(tripPositions.Positions))

		// 			err := os.WriteFile("./data/"+v.Id+".json", jsonStr, 0666)

		// 			log.Info("writeFile", err)
		// 			// ts, _, _ := tripDbx.GetTripStatistics(v.Id, v.EndTime, false)
		// 			// addTrip, err := tripDbx.AddTrip(&models.Trip{
		// 			// 	Type:      v.Type,
		// 			// 	Positions: vPositions,

		// 			// 	Marks: v.Marks,
		// 			// 	// Statistics: ts,
		// 			// 	AuthorId:   v.AuthorId,
		// 			// 	Status:     0,
		// 			// 	CreateTime: v.CreateTime,
		// 			// 	StartTime:  v.StartTime,
		// 			// 	EndTime:    v.EndTime,
		// 			// })

		// 			// log.Info("addTrip, err", addTrip, err)
		// 			// if err = tripDbx.CheckPositions(tripPositions); err != nil {

		// 			// 	log.Info("更新数据err", err)
		// 			// 	return
		// 			// }
		// 		}
		// 		log.Info("结束")
		// 	}

		// 	// s, err := tripDbx.GetTripStatistics("YONqRoKIt", 0)
		// 	// log.Info(s, err)

		// }, 1500)

		gin_service.Init()

		return nil
	})

	conf.G.Error(func(err error) {
		log.Error(err)
	})
	conf.G.Wait()
}
