import type { DeviceInfo } from '../perf/DeviceTier';
import type { QualityManager } from '../perf/QualityManager';
import type { FrameStats, SceneManager } from '../scenes/SceneManager';

/** ?debug=1 ile açılır: FPS, kademe, draw call, üçgen; yapay yük ekleyerek otomatik kaliteyi test eder. */
export class StatsOverlay {
  readonly el = document.createElement('div');
  private text = document.createElement('div');
  private last = 0;

  constructor(
    private sm: SceneManager,
    private qm: QualityManager,
    private device: DeviceInfo,
  ) {
    this.el.className = 'stats';
    this.el.appendChild(this.text);
    const mk = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', fn);
      this.el.appendChild(b);
    };
    mk('+15ms yük', () => (sm.artificialLoadMs += 15));
    mk('yük 0', () => (sm.artificialLoadMs = 0));
    sm.onStats = (s) => this.onStats(s);
  }

  private onStats(s: FrameStats) {
    const now = performance.now();
    if (now - this.last < 250) return;
    this.last = now;
    const q = this.qm.quality;
    this.text.innerText = [
      `FPS ${s.fps.toFixed(0)} / hedef ${q.fpsCap}`,
      `kademe ${q.tier}${this.qm.isAuto ? ' (oto)' : ' (manuel)'} · tespit ${this.device.tier}`,
      `piksel oranı ${s.pixelRatio.toFixed(2)} (x${this.qm.scale.toFixed(2)})`,
      `draw call ${s.calls} · üçgen ${(s.triangles / 1000).toFixed(1)}k`,
      `yapay yük ${this.sm.artificialLoadMs} ms`,
      `GPU ${this.device.gpu.slice(0, 40)}`,
      `neden: ${this.device.reasons.join(', ')}`,
      `son: ${this.qm.lastEvent || '-'}`,
    ].join('\n');
  }
}
