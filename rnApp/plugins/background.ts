import BackgroundService from 'react-native-background-actions';
import Geolocation from '@react-native-community/geolocation';
import {request, PERMISSIONS} from 'react-native-permissions';

const requestLocationPermission = async () => {
  const permission = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  if (permission === 'granted') {
    console.log('定位权限已授权');
    Geolocation.getCurrentPosition(
      pos => {
        console.log('[定位]', pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.error('[定位错误]', err);
      },
      {
        enableHighAccuracy: false,
        // enableHighAccuracy: true,
        interval: 1000,
        timeout: 10000,
        maximumAge: 0, // 强制获取新位置
      },
    );
  } else {
    console.error('定位权限未授权');
  }
};

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
      requestLocationPermission();

      await sleep(10000); // 每 10 秒执行一次
    }
  } catch (error) {
    console.error(error);
  }
};

const options = {
  taskName: 'GPS Tracking',
  taskTitle: '正在后台定位',
  taskDesc: 'GPS 定位持续运行中',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#ff00ff',
};

export async function startBackgroundTask() {
  await BackgroundService.start(veryIntensiveTask, options);
  console.log('[后台服务] 已启动');
}

export async function stopBackgroundTask() {
  await BackgroundService.stop();
}
