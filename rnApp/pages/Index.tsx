import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AppState,
  Button,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
// import {startBackgroundTask, stopBackgroundTask} from './plugins/background';
import KeepAwake from 'react-native-keep-awake';
import BackgroundService from 'react-native-background-actions';
import Geolocation1 from '@react-native-community/geolocation';
import Geolocation2 from 'react-native-geolocation-service';
import {
  formatTimestamp,
  hasGooglePlayServices,
  startLocation,
  stopLocation,
} from '../plugins/utils';
import {WebView, WebViewProps} from 'react-native-webview';
// import WebViewX5 from 'react-native-webview-tencentx5';
import {AsyncQueue} from '@nyanyajs/utils/dist/asyncQueue';
import EnhancedWebViewChecker from '../components/EnhancedWebViewChecker';
// import X5WebView from '../components/X5WebView';
import {ReactNativeAppJSBridge} from '../plugins/reactNativeAppJsBridge';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import {request, PERMISSIONS} from 'react-native-permissions';

// import {NativeModules} from 'react-native';

// import {requireNativeComponent} from 'react-native';
// const GeckoView: any = requireNativeComponent('GeckoView'); // 加载原生组件

async function requestPermissions() {
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  ]);
}

const backgroundOptions = {
  taskName: 'GPS Tracking',
  taskTitle: '正在后台定位',
  taskDesc: 'GPS 定位持续运行中',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#ff00ff',
  linkingURI: 'TripAiikoClub://home', // 添加这一行
};

const NWebView: React.FC<any> = props => {
  // Android 启用 WebKit，iOS 无需处理
  const webKitProps =
    Platform.OS === 'android'
      ? {
          useWebKit: true,
          androidHardwareAccelerationDisabled: false, // 启用硬件加速
        }
      : {};

  const INJECTED_JAVASCRIPT = `
  const meta = document.createElement('meta');
  meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  meta.setAttribute('name', 'viewport');
  document.getElementsByTagName('head')[0].appendChild(meta);
  true;
`;

  return (
    <WebView
      {...props}
      {...webKitProps}
      originWhitelist={['*']}
      injectedJavaScript={INJECTED_JAVASCRIPT}
      javaScriptEnabled={true}
      domStorageEnabled={true} // 启用 DOM Storage
      allowFileAccess={true} // 允许文件访问
      allowUniversalAccessFromFileURLs={true} // 解决跨域限制
    />
  );
};

