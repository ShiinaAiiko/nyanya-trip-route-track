import { NEventListener } from '@nyanyajs/utils';
import type { DoorData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 门锁类服务
 * @description 提供门锁数据的获取和监听接口
 * @example
 * // 获取门锁数据
 * const data = await vehicle.door.get();
 *
 * // 启用门锁监听
 * vehicle.door.enableListener();
 *
 * // 监听门锁变化
 * vehicle.on('door', (data) => {
 *   console.log(data.doorLockStates, data.doorOpenStates);
 * });
 */
export class DoorService extends NEventListener<{
  /** 门锁数据变化事件 */
  doorChanged: DoorData;
}> {
  /** 分类名称 */
  readonly category: 'door' = 'door';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的门锁数据
   */
  private setupListener(): void {
    this.bridge.on('door', (data: DoorData) => {
      this.dispatch('doorChanged', data);
    });
  }

  /**
   * 获取门锁数据
   * @returns 门锁数据对象
   * @example
   * const doorData = await vehicle.door.get();
   * console.log(doorData.doorLockStates); // 各车门门锁状态
   * console.log(doorData.doorOpenStates); // 各车门开启状态
   * console.log(doorData.trunkLockState); // 后备箱门锁状态
   * console.log(doorData.trunkOpenState); // 后备箱开启状态
   */
  async get(): Promise<DoorData> {
    return this.bridge.sendMessageAwait<DoorData>('get', this.category);
  }

  /**
   * 启用/禁用门锁监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，门锁数据变化时会通过'door'事件推送给前端
   * @example
   * vehicle.door.enableListener(); // 启用监听
   * vehicle.door.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}