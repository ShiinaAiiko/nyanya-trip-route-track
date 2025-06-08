import WebView from 'react-native-webview';

import {NEventListener} from '@nyanyajs/utils/dist/common/neventListener';
import DeviceInfo from 'react-native-device-info';

interface SendMessageParams {
  location: {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number;
      altitudeAccuracy?: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  };
  appConfig: {
    version: string;
    system: string;
  };
}

export class ReactNativeAppJSBridge extends NEventListener<{
  enableLocation: boolean;
  keepScreenOn: boolean;
  enableBackgroundTasks: boolean;
  load: any;
  setLanguage: string;
}> {
  rnWebView?: WebView<any>;
  appConfig = {
    enableLocation: false,
    keepScreenOn: false,
    enableBackgroundTasks: false,
  };
  constructor() {
    super();

    // this.rnWebView = (window as any)?.ReactNativeWebView;

    // setTimeout(() => {
    //   // 接收原生返回的数据
    //   window.removeEventListener('message', this.onMessage.bind(this));
    //   window.addEventListener('message', this.onMessage.bind(this));
    // }, 700);

    this.on('load', () => {
      this.sendMessage('appConfig', {
        version: DeviceInfo.getVersion(),
        system: DeviceInfo.getSystemName(),
      });
    });
  }
  initRNWebView = (el: WebView<any>) => {
    // if (el) {
    this.rnWebView = el;
    // }
    // console.log('initRNWebView', el, this.rnWebView);
  };
  isScreenKeepAwake() {
    return this.appConfig.keepScreenOn;
  }
  isLocationEnabled() {
    return this.appConfig.enableLocation;
  }

  isBackgroundTasksEnabled() {
    return this.appConfig.enableBackgroundTasks;
  }

  sendMessage<E extends keyof SendMessageParams>(
    type: E,
    payload: SendMessageParams[E],
  ) {
    console.log('initRNWebView', this.rnWebView, type, payload);
    this.rnWebView?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent("message", { data:
      ${JSON.stringify(
        JSON.stringify({
          type,
          payload,
        }),
      )} }));`,
    );
  }
  onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      const {type, payload} = msg;

      console.log('onMessage', msg, !!payload);

      // };
      if (type === 'enableLocation') {
        this.appConfig.enableLocation = !!payload;
        this.dispatch('enableLocation', !!payload);
        return;
      }
      if (type === 'keepScreenOn') {
        this.appConfig.keepScreenOn = !!payload;
        this.dispatch('keepScreenOn', !!payload);
        return;
      }
      if (type === 'enableBackgroundTasks') {
        this.appConfig.enableBackgroundTasks = !!payload;
        this.dispatch('enableBackgroundTasks', !!payload);
        return;
      }
      this.dispatch(type, payload);
    } catch (err) {
      console.error('handleMessage error:', err);
    }
  };
  // onMessage(event: any) {
  //   try {
  //     const msg = JSON.parse(event.nativeEvent.data);
  //     const {type, payload} = msg;

  //     console.log('onMessage', msg, !!payload);

  //     // };
  //     if (type === 'enableLocation') {
  //       this.appConfig = this.dispatch('enableLocation', !!payload);
  //     }
  //     if (type === 'keepScreenOn') {
  //       this.dispatch('keepScreenOn', !!payload);
  //     }
  //   } catch (err) {
  //     console.error('handleMessage error:', err);
  //   }
  // }
  // private onMessage(event: MessageEvent<any>) {
  //   try {
  //     const data = JSON.parse(event.data);
  //     if (data.type === 'location') {
  //       console.log('原生返回定位11', data.payload);
  //       this.dispatch('location', data.payload);
  //     }
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }
  // isInReactNative() {
  //   return !!this.rnWebView;
  // }
}
