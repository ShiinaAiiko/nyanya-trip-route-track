import { NEventListener } from '@nyanyajs/utils';
import type { RadarData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 雷达类服务
 * @description 提供雷达数据的获取和监听接口
 * @example
 * // 获取雷达数据
 * const data = await vehicle.radar.get();
 *
 * // 启用雷达监听
 * vehicle.radar.enableListener();
 *
 * // 监听雷达变化
 * vehicle.on('radar', (data) => {
 *   console.log(data.reverseRadarSwitch, data.radarProbeStates);
 * });
 */
export class RadarService extends NEventListener<{
  /** 雷达数据变化事件 */
  radarChanged: RadarData;
}> {
  /** 分类名称 */
  readonly category: 'radar' = 'radar';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的雷达数据
   */
  private setupListener(): void {
    this.bridge.on('radar', (data: RadarData) => {
      this.dispatch('radarChanged', data);
    });
  }

  /**
   * 获取雷达数据
   * @returns 雷达数据对象
   * @example
   * const radarData = await vehicle.radar.get();
   * console.log(radarData.reverseRadarSwitch); // 倒车雷达开关状态
   * console.log(radarData.radarProbeStates); // 各位置探头状态
   */
  async get(): Promise<RadarData> {
    return this.bridge.sendMessageAwait<RadarData>('get', this.category);
  }

  /**
   * 启用/禁用雷达监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，雷达数据变化时会通过'radar'事件推送给前端
   * @example
   * vehicle.radar.enableListener(); // 启用监听
   * vehicle.radar.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
