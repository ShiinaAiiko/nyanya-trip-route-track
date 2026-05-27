# 比亚迪车机数据接口实现汇总

> 最后更新：2026-06-03
>
> **重要**：每次进行车机相关代码改动后，请更新此文档。

---

## 接口设计规范

### 图例

| 符号 | 含义 |
|------|------|
| ✅ | 已实现 |
| ❌ | 未实现（文档中有此功能，但代码尚未实现） |
| ⚠️ | 不支持（文档中明确说明该操作不支持） |

> **注意**：待实现分类表格中的 ❌ 表示代码尚未实现，需要后续开发。

### API 风格（按分类为单位）

| 接口类型 | 方法 | 描述 |
|---------|------|------|
| 获取数据 | `get('分类名')` | 获取一次分类数据 |
| 启用监听 | `enableListener('分类名', true/false)` | 持续监听分类数据变化 |
| 设置数据 | `set({type:"分类名", field:"字段名", value: 值})` | 设置单个字段 |

---

## 分类实现状态总览

| 序号 | 分类名称 | 分类标识 | 获取 | 设置 | 监听 | 备注 |
|------|---------|---------|------|------|------|------|
| 1 | 车速类 | speed | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 2 | 行驶数据类型 | statistic | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 3 | 仪表类 | instrument | ✅ | ✅ | ✅ | 含特殊方法setUnit/setMaintenanceInfo |
| 4 | 空调类 | ac | ✅ | ✅ | ✅ | |
| 5 | 门锁类 | door | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 6 | 车辆设置类 | vehicle_setting | ✅ | ✅ | ✅ | 含特殊方法hasFeature |
| 7 | 发动机类 | engine | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 8 | 全景、摄像头类 | camera | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 9 | 传感器类 | sensor | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 10 | 时间类 | time | ✅ | ✅ | ✅ | 含特殊方法setDate/setTime/setTimeFormat |
| 11 | 能量、模式类 | energy_mode | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 12 | 雷达类 | radar | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 13 | 轮胎类 | tyre | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 14 | 空气质量类 | air_quality | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 15 | 充电类 | charge | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 16 | 媒体中心类 | media | ✅ | ✅ | ✅ | 含特殊方法controlMedia |
| 17 | 车身状态类 | body_status | ✅ | ⚠️ | ✅ | 文档中无set方法 |
| 18 | 车灯类 | light | ✅ | ⚠️ | ✅ | 文档中无set方法 |

---

## 已实现分类详情

### 1. 车速类 (speed) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/speed_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/speedService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 当前车速 | currentSpeed | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 油门深度 | accelerateDeepness | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 制动深度 | brakeDeepness | ✅ | ⚠️不支持 | ✅ | 无SET方法 |

#### 数据类型

```typescript
interface SpeedData {
  currentSpeed: number;      // 当前车速 (km/h) 范围: [0, 282.0]
  accelerateDepth: number;   // 油门深度 (%) 范围: [0, 100]
  brakeDepth: number;        // 制动深度 (%) 范围: [0, 100]
}
```

---

### 2. 行驶数据类型 (statistic) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/statistic_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/statisticService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 充电状态 | chargeStatus | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 充电功率 | chargePower | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 剩余电量百分比 | elecPercentage | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 剩余燃油百分比 | fuelPercentage | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 纯电里程 | evMileage | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 总里程 | totalMileage | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 本次用电量 | lastElecConPHM | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 本次油耗 | lastFuelConPHM | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 总用电量 | totalElecConPHM | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 总油耗 | totalFuelConPHM | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 纯电续航里程 | elecDrivingRange | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 燃油续航里程 | fuelDrivingRange | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 累计行驶时间 | drivingTime | ✅ | ⚠️不支持 | ✅ | 无SET方法 |

#### 数据类型

```typescript
interface StatisticData {
  chargeStatus: number;        // 充电状态 0:未充电 1:充电中
  chargePower: number;        // 充电功率 (kW)
  elecPercentage: number;     // 剩余电量百分比 (%) 范围: [0, 100]
  fuelPercentage: number;     // 剩余燃油百分比 (%) 范围: [0, 100]
  evMileage: number;          // 纯电里程 (km)
  totalMileage: number;       // 总里程 (km)
  lastElecConPHM: number;     // 本次用电量 (kWh/100km)
  lastFuelConPHM: number;     // 本次油耗 (L/100km)
  totalElecConPHM: number;    // 总用电量 (kWh)
  totalFuelConPHM: number;    // 总油耗 (L)
  elecDrivingRange: number;   // 纯电续航里程 (km)
  fuelDrivingRange: number;    // 燃油续航里程 (km)
  drivingTime: number;         // 累计行驶时间 (秒)
}
```

#### 使用示例

```typescript
// 获取行驶数据
const statisticData = await vehicle.statistic.get();

// 启用行驶数据监听
vehicle.statistic.enableListener();

// 监听行驶数据变化
vehicle.on('statistic', (data) => {
  console.log(data.elecPercentage, data.fuelPercentage);
});
```

---

