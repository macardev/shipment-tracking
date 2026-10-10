import { SEA_SPEED_KN } from './routes';
import type { LatLon, Shipment, ShipPosition, Waypoint } from './types';

const R = 6371000;
const toRad = Math.PI / 180;
export const KN_TO_MS = 0.514444;

export function haversine(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearingDeg(a: LatLon, b: LatLon): number {
  const y = Math.sin((b.lon - a.lon) * toRad) * Math.cos(b.lat * toRad);
  const x =
    Math.cos(a.lat * toRad) * Math.sin(b.lat * toRad) -
    Math.sin(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.cos((b.lon - a.lon) * toRad);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

export function segmentSpeedKn(route: Waypoint[], i: number): number {
  return route[i].speedKn ?? SEA_SPEED_KN;
}

/** Waypoint'ler için kümülatif mesafe ve (etd=0 kabul edilerek) kümülatif süre. */
export function measureRoute(route: Waypoint[]) {
  const cumDist = [0];
  const cumDur = [0];
  for (let i = 1; i < route.length; i++) {
    const d = haversine(route[i - 1], route[i]);
    cumDist.push(cumDist[i - 1] + d);
    cumDur.push(cumDur[i - 1] + (d / (segmentSpeedKn(route, i - 1) * KN_TO_MS)) * 1000);
  }
  return { cumDist, cumDur };
}

function findSegment(cum: number[], v: number): number {
  let lo = 0;
  let hi = cum.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Rota üzerinde verilen mesafeye varış süresi (etd'den itibaren ms). */
export function durationAtDist(cumDist: number[], cumDur: number[], d: number): number {
  const i = findSegment(cumDist, d);
  const segLen = cumDist[i + 1] - cumDist[i];
  const f = segLen > 0 ? (d - cumDist[i]) / segLen : 0;
  return cumDur[i] + f * (cumDur[i + 1] - cumDur[i]);
}

export function positionAt(s: Shipment, time: number): ShipPosition {
  const { route, cumTime, cumDist } = s;
  const last = route.length - 1;
  let i: number;
  let f: number;
  let phase: ShipPosition['phase'] = 'atSea';
  if (time <= s.etd) {
    i = 0;
    f = 0;
    phase = 'beforeDeparture';
  } else if (time >= s.eta) {
    i = last - 1;
    f = 1;
    phase = 'arrived';
  } else {
    i = findSegment(cumTime, time);
    f = (time - cumTime[i]) / (cumTime[i + 1] - cumTime[i]);
  }
  const a = route[i];
  const b = route[i + 1];
  const dist = cumDist[i] + f * (cumDist[i + 1] - cumDist[i]);
  const canalT = (dist - s.canal.enterDist) / (s.canal.exitDist - s.canal.enterDist);
  return {
    lat: a.lat + (b.lat - a.lat) * f,
    lon: a.lon + (b.lon - a.lon) * f,
    dist,
    progress: dist / s.totalDist,
    segIndex: i,
    area: phase === 'atSea' ? a.area : 'port',
    headingDeg: bearingDeg(a, b),
    speedKn: phase === 'atSea' ? segmentSpeedKn(route, i) : 0,
    phase,
    inCanal: phase === 'atSea' && canalT >= 0 && canalT <= 1,
    canalT,
  };
}
