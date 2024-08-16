package methods

import (
	"math"
	"strings"

	"github.com/ShiinaAiiko/nyanya-trip-route-track/server/models"
	"github.com/cherrai/nyanyago-utils/nstrings"
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

func GSS(v *models.TripPosition, startTime, endTime int64) bool {
	// log.Info("gss", v.Timestamp/1000, startTime, v.Timestamp/1000, endTime)
	return v.Speed != -1 && v.Speed >= 0 &&
		v.Altitude != -1 && v.Altitude >= 0 &&
		v.Accuracy != -1 && v.Accuracy <= 20 && v.Timestamp/1000 >= startTime && v.Timestamp/1000 <= endTime
}

func GetGeoKey(mapKeys *(map[string]int), latlon string, keyIndex *int) string {
	latlons := strings.Split(latlon, ".")
	k := latlons[0] + "." + latlons[1][0:2]

	if (*mapKeys)[k] == 0 {
		*keyIndex++
		(*mapKeys)[k] = *keyIndex
	}
	return nstrings.ToString((*mapKeys)[k]) + "." + latlons[1][2:len(latlons[1])-1]
}
