import type { Waypoint } from './types';

/**
 * Basitleştirilmiş deniz rotaları (gerçek coğrafyaya yakın, demo amaçlı).
 * Süveyş Kanalı noktaları 3D sahnede de aynen kullanılır.
 */

export const CANAL_SPEED_KN = 8;
export const SEA_SPEED_KN = 14;

const ISTANBUL_TO_MED: Waypoint[] = [
  { id: 'istanbul', lat: 40.965, lon: 28.69, area: 'marmara', label: 'Ambarlı / İstanbul' },
  { lat: 40.84, lon: 28.4, area: 'marmara' },
  { lat: 40.62, lon: 27.5, area: 'marmara' },
  { id: 'dardanellesN', lat: 40.42, lon: 26.72, area: 'dardanelles', milestone: 'dardanelles', label: 'Çanakkale Boğazı' },
  { lat: 40.15, lon: 26.42, area: 'dardanelles' },
  { lat: 40.02, lon: 26.18, area: 'aegean' },
  { lat: 39.4, lon: 25.75, area: 'aegean' },
  { lat: 38.3, lon: 25.25, area: 'aegean' },
  { lat: 37.35, lon: 25.55, area: 'aegean' },
  { lat: 36.3, lon: 26.4, area: 'aegean' },
  { lat: 35.55, lon: 26.95, area: 'med' },
  { lat: 34.3, lon: 28.8, area: 'med' },
  { lat: 32.8, lon: 31.0, area: 'med' },
  { lat: 31.65, lon: 32.33, area: 'med' },
];

const IZMIR_TO_MED: Waypoint[] = [
  { id: 'izmir', lat: 38.8, lon: 26.94, area: 'aegean', label: 'Aliağa / İzmir' },
  { lat: 38.7, lon: 26.55, area: 'aegean' },
  { lat: 38.35, lon: 26.1, area: 'aegean' },
  { lat: 37.6, lon: 25.75, area: 'aegean' },
  { lat: 36.3, lon: 26.4, area: 'aegean' },
  { lat: 35.55, lon: 26.95, area: 'med' },
  { lat: 34.3, lon: 28.8, area: 'med' },
  { lat: 32.8, lon: 31.0, area: 'med' },
  { lat: 31.65, lon: 32.33, area: 'med' },
];

const MERSIN_TO_MED: Waypoint[] = [
  { id: 'mersin', lat: 36.78, lon: 34.64, area: 'med', label: 'Mersin' },
  { lat: 36.4, lon: 34.4, area: 'med' },
  { lat: 34.9, lon: 33.6, area: 'med' },
  { lat: 33.2, lon: 32.75, area: 'med' },
  { lat: 31.65, lon: 32.33, area: 'med' },
];

/** Port Said → Süveyş. 3D kanal sahnesi bu noktalardan kurulur. */
export const SUEZ_CANAL: Waypoint[] = [
  { id: 'portSaid', lat: 31.265, lon: 32.307, area: 'suezCanal', milestone: 'suezEnter', label: 'Port Said', speedKn: CANAL_SPEED_KN },
  { lat: 31.1, lon: 32.311, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'qantara', lat: 30.85, lon: 32.316, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { lat: 30.7, lon: 32.33, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { lat: 30.6, lon: 32.318, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'timsah', lat: 30.565, lon: 32.295, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { lat: 30.52, lon: 32.33, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { lat: 30.42, lon: 32.352, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'bitterN', lat: 30.37, lon: 32.385, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'bitterMid', lat: 30.29, lon: 32.43, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'bitterS', lat: 30.21, lon: 32.48, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'littleBitter', lat: 30.14, lon: 32.535, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { lat: 30.07, lon: 32.565, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { lat: 30.0, lon: 32.572, area: 'suezCanal', speedKn: CANAL_SPEED_KN },
  { id: 'suez', lat: 29.935, lon: 32.562, area: 'gulfOfSuez', milestone: 'suezExit', label: 'Süveyş' },
];

const RED_SEA_TO_JEBEL_ALI: Waypoint[] = [
  { lat: 29.6, lon: 32.66, area: 'gulfOfSuez' },
  { lat: 28.6, lon: 33.15, area: 'gulfOfSuez' },
  { id: 'redSea1', lat: 27.6, lon: 33.95, area: 'redSea' },
  { id: 'redSea2', lat: 25.5, lon: 35.3, area: 'redSea' },
  { id: 'redSea3', lat: 22.0, lon: 37.6, area: 'redSea' },
  { lat: 18.5, lon: 39.6, area: 'redSea' },
  { lat: 15.3, lon: 41.6, area: 'redSea' },
  { id: 'babElMandeb', lat: 12.62, lon: 43.35, area: 'gulfOfAden', milestone: 'babElMandeb', label: 'Bab-ül Mendeb' },
  { lat: 12.2, lon: 45.2, area: 'gulfOfAden' },
  { lat: 12.9, lon: 48.5, area: 'gulfOfAden' },
  { lat: 14.1, lon: 51.8, area: 'arabianSea' },
  { lat: 16.2, lon: 55.0, area: 'arabianSea' },
  { lat: 18.6, lon: 57.9, area: 'arabianSea' },
  { lat: 21.2, lon: 59.6, area: 'arabianSea' },
  { lat: 22.75, lon: 60.1, area: 'gulfOfOman' },
  { id: 'omanGulf', lat: 24.2, lon: 58.6, area: 'gulfOfOman' },
  { lat: 25.4, lon: 57.1, area: 'gulfOfOman' },
  { id: 'hormuz', lat: 26.45, lon: 56.55, area: 'persianGulf', milestone: 'hormuz', label: 'Hürmüz Boğazı' },
  { lat: 26.25, lon: 55.75, area: 'persianGulf' },
  { lat: 25.55, lon: 55.15, area: 'persianGulf' },
  { lat: 25.2, lon: 54.98, area: 'persianGulf' },
  { id: 'jebelAli', lat: 25.01, lon: 55.06, area: 'port', label: 'Jebel Ali / Dubai' },
];

export const ROUTES: Record<string, Waypoint[]> = {
  istanbulJebelAli: [...ISTANBUL_TO_MED, ...SUEZ_CANAL, ...RED_SEA_TO_JEBEL_ALI],
  izmirJebelAli: [...IZMIR_TO_MED, ...SUEZ_CANAL, ...RED_SEA_TO_JEBEL_ALI],
  mersinJebelAli: [...MERSIN_TO_MED, ...SUEZ_CANAL, ...RED_SEA_TO_JEBEL_ALI],
};
