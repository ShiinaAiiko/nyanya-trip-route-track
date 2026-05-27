import { NEventListener } from '@nyanyajs/utils';
import type { LightData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 车灯类服务
 * @description 提供车灯数据的获取和监听接口
 * @example
 * // 获取车灯数据
 * const data = await vehicle.light.get();
 *
 * // 启用车灯监听
 * vehicle.light.enableListener();
 *
 * // 监听车灯变化
 * vehicle.on('light', (data) => {
 *   console.log(data.headlightState, data.turnLightState);
 * });
 */
export class LightService extends NEventListener<{
  /** 车灯数据变化事件 */
  lightChanged: LightData;
}> {
  /** 分类名称 */
  readonly category: 'light' = 'light';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的车灯数据
   */
  private setupListener(): void {
    this.bridge.on('light', (data: LightData) => {
      this.dispatch('lightChanged', data);
    });
  }

  /**
   * 获取车灯数据
   * @returns 车灯数据对象
   * @example
   * const lightData = await vehicle.light.get();
   * console.log(lightData.headlightState); // 前大灯状态
   * console.log(lightData.turnLightState); // 转向灯状态
   * console.log(lightData.lightAutoStatus); // 自动灯光状态
   * console.log(lightData.afsSwitch); // 随动转向大灯开关
   * console.log(lightData.positionLampState); // 位置灯状态
   */
  async get(): Promise<LightData> {
    return this.bridge.sendMessageAwait<LightData>('get', this.category);
  }

  /**
   * 启用/禁用车灯监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，车灯数据变化时会通过'light'事件推送给前端
   * @example
   * vehicle.light.enableListener(); // 启用监听
   * vehicle.light.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
