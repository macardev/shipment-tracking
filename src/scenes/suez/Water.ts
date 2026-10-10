import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import type { Quality } from '../../perf/qualityPresets';

/** Gerstner dalgaları: (yön x, yön z, diklik, dalga boyu). Aynı değerler JS'de geminin sallanması için kullanılır. */
const WAVES = [
  new Vector4(1.0, 0.35, 0.07, 90),
  new Vector4(-0.45, 1.0, 0.06, 47),
  new Vector4(0.65, -0.75, 0.05, 23),
  new Vector4(-0.9, -0.25, 0.04, 13),
].map((w) => {
  const d = new Vector2(w.x, w.y).normalize();
  return new Vector4(d.x, d.y, w.z, w.w);
});

export const MAX_SHIPS = 3;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec4 uWaves[4];
  uniform int uWaveCount;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  vec3 gerstner(vec4 w, vec3 p, inout vec3 tangent, inout vec3 binormal) {
    float k = 6.28318 / w.w;
    float c = sqrt(9.8 / k);
    vec2 d = w.xy;
    float f = k * (dot(d, p.xz) - c * uTime);
    float a = w.z / k;
    float s = sin(f), co = cos(f);
    tangent += vec3(-d.x * d.x * w.z * s, d.x * w.z * co, -d.x * d.y * w.z * s);
    binormal += vec3(-d.x * d.y * w.z * s, d.y * w.z * co, -d.y * d.y * w.z * s);
    return vec3(d.x * a * co, a * s, d.y * a * co);
  }

  void main() {
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 disp = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      if (i >= uWaveCount) break;
      disp += gerstner(uWaves[i], p, tangent, binormal);
    }
    // Uzakta ızgara seyrek: dalgaları sönümle (titreşim/aliasing olmasın)
    float att = 1.0 - smoothstep(450.0, 1500.0, length(p.xz - cameraPosition.xz));
    p += disp * att;
    vCrest = disp.y * att;
    vNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(cross(binormal, tangent)), att));
    vWorld = p;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uCrestFoam;
  uniform vec4 uShips[${MAX_SHIPS}];   // x, z, ileri.x, ileri.z
  uniform vec2 uShipSize;              // yarı boy, yarı en
  uniform int uShipCount;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  float wakeFoam(vec4 ship) {
    vec2 rel = vWorld.xz - ship.xy;
    vec2 fwd = ship.zw;
    float u = dot(rel, fwd);
    float v = dot(rel, vec2(-fwd.y, fwd.x));
    float L = uShipSize.x, B = uShipSize.y;
    // Gövde etrafında köpük (pruvada daha güçlü)
    float e = length(vec2(u / (L * 1.04), v / (B * 1.25)));
    float hull = smoothstep(1.25, 0.95, e) * smoothstep(0.85, 1.0, e) * (0.6 + 0.4 * smoothstep(0.0, L, u));
    // Kıç dalgası: arkada genişleyen V (Kelvin açısı) + ortada türbülans
    float back = -(u + L);
    float wake = 0.0;
    if (back > 0.0) {
      float fade = exp(-back / 700.0);
      float spread = B * 0.9 + back * 0.36;
      float edge = 1.0 - smoothstep(0.0, 6.0 + back * 0.02, abs(abs(v) - spread));
      float center = (1.0 - smoothstep(B * 0.6, B * 1.1 + back * 0.06, abs(v))) * exp(-back / 450.0);
      wake = (edge * 0.45 + center) * fade;
    }
    float n = noise(vWorld.xz * 0.18 + uTime * 0.6) * 0.6 + noise(vWorld.xz * 0.5 - uTime) * 0.4;
    return clamp((hull + wake) * smoothstep(0.25, 0.75, n + 0.25), 0.0, 1.0);
  }

  void main() {
    // Küçük dalgacıklar: normali iki ucuz sinüsle boz
    vec2 q = vWorld.xz;
    vec3 n = normalize(vNormal + vec3(
      sin(q.x * 0.35 + uTime * 1.7) * 0.05 + sin(q.y * 0.23 - uTime * 1.3) * 0.04,
      0.0,
      cos(q.y * 0.31 + uTime * 1.5) * 0.05 + cos(q.x * 0.19 - uTime * 1.1) * 0.04));
    vec3 viewV = cameraPosition - vWorld;
    float dist = length(viewV);
    vec3 V = viewV / dist;

    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    vec3 R = reflect(-V, n);
    vec3 sky = mix(uSkyHorizon, uSkyTop, clamp(R.y * 2.0, 0.0, 1.0));
    vec3 water = mix(uDeep, uShallow, clamp(vCrest * 0.5 + 0.45, 0.0, 1.0));
    vec3 col = mix(water, sky, fres * 0.75);
    float spec = pow(max(dot(R, uSunDir), 0.0), 180.0);
    col += vec3(1.0, 0.93, 0.8) * spec * 1.6;

    float foam = 0.0;
    for (int i = 0; i < ${MAX_SHIPS}; i++) {
      if (i >= uShipCount) break;
      foam = max(foam, wakeFoam(uShips[i]));
    }
    if (uCrestFoam > 0.5) foam = max(foam, smoothstep(0.7, 1.2, vCrest) * noise(q * 0.3 + uTime) * 0.7);
    col = mix(col, vec3(0.95, 0.98, 1.0), foam * 0.85);

    float fog = smoothstep(uFogNear, uFogFar, dist);
    gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
    #include <colorspace_fragment>
  }
