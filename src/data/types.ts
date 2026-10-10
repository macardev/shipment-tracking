export interface LatLon {
  lat: number;
  lon: number;
}

/** Deniz bölgeleri; arayüzde i18n anahtarı olarak kullanılır (`area.<key>`). */
export type AreaKey =
  | 'port'
  | 'marmara'
  | 'dardanelles'
  | 'aegean'
  | 'med'
  | 'suezCanal'
  | 'gulfOfSuez'
  | 'redSea'
  | 'babElMandeb'
  | 'gulfOfAden'
  | 'arabianSea'
  | 'gulfOfOman'
  | 'hormuz'
  | 'persianGulf';

export type MilestoneKey =
  | 'gateIn'
  | 'loaded'
  | 'departed'
  | 'dardanelles'
  | 'suezEnter'
  | 'suezExit'
  | 'babElMandeb'
  | 'hormuz'
  | 'arrived'
  | 'discharged';

export interface Waypoint extends LatLon {
  id?: string;
  /** Bu noktadan bir sonrakine kadar olan bölge. */
  area: AreaKey;
  /** Bu noktaya varıldığında oluşan olay. */
  milestone?: MilestoneKey;
  /** Haritada gösterilecek isim (liman / geçit). */
  label?: string;
  /** Bu noktadan sonraki bacakta hız (knot). Yoksa varsayılan deniz hızı. */
  speedKn?: number;
}

export interface Port {
  code: string;
  name: string;
  country: string;
}

export interface Vessel {
  name: string;
  imo: string;
  flag: string;
  carrier: string;
}

export interface Milestone {
  key: MilestoneKey;
  place: string;
  time: number;
}

export interface Shipment {
  trackingNo: string;
  containerNo: string;
  bl: string;
  customer: string;
  cargo: string;
  origin: Port;
  destination: Port;
  vessel: Vessel;
  route: Waypoint[];
  /** Her waypoint'e kadar kümülatif mesafe (metre). */
  cumDist: number[];
  /** Her waypoint'e varış zamanı (ms, epoch). */
  cumTime: number[];
  totalDist: number;
  etd: number;
  eta: number;
  milestones: Milestone[];
  canal: { enterDist: number; exitDist: number; enterTime: number; exitTime: number };
}

export interface ShipPosition extends LatLon {
  /** Rota boyunca alınan mesafe (metre). */
  dist: number;
  progress: number;
  segIndex: number;
  area: AreaKey;
  headingDeg: number;
  speedKn: number;
  phase: 'beforeDeparture' | 'atSea' | 'arrived';
  inCanal: boolean;
  /** Kanal içinde 0..1, dışında <0 veya >1. */
  canalT: number;
}
