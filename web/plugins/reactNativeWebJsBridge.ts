import { getShortId, NEventListener } from '@nyanyajs/utils'
import md5 from 'blueimp-md5'

export const defaultCarData = {
  speed: 65.5,
  elecPercentage: 85.0,
  fuelPercentage: 50,
  accelerateDepth: 0,
  brakeDepth: 0,
  totalMileage: 12500,
  evMileage: 3500,
  tyrePressure: {
    leftFront: 230,
    rightFront: 235,
    leftRear: 225,
    rightRear: 230,
  },
  chargeStatus: 0,
  chargePower: 0,
  externalChargingPower: 15.6, // <-- 新增字段，单位：kW.h
  timestamp: 1747454400000,
}

export type CarData = typeof defaultCarData
export const defaultStatusBarData = {
  statusBarHeight: 46.769,
  bottomPadding: 48, // 模拟车机底部的系统导航栏
  viewPaddingTop: 32,
  viewPaddingBottom: 48,
  viewInsetsTop: 0,
  viewInsetsBottom: 0,
  screenWidth: 800, // 默认给个竖屏宽度
  screenHeight: 1280, // 默认给个竖屏高度
  physicalWidth: 1200, // 物理像素（带缩放）
  physicalHeight: 1920,
  devicePixelRatio: 1.5,
  isDarkMode: true, // 自驾项目默认开启深色模式，科技感更强
  safeAreaTop: 32,
  safeAreaBottom: 46.769,
}
export type StatusBarData = typeof defaultStatusBarData
export class ReactNativeWebJSBridge extends NEventListener<{
  loaded: undefined
  location: {
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
  appConfig: {
    version: string
    buildNumber: string
    fullVersion: string
    system: string
  }
  carData: CarData
  bydLog: any
  getStatusBarData: StatusBarData
  skipVersion: string
  updateProgress: any
  updateComplete: {
    version: string
  }
  updateError: {
    error: any
  }
}> {
  rnWebView: any = undefined
  private count = 0
  private isFlutterEnv = false

  private eventListenner: {
    [k: string]: () => void
  } = {}
  private timer: NodeJS.Timeout

  private environment: 'Production' | 'Development' = 'Development'

  constructor() {
    super()

    const init = () => {
      this.rnWebView = (window as any)?.ReactNativeWebView
      this.isFlutterEnv = !!(window as any)?.isFlutterApp

      // Flutter 环境：注册全局消息处理函数
      if (this.isFlutterEnv) {
        // 接收原生返回的数据
        window.removeEventListener('message', this.onMessage)
        window.addEventListener('message', this.onMessage)
        ;(window as any).onFlutterMessage = this.handleFlutterMessage

        clearInterval(this.timer)
        this.load()
      }
    }
    // init()
    this.timer = setInterval(() => {
      init()
    }, 200)
  }
  keepScreenOn(b: boolean = true) {
    this.sendMessage('keepScreenOn', b)
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
  enableCarData(b: boolean = true) {
    this.sendMessage('enableCarData', b)
  }
  getCarData() {
    this.sendMessage('getCarData')
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
  // 这个是要求切换内置内核的主页域名，可能会传入本地静态服务的域名，
  // 也可能是云端。要持久化存储，要能记住用户上次改了哪个主页
  async switchResources(
    host: string | 'http://localhost:13218' | 'http://localhost:13219'
  ) {
    console.log('switchResources', host)

    return await this.renderAPIPromise<{
      success: boolean
      error?: string
      host?: string
    }>('switchResources', host)
  }
  // 这是下载并切换本地静态资源，前端传一个URL给flutter，flutter下载这个压缩包，
  // 然后解压得到静态资源，然后替换目前项目的静态资源，以实现热更新。
  // 这个是案例地址，以后传的都是这种。
  // 记住，这个接口目的就是实现静态资源热更新
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
  //  调用这个就立即重启App
  restartApp() {
    this.sendMessage('restartApp')
  }
  // 关闭App
  quitApp() {
    this.sendMessage('quitApp')
  }

  /**
   * 发送或更新系统通知
   */
  sendNotification(payload: {
    /** 通知唯一标识（用于更新同一条通知，不传则每次都弹全新的） */
    id?: string | null
    /** 通知标题 */
    title: string
    /** 通知内容 */
    body: string
    /** 是否常驻（true 为常驻不消失，false 或不传则为普通通知） */
    ongoing?: boolean
    /** 是否允许用户手动滑动/点击关闭（默认为 true） */
    closable?: boolean
    /** 自动关闭延迟时间（单位：毫秒，例如 3000。如果不传或为 0 则不自动关闭） */
    autoCloseTimeout?: number
    // ================= 🚀 参考 Android & iOS 补充的高级原生参数 =================
    /** * 通知渠道/分类 ID (主要针对 Android 8.0+)
     * 例如: 'download', 'alert', 'chat'。不同渠道可以有不同的原生铃声和重要程度
     */
    channelId?: string
    /** * 通知重要程度 / 优先级
     * 'min': 不对用户进行视觉干扰，没有声音
     * 'low': 状态栏有图标，但不会弹窗轰炸
     * 'default': 默认，有声音，状态栏有图标
     * 'high': 头部横幅悬浮弹出（Heads-up notification），强烈提醒
     */
    priority?: 'min' | 'low' | 'default' | 'high'
    /** * 通知提示音配置
     * 'default': 播放系统默认提示音
     * 'none': 静音
     * 'custom_sound_name': 播放打包在 App 本地的自定义音频文件名 (如 'alert.mp3')
     */
    sound?: 'default' | 'none' | string
    /** * 是否开启震动提示（默认为 true）
     */
    vibrate?: boolean
    /** * 应用图标右上角的小红点数字（数字角标 Badge）
     * 设置为 0 清除角标，不传则不改变当前角标数
     */
    badge?: number
    /** * 点击通知后的跳转行为类型
     * 'default': 仅唤醒 App 到前台，不做特殊处理
     * 'deeplink': 点击后让 App 内部跳转到指定路由或页面
     * 'none': 点击无反应（常用于 ongoing 进度条通知）
     */
    clickActionType?: 'default' | 'deeplink' | 'none'
    /** * 点击通知后跳转的页面地址
     * 当 clickActionType 为 'deeplink' 时生效，例如: '/pages/route-track/detail?id=123'
     * 同时通过flutter bridge发送消息给前端，类型为notificationClickActionUrl
     */
    clickActionUrl?: string
    /** * 附加自定义业务数据
     * 传递给原生端，方便原生端在点击通知、拉起 App 时，透传给前端或上报日志
     * 通过flutter bridge发送消息给前端，类型为notificationExtra
     */
    extra?: Record<string, any>
  }) {
    return this.renderAPIPromise<{
      success: boolean
      error?: string
      id?: string
    }>('sendNotification', payload)
  }

  /**
   * 根据 ID 手动关闭指定的通知
   */
  cancelNotification(id: string) {
    this.sendMessage('cancelNotification', id)
  }

  getThemeColor() {
    return this.renderAPIPromise<'dark' | 'light'>('getThemeColor')
  }
  getStatusBarData() {
    return this.renderAPIPromise<StatusBarData>('getStatusBarData')
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
  load() {
    this.dispatch('loaded', undefined)
    this.sendMessage('load')
  }
  renderAPIPromise<T = any>(
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
      | 'load',
    payload?: any,
    bridgeId?: string
  ) {
    const message = JSON.stringify({
      type,
      payload: payload || null,
      bridgeId,
    })
    console.log('sendMessage', message)

    // Flutter 环境：使用 XMLHttpRequest 发送消息，不触发页面导航
    if (this.isFlutterEnv) {
      fetch(
        `${
          // process.env.CLIENT_ENV === 'development'
          //   ? 'http://localhost:13218'
          //   : location?.origin
          (window as any).flutterServerHost ||
          (location?.origin.includes('localhost')
            ? location.origin
            : 'http://localhost:13219')
        }/__flutter_bridge__?message=${encodeURIComponent(message)}`
      ).catch(() => {})
      return
    }

    // React Native 环境：使用原生 postMessage
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
      if (data.type === 'location') {
        this.dispatch('location', data.payload as GeolocationPosition)
        return
      }

      if (data.type === 'appConfig') {
        this.environment = data.payload?.appConfig?.fullVersion?.includes('dev')
          ? 'Development'
          : 'Production'
      }

      if (data?.bridgeId) {
        const randKey = data.type + ':' + data?.bridgeId

        this.dispatch(randKey as any, data.payload)
        return
      }

      // this.getEventNames().forEach((en) => {
      //   if (en.includes(data.type)) {
      //     this.dispatch(en as any, data.payload)
      //   }
      // })

      this.dispatch(data.type, data.payload)
    } catch (e) {
      console.error(e)
    }
  }

  // isInReactNative() {
  //   return !!this.rnWebView || !!(window as any)?.isFlutterApp
  // }
  isInApp() {
    return !!this.rnWebView || !!(window as any)?.isFlutterApp
  }
}
