import { deepCopy, getShortId, NEventListener } from '@nyanyajs/utils'
import md5 from 'blueimp-md5'
import {
  VehicleServices,
  CarData,
  SpeedData,
  StatisticData,
  InstrumentData,
  AcData,
  DoorData,
  VehicleSettingData,
  EngineData,
  PanoramaData,
  defaultCarData,
  SensorData,
  TimeData,
  EnergyModeData,
  RadarData,
  TyreData,
  AirQualityData,
  ChargeData,
  MediaData,
  BodyStatusData,
  LightData,
} from './vehicle'

export type {
  CarData,
  SpeedData,
  StatisticData,
  InstrumentData,
  AcData,
  DoorData,
  VehicleSettingData,
  EngineData,
  PanoramaData,
  SensorData,
  TimeData,
  EnergyModeData,
  RadarData,
  TyreData,
  AirQualityData,
  ChargeData,
  MediaData,
  BodyStatusData,
  LightData,
}
export { defaultCarData }

export const defaultStatusBarData = {
  statusBarHeight: 46.769,
  bottomPadding: 48,
  viewPaddingTop: 32,
  viewPaddingBottom: 48,
  viewInsetsTop: 0,
  viewInsetsBottom: 0,
  screenWidth: 800,
  screenHeight: 1280,
  physicalWidth: 1200,
  physicalHeight: 1920,
  devicePixelRatio: 1.5,
  isDarkMode: true,
  safeAreaTop: 32,
  safeAreaBottom: 46.769,
}
export type StatusBarData = typeof defaultStatusBarData

export type NotificationMessage = {
  title: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  notification: boolean
  module: string
}

export type LogMessage = {
  type: 'carLog' | 'appLog'
  message: string
}

export type ThirdPartyLoginType = 'google' | 'qq' | 'github'

export type ThirdPartyLoginResult = {
  success: boolean
  error?: string
  data?: {
    type: ThirdPartyLoginType
    idToken?: string
    accessToken?: string
    user?: {
      id: string
      name?: string
      email?: string
      avatar?: string
    }
  }
}

export type PermissionType =
  | 'location'
  | 'locationAlways'
  | 'notification'
  | 'storage'
  | 'camera'
  | 'microphone'
  | 'photos'
  | 'contacts'
  | 'calendar'
  | 'sensors'
  | 'sms'
  | 'phone'
  | 'bluetooth'
  | 'activityRecognition'
  | 'mediaLibrary'
  | 'systemAlertWindow'
  | 'bydAcCommon'
  | 'bydBodyworkCommon'
  | 'bydEngineCommon'
  | 'bydTyreCommon'
  | 'bydInstrumentCommon'
  | 'bydDoorlockCommon'
  | 'bydPanoramaCommon'
  | 'bydVehiclesetCommon'
  | 'bydSpeedGet'
  | 'bydStatisticGet'
  | 'bydTyreGet'
  | 'bydEngineGet'
  | 'bydEnergyGet'
  | 'bydChargeGet'

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'permanentlyDenied'
  | 'restricted'
  | 'limited'
  | 'provisional'

export type PermissionCheckResult = {
  [key in PermissionType]?: PermissionStatus
}

export type PermissionRequestResult = {
  success: boolean
  results: PermissionCheckResult
}

export const defalutAppConfig = {
  version: '',
  buildNumber: '',
  fullVersion: '',
  system: '',
  engine: '',
  sessionId: '',
  availableEngines: ['gecko', 'system'],
  packageName: '',
}
export type AppConfig = typeof defalutAppConfig
export interface Location {
  coords: {
    latitude: number
    longitude: number
    altitude: number | null
    accuracy: number
    altitudeAccuracy?: number | null
    heading: number | null
    speed: number | null
  }
  timestamp: number
}

