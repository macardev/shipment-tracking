import { PRESETS, TIERS, type Quality, type Tier } from './qualityPresets';

const DOWN_AFTER_S = 2; // bu kadar süre hedefin altında kalırsa düşür
const UP_AFTER_S = 8; // bu kadar süre rahatsa yükselt
const WARMUP_S = 1.5; // sahne/kalite değişiminden sonra ölçüm yapma (shader derleme takılmaları)
const PR_STEP = 0.15;
const MAX_UP_FAILS = 2; // bir kademeye en fazla 2 kez geri çıkmayı dene

export type QualityListener = (q: Quality, pixelRatio: number) => void;

/**
 * Çalışırken FPS'i izler, gerekirse kaliteyi kademe kademe düşürür/yükseltir.
 * Önce en ucuz düğme (piksel oranı), sonra kademe (su, gölge, nesne sayısı...).
 */
export class QualityManager {
  private tierIdx: number;
  private maxIdx: number;
  private prScale = 1;
  private auto: boolean;
  private avgMs = 16.7;
  private badS = 0;
  private goodS = 0;
  private warmupS = WARMUP_S;
  private upFails: Record<Tier, number> = { low: 0, mid: 0, high: 0 };
  private lastUpAt = -Infinity;
  private listeners = new Set<QualityListener>();
  /** Debug için: son değişikliğin sebebi. */
  lastEvent = '';

  constructor(
    private detected: Tier,
    choice: 'auto' | Tier,
  ) {
    this.auto = choice === 'auto';
    this.tierIdx = TIERS.indexOf(choice === 'auto' ? detected : choice);
    this.maxIdx = TIERS.indexOf(detected);
  }

  get quality(): Quality {
    return PRESETS[TIERS[this.tierIdx]];
  }

  get isAuto() {
    return this.auto;
  }

  get scale() {
    return this.prScale;
  }

  get fps() {
    return 1000 / this.avgMs;
  }

  get pixelRatio(): number {
    const q = this.quality;
    const base = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio);
    return Math.max(Math.min(q.minPixelRatio, base), base * this.prScale);
  }

  onChange(fn: QualityListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setChoice(choice: 'auto' | Tier) {
    this.auto = choice === 'auto';
    this.tierIdx = TIERS.indexOf(choice === 'auto' ? this.detected : choice);
    this.prScale = 1;
    this.upFails = { low: 0, mid: 0, high: 0 };
    this.lastEvent = `manuel: ${choice}`;
    this.reset();
    this.emit();
  }

  /** Sahne değişince ölçümü sıfırla (yükleme takılmaları kaliteyi düşürmesin). */
  reset() {
    this.warmupS = WARMUP_S;
    this.badS = 0;
    this.goodS = 0;
    this.avgMs = 1000 / this.quality.fpsCap;
  }

  /** Her çizilen karede çağrılır; intervalMs = önceki kareden bu yana geçen süre. */
  sample(intervalMs: number) {
    const dtS = intervalMs / 1000;
    if (this.warmupS > 0) {
      this.warmupS -= dtS;
      return;
    }
    this.avgMs = this.avgMs * 0.9 + Math.min(intervalMs, 250) * 0.1;
    if (!this.auto) return;
    const fps = 1000 / this.avgMs;
    const target = this.quality.fpsCap;
    if (fps < target * 0.8) {
      this.badS += dtS;
      this.goodS = 0;
    } else if (fps >= target * 0.95) {
      this.goodS += dtS;
      this.badS = Math.max(0, this.badS - dtS);
    } else {
      this.badS = Math.max(0, this.badS - dtS * 0.5);
      this.goodS = 0;
    }
    if (this.badS > DOWN_AFTER_S) this.step(-1, fps);
    else if (this.goodS > UP_AFTER_S) this.step(1, fps);
  }

  private step(dir: -1 | 1, fps: number) {
    const q = this.quality;
    const base = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio);
    const now = performance.now();
    let changed = false;

    if (dir < 0) {
      if (base * (this.prScale - PR_STEP) >= q.minPixelRatio - 0.01) {
        this.prScale -= PR_STEP;
        this.lastEvent = `↓ çözünürlük x${this.prScale.toFixed(2)} (${fps.toFixed(0)} fps)`;
        changed = true;
      } else if (this.tierIdx > 0) {
        // Yeni çıkılan kademe kaldıramadıysa bunu not et (gidip gelmeyi önler)
        if (now - this.lastUpAt < 15000) this.upFails[TIERS[this.tierIdx]]++;
        this.tierIdx--;
        this.prScale = 1;
        this.lastEvent = `↓ kademe ${TIERS[this.tierIdx]} (${fps.toFixed(0)} fps)`;
        changed = true;
      }
    } else {
      if (this.prScale < 1) {
        this.prScale = Math.min(1, this.prScale + PR_STEP);
        this.lastEvent = `↑ çözünürlük x${this.prScale.toFixed(2)}`;
        changed = true;
      } else if (this.tierIdx < this.maxIdx && this.upFails[TIERS[this.tierIdx + 1]] < MAX_UP_FAILS) {
        this.tierIdx++;
        this.prScale = 1;
        this.lastUpAt = now;
        this.lastEvent = `↑ kademe ${TIERS[this.tierIdx]}`;
        changed = true;
      }
    }
    this.reset();
    if (changed) this.emit();
  }

  private emit() {
    const q = this.quality;
    const pr = this.pixelRatio;
    this.listeners.forEach((fn) => fn(q, pr));
  }
}
