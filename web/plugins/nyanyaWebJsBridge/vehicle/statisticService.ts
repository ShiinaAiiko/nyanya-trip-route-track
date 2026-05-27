import { NEventListener } from '@nyanyajs/utils';
import type { StatisticData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 行驶数据类服务
 * @description 提供行驶数据的获取和监听接口
 * @example
 * // 获取行驶数据
 * const data = await vehicle.statistic.get();
 *
 * // 启用行驶数据监听
 * vehicle.statistic.enableListener();
 *
 * // 监听行驶数据变化
 * vehicle.on('statistic', (data) => {
 *   console.log(data.totalOdometer, data.avgFuelConsumption);
 * });
 */
export class StatisticService extends NEventListener<{
  /** 行驶数据变化事件 */
  statisticChanged: StatisticData;
}> {
  /** 分类名称 */
  readonly category: 'statistic' = 'statistic';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的行驶数据
   */
  private setupListener(): void {
    this.bridge.on('statistic', (data: StatisticData) => {
      this.dispatch('statisticChanged', data);
    });
  }

  /**
   * 获取行驶数据
   * @returns 行驶数据对象
   * @example
   * const statisticData = await vehicle.statistic.get();
   * console.log(statisticData.totalOdometer); // 总里程
   * console.log(statisticData.avgFuelConsumption); // 平均油耗
   * console.log(statisticData.avgSpeed); // 平均速度
   * console.log(statisticData.tripMileage); // 本次行程里程
   */
  async get(): Promise<StatisticData> {
    return this.bridge.sendMessageAwait<StatisticData>('get', this.category);
  }

  /**
   * 启用/禁用行驶数据监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，行驶数据变化时会通过'statistic'事件推送给前端
   * @example
   * vehicle.statistic.enableListener(); // 启用监听
   * vehicle.statistic.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}