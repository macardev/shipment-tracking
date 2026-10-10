/** Simülasyon zamanı. Canlı modda gerçek saate kilitli; x60/x600 = demo için hızlandırma. */
export class SimClock {
  time = Date.now();
  speed = 1;
  private live = true;
  private listeners = new Set<() => void>();

  update(dtS: number) {
    if (this.live) this.time = Date.now();
    else this.time += dtS * 1000 * this.speed;
  }

  get isLive() {
    return this.live;
  }

  setSpeed(speed: number) {
    if (speed === 1) return this.goLive();
    this.live = false;
    this.speed = speed;
    this.emit();
  }

  jumpTo(time: number) {
    this.live = false;
    this.time = time;
    this.emit();
  }

  goLive() {
    this.live = true;
    this.time = Date.now();
    this.speed = 1;
    this.emit();
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}
