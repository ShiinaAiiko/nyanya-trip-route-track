/**
 * 车速类数据
 * @description 车速相关数据，包含当前车速、油门深度、制动深度
 */
export interface SpeedData {
  /** 当前车速，单位 km/h，范围 0~282 */
  currentSpeed: number;
  /** 油门深度，范围 0~100% */
  accelerateDeepness: number;
  /** 制动深度，范围 0~100% */
  brakeDeepness: number;
}

/**
 * 车辆完整数据
 * @description 包含所有车辆分类数据的完整对象
 */
export interface CarData {
  speed: SpeedData;
  statistic: StatisticData;
  instrument: InstrumentData;
  door: DoorData;
  vehicleSetting: VehicleSettingData;
  engine: EngineData;
  panorama: PanoramaData;
  ac: AcData;
  sensor: SensorData;
  time: TimeData;
  energyMode: EnergyModeData;
  radar: RadarData;
  tyre: TyreData;
  airQuality: AirQualityData;
  charge: ChargeData;
  media: MediaData;
  bodyStatus: BodyStatusData;
  light: LightData;
}

/**
 * 车辆数据默认空值
 */
export const defaultCarData: CarData = {
  speed: {
    currentSpeed: 0,
    accelerateDeepness: 0,
    brakeDeepness: 0,
  },
  statistic: {
    drivingTime: 0,
    elecDrivingRange: 0,
    elecPercentage: 0,
    fuelDrivingRange: 0,
    fuelPercentage: 0,
    lastElecConPHM: 0,
    lastFuelConPHM: 0,
    totalElecConPHM: 0,
    totalFuelConPHM: 0,
    totalFuelCon: 0,
    totalElecCon: 0,
    totalMileage: 0,
    keyBatteryLevel: 0,
    evMileage: 0,
  },
  instrument: {
    malfunctionInfo: {},
    alarmBuzzleState: 0,
    unit: {},
    maintenanceInfo: {},
    externalChargingPower: 0,
  },
  door: {
    leftFront: 0,
    leftRear: 0,
    rightFront: 0,
    rightRear: 0,
    back: 0,
    childlockLeft: 0,
    childlockRight: 0,
  },
  vehicleSetting: {
    acBTWind: 0,
    acTunnelCycle: 0,
    acPauseCycle: 0,
    acAutoAir: 0,
    pm25Power: 0,
    pm25SwitchCheck: 0,
    pm25TimeCheck: 0,
    energyFeedback: 0,
    socTarget: 0,
    chargingPort: 0,
    autoExternalRearMirrorFollowUp: 0,
    lockOff: 0,
    language: 0,
    overspeedLock: 0,
    safeWarnState: 0,
    maintainRemindState: 0,
    steerAssis: 0,
    rearViewMirrorFlip: 0,
    driverSeatAutoReturn: 0,
    steerPositionAutoReturn: 0,
    remoteControlUpwindowState: 0,
    remoteControlDownwindowState: 0,
    lockCarRiseWindow: 0,
    microSwitchLockWindowState: 0,
    microSwitchUnlockWindowState: 0,
    backHomeLightDelayValue: 0,
    leftHomeLightDelayValue: 0,
    backDoorElectricMode: 0,
  },
  engine: {
    engineDisplacement: 0,
    engineCode: '',
    enginePower: 0,
    engineSpeed: 0,
    engineCoolantLevel: 0,
    oilLevel: 0,
  },
  panorama: {
    panoOutputSignal: 0,
    panoWorkState: 0,
    backLineConfig: 0,
    panoOutputState: 0,
    panoRotation: 0,
    displayMode: 0,
    panoramaOnlineState: 0,
  },
  ac: {
    acCompressorMode: 0,
    acCompressorManualSign: 0,
    acWindLevelManualSign: 0,
    acWindModeManualSign: 0,
    acStartState: 0,
    acControlMode: 0,
    acCycleMode: 0,
    acWindMode: 0,
    acDefrostStateFront: 0,
    acDefrostStateRear: 0,
    acWindLevel: 0,
    acTemperatureMain: 0,
    acTemperatureDeputy: 0,
    acTemperatureRear: 0,
    acTemperatureOut: 0,
    temperatureUnit: 0,
    acTemperatureControlMode: 0,
    acVentilationState: 0,
    rearAcStartState: 0,
  },
  sensor: {
    lightIntensity: 0,
  },
  time: {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
    timeFormat: 0,
  },
  energyMode: {
    energyMode: 0,
    operationMode: 0,
    powerGenerationState: 0,
    powerGenerationValue: 0,
    roadSurfaceMode: 0,
  },
  radar: {
    leftFront: 0,
    rightFront: 0,
    leftRear: 0,
    rightRear: 0,
    left: 0,
    right: 0,
    frontLeftMid: 0,
    frontRightMid: 0,
    reverseRadarSwitch: 0,
  },
  tyre: {
    tyrePressureLf: 0,
    tyrePressureRf: 0,
    tyrePressureLr: 0,
    tyrePressureRr: 0,
    tyreAirLeakStateLf: 0,
    tyreAirLeakStateRf: 0,
    tyreAirLeakStateLr: 0,
    tyreAirLeakStateRr: 0,
    tyreBatteryState: 0,
    tyreSystemState: 0,
    tyreTemperatureState: 0,
    tyreSignalStateLf: 0,
    tyreSignalStateRf: 0,
    tyreSignalStateLr: 0,
    tyreSignalStateRr: 0,
  },
  airQuality: {
    pm25OnlineState: 0,
    pm25CheckStateIn: 0,
    pm25CheckStateOut: 0,
    pm25LevelIn: 0,
    pm25LevelOut: 0,
    pm25ValueIn: 0,
    pm25ValueOut: 0,
  },
  charge: {
    chargerFaultState: 0,
    chargerWorkState: 0,
    chargingCapacity: 0,
    chargingType: 0,
    chargingRestTimeHour: 0,
    chargingRestTimeMinute: 0,
    chargingCapStateAc: 0,
    chargingCapStateDc: 0,
    chargingPortLockRebackState: 0,
    dischargeRequestState: 0,
    chargerState: 0,
    chargingGunState: 0,
    chargingPower: 0,
    batteryManagementDeviceState: 0,
    chargingScheduleEnableState: 0,
    chargingScheduleState: 0,
    chargingGunNotInsertedState: 0,
    chargingScheduleTimeHour: 0,
    chargingScheduleTimeMinute: 0,
  },
  media: {
    mediaType: 0,
    playMode: 0,
    playState: 0,
    fileName: '',
    artistName: '',
    albumName: '',
  },
  bodyStatus: {
    autoVIN: '',
    autoModelName: 0,
    autoSystemState: 0,
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
    batteryVoltageLevel: 0,
    powerLevel: 0,
    steeringWheelAngle: 0,
    steeringWheelSpeed: 0,
    fuelElecLowPower: 0,
    alarmState: 0,
    moonRoofConfig: 0,
  },
  light: {
    lightAutoStatus: 0,
    lightSide: 0,
    lightLowBeam: 0,
    lightHighBeam: 0,
    lightLeftTurnSignal: 0,
    lightRightTurnSignal: 0,
    lightFrontFog: 0,
    lightRearFog: 0,
    lightFoot: 0,
    afsSwitch: 0,
  },
};

