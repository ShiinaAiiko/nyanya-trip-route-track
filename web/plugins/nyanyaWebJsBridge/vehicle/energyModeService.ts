import { NEventListener } from '@nyanyajs/utils';
import type { EnergyModeData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 能量模式类服务
 * @description 提供能量模式数据的获取和监听接口（适用于混动车型）
 * @example
 * // 获取能量模式数据
 * const data = await vehicle.energyMode.get();
 *
 * // 启用能量模式监听
 * vehicle.energyMode.enableListener();
 *
 * // 监听能量模式变化
 * vehicle.on('energyMode', (data) => {
 *   console.log(data.energyMode, data.operationMode);
 * });
 */
export class EnergyModeService extends NEventListener<{
  /** 能量模式数据变化事件 */
  energyModeChanged: EnergyModeData;
}> {
  /** 分类名称 */
  readonly category: 'energy_mode' = 'energy_mode';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的能量模式数据
   */
  private setupListener(): void {
    this.bridge.on('energyMode', (data: EnergyModeData) => {
      this.dispatch('energyModeChanged', data);
    });
  }

  /**
   * 获取能量模式数据
   * @returns 能量模式数据对象
   * @example
   * const energyModeData = await vehicle.energyMode.get();
   * console.log(energyModeData.energyMode); // 整车工作模式
   * console.log(energyModeData.operationMode); // 整车运行模式
   * console.log(energyModeData.roadSurfaceMode); // 路面模式
   * console.log(energyModeData.powerGenerationState); // 原地踩油门发电状态
   * console.log(energyModeData.powerGenerationValue); // 原地踩油门发电功率
   */
  async get(): Promise<EnergyModeData> {
    return this.bridge.sendMessageAwait<EnergyModeData>('get', this.category);
  }

  /**
   * 启用/禁用能量模式监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，能量模式数据变化时会通过'energyMode'事件推送给前端
   * @example
   * vehicle.energyMode.enableListener(); // 启用监听
   * vehicle.energyMode.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}
