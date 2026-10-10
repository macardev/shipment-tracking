import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Quality } from '../../perf/qualityPresets';
import { mulberry32, valueNoise2D } from '../../util/rng';
import type { CanalPath } from './suezPath';

/** Kıyı kesiti: su kenarından uzaklık → yükseklik. */
const PROFILE: [number, number][] = [
  [-60, -9],
  [-8, -1.4],
  [6, 1.4],
  [22, 3.2],
  [70, 4.2],
  [180, 5],
  [450, 6.5],
  [900, 10],
  [1600, 15],
  [2800, 24],
  [4200, 36],
];
const PROFILE_COLORS = ['#7d6a4a', '#9a8158', '#c9a874', '#dcbd88', '#e3c591', '#e8cc97', '#e9cb93', '#e6c48b', '#e2bf86', '#dfc296', '#dccaa6'];

function duneNoise(x: number, z: number) {
  return valueNoise2D(x * 0.004, z * 0.004) * 2 - 1 + 0.5 * (valueNoise2D(x * 0.013 + 7, z * 0.013) * 2 - 1);
}

/** Su kenarından `off` uzaklıkta, dünya (x,z)'de zemin yüksekliği. */
export function groundHeight(off: number, x: number, z: number): number {
  let base = PROFILE[PROFILE.length - 1][1];
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [o0, h0] = PROFILE[i];
    const [o1, h1] = PROFILE[i + 1];
    if (off <= o1) {
      base = h0 + ((h1 - h0) * (Math.max(off, o0) - o0)) / (o1 - o0);
      break;
    }
  }
  const amp = Math.min(1, Math.max(0, (off - 150) / 900)) * 14;
  return base + duneNoise(x, z) * amp;
}

export class Environment {
  readonly group = new Group();
  private palmsTrunk!: InstancedMesh;
  private palmsCrown!: InstancedMesh;
  private buildings!: InstancedMesh;
  private land!: Mesh;
  private v = new Vector3();
  private t = new Vector3();

  constructor(
    private path: CanalPath,
    q: Quality,
  ) {
    this.buildBanks(q.bankSamples);
    this.buildPalms(PRESETS_MAX.palms);
    this.buildTowns(PRESETS_MAX.buildings);
    this.buildBridge();
    this.applyQuality(q);
  }

  applyQuality(q: Quality) {
    // Instanced nesneler en yüksek kademe sayısıyla kurulur; kademe sadece çizilecek adedi değiştirir.
    this.palmsTrunk.count = Math.min(q.palmCount, PRESETS_MAX.palms);
    this.palmsCrown.count = this.palmsTrunk.count;
    this.buildings.count = Math.min(q.buildingCount, PRESETS_MAX.buildings);
    this.land.receiveShadow = q.shadows;
  }

