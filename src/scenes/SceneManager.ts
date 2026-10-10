import { SRGBColorSpace, WebGLRenderer } from 'three';
import type { Shipment } from '../data/types';
import { FrameLoop } from '../perf/FrameLoop';
import type { QualityManager } from '../perf/QualityManager';
import type { Quality } from '../perf/qualityPresets';
import { LabelLayer } from './LabelLayer';
import type { SimClock } from './SimClock';
import type { AppScene, CameraMode, SceneContext, SceneEvent, SceneKind } from './types';
import type { GlobeScene } from './globe/GlobeScene';
import type { SuezScene } from './suez/SuezScene';

export interface FrameStats {
  fps: number;
  calls: number;
  triangles: number;
  pixelRatio: number;
}

/**
 * Tek WebGLRenderer'ı (mobilde birden fazla GL context pahalı) ve render döngüsünü yönetir.
 * Sahneler talep edildiğinde dinamik import ile yüklenir.
 */
export class SceneManager {
  readonly renderer: WebGLRenderer;
  labels: LabelLayer;
  kind: SceneKind | null = null;
  onStats?: (s: FrameStats) => void;
  /** Debug: her karede yapay CPU yükü (ms), QualityManager testi için. */
  artificialLoadMs = 0;

  private current: AppScene | null = null;
  private loop: FrameLoop;
  private elapsed = 0;
  private width = 1;
  private height = 1;
  private ro: ResizeObserver;
  private unsubQuality: () => void;
  private loading: Promise<void> | null = null;
  private contextLost = false;

  constructor(
    private host: HTMLElement,
    private shipment: Shipment,
    private clock: SimClock,
    private qm: QualityManager,
    private emit: (e: SceneEvent) => void,
  ) {
    const q = qm.quality;
    this.renderer = new WebGLRenderer({
      antialias: q.antialias,
      powerPreference: q.tier === 'high' ? 'high-performance' : 'default',
      alpha: false,
      stencil: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(qm.pixelRatio);
    // Gölge haritası sadece yüksek kademede başlangıçta açılır; sonradan ışık bazında açılıp kapanır.
    this.renderer.shadowMap.enabled = q.tier === 'high';
    host.appendChild(this.renderer.domElement);
    this.labels = new LabelLayer(host);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.loop = new FrameLoop(this.frame, host);
    this.loop.fpsCap = q.fpsCap;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();

    this.unsubQuality = qm.onChange((nq, pr) => this.applyQuality(nq, pr));
  }

  get scene(): AppScene | null {
    return this.current;
  }

  async show(kind: SceneKind) {
    if (this.loading) await this.loading;
    this.loading = this.load(kind);
    await this.loading;
    this.loading = null;
  }

  private async load(kind: SceneKind) {
    this.loop.stop();
    this.disposeCurrent();
    const ctx: SceneContext = {
      renderer: this.renderer,
      quality: this.qm.quality,
      shipment: this.shipment,
      clock: this.clock,
      labels: this.labels,
      canvas: this.renderer.domElement,
      emit: this.emit,
    };
    if (kind === 'globe') {
      const { GlobeScene } = await import('./globe/GlobeScene');
      this.current = new GlobeScene(ctx);
    } else {
      const { SuezScene } = await import('./suez/SuezScene');
      this.current = new SuezScene(ctx);
    }
    this.kind = kind;
    this.current.resize(this.width, this.height);
    // Shader'ları ilk karede değil şimdi derle (ilk karede takılma olmasın)
    this.renderer.compile(this.current.scene, this.current.camera);
    this.qm.reset();
    this.loop.start();
  }

  flyToSuez(): Promise<void> {
    if (this.kind !== 'globe' || !this.current) return Promise.resolve();
    return (this.current as GlobeScene).flyToSuez();
  }

  setCameraMode(mode: CameraMode) {
    if (this.kind === 'suez' && this.current) (this.current as SuezScene).setCameraMode(mode);
  }

  private frame = (dtS: number, intervalMs: number) => {
    if (!this.current || this.contextLost) return;
    this.qm.sample(intervalMs);
    if (this.artificialLoadMs > 0) {
      const end = performance.now() + this.artificialLoadMs;
      while (performance.now() < end) {
        /* yapay yük */
      }
    }
    this.elapsed += dtS;
    this.clock.update(dtS);
    this.current.update(dtS, this.elapsed);
    this.renderer.render(this.current.scene, this.current.camera);
    this.labels.update(this.current.camera, this.width, this.height);
    if (this.onStats) {
      const info = this.renderer.info.render;
      this.onStats({ fps: this.qm.fps, calls: info.calls, triangles: info.triangles, pixelRatio: this.renderer.getPixelRatio() });
    }
  };

  private applyQuality(q: Quality, pr: number) {
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    this.loop.fpsCap = q.fpsCap;
    this.current?.applyQuality(q);
  }

  private resize() {
    const r = this.host.getBoundingClientRect();
    this.width = Math.max(1, Math.round(r.width));
    this.height = Math.max(1, Math.round(r.height));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.current?.resize(this.width, this.height);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.loop.stop();
  };

  private onContextRestored = () => {
    this.contextLost = false;
    if (this.kind) void this.show(this.kind);
  };

  private disposeCurrent() {
    if (!this.current) return;
    this.current.dispose();
    this.current = null;
    this.labels.dispose();
    this.labels = new LabelLayer(this.host);
    this.renderer.renderLists.dispose();
  }

  dispose() {
    this.loop.dispose();
    this.ro.disconnect();
    this.unsubQuality();
    this.disposeCurrent();
    this.labels.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
