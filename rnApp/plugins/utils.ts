import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Button,
  Linking,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import Geolocation1 from '@react-native-community/geolocation';
import Geolocation2 from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';

export const hasGooglePlayServices = async () => {
  if (Platform.OS !== 'android') return true; // iOS 默认返回 true
  return DeviceInfo.hasGms();
};

let watchId: number = -1;

export const stopLocation = async () => {
  const hms = await hasGooglePlayServices();
  if (!hms) {
    Geolocation1.clearWatch(watchId);
    return;
  }
  Geolocation2.clearWatch(watchId);
  Geolocation2.stopObserving();
};

export const startLocation = async ({
  onPositionChange,
  onError,
}: {
  onPositionChange: (payload: {
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
  }) => void;
  onError: (err: string) => void;
}) => {
  try {
    stopLocation();
    const hms = await hasGooglePlayServices();
    console.log('hasGooglePlayServices', hms);
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '位置权限请求',
        message: '我们需要访问您的位置信息',
        buttonNeutral: '稍后询问',
        buttonNegative: '取消',
        buttonPositive: '确定',
      },
    );

    if (permission === 'granted') {
      // 跳转到小米自启动管理页
      // NativeModules.IntentAndroid.startActivity({
      //   action: 'miui.intent.action.OP_AUTO_START',
      //   packageName: 'com.miui.securitycenter',
      // });
      console.log('requestLocationPermission');
      // const granted = await Geolocation.requestAuthorization('always');
      // console.log('granted', granted);

      // if (granted === 'granted' || granted === 'restricted') {
      console.log('watchId 定位权限已授权', watchId);

      // 停止监听

      if (!hms) {
        watchId = Geolocation1.watchPosition(
          pos => {
            // console.log('watchId pos', pos);
            // setCount(count + 1);
            // setLocation({
            //   latitude: pos.coords.latitude,
            //   longitude: pos.coords.longitude,
            //   altitude: pos.coords.altitude || 0,
            //   speed: pos.coords.speed || 0,
            //   error: '',
            // });

            // const response = {
            //   type: 'gps',
            //   payload: {
            //     coords: pos.coords,
            //     timestamp: pos.timestamp,
            //   },
            // };
            onPositionChange({
              coords: pos.coords,
              timestamp: pos.timestamp,
            });
            // webviewRef.current?.injectJavaScript(
            //   `window.dispatchEvent(new MessageEvent("message", { data:
            //   ${JSON.stringify(JSON.stringify(response))} }));`,
            // );
          },
          error => {
            console.error(error);
            onError(error.message);
            // setLocation(prevState => ({
            //   ...prevState,
            //   error: error.message,
            // }));
          },
          {
            enableHighAccuracy: true,
            // enableHighAccuracy: true,
            timeout: 0,
            interval: 1000,
            fastestInterval: 1000,
            // timeout: 10000,
            maximumAge: 0, // 强制获取新位置
            // enableHighAccuracy: true,
            // // accuracy: {
            // //   android: 'balanced',
            // //   ios: 'nearestTenMeters'
            // // },
            distanceFilter: 0,
            // interval: 1000,
            // forceRequestLocation: true,
            // showLocationDialog: true,
          },
        );
      } else {
        watchId = Geolocation2.watchPosition(
          pos => {
            // console.log('watchId pos', watchId, pos);
            // setCount(count + 1);
            // setLocation({
            //   latitude: pos.coords.latitude,
            //   longitude: pos.coords.longitude,
            //   altitude: pos.coords.altitude || 0,
            //   speed: pos.coords.speed || 0,
            //   error: '',
            // });

            // const response = {
            //   type: 'gps',
            //   payload: {
            //     coords: pos.coords,
            //     timestamp: pos.timestamp,
            //   },
            // };
            // // webviewRef.current?.injectJavaScript(
            // //   `window.dispatchEvent(new MessageEvent("message", { data:
            // //   ${JSON.stringify(JSON.stringify(response))} }));`,
            // // );
            onPositionChange({
              coords: pos.coords,
              timestamp: pos.timestamp,
            });
          },
          error => {
            console.error(error);
            onError(error.message);
            // setLocation(prevState => ({
            //   ...prevState,
            //   error: error.message,
            // }));
          },
          {
            // enableHighAccuracy: true,
            // // enableHighAccuracy: true,
            // interval: 1000,
            // // timeout: 10000,
            // maximumAge: 0, // 强制获取新位置

            enableHighAccuracy: true,
            // // accuracy: {
            // //   android: 'balanced',
            // //   ios: 'nearestTenMeters'
            // // },
            distanceFilter: 0,
            interval: 1000,
            fastestInterval: 1000,
            forceRequestLocation: true,
            showLocationDialog: true,
          },
        );
      }

      // Geolocation.getCurrentPosition(
      //   pos => {
      //     console.log('pos', pos);
      //     setLocation({
      //       latitude: pos.coords.latitude,
      //       longitude: pos.coords.longitude,
      //       altitude: pos.coords.altitude || 0,
      //       speed: pos.coords.speed || 0,
      //       error: '',
      //     });
      //   },
      //   err => {
      //     console.log('err', err);
      //     setLocation(prevState => ({
      //       ...prevState,
      //       error: err.message,
      //     }));
      //   },
      //   {
      //     // enableHighAccuracy: true,
      //     // // enableHighAccuracy: true,
      //     // // interval: 1000,
      //     // timeout: 10000,
      //     // maximumAge: 0, // 强制获取新位置

      //     enableHighAccuracy: true,
      //     // accuracy: {
      //     //   android: 'balanced',
      //     //   ios: 'nearestTenMeters'
      //     // },
      //     distanceFilter: 0,
      //     timeout: 0,
      //     maximumAge: 0, // 强制获取新位置
      //     forceRequestLocation: true,
      //     showLocationDialog: true,
      //   },
      // );
    } else {
      console.error('定位权限未授权');
    }
  } catch (e) {
    console.error('Failed to get location:', e);
    // 备用方案（如使用手机系统定位或IP定位）
  }
};

export const formatTimestamp = (
  timestamp: number,
  full = true,
  fields: string[] = ['h', 'm', 's'],
) => {
  const h = Math.floor(timestamp / 3600);
  const m = Math.floor(timestamp / 60) % 60;
  const s = Math.floor(timestamp % 60);
  if (full)
    return (
      (fields.includes('h') ? h + 'h ' : '') +
      (fields.includes('m') ? m + 'm ' : '') +
      (fields.includes('s') ? s + 's ' : '')
    );
  return (
    (h === 0 && fields.includes('h') ? '' : h + 'h ') +
    (m === 0 && fields.includes('m') ? '' : m + 'm ') +
    (s === 0 && fields.includes('s') ? '' : s + 's ')
  );
};
