import { NEventListener } from '@nyanyajs/utils';
import type { BodyStatusData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 车身状态类服务
 * @description 提供车身状态数据的获取和监听接口
 * @example
 * // 获取车身状态数据
 * const data = await vehicle.bodyStatus.get();
 *
 * // 启用车身状态监听
 * vehicle.bodyStatus.enableListener();
 *
 * // 监听车身状态变化
 * vehicle.on('bodyStatus', (data) => {
 *   console.log(data.doorStates, data.windowStates);
 * });
 */
export class BodyStatusService extends NEventListener<{
  /** 车身状态数据变化事件 */
  bodyStatusChanged: BodyStatusData;
}> {
  /** 分类名称 */
  readonly category: 'body_status' = 'body_status';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的车身状态数据
   */
  private setupListener(): void {
    this.bridge.on('bodyStatus', (data: BodyStatusData) => {
      this.dispatch('bodyStatusChanged', data);
    });
  }

  /**
   * 获取车身状态数据
   * @returns 车身状态数据对象
   * @example
   * const bodyStatusData = await vehicle.bodyStatus.get();
   * console.log(bodyStatusData.autoVIN); // 车辆VIN号
   * console.log(bodyStatusData.doorStates); // 各车门状态
   * console.log(bodyStatusData.windowStates); // 各车窗状态
   * console.log(bodyStatusData.moonRoofPercent); // 天窗开启百分比
   * console.log(bodyStatusData.batteryVoltageLevel); // 电池电压等级
   * console.log(bodyStatusData.powerLevel); // 电源档位
   */
  async get(): Promise<BodyStatusData> {
    return this.bridge.sendMessageAwait<BodyStatusData>('get', this.category);
  }

  /**
   * 启用/禁用车身状态监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，车身状态数据变化时会通过'bodyStatus'事件推送给前端
   * @example
   * vehicle.bodyStatus.enableListener(); // 启用监听
   * vehicle.bodyStatus.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
