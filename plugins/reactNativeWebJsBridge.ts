import { NEventListener } from '@nyanyajs/utils'

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
}> {
  rnWebView: any = undefined
  private count = 0
  constructor() {
    super()

    this.rnWebView = (window as any)?.ReactNativeWebView

    setTimeout(() => {
      this.load()
      // 接收原生返回的数据
      window.removeEventListener('message', this.onMessage)
      window.addEventListener('message', this.onMessage)
    }, 700)
  }
  keepScreenOn(b: boolean = true) {
    this.sendMessage('keepScreenOn', b)
  }
  enableLocation(b: boolean = true) {
    this.sendMessage('enableLocation', b)
  }
  setLanguage(lang: string) {
    this.sendMessage('setLanguage', lang)
  }
  enableBackgroundTasks(b: boolean = true) {
    this.sendMessage('enableBackgroundTasks', b)
  }
  load() {
    this.sendMessage('load', undefined)
  }

  sendMessage(
    type:
      | 'setLanguage'
      | 'keepScreenOn'
      | 'enableLocation'
      | 'enableBackgroundTasks'
      | 'load',
    payload: any
  ) {
    this.rnWebView?.postMessage(
      JSON.stringify({
        type,
        payload,
      })
    )
  }

  private onMessage = (event: MessageEvent<any>) => {
    try {
      const data = JSON.parse(event?.data || '{}') || {}
      if (!data?.type) return
      this.count++
      console.log('onMessage', this.count, data)
      if (data.type === 'location') {
        this.dispatch('location', data.payload)
        return
      }

      this.dispatch(data.type, data.payload)
    } catch (e) {
      // console.error(e)
    }
  }
  isInReactNative() {
    return !!this.rnWebView
  }
}
