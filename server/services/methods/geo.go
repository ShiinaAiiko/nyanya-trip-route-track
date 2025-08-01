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
	// log.Info(v)
	// log.Info(v.Speed != -1 && v.Speed >= 0 &&
	// 	v.Altitude != -1 && v.Altitude >= 0 &&
	// 	v.Accuracy != -1 && v.Accuracy <= 20 && v.Timestamp/1000 >= startTime && v.Timestamp/1000 <= endTime)
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

// Point 表示一个二维点
type Point [2]float64

// IsPointInMultiPolygon 判断点是否在任意一个多边形内
func IsPointInMultiPolygon(point *Point, polygons [][]*Point) bool {
	for _, poly := range polygons {
		if IsPointInPolygon(point, poly) {
			return true
		}
	}
	return false
}

// IsPointInPolygon 使用射线法判断点是否在单个多边形内
func IsPointInPolygon(point *Point, polygon []*Point) bool {
	x, y := point[0], point[1]
	inside := false

	n := len(polygon)
	if n < 3 {
		return false // 至少需要3个点才能形成多边形
	}

	for i, j := 0, n-1; i < n; j, i = i, i+1 {
		xi, yi := (polygon)[i][0], (polygon)[i][1]
		xj, yj := (polygon)[j][0], (polygon)[j][1]

		// 检查点是否在多边形的边上
		if onSegment(xi, yi, xj, yj, x, y) {
			return true
		}

		// 射线法核心判断
		intersect := (yi > y) != (yj > y) &&
			x < (xj-xi)*(y-yi)/(yj-yi)+xi
		if intersect {
			inside = !inside
		}
	}

	return inside
}

// onSegment 判断点是否在线段上
func onSegment(xi, yi, xj, yj, x, y float64) bool {
	if x <= max(xi, xj) && x >= min(xi, xj) &&
		y <= max(yi, yj) && y >= min(yi, yj) {
		area := (xj-xi)*(y-yi) - (yj-yi)*(x-xi)
		return area == 0
	}
	return false
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
