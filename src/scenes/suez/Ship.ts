import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  RingGeometry,
  SRGBColorSpace,
  Shape,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../util/rng';

export const SHIP_HALF_LENGTH = 110;
export const SHIP_HALF_BEAM = 16;
const DECK_Y = 14;

export interface ShipOptions {
  seed: number;
  maxTiers: number;
  palette: string[];
  funnel: string;
  highlight: boolean;
}

function colorize(g: BufferGeometry, color: string, topColor?: string): BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new Color(color);
  const top = topColor ? new Color(topColor) : c;
  const n = geo.attributes.normal;
  const cols = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const cc = n.getY(i) > 0.7 ? top : c;
    cols.set([cc.r, cc.g, cc.b], i * 3);
  }
  geo.setAttribute('color', new Float32BufferAttribute(cols, 3));
  geo.deleteAttribute('uv');
  return geo;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, top?: string) {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return colorize(g, color, top);
}

function hullShape(L: number, B: number): Shape {
  const s = new Shape();
  s.moveTo(-L + 8, -B);
  s.lineTo(L - 45, -B);
  s.quadraticCurveTo(L - 6, -B * 0.92, L, 0);
  s.quadraticCurveTo(L - 6, B * 0.92, L - 45, B);
  s.lineTo(-L + 8, B);
  s.quadraticCurveTo(-L, B, -L, B - 8);
  s.lineTo(-L, -B + 8);
  s.quadraticCurveTo(-L, -B, -L + 8, -B);
  return s;
}