export class NyaNyaWebJSBridge extends NEventListener<{
  loaded: undefined
  location: Location
  appConfig: AppConfig
  getStatusBarData: StatusBarData
  skipVersion: string
  updateProgress: any
  updateComplete: {
    version: string
  }
  updateError: {
    error: any
  }
  gpsPermissionDenied: NotificationMessage
  gpsServiceDisabled: NotificationMessage
  locationEnabled: NotificationMessage
  locationDisabled: NotificationMessage
  screenKeptOn: NotificationMessage
  screenKeptOff: NotificationMessage
  backgroundLocationEnableFailed: NotificationMessage
  backgroundServiceStartFailed: NotificationMessage
  backgroundLocationDisabled: NotificationMessage
  log: LogMessage
  appStart: any
  appResume: any
  appPause: any
  appInactive: any
  appHidden: any
  appLifecycleChange: {
    state: 'resumed' | 'inactive' | 'paused' | 'hidden' | 'detached'
  }
  thirdPartyLoginResult: ThirdPartyLoginResult
  notificationClickAction: {
    clickActionType: string
    clickActionUrl: string
  }
  speed: SpeedData
  statistic: StatisticData
  instrument: InstrumentData
  door: DoorData
  vehicleset: VehicleSettingData
  engine: EngineData
  panorama: PanoramaData
  ac: AcData
  sensor: SensorData
  time: TimeData
  energyMode: EnergyModeData
  radar: RadarData
  tyre: TyreData
  airQuality: AirQualityData
  charge: ChargeData
  media: MediaData
  bodyStatus: BodyStatusData
  light: LightData
  carData: CarData
  deepLink: {
    url: string
    queryParameters: any
  }
}> {
  rnWebView: any = undefined
  nyanyaWebView: any = undefined

  private allowNotifications: boolean = true

  private count = 0
  private isFlutterEnv = false

  private eventListenner: {
    [k: string]: () => void
  } = {}
  private timer: NodeJS.Timeout

  private sessionId = ''
  private appConfig: AppConfig = deepCopy(defalutAppConfig)

  private environment: 'Production' | 'Development' = 'Development'

  public vehicle: VehicleServices

  constructor({ allowNotifications = true }: { allowNotifications?: boolean }) {
    super()

    this.allowNotifications = allowNotifications
    this.vehicle = new VehicleServices(this)

    const init = () => {
      this.rnWebView = (window as any)?.ReactNativeWebView
      this.nyanyaWebView = (window as any)?.nyanyaWebView
      this.isFlutterEnv = !!(window as any)?.isFlutterApp
      this.sessionId = (window as any)?.nyanyaSessionId || ''

      if (this.isFlutterEnv) {
        window.removeEventListener('message', this.onMessage)
        window.addEventListener('message', this.onMessage)
        ;(window as any).onFlutterMessage = this.handleFlutterMessage

        clearInterval(this.timer)
        this.load()
        this.test()
      }
    }
    this.timer = setInterval(() => {
      init()
    }, 200)
  }
  async keepScreenOn(b: boolean = true) {
    this.sendMessage('keepScreenOn', b)
  }
  getCurrentLocation() {
    return this.sendMessageAwait<Location>('getCurrentLocation')
  }
  enableLocation(b: boolean = true) {
    this.sendMessage('enableLocation', b)
  }
  enableBackgroundLocation(b: boolean = true) {
    this.sendMessage('enableBackgroundLocation', b)
  }
  setLanguage(lang: string) {
    this.sendMessage('setLanguage', lang)
  }
  enableBackgroundTasks(b: boolean = true) {
    this.sendMessage('enableBackgroundTasks', b)
  }
  closeLoading() {
    this.sendMessage('closeLoading')
  }
  setStatusBar(
    type:
      | 'system'
      | 'light'
      | 'dark'
      | 'transparent'
      | 'transparent-light'
      | 'transparent-dark'
      | 'hide'
  ) {
    this.sendMessage('setStatusBar', type)
  }
  async switchResources(
    host: string | 'http://localhost:13218' | 'http://localhost:13219'
  ) {
    console.log('switchResources', host)

    return await this.sendMessageAwait<{
      success: boolean
      error?: string
      host?: string
    }>('switchResources', host)
  }
  async switchEngine(type: 'gecko' | 'system') {
    return await this.sendMessageAwait<{
      success: boolean
      engine?: 'gecko' | 'system'
      message?: string
      error?: string
    }>('switchEngine', type)
  }
  updateLocalWebResources(downloadUrl: string) {
    return new Promise<{
      success: boolean
      error?: string
    }>((res, rej) => {
      const k = 'updateLocalWebResources'

      const bridgeId = getShortId(12)
      const updateLocalWebResourcesCompleted =
        'updateLocalWebResourcesCompleted' + ':' + bridgeId

      try {
        this.on(updateLocalWebResourcesCompleted as any, (val) => {
          res(val)
          this.removeEvent(updateLocalWebResourcesCompleted as any)
        })

        this.sendMessage(k, downloadUrl, bridgeId)
      } catch (error) {
        console.error(error)
        this.removeEvent(updateLocalWebResourcesCompleted as any)
        rej()
      }
    })
  }
  restartApp() {
    this.sendMessage('restartApp')
  }
  quitApp() {
    this.sendMessage('quitApp')
  }
  openAppSettings(permissionType?: PermissionType) {
    this.sendMessage('openAppSettings', permissionType)
  }
  thirdPartyLogin(type: ThirdPartyLoginType) {
    return this.sendMessageAwait<ThirdPartyLoginResult>('thirdPartyLogin', type)
  }

  checkPermissions(permissions: PermissionType[]) {
    return this.sendMessageAwait<PermissionCheckResult>(
      'checkPermissions',
      permissions
    )
  }

  requestPermissions(permissions: PermissionType[]) {
    return this.sendMessageAwait<PermissionRequestResult>(
      'requestPermissions',
      permissions
    )
  }

  get appStorage() {
    const hostname = window.location.hostname

    const sendStorageMessage = async (
      operation: 'set' | 'get' | 'delete',
      key: string,
      value?: any,
      expiresIn?: number
    ) => {
      const payload: any = { operation, key, hostname }
      if (operation === 'set') {
        payload.value = value
        if (expiresIn !== undefined) {
          payload.expiresIn = expiresIn
        }
      }
      return this.sendMessageAwait<{
        success: boolean
        error?: string
        operation?: string
        key?: string
        value?: any
        expired?: boolean
      }>('appStorage', payload)
    }

    return {
      set: async (key: string, value: any, expiresIn?: number) => {
        return sendStorageMessage('set', key, value, expiresIn)
      },
      get: async (key: string) => {
        return sendStorageMessage('get', key)
      },
      delete: async (key: string) => {
        return sendStorageMessage('delete', key)
      },
    }
  }

  sendNotification(payload: {
    id?: string | null
    title: string
    body: string
    ongoing?: boolean
    closable?: boolean
    autoCloseTimeout?: number
    channelId?: string
    priority?: 'min' | 'low' | 'default' | 'high'
    sound?: 'default' | 'none' | string
    vibrate?: boolean
    badge?: number
    clickActionType?: 'default' | 'deeplink' | 'none'
    clickActionUrl?: string
    extra?: Record<string, any>
  }) {
    return this.sendMessageAwait<{
      success: boolean
      error?: string
      id?: string
    }>('sendNotification', payload)
  }

  cancelNotification(id: string) {
    this.sendMessage('cancelNotification', id)
  }

  getThemeColor() {
    return this.sendMessageAwait<'dark' | 'light'>('getThemeColor')
  }
  getStatusBarData() {
    return this.sendMessageAwait<StatusBarData>('getStatusBarData')
  }
  checkNewVersion({
    showCheckingNotification = true,
  }: {
    showCheckingNotification: boolean
  }) {
    this.sendMessage('checkNewVersion', {
      showCheckingNotification,
    })
  }

  openInBrowser(url: string) {
    return this.sendMessageAwait<{
      success: boolean
      error: string
    }>('openInBrowser', url)
  }
  load() {
    this.dispatch('loaded', undefined)
    this.sendMessage('load')
  }
  sendMessageAwait<T = any>(
    k: Parameters<typeof this.sendMessage>[0],
    payload?: any
  ) {
    return new Promise<T>((res, rej) => {
      const bridgeId = getShortId(12)
      const randKey = k + ':' + bridgeId

      try {
        this.on(randKey as any, (val) => {
          res(val as T)
          this.removeEvent(randKey as any)
        })

        this.sendMessage(k, payload, bridgeId)
      } catch (error) {
        console.error(error)
        this.removeEvent(randKey as any)
        rej()
      }
    })
  }

  sendMessage(
    type:
      | 'setLanguage'
      | 'keepScreenOn'
      | 'enableLocation'
      | 'enableBackgroundLocation'
      | 'enableBackgroundTasks'
      | 'enableCarData'
      | 'getCarData'
      | 'closeLoading'
      | 'setStatusBar'
      | 'getThemeColor'
      | 'getStatusBarData'
      | 'checkNewVersion'
      | 'switchResources'
      | 'updateLocalWebResources'
      | 'restartApp'
      | 'quitApp'
      | 'sendNotification'
      | 'cancelNotification'
      | 'openAppSettings'
      | 'switchEngine'
      | 'load'
      | 'thirdPartyLogin'
      | 'appStorage'
      | 'getCurrentLocation'
      | 'checkPermissions'
      | 'requestPermissions'
      | 'get'
      | 'enableListener'
      | 'set'
      | 'openInBrowser'
      | 'openInBrowser'
      | 'hasFeature',
    payload?: any,
    bridgeId?: string
  ) {
    const message = JSON.stringify({
      type,
      payload: payload,
      bridgeId,
      sessionId: this.sessionId,
    })
    console.log('sendMessage', message)

    if (this.isFlutterEnv) {
      this.nyanyaWebView?.postMessage(message)
      return
    }

    this.rnWebView?.postMessage(message)
  }

  private onMessage = (event: MessageEvent<any>) => {
    try {
      const data = JSON.parse(event?.data || '{}') || {}
      if (!data?.type) return
      this.count++
      console.log('onMessage', this.count, data)
      if (data.type === 'location') {
        this.dispatch('location', data.payload as GeolocationPosition)
        return
      }

      if (data?.bridgeId) {
        const randKey = data.type + ':' + data?.bridgeId

        this.dispatch(randKey as any, data.payload)
        return
      }

      this.dispatch(data.type, data.payload)
    } catch (e) {
      // console.error(e)
    }
  }

  private handleFlutterMessage = (dataAny: any) => {
    try {
      let data = dataAny
      console.log('handleFlutterMessage', this.count, dataAny)
      if (typeof dataAny === 'string') {
        data = JSON.parse(dataAny || '{}') || {}
      }
      if (!data?.type) return
      this.count++

      if (
        this.allowNotifications &&
        data?.payload?.notification &&
        data?.payload?.title
      ) {
        const title = data?.payload?.title || ''
        const message = data?.payload?.message || ''
        const module = data?.payload?.module || ''
        const type = data?.payload?.type || ''
        const id = md5(`${title}${message}${module}${type}`)
        this?.sendNotification({
          id,
          title,
          body: message,
          autoCloseTimeout: 4000,
          closable: true,
        })
      }

      if (data.type === 'location') {
        this.dispatch('location', data.payload as GeolocationPosition)
        return
      }

      if (data.type === 'appConfig' && data.payload?.appConfig) {
        this.environment = data.payload?.appConfig?.fullVersion?.includes('dev')
          ? 'Development'
          : 'Production'

        this.appConfig = data.payload?.appConfig
      }

      if (data?.bridgeId) {
        const randKey = data.type + ':' + data?.bridgeId

        this.dispatch(randKey as any, data.payload)
        return
      }

      this.dispatch(data.type, data.payload)
    } catch (e) {
      console.error(e)
    }
  }

  isInApp() {
    return !!this.rnWebView || !!(window as any)?.isFlutterApp
  }
  test() {
    setTimeout(() => {
      // nyanyaJSBridge
      //   .sendNotification({
      //     title: '测试标题',
      //     body: '测试body',
      //     ongoing: true,
      //     clickActionType: 'deeplink',
      //     clickActionUrl: '/trip/detail?id=xxxxx',
      //     vibrate: true,
      //     sound: 'defalut',
      //     closable: true,
      //   })
      //   .then((res) => {})
      // nyanyaJSBridge.on('notificationClickAction', (val) => {
      //   snackbar({
      //     message: val.clickActionUrl,
      //     autoHideDuration: 4000,
      //     vertical: 'top',
      //     horizontal: 'center',
      //   }).open()
      // })
      //   nyanyaJSBridge.checkPermissions(['location']).then((res) => {
      //     snackbar({
      //       message: 'location=>' + res?.location || '',
      //       autoHideDuration: 4000,
      //       vertical: 'top',
      //       horizontal: 'center',
      //     }).open()
      //   })
      //   nyanyaJSBridge.checkPermissions(['locationAlways']).then((res) => {
      //     snackbar({
      //       message: 'locationAlways=>' + res?.locationAlways || '',
      //       autoHideDuration: 4000,
      //       vertical: 'top',
      //       horizontal: 'center',
      //     }).open()
      //   })
      //   nyanyaJSBridge.checkPermissions(['camera']).then((res) => {
      //     snackbar({
      //       message: 'camera=>' + res?.camera || '',
      //       autoHideDuration: 4000,
      //       vertical: 'top',
      //       horizontal: 'center',
      //     }).open()
      //   })
      //   nyanyaJSBridge
      //     .requestPermissions(['locationAlways'])
      //     .then((res) => {
      //       console.log('requestPermissions', res)
      //     })
    }, 10000)
  }
}
