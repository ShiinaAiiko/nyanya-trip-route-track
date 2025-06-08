import React, {useEffect, useRef, useState} from 'react';
import IndexPage from './pages/Index';
import {Appearance, StatusBar, SafeAreaView, View, Linking} from 'react-native';

const App = () => {
  useEffect(() => {
    Appearance.setColorScheme('light'); // 在组件内调用
    StatusBar.setBarStyle('dark-content');
  }, []);
  // 在组件中
  useEffect(() => {
    const handleDeepLink = (url: string | null) => {
      console.log('handleDeepLink', url);
      if (url === 'TripAiikoClub://home') {
        // 处理跳转到首页或其他逻辑
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    Linking.addEventListener('url', ({url}) => handleDeepLink(url));

    return () => {
      Linking.removeAllListeners('url');
    };
  }, []);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <IndexPage></IndexPage>
    </SafeAreaView>
  );
};

export default App;

// import React, {useRef, useEffect} from 'react';
// import {
//   PermissionsAndroid,
//   Platform,
//   StatusBar,
//   View,
//   Alert,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import Geolocation from '@react-native-community/geolocation';
// import BackgroundGeolocation from 'react-native-background-geolocation';

// const requestPermissions = async () => {
//   if (Platform.OS === 'android') {
//     const permissions = [
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//       PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
//       PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
//     ];
//     const granted = await PermissionsAndroid.requestMultiple(permissions);
//     return Object.values(granted).every(
//       val => val === PermissionsAndroid.RESULTS.GRANTED,
//     );
//   }
//   return true;
// };

// const App = () => {
//   const webviewRef = useRef<any>(null);

//   useEffect(() => {
//     requestPermissions();
//   }, []);

//   const initGeolocation = () => {
//     BackgroundGeolocation.ready(
//       {
//         desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
//         distanceFilter: 0,
//         stationaryRadius: 25,
//         stopOnTerminate: false,
//         startOnBoot: true,
//         foregroundService: true,
//         locationUpdateInterval: 1000, // Location update interval in ms (1s)
//         fastestLocationUpdateInterval: 1000, // Fastest location update interval in ms (1s)
//         debug: false,
//         logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
//       },
//       state => {
//         if (!state.enabled) {
//           BackgroundGeolocation.start();
//         }
//       },
//       failure => {
//         console.log('failure', failure);
//       },
//     );

//     BackgroundGeolocation.onLocation(
//       location => {
//         console.log('[位置更新]', location);
//         const coords = location.coords;
//         webviewRef.current?.injectJavaScript(`
//         if (window.onLocationUpdate) {
//           window.onLocationUpdate(${JSON.stringify(coords)});
//         }
//       `);
//       },
//       failure => {
//         console.error('[定位错误]', failure);
//       },
//     );

//     // BackgroundGeolocation.BackgroundGeolocation.onError(error => {
//     //   console.error('[定位错误]', error);
//     // });
//   };

//   const handleMessage = async (event: any) => {
//     try {
//       const msg = JSON.parse(event.nativeEvent.data);
//       const {type, payload} = msg;

//       console.log('handleMessage', msg);

//       if (type === 'keepScreenOn') {
//         if (payload === true) KeepAwake.activate();
//         else KeepAwake.deactivate();
//       }

//       if (type === 'getLocation') {
//         const granted = await requestPermissions();
//         if (granted) {
//           initGeolocation();
//         }
//         // Geolocation.watchPosition;
//         // Geolocation.getCurrentPosition(
//         //   position => {
//         //     console.log('position', position);
//         //     const response = {
//         //       type: 'locationResult',
//         //       payload: {
//         //         lat: position.coords.latitude,
//         //         lng: position.coords.longitude,
//         //       },
//         //     };
//         //     webviewRef.current?.injectJavaScript(
//         //       `window.dispatchEvent(new MessageEvent("message", { data: ${JSON.stringify(
//         //         JSON.stringify(response),
//         //       )} }));`,
//         //     );
//         //   },
//         //   error => {
//         //     console.log('Location error:', error);
//         //   },
//         //   {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
//         // );
//       }
//     } catch (err) {
//       console.error('handleMessage error:', err);
//     }
//   };

//   return (
//     <View style={{flex: 1}}>
//       <StatusBar barStyle="dark-content" />
//       <WebView
//         ref={webviewRef}
//         source={{uri: 'https://trip.aiiko.club/zh-CN?debug=true'}} // 👈 你自己改这里
//         javaScriptEnabled
//         domStorageEnabled
//         onMessage={handleMessage}
//         originWhitelist={['*']}
//         mixedContentMode="always"
//         allowsInlineMediaPlayback
//       />
//     </View>
//   );
// };

// export default App;