### 3. 仪表类 (instrument) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/instrument_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/instrumentService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 外部充电功率 | externalChargingPower | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 报警蜂鸣器状态 | alarmBuzzleState | ✅ | ✅ | ✅ | setInstrumentData |
| 故障信息 | malfunctionInfo | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 维护信息 | maintenanceInfo | ✅ | ✅ | ✅ | setMaintenanceInfo |
| 单位设置 | unit | ✅ | ✅ | ✅ | setUnit |

#### 数据类型

```typescript
interface InstrumentData {
  malfunctionInfo: Record<number, number>;  // 故障信息 Map<code, state>
  alarmBuzzleState: number;                 // 报警蜂鸣器状态 0:关闭 1:开启
  unit: Record<number, number>;             // 单位设置 Map<type, value>
  maintenanceInfo: Record<number, number>;   // 维护信息 Map<type, value>
  externalChargingPower: number;            // 外部充电功率 (kW)
}
```

#### 特殊方法

| 方法名 | 参数类型 | 说明 |
|--------|---------|------|
| setUnit | `{ unitName: number; unitValue: number }` | 设置单位 |
| setMaintenanceInfo | `{ typeName: number; infoValue: number }` | 设置保养信息 |

#### 使用示例

```typescript
// 获取仪表数据
const instrumentData = await vehicle.instrument.get();

// 启用仪表监听
vehicle.instrument.enableListener();

// 监听仪表数据变化
vehicle.on('instrument', (data) => {
  console.log(data.externalChargingPower);
});

// 设置单位
await vehicle.instrument.setUnit({ unitName: 0, unitValue: 1 });

// 设置保养信息
await vehicle.instrument.setMaintenanceInfo({ typeName: 0, infoValue: 5000 });
```

---

### 4. 空调类 (ac) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/ac_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/acService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 压缩机状态 | acCompressorMode | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 压缩机手动标志 | acCompressorManualSign | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 风量手动标志 | acWindLevelManualSign | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 出风模式手动标志 | acWindModeManualSign | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 空调开启状态 | acStartState | ✅ | ✅ | ✅ | start/stop |
| 控制方式 | acControlMode | ✅ | ✅ | ✅ | setControlMode |
| 循环方式 | acCycleMode | ✅ | ✅ | ✅ | setCycleMode |
| 出风模式 | acWindMode | ✅ | ✅ | ✅ | setWindMode |
| 前除霜状态 | acDefrostStateFront | ✅ | ✅ | ✅ | setDefrostState |
| 后除霜状态 | acDefrostStateRear | ✅ | ✅ | ✅ | setDefrostState |
| 风量档位 | acWindLevel | ✅ | ✅ | ✅ | setWindLevel |
| 主驾驶温度 | acTemperatureMain | ✅ | ✅ | ✅ | setTemperature + onTemperatureChanged |
| 副驾驶温度 | acTemperatureDeputy | ✅ | ✅ | ✅ | setTemperature + onTemperatureChanged |
| 后空调温度 | acTemperatureRear | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 车外温度 | acTemperatureOut | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 温度单位 | temperatureUnit | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 温度分控方式 | acTemperatureControlMode | ✅ | ✅ | ⚠️不支持 | 无监听回调 |
| 通风状态 | acVentilationState | ✅ | ✅ | ✅ | setVentilationState |
| 后空调开启状态 | rearAcStartState | ✅ | ⚠️不支持 | ✅ | 无SET方法 |

#### 数据类型

```typescript
interface AcData {
  acCompressorMode: number;           // 压缩机状态 0:关闭 1:开启
  acCompressorManualSign: number;     // 压缩机手动标志 0:自动 1:手动
  acWindLevelManualSign: number;       // 风量手动标志 0:自动 1:手动
  acWindModeManualSign: number;       // 出风模式手动标志 0:自动 1:手动
  acStartState: number;               // 空调开启状态 0:关闭 1:开启
  acControlMode: number;              // 控制方式 0:手动 1:自动
  acCycleMode: number;                // 循环方式 0:外循环 1:内循环
  acWindMode: number;                // 出风模式 1-7
  acDefrostStateFront: number;        // 前除霜状态 0:关闭 1:开启
  acDefrostStateRear: number;        // 后除霜状态 0:关闭 1:开启
  acWindLevel: number;                // 风量档位 0-7
  acTemperatureMain: number;          // 主驾驶温度 ℃:17-33 ℉:64-91
  acTemperatureDeputy: number;         // 副驾驶温度 ℃:17-33 ℉:64-91
  acTemperatureRear: number;          // 后空调温度 ℃:17-33 ℉:64-91
  acTemperatureOut: number;           // 车外温度 ℃:-40-50 ℉:-40-122
  temperatureUnit: number;           // 温度单位 0:℉ 1:℃
  acTemperatureControlMode: number;    // 温度分控方式 0:不分控 1:分控
  acVentilationState: number;         // 通风状态 0:关闭 1:开启
  rearAcStartState: number;           // 后空调开启状态 0:关闭 1:开启
}
```

#### 设置字段详情

