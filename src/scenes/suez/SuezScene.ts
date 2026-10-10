import { Color, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera, Scene, Vector3, type Camera } from 'three';
import { positionAt } from '../../data/routeMath';
import type { Quality } from '../../perf/qualityPresets';
import { CameraRig } from '../camera/CameraRig';
import { disposeObject } from '../dispose';
import type { Label } from '../LabelLayer';
import type { AppScene, CameraMode, SceneContext } from '../types';
import { Environment } from './Environment';
import { ShipModel, SHIP_HALF_BEAM, SHIP_HALF_LENGTH } from './Ship';
import { Sky } from './Sky';
import { CanalPath } from './suezPath';
import { Wake } from './Wake';
import { Water } from './Water';

const SKY_TOP = new Color('#3f86cf');
const HORIZON = new Color('#efd9b4');
const SUN_DIR = new Vector3(-0.62, 0.52, 0.42).normalize();

const MAIN_PALETTE = ['#1f6fb2', '#c0392b', '#e6b422', '#2e8b57', '#8a9399', '#d35400', '#ecebe6', '#34495e', '#7d3c98', '#16a085'];
const CONVOY_PALETTES = [
  ['#2b5d8a', '#8a2b2b', '#d8d8d8', '#4a7a3a', '#b8860b', '#5d6d7e'],
  ['#c0392b', '#ecebe6', '#1f6fb2', '#27ae60', '#f39c12', '#7f8c8d'],
];
const CONVOY_OFFSETS = [1900, -1750];

interface ConvoyShip {
  model: ShipModel;
  offset: number;
}