/**
 * 行驶数据类型
 * @description 车辆行驶统计数据
 */
export interface StatisticData {
  drivingTime: number;
  elecDrivingRange: number;
  elecPercentage: number;
  fuelDrivingRange: number;
  fuelPercentage: number;
  lastElecConPHM: number;
  lastFuelConPHM: number;
  totalElecConPHM: number;
  totalFuelConPHM: number;
  totalFuelCon: number;
  totalElecCon: number;
  totalMileage: number;
  keyBatteryLevel: number;
  evMileage: number;
}

/**
 * 仪表类数据
 * @description 车辆仪表盘相关数据
 */
export interface InstrumentData {
  malfunctionInfo: Record<number, number>;
  alarmBuzzleState: number;
  unit: Record<number, number>;
  maintenanceInfo: Record<number, number>;
  externalChargingPower: number;
}

/**
 * 门锁类数据
 * @description 车辆门锁状态数据
 */
export interface DoorData {
  leftFront: number;
  leftRear: number;
  rightFront: number;
  rightRear: number;
  back: number;
  childlockLeft: number;
  childlockRight: number;
}

/**
 * 车辆设置类数据
 * @description 车辆各种设置状态
 */
export interface VehicleSettingData {
  acBTWind: number;
  acTunnelCycle: number;
  acPauseCycle: number;
  acAutoAir: number;
  pm25Power: number;
  pm25SwitchCheck: number;
  pm25TimeCheck: number;
  energyFeedback: number;
  socTarget: number;
  chargingPort: number;
  autoExternalRearMirrorFollowUp: number;
  lockOff: number;
  language: number;
  overspeedLock: number;
  safeWarnState: number;
  maintainRemindState: number;
  steerAssis: number;
  rearViewMirrorFlip: number;
  driverSeatAutoReturn: number;
  steerPositionAutoReturn: number;
  remoteControlUpwindowState: number;
  remoteControlDownwindowState: number;
  lockCarRiseWindow: number;
  microSwitchLockWindowState: number;
  microSwitchUnlockWindowState: number;
  backHomeLightDelayValue: number;
  leftHomeLightDelayValue: number;
  backDoorElectricMode: number;
}

