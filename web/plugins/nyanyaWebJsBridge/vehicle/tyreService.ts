import { NEventListener } from '@nyanyajs/utils';
import type { TyreData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 轮胎类服务
 * @description 提供轮胎数据的获取和监听接口
 * @example
 * // 获取轮胎数据
 * const data = await vehicle.tyre.get();
 *
 * // 启用轮胎监听
 * vehicle.tyre.enableListener();
 *
 * // 监听轮胎变化
 * vehicle.on('tyre', (data) => {
 *   console.log(data.tyrePressureValues, data.tyrePressureStates);
 * });
 */
export class TyreService extends NEventListener<{
  /** 轮胎数据变化事件 */
  tyreChanged: TyreData;
}> {
  /** 分类名称 */
  readonly category: 'tyre' = 'tyre';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的轮胎数据
   */
  private setupListener(): void {
    this.bridge.on('tyre', (data: TyreData) => {
      this.dispatch('tyreChanged', data);
    });
  }

  /**
   * 获取轮胎数据
   * @returns 轮胎数据对象
   * @example
   * const tyreData = await vehicle.tyre.get();
   * console.log(tyreData.tyreAirLeakStates); // 各轮胎漏气状态
   * console.log(tyreData.tyrePressureValues); // 各轮胎压力值
   * console.log(tyreData.tyrePressureStates); // 各轮胎压力状态
   * console.log(tyreData.tyreSystemState); // 胎压系统状态
   * console.log(tyreData.tyreTemperatureState); // 胎压系统温度状态
   * console.log(tyreData.tyreBatteryState); // 胎压系统电池电量状态
   */
  async get(): Promise<TyreData> {
    return this.bridge.sendMessageAwait<TyreData>('get', this.category);
  }

  /**
   * 启用/禁用轮胎监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，轮胎数据变化时会通过'tyre'事件推送给前端
   * @example
   * vehicle.tyre.enableListener(); // 启用监听
   * vehicle.tyre.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
