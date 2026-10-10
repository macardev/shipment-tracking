import type { Tier } from './qualityPresets';

export interface DeviceInfo {
  tier: Tier | 'none';
  gpu: string;
  mobile: boolean;
  reasons: string[];
  benchMs?: number;
}

const CACHE_KEY = 'seyir.device.v1';

// Bilinen zayıf / yazılımsal GPU'lar
const WEAK_GPU = /Mali-4|Mali-T[67]\d\d|Adreno \(TM\) [3-5]\d\d|PowerVR SGX|PowerVR Rogue GE|Intel.*HD Graphics ([2-5]\d{2,3}|\d{4})|SwiftShader|llvmpipe|Microsoft Basic Render/i;
const STRONG_DESKTOP_GPU = /NVIDIA|GeForce|Radeon RX|Radeon Pro|Apple M\d|Iris Xe|Arc/i;

function isMobile(): boolean {
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const touchMac = navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent); // iPadOS
  return uaMobile || touchMac;
}

function getGpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return String(name ?? 'unknown');
}

/**
 * ~1 saniyelik görünmez test: 512x512 alana ağır bir shader'ı 6 kat üst üste çizip
 * kare başına süreyi ölçer. readPixels GPU'nun bitirmesini bekletir.
 */
function benchmark(gl: WebGLRenderingContext | WebGL2RenderingContext): number {
  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const fs = `precision mediump float; uniform float t;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = gl_FragCoord.xy / 512.0; float a = 0.0;
      for (int i = 0; i < 12; i++) { a += h(uv * float(i + 1) + t) * 0.08; uv = uv.yx * 1.01 + a; }
      gl_FragColor = vec4(vec3(a), 0.15);
    }`;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return -1;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const tLoc = gl.getUniformLocation(prog, 't');
  const px = new Uint8Array(4);

  const frame = (i: number) => {
    for (let l = 0; l < 6; l++) {
      gl.uniform1f(tLoc, i * 0.1 + l);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (let i = 0; i < 3; i++) frame(i); // ısınma (shader derleme vs.)
  const N = 10;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) frame(i);
  return (performance.now() - t0) / N;
}

function readCache(): DeviceInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DeviceInfo) : null;
  } catch {
    return null;
  }
}

function writeCache(info: DeviceInfo) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(info));
  } catch {
    /* yoksay */
  }
}

const down = (t: Tier): Tier => (t === 'high' ? 'mid' : 'low');

export function detectDevice(): DeviceInfo {
  const mobile = isMobile();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const gl =
    (canvas.getContext('webgl2', { antialias: false, powerPreference: 'default' }) as WebGL2RenderingContext | null) ??
    (canvas.getContext('webgl', { antialias: false }) as WebGLRenderingContext | null);
  if (!gl) return { tier: 'none', gpu: 'none', mobile, reasons: ['WebGL yok'] };

  const gpu = getGpuName(gl);
  const cached = readCache();
  if (cached && cached.gpu === gpu && cached.mobile === mobile) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return cached;
  }

  const reasons: string[] = [];
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  let tier: Tier;
  if (mobile) {
    tier = 'mid';
    reasons.push('mobil cihaz');
    if ((mem !== undefined && mem <= 3) || cores <= 4) {
      tier = 'low';
      reasons.push(`zayıf donanım (çekirdek ${cores}, bellek ${mem ?? '?'} GB)`);
    }
  } else {
    tier = STRONG_DESKTOP_GPU.test(gpu) ? 'high' : 'mid';
    reasons.push(tier === 'high' ? 'güçlü masaüstü GPU' : 'masaüstü (entegre GPU)');
  }
  if (WEAK_GPU.test(gpu)) {
    tier = 'low';
    reasons.push('zayıf GPU listesinde');
  }
  const isGl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!isGl2 && tier === 'high') {
    tier = 'mid';
    reasons.push('WebGL2 yok');
  }

  // Test sadece kademe düşürebilir; sezgisel tahmini yukarı çekmez.
  const benchMs = benchmark(gl);
  if (benchMs > 20) {
    tier = 'low';
    reasons.push(`test yavaş (${benchMs.toFixed(1)} ms)`);
  } else if (benchMs > 8) {
    tier = down(tier);
    reasons.push(`test orta (${benchMs.toFixed(1)} ms)`);
  } else if (benchMs >= 0) {
    reasons.push(`test iyi (${benchMs.toFixed(1)} ms)`);
  }

  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const info: DeviceInfo = { tier, gpu, mobile, reasons, benchMs };
  writeCache(info);
  return info;
}

export type QualityChoice = 'auto' | Tier;

export function readQualityChoice(): QualityChoice {
  try {
    const v = localStorage.getItem('seyir.quality');
    return v === 'low' || v === 'mid' || v === 'high' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeQualityChoice(c: QualityChoice) {
  try {
    localStorage.setItem('seyir.quality', c);
  } catch {
    /* yoksay */
  }
}
