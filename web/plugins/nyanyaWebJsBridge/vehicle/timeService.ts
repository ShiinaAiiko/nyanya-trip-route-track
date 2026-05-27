import { NEventListener } from '@nyanyajs/utils';
import type { TimeData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 时间类服务
 * @description 提供时间数据的获取、监听和设置接口
 * @example
 * // 获取时间数据
 * const data = await vehicle.time.get();
 *
 * // 启用时间监听
 * vehicle.time.enableListener();
 *
 * // 监听时间变化
 * vehicle.on('time', (data) => {
 *   console.log(data.year, data.month, data.day);
 * });
 *
 * // 设置日期
 * await vehicle.time.setDate(2024, 5, 20, 1);
 */
export class TimeService extends NEventListener<{
  /** 时间数据变化事件 */
  timeChanged: TimeData;
}> {
  /** 分类名称 */
  readonly category: 'time' = 'time';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的时间数据
   */
  private setupListener(): void {
    this.bridge.on('time', (data: TimeData) => {
      this.dispatch('timeChanged', data);
    });
  }

  /**
   * 获取时间数据
   * @returns 时间数据对象
   * @example
   * const timeData = await vehicle.time.get();
   * console.log(timeData.year, timeData.month, timeData.day); // 年、月、日
   * console.log(timeData.hour, timeData.minute, timeData.second); // 时、分、秒
   * console.log(timeData.timeFormat); // 时间格式
   */
  async get(): Promise<TimeData> {
    return this.bridge.sendMessageAwait<TimeData>('get', this.category);
  }

  /**
   * 启用/禁用时间监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，时间数据变化时会通过'time'事件推送给前端
   * @example
   * vehicle.time.enableListener(); // 启用监听
   * vehicle.time.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }

  /**
   * 设置年月日、星期
   * @param params 设置参数
   * @param params.year 年份 [2001, 2255]
   * @param params.month 月份 [1, 12]
   * @param params.day 日期 [1, 31]
   * @param params.weekday 星期 [1, 7]
   * @returns 是否设置成功
   * @example
   * await vehicle.time.setDate({ year: 2024, month: 5, day: 20, weekday: 1 });
   */
  async setDate(params: {
    year: number;
    month: number;
    day: number;
    weekday: number;
  }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'date',
      value: params,
    });
  }

  /**
   * 设置时分秒
   * @param params 设置参数
   * @param params.hour 小时 [0, 23]
   * @param params.minute 分钟 [0, 59]
   * @param params.second 秒 [0, 59]
   * @returns 是否设置成功
   * @example
   * await vehicle.time.setTime({ hour: 14, minute: 30, second: 0 });
   */
  async setTime(params: {
    hour: number;
    minute: number;
    second: number;
  }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'time',
      value: params,
    });
  }

  /**
   * 设置时间格式
   * @param format 时间格式 0: 12小时制 1: 24小时制
   * @returns 是否设置成功
   * @example
   * await vehicle.time.setTimeFormat(1); // 设置为24小时制
   */
  async setTimeFormat(format: 0 | 1): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'timeFormat',
      value: format,
    });
  }
}