function extrudeHull(depth: number, y: number, color: string, deck?: string, inset = 0) {
  const g = new ExtrudeGeometry(hullShape(SHIP_HALF_LENGTH - inset, SHIP_HALF_BEAM - inset), {
    depth,
    bevelEnabled: false,
    curveSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return colorize(g, color, deck);
}

let ribTexture: CanvasTexture | null = null;
/** Konteyner oluklu yüzeyi: küçük bir şerit dokusu (tüm konteynerlerde ortak). */
function getRibTexture() {
  if (ribTexture) return ribTexture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let x = 0; x < 64; x += 4) ctx.fillRect(x, 0, 1.5, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, 2, 4);
  ctx.fillRect(62, 0, 2, 4);
  ribTexture = new CanvasTexture(c);
  ribTexture.colorSpace = SRGBColorSpace;
  return ribTexture;
}

/**
 * Prosedürel konteyner gemisi.
 * Draw call: gövde+köprüüstü (1, birleştirilmiş) + konteynerler (1, instanced) + vurgulu konteyner (2).
 */
export class ShipModel {
  readonly group = new Group();
  readonly containers: InstancedMesh;
  /** Vurgulu (müşterinin) konteynerin gemiye göre konumu. */
  readonly highlightLocal = new Vector3();
  private tierCum: number[] = [];
  private highlightMesh?: Mesh;
  private hull: Mesh;
  private marker?: Group;

  constructor(opts: ShipOptions) {
    const rnd = mulberry32(opts.seed);

    // Gövde, güverte ve köprüüstü tek geometride (vertex renkli)
    const parts = [
      extrudeHull(6, -5, '#9b2a22'),
      extrudeHull(13, 1, '#1b2735', '#59616b'),
      box(15, 36, 28, -93, DECK_Y + 18, 0, '#f1f1ec', '#d9d9d2'),
      box(0.6, 3.2, 26, -85.4, 46, 0, '#16202b'),
      box(0.6, 2.2, 26, -85.4, 39, 0, '#2a3644'),
      box(0.6, 2.2, 26, -85.4, 33, 0, '#2a3644'),
      box(11, 3, 42, -89, 49.5, 0, '#f1f1ec', '#d9d9d2'),
      box(0.4, 1.8, 41, -83.4, 49.6, 0, '#16202b'),
      box(7, 15, 9, -101, 57, 0, opts.funnel),
      box(7.2, 2, 9.2, -101, 64.5, 0, '#151515'),
      box(6, 2.6, 3, -93, 30, 15.6, '#ff7a1a'),
      box(6, 2.6, 3, -93, 30, -15.6, '#ff7a1a'),
      box(1.2, 20, 1.2, 96, DECK_Y + 10, 0, '#d9d9d2'),
      box(1.2, 14, 1.2, -80, DECK_Y + 7 + 36, 0, '#d9d9d2'),
      box(12, 3, 30, 92, DECK_Y + 1.5, 0, '#1b2735', '#59616b'),
    ];
    const hull = (this.hull = new Mesh(mergeGeometries(parts), new MeshLambertMaterial({ vertexColors: true })));
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.group.add(hull);

    // Konteyner yerleşimi: bay (boyuna) × sıra (enine) × kat
    type Slot = { x: number; y: number; z: number; tier: number; color: Color };
    const slots: Slot[] = [];
    const palette = opts.palette.map((c) => new Color(c));
    const bays = 25;
    const pitchX = 6.6;
    const startX = -80;
    const HIGHLIGHT_BAY = 9;
    let hl: Slot | null = null;
    for (let b = 0; b < bays; b++) {
      const x = startX + b * pitchX + 3.1;
      const taper = Math.max(0, b - (bays - 4)); // pruvaya doğru daralma
      const rows = 10 - taper * 2;
      const stack = b === HIGHLIGHT_BAY ? 3 : opts.maxTiers - (rnd() < 0.35 ? 1 : 0) - (rnd() < 0.15 ? 1 : 0);
      for (let r = 0; r < rows; r++) {
        const z = (r - (rows - 1) / 2) * 2.6;
        for (let t = 0; t < stack; t++) {
          const base = palette[Math.floor(rnd() * palette.length)];
          const col = base.clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.08);
          const slot = { x, y: DECK_Y + 1.3 + t * 2.6, z, tier: t, color: col };
          slots.push(slot);
          if (opts.highlight && b === HIGHLIGHT_BAY && r === rows - 1 && t === 2) hl = slot;
        }
      }
    }
    slots.sort((a, b) => a.tier - b.tier);
    for (let t = 0; t <= 6; t++) this.tierCum[t] = slots.filter((s) => s.tier < t).length;

    const cGeo = new BoxGeometry(6.2, 2.5, 2.45);
    this.containers = new InstancedMesh(cGeo, new MeshLambertMaterial({ map: getRibTexture() }), slots.length);
    const dummy = new Object3D();
    slots.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.updateMatrix();
      this.containers.setMatrixAt(i, dummy.matrix);
      this.containers.setColorAt(i, s.color);
    });
    this.containers.castShadow = true;
    this.containers.receiveShadow = true;
    this.group.add(this.containers);

    if (hl) {
      const slot = hl as Slot;
      this.highlightLocal.set(slot.x, slot.y, slot.z);
      this.highlightMesh = new Mesh(
        new BoxGeometry(6.5, 2.75, 2.7),
        new MeshLambertMaterial({ color: '#ff8a3d', emissive: '#ff6a00', emissiveIntensity: 0.6, map: getRibTexture() }),
      );
      this.highlightMesh.position.copy(this.highlightLocal);
      this.group.add(this.highlightMesh);

      // İşaret: konteynerin üstünde süzülen ok + halka
      this.marker = new Group();
      const cone = new Mesh(new ConeGeometry(2.6, 6, 4), new MeshBasicMaterial({ color: '#ffb347' }));
      cone.rotation.x = Math.PI; // aşağıyı göstersin
      this.marker.add(cone);
      const ring = new Mesh(
        new RingGeometry(3.2, 4.2, 24),
        new MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.7, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -7;
      this.marker.add(ring);
      this.marker.position.copy(this.highlightLocal).add(new Vector3(0, 14, 0));
      this.group.add(this.marker);
    }
  }

  setTiers(n: number) {
    this.containers.count = this.tierCum[Math.min(n, this.tierCum.length - 1)];
  }

  setShadows(on: boolean) {
    this.hull.castShadow = on;
    this.containers.castShadow = on;
  }

  update(elapsedS: number) {
    if (this.highlightMesh) {
      (this.highlightMesh.material as MeshLambertMaterial).emissiveIntensity = 0.45 + 0.4 * Math.sin(elapsedS * 4);
    }
    if (this.marker) {
      this.marker.position.y = this.highlightLocal.y + 14 + Math.sin(elapsedS * 2.5) * 1.5;
      this.marker.rotation.y = elapsedS * 1.2;
    }
  }
}