  /** Kanal boyunca iki kıyı şeridi: tek geometri, vertex renkli (1 draw call). */
  private buildBanks(samples: number) {
    const path = this.path;
    const P = PROFILE.length;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const tangents: Vector3[] = [];
    const points: Vector3[] = [];
    for (let i = 0; i < samples; i++) {
      const arc = (i / (samples - 1)) * path.length;
      const p = new Vector3();
      const t = new Vector3();
      path.sample(arc, p, t);
      points.push(p);
      tangents.push(t);
    }
    const ds = path.length / (samples - 1);
    const c = new Color();
    const tint = new Color('#d9a96a');

    for (const side of [1, -1]) {
      const start = pos.length / 3;
      for (let i = 0; i < samples; i++) {
        const p = points[i];
        const t = tangents[i];
        const nx = -t.z * side;
        const nz = t.x * side;
        const hw = path.halfWidthAt((i / (samples - 1)) * path.length);
        // İç virajda kesitler kesişmesin: eğrilik yarıçapına göre sınırla
        const t0 = tangents[Math.max(0, i - 1)];
        const t1 = tangents[Math.min(samples - 1, i + 1)];
        const dtx = t1.x - t0.x;
        const dtz = t1.z - t0.z;
        const turn = Math.hypot(dtx, dtz) / (2 * ds);
        const inner = dtx * nx + dtz * nz > 0;
        const maxOff = inner && turn > 1e-6 ? Math.max(30, 0.85 / turn - hw) : Infinity;
        for (let j = 0; j < P; j++) {
          const off = Math.min(PROFILE[j][0], maxOff - (P - j));
          const x = p.x + nx * (hw + off);
          const z = p.z + nz * (hw + off);
          const y = groundHeight(off, x, z);
          pos.push(x, y, z);
          c.set(PROFILE_COLORS[j]);
          if (j >= 5) c.lerp(tint, Math.max(0, duneNoise(x * 1.7, z * 1.7)) * 0.35);
          col.push(c.r, c.g, c.b);
        }
      }
      const sideIdx: number[] = [];
      for (let i = 0; i < samples - 1; i++) {
        for (let j = 0; j < P - 1; j++) {
          const a = start + i * P + j;
          const b = start + (i + 1) * P + j;
          sideIdx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
      // Yüzler yukarı baksın: ilk üçgenin normaline göre sırayı düzelt
      const ia = sideIdx[0] * 3;
      const ib = sideIdx[1] * 3;
      const ic = sideIdx[2] * 3;
      const ux = pos[ib] - pos[ia];
      const uz = pos[ib + 2] - pos[ia + 2];
      const vx = pos[ic] - pos[ia];
      const vz = pos[ic + 2] - pos[ia + 2];
      const ny = uz * vx - ux * vz;
      if (ny < 0) for (let k = 0; k < sideIdx.length; k += 3) [sideIdx[k + 1], sideIdx[k + 2]] = [sideIdx[k + 2], sideIdx[k + 1]];
      idx.push(...sideIdx);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.land = new Mesh(g, new MeshLambertMaterial({ vertexColors: true }));
    this.group.add(this.land);
  }

  /** Kıyıda rastgele bir nokta (kanal yayı, taraf, kenardan uzaklık). */
  private bankPoint(arc: number, side: number, off: number, out: Vector3): number {
    this.path.sample(arc, out, this.t);
    const hw = this.path.halfWidthAt(arc);
    const nx = -this.t.z * side;
    const nz = this.t.x * side;
    out.x += nx * (hw + off);
    out.z += nz * (hw + off);
    out.y = groundHeight(off, out.x, out.z);
    return Math.atan2(-this.t.z, this.t.x);
  }

  private buildPalms(count: number) {
    const trunk = new CylinderGeometry(0.9, 1.4, 30, 5, 1, true);
    trunk.translate(0, 15, 0);
    const leaves: BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) {
      const leaf = new BoxGeometry(16, 0.5, 3.6);
      leaf.translate(8, 0, 0);
      leaf.rotateZ(-0.38 - (k % 2) * 0.15);
      leaf.rotateY((k / 7) * Math.PI * 2);
      leaves.push(leaf);
    }
    const crown = mergeGeometries(leaves);
    crown.translate(0, 30, 0);
    this.palmsTrunk = new InstancedMesh(trunk, new MeshLambertMaterial({ color: '#8a6a45' }), count);
    this.palmsCrown = new InstancedMesh(crown, new MeshLambertMaterial({ color: '#4f8a3a' }), count);

    const rnd = mulberry32(11);
    const d = new Object3D();
    const green = new Color();
    for (let i = 0; i < count; i++) {
      const arc = rnd() * this.path.length;
      const side = rnd() < 0.5 ? 1 : -1;
      const off = 18 + Math.pow(rnd(), 2) * 520;
      this.bankPoint(arc, side, off, d.position);
      d.rotation.set((rnd() - 0.5) * 0.15, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.15);
      d.scale.setScalar(0.7 + rnd() * 0.6);
      d.updateMatrix();
      this.palmsTrunk.setMatrixAt(i, d.matrix);
      this.palmsCrown.setMatrixAt(i, d.matrix);
      green.setHSL(0.27 + rnd() * 0.06, 0.45, 0.28 + rnd() * 0.1);
      this.palmsCrown.setColorAt(i, green);
    }
    this.group.add(this.palmsTrunk, this.palmsCrown);
  }

  private buildTowns(count: number) {
    const p = this.path;
    const towns = [
      { arc: p.portSaidArc - 150, spread: 650, west: 0.65, w: 0.36 },
      { arc: p.arcById.timsah, spread: 520, west: 0.9, w: 0.24 },
      { arc: p.suezArc + 150, spread: 650, west: 0.85, w: 0.3 },
      { arc: p.arcById.qantara, spread: 260, west: 0.5, w: 0.1 },
    ];
    const geo = new BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    this.buildings = new InstancedMesh(geo, new MeshLambertMaterial({ color: '#ffffff' }), count);
    const palette = ['#f2ede1', '#e8dcc4', '#d9c7a3', '#f5f0e6', '#c9b28a', '#e6d3b3', '#bfa58a', '#d6e2ea', '#efe1cf'].map((c) => new Color(c));
    const rnd = mulberry32(23);
    const d = new Object3D();
    const minarets: Vector3[] = [];
    for (let i = 0; i < count; i++) {
      let r = rnd();
      let town = towns[0];
      for (const tw of towns) {
        if (r < tw.w) {
          town = tw;
          break;
        }
        r -= tw.w;
      }
      const g = (rnd() + rnd() + rnd() - 1.5) / 1.5; // ~gauss
      const arc = Math.min(p.length - 50, Math.max(50, town.arc + g * town.spread));
      const side = rnd() < town.west ? 1 : -1;
      const off = 45 + Math.pow(rnd(), 1.4) * 800;
      const yaw = this.bankPoint(arc, side, off, d.position);
      d.position.y -= 1;
      d.rotation.set(0, yaw + (rnd() < 0.7 ? 0 : Math.PI / 2), 0);
      const tall = rnd() < 0.1;
      d.scale.set(18 + rnd() * 30, tall ? 40 + rnd() * 35 : 8 + rnd() * 22, 18 + rnd() * 30);
      d.updateMatrix();
      this.buildings.setMatrixAt(i, d.matrix);
      this.buildings.setColorAt(i, palette[Math.floor(rnd() * palette.length)]);
      if (i % 40 === 0) minarets.push(d.position.clone().add(this.v.set(30, 0, 0)));
    }
    this.buildings.receiveShadow = true;
    this.group.add(this.buildings);

    // Minareler: birkaç ince kule (tek instanced mesh)
    const mGeo = mergeGeometries([
      new CylinderGeometry(2.2, 2.6, 56, 8).translate(0, 28, 0),
      new CylinderGeometry(3.4, 3.4, 2, 8).translate(0, 46, 0),
      new CylinderGeometry(0.1, 2.4, 9, 8).translate(0, 60.5, 0),
    ]);
    const mins = new InstancedMesh(mGeo, new MeshLambertMaterial({ color: '#f3efe6' }), minarets.length);
    minarets.forEach((m, i) => {
      d.position.copy(m);
      d.rotation.set(0, 0, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      mins.setMatrixAt(i, d.matrix);
    });
    this.group.add(mins);
  }

  /** El Kantara'daki Barış Köprüsü (asma köprü): tek geometri + kablolar. */
  private buildBridge() {
    const arc = this.path.arcById.qantara;
    const pos = new Vector3();
    const tan = new Vector3();
    this.path.sample(arc, pos, tan);
    const hw = this.path.halfWidthAt(arc);
    const deckY = 70;
    const half = hw + 230;
    const ramp = 760;
    const pylonX = hw + 30;

    const parts: BufferGeometry[] = [];
    const add = (g: BufferGeometry, color: string) => {
      const ng = g.toNonIndexed();
      const c = new Color(color);
      const arr = new Float32Array(ng.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
      ng.setAttribute('color', new Float32BufferAttribute(arr, 3));
      ng.deleteAttribute('uv');
      parts.push(ng);
    };
    add(new BoxGeometry(half * 2, 3.5, 18).translate(0, deckY, 0), '#d9d5cc');
    add(new BoxGeometry(half * 2, 1.2, 19).translate(0, deckY + 2.2, 0), '#9a9a96');
    const rampLen = Math.hypot(ramp, deckY);
    const rampAng = Math.atan2(deckY, ramp);
    for (const s of [1, -1]) {
      const r = new BoxGeometry(rampLen, 3.5, 18);
      r.rotateZ(s * -rampAng);
      r.translate(s * (half + ramp / 2), deckY / 2, 0);
      add(r, '#d9d5cc');
      for (const z of [-8, 8]) add(new BoxGeometry(4.5, 150, 4.5).translate(s * pylonX, 75, z), '#efebe3');
      add(new BoxGeometry(4.5, 4, 20).translate(s * pylonX, 146, 0), '#efebe3');
      add(new BoxGeometry(4.5, 4, 20).translate(s * pylonX, deckY - 6, 0), '#efebe3');
      // Destek ayakları
      for (let k = 1; k <= 4; k++) {
        const x = s * (half + (ramp * k) / 5);
        const h = deckY * (1 - k / 5);
        add(new BoxGeometry(6, h + 8, 12).translate(x, (h + 8) / 2 - 6, 0), '#cfcac0');
      }
    }
    const bridge = new Mesh(mergeGeometries(parts), new MeshLambertMaterial({ vertexColors: true }));

    // Kablolar
    const lines: number[] = [];
    for (const s of [1, -1]) {
      for (const z of [-8, 8]) {
        for (let k = 1; k <= 7; k++) {
          for (const dir of [1, -1]) {
            lines.push(s * pylonX, 146, z, s * pylonX + dir * k * 24, deckY + 2, z);
          }
        }
      }
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new Float32BufferAttribute(lines, 3));
    const cables = new LineSegments(lg, new LineBasicMaterial({ color: '#ffffff' }));

    const g = new Group();
    g.add(bridge, cables);
    g.position.copy(pos);
    // Köprü ekseni kanala dik
    g.rotation.y = Math.atan2(-tan.z, tan.x) + Math.PI / 2;
    this.group.add(g);
  }
}

/** Instanced nesneler bir kez en yüksek sayıyla kurulur. */
const PRESETS_MAX = { palms: 1000, buildings: 500 };
