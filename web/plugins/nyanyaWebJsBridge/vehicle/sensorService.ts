import { NEventListener } from '@nyanyajs/utils';
import type { SensorData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 传感器类服务
 * @description 提供传感器数据的获取和监听接口
 * @example
 * // 获取传感器数据
 * const data = await vehicle.sensor.get();
 *
 * // 启用传感器监听
 * vehicle.sensor.enableListener();
 *
 * // 监听传感器变化
 * vehicle.on('sensor', (data) => {
 *   console.log(data.lightIntensity);
 * });
 */
export class SensorService extends NEventListener<{
  /** 传感器数据变化事件 */
  sensorChanged: SensorData;
}> {
  /** 分类名称 */
  readonly category: 'sensor' = 'sensor';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的传感器数据
   */
  private setupListener(): void {
    this.bridge.on('sensor', (data: SensorData) => {
      this.dispatch('sensorChanged', data);
    });
  }

  /**
   * 获取传感器数据
   * @returns 传感器数据对象
   * @example
   * const sensorData = await vehicle.sensor.get();
   * console.log(sensorData.lightIntensity); // 光照强度等级
   */
  async get(): Promise<SensorData> {
    return this.bridge.sendMessageAwait<SensorData>('get', this.category);
  }

  /**
   * 启用/禁用传感器监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，传感器数据变化时会通过'sensor'事件推送给前端
   * @example
   * vehicle.sensor.enableListener(); // 启用监听
   * vehicle.sensor.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