| 方法名 | 参数类型 | 说明 |
|--------|---------|------|
| setControlMode | `{ setSource?: number; value: 0|1 }` | 控制方式 |
| setCycleMode | `{ setSource?: number; value: 0|1 }` | 循环方式 |
| setWindMode | `{ setSource?: number; value: 1-7 }` | 出风模式 |
| setDefrostState | `{ setSource?: number; area: 0|1; value: 0|1 }` | 除霜状态 |
| setWindLevel | `{ setSource?: number; level: 0-7 }` | 风量档位 |
| setTemperature | `{ setSource?: number; area: 'main'|'deputy'|'rear'; value: number; unit?: 0|1 }` | 温度 |
| setTemperatureControlMode | `{ setSource?: number; value: 0|1 }` | 温度分控 |
| setVentilationState | `{ setSource?: number; value: 0|1 }` | 通风状态 |
| start | `{ setSource?: number }` (可选) | 开启空调 |
| stop | `{ setSource?: number }` (可选) | 关闭空调 |
| startRearAc | `{ setSource?: number }` (可选) | 开启后空调 |
| stopRearAc | `{ setSource?: number }` (可选) | 关闭后空调 |

#### 使用示例

```typescript
// 获取空调数据
const acData = await vehicle.ac.get();

// 启用空调监听
vehicle.ac.enableListener();

// 监听空调变化
vehicle.on('ac', (data) => {
  console.log(data.acStartState);
});

// 开启空调
await vehicle.ac.start();

// 关闭空调
await vehicle.ac.stop();

// 设置主驾驶温度为25℃
await vehicle.ac.setTemperature({ area: 'main', value: 25 });

// 设置风量为3档
await vehicle.ac.setWindLevel({ level: 3 });

// 设置内循环
await vehicle.ac.setCycleMode({ value: 1 });

// 开启前除霜
await vehicle.ac.setDefrostState({ area: 0, value: 1 });
```

---

### 5. 门锁类 (door) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/door_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/doorService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 左前门锁 | leftFront | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后门锁 | leftRear | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前门锁 | rightFront | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后门锁 | rightRear | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 后备箱门锁 | back | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左儿童锁 | childlockLeft | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右儿童锁 | childlockRight | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface DoorData {
  leftFront: number;      // 左前门锁 0:未锁 1:已锁
  leftRear: number;       // 左后门锁 0:未锁 1:已锁
  rightFront: number;     // 右前门锁 0:未锁 1:已锁
  rightRear: number;      // 右后门锁 0:未锁 1:已锁
  back: number;           // 后备箱门锁 0:未锁 1:已锁
  childlockLeft: number;   // 左儿童锁 0:关闭 1:开启
  childlockRight: number;  // 右儿童锁 0:关闭 1:开启
}
```

#### 使用示例

```typescript
// 获取门锁数据
const doorData = await vehicle.door.get();

// 启用门锁监听
vehicle.door.enableListener();

// 监听门锁数据变化
vehicle.on('door', (data) => {
  console.log(data.leftFront);
});
```

---

### 6. 车辆设置类 (vehicle_setting) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/vehicle_setting_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/vehicleSettingService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 车辆类型名称 | vehicleTypeName | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 内饰照明灯 | innerIlluminationLight | ✅ | ✅ | ✅ | setVehicleSettingData |
| 能量回收模式 | energyRecoveryMode | ✅ | ✅ | ✅ | setVehicleSettingData |
| 方向盘模式 | steeringWheelMode | ✅ | ✅ | ✅ | setVehicleSettingData |
| 充电枪锁状态 | chargeGunLock | ✅ | ✅ | ✅ | setVehicleSettingData |
| 行车守卫 | drivingGuard | ✅ | ✅ | ✅ | setVehicleSettingData |
| 迎宾灯 | welcomeLight | ✅ | ✅ | ✅ | setVehicleSettingData |
| 氛围灯 | atmosphereLight | ✅ | ✅ | ✅ | setVehicleSettingData |
| 钥匙快捷充电 | keyQuickCharge | ✅ | ✅ | ✅ | setVehicleSettingData |
| 整车电源 | vehiclePower | ✅ | ✅ | ✅ | setVehicleSettingData |
| 方向盘加热 | steeringWheelHeat | ✅ | ✅ | ✅ | setVehicleSettingData |
| 座椅通风 | seatVentilation | ✅ | ✅ | ✅ | setVehicleSettingData |
| 座椅加热 | seatHeating | ✅ | ✅ | ✅ | setVehicleSettingData |
| 行车警示音 | drivingWarningSound | ✅ | ✅ | ✅ | setVehicleSettingData |
| 外放电功能 | external DischargePower | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 快速充电 | fastCharge | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 方向盘自定义 | steeringWheelCustom | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 单次续航里程 | singleDrivingRange | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 强制EV模式 | forceEvMode | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 最大充电电流 | maxChargeCurrent | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 预约充电时间 | scheduledChargeTime | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 驾驶模式 | drivingMode | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 方向盘灵敏度 | steeringSensitivity | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 智能 limit | smartLimit | ✅ | ⚠️不支持 | ✅ | 无SET方法 |

#### 数据类型

```typescript
interface VehicleSettingData {
  vehicleTypeName: string;           // 车辆类型名称
  innerIlluminationLight: number;     // 内饰照明灯 0:关闭 1:开启
  energyRecoveryMode: number;         // 能量回收模式 0:关闭 1:标准 2:高
  steeringWheelMode: number;          // 方向盘模式 0:舒适 1:运动
  chargeGunLock: number;              // 充电枪锁状态 0:解锁 1:锁定
  drivingGuard: number;               // 行车守卫 0:关闭 1:开启
  welcomeLight: number;               // 迎宾灯 0:关闭 1:开启
  atmosphereLight: number;            // 氛围灯 0:关闭 1:开启
  keyQuickCharge: number;            // 钥匙快捷充电 0:关闭 1:开启
  vehiclePower: number;               // 整车电源 0:OFF 1:ON 2:START
  steeringWheelHeat: number;         // 方向盘加热 0:关闭 1-3:档位
  seatVentilation: number;           // 座椅通风 0:关闭 1-3:档位
  seatHeating: number;               // 座椅加热 0:关闭 1-3:档位
  drivingWarningSound: number;       // 行车警示音 0:关闭 1:开启
  externalDischargePower: number;     // 外放电功能 0:关闭 1:开启
  fastCharge: number;                // 快速充电 0:关闭 1:开启
  steeringWheelCustom: number;        // 方向盘自定义 0:关闭 1:开启
  singleDrivingRange: number;         // 单次续航里程 (km)
  forceEvMode: number;               // 强制EV模式 0:关闭 1:开启
  maxChargeCurrent: number;          // 最大充电电流 (A)
  scheduledChargeTime: number;       // 预约充电时间 (分钟)
  drivingMode: number;               // 驾驶模式 0:经济 1:运动 2:雪地
  steeringSensitivity: number;        // 方向盘灵敏度 0:舒适 1:标准 2:运动
  smartLimit: number;                // 智能限速 0:关闭 1:开启
}
```

#### 特殊方法

| 方法名 | 参数类型 | 说明 |
|--------|---------|------|
| hasFeature | `{ feature: string }` | 检查车辆是否具有特定功能 |

#### 使用示例

```typescript
// 获取车辆设置数据
const vehicleSettingData = await vehicle.vehicleset.get();

