import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraMode } from '../types';

const UP = new Vector3(0, 1, 0);

/**
 * Kamera modları:
 * - follow: geminin arkasından yumuşak takip
 * - free: parmakla/fareyle döndür-yakınlaştır (gemiyle birlikte kayar)
 * - cinematic: otomatik değişen film açıları
 * Ayrıca açılışta yukarıdan alçalan bir "intro" çekimi.
 */
export class CameraRig {
  mode: CameraMode = 'follow';
  readonly controls: OrbitControls;
  private intro = 0; // >0 iken intro çekimi
  private shotTime = 0;
  private shot = 0;
  private lookAt = new Vector3();
  private desiredPos = new Vector3();
  private desiredLook = new Vector3();
  private side = new Vector3();
  private lastShip = new Vector3();
  private delta = new Vector3();
  private hasLast = false;

  constructor(
    private camera: PerspectiveCamera,
    dom: HTMLElement,
    private onUserTakeover: () => void,
  ) {
    this.controls = new OrbitControls(camera, dom);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47; // su altına inmesin
    this.controls.minDistance = 60;
    this.controls.maxDistance = 2400;
    this.controls.enablePan = false;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('wheel', this.onPointerDown, { passive: true });
  }

  private onPointerDown = () => {
    if (this.mode !== 'free') {
      this.setMode('free');
      this.onUserTakeover();
    }
  };

  startIntro(shipPos: Vector3, fwd: Vector3) {
    this.intro = 1;
    this.camera.position.copy(shipPos).addScaledVector(fwd, 900).add(new Vector3(0, 1100, 0));
    this.lookAt.copy(shipPos);
    this.camera.lookAt(this.lookAt);
  }

  setMode(mode: CameraMode) {
    this.mode = mode;
    this.intro = 0;
    this.controls.enabled = mode === 'free';
    if (mode === 'free') {
      this.controls.target.copy(this.lookAt);
      this.controls.update();
    }
    this.shotTime = 0;
  }

  update(dt: number, ship: Vector3, fwd: Vector3) {
    this.side.crossVectors(UP, fwd).normalize();
    const delta = this.delta;
    if (this.hasLast) delta.copy(ship).sub(this.lastShip);
    else delta.set(0, 0, 0);
    this.lastShip.copy(ship);
    this.hasLast = true;

    if (this.mode === 'free') {
      // Gemi ilerlerken kamera da aynı miktar kaysın
      this.camera.position.add(delta);
      this.controls.target.copy(ship).addScaledVector(UP, 15);
      this.controls.update();
      this.lookAt.copy(this.controls.target);
      return;
    }

    let k: number;
    if (this.mode === 'follow' || this.intro > 0) {
      this.desiredPos.copy(ship).addScaledVector(fwd, -400).addScaledVector(UP, 165).addScaledVector(this.side, 90);
      this.desiredLook.copy(ship).addScaledVector(fwd, 40).addScaledVector(UP, 10);
      k = this.intro > 0 ? 1.1 : 2.5;
      if (this.intro > 0) {
        this.intro = Math.max(0, this.intro - dt / 4);
      }
    } else {
      this.cinematic(dt, ship, fwd);
      k = 1.2;
    }
    const a = 1 - Math.exp(-dt * k);
    this.camera.position.add(delta).lerp(this.desiredPos, a);
    this.lookAt.add(delta).lerp(this.desiredLook, a);
    this.camera.lookAt(this.lookAt);
  }

  private cinematic(dt: number, ship: Vector3, fwd: Vector3) {
    this.shotTime += dt;
    if (this.shotTime > 9) {
      this.shotTime = 0;
      this.shot = (this.shot + 1) % 5;
    }
    const t = this.shotTime;
    const p = this.desiredPos.copy(ship);
    const l = this.desiredLook.copy(ship);
    switch (this.shot) {
      case 0: // alçak yan takip
        p.addScaledVector(this.side, 240).addScaledVector(UP, 22).addScaledVector(fwd, 40 - t * 8);
        l.addScaledVector(fwd, 30).addScaledVector(UP, 20);
        break;
      case 1: // yüksek hava çekimi
        p.addScaledVector(fwd, -520).addScaledVector(UP, 430);
        l.addScaledVector(fwd, 260);
        break;
      case 2: // önden pruvaya bakış
        p.addScaledVector(fwd, 430).addScaledVector(this.side, -90).addScaledVector(UP, 38);
        l.addScaledVector(UP, 25);
        break;
      case 3: {
        // yavaş tur
        const ang = t * 0.18;
        p.addScaledVector(fwd, Math.cos(ang) * 380).addScaledVector(this.side, Math.sin(ang) * 380).addScaledVector(UP, 150);
        l.addScaledVector(UP, 20);
        break;
      }
      case 4: // tepeden
        p.addScaledVector(UP, 650).addScaledVector(fwd, MathUtils.lerp(-120, 120, t / 9));
        l.addScaledVector(fwd, 1);
        break;
    }
  }

  dispose(dom: HTMLElement) {
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('wheel', this.onPointerDown);
    this.controls.dispose();
  }
}