export class SuezScene implements AppScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(50, 1, 2, 14000);
  private path = new CanalPath();
  private water: Water;
  private env: Environment;
  private sky: Sky;
  private ship: ShipModel;
  private convoy: ConvoyShip[] = [];
  private wake: Wake;
  private rig: CameraRig;
  private sun: DirectionalLight;
  private fog: Fog;
  private containerLabel: Label;
  private q: Quality;
  private exitNotified: boolean;
  private lastArc = -1;
  private sceneSpeed = 0;

  private shipPos = new Vector3();
  private tan = new Vector3();
  private fwd = new Vector3();
  private tmp = new Vector3();
  private tmp2 = new Vector3();
  private shipsUniform = [
    { x: 0, z: 0, fx: 1, fz: 0 },
    { x: 0, z: 0, fx: 1, fz: 0 },
    { x: 0, z: 0, fx: 1, fz: 0 },
  ];

  constructor(private ctx: SceneContext) {
    const q = (this.q = ctx.quality);
    this.scene.background = HORIZON;
    this.fog = new Fog(HORIZON, q.fogNear, q.fogFar);
    this.scene.fog = this.fog;

    this.scene.add(new HemisphereLight('#cfe6ff', '#d9b98a', 1.5));
    this.sun = new DirectionalLight('#ffe7c2', 2.4);
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -260;
    sc.right = sc.top = 260;
    sc.near = 100;
    sc.far = 2000;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.sky = new Sky(SKY_TOP, HORIZON, SUN_DIR, 9000);
    this.scene.add(this.sky.mesh);

    this.water = new Water(q, { skyTop: SKY_TOP, skyHorizon: HORIZON, sunDir: SUN_DIR, fogColor: HORIZON });
    this.water.material.uniforms.uShipSize.value.set(SHIP_HALF_LENGTH, SHIP_HALF_BEAM);
    this.scene.add(this.water.mesh);

    this.env = new Environment(this.path, q);
    this.scene.add(this.env.group);

    this.ship = new ShipModel({ seed: 42, maxTiers: 5, palette: MAIN_PALETTE, funnel: '#ff8a3d', highlight: true });
    this.scene.add(this.ship.group);
    CONVOY_OFFSETS.forEach((offset, i) => {
      const model = new ShipModel({ seed: 100 + i, maxTiers: 5, palette: CONVOY_PALETTES[i], funnel: i ? '#c0392b' : '#2b5d8a', highlight: false });
      this.convoy.push({ model, offset });
      this.scene.add(model.group);
    });

    this.wake = new Wake(q.wakeParticles);
    this.scene.add(this.wake.points);

    this.addPlaceLabels();
    this.containerLabel = ctx.labels.add({ key: 'hud.yourContainer', text: ctx.shipment.containerNo, cls: 'label-container' });

    this.rig = new CameraRig(this.camera, ctx.canvas, () => ctx.emit({ type: 'cameraMode', mode: 'free' }));
    const p = positionAt(ctx.shipment, ctx.clock.time);
    this.exitNotified = p.canalT > 1;
    this.placeShip(0, 0);
    this.rig.startIntro(this.shipPos, this.fwd);

    this.applyQuality(q);
  }

  private addPlaceLabels() {
    const { path, ctx } = this;
    const far = (pos: Vector3) => (cam: Camera) => cam.position.distanceTo(pos) < this.q.fogFar * 0.9;
    const place = (key: string, arc: number, side: number, off: number, y: number) => {
      const l = ctx.labels.add({ key, cls: 'label-place' });
      path.sample(arc, l.pos, this.tan);
      const hw = path.halfWidthAt(arc);
      l.pos.x += -this.tan.z * side * (hw + off);
      l.pos.z += this.tan.x * side * (hw + off);
      l.pos.y = y;
      l.visible = far(l.pos);
    };
    place('place.portSaid', path.portSaidArc - 150, 1, 350, 60);
    place('place.bridge', path.arcById.qantara, 0, 0, 95);
    place('place.ismailia', path.arcById.timsah, 1, 300, 60);
    place('place.bitter', path.arcById.bitterMid, 0, 0, 30);
    place('place.suez', path.suezArc + 150, 1, 300, 60);
  }

  setCameraMode(mode: CameraMode) {
    this.rig.setMode(mode);
  }

  /** Gemiyi yay uzunluğuna yerleştirir; dalgaya göre sallanır. */
  private placeShip(dt: number, elapsed: number) {
    const p = positionAt(this.ctx.shipment, this.ctx.clock.time);
    const arc = Math.min(this.path.length - 300, Math.max(300, this.path.arcFromCanalT(p.canalT)));
    if (this.lastArc >= 0 && dt > 0) this.sceneSpeed = Math.abs(arc - this.lastArc) / dt;
    this.lastArc = arc;
    this.orient(this.ship, arc, elapsed, this.shipPos, this.fwd);

    if (p.canalT > 1.0 && !this.exitNotified) {
      this.exitNotified = true;
      this.ctx.emit({ type: 'canalExit' });
    } else if (p.canalT < 0.98) {
      this.exitNotified = false;
    }
  }

  private orient(model: ShipModel, arc: number, elapsed: number, outPos: Vector3, outFwd: Vector3) {
    this.path.sample(arc, outPos, this.tan);
    outFwd.set(this.tan.x, 0, this.tan.z).normalize();
    const w = this.water;
    const sx = -outFwd.z;
    const sz = outFwd.x;
    const L = SHIP_HALF_LENGTH * 0.8;
    const B = SHIP_HALF_BEAM;
    const hb = w.heightAt(outPos.x + outFwd.x * L, outPos.z + outFwd.z * L, elapsed);
    const hs = w.heightAt(outPos.x - outFwd.x * L, outPos.z - outFwd.z * L, elapsed);
    const hp = w.heightAt(outPos.x + sx * B, outPos.z + sz * B, elapsed);
    const hq = w.heightAt(outPos.x - sx * B, outPos.z - sz * B, elapsed);
    const g = model.group;
    g.position.set(outPos.x, ((hb + hs + hp + hq) / 4) * 0.5, outPos.z);
    // Ağır gemi: dalganın sadece bir kısmını hisseder
    g.rotation.set(Math.atan2(hp - hq, 2 * B) * 0.35, Math.atan2(-outFwd.z, outFwd.x), Math.atan2(hb - hs, 2 * L) * 0.5, 'YZX');
  }

  update(dt: number, elapsed: number) {
    this.placeShip(dt, elapsed);
    this.ship.update(elapsed);

    let n = 1;
    const s0 = this.shipsUniform[0];
    s0.x = this.shipPos.x;
    s0.z = this.shipPos.z;
    s0.fx = this.fwd.x;
    s0.fz = this.fwd.z;
    for (const c of this.convoy) {
      if (!c.model.group.visible) continue;
      const arc = this.lastArc + c.offset;
      const inRange = arc > 200 && arc < this.path.length - 200;
      c.model.group.children.forEach((ch) => (ch.visible = inRange));
      if (!inRange) continue;
      this.orient(c.model, arc, elapsed + c.offset, this.tmp, this.tmp2);
      const u = this.shipsUniform[n++];
      u.x = this.tmp.x;
      u.z = this.tmp.z;
      u.fx = this.tmp2.x;
      u.fz = this.tmp2.z;
    }
    this.water.setShips(this.shipsUniform, n);
    this.water.setTime(elapsed);

    this.wake.update(dt, this.shipPos, this.fwd, this.sceneSpeed);
    this.rig.update(dt, this.shipPos, this.fwd);
    this.water.follow(this.camera.position);
    this.sky.mesh.position.copy(this.camera.position);

    if (this.sun.castShadow) {
      this.sun.target.position.copy(this.shipPos);
      this.sun.position.copy(this.shipPos).addScaledVector(SUN_DIR, 900);
    } else {
      this.sun.position.copy(SUN_DIR).multiplyScalar(1000);
      this.sun.target.position.set(0, 0, 0);
    }

    this.containerLabel.pos.copy(this.ship.highlightLocal);
    this.containerLabel.pos.y += 26;
    this.ship.group.localToWorld(this.containerLabel.pos);
  }

  applyQuality(q: Quality) {
    this.q = q;
    this.fog.near = q.fogNear;
    this.fog.far = q.fogFar;
    this.water.applyQuality(q);
    this.env.applyQuality(q);
    this.ship.setTiers(q.containerTiers);
    this.convoy.forEach((c, i) => {
      c.model.group.visible = i < q.extraShips;
      c.model.setTiers(Math.max(2, q.containerTiers - 1));
    });
    this.wake.setCount(q.wakeParticles);
    const shadows = q.shadows && this.ctx.renderer.shadowMap.enabled;
    this.sun.castShadow = shadows;
    this.ship.setShadows(shadows);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 68 : 50;
    this.camera.updateProjectionMatrix();
    this.wake.setScale(h);
  }

  dispose() {
    this.rig.dispose(this.ctx.canvas);
    disposeObject(this.scene);
  }
}