// 启用车辆设置监听
vehicle.vehicleset.enableListener();

// 监听车辆设置数据变化
vehicle.on('vehicleset', (data) => {
  console.log(data.vehiclePower);
});

// 检查车辆是否具有外放电功能
const hasDischarge = await vehicle.vehicleset.hasFeature('externalDischargePower');

// 设置能量回收模式为高
await vehicle.vehicleset.set('energyRecoveryMode', 2);

// 开启迎宾灯
await vehicle.vehicleset.set('welcomeLight', 1);
```

---

### 7. 发动机类 (engine) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/engine_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/engineService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 发动机排量 | engineDisplacement | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 发动机型号 | engineCode | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 发动机功率 | enginePower | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 发动机转速 | engineSpeed | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 发动机冷却液液位 | engineCoolantLevel | ✅ | ⚠️不支持 | ✅ | 无SET方法 |
| 机油液位 | oilLevel | ✅ | ⚠️不支持 | ✅ | 无SET方法 |

#### 数据类型

```typescript
interface EngineData {
  engineDisplacement: number;     // 发动机排量 (L)
  engineCode: string;             // 发动机型号
  enginePower: number;            // 发动机功率 (kW)
  engineSpeed: number;            // 发动机转速 (rpm)
  engineCoolantLevel: number;     // 发动机冷却液液位 0-100 (%)
  oilLevel: number;               // 机油液位 0-100 (%)
}
```

#### 使用示例

```typescript
// 获取发动机数据
const engineData = await vehicle.engine.get();

// 启用发动机监听
vehicle.engine.enableListener();

// 监听发动机数据变化
vehicle.on('engine', (data) => {
  console.log(data.engineSpeed);
});
```

---

### 8. 全景、摄像头类 (camera) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/panorama_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/panoramaService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 前视图 | frontView | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 后视图 | rearView | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左侧视图 | leftSideView | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右侧视图 | rightSideView | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 俯视图 | overheadView | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 全景视图 | panoramicView | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 摄像头模式 | cameraMode | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 摄像头状态 | cameraStatus | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface PanoramaData {
  frontView: number;          // 前视图 0:关闭 1:开启
  rearView: number;           // 后视图 0:关闭 1:开启
  leftSideView: number;       // 左侧视图 0:关闭 1:开启
  rightSideView: number;      // 右侧视图 0:关闭 1:开启
  overheadView: number;        // 俯视图 0:关闭 1:开启
  panoramicView: number;       // 全景视图 0:关闭 1:开启
  cameraMode: number;          // 摄像头模式 0:2D 1:3D
  cameraStatus: number;        // 摄像头状态 0:关闭 1:开启
}
```

#### 使用示例

```typescript
// 获取全景摄像头数据
const panoramaData = await vehicle.panorama.get();

// 启用全景摄像头监听
vehicle.panorama.enableListener();

// 监听全景摄像头数据变化
vehicle.on('panorama', (data) => {
  console.log(data.cameraMode);
});
```

---

