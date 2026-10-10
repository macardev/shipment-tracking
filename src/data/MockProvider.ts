import { ROUTES } from './routes';
import { durationAtDist, measureRoute } from './routeMath';
import type { ShipmentProvider } from './ShipmentProvider';
import type { Milestone, Port, Shipment, Vessel, Waypoint } from './types';

const HOUR = 3600_000;

/** Sevkiyatın "şu an" rotada nerede olacağı: iki waypoint arasının oranı. */
interface Anchor {
  from: string;
  to: string;
  frac: number;
}

interface ShipmentDef {
  trackingNo: string;
  hintKey: string;
  containerNo: string;
  bl: string;
  customer: string;
  cargo: string;
  origin: Port;
  destination: Port;
  vessel: Vessel;
  routeKey: keyof typeof ROUTES;
  anchor: Anchor;
}

const JEBEL_ALI: Port = { code: 'AEJEA', name: 'Jebel Ali', country: 'AE' };

// Gemi ve şirket isimleri hayalidir (demo).
const DEFS: ShipmentDef[] = [
  {
    trackingNo: 'SYR-24001',
    hintKey: 'sample.inCanal',
    containerNo: 'SYRU 482193-7',
    bl: 'SYR2410IST0001',
    customer: 'Demo Tekstil A.Ş.',
    cargo: '40HC · 18.4 t · Tekstil',
    origin: { code: 'TRAMB', name: 'Ambarlı / İstanbul', country: 'TR' },
    destination: JEBEL_ALI,
    vessel: { name: 'MV AURORA STAR', imo: '9800001', flag: 'MT', carrier: 'Seyir Lines (demo)' },
    routeKey: 'istanbulJebelAli',
    anchor: { from: 'portSaid', to: 'qantara', frac: 0.35 },
  },
  {
    trackingNo: 'SYR-24002',
    hintKey: 'sample.redSea',
    containerNo: 'SYRU 731055-2',
    bl: 'SYR2410MER0002',
    customer: 'Demo Gıda Ltd.',
    cargo: '20RF · 21.0 t · Narenciye (soğutmalı)',
    origin: { code: 'TRMER', name: 'Mersin', country: 'TR' },
    destination: JEBEL_ALI,
    vessel: { name: 'MV ANATOLIA BRIDGE', imo: '9800002', flag: 'PA', carrier: 'Seyir Lines (demo)' },
    routeKey: 'mersinJebelAli',
    anchor: { from: 'redSea2', to: 'redSea3', frac: 0.4 },
  },
  {
    trackingNo: 'SYR-24003',
    hintKey: 'sample.arriving',
    containerNo: 'SYRU 205874-1',
    bl: 'SYR2410ALG0003',
    customer: 'Demo Makine San.',
    cargo: '40DV · 26.2 t · Makine parçaları',
    origin: { code: 'TRALI', name: 'Aliağa / İzmir', country: 'TR' },
    destination: JEBEL_ALI,
    vessel: { name: 'MV GOLDEN CRESCENT', imo: '9800003', flag: 'LR', carrier: 'Seyir Lines (demo)' },
    routeKey: 'izmirJebelAli',
    anchor: { from: 'omanGulf', to: 'hormuz', frac: 0.55 },
  },
];

function indexOf(route: Waypoint[], id: string): number {
  const i = route.findIndex((w) => w.id === id);
  if (i < 0) throw new Error(`waypoint yok: ${id}`);
  return i;
}

function build(def: ShipmentDef, now: number): Shipment {
  const route = ROUTES[def.routeKey];
  const { cumDist, cumDur } = measureRoute(route);
  const totalDist = cumDist[cumDist.length - 1];
  const totalDur = cumDur[cumDur.length - 1];

  const a = indexOf(route, def.anchor.from);
  const b = indexOf(route, def.anchor.to);
  const anchorDist = cumDist[a] + (cumDist[b] - cumDist[a]) * def.anchor.frac;
  const etd = now - durationAtDist(cumDist, cumDur, anchorDist);
  const eta = etd + totalDur;
  const cumTime = cumDur.map((d) => etd + d);

  const ps = indexOf(route, 'portSaid');
  const sz = indexOf(route, 'suez');

  const milestones: Milestone[] = [
    { key: 'gateIn', place: def.origin.name, time: etd - 30 * HOUR },
    { key: 'loaded', place: def.origin.name, time: etd - 6 * HOUR },
    { key: 'departed', place: def.origin.name, time: etd },
  ];
  route.forEach((w, i) => {
    if (w.milestone) milestones.push({ key: w.milestone, place: w.label ?? '', time: cumTime[i] });
  });
  milestones.push(
    { key: 'arrived', place: def.destination.name, time: eta },
    { key: 'discharged', place: def.destination.name, time: eta + 14 * HOUR },
  );

  return {
    trackingNo: def.trackingNo,
    containerNo: def.containerNo,
    bl: def.bl,
    customer: def.customer,
    cargo: def.cargo,
    origin: def.origin,
    destination: def.destination,
    vessel: def.vessel,
    route,
    cumDist,
    cumTime,
    totalDist,
    etd,
    eta,
    milestones,
    canal: { enterDist: cumDist[ps], exitDist: cumDist[sz], enterTime: cumTime[ps], exitTime: cumTime[sz] },
  };
}

export class MockProvider implements ShipmentProvider {
  private cache = new Map<string, Shipment>();

  async getShipment(trackingNo: string): Promise<Shipment | null> {
    const key = trackingNo.trim().toUpperCase().replace(/\s+/g, '');
    const def = DEFS.find((d) => d.trackingNo.replace(/\s+/g, '') === key);
    if (!def) return null;
    let s = this.cache.get(def.trackingNo);
    if (!s) {
      s = build(def, Date.now());
      this.cache.set(def.trackingNo, s);
    }
    // Ağ gecikmesi hissi
    await new Promise((r) => setTimeout(r, 250));
    return s;
  }

  listSamples() {
    return DEFS.map((d) => ({ trackingNo: d.trackingNo, hintKey: d.hintKey }));
  }
}
