import { NEventListener } from '@nyanyajs/utils';
import type { AcData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 空调类服务
 * @description 提供空调数据的获取、监听和设置接口
 * @example
 * // 获取空调数据
 * const data = await vehicle.ac.get();
 *
 * // 启用空调监听
 * vehicle.ac.enableListener();
 *
 * // 监听空调变化
 * vehicle.on('ac', (data) => {
 *   console.log(data.acStartState);
 *   console.log(data.acTemperatureMain);
 * });
 *
 * // 设置空调温度
 * await vehicle.ac.set('acTemperature', {
 *   area: 'main',
 *   value: 25,
 *   unit: 0
 * });
 */
export class AcService extends NEventListener<{
  /** 空调数据变化事件 */
  acChanged: AcData;
}> {
  /** 分类名称 */
  readonly category: 'ac' = 'ac';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收 Flutter 推送的空调数据
   */
  private setupListener(): void {
    this.bridge.on('ac', (data: AcData) => {
      this.dispatch('acChanged', data);
    });
  }

  /**
   * 获取空调数据
   * @returns 空调数据对象
   * @example
   * const acData = await vehicle.ac.get();
   * console.log(acData.acStartState); // 空调开关状态 0=关 1=开
   * console.log(acData.acTemperatureMain); // 主驾驶温度
   */
  async get(): Promise<AcData> {
    return this.bridge.sendMessageAwait<AcData>('get', this.category);
  }

  /**
   * 启用/禁用空调监听
   * @param enabled 是否启用监听，默认 true
   * @description 启用后，空调数据变化时会通过 'ac' 事件推送给前端
   * @example
   * vehicle.ac.enableListener(); // 启用监听
   * vehicle.ac.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }

  /**
   * 设置空调控制方式
   * @param params 控制方式参数
   * @param params.setSource 设置来源，默认 1
   * @param params.value 控制方式 0=手动 1=自动
   * @returns 是否设置成功
   * @example
   * // 设置空调为自动模式
   * await vehicle.ac.setControlMode({ value: 1 });
   *
   * // 设置空调为手动模式
   * await vehicle.ac.setControlMode({ value: 0 });
   */
  async setControlMode(params: { setSource?: number; value: 0 | 1 }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acControlMode',
      value: params,
    });
  }

  /**
   * 设置空调循环方式
   * @param params 循环方式参数
   * @param params.setSource 设置来源，默认 1
   * @param params.value 循环方式 0=外循环 1=内循环
   * @returns 是否设置成功
   * @example
   * // 设置内循环
   * await vehicle.ac.setCycleMode({ value: 1 });
   *
   * // 设置外循环
   * await vehicle.ac.setCycleMode({ value: 0 });
   */
  async setCycleMode(params: { setSource?: number; value: 0 | 1 }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acCycleMode',
      value: params,
    });
  }

  /**
   * 设置空调出风模式
   * @param params 出风模式参数
   * @param params.setSource 设置来源，默认 1
   * @param params.value 出风模式 1=吹脸 2=吹脸脚 3=吹脚 4=吹脚除霜 5=除霜 6=吹脸除霜 7=自动
   * @returns 是否设置成功
   * @example
   * await vehicle.ac.setWindMode({ value: 1 }); // 吹脸模式
   */
  async setWindMode(params: { setSource?: number; value: 1 | 2 | 3 | 4 | 5 | 6 | 7 }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acWindMode',
      value: params,
    });
  }

  /**
   * 设置空调除霜状态
   * @param params 除霜状态参数
   * @param params.setSource 设置来源，默认 1
   * @param params.area 除霜区域 0=前 1=后
   * @param params.value 除霜状态 0=关闭 1=开启
   * @returns 是否设置成功
   * @example
   * // 开启前除霜
   * await vehicle.ac.setDefrostState({ area: 0, value: 1 });
   *
   * // 开启后除霜
   * await vehicle.ac.setDefrostState({ area: 1, value: 1 });
   */
  async setDefrostState(params: { setSource?: number; area: 0 | 1; value: 0 | 1 }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acDefrostState',
      value: params,
    });
  }

  /**
   * 设置空调风量档位
   * @param params 风量档位参数
   * @param params.setSource 设置来源，默认 1
   * @param params.level 风量档位 0-7
   * @returns 是否设置成功
   * @example
   * // 设置风量为3档
   * await vehicle.ac.setWindLevel({ level: 3 });
   */
  async setWindLevel(params: { setSource?: number; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acWindLevel',
      value: params,
    });
  }

  /**
   * 设置空调温度
   * @param params 温度参数
   * @param params.setSource 设置来源，默认 1
   * @param params.area 温度区域 'main'=主驾驶 'deputy'=副驾驶 'rear'=后空调
   * @param params.value 温度值 ℃:17-33 ℉:64-91
   * @param params.unit 温度单位 0=℉ 1=℃（可选）
   * @returns 是否设置成功
   * @example
   * // 设置主驾驶温度为25℃
   * await vehicle.ac.setTemperature({ area: 'main', value: 25 });
   *
   * // 设置副驾驶温度为26℃
   * await vehicle.ac.setTemperature({ area: 'deputy', value: 26 });
   *
   * // 设置后空调温度为24℃
   * await vehicle.ac.setTemperature({ area: 'rear', value: 24 });
   */
  async setTemperature(params: {
    setSource?: number;
    area: 'main' | 'deputy' | 'rear';
    value: number;
    unit?: 0 | 1;
  }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acTemperature',
      value: params,
    });
  }

  /**
   * 设置空调温度分控方式
   * @param params 温度分控参数
   * @param params.setSource 设置来源，默认 1
   * @param params.value 分控方式 0=不分控 1=分控
   * @returns 是否设置成功
   * @example
   * // 开启温度分控
   * await vehicle.ac.setTemperatureControlMode({ value: 1 });
   */
  async setTemperatureControlMode(
    params: { setSource?: number; value: 0 | 1 }
  ): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acTemperatureControlMode',
      value: params,
    });
  }

  /**
   * 设置空调通风状态
   * @param params 通风状态参数
   * @param params.setSource 设置来源，默认 1
   * @param params.value 通风状态 0=关闭 1=开启
   * @returns 是否设置成功
   * @example
   * // 开启通风
   * await vehicle.ac.setVentilationState({ value: 1 });
   */
  async setVentilationState(params: { setSource?: number; value: 0 | 1 }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'acVentilationState',
      value: params,
    });
  }

  /**
   * 开启空调
   * @param params 开启参数（可选）
   * @param params.setSource 设置来源，默认 1
   * @returns 是否设置成功
   * @example
   * await vehicle.ac.start();
   */
  async start(params?: { setSource?: number }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'start',
      value: params || { setSource: 1 },
    });
  }

  /**
   * 关闭空调
   * @param params 关闭参数（可选）
   * @param params.setSource 设置来源，默认 1
   * @returns 是否设置成功
   * @example
   * await vehicle.ac.stop();
   */
  async stop(params?: { setSource?: number }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'stop',
      value: params || { setSource: 1 },
    });
  }

  /**
   * 开启后空调
   * @param params 开启参数（可选）
   * @param params.setSource 设置来源，默认 1
   * @returns 是否设置成功
   * @example
   * await vehicle.ac.startRearAc();
   */
  async startRearAc(params?: { setSource?: number }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'startRearAc',
      value: params || { setSource: 1 },
    });
  }

  /**
   * 关闭后空调
   * @param params 关闭参数（可选）
   * @param params.setSource 设置来源，默认 1
   * @returns 是否设置成功
   * @example
   * await vehicle.ac.stopRearAc();
   */
  async stopRearAc(params?: { setSource?: number }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'stopRearAc',
      value: params || { setSource: 1 },
    });
  }
}