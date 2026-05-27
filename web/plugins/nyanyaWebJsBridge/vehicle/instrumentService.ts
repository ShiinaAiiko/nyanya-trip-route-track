import { NEventListener } from '@nyanyajs/utils';
import type { InstrumentData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 仪表类服务
 * @description 提供仪表数据的获取、监听和设置接口
 * @example
 * // 获取仪表数据
 * const data = await vehicle.instrument.get();
 *
 * // 启用仪表监听
 * vehicle.instrument.enableListener();
 *
 * // 监听仪表变化
 * vehicle.on('instrument', (data) => {
 *   console.log(data.speed, data.rotateSpeed);
 * });
 *
 * // 设置单位
 * await vehicle.instrument.setUnit({ unitName: 1, unitValue: 0 });
 */
export class InstrumentService extends NEventListener<{
  /** 仪表数据变化事件 */
  instrumentChanged: InstrumentData;
}> {
  /** 分类名称 */
  readonly category: 'instrument' = 'instrument';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的仪表数据
   */
  private setupListener(): void {
    this.bridge.on('instrument', (data: InstrumentData) => {
      this.dispatch('instrumentChanged', data);
    });
  }

  /**
   * 获取仪表数据
   * @returns 仪表数据对象
   * @example
   * const instrumentData = await vehicle.instrument.get();
   * console.log(instrumentData.speed); // 车速
   * console.log(instrumentData.rotateSpeed); // 转速
   * console.log(instrumentData.avgFuelConsumption); // 平均油耗
   * console.log(instrumentData.range); // 续航里程
   */
  async get(): Promise<InstrumentData> {
    return this.bridge.sendMessageAwait<InstrumentData>('get', this.category);
  }

  /**
   * 启用/禁用仪表监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，仪表数据变化时会通过'instrument'事件推送给前端
   * @example
   * vehicle.instrument.enableListener(); // 启用监听
   * vehicle.instrument.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }

  /**
   * 设置单位
   * @param params 设置参数
   * @param params.unitName 单位名称：0-速度单位、1-压力单位、2-温度单位、3-能量单位、4-长度单位
   * @param params.unitValue 单位值：速度单位0- km/h、1- mi/h；压力单位0- kPa、1- bar、2- psi；温度单位0- ℃、1- ℉；能量单位0- kWh、1- %；长度单位0- km、1- mi
   * @returns 是否设置成功
   * @example
   * await vehicle.instrument.setUnit({ unitName: 0, unitValue: 0 }); // 设置速度单位为km/h
   */
  async setUnit(params: { unitName: 0 | 1 | 2 | 3 | 4; unitValue: number }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'setUnit',
      value: params,
    });
  }

  /**
   * 设置保养信息
   * @param params 设置参数
   * @param params.typeName 保养类型：0-轮胎换位、1-保养检查
   * @param params.infoValue 保养值
   * @returns 是否设置成功
   * @example
   * await vehicle.instrument.setMaintenanceInfo({ typeName: 0, infoValue: 5000 });
   */
  async setMaintenanceInfo(params: { typeName: 0 | 1; infoValue: number }): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'setMaintenanceInfo',
      value: params,
    });
  }
}