/**
 * 发动机类数据
 * @description 发动机相关数据
 */
export interface EngineData {
  engineDisplacement: number;
  engineCode: string;
  enginePower: number;
  engineSpeed: number;
  engineCoolantLevel: number;
  oilLevel: number;
}

/**
 * 全景摄像头类数据
 * @description 全景和摄像头相关数据
 */
export interface PanoramaData {
  panoOutputSignal: number;
  panoWorkState: number;
  backLineConfig: number;
  panoOutputState: number;
  panoRotation: number;
  displayMode: number;
  panoramaOnlineState: number;
}

/**
 * 空调类数据
 * @description 车辆空调相关数据，包含开关状态、温度、风量、模式等
 */
export interface AcData {
  acCompressorMode: number;
  acCompressorManualSign: number;
  acWindLevelManualSign: number;
  acWindModeManualSign: number;
  acStartState: number;
  acControlMode: number;
  acCycleMode: number;
  acWindMode: number;
  acDefrostStateFront: number;
  acDefrostStateRear: number;
  acWindLevel: number;
  acTemperatureMain: number;
  acTemperatureDeputy: number;
  acTemperatureRear: number;
  acTemperatureOut: number;
  temperatureUnit: number;
  acTemperatureControlMode: number;
  acVentilationState: number;
  rearAcStartState: number;
}

/**
 * 空调类设置参数
 * @description 用于设置空调各项参数
 */
export interface AcSetParams {
  field: AcSetField;
  value: number;
  setSource?: number;
}

/**
 * 空调可设置字段
 */
export type AcSetField =
  | 'acControlMode'
  | 'acCycleMode'
  | 'acWindMode'
  | 'acDefrostState'
  | 'acWindLevel'
  | 'acTemperature'
  | 'acTemperatureControlMode'
  | 'acVentilationState'
  | 'start'
  | 'startRearAc'
  | 'stop'
  | 'stopRearAc';

/**
 * 车辆分类类型
 */
export type VehicleCategory = 'speed' | 'statistic' | 'instrument' | 'tyre' | 'bodywork' | 'engine' | 'doorlock' | 'ac' | 'light' | 'panorama' | 'vehicleset' | 'charge' | 'energy' | 'media' | 'navigation' | 'settings' | 'other';

