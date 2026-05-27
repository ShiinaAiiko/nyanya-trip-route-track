import { NEventListener } from '@nyanyajs/utils';
import type { AirQualityData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 空气质量类服务
 * @description 提供空气质量数据的获取和监听接口（适用于有PM2.5功能配置的车型）
 * @example
 * // 获取空气质量数据
 * const data = await vehicle.airQuality.get();
 *
 * // 启用空气质量监听
 * vehicle.airQuality.enableListener();
 *
 * // 监听空气质量变化
 * vehicle.on('airQuality', (data) => {
 *   console.log(data.pm25LevelInside, data.pm25LevelOutside);
 * });
 */
export class AirQualityService extends NEventListener<{
  /** 空气质量数据变化事件 */
  airQualityChanged: AirQualityData;
}> {
  /** 分类名称 */
  readonly category: 'air_quality' = 'air_quality';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的空气质量数据
   */
  private setupListener(): void {
    this.bridge.on('airQuality', (data: AirQualityData) => {
      this.dispatch('airQualityChanged', data);
    });
  }

  /**
   * 获取空气质量数据
   * @returns 空气质量数据对象
   * @example
   * const airQualityData = await vehicle.airQuality.get();
   * console.log(airQualityData.pm25OnlineState); // PM2.5是否在线
   * console.log(airQualityData.pm25CheckStateInside); // 车内检测状态
   * console.log(airQualityData.pm25CheckStateOutside); // 车外检测状态
   * console.log(airQualityData.pm25LevelInside); // 车内PM2.5等级
   * console.log(airQualityData.pm25LevelOutside); // 车外PM2.5等级
   * console.log(airQualityData.pm25ValueInside); // 车内PM2.5数值
   * console.log(airQualityData.pm25ValueOutside); // 车外PM2.5数值
   */
  async get(): Promise<AirQualityData> {
    return this.bridge.sendMessageAwait<AirQualityData>('get', this.category);
  }

  /**
   * 启用/禁用空气质量监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，空气质量数据变化时会通过'airQuality'事件推送给前端
   * @example
   * vehicle.airQuality.enableListener(); // 启用监听
   * vehicle.airQuality.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
