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
	jmDbx   = dbxv1.JourneyMemoryDbx{}
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

		conf.InitFsDB()

		ntimer.SetTimeout(func() {

			cityDbx.InitCityDistricts()

			// list, _ := jmDbx.GetJMList("78L2tkleM", 1, 10)

			// for _, v := range list {
			// 	tlList, _ := jmDbx.GetJMTimelineList(v.Id, v.AuthorId, 1, 1000)

			// 	log.Info("tlList", tlList)

			// 	for _, sv := range tlList {

			// 		if len(sv.Media) == 0 {
			// 			continue
			// 		}
			// 		log.Info(len(sv.Media), sv.Media[0].Width)
			// 		if sv.Media[0].Width < 120 {
			// 			for _, ssv := range sv.Media {

			// 				for _, sssv := range imageData {

			// 					if sssv.url == ssv.Url {
			// 						ssv.Width = sssv.width
			// 						ssv.Height = sssv.height
			// 						break
			// 					}
			// 				}
			// 			}
			// 			log.Info(jmDbx.UpdateJMTimeline(v.Id, v.AuthorId, sv.Id, "", "", sv.Media, sv.TripIds))
			// 		}

			// 	}

			// }

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

			// cityIds, err := cityDbx.GetAllCitiesVisitedByUser("78L2tkleM", []string{
			// 	"jhLWxii3A", "HjFiAGJwf",
			// })

			// ids := narrays.Map(cityIds, func(v *dbxv1.UserVisitedCities, index int) string {
			// 	return v.CityId
			// })

			// conf.SAaSS.

			// cities, err := cityDbx.GetCities([]string{"w2iMpbUW1", "HlbwsC4Ny", "EpXLk0nWw"})

			// log.Info(cities, err)
			// // for k, v := range cities {
			// // 	// if k > 5 {
			// // 	// 	break
			// // 	// }
			// // 	// log.Info(k, v.Name)
			// // }

			// cities, err = cityDbx.CitiesI18n(cities)

			// // for k, v := range tempcities {
			// // 	if k > 3 {
			// // 		break
			// // 	}
			// // 	log.Info(v.Name)
			// // }

			// log.Info(len(cities), err)

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

// var imageData = []struct {
// 	width  int
// 	height int
// 	url    string
// }{
// 	{
// 		url:    "https://saass.aiiko.club/s/MID1SOBHcg",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HmPIddks1z",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IfsSREMs0h",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MOtBZ46pd4",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JwvRemv8Jz",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Myp8tgrCfm",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LyLlnOX4l6",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HpZK2uGCea",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HVY7K0pXoK",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MMtibllUFY",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Im5Bf2v68D",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HdHpHGDMXh",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JINVZ8eyDc",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HpZK2uGCea",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KAvx1QHuYb",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LVhuAb1efC",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JSTWCkfVq5",
// 		width:  1792,
// 		height: 776,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JgotybNFlD",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HwYjOt6rxD",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LJcdrRTAzL",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LW2gJpZkt5",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IPgOk7fenG",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Ln3q6atAvc",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JpleTxhclL",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/ILLBwJ8iQR",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LSIpTRFj0W",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LWQvMqKeZY",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/ISs1RxQopt",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HEylS5qrYp",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LtHuVLS8Ab",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LN4f8Wctgw",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IS6lkfvHah",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JSWMe7VTig",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Lc1e5KWFDN",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IMXfW6Uq51",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JWfteypMkd",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MSmfTAzXPA",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HnOILIBq7h",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HBbnGBXnI1",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Kob55FBEfj",
// 		width:  1280,
// 		height: 960,
// 	},
// 	{
// 		url:    "https://api.aiiko.club/public/images/upload/1/20250114/img_19fd1f07838688d21ab66d2f8cf98d9d.jpg",
// 		width:  1200,
// 		height: 547,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IJI0xYQAiX",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KBg2eKssOf",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JHZHYWqONH",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Mk8xuryG0k",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Mo55yAV72U",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IUu4wUV4um",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IWwHg88cAN",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Lr5Xyvylf6",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Iqu03TTmdo",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HpoFUxW0kv",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HL761y0EiV",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/ImuvWk6CMM",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Im2LIKacsI",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LrHq1A3vUW",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KsojCHFiBJ",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KunaceLSIK",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MxquMpNmwb",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HDhJPSen42",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JMtT1i7mLo",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JOdQuWefbk",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MxBIsjJke0",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HgZOBqpX6Y",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KuVGQLNCKw",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Jbhxxfzx0r",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MypuVoHBs0",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Ird7sULF77",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HAzeiwWaMO",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KbzkxWQSao",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IxuBk80yPW",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HudtoSqbfm",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JCsUilchfQ",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HWON1Qrazy",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LtAG35bZes",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HZV428N0R3",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MJjvYN3OFh",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JpI6HN2nwz",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MIWyQjkp6N",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LcQJYMp62d",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JR6VMJdm0d",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JeUCjpWBaq",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KmmjqsQ0cW",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LrrLsTE7xI",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Lc6ftntYCa",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Ls4S7ny2gT",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IRauF7nQGc",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MOtH7gymsb",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HKroFsFFvd",
// 		width:  1280,
// 		height: 960,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KO3MNJxPOq",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IbiK4VOTF6",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HwrKwmsbUw",
// 		width:  1280,
// 		height: 576,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MeKkcZufDB",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LQXEgdnEP4",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HlvPA7zitx",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IevBkv2WSS",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JPpEC4tyvN",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LyBgRmPw6p",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MGELcxYoeA",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LsDSd2GW3o",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Ldg6QfTV5d",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HtfcErxRb6",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HA2s2KBxtp",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MhqjnHrPtH",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Lk4e6dGUPw",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LQYliLSR11",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LlF8OrabLA",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JarZO8S547",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Lh1gQnH2EE",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IZjuNldAnr",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LBMbbiyfYA",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IPVCDnZprm",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Jl2FSUaa2z",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Jxj7xkgeaO",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HtoDwbRRoa",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HfcAt2xGJz",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IRr7PkOlsS",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/ItYwaSIWRw",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IR2lYqlJHS",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IMOG8Qr8VL",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MCMLb282hd",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IHkxpY4UPh",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MA7Nys7cGB",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KBJcHICcXy",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LiGMnN0nuI",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Jjpz8bmSXy",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Knw53Y5hlZ",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Magu3nxR41",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JhPlQzgreZ",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LZyLKLWeEU",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MotT6txOLK",
// 		width:  877,
// 		height: 1920,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IdNweFKxU7",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KPhiJE1GZZ",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/KYBhld2jHX",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JRaKBRD80k",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LmypIU43KI",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/JPiUJwwAoG",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MoxmSDV0mv",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IfRJFqHGR3",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/INyYTK20Jm",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HJ56pEv0XG",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Mhf6MXfEQD",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IVqaYNRqkG",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/LXXgu2J5nj",
// 		width:  2096,
// 		height: 776,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MhHDOGyBZj",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HEZc0F2jHo",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HaLFPeyqqu",
// 		width:  1600,
// 		height: 720,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/Ijac8DfBnG",
// 		width:  4624,
// 		height: 2080,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IGrBADGqqF",
// 		width:  4624,
// 		height: 2080,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/IfVGzXpfO8",
// 		width:  4000,
// 		height: 1824,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/MKRZGkhtlB",
// 		width:  1824,
// 		height: 4000,
// 	},
// 	{
// 		url:    "https://saass.aiiko.club/s/HkxxuCgCOp",
// 		width:  4000,
// 		height: 1824,
// 	},
// }
