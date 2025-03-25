import { baselog } from 'nyanyajs-log'
baselog.Info('Env:', process.env.CLIENT_ENV)


// if (process.env.CLIENT_ENV === 'production') {
//   console.log = () => { }
//   console.warn = () => { }
//   console.error = () => { }
//   console.time = () => { }
//   console.timeEnd = () => { }
// }

let toolApiUrl = ""
let nominatimUrl = ""


if (process.env.CLIENT_ENV === 'development') {
  toolApiUrl = "http://192.168.204.132:23201"
}

let version = ''
let server = {
  url: '',
}
let sakiui = {
  jsurl: '',
  esmjsurl: '',
}
let sakisso = {
  appId: '',
  clientUrl: '',
  serverUrl: '',
}
let meowApps = {
  jsurl: '',
  esmjsurl: '',
}
let appListUrl = ''

interface Config {
  version: typeof version
  server: typeof server
  sakisso: typeof sakisso
  sakiui: typeof sakiui
  appListUrl: typeof appListUrl
  meowApps: typeof meowApps
  toolApiUrl: typeof toolApiUrl
  nominatimUrl: typeof nominatimUrl
}

try {
  let configJson: Config = require('./config.temp.json')
  // let pkg = require('./package.json')
  // let configJson: Config = require('./config.test.json')
  if (configJson) {
    version = configJson.version

    baselog.Info("New version:", configJson.version)
    server = configJson.server
    sakisso = configJson.sakisso
    sakiui = configJson.sakiui
    meowApps = configJson.meowApps
    appListUrl = configJson.appListUrl
    toolApiUrl = configJson.toolApiUrl
    nominatimUrl = configJson.nominatimUrl
  }
} catch (error) {
  console.error(error)
}
export { version, sakiui, sakisso, appListUrl, meowApps, server, toolApiUrl, nominatimUrl }
export default { version, sakiui, sakisso, appListUrl, meowApps, server, toolApiUrl, nominatimUrl }
