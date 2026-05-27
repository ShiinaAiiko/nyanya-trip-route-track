import { NEventListener } from '@nyanyajs/utils';
import type { MediaData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

/**
 * 媒体类服务
 * @description 提供媒体数据的获取、监听和控制接口
 * @example
 * // 获取媒体数据
 * const data = await vehicle.media.get();
 *
 * // 启用媒体监听
 * vehicle.media.enableListener();
 *
 * // 监听媒体变化
 * vehicle.on('media', (data) => {
 *   console.log(data.playState, data.playMode);
 * });
 *
 * // 控制媒体
 * await vehicle.media.controlMedia(1);
 */
export class MediaService extends NEventListener<{
  /** 媒体数据变化事件 */
  mediaChanged: MediaData;
}> {
  /** 分类名称 */
  readonly category: 'media' = 'media';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  /**
   * 设置监听器，接收Flutter推送的媒体数据
   */
  private setupListener(): void {
    this.bridge.on('media', (data: MediaData) => {
      this.dispatch('mediaChanged', data);
    });
  }

  /**
   * 获取媒体数据
   * @returns 媒体数据对象
   * @example
   * const mediaData = await vehicle.media.get();
   * console.log(mediaData.playState); // 播放状态
   * console.log(mediaData.playMode); // 播放模式
   * console.log(mediaData.mediaType); // 媒体类型
   * console.log(mediaData.playMediaName); // 正在播放媒体的名称
   * console.log(mediaData.playMediaArtistName); // 正在播放媒体的艺术家名称
   */
  async get(): Promise<MediaData> {
    return this.bridge.sendMessageAwait<MediaData>('get', this.category);
  }

  /**
   * 启用/禁用媒体监听
   * @param enabled 是否启用监听，默认true
   * @description 启用后，媒体数据变化时会通过'media'事件推送给前端
   * @example
   * vehicle.media.enableListener(); // 启用监听
   * vehicle.media.enableListener(false); // 禁用监听
   */
  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }

  /**
   * 控制媒体
   * @param action 控制动作：0-暂停播放、1-播放、2-上一曲、3-下一曲、4-停止播放、5-继续播放、6-静音、7-取消静音
   * @returns 是否控制成功
   * @example
   * await vehicle.media.controlMedia(1); // 播放
   * await vehicle.media.controlMedia(2); // 上一曲
   * await vehicle.media.controlMedia(3); // 下一曲
   */
  async controlMedia(action: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7): Promise<boolean> {
    return this.bridge.sendMessageAwait<boolean>('set', {
      type: this.category,
      field: 'controlMedia',
      value: action,
    });
  }
}
