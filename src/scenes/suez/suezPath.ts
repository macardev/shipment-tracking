import { CatmullRomCurve3, Vector3 } from 'three';
import { SUEZ_CANAL } from '../../data/routes';

/**
 * Gerçek kanal koordinatlarından oyun ölçeğinde bir yol.
 * Boyuna ölçek 1/16 (kanal ~11 km sahne birimi); gemi bilerek büyütülmüş (oyun hissi).
 */
export const SCALE = 1 / 16;
const LAT0 = 30.6;
const LON0 = 32.42;
const M_PER_DEG_LON = 111320 * Math.cos(LAT0 * (Math.PI / 180));
const M_PER_DEG_LAT = 110540;

export function toLocal(lat: number, lon: number, out = new Vector3()): Vector3 {
  return out.set((lon - LON0) * M_PER_DEG_LON * SCALE, 0, -(lat - LAT0) * M_PER_DEG_LAT * SCALE);
}

// Kanalın iki ucunda açık deniz (gemi kanala girip çıkarken görünür)
const NORTH_SEA = [
  { lat: 31.78, lon: 32.37, hw: 3200 },
  { lat: 31.5, lon: 32.33, hw: 1500 },
];
const SOUTH_SEA = [
  { lat: 29.8, lon: 32.6, hw: 1200 },
  { lat: 29.6, lon: 32.68, hw: 3200 },
];
// SUEZ_CANAL sırasıyla yarı genişlikler (göller geniş)
const CANAL_HW = [280, 140, 140, 140, 150, 520, 150, 150, 650, 1050, 650, 320, 150, 150, 320];

export interface Place {
  key: string;
  arc: number;
  side: -1 | 0 | 1;
}

export class CanalPath {
  readonly curve: CatmullRomCurve3;
  readonly length: number;
  readonly ctrlArc: number[] = [];
  readonly ctrlHw: number[];
  readonly portSaidArc: number;
  readonly suezArc: number;
  readonly arcById: Record<string, number> = {};

  constructor() {
    const pts = [
      ...NORTH_SEA.map((p) => toLocal(p.lat, p.lon)),
      ...SUEZ_CANAL.map((p) => toLocal(p.lat, p.lon)),
      ...SOUTH_SEA.map((p) => toLocal(p.lat, p.lon)),
    ];
    this.ctrlHw = [...NORTH_SEA.map((p) => p.hw), ...CANAL_HW, ...SOUTH_SEA.map((p) => p.hw)];
    this.curve = new CatmullRomCurve3(pts, false, 'centripetal');
    this.length = this.curve.getLength();

    // Kontrol noktalarının yay uzunluğu: yoğun örnekle en yakın noktayı bul
    const N = 3000;
    const samples = this.curve.getSpacedPoints(N);
    let from = 0;
    for (const p of pts) {
      let best = from;
      let bestD = Infinity;
      for (let j = from; j <= N; j++) {
        const d = samples[j].distanceToSquared(p);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      this.ctrlArc.push((best / N) * this.length);
      from = best;
    }
    const off = NORTH_SEA.length;
    SUEZ_CANAL.forEach((w, i) => {
      if (w.id) this.arcById[w.id] = this.ctrlArc[off + i];
    });
    this.portSaidArc = this.arcById.portSaid;
    this.suezArc = this.arcById.suez;
  }

  /** Kanal ilerlemesi (0..1, dışarıda taşabilir) → sahne yay uzunluğu. */
  arcFromCanalT(t: number): number {
    return this.portSaidArc + t * (this.suezArc - this.portSaidArc);
  }

  halfWidthAt(arc: number): number {
    const a = this.ctrlArc;
    if (arc <= a[0]) return this.ctrlHw[0];
    for (let i = 0; i < a.length - 1; i++) {
      if (arc < a[i + 1]) {
        const f = (arc - a[i]) / (a[i + 1] - a[i]);
        const s = f * f * (3 - 2 * f);
        return this.ctrlHw[i] + (this.ctrlHw[i + 1] - this.ctrlHw[i]) * s;
      }
    }
    return this.ctrlHw[this.ctrlHw.length - 1];
  }

  sample(arc: number, outPos: Vector3, outTan?: Vector3) {
    const u = Math.min(1, Math.max(0, arc / this.length));
    this.curve.getPointAt(u, outPos);
    if (outTan) this.curve.getTangentAt(u, outTan);
  }
}
