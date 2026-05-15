import { NEventListener } from '@nyanyajs/utils'
import md5 from 'blueimp-md5'

export interface CarData {
  speed: number
  elecPercentage: number
  fuelPercentage: number
  accelerateDepth: number
  brakeDepth: number
  totalMileage: number
  evMileage: number
  tyrePressure: {
    leftFront: number
    rightFront: number
    leftRear: number
    rightRear: number
  }
  timestamp: number
}
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
    system: string
  }
  carData: CarData
  bydLog: any
  getStatusBarData: StatusBarData
}> {
  rnWebView: any = undefined
  private count = 0
  private isFlutterEnv = false

  private eventListenner: {
    [k: string]: () => void
  } = {}
  constructor() {
    super()

    this.rnWebView = (window as any)?.ReactNativeWebView
    this.isFlutterEnv = !!(window as any)?.isFlutterApp

    const init = () => {
      // 接收原生返回的数据
      window.removeEventListener('message', this.onMessage)
      window.addEventListener('message', this.onMessage)

      // Flutter 环境：注册全局消息处理函数
      if (this.isFlutterEnv) {
        ;(window as any).onFlutterMessage = this.handleFlutterMessage
      }
      this.load()
    }
    init()
    setTimeout(() => {
      init()
    }, 700)
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
  getThemeColor() {
    return this.renderAPIPromise<'dark' | 'light'>('getThemeColor')
  }
  getStatusBarData() {
    return this.renderAPIPromise<StatusBarData>('getStatusBarData')
  }
  load() {
    this.sendMessage('load')
  }
  renderAPIPromise<T = any>(k: Parameters<typeof this.sendMessage>[0]) {
    return new Promise<T>((res, rej) => {
      const randKey = k + ':' + md5(new Date().getTime().toString())

      try {
        this.on(randKey as any, (val) => {
          res(val as T)
          this.removeEvent(randKey as any)
        })

        this.sendMessage(k)
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
      | 'load',
    payload?: any
  ) {
    const message = JSON.stringify({
      type,
      payload: payload || null,
    })

    // Flutter 环境：使用 XMLHttpRequest 发送消息，不触发页面导航
    if (this.isFlutterEnv) {
      fetch(
        `${
          process.env.CLIENT_ENV === 'development'
            ? 'http://localhost:13218'
            : location?.origin
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

      this.dispatch(data.type, data.payload)
    } catch (e) {
      // console.error(e)
    }
  }

  private handleFlutterMessage = (data: any) => {
    try {
      console.log('handleFlutterMessage', this.count, data.type, data.payload)
      if (!data?.type) return
      this.count++
      if (data.type === 'location') {
        this.dispatch('location', data.payload as GeolocationPosition)
        return
      }

      this.getEventNames().forEach((en) => {
        if (en.includes(data.type)) {
          this.dispatch(en as any, data.payload)
        }
      })

      this.dispatch(data.type, data.payload)
    } catch (e) {
      // console.error(e)
    }
  }

  // isInReactNative() {
  //   return !!this.rnWebView || !!(window as any)?.isFlutterApp
  // }
  isInApp() {
    return !!this.rnWebView || !!(window as any)?.isFlutterApp
  }
}
