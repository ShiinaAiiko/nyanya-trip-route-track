package methods

import (
	"math"

	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
)

// Return unit is meters
func GetGeoDistance(
	lat1 float64, lng1 float64,
	lat2 float64, lng2 float64) float64 {
	const PI float64 = 3.141592653589793
	radlat1 := PI * lat1 / 180
	radlat2 := PI * lat2 / 180

	theta := lng1 - lng2
	radtheta := PI * theta / 180

	dist := math.Sin(radlat1)*math.Sin(radlat2) + math.Cos(radlat1)*math.Cos(radlat2)*math.Cos(radtheta)

	if dist > 1 {
		dist = 1
	}

	dist = math.Acos(dist)
	dist = dist * 180 / PI
	dist = dist * 60 * 1.1515
	dist = dist * 1.609344
	return dist * 1000
}

func GSS(v *models.TripPosition, createTime, endTime int64) bool {
	return v.Speed != -1 && v.Speed >= 0 &&
		v.Altitude != -1 && v.Altitude >= 0 &&
		v.Accuracy != -1 && v.Accuracy <= 20 && v.Timestamp/1000 >= createTime && v.Timestamp/1000 <= endTime
}
