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
	"github.com/cherrai/nyanyago-utils/ntimer"
	"github.com/cherrai/nyanyago-utils/saass"
	sso "github.com/cherrai/saki-sso-go"

	// sfu "github.com/pion/ion-sfu/pkg/sfu"

	"github.com/go-redis/redis/v8"
)

var (
	log     = nlog.New()
	tripDbx = dbxv1.TripDbx{}
	cityDbx = dbxv1.CityDbx{}
)

// 文件到期后根据时间进行删除 未做
func main() {
	nlog.SetPrefixTemplate("[{{Timer}}] [{{Type}}] [{{Date}}] [{{File}}]@{{Name}}")
	nlog.SetName("TRIP")

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
		log.Info(conf.Config.Redis.Addr)
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

		conf.SAaSS = saass.New(&saass.Options{
			AppId:      conf.Config.Saass.AppId,
			AppKey:     conf.Config.Saass.AppKey,
			BaseUrl:    conf.Config.Saass.BaseUrl,
			ApiVersion: conf.Config.Saass.ApiVersion,
		})

		ntimer.SetTimeout(func() {
			// cityDbx.InitAddCityesForTrip()

			// methods.TestGenerateRouteImage()

			// methods.GetCityBoundaries(conf.Config.CityVersion)
			// tripDbx.TempDownloadTripPositionsToLocal(1, 5)
			// tripDbx.TempRemoveTripPositions(1, 5)
			// tripDbx.TempUpdateTripPositions(1, 3)
			// MMxpBaSrt

			// log.Info(cityDbx.AddAndGetFullCity("中国·贵州省·毕节市·黔西市·花溪彝族苗族乡"))

			// log.Info(cityDbx.AddAndGetFullCity("北碚区·澄江镇"))
			// log.Info(cityDbx.AddAndGetFullCity("中国·重庆市·北碚区·澄江镇"))
			// log.Info(cityDbx.InitTripPositionCity("fnh3rVBYC"))
			// log.Info(cityDbx.NGetAllCitiesVisitedByUser("78L2tkleM"))

			// log.Info(narrays.StructDeduplication(
			// 	[]string{"Mt0nsFQ8F", "SLmSOPHKt", "NGrfTTGCT", "UjbD6RNF7", "Mt0nsFQ8F", "SLmSOPHKt", "NGrfTTGCT", "UjbD6RNF7"},
			// 	func(a string, b string) bool {
			// 		return a == b
			// 	}))

			// result, err := cityDbx.GetCities([]string{"Mt0nsFQ8F", "SLmSOPHKt", "NGrfTTGCT", "UjbD6RNF7", "Mt0nsFQ8F", "SLmSOPHKt", "NGrfTTGCT", "UjbD6RNF7"}, []string{})
			// log.Error(result, err)
			// for _, v := range result {
			// 	log.Info(v.Name.ZhCN)
			// }

			// cityDbx.InitCityes()
			// cityDbx.SetSubCityLevel("vKimRCBTU", 4)
			// type AAA struct {
			// 	A string `bson:"a" json:"a,omitempty"`
			// }

			// key := conf.Redisdb.GetKey("Test")

			// val1 := &AAA{
			// 	A: "aaaaaaaaaaa",
			// }
			// val2 := &AAA{
			// 	A: "bbbbbbbbbbbbbb",
			// }

			// err := conf.Redisdb.MSetStruct(map[string]any{
			// 	"val3": val1,
			// 	"val4": val2,
			// }, key.GetExpiration())

			// log.Info(err, val1)

			// ntimer.SetTimeout(func() {
			// 	cmds, err := conf.Redisdb.MGet([]string{"val3", "val4"})
			// 	log.Info("val4", err)

			// 	log.Info("val4", cmds)
			// }, 500)

			log.Info("Done.")
		}, 1500)
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
		log.FullCallChain(err.Error(), "Error")
	})
	conf.G.Wait()
}
