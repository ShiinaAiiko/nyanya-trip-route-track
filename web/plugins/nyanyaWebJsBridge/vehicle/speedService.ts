import { NEventListener } from '@nyanyajs/utils';
import type { SpeedData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 车速类服务
 * @description 提供车速数据的获取、监听和设置接口
 * @example
 * // 获取车速数据
 * const data = await vehicle.speed.get();
 *
 * // 启用车速监听
 * vehicle.speed.enableListener();
 *
 * // 监听车速变化
 * vehicle.on('speed', (data) => {
 *   console.log(data.currentSpeed);
 * });
 */
export class SpeedService extends NEventListener<{
  /** 车速数据变化事件 */
  speedChanged: SpeedData;
}> {
  /** 分类名称 */
  readonly category: 'speed' = 'speed';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收 Flutter 推送的车速数据
   */
  private setupListener(): void {
    this.bridge.on('speed', (data: SpeedData) => {
      this.dispatch('speedChanged', data);
    });
  }

  /**
   * 获取车速数据
   * @returns 车速数据对象，包含 currentSpeed、accelerateDeepness、brakeDeepness
   * @example
   * const speedData = await vehicle.speed.get();
   * console.log(speedData.currentSpeed); // 当前车速 km/h
   * console.log(speedData.accelerateDeepness); // 油门深度 0-100
   * console.log(speedData.brakeDeepness); // 制动深度 0-100
   */
  async get(): Promise<SpeedData> {
    return this.bridge.sendMessageAwait<SpeedData>('get', this.category);
  }

  /**
   * 启用/禁用车速监听
   * @param enabled 是否启用监听，默认 true
   * @description 启用后，车速数据变化时会通过 'speed' 事件推送给前端
   * @example
   * vehicle.speed.enableListener(); // 启用监听
   * vehicle.speed.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}