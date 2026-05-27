import { NEventListener } from '@nyanyajs/utils';
import type { EngineData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 发动机类服务
 * @description 提供发动机数据的获取和监听接口
 * @example
 * // 获取发动机数据
 * const data = await vehicle.engine.get();
 *
 * // 启用发动机监听
 * vehicle.engine.enableListener();
 *
 * // 监听发动机变化
 * vehicle.on('engine', (data) => {
 *   console.log(data.engineState, data.coolantTemp);
 * });
 */
export class EngineService extends NEventListener<{
  /** 发动机数据变化事件 */
  engineChanged: EngineData;
}> {
  /** 分类名称 */
  readonly category: 'engine' = 'engine';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的发动机数据
   */
  private setupListener(): void {
    this.bridge.on('engine', (data: EngineData) => {
      this.dispatch('engineChanged', data);
    });
  }

  /**
   * 获取发动机数据
   * @returns 发动机数据对象
   * @example
   * const engineData = await vehicle.engine.get();
   * console.log(engineData.engineState); // 发动机状态
   * console.log(engineData.coolantTemp); // 冷却液温度
   * console.log(engineData.engineSpeed); // 发动机转速
   */
  async get(): Promise<EngineData> {
    return this.bridge.sendMessageAwait<EngineData>('get', this.category);
  }

  /**
   * 启用/禁用发动机监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，发动机数据变化时会通过'engine'事件推送给前端
   * @example
   * vehicle.engine.enableListener(); // 启用监听
   * vehicle.engine.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}