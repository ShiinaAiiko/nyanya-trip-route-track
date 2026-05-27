import { NEventListener } from '@nyanyajs/utils';
import type { PanoramaData } from './carDataTypes';
import type { NyaNyaWebJSBridge } from '../nyanyaWebJsBridge';

export class PanoramaService extends NEventListener<{
  panoramaChanged: PanoramaData;
}> {
  readonly category: 'panorama' = 'panorama';
  private bridge: NyaNyaWebJSBridge;

  constructor(bridge: NyaNyaWebJSBridge) {
    super();
    this.bridge = bridge;
    this.setupListener();
  }

  private setupListener(): void {
    this.bridge.on('panorama', (data: PanoramaData) => {
      this.dispatch('panoramaChanged', data);
    });
  }

  async get(): Promise<PanoramaData> {
    return this.bridge.sendMessageAwait<PanoramaData>('get', this.category);
  }

  enableListener(enabled: boolean = true): void {
    this.bridge.sendMessage('enableListener', {
      category: this.category,
      enabled,
    });
  }
}