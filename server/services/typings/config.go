package typings

type Config struct {
	Version string
	Server  Server
	SSO     Sso
	BaseUrl string
	Redis   Redis
	Saass   SAaSS
	// StaticPathDomain string
	Mongodb     Mongodb
	OpenApp     []*OpenApp
	CityVersion string
}

type Server struct {
	Port int
	Cors struct {
		AllowOrigins []string
	}
	// mode: release debug
	Mode string
}
type Sso struct {
	AppId  string
	AppKey string
	Host   string
}
type SAaSS struct {
	AppId      string
	AppKey     string
	BaseUrl    string
	ApiVersion string
}
type Redis struct {
	Addr     string
	Password string
	DB       int
}
type Mongodb struct {
	Currentdb struct {
		Name string
		Uri  string
	}
}
type OpenApp struct {
	AppName string
	AppKey  string
}
