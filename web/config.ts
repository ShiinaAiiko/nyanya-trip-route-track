import { baselog } from 'nyanyajs-log'
baselog.Info('Env:', process.env.NODE_ENV, process.env.CLIENT_ENV)

// if (process.env.CLIENT_ENV === 'production') {
//   console.log = () => { }
//   console.warn = () => { }
//   console.error = () => { }
//   console.time = () => { }
//   console.timeEnd = () => { }
// }

let isDev = process.env.CLIENT_ENV === 'development'

let toolApiUrl = ''
let toolUrl = ''
let nominatimUrl = ''

if (process.env.CLIENT_ENV === 'development') {
  toolApiUrl = 'http://192.168.204.139:23201'
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
let cloudShare = {
  url: '',
}
let edgeTTS = {
  url: '',
  apiKey: '',
}

let openApp = {
  apiKey: '',
}

interface Config {
  isDev: typeof isDev
  version: typeof version
  server: typeof server
  sakisso: typeof sakisso
  sakiui: typeof sakiui
  appListUrl: typeof appListUrl
  meowApps: typeof meowApps
  toolApiUrl: typeof toolApiUrl
  nominatimUrl: typeof nominatimUrl
  toolUrl: typeof toolUrl
  cloudShare: typeof cloudShare
  edgeTTS: typeof edgeTTS
  openApp: typeof openApp
}

try {
  let configJson: Config = require('./config.temp.json')
  // let pkg = require('./package.json')
  // let configJson: Config = require('./config.test.json')
  if (configJson) {
    version = configJson.version

    baselog.Info('New version:', configJson.version)
    server = configJson.server
    sakisso = configJson.sakisso
    sakiui = configJson.sakiui
    meowApps = configJson.meowApps
    appListUrl = configJson.appListUrl
    toolApiUrl = configJson.toolApiUrl
    nominatimUrl = configJson.nominatimUrl
    toolUrl = configJson.toolUrl
    cloudShare = configJson.cloudShare
    edgeTTS = configJson.edgeTTS
    openApp = configJson.openApp
  }
} catch (error) {
  console.error(error)
}
export {
  isDev,
  version,
  sakiui,
  sakisso,
  appListUrl,
  meowApps,
  server,
  toolApiUrl,
  nominatimUrl,
  toolUrl,
  cloudShare,
  edgeTTS,
  openApp,
}
export default {
  isDev,
  version,
  sakiui,
  sakisso,
  appListUrl,
  meowApps,
  server,
  toolApiUrl,
  nominatimUrl,
  toolUrl,
  cloudShare,
  edgeTTS,
  openApp,
}