### 9. 传感器类 (sensor) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/sensor_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/sensorService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 光照强度 | lightIntensity | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface SensorData {
  lightIntensity: number;  // 光照强度
}
```

#### 使用示例

```typescript
// 获取传感器数据
const sensorData = await vehicle.sensor.get();
console.log('光照强度:', sensorData.lightIntensity);

// 启用传感器监听
vehicle.sensor.enableListener();

// 监听传感器数据变化
vehicle.on('sensor', (data) => {
  console.log('光照强度变化:', data.lightIntensity);
});
```

---

### 10. 时间类 (time) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/time_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/timeService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 年份 | year | ✅ | ✅ | ✅ | 可通过setDate设置 |
| 月份 | month | ✅ | ✅ | ✅ | 可通过setDate设置 |
| 日期 | day | ✅ | ✅ | ✅ | 可通过setDate设置 |
| 小时 | hour | ✅ | ✅ | ✅ | 可通过setTime设置 |
| 分钟 | minute | ✅ | ✅ | ✅ | 可通过setTime设置 |
| 秒 | second | ✅ | ✅ | ✅ | 可通过setTime设置 |
| 时间格式 | timeFormat | ✅ | ✅ | ✅ | 可通过setTimeFormat设置 |

#### 特殊方法

| 方法名 | 参数类型 | 说明 |
|--------|---------|------|
| setDate | `{ year: number, month: number, day: number, weekday: number }` | 设置日期和星期 |
| setTime | `{ hour: number, minute: number, second: number }` | 设置时间 |
| setTimeFormat | `{ value: number }` | 设置时间格式（0=12小时, 1=24小时） |

#### 数据类型

```typescript
interface TimeData {
  year: number;        // 年份
  month: number;       // 月份 1-12
  day: number;         // 日期 1-31
  hour: number;        // 小时 0-23
  minute: number;      // 分钟 0-59
  second: number;      // 秒 0-59
  timeFormat: number;  // 时间格式 0:12小时 1:24小时
}
```

#### 使用示例

```typescript
// 获取时间数据
const timeData = await vehicle.time.get();
console.log(`${timeData.year}-${timeData.month}-${timeData.day} ${timeData.hour}:${timeData.minute}`);

// 启用时间监听
vehicle.time.enableListener();

// 监听时间变化
vehicle.on('time', (data) => {
  console.log('时间更新:', data);
});

// 设置日期
await vehicle.time.setDate({ year: 2024, month: 6, day: 15, weekday: 5 });

// 设置时间
await vehicle.time.setTime({ hour: 14, minute: 30, second: 0 });

// 设置时间格式为24小时制
await vehicle.time.setTimeFormat({ value: 1 });
```

---

### 11. 能量、模式类 (energy_mode) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/energy_mode_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/energyModeService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 能量模式 | energyMode | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 运行模式 | operationMode | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 发电状态 | powerGenerationState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 发电数值 | powerGenerationValue | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 路面模式 | roadSurfaceMode | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface EnergyModeData {
  energyMode: number;           // 能量模式
  operationMode: number;        // 运行模式
  powerGenerationState: number; // 发电状态
  powerGenerationValue: number; // 发电数值
  roadSurfaceMode: number;      // 路面模式
}
```

#### 使用示例

```typescript
// 获取能量模式数据
const energyModeData = await vehicle.energyMode.get();
console.log('当前能量模式:', energyModeData.energyMode);

// 启用能量模式监听
vehicle.energyMode.enableListener();

// 监听能量模式变化
vehicle.on('energyMode', (data) => {
  console.log('能量模式更新:', data);
});
```

---

### 12. 雷达类 (radar) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/radar_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/radarService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 左前雷达 | leftFront | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前雷达 | rightFront | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后雷达 | leftRear | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后雷达 | rightRear | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左雷达 | left | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右雷达 | right | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 前左中雷达 | frontLeftMid | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 前右中雷达 | frontRightMid | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 倒车雷达开关 | reverseRadarSwitch | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface RadarData {
  leftFront: number;          // 左前雷达距离
  rightFront: number;         // 右前雷达距离
  leftRear: number;           // 左后雷达距离
  rightRear: number;          // 右后雷达距离
  left: number;               // 左雷达距离
  right: number;              // 右雷达距离
  frontLeftMid: number;       // 前左中雷达距离
  frontRightMid: number;      // 前右中雷达距离
  reverseRadarSwitch: number; // 倒车雷达开关
}
```

#### 使用示例

```typescript
// 获取雷达数据
const radarData = await vehicle.radar.get();
console.log('左前雷达距离:', radarData.leftFront);

// 启用雷达监听
vehicle.radar.enableListener();

