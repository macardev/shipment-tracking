/**
 * Tek render döngüsü.
 * - FPS limiti (zayıf cihazda 30: ısınma ve pil için)
 * - Sekme gizliyken ya da 3D alan ekranda değilken tamamen durur
 */
export class FrameLoop {
  fpsCap = 60;
  private raf = 0;
  private lastRender = 0;
  private running = false;
  private pageVisible = !document.hidden;
  private inView = true;
  private io?: IntersectionObserver;

  constructor(
    private onFrame: (dtS: number, intervalMs: number) => void,
    observeEl?: Element,
  ) {
    document.addEventListener('visibilitychange', this.onVisibility);
    if (observeEl && 'IntersectionObserver' in window) {
      this.io = new IntersectionObserver((entries) => {
        this.inView = entries[entries.length - 1].isIntersecting;
        this.sync();
      });
      this.io.observe(observeEl);
    }
  }

  start() {
    this.running = true;
    this.sync();
  }

  stop() {
    this.running = false;
    this.sync();
  }

  get active() {
    return this.running && this.pageVisible && this.inView;
  }

  dispose() {
    this.stop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.io?.disconnect();
  }

  private onVisibility = () => {
    this.pageVisible = !document.hidden;
    this.sync();
  };

  private sync() {
    if (this.active && !this.raf) {
      this.lastRender = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else if (!this.active && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const minInterval = 1000 / this.fpsCap - 2; // 2 ms tolerans: 60 Hz ekranda 30'a tam oturur
    const interval = now - this.lastRender;
    if (interval < minInterval) return;
    this.lastRender = now;
    this.onFrame(Math.min(interval, 100) / 1000, interval);
  };
}
