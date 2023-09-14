import { baselog } from 'nyanyajs-log'
baselog.Info('Env:', process.env.CLIENT_ENV)
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
}

try {
	let configJson: Config = require('./config.temp.json')
	let pkg = require('./package.json')
	// let configJson: Config = require('./config.test.json')
	if (configJson) {
		version = pkg.version
		server = configJson.server
		sakisso = configJson.sakisso
		sakiui = configJson.sakiui
		meowApps = configJson.meowApps
		appListUrl = configJson.appListUrl
	}
} catch (error) {
	console.error(error)
}
export { version, sakiui, sakisso, appListUrl, meowApps, server }
export default { version, sakiui, sakisso, appListUrl, meowApps, server }