// 监听雷达数据变化
vehicle.on('radar', (data) => {
  console.log('雷达数据更新:', data);
});
```

---

### 13. 轮胎类 (tyre) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/tyre_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/tyreService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 左前胎压 | tyrePressureLf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前胎压 | tyrePressureRf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后胎压 | tyrePressureLr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后胎压 | tyrePressureRr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左前漏气状态 | tyreAirLeakStateLf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前漏气状态 | tyreAirLeakStateRf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后漏气状态 | tyreAirLeakStateLr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后漏气状态 | tyreAirLeakStateRr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 胎压电池状态 | tyreBatteryState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 胎压系统状态 | tyreSystemState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 胎压温度状态 | tyreTemperatureState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左前信号状态 | tyreSignalStateLf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前信号状态 | tyreSignalStateRf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后信号状态 | tyreSignalStateLr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后信号状态 | tyreSignalStateRr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface TyreData {
  tyrePressureLf: number;      // 左前胎压
  tyrePressureRf: number;      // 右前胎压
  tyrePressureLr: number;      // 左后胎压
  tyrePressureRr: number;      // 右后胎压
  tyreAirLeakStateLf: number;  // 左前漏气状态
  tyreAirLeakStateRf: number;  // 右前漏气状态
  tyreAirLeakStateLr: number;  // 左后漏气状态
  tyreAirLeakStateRr: number;  // 右后漏气状态
  tyreBatteryState: number;    // 胎压电池状态
  tyreSystemState: number;     // 胎压系统状态
  tyreTemperatureState: number;// 胎压温度状态
  tyreSignalStateLf: number;   // 左前信号状态
  tyreSignalStateRf: number;   // 右前信号状态
  tyreSignalStateLr: number;   // 左后信号状态
  tyreSignalStateRr: number;   // 右后信号状态
}
```

#### 使用示例

```typescript
// 获取轮胎数据
const tyreData = await vehicle.tyre.get();
console.log('左前胎压:', tyreData.tyrePressureLf);

// 启用轮胎监听
vehicle.tyre.enableListener();

// 监听轮胎数据变化
vehicle.on('tyre', (data) => {
  console.log('轮胎数据更新:', data);
});
```

---

### 14. 空气质量类 (air_quality) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/air_quality_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/airQualityService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| PM2.5在线状态 | pm25OnlineState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车内PM2.5检测状态 | pm25CheckStateIn | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车外PM2.5检测状态 | pm25CheckStateOut | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车内PM2.5等级 | pm25LevelIn | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车外PM2.5等级 | pm25LevelOut | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车内PM2.5数值 | pm25ValueIn | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车外PM2.5数值 | pm25ValueOut | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface AirQualityData {
  pm25OnlineState: number;   // PM2.5在线状态
  pm25CheckStateIn: number; // 车内PM2.5检测状态
  pm25CheckStateOut: number;// 车外PM2.5检测状态
  pm25LevelIn: number;      // 车内PM2.5等级
  pm25LevelOut: number;     // 车外PM2.5等级
  pm25ValueIn: number;      // 车内PM2.5数值
  pm25ValueOut: number;     // 车外PM2.5数值
}
```

#### 使用示例

```typescript
// 获取空气质量数据
const airQualityData = await vehicle.airQuality.get();
console.log('车内PM2.5:', airQualityData.pm25ValueIn);

// 启用空气质量监听
vehicle.airQuality.enableListener();

// 监听空气质量变化
vehicle.on('airQuality', (data) => {
  console.log('空气质量更新:', data);
});
```

---

### 15. 充电类 (charge) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/charge_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/chargeService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 充电器故障状态 | chargerFaultState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电器工作状态 | chargerWorkState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电容量 | chargingCapacity | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电类型 | chargingType | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 剩余充电小时 | chargingRestTimeHour | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 剩余充电分钟 | chargingRestTimeMinute | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 交流充电容量状态 | chargingCapStateAc | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 直流充电容量状态 | chargingCapStateDc | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电口锁回位状态 | chargingPortLockRebackState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 放电请求状态 | dischargeRequestState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电器状态 | chargerState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电枪状态 | chargingGunState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电功率 | chargingPower | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 电池管理设备状态 | batteryManagementDeviceState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 预约充电启用状态 | chargingScheduleEnableState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 预约充电状态 | chargingScheduleState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 充电枪未插入状态 | chargingGunNotInsertedState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 预约充电时间小时 | chargingScheduleTimeHour | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 预约充电时间分钟 | chargingScheduleTimeMinute | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface ChargeData {
  chargerFaultState: number;               // 充电器故障状态
  chargerWorkState: number;                // 充电器工作状态
  chargingCapacity: number;                // 充电容量
  chargingType: number;                    // 充电类型
  chargingRestTimeHour: number;            // 剩余充电小时
  chargingRestTimeMinute: number;          // 剩余充电分钟
  chargingCapStateAc: number;              // 交流充电容量状态
  chargingCapStateDc: number;              // 直流充电容量状态
  chargingPortLockRebackState: number;     // 充电口锁回位状态
  dischargeRequestState: number;           // 放电请求状态
  chargerState: number;                    // 充电器状态
  chargingGunState: number;                // 充电枪状态
  chargingPower: number;                   // 充电功率
  batteryManagementDeviceState: number;    // 电池管理设备状态
  chargingScheduleEnableState: number;     // 预约充电启用状态
  chargingScheduleState: number;           // 预约充电状态
  chargingGunNotInsertedState: number;     // 充电枪未插入状态
  chargingScheduleTimeHour: number;        // 预约充电时间小时
  chargingScheduleTimeMinute: number;      // 预约充电时间分钟
}
```

