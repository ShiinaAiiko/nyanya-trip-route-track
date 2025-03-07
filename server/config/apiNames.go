package conf

type ApiNamesVal = map[string]string

type ApiNamesType struct {
	Open ApiNamesVal
}

var ApiNames = ApiNamesType{
	Open: ApiNamesVal{
		"GetBaseTripsByOpenAPI": "/open/trip/base/list/get",
		"GetCitiesByOpenAPI":    "/open/city/list/get",
	},
}
