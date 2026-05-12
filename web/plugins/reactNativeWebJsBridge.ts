import { NEventListener } from '@nyanyajs/utils'

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
}> {
  rnWebView: any = undefined
  private count = 0
  private isFlutterEnv = false
  constructor() {
    super()

    this.rnWebView = (window as any)?.ReactNativeWebView
    this.isFlutterEnv = !!(window as any)?.isFlutterApp

    setTimeout(() => {
      // 接收原生返回的数据
      window.removeEventListener('message', this.onMessage)
      window.addEventListener('message', this.onMessage)

      // Flutter 环境：注册全局消息处理函数
      if (this.isFlutterEnv) {
        ;(window as any).onFlutterMessage = this.handleFlutterMessage
      }
      this.load()
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
    this.sendMessage('getCarData', null)
  }
  load() {
    this.sendMessage('load', null)
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
      | 'load',
    payload: any
  ) {
    const message = JSON.stringify({
      type,
      payload,
    })

    // Flutter 环境：使用 XMLHttpRequest 发送消息，不触发页面导航
    if (this.isFlutterEnv) {
      const encodedMessage = encodeURIComponent(message)
      const xhr = new XMLHttpRequest()
      xhr.open(
        'GET',
        `http://localhost:8080/__flutter_bridge__?message=${encodedMessage}`,
        true
      )
      xhr.send()
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

      this.dispatch(data.type, data.payload)
    } catch (e) {
      // console.error(e)
    }
  }

  isInReactNative() {
    return !!this.rnWebView || !!(window as any)?.isFlutterApp
  }
}
