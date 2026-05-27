export * from './carDataTypes';
export * from './speedService';
export * from './statisticService';
export * from './instrumentService';
export * from './doorService';
export * from './vehicleSettingService';
export * from './engineService';
export * from './panoramaService';
export * from './acService';
export * from './sensorService';
export * from './timeService';
export * from './energyModeService';
export * from './radarService';
export * from './tyreService';
export * from './airQualityService';
export * from './chargeService';
export * from './mediaService';
export * from './bodyStatusService';
export * from './lightService';

import { SpeedService } from './speedService';
import { StatisticService } from './statisticService';
import { InstrumentService } from './instrumentService';
import { DoorService } from './doorService';
import { VehicleSettingService } from './vehicleSettingService';
import { EngineService } from './engineService';
import { PanoramaService } from './panoramaService';
import { AcService } from './acService';
import { SensorService } from './sensorService';
import { TimeService } from './timeService';
import { EnergyModeService } from './energyModeService';
import { RadarService } from './radarService';
import { TyreService } from './tyreService';
import { AirQualityService } from './airQualityService';
import { ChargeService } from './chargeService';
import { MediaService } from './mediaService';
import { BodyStatusService } from './bodyStatusService';
import { LightService } from './lightService';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';
import { startTest } from './test';

/**
 * 车辆服务集合
 * @description 统一管理所有车辆分类服务
 */
export class VehicleServices {
  /** 车速类服务 */
  public speed: SpeedService;
  /** 行驶数据类服务 */
  public statistic: StatisticService;
  /** 仪表类服务 */
  public instrument: InstrumentService;
  /** 门锁类服务 */
  public door: DoorService;
  /** 车辆设置类服务 */
  public vehicleset: VehicleSettingService;
  /** 发动机类服务 */
  public engine: EngineService;
  /** 全景摄像头类服务 */
  public panorama: PanoramaService;
  /** 空调类服务 */
  public ac: AcService;
  /** 传感器类服务 */
  public sensor: SensorService;
  /** 时间类服务 */
  public time: TimeService;
  /** 能量模式类服务 */
  public energyMode: EnergyModeService;
  /** 雷达类服务 */
  public radar: RadarService;
  /** 轮胎类服务 */
  public tyre: TyreService;
  /** 空气质量类服务 */
  public airQuality: AirQualityService;
  /** 充电类服务 */
  public charge: ChargeService;
  /** 媒体中心类服务 */
  public media: MediaService;
  /** 车身状态类服务 */
  public bodyStatus: BodyStatusService;
  /** 车灯类服务 */
  public light: LightService;
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    this.bridge = bridge;
    this.speed = new SpeedService(bridge);
    this.statistic = new StatisticService(bridge);
    this.instrument = new InstrumentService(bridge);
    this.door = new DoorService(bridge);
    this.vehicleset = new VehicleSettingService(bridge);
    this.engine = new EngineService(bridge);
    this.panorama = new PanoramaService(bridge);
    this.ac = new AcService(bridge);
    this.sensor = new SensorService(bridge);
    this.time = new TimeService(bridge);
    this.energyMode = new EnergyModeService(bridge);
    this.radar = new RadarService(bridge);
    this.tyre = new TyreService(bridge);
    this.airQuality = new AirQualityService(bridge);
    this.charge = new ChargeService(bridge);
    this.media = new MediaService(bridge);
    this.bodyStatus = new BodyStatusService(bridge);
    this.light = new LightService(bridge);
  }

  /**
   * 启用/禁用所有车辆数据监听
   * @param enabled 是否启用监听，默认 true
   * @description 启用后，所有车辆数据变化时会通过对应分类事件推送给前端
   * @example
   * vehicle.enableCarData(); // 启用全部数据监听
   * vehicle.enableCarData(false); // 禁用全部数据监听
   */
  enableCarData(enabled: boolean = true): void {
    this.bridge.sendMessage('enableCarData', enabled);
  }

  /**
   * 立即获取所有车辆数据
   * @description 主动获取当前所有车辆数据，无论是否变化
   * @example
   * vehicle.getCarData();
   */
  getCarData(): void {
    this.bridge.sendMessage('getCarData');
  }
  startTest(){
    startTest(this.bridge);
  }
}