`;

export class Water {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  private size: number;
  private segments = 0;
  private waveCount = 4;

  constructor(q: Quality, opts: { skyTop: Color; skyHorizon: Color; sunDir: Vector3; fogColor: Color }) {
    this.size = q.fogFar * 2.2;
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWaves: { value: WAVES },
        uWaveCount: { value: q.waveCount },
        uDeep: { value: new Color('#0a5a6e') },
        uShallow: { value: new Color('#1d98a6') },
        uSkyTop: { value: opts.skyTop },
        uSkyHorizon: { value: opts.skyHorizon },
        uSunDir: { value: opts.sunDir },
        uFogColor: { value: opts.fogColor },
        uFogNear: { value: q.fogNear },
        uFogFar: { value: q.fogFar },
        uCrestFoam: { value: q.crestFoam ? 1 : 0 },
        uShips: { value: Array.from({ length: MAX_SHIPS }, () => new Vector4()) },
        uShipSize: { value: new Vector2(110, 17) },
        uShipCount: { value: 0 },
      },
    });
    this.mesh = new Mesh(new PlaneGeometry(1, 1, 1, 1), this.material);
    this.mesh.frustumCulled = false;
    this.applyQuality(q);
  }

  applyQuality(q: Quality) {
    this.waveCount = q.waveCount;
    const u = this.material.uniforms;
    u.uWaveCount.value = q.waveCount;
    u.uFogNear.value = q.fogNear;
    u.uFogFar.value = q.fogFar;
    u.uCrestFoam.value = q.crestFoam ? 1 : 0;
    const size = q.fogFar * 2.2;
    if (q.waterSegments !== this.segments || size !== this.size) {
      this.segments = q.waterSegments;
      this.size = size;
      this.mesh.geometry.dispose();
      // Merkeze yakın sık, uzağa seyrek ızgara: aynı vertex bütçesiyle yakında daha detaylı dalga
      const g = new PlaneGeometry(1, 1, q.waterSegments, q.waterSegments);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) * 2;
        const y = pos.getY(i) * 2;
        pos.setXY(i, (Math.sign(x) * Math.pow(Math.abs(x), 2.2) * size) / 2, (Math.sign(y) * Math.pow(Math.abs(y), 2.2) * size) / 2);
      }
      g.rotateX(-Math.PI / 2);
      g.computeBoundingSphere();
      this.mesh.geometry = g;
    }
  }

  /** Su ağını kameranın takip ettiği noktaya taşır; dalga dünyadan hesaplandığı için kayma olmaz. */
  follow(center: Vector3) {
    const snap = 40;
    this.mesh.position.set(Math.round(center.x / snap) * snap, 0, Math.round(center.z / snap) * snap);
  }

  setTime(t: number) {
    this.material.uniforms.uTime.value = t;
  }

  setShips(ships: { x: number; z: number; fx: number; fz: number }[], count: number) {
    const arr = this.material.uniforms.uShips.value as Vector4[];
    const n = Math.min(count, MAX_SHIPS);
    for (let i = 0; i < n; i++) arr[i].set(ships[i].x, ships[i].z, ships[i].fx, ships[i].fz);
    this.material.uniforms.uShipCount.value = n;
  }

  /** Bir noktadaki yaklaşık dalga yüksekliği (gemi sallanması için, shader ile aynı formül). */
  heightAt(x: number, z: number, t: number): number {
    let y = 0;
    for (let i = 0; i < this.waveCount; i++) {
      const w = WAVES[i];
      const k = (Math.PI * 2) / w.w;
      const c = Math.sqrt(9.8 / k);
      y += (w.z / k) * Math.sin(k * (w.x * x + w.y * z - c * t));
    }
    return y;
  }
}