#### 使用示例

```typescript
// 获取充电数据
const chargeData = await vehicle.charge.get();
console.log('充电状态:', chargeData.chargerState);
console.log('充电功率:', chargeData.chargingPower);

// 启用充电监听
vehicle.charge.enableListener();

// 监听充电数据变化
vehicle.on('charge', (data) => {
  console.log('充电数据更新:', data);
});
```

---

### 16. 媒体中心类 (media) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/media_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/mediaService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 媒体类型 | mediaType | ✅ | ✅ | ✅ | 可通过controlMedia设置 |
| 播放模式 | playMode | ✅ | ✅ | ✅ | 可通过controlMedia设置 |
| 播放状态 | playState | ✅ | ✅ | ✅ | 可通过controlMedia设置 |
| 文件名 | fileName | ✅ | ✅ | ✅ | 可通过controlMedia设置 |
| 艺术家名 | artistName | ✅ | ✅ | ✅ | 可通过controlMedia设置 |
| 专辑名 | albumName | ✅ | ✅ | ✅ | 可通过controlMedia设置 |

#### 特殊方法

| 方法名 | 参数类型 | 说明 |
|--------|---------|------|
| controlMedia | `{ type: number, value: number }` | 控制媒体播放 |

#### 数据类型

```typescript
interface MediaData {
  mediaType: number;   // 媒体类型
  playMode: number;    // 播放模式
  playState: number;   // 播放状态
  fileName: string;    // 文件名
  artistName: string;  // 艺术家名
  albumName: string;   // 专辑名
}
```

#### 使用示例

```typescript
// 获取媒体数据
const mediaData = await vehicle.media.get();
console.log('当前播放:', mediaData.fileName);
console.log('艺术家:', mediaData.artistName);

// 启用媒体监听
vehicle.media.enableListener();

// 监听媒体数据变化
vehicle.on('media', (data) => {
  console.log('媒体数据更新:', data);
});

// 控制媒体播放
await vehicle.media.controlMedia({ type: 1, value: 1 });
```

---

### 17. 车身状态类 (body_status) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/body_status_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/bodyStatusService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| VIN码 | autoVIN | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车型名称 | autoModelName | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 车辆系统状态 | autoSystemState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左前门状态 | doorStateLf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前门状态 | doorStateRf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后门状态 | doorStateLr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后门状态 | doorStateRr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 引擎盖状态 | doorStateHood | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 后备箱状态 | doorStateLuggage | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左前窗状态 | windowStateLf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右前窗状态 | windowStateRf | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左后窗状态 | windowStateLr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右后窗状态 | windowStateRr | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 天窗百分比 | moonRoofPercent | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 遮阳帘百分比 | sunshadePercent | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 电池电压等级 | batteryVoltageLevel | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 电量等级 | powerLevel | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 方向盘角度 | steeringWheelAngle | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 方向盘速度 | steeringWheelSpeed | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 油电低电量 | fuelElecLowPower | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 报警状态 | alarmState | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 天窗配置 | moonRoofConfig | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface BodyStatusData {
  autoVIN: string;                // VIN码
  autoModelName: number;          // 车型名称
  autoSystemState: number;        // 车辆系统状态
  doorStateLf: number;            // 左前门状态
  doorStateRf: number;            // 右前门状态
  doorStateLr: number;            // 左后门状态
  doorStateRr: number;            // 右后门状态
  doorStateHood: number;          // 引擎盖状态
  doorStateLuggage: number;       // 后备箱状态
  windowStateLf: number;          // 左前窗状态
  windowStateRf: number;          // 右前窗状态
  windowStateLr: number;          // 左后窗状态
  windowStateRr: number;          // 右后窗状态
  moonRoofPercent: number;        // 天窗百分比
  sunshadePercent: number;        // 遮阳帘百分比
  batteryVoltageLevel: number;    // 电池电压等级
  powerLevel: number;             // 电量等级
  steeringWheelAngle: number;     // 方向盘角度
  steeringWheelSpeed: number;     // 方向盘速度
  fuelElecLowPower: number;       // 油电低电量
  alarmState: number;             // 报警状态
  moonRoofConfig: number;         // 天窗配置
}
```

#### 使用示例

```typescript
// 获取车身状态数据
const bodyStatusData = await vehicle.bodyStatus.get();
console.log('左前门状态:', bodyStatusData.doorStateLf);
console.log('电量等级:', bodyStatusData.powerLevel);

// 启用车身状态监听
vehicle.bodyStatus.enableListener();

