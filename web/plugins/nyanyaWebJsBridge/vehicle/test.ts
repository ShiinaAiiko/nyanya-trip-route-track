import { NyaNyaWebJSBridge } from "../nyanyaWebJsBridge";
import { defaultCarData, CarData } from './carDataTypes';

/**
 * 车机数据测试函数
 * @description 模拟真实车辆数据变化，方便开发调试
 * @param bridge 桥接对象
 */
export const startTest = (bridge: NyaNyaWebJSBridge) => {
  console.log('🚗 开始车机数据模拟测试');

  // 基础状态
  let state = {
    speed: 0,
    accelerate: 0,
    brake: 0,
    elecPercentage: 80,
    fuelPercentage: 60,
    totalMileage: 12345.6,
    evMileage: 8765.4,
    acTemp: 24,
    outsideTemp: 28,
    acWindLevel: 3,
    frontLeftTyre: 250,
    frontRightTyre: 248,
    rearLeftTyre: 252,
    rearRightTyre: 249,
    lightIntensity: 400,
    hour: 14,
    minute: 30,
    second: 0,
    leftFrontRadar: 0,
    rightFrontRadar: 0,
    leftRearRadar: 0,
    rightRearRadar: 0,
    leftRadar: 0,
    rightRadar: 0,
    frontLeftMidRadar: 0,
    frontRightMidRadar: 0,
    pm25ValueIn: 35,
    pm25ValueOut: 80,
    isDriving: false,
    drivingTime: 0,
  };

  // 生成完整 carData
  const generateCarData = (): CarData => {
    return {
      ...defaultCarData,
      speed: {
        currentSpeed: state.speed,
        accelerateDeepness: state.accelerate,
        brakeDeepness: state.brake,
      },
      statistic: {
        drivingTime: state.drivingTime,
        elecDrivingRange: Math.floor(state.elecPercentage * 4.5),
        elecPercentage: state.elecPercentage,
        fuelDrivingRange: Math.floor(state.fuelPercentage * 6),
        fuelPercentage: state.fuelPercentage,
        lastElecConPHM: 15.2,
        lastFuelConPHM: 6.8,
        totalElecConPHM: 14.8,
        totalFuelConPHM: 7.2,
        totalFuelCon: 123.4,
        totalElecCon: 567.8,
        totalMileage: state.totalMileage,
        keyBatteryLevel: 85,
        evMileage: state.evMileage,
      },
      instrument: {
        malfunctionInfo: {},
        alarmBuzzleState: 0,
        unit: {},
        maintenanceInfo: {},
        externalChargingPower: state.speed > 0 ? 0 : 15,
      },
      door: {
        leftFront: 0,
        leftRear: 0,
        rightFront: 0,
        rightRear: 0,
        back: 0,
        childlockLeft: 1,
        childlockRight: 1,
      },
      vehicleSetting: {
        acBTWind: 1,
        acTunnelCycle: 0,
        acPauseCycle: 0,
        acAutoAir: 1,
        pm25Power: 1,
        pm25SwitchCheck: 1,
        pm25TimeCheck: 0,
        energyFeedback: 3,
        socTarget: 100,
        chargingPort: 0,
        autoExternalRearMirrorFollowUp: 1,
        lockOff: 0,
        language: 1,
        overspeedLock: 120,
        safeWarnState: 1,
        maintainRemindState: 0,
        steerAssis: 2,
        rearViewMirrorFlip: 0,
        driverSeatAutoReturn: 1,
        steerPositionAutoReturn: 1,
        remoteControlUpwindowState: 1,
        remoteControlDownwindowState: 1,
        lockCarRiseWindow: 1,
        microSwitchLockWindowState: 1,
        microSwitchUnlockWindowState: 1,
        backHomeLightDelayValue: 30,
        leftHomeLightDelayValue: 30,
        backDoorElectricMode: 1,
      },
      engine: {
        engineDisplacement: 1.5,
        engineCode: 'BYD472QA',
        enginePower: state.speed > 0 ? 80 : 0,
        engineSpeed: state.speed > 0 ? 1500 + Math.floor(state.speed * 30) : 0,
        engineCoolantLevel: state.speed > 0 ? 85 : 45,
        oilLevel: state.fuelPercentage,
      },
      panorama: {
        panoOutputSignal: 1,
        panoWorkState: state.speed < 15 ? 1 : 0,
        backLineConfig: 1,
        panoOutputState: 1,
        panoRotation: 0,
        displayMode: 0,
        panoramaOnlineState: 1,
      },
      ac: {
        acCompressorMode: state.speed > 0 ? 1 : 0,
        acCompressorManualSign: 0,
        acWindLevelManualSign: 0,
        acWindModeManualSign: 0,
        acStartState: 1,
        acControlMode: 0,
        acCycleMode: 0,
        acWindMode: 0,
        acDefrostStateFront: 0,
        acDefrostStateRear: 0,
        acWindLevel: state.acWindLevel,
        acTemperatureMain: state.acTemp,
        acTemperatureDeputy: state.acTemp + 1,
        acTemperatureRear: state.acTemp,
        acTemperatureOut: state.outsideTemp,
        temperatureUnit: 0,
        acTemperatureControlMode: 0,
        acVentilationState: 1,
        rearAcStartState: 0,
      },
      sensor: {
        lightIntensity: state.lightIntensity,
      },
      time: {
        year: 2026,
        month: 5,
        day: 27,
        hour: state.hour,
        minute: state.minute,
        second: state.second,
        timeFormat: 24,
      },
      energyMode: {
        energyMode: 1,
        operationMode: 0,
        powerGenerationState: 0,
        powerGenerationValue: 0,
        roadSurfaceMode: 0,
      },
      radar: {
        leftFront: state.leftFrontRadar,
        rightFront: state.rightFrontRadar,
        leftRear: state.leftRearRadar,
        rightRear: state.rightRearRadar,
        left: state.leftRadar,
        right: state.rightRadar,
        frontLeftMid: state.frontLeftMidRadar,
        frontRightMid: state.frontRightMidRadar,
        reverseRadarSwitch: state.speed < 10 ? 1 : 0,
      },
      tyre: {
        tyrePressureLf: state.frontLeftTyre,
        tyrePressureRf: state.frontRightTyre,
        tyrePressureLr: state.rearLeftTyre,
        tyrePressureRr: state.rearRightTyre,
        tyreAirLeakStateLf: 0,
        tyreAirLeakStateRf: 0,
        tyreAirLeakStateLr: 0,
        tyreAirLeakStateRr: 0,
        tyreBatteryState: 1,
        tyreSystemState: 1,
        tyreTemperatureState: 0,
        tyreSignalStateLf: 1,
        tyreSignalStateRf: 1,
        tyreSignalStateLr: 1,
        tyreSignalStateRr: 1,
      },
      airQuality: {
        pm25OnlineState: 1,
        pm25CheckStateIn: 1,
        pm25CheckStateOut: 1,
        pm25LevelIn: state.pm25ValueIn < 35 ? 0 : state.pm25ValueIn < 75 ? 1 : 2,
        pm25LevelOut: state.pm25ValueOut < 35 ? 0 : state.pm25ValueOut < 75 ? 1 : 2,
        pm25ValueIn: state.pm25ValueIn,
        pm25ValueOut: state.pm25ValueOut,
      },
      charge: {
        chargerFaultState: 0,
        chargerWorkState: state.speed > 0 ? 0 : 2,
        chargingCapacity: state.elecPercentage,
        chargingType: 1,
        chargingRestTimeHour: Math.floor((100 - state.elecPercentage) / 2),
        chargingRestTimeMinute: Math.floor(((100 - state.elecPercentage) % 2) * 60),
        chargingCapStateAc: state.speed > 0 ? 0 : 1,
        chargingCapStateDc: 0,
        chargingPortLockRebackState: 0,
        dischargeRequestState: 0,
        chargerState: state.speed > 0 ? 0 : 2,
        chargingGunState: state.speed > 0 ? 0 : 1,
        chargingPower: state.speed > 0 ? 0 : 15,
        batteryManagementDeviceState: 1,
        chargingScheduleEnableState: 0,
        chargingScheduleState: 0,
        chargingGunNotInsertedState: state.speed > 0 ? 1 : 0,
        chargingScheduleTimeHour: 0,
        chargingScheduleTimeMinute: 0,
      },
      media: {
        mediaType: 0,
        playMode: 0,
        playState: state.speed > 0 ? 1 : 0,
        fileName: 'favorite_song.mp3',
        artistName: 'BYD Music',
        albumName: 'EV Life',
      },
      bodyStatus: {
        autoVIN: 'BYD1234567890ABCDE',
        autoModelName: 123,
        autoSystemState: 1,
        doorStateLf: 0,
        doorStateRf: 0,
        doorStateLr: 0,
        doorStateRr: 0,
        doorStateHood: 0,
        doorStateLuggage: 0,
        windowStateLf: 0,
        windowStateRf: 0,
        windowStateLr: 0,
        windowStateRr: 0,
        moonRoofPercent: 0,
        sunshadePercent: 0,
        batteryVoltageLevel: 13.5,
        powerLevel: state.elecPercentage,
        steeringWheelAngle: Math.sin(Date.now() / 2000) * 5,
        steeringWheelSpeed: 0,
        fuelElecLowPower: state.elecPercentage > 20 ? 0 : 1,
        alarmState: 0,
        moonRoofConfig: 1,
      },
      light: {
        lightAutoStatus: 1,
        lightSide: state.lightIntensity < 300 ? 1 : 0,
        lightLowBeam: state.lightIntensity < 200 ? 1 : 0,
        lightHighBeam: 0,
        lightLeftTurnSignal: Math.random() > 0.9 ? 1 : 0,
        lightRightTurnSignal: Math.random() > 0.9 ? 1 : 0,
        lightFrontFog: 0,
        lightRearFog: 0,
        lightFoot: state.lightIntensity < 100 ? 1 : 0,
        afsSwitch: 1,
      },
    };
  };

  // 发送单个分类数据
  const sendCategoryData = (type: string, data: any) => {
    bridge.dispatch(type as any, data);
  };

  // 发送全部数据
  const sendAllData = (data: CarData) => {
    sendCategoryData('carData', data);
    sendCategoryData('speed', data.speed);
    sendCategoryData('statistic', data.statistic);
    sendCategoryData('instrument', data.instrument);
    sendCategoryData('door', data.door);
    sendCategoryData('vehicleset', data.vehicleSetting);
    sendCategoryData('engine', data.engine);
    sendCategoryData('panorama', data.panorama);
    sendCategoryData('ac', data.ac);
    sendCategoryData('sensor', data.sensor);
    sendCategoryData('time', data.time);
    sendCategoryData('energyMode', data.energyMode);
    sendCategoryData('radar', data.radar);
    sendCategoryData('tyre', data.tyre);
    sendCategoryData('airQuality', data.airQuality);
    sendCategoryData('charge', data.charge);
    sendCategoryData('media', data.media);
    sendCategoryData('bodyStatus', data.bodyStatus);
    sendCategoryData('light', data.light);
  };

  // 模拟驾驶状态变化
  const simulateDriving = () => {
    // 50% 概率开始/停止驾驶
    if (Math.random() < 0.02) {
      state.isDriving = !state.isDriving;
      console.log(state.isDriving ? '🚗 开始行驶' : '🛑 停止行驶');
    }

    if (state.isDriving) {
      // 模拟加速
      if (state.speed < 120 && Math.random() > 0.4) {
        const targetSpeed = state.speed + Math.random() * 10;
        state.speed = Math.min(targetSpeed, 120);
        state.accelerate = Math.random() * 50;
        state.brake = 0;
      }
      // 模拟减速
      else if (state.speed > 0 && Math.random() > 0.7) {
        state.speed = Math.max(state.speed - Math.random() * 5, 0);
        state.brake = Math.random() * 30;
        state.accelerate = 0;
      }
      // 稳定行驶
      else {
        state.speed += (Math.random() - 0.5) * 2;
        state.speed = Math.max(0, Math.min(state.speed, 120));
        state.accelerate = Math.random() * 10;
        state.brake = 0;
      }

      // 消耗电量
      state.elecPercentage = Math.max(state.elecPercentage - Math.random() * 0.01, 5);

      // 增加里程
      state.totalMileage += state.speed / 3600;
      state.evMileage += state.speed / 3600;

      // 增加驾驶时间
      state.drivingTime++;

      // 模拟雷达距离（前方有车）
      if (Math.random() > 0.7) {
        state.leftFrontRadar = Math.floor(Math.random() * 200);
        state.rightFrontRadar = Math.floor(Math.random() * 200);
        state.frontLeftMidRadar = Math.floor(Math.random() * 150);
        state.frontRightMidRadar = Math.floor(Math.random() * 150);
      } else {
        state.leftFrontRadar = 0;
        state.rightFrontRadar = 0;
        state.frontLeftMidRadar = 0;
        state.frontRightMidRadar = 0;
      }
    } else {
      // 停车时缓慢减速
      if (state.speed > 0) {
        state.speed = Math.max(state.speed - 2, 0);
      }
      state.accelerate = 0;
      state.brake = 0;

      // 充电模式（停车时缓慢充电）
      if (state.elecPercentage < 100) {
        state.elecPercentage = Math.min(state.elecPercentage + Math.random() * 0.05, 100);
      }
    }

    // 更新时间
    state.second++;
    if (state.second >= 60) {
      state.second = 0;
      state.minute++;
      if (state.minute >= 60) {
        state.minute = 0;
        state.hour = (state.hour + 1) % 24;
      }
    }

    // 光线强度变化（模拟白天/黑夜循环）
    const timeInSeconds = state.hour * 3600 + state.minute * 60 + state.second;
    if (timeInSeconds > 6 * 3600 && timeInSeconds < 18 * 3600) {
      // 白天
      state.lightIntensity = 500 + Math.sin(timeInSeconds / 3600 * Math.PI - Math.PI / 2) * 400;
    } else {
      // 黑夜
      state.lightIntensity = 50 + Math.random() * 50;
    }

    // 外界温度变化
    state.outsideTemp = 25 + Math.sin(Date.now() / 60000) * 5;

    // 车内温度根据外界温度微调
    state.acTemp += (Math.random() - 0.5) * 0.1;
    state.acTemp = Math.max(16, Math.min(state.acTemp, 30));

    // 风量随机调整
    if (Math.random() > 0.98) {
      state.acWindLevel = Math.floor(Math.random() * 8);
    }

    // 胎压轻微变化
    state.frontLeftTyre += (Math.random() - 0.5);
    state.frontRightTyre += (Math.random() - 0.5);
    state.rearLeftTyre += (Math.random() - 0.5);
    state.rearRightTyre += (Math.random() - 0.5);

    state.frontLeftTyre = Math.max(200, Math.min(state.frontLeftTyre, 300));
    state.frontRightTyre = Math.max(200, Math.min(state.frontRightTyre, 300));
    state.rearLeftTyre = Math.max(200, Math.min(state.rearLeftTyre, 300));
    state.rearRightTyre = Math.max(200, Math.min(state.rearRightTyre, 300));

    // PM2.5 变化
    state.pm25ValueIn += (Math.random() - 0.5) * 2;
    state.pm25ValueOut += (Math.random() - 0.5) * 5;
    state.pm25ValueIn = Math.max(0, Math.min(state.pm25ValueIn, 150));
    state.pm25ValueOut = Math.max(0, Math.min(state.pm25ValueOut, 300));

    // 后雷达（倒车时）
    if (state.isDriving && state.speed < 10 && Math.random() > 0.5) {
      state.leftRearRadar = Math.floor(Math.random() * 150);
      state.rightRearRadar = Math.floor(Math.random() * 150);
    } else {
      state.leftRearRadar = 0;
      state.rightRearRadar = 0;
    }

    // 侧雷达
    if (Math.random() > 0.8) {
      state.leftRadar = Math.floor(Math.random() * 100);
      state.rightRadar = Math.floor(Math.random() * 100);
    } else {
      state.leftRadar = 0;
      state.rightRadar = 0;
    }
  };

  // 主循环
  let frameCount = 0;
  const testInterval = setInterval(() => {
    frameCount++;

    // 更新模拟状态
    simulateDriving();

    // 生成完整数据
    const data = generateCarData();

    // 每帧发送 carData（整体数据）
    sendCategoryData('carData', data);

    // 每帧发送频繁变化的数据
    sendCategoryData('speed', data.speed);
    sendCategoryData('time', data.time);
    sendCategoryData('sensor', data.sensor);
    sendCategoryData('light', data.light);

    // 每10帧发送中等频率变化的数据
    if (frameCount % 10 === 0) {
      sendCategoryData('statistic', data.statistic);
      sendCategoryData('ac', data.ac);
      sendCategoryData('radar', data.radar);
      sendCategoryData('airQuality', data.airQuality);
      sendCategoryData('media', data.media);
      sendCategoryData('bodyStatus', data.bodyStatus);
    }

    // 每30帧发送低频率变化的数据
    if (frameCount % 30 === 0) {
      sendCategoryData('instrument', data.instrument);
      sendCategoryData('door', data.door);
      sendCategoryData('vehicleset', data.vehicleSetting);
      sendCategoryData('engine', data.engine);
      sendCategoryData('panorama', data.panorama);
      sendCategoryData('energyMode', data.energyMode);
      sendCategoryData('tyre', data.tyre);
      sendCategoryData('charge', data.charge);
    }
  }, 100); // 100ms 更新一次，模拟真实车机频率

  console.log('✅ 车机数据模拟测试已启动！');
  console.log('📊 输出频率:');
  console.log('  - carData/speed/time/sensor/light: 100ms');
  console.log('  - statistic/ac/radar/airQuality/media/bodyStatus: 1s');
  console.log('  - 其他分类: 3s');

  // 提供停止函数
  (window as any).stopCarTest = () => {
    clearInterval(testInterval);
    console.log('🛑 车机数据模拟测试已停止');
  };
};
