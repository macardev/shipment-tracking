import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector3 } from 'three';
import { SHIP_HALF_BEAM, SHIP_HALF_LENGTH } from './Ship';

const MAX = 400;
const LIFE = 3.5;

/** Pruva ve kıçta köpük/serpinti parçacıkları. Sayı kaliteye göre (0–400), CPU maliyeti çok düşük. */
export class Wake {
  readonly points: Points;
  private pos = new Float32Array(MAX * 3);
  private age = new Float32Array(MAX).fill(LIFE);
  private vel = new Float32Array(MAX * 2);
  private next = 0;
  private emitAcc = 0;
  private count = 0;
  private geo = new BufferGeometry();

  constructor(count: number) {
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aAge', new BufferAttribute(this.age, 1));
    this.points = new Points(
      this.geo,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uScale: { value: 400 } },
        vertexShader: `
          attribute float aAge; uniform float uScale; varying float vA;
          void main(){
            vA = 1.0 - aAge / ${LIFE.toFixed(1)};
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.5 + (1.0 - vA) * 7.0) * uScale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5 || vA <= 0.0) discard;
            gl_FragColor = vec4(vec3(0.85, 0.92, 0.95) * (1.0 - d * 2.0) * vA * 0.55, 1.0);
          }`,
      }),
    );
    this.points.frustumCulled = false;
    this.setCount(count);
  }

  setCount(n: number) {
    this.count = Math.min(n, MAX);
    this.points.visible = this.count > 0;
    this.geo.setDrawRange(0, this.count);
  }

  setScale(viewportHeight: number) {
    (this.points.material as ShaderMaterial).uniforms.uScale.value = viewportHeight * 0.6;
  }

  update(dt: number, shipPos: Vector3, fwd: Vector3, speed: number) {
    if (this.count === 0) return;
    const sideX = -fwd.z;
    const sideZ = fwd.x;
    // Hızla orantılı üretim
    this.emitAcc += dt * (this.count / LIFE) * Math.min(1, 0.25 + speed / 15);
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      const bow = Math.random() < 0.4;
      const side = Math.random() < 0.5 ? 1 : -1;
      const along = bow ? SHIP_HALF_LENGTH - 12 - Math.random() * 20 : -SHIP_HALF_LENGTH - Math.random() * 8;
      const across = side * (bow ? SHIP_HALF_BEAM * 0.9 : SHIP_HALF_BEAM * (0.2 + Math.random() * 0.7));
      this.pos[i * 3] = shipPos.x + fwd.x * along + sideX * across;
      this.pos[i * 3 + 1] = 0.6;
      this.pos[i * 3 + 2] = shipPos.z + fwd.z * along + sideZ * across;
      const out = (bow ? 5 : 2.5) + Math.random() * 2;
      this.vel[i * 2] = sideX * side * out - fwd.x * (bow ? 1 : 4);
      this.vel[i * 2 + 1] = sideZ * side * out - fwd.z * (bow ? 1 : 4);
      this.age[i] = 0;
    }
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= LIFE) continue;
      this.age[i] += dt;
      this.pos[i * 3] += this.vel[i * 2] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 2 + 1] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAge.needsUpdate = true;
  }
}
