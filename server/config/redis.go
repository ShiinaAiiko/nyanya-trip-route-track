package conf

import (
	"time"

	"github.com/cherrai/nyanyago-utils/nredis"
)

var Redisdb *nredis.NRedis

var BaseKey = "meow-whisper"

var RedisCacheKeys = map[string]*nredis.RedisCacheKeysType{
	"GetTrip": {
		Key:        "GetTrip",
		Expiration: 5 * 60 * time.Second,
	},
	"GetTripByShareKey": {
		Key:        "GetTripByShareKey",
		Expiration: 5 * 60 * time.Second,
	},
	"GetTrips": {
		Key:        "GetTrips",
		Expiration: 5 * 60 * time.Second,
	},
	"GetAllTripPositions": {
		Key:        "GetAllTripPositions",
		Expiration: 5 * 60 * time.Second,
	},
}
