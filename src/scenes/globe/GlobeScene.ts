import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Camera,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { positionAt } from '../../data/routeMath';
import type { Shipment } from '../../data/types';
import type { Quality } from '../../perf/qualityPresets';
import { mulberry32 } from '../../util/rng';
import { disposeObject } from '../dispose';
import type { AppScene, SceneContext } from '../types';
import { makeEarthCanvas } from './earthTexture';

const R = 100;
const toRad = Math.PI / 180;

export function latLonToVec3(lat: number, lon: number, r: number, out = new Vector3()): Vector3 {
  const phi = (90 - lat) * toRad;
  const theta = (lon + 180) * toRad;
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export class GlobeScene implements AppScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(40, 1, 1, 5000);
  private controls: OrbitControls;
  private shipment: Shipment;
  private routeMat: ShaderMaterial;
  private marker = new Group();
  private pulse: Mesh;
  private earth: Mesh;
  private stars?: Points;
  private fly: { from: Vector3; to: Vector3; fromDist: number; toDist: number; t: number; dur: number; resolve: () => void } | null = null;

  private tmpA = new Vector3();
  private tmpB = new Vector3();
  private camDir = new Vector3();

  constructor(private ctx: SceneContext) {
    const q = ctx.quality;
    this.shipment = ctx.shipment;
    this.scene.background = new Color('#030a16');

    // Işık kameraya bağlı: görünen yüz her zaman aydınlık
    this.scene.add(new AmbientLight('#9fb8d8', 1.1));
    const sun = new DirectionalLight('#fff4e0', 2.2);
    sun.position.set(-0.6, 0.5, 1);
    this.camera.add(sun);
    this.scene.add(this.camera);

    // Dünya
    const tex = new CanvasTexture(makeEarthCanvas(q.globeTexWidth));
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = q.tier === 'high' ? 4 : 1;
    this.earth = new Mesh(new SphereGeometry(R, q.globeSegments, q.globeSegments / 2), new MeshLambertMaterial({ map: tex }));
    this.scene.add(this.earth);

    // Atmosfer parlaması (tek ucuz shader)
    const atmo = new Mesh(
      new SphereGeometry(R * 1.13, 48, 24),
      new ShaderMaterial({
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(max(0.0, 0.72 - dot(vN, vec3(0.,0.,1.))), 3.0); gl_FragColor = vec4(0.36, 0.78, 1.0, 1.0) * i * 1.6; }`,
      }),
    );
    this.scene.add(atmo);

    this.buildStars(q.stars);
    this.routeMat = this.buildRoute(q);
    this.buildPorts();
    this.pulse = this.buildMarker();

    // Kamera: geminin üstünden başla
    const p = positionAt(this.shipment, ctx.clock.time);
    const portrait = ctx.canvas.clientWidth < ctx.canvas.clientHeight;
    latLonToVec3(p.lat - 12, p.lon - 10, portrait ? 380 : 300, this.camera.position);
    this.controls = new OrbitControls(this.camera, ctx.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.45;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 118;
    this.controls.maxDistance = 480;
    this.controls.target.set(0, 0, 0);
  }

  private buildStars(count: number) {
    const rnd = mulberry32(3);
    const pos = new Float32Array(count * 3);
    const v = new Vector3();
    for (let i = 0; i < count; i++) {
      v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(1600 + rnd() * 800);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    this.stars = new Points(g, new PointsMaterial({ color: '#cfe3ff', size: 1.6, sizeAttenuation: false }));
    this.scene.add(this.stars);
  }

  private buildRoute(q: Quality): ShaderMaterial {
    // Rotayı yoğunlaştır (≈0.4°) ve yüzeyin biraz üstüne kaldır
    const pts: Vector3[] = [];
    const route = this.shipment.route;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.lat - a.lat, b.lon - a.lon) / 0.4));
      for (let s = 0; s < steps; s++) {
        const f = s / steps;
        pts.push(latLonToVec3(a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f, R + 0.35));
      }
    }
    const last = route[route.length - 1];
    pts.push(latLonToVec3(last.lat, last.lon, R + 0.35));
    const curve = new CatmullRomCurve3(pts, false, 'centripetal');
    const segs = Math.min(q.tier === 'low' ? 500 : 1200, pts.length * 4);
    const geo = new TubeGeometry(curve, segs, 0.22, q.tier === 'low' ? 4 : 6, false);
    const mat = new ShaderMaterial({
      transparent: true,
      uniforms: { uProgress: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uProgress; uniform float uTime;
        void main(){
          float x = vUv.x;
          if (x <= uProgress) {
            float flow = step(0.5, fract(x * 220.0 - uTime * 1.2));
            gl_FragColor = vec4(mix(vec3(1.0,0.48,0.16), vec3(1.0,0.78,0.45), flow * 0.6), 1.0);
          } else {
            if (fract(x * 320.0) < 0.45) discard;
            gl_FragColor = vec4(0.85, 0.93, 1.0, 0.6);
          }
        }`,
    });
    this.scene.add(new Mesh(geo, mat));
    return mat;
  }

  private buildPorts() {
    const pinGeo = new CylinderGeometry(0.35, 0.35, 2.2, 8);
    pinGeo.translate(0, 1.1, 0);
    const route = this.shipment.route;
    const lastIdx = route.length - 1;
    route.forEach((w, i) => {
      if (!w.label) return;
      const isEnd = i === 0 || i === lastIdx;
      const pin = new Mesh(pinGeo, new MeshBasicMaterial({ color: isEnd ? '#ff8a3d' : '#7fd3ff' }));
      const p = latLonToVec3(w.lat, w.lon, R);
      pin.position.copy(p);
      pin.lookAt(this.tmpA.copy(p).multiplyScalar(2));
      pin.rotateX(Math.PI / 2);
      this.scene.add(pin);
      const label = this.ctx.labels.add({ text: w.label, cls: isEnd ? 'label-port end' : 'label-port', visible: this.frontFacing(p) });
      latLonToVec3(w.lat, w.lon, R + 2.6, label.pos);
    });
  }

  private frontFacing(p: Vector3) {
    const n = p.clone().normalize();
    return (cam: Camera) => this.camDir.copy(cam.position).normalize().dot(n) > 0.2;
  }

  private buildMarker(): Mesh {
    const arrow = new Mesh(new ConeGeometry(0.9, 2.6, 4), new MeshBasicMaterial({ color: '#ffd166' }));
    arrow.rotation.x = Math.PI / 2; // ucu +z yönüne baksın
    arrow.position.y = 0.4;
    this.marker.add(arrow);
    const ring = new Mesh(
      new RingGeometry(1.2, 1.6, 32),
      new MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.8, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.marker.add(ring);
    this.scene.add(this.marker);
    const label = this.ctx.labels.add({ text: this.shipment.vessel.name, cls: 'label-ship' });
    this.marker.userData.label = label;
    return ring;
  }

  /** Kamerayı Süveyş'in üzerine sinematik olarak uçurur. */
  flyToSuez(): Promise<void> {
    return new Promise((resolve) => {
      this.controls.enabled = false;
      const from = this.camera.position.clone();
      const to = latLonToVec3(30.2, 32.6, 1).normalize();
      // Biraz güneyden bakan açı
      to.add(latLonToVec3(20, 32.6, 1).normalize().multiplyScalar(0.15)).normalize();
      this.fly = { from: from.clone().normalize(), to, fromDist: from.length(), toDist: 122, t: 0, dur: 1.9, resolve };
    });
  }

  update(dtS: number, elapsedS: number) {
    const p = positionAt(this.shipment, this.ctx.clock.time);
    this.routeMat.uniforms.uProgress.value = p.progress;
    this.routeMat.uniforms.uTime.value = elapsedS;

    // Gemi işareti: yüzey normaline dik, rota yönüne bakar
    const pos = latLonToVec3(p.lat, p.lon, R + 0.5, this.tmpA);
    this.marker.position.copy(pos);
    this.marker.up.copy(pos).normalize();
    const h = p.headingDeg * toRad;
    latLonToVec3(p.lat + Math.cos(h) * 0.3, p.lon + (Math.sin(h) * 0.3) / Math.cos(p.lat * toRad), R + 0.5, this.tmpB);
    this.marker.lookAt(this.tmpB);
    const s = 1 + ((elapsedS * 0.8) % 1) * 1.6;
    this.pulse.scale.setScalar(s);
    (this.pulse.material as MeshBasicMaterial).opacity = 0.85 * (1 - ((elapsedS * 0.8) % 1));
    const label = this.marker.userData.label;
    label.pos.copy(pos).multiplyScalar((R + 4) / (R + 0.5));

    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dtS / f.dur);
      const e = easeInOut(f.t);
      // Küresel ara değer (slerp) + mesafe
      const dir = this.tmpB.copy(f.from).lerp(f.to, e).normalize();
      this.camera.position.copy(dir).multiplyScalar(f.fromDist + (f.toDist - f.fromDist) * e);
      this.camera.lookAt(0, 0, 0);
      if (f.t >= 1) {
        this.fly = null;
        f.resolve();
      }
    } else {
      this.controls.update();
    }
    if (this.stars) this.stars.rotation.y += dtS * 0.004;
  }

  applyQuality(q: Quality) {
    // Küre dokusu/segmentleri yeniden kurulmaz (tek seferlik); yıldız sayısı canlı ayarlanır.
    if (this.stars) this.stars.geometry.setDrawRange(0, q.stars);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    // Dar (dikey) ekranda dünya sığsın
    this.camera.fov = w < h ? 55 : 40;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.controls.dispose();
    disposeObject(this.scene);
  }
}