/**
 * 统一的车辆数据接口
 */
export interface VehicleDataMap {
  speed: SpeedData;
  statistic: StatisticData;
  instrument: InstrumentData;
  [key: string]: any;
}

/**
 * 设置接口的参数类型
 */
export interface SetVehicleDataParams {
  /** 分类名 */
  type: VehicleCategory;
  /** 字段名 */
  field: string;
  /** 值 */
  value: any;
}

/**
 * 获取接口的参数类型
 */
export type GetVehicleDataParams = VehicleCategory;

/**
 * 启用监听接口的参数类型
 */
export interface EnableVehicleListenerParams {
  /** 分类名或 'all' */
  category: VehicleCategory | 'all';
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 车辆数据默认空值
 */
export const defaultSpeedData: SpeedData = {
  currentSpeed: 0,
  accelerateDeepness: 0,
  brakeDeepness: 0,
};

export const defaultStatisticData: StatisticData = {
  drivingTime: 0,
  elecDrivingRange: 0,
  elecPercentage: 0,
  fuelDrivingRange: 0,
  fuelPercentage: 0,
  lastElecConPHM: 0,
  lastFuelConPHM: 0,
  totalElecConPHM: 0,
  totalFuelConPHM: 0,
  totalFuelCon: 0,
  totalElecCon: 0,
  totalMileage: 0,
  keyBatteryLevel: 0,
  evMileage: 0,
};

export const defaultInstrumentData: InstrumentData = {
  malfunctionInfo: {},
  alarmBuzzleState: 0,
  unit: {},
  maintenanceInfo: {},
  externalChargingPower: 0,
};

export const defaultDoorData: DoorData = {
  leftFront: 0,
  leftRear: 0,
  rightFront: 0,
  rightRear: 0,
  back: 0,
  childlockLeft: 0,
  childlockRight: 0,
};

export const defaultVehicleSettingData: VehicleSettingData = {
  acBTWind: 0,
  acTunnelCycle: 0,
  acPauseCycle: 0,
  acAutoAir: 0,
  pm25Power: 0,
  pm25SwitchCheck: 0,
  pm25TimeCheck: 0,
  energyFeedback: 0,
  socTarget: 0,
  chargingPort: 0,
  autoExternalRearMirrorFollowUp: 0,
  lockOff: 0,
  language: 0,
  overspeedLock: 0,
  safeWarnState: 0,
  maintainRemindState: 0,
  steerAssis: 0,
  rearViewMirrorFlip: 0,
  driverSeatAutoReturn: 0,
  steerPositionAutoReturn: 0,
  remoteControlUpwindowState: 0,
  remoteControlDownwindowState: 0,
  lockCarRiseWindow: 0,
  microSwitchLockWindowState: 0,
  microSwitchUnlockWindowState: 0,
  backHomeLightDelayValue: 0,
  leftHomeLightDelayValue: 0,
  backDoorElectricMode: 0,
};

export const defaultEngineData: EngineData = {
  engineDisplacement: 0,
  engineCode: '',
  enginePower: 0,
  engineSpeed: 0,
  engineCoolantLevel: 0,
  oilLevel: 0,
};

export const defaultPanoramaData: PanoramaData = {
  panoOutputSignal: 0,
  panoWorkState: 0,
  backLineConfig: 0,
  panoOutputState: 0,
  panoRotation: 0,
  displayMode: 0,
  panoramaOnlineState: 0,
};

export const defaultAcData: AcData = {
  acCompressorMode: 0,
  acCompressorManualSign: 0,
  acWindLevelManualSign: 0,
  acWindModeManualSign: 0,
  acStartState: 0,
  acControlMode: 0,
  acCycleMode: 0,
  acWindMode: 0,
  acDefrostStateFront: 0,
  acDefrostStateRear: 0,
  acWindLevel: 0,
  acTemperatureMain: 0,
  acTemperatureDeputy: 0,
  acTemperatureRear: 0,
  acTemperatureOut: 0,
  temperatureUnit: 0,
  acTemperatureControlMode: 0,
  acVentilationState: 0,
  rearAcStartState: 0,
};

/**
 * 传感器类数据
 * @description 车辆传感器相关数据，包含光照强度等
 */
export interface SensorData {
  lightIntensity: number;
}

export const defaultSensorData: SensorData = {
  lightIntensity: 0,
};

/**
 * 时间类数据
 * @description 车辆时间相关数据
 */
export interface TimeData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timeFormat: number;
}

