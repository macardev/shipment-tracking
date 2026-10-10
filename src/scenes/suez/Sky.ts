import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

/** Gradyan gökyüzü + güneş diski: tek küre, tek ucuz shader. Kamerayı takip eder. */
export class Sky {
  readonly mesh: Mesh;

  constructor(top: Color, horizon: Color, sunDir: Vector3, radius: number) {
    this.mesh = new Mesh(
      new SphereGeometry(radius, 32, 16),
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: top }, uHorizon: { value: horizon }, uSun: { value: sunDir } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            vec3 col = mix(uHorizon, uTop, pow(clamp(d.y, 0.0, 1.0), 0.45));
            float s = max(dot(d, uSun), 0.0);
            col += vec3(1.0, 0.85, 0.6) * (pow(s, 12.0) * 0.25 + pow(s, 400.0) * 0.8);
            col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.9993, 0.9997, s));
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
  }
}