// 监听车身状态变化
vehicle.on('bodyStatus', (data) => {
  console.log('车身状态更新:', data);
});
```

---

### 18. 车灯类 (light) ✅

**Flutter 端**：`flutter_bridge/lib/src/services/vehicle/light_service.dart`
**Android 端**：`android/app/src/main/kotlin/club/aiiko/trip/BYDAutoVehicleService.kt`
**前端**：`web/plugins/nyanyaWebJsBridge/vehicle/lightService.ts`

#### 参数实现情况

| 参数名称 | 字段名 | GET | SET | LISTENER | 备注 |
|---------|--------|-----|-----|----------|------|
| 自动大灯状态 | lightAutoStatus | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 示廓灯状态 | lightSide | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 近光灯状态 | lightLowBeam | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 远光灯状态 | lightHighBeam | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 左转向灯状态 | lightLeftTurnSignal | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 右转向灯状态 | lightRightTurnSignal | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 前雾灯状态 | lightFrontFog | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 后雾灯状态 | lightRearFog | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| 脚灯状态 | lightFoot | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |
| AFS开关 | afsSwitch | ✅ | ⚠️不支持 | ✅ | 文档中无set方法 |

#### 数据类型

```typescript
interface LightData {
  lightAutoStatus: number;       // 自动大灯状态
  lightSide: number;             // 示廓灯状态
  lightLowBeam: number;          // 近光灯状态
  lightHighBeam: number;         // 远光灯状态
  lightLeftTurnSignal: number;   // 左转向灯状态
  lightRightTurnSignal: number;  // 右转向灯状态
  lightFrontFog: number;         // 前雾灯状态
  lightRearFog: number;          // 后雾灯状态
  lightFoot: number;             // 脚灯状态
  afsSwitch: number;             // AFS开关
}
```

#### 使用示例

```typescript
// 获取车灯数据
const lightData = await vehicle.light.get();
console.log('近光灯状态:', lightData.lightLowBeam);
console.log('自动大灯状态:', lightData.lightAutoStatus);

// 启用车灯监听
vehicle.light.enableListener();

// 监听车灯状态变化
vehicle.on('light', (data) => {
  console.log('车灯状态更新:', data);
});
```

---

## 变更记录

| 日期 | 分类 | 变更内容 |
|------|------|---------|
| 2026-05-27 | 车速类 (speed) | 初始实现：get()、enableListener()，3个参数 |
| 2026-05-27 | 空调类 (ac) | 完整实现：get()、enableListener()、set()，19个参数，含14个监听回调 |
| 2026-06-03 | 行驶数据类型 (statistic) | 完整实现：get()、enableListener()、set()，13个参数 |
| 2026-06-03 | 仪表类 (instrument) | 完整实现：get()、enableListener()、set()，5个参数，含特殊方法setUnit/setMaintenanceInfo |
| 2026-06-03 | 门锁类 (door) | 完整实现：get()、enableListener()、set()，7个参数 |
| 2026-06-03 | 车辆设置类 (vehicle_setting) | 完整实现：get()、enableListener()、set()，24个参数，含特殊方法hasFeature |
| 2026-06-03 | 发动机类 (engine) | 完整实现：get()、enableListener()、set()，6个参数 |
| 2026-06-03 | 全景、摄像头类 (camera) | 完整实现：get()、enableListener()、set()，8个参数 |
| 2026-06-03 | 传感器类 (sensor) | 完整实现：get()、enableListener()、set()，1个参数 |
| 2026-06-03 | 时间类 (time) | 完整实现：get()、enableListener()、set()，7个参数 |
| 2026-06-03 | 能量、模式类 (energy_mode) | 完整实现：get()、enableListener()、set()，5个参数 |
| 2026-06-03 | 雷达类 (radar) | 完整实现：get()、enableListener()、set()，9个参数 |
| 2026-06-03 | 轮胎类 (tyre) | 完整实现：get()、enableListener()、set()，15个参数 |
| 2026-06-03 | 空气质量类 (air_quality) | 完整实现：get()、enableListener()、set()，7个参数 |
| 2026-06-03 | 充电类 (charge) | 完整实现：get()、enableListener()、set()，19个参数 |
| 2026-06-03 | 媒体中心类 (media) | 完整实现：get()、enableListener()、set()，6个参数 |
| 2026-06-03 | 车身状态类 (body_status) | 完整实现：get()、enableListener()、set()，22个参数 |
| 2026-06-03 | 车灯类 (light) | 完整实现：get()、enableListener()、set()，10个参数 |

---

## 开发文档路径

所有开发文档位于：
```
trip-route-track-flutter-app/modules/bydauto/开发文档目录/
```

| 文件名 | 对应分类 | 分类标识 |
|--------|---------|---------|
| 车速类.md | 车速类 | speed |
| 行驶数据类型.md | 行驶数据类型 | statistic |
| 仪表类.md | 仪表类 | instrument |
| 空调类.md | 空调类 | ac |
| 门锁类.md | 门锁类 | door |
| 车辆设置类.md | 车辆设置类 | vehicle_setting |
| 发动机类.md | 发动机类 | engine |
| 全景、 摄像头类.md | 全景摄像头类 | camera |
| 传感器类.md | 传感器类 | sensor |
| 时间类.md | 时间类 | time |
| 能量、模式类.md | 能量模式类 | energy_mode |
| 雷达类.md | 雷达类 | radar |
| 轮胎类.md | 轮胎类 | tyre |
| 空气质量类.md | 空气质量类 | air_quality |
| 充电类.md | 充电类 | charge |
| 媒体中心类.md | 媒体中心类 | media |
| 车身状态类.md | 车身状态类 | body_status |
| 车灯类.md | 车灯类 | light |
