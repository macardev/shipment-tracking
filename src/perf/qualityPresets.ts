export type Tier = 'low' | 'mid' | 'high';
export const TIERS: Tier[] = ['low', 'mid', 'high'];

export interface Quality {
  tier: Tier;
  /** devicePixelRatio için üst sınır. QualityManager bunu ayrıca ölçekleyebilir. */
  maxPixelRatio: number;
  minPixelRatio: number;
  fpsCap: number;
  antialias: boolean;
  // Su
  waterSegments: number;
  waveCount: number;
  crestFoam: boolean;
  // Sahne yoğunluğu
  palmCount: number;
  buildingCount: number;
  containerTiers: number;
  extraShips: number;
  wakeParticles: number;
  shadows: boolean;
  fogNear: number;
  fogFar: number;
  bankSamples: number;
  // Dünya küresi
  globeTexWidth: number;
  globeSegments: number;
  stars: number;
}

export const PRESETS: Record<Tier, Quality> = {
  low: {
    tier: 'low',
    maxPixelRatio: 1,
    minPixelRatio: 0.6,
    fpsCap: 30,
    antialias: false,
    waterSegments: 64,
    waveCount: 2,
    crestFoam: false,
    palmCount: 150,
    buildingCount: 120,
    containerTiers: 3,
    extraShips: 1,
    wakeParticles: 0,
    shadows: false,
    fogNear: 500,
    fogFar: 2600,
    bankSamples: 260,
    globeTexWidth: 2048,
    globeSegments: 48,
    stars: 400,
  },
  mid: {
    tier: 'mid',
    maxPixelRatio: 1.5,
    minPixelRatio: 0.75,
    fpsCap: 60,
    antialias: false,
    waterSegments: 128,
    waveCount: 3,
    crestFoam: false,
    palmCount: 400,
    buildingCount: 260,
    containerTiers: 4,
    extraShips: 2,
    wakeParticles: 150,
    shadows: false,
    fogNear: 700,
    fogFar: 4000,
    bankSamples: 420,
    globeTexWidth: 2048,
    globeSegments: 64,
    stars: 1200,
  },
  high: {
    tier: 'high',
    maxPixelRatio: 2,
    minPixelRatio: 1,
    fpsCap: 60,
    antialias: true,
    waterSegments: 256,
    waveCount: 4,
    crestFoam: true,
    palmCount: 1000,
    buildingCount: 500,
    containerTiers: 5,
    extraShips: 2,
    wakeParticles: 400,
    shadows: true,
    fogNear: 1000,
    fogFar: 6000,
    bankSamples: 600,
    globeTexWidth: 4096,
    globeSegments: 96,
    stars: 2500,
  },
};
