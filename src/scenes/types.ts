import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { Shipment } from '../data/types';
import type { Quality } from '../perf/qualityPresets';
import type { LabelLayer } from './LabelLayer';
import type { SimClock } from './SimClock';

export type SceneKind = 'globe' | 'suez';
export type CameraMode = 'follow' | 'free' | 'cinematic';

export type SceneEvent =
  | { type: 'canalExit' }
  | { type: 'cameraMode'; mode: CameraMode };

export interface SceneContext {
  renderer: WebGLRenderer;
  quality: Quality;
  shipment: Shipment;
  clock: SimClock;
  labels: LabelLayer;
  canvas: HTMLCanvasElement;
  emit: (e: SceneEvent) => void;
}

export interface AppScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  update(dtS: number, elapsedS: number): void;
  applyQuality(q: Quality): void;
  resize(w: number, h: number): void;
  dispose(): void;
}