const IndexPage = () => {
  // const webviewRef = useRef<any>(null);

  // const count = useRef(0);
  const watchId = useRef(-1);

  const [appState, setAppState] = useState(AppState.currentState);
  const taskRunning = useRef(false);

  // const [appConfig, setAppConfig] = useState({
  //   enableLocation: false,
  //   keepScreenOn: false,
  // });
  // const [keepScreenOn, setKeepScreenOn] = useState(false);
  // const [enableLocation, setEnableLocation] = useState(false);
  const rnappJSBridge = useRef(new ReactNativeAppJSBridge());

  const [lang, setLang] = useState('');

  useEffect(() => {
    const init = async () => {
      setLang((await AsyncStorage.getItem('setLanguage')) || 'system');
    };
    init();

    rnappJSBridge.current.on('enableLocation', b => {
      console.log('enableLocation', b);
      enableLocationChange();
    });
    rnappJSBridge.current.on('keepScreenOn', b => {
      keepScreenOnChange();
    });
    rnappJSBridge.current.on('setLanguage', async lang => {
      console.log('tUrl', lang);
      setLang(lang);
      await AsyncStorage.setItem('setLanguage', lang);
    });
    rnappJSBridge.current.on('enableBackgroundTasks', b => {
      // console.log('appState enableBackgroundTasks', b);
      if (!b) {
        backgroundTaskData.current.startTime = 0;
        backgroundTaskData.current.count = 0;
        return;
      }

      if (backgroundTaskData.current.startTime === 0) {
        backgroundTaskData.current.startTime = Math.floor(
          new Date().getTime() / 1000,
        );
        backgroundTaskData.current.count = 0;
      }
    });
  }, []);

  // useEffect(() => {
  //   console.log('handleMessage .keepScreenOn', appConfig);
  // }, [appConfig]);

  const keepScreenOnChange = () => {
    // console.log('handleMessage keepScreenOnChange .keepScreenOn', keepScreenOn);
    if (rnappJSBridge.current.isScreenKeepAwake()) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }
  };

  const qa = useRef(
    new AsyncQueue({
      maxQueueConcurrency: 1,
    }),
  );

  const backgroundTaskData = useRef({
    count: 0,
    startTime: 0,
    speed: 0,
    altitude: 0,
  });

  const enableLocationChange = async () => {
    qa.current.increase(async () => {
      if (rnappJSBridge.current.isLocationEnabled()) {
        console.log('enableLocationChange');
        await startLocation({
          onPositionChange(payload) {
            // console.log('watchId pos', payload);

            if (BackgroundService.isRunning()) {
              backgroundTaskData.current.count += 1;

              backgroundTaskData.current.speed = payload.coords.speed || 0;
              backgroundTaskData.current.altitude =
                payload.coords.altitude || 0;
            }
            rnappJSBridge.current.sendMessage('location', {
              coords: payload.coords,
              timestamp: payload.timestamp,
            });
            // webviewRef.current?.injectJavaScript(
            //   `window.dispatchEvent(new MessageEvent("message", { data:
            //   ${JSON.stringify(JSON.stringify(response))} }));`,
            // );
          },
          onError(err) {
            // console.error(err);
          },
        });
      } else {
        stopLocation();
      }
    });

    await qa.current.wait.waiting();
  };

  useEffect(() => {
    const appStateListener = AppState.addEventListener(
      'change',
      nextAppState => {
        setAppState(nextAppState);
      },
    );

    return () => {
      appStateListener.remove();
      if (taskRunning.current) {
        BackgroundService.stop();
        taskRunning.current = false;
      }
    };
  }, []);

  const bgtTimer = useRef<NodeJS.Timeout>(null);

  const backgroundTask = async () => {
    try {
      while (BackgroundService.isRunning()) {
        await enableLocationChange();

        bgtTimer.current = setInterval(() => {
          BackgroundService.updateNotification({
            ...backgroundOptions,
            taskDesc: `行程已持续${formatTimestamp(
              Math.floor(new Date().getTime() / 1000) -
                backgroundTaskData.current.startTime,
              false,
              ['h', 'm', 's'],
            )} | 已获取${backgroundTaskData.current.count}次定位 | 速度${
              Math.round(
                ((backgroundTaskData.current.speed || 0) * 3600) / 100,
              ) / 10
            }km/h | 海拔${
              Math.round((backgroundTaskData.current.altitude || 0) * 10) / 10
            }米`,
          });
        }, 1000);

        // await sleep(5000); // 每 1 秒执行一次

        await new Promise(() => {}); // 永远不结束，保持任务运行
      }
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    // console.log(
    //   'appState',
    //   appState,
    //   taskRunning.current,
    //   rnappJSBridge.current.isBackgroundTasksEnabled(),
    //   backgroundTaskData.current,
    // );
    if (appState === 'background') {
      if (
        !taskRunning.current &&
        rnappJSBridge.current.isBackgroundTasksEnabled()
      ) {
        BackgroundService.start(backgroundTask, backgroundOptions);
        taskRunning.current = true;
      }
    }

    if (appState === 'active') {
      taskRunning.current = false;
      BackgroundService.stop();

      bgtTimer.current && clearInterval(bgtTimer.current);

      keepScreenOnChange();
      enableLocationChange();
    }
  }, [appState]);

  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
    altitude: 0,
    speed: 0,
    error: '',
  });

  const tiemr = useRef(0);

  const sleep = (time: number) =>
    new Promise(resolve => setTimeout(resolve, time));

  const veryIntensiveTask = async () => {
    // let i = 0;
    // while (BackgroundService.isRunning()) {
    //   console.log(`[后台] 第 ${i++} 次`);
    //   await new Promise(r => setTimeout(r, 3000));
    // }

    try {
      while (BackgroundService.isRunning()) {
        console.log('watchId', watchId, watchId.current < 0);
        // watchId.current < 0 && requestLocationPermission();

        await sleep(10000); // 每 1 秒执行一次
      }
    } catch (error) {
      console.error(error);
    }
  };

  async function startBackgroundTask() {
    console.log('[后台服务] 已启动', !BackgroundService.isRunning());
    await BackgroundService.start(veryIntensiveTask, backgroundOptions);
  }

  async function stopBackgroundTask() {
    Geolocation1.clearWatch(watchId.current);
    Geolocation2.clearWatch(watchId.current);
    Geolocation2.stopObserving();
    // Geolocation.stopObserving();

    watchId.current = -1;
    await BackgroundService.stop();
  }

  const [useWebviewX5, setUseWebviewX5] = useState(0);

  // Android 启用 WebKit，iOS 无需处理

  const url = useMemo(() => {
    let tUrl = '';
    if (lang) {
      tUrl = 'https://trip.aiiko.club/';
      if (lang !== 'system') {
        tUrl = tUrl + lang;
      }
      console.log('tUrl', tUrl, lang);
    }
    return tUrl;
  }, [lang]);

  return (
    <View style={{flex: 1}}>
      <EnhancedWebViewChecker
        minVersion={70} // 最低要求 Chrome 70
        onPass={() => {
          console.log('WebView版本检测通过');
          // setUseWebviewX5(1);
        }}
        onFail={err => {
          console.error('WebView版本检测失败:', err);
          // setUseWebviewX5(0);
        }}>
        {/* <X5WebView url="https://trip.aiiko.club/zh-CN?debug=true" /> */}
        {url && (
          <NWebView
            ref={rnappJSBridge.current.initRNWebView}
            source={{uri: url}} // 👈 你自己改这里
            onMessage={rnappJSBridge.current.onMessage}
            mixedContentMode="always"
            allowsInlineMediaPlayback
          />
        )}
        {/* <GeckoView
          style={{flex: 1}}
          url="https://trip.aiiko.club/zh-CN?debug=true'" // 传递 URL
        /> */}
      </EnhancedWebViewChecker>
      {/* <View>
        <Text style={styles.title}>当前位置</Text>
        <View style={styles.info}>
          <Text>纬度: {location.latitude}</Text>
          <Text>经度: {location.longitude}</Text>
          <Text>
            海拔: {location.altitude ? location.altitude : '获取中...'}
          </Text>
          <Text>速度: {location.speed ? location.speed : '获取中...'}</Text>
          <Text>次数: {count.current}次</Text>
          {location.error && <Text style={styles.error}>{location.error}</Text>}
        </View>
      </View>
      <View style={{padding: 20}}>
        <Button title="请求权限" onPress={requestPermissions} />
        <Button title="启动后台定位" onPress={startBackgroundTask} />
        <Button title="停止后台定位" onPress={stopBackgroundTask} />
      </View> */}
    </View>
  );
};

export default IndexPage;
