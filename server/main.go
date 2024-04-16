package main

import (
	"context"
	"fmt"
	"os"
	"strconv"

	conf "github.com/ShiinaAiiko/nyanya-trip-route-track/server/config"
	mongodb "github.com/ShiinaAiiko/nyanya-trip-route-track/server/db/mongo"
	redisdb "github.com/ShiinaAiiko/nyanya-trip-route-track/server/db/redis"
	dbxv1 "github.com/ShiinaAiiko/nyanya-trip-route-track/server/dbx/v1"
	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/services/gin_service"

	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/nredis"
	"github.com/cherrai/nyanyago-utils/ntimer"
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

		ntimer.SetTimeout(func() {
			// 2代表精度，这种方式会有小数点后无效的0的情况
			a := 9.286157608032227
			log.Info(strconv.FormatFloat(a, 'f', 3, 64))
			// 效果同上
			log.Info(fmt.Sprintf("%.3f", a))
			log.Info(strconv.ParseFloat(fmt.Sprintf("%.3f", a), 64))
			// g可以去掉小数点后无效的0
			log.Info(fmt.Sprintf("%g", a))
			// 效果同上，可以去掉0，但是达不到保留指定位数的效果
			log.Info(strconv.FormatFloat(a, 'g', -1, 64))

		}, 1000)

		ntimer.SetTimeout(func() {
			s, err := tripDbx.GetTripStatistics("YONqRoKIt", 0)
			log.Info(s, err)

		}, 1500)

		gin_service.Init()

		return nil
	})

	conf.G.Error(func(err error) {
		log.Error(err)
	})
	conf.G.Wait()
}
