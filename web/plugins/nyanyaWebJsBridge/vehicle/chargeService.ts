import { NEventListener } from '@nyanyajs/utils';
import type { ChargeData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 充电类服务
 * @description 提供充电数据的获取和监听接口（适用于混动/纯电车型）
 * @example
 * // 获取充电数据
 * const data = await vehicle.charge.get();
 *
 * // 启用充电监听
 * vehicle.charge.enableListener();
 *
 * // 监听充电变化
 * vehicle.on('charge', (data) => {
 *   console.log(data.chargingCapacity, data.chargingPower);
 * });
 */
export class ChargeService extends NEventListener<{
  /** 充电数据变化事件 */
  chargeChanged: ChargeData;
}> {
  /** 分类名称 */
  readonly category: 'charge' = 'charge';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的充电数据
   */
  private setupListener(): void {
    this.bridge.on('charge', (data: ChargeData) => {
      this.dispatch('chargeChanged', data);
    });
  }

  /**
   * 获取充电数据
   * @returns 充电数据对象
   * @example
   * const chargeData = await vehicle.charge.get();
   * console.log(chargeData.chargerState); // 充电状态
   * console.log(chargeData.chargingCapacity); // 当前剩余电量百分比
   * console.log(chargeData.chargingPower); // 充电功率
   * console.log(chargeData.chargingType); // 充电类型
   * console.log(chargeData.chargingGunState); // 充电枪状态
   * console.log(chargeData.chargerWorkState); // 充电机工作状态
   */
  async get(): Promise<ChargeData> {
    return this.bridge.sendMessageAwait<ChargeData>('get', this.category);
  }

  /**
   * 启用/禁用充电监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，充电数据变化时会通过'charge'事件推送给前端
   * @example
   * vehicle.charge.enableListener(); // 启用监听
   * vehicle.charge.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