export const defaultTimeData: TimeData = {
  year: 0,
  month: 0,
  day: 0,
  hour: 0,
  minute: 0,
  second: 0,
  timeFormat: 0,
};

/**
 * 能量、模式类数据
 * @description 车辆能量模式和运行模式相关数据
 */
export interface EnergyModeData {
  energyMode: number;
  operationMode: number;
  powerGenerationState: number;
  powerGenerationValue: number;
  roadSurfaceMode: number;
}

export const defaultEnergyModeData: EnergyModeData = {
  energyMode: 0,
  operationMode: 0,
  powerGenerationState: 0,
  powerGenerationValue: 0,
  roadSurfaceMode: 0,
};

/**
 * 雷达类数据
 * @description 车辆雷达相关数据
 */
export interface RadarData {
  leftFront: number;
  rightFront: number;
  leftRear: number;
  rightRear: number;
  left: number;
  right: number;
  frontLeftMid: number;
  frontRightMid: number;
  reverseRadarSwitch: number;
}

export const defaultRadarData: RadarData = {
  leftFront: 0,
  rightFront: 0,
  leftRear: 0,
  rightRear: 0,
  left: 0,
  right: 0,
  frontLeftMid: 0,
  frontRightMid: 0,
  reverseRadarSwitch: 0,
};

/**
 * 轮胎类数据
 * @description 车辆轮胎相关数据
 */
export interface TyreData {
  tyrePressureLf: number;
  tyrePressureRf: number;
  tyrePressureLr: number;
  tyrePressureRr: number;
  tyreAirLeakStateLf: number;
  tyreAirLeakStateRf: number;
  tyreAirLeakStateLr: number;
  tyreAirLeakStateRr: number;
  tyreBatteryState: number;
  tyreSystemState: number;
  tyreTemperatureState: number;
  tyreSignalStateLf: number;
  tyreSignalStateRf: number;
  tyreSignalStateLr: number;
  tyreSignalStateRr: number;
}

export const defaultTyreData: TyreData = {
  tyrePressureLf: 0,
  tyrePressureRf: 0,
  tyrePressureLr: 0,
  tyrePressureRr: 0,
  tyreAirLeakStateLf: 0,
  tyreAirLeakStateRf: 0,
  tyreAirLeakStateLr: 0,
  tyreAirLeakStateRr: 0,
  tyreBatteryState: 0,
  tyreSystemState: 0,
  tyreTemperatureState: 0,
  tyreSignalStateLf: 0,
  tyreSignalStateRf: 0,
  tyreSignalStateLr: 0,
  tyreSignalStateRr: 0,
};

/**
 * 空气质量类数据
 * @description 车辆空气质量相关数据
 */
export interface AirQualityData {
  pm25OnlineState: number;
  pm25CheckStateIn: number;
  pm25CheckStateOut: number;
  pm25LevelIn: number;
  pm25LevelOut: number;
  pm25ValueIn: number;
  pm25ValueOut: number;
}

export const defaultAirQualityData: AirQualityData = {
  pm25OnlineState: 0,
  pm25CheckStateIn: 0,
  pm25CheckStateOut: 0,
  pm25LevelIn: 0,
  pm25LevelOut: 0,
  pm25ValueIn: 0,
  pm25ValueOut: 0,
};

