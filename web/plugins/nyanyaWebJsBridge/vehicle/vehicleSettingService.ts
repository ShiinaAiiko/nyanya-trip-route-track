import { NEventListener } from '@nyanyajs/utils';
import type { VehicleSettingData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 车辆设置功能字段枚举
 * @description 所有可用的 hasFeature 查询字段
 */
type VehicleSettingFeature = keyof VehicleSettingData;

/**
 * 车辆设置类服务
 * @description 提供车辆设置数据的获取、监听和查询接口
 * @example
 * // 获取车辆设置数据
 * const data = await vehicle.vehicleSetting.get();
 *
 * // 启用车辆设置监听
 * vehicle.vehicleSetting.enableListener();
 *
 * // 监听车辆设置变化
 * vehicle.on('vehicleset', (data) => {
 *   console.log(data.acBTWind, data.acTunnelCycle);
 * });
 *
 * // 查询是否有某功能
 * const has = await vehicle.vehicleSetting.hasFeature('acBTWind');
 */
export class VehicleSettingService extends NEventListener<{
  /** 车辆设置数据变化事件 */
  vehicleSettingChanged: VehicleSettingData;
}> {
  /** 分类名称 */
  readonly category: 'vehicleset' = 'vehicleset';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的车辆设置数据
   */
  private setupListener(): void {
    this.bridge.on('vehicleset', (data: VehicleSettingData) => {
      this.dispatch('vehicleSettingChanged', data);
    });
  }

  /**
   * 获取车辆设置数据
   * @returns 车辆设置数据对象
   * @example
   * const vehicleSettingData = await vehicle.vehicleSetting.get();
   * console.log(vehicleSettingData.acBTWind); // 蓝牙通话自动降风速
   * console.log(vehicleSettingData.energyFeedback); // 能量回馈强度
   */
  async get(): Promise<VehicleSettingData> {
    return this.bridge.sendMessageAwait<VehicleSettingData>('get', this.category);
  }

  /**
   * 启用/禁用车辆设置监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，车辆设置数据变化时会通过'vehicleset'事件推送给前端
   * @example
   * vehicle.vehicleSetting.enableListener(); // 启用监听
   * vehicle.vehicleSetting.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }

  /**
   * 查询是否有某功能
   * @param feature 功能名称
   * @returns 是否有该功能
   * @example
   * const has = await vehicle.vehicleSetting.hasFeature('acBTWind');
   */
  async hasFeature(feature: VehicleSettingFeature): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('hasFeature', {
      category: this.category,
      feature,
    });
  }

  /**
   * 设置蓝牙通话自动降风速
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setACBTWind(1); // 开启
   */
  async setACBTWind(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'acBTWind',
      value,
    });
  }

  /**
   * 设置进隧道自动内循环模式
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setACTunnelCycle(1); // 开启
   */
  async setACTunnelCycle(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'acTunnelCycle',
      value,
    });
  }

  /**
   * 设置驻车自动内循环
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setACPauseCycle(0); // 关闭
   */
  async setACPauseCycle(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'acPauseCycle',
      value,
    });
  }

  /**
   * 设置空调自动模式
   * @param value 0: 经济, 1: 舒适, 2: 智慧
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setACAutoAir(1); // 舒适模式
   */
  async setACAutoAir(value: 0 | 1 | 2): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'acAutoAir',
      value,
    });
  }

  /**
   * 设置PM2.5上电检测
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setPM25Power(1); // 开启
   */
  async setPM25Power(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'pm25Power',
      value,
    });
  }

  /**
   * 设置PM2.5开关门检测
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setPM25SwitchCheck(0); // 关闭
   */
  async setPM25SwitchCheck(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'pm25SwitchCheck',
      value,
    });
  }

  /**
   * 设置PM2.5 30分钟定时检测
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setPM25TimeCheck(0); // 关闭
   */
  async setPM25TimeCheck(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'pm25TimeCheck',
      value,
    });
  }

  /**
   * 设置能量回馈强度
   * @param value 0: 标准, 1: 较大
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setEnergyFeedback(1); // 较大回馈
   */
  async setEnergyFeedback(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'energyFeedback',
      value,
    });
  }

  /**
   * 设置SOC目标点
   * @param value 0-70
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setSOCTarget(50); // 50%
   */
  async setSOCTarget(value: number): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'socTarget',
      value,
    });
  }

  /**
   * 设置充电枪电锁工作模式
   * @param value 0: 停用防盗, 1: 启用防盗
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setChargingPort(1); // 启用防盗
   */
  async setChargingPort(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'chargingPort',
      value,
    });
  }

  /**
   * 设置外后视镜随动
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setAutoExternalRearMirrorFollowUp(1); // 开启
   */
  async setAutoExternalRearMirrorFollowUp(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'autoExternalRearMirrorFollowUp',
      value,
    });
  }

  /**
   * 设置开锁方式
   * @param value 0: 仅驾驶员侧, 1: 四门
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setLockOff(1); // 四门开锁
   */
  async setLockOff(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'lockOff',
      value,
    });
  }

  /**
   * 设置语言
   * @param value 0: 简体中文, 1: 繁体中文, 2: English, 3: 俄语, 4: 阿拉伯语
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setLanguage(0); // 简体中文
   */
  async setLanguage(value: 0 | 1 | 2 | 3 | 4): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'language',
      value,
    });
  }

  /**
   * 设置超速闭锁
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setOverspeedLock(1); // 开启
   */
  async setOverspeedLock(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'overspeedLock',
      value,
    });
  }

  /**
   * 设置转向助力模式
   * @param value 0: 舒适, 1: 运动
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setSteerAssis(0); // 舒适模式
   */
  async setSteerAssis(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'steerAssis',
      value,
    });
  }

  /**
   * 设置倒车外后视镜翻转
   * @param value 0: 关, 1: 记忆角度, 2: 固定角度
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setRearViewMirrorFlip(1); // 记忆角度
   */
  async setRearViewMirrorFlip(value: 0 | 1 | 2): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'rearViewMirrorFlip',
      value,
    });
  }

  /**
   * 设置驾驶员座椅自动回位
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setDriverSeatAutoReturn(1); // 开启
   */
  async setDriverSeatAutoReturn(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'driverSeatAutoReturn',
      value,
    });
  }

  /**
   * 设置转向盘位置自动恢复
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setSteerPositionAutoReturn(1); // 开启
   */
  async setSteerPositionAutoReturn(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'steerPositionAutoReturn',
      value,
    });
  }

  /**
   * 设置遥控升窗
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setRemoteControlUpwindowState(1); // 开启
   */
  async setRemoteControlUpwindowState(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'remoteControlUpwindowState',
      value,
    });
  }

  /**
   * 设置遥控降窗
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setRemoteControlDownwindowState(0); // 关闭
   */
  async setRemoteControlDownwindowState(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'remoteControlDownwindowState',
      value,
    });
  }

  /**
   * 设置锁车自动关窗
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setLockCarRiseWindow(0); // 关闭
   */
  async setLockCarRiseWindow(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'lockCarRiseWindow',
      value,
    });
  }

  /**
   * 设置长按微动开关闭锁升窗
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setMicroSwitchLockWindowState(1); // 开启
   */
  async setMicroSwitchLockWindowState(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'microSwitchLockWindowState',
      value,
    });
  }

  /**
   * 设置长按微动开关解锁降窗
   * @param value 0: 关, 1: 开
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setMicroSwitchUnlockWindowState(0); // 关闭
   */
  async setMicroSwitchUnlockWindowState(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'microSwitchUnlockWindowState',
      value,
    });
  }

  /**
   * 设置回家照明延时
   * @param value 0-60 (秒)，0表示关闭
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setBackHomeLightDelayValue(30); // 30秒
   */
  async setBackHomeLightDelayValue(value: number): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'backHomeLightDelayValue',
      value,
    });
  }

  /**
   * 设置离家照明延时
   * @param value 0-60 (秒)，0表示关闭
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setLeftHomeLightDelayValue(30); // 30秒
   */
  async setLeftHomeLightDelayValue(value: number): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'leftHomeLightDelayValue',
      value,
    });
  }

  /**
   * 设置后背门电动功能
   * @param value 0: 手动, 1: 电动
   * @returns 是否设置成功
   * @example
   * await vehicle.vehicleSetting.setBackDoorElectricMode(1); // 电动
   */
  async setBackDoorElectricMode(value: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      category: this.category,
      field: 'backDoorElectricMode',
      value,
    });
  }
}