/**
 * 充电类数据
 * @description 车辆充电相关数据
 */
export interface ChargeData {
  chargerFaultState: number;
  chargerWorkState: number;
  chargingCapacity: number;
  chargingType: number;
  chargingRestTimeHour: number;
  chargingRestTimeMinute: number;
  chargingCapStateAc: number;
  chargingCapStateDc: number;
  chargingPortLockRebackState: number;
  dischargeRequestState: number;
  chargerState: number;
  chargingGunState: number;
  chargingPower: number;
  batteryManagementDeviceState: number;
  chargingScheduleEnableState: number;
  chargingScheduleState: number;
  chargingGunNotInsertedState: number;
  chargingScheduleTimeHour: number;
  chargingScheduleTimeMinute: number;
}

export const defaultChargeData: ChargeData = {
  chargerFaultState: 0,
  chargerWorkState: 0,
  chargingCapacity: 0,
  chargingType: 0,
  chargingRestTimeHour: 0,
  chargingRestTimeMinute: 0,
  chargingCapStateAc: 0,
  chargingCapStateDc: 0,
  chargingPortLockRebackState: 0,
  dischargeRequestState: 0,
  chargerState: 0,
  chargingGunState: 0,
  chargingPower: 0,
  batteryManagementDeviceState: 0,
  chargingScheduleEnableState: 0,
  chargingScheduleState: 0,
  chargingGunNotInsertedState: 0,
  chargingScheduleTimeHour: 0,
  chargingScheduleTimeMinute: 0,
};

/**
 * 媒体中心类数据
 * @description 车辆多媒体相关数据
 */
export interface MediaData {
  mediaType: number;
  playMode: number;
  playState: number;
  fileName: string;
  artistName: string;
  albumName: string;
}

export const defaultMediaData: MediaData = {
  mediaType: 0,
  playMode: 0,
  playState: 0,
  fileName: '',
  artistName: '',
  albumName: '',
};

/**
 * 车身状态类数据
 * @description 车辆车身状态相关数据
 */
export interface BodyStatusData {
  autoVIN: string;
  autoModelName: number;
  autoSystemState: number;
  doorStateLf: number;
  doorStateRf: number;
  doorStateLr: number;
  doorStateRr: number;
  doorStateHood: number;
  doorStateLuggage: number;
  windowStateLf: number;
  windowStateRf: number;
  windowStateLr: number;
  windowStateRr: number;
  moonRoofPercent: number;
  sunshadePercent: number;
  batteryVoltageLevel: number;
  powerLevel: number;
  steeringWheelAngle: number;
  steeringWheelSpeed: number;
  fuelElecLowPower: number;
  alarmState: number;
  moonRoofConfig: number;
}

export const defaultBodyStatusData: BodyStatusData = {
  autoVIN: '',
  autoModelName: 0,
  autoSystemState: 0,
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
  batteryVoltageLevel: 0,
  powerLevel: 0,
  steeringWheelAngle: 0,
  steeringWheelSpeed: 0,
  fuelElecLowPower: 0,
  alarmState: 0,
  moonRoofConfig: 0,
};

/**
 * 车灯类数据
 * @description 车辆车灯相关数据
 */
export interface LightData {
  lightAutoStatus: number;
  lightSide: number;
  lightLowBeam: number;
  lightHighBeam: number;
  lightLeftTurnSignal: number;
  lightRightTurnSignal: number;
  lightFrontFog: number;
  lightRearFog: number;
  lightFoot: number;
  afsSwitch: number;
}

export const defaultLightData: LightData = {
  lightAutoStatus: 0,
  lightSide: 0,
  lightLowBeam: 0,
  lightHighBeam: 0,
  lightLeftTurnSignal: 0,
  lightRightTurnSignal: 0,
  lightFrontFog: 0,
  lightRearFog: 0,
  lightFoot: 0,
  afsSwitch: 0,
};
