import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';
import { mulberry32 } from '../../util/rng';

type Ring = number[][];

function landPolygons(): Ring[][] {
  const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  const fc = feature(topo, topo.objects.land);
  const polys: Ring[][] = [];
  const feats = 'features' in fc ? fc.features : [fc];
  for (const f of feats) {
    const g = f.geometry;
    if (g.type === 'Polygon') polys.push(g.coordinates as Ring[]);
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) polys.push(p as Ring[]);
  }
  return polys;
}

/** Kara poligonlarını eşdikdörtgen projeksiyonla çizer; tarih değiştirme çizgisini geçen halkaları açar. */
function tracePolygons(ctx: CanvasRenderingContext2D, polys: Ring[][], W: number, H: number) {
  ctx.beginPath();
  for (const poly of polys) {
    for (const offset of [-W, 0, W]) {
      for (const ring of poly) {
        let prev = ring[0][0];
        let acc = prev;
        for (let i = 0; i < ring.length; i++) {
          const [lon, lat] = ring[i];
          let d = lon - prev;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          acc = i === 0 ? lon : acc + d;
          prev = lon;
          const x = ((acc + 180) / 360) * W + offset;
          const y = ((90 - lat) / 180) * H;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    }
  }
}

const latY = (lat: number) => (90 - lat) / 180;

/** Oyun tarzı dünya dokusu: tek seferlik canvas çizimi, indirilecek görsel yok. */
export function makeEarthCanvas(W: number): HTMLCanvasElement {
  const H = W / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const polys = landPolygons();

  // Okyanus: kutuplarda koyu, ekvatorda canlı mavi
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, '#0c2d52');
  ocean.addColorStop(0.3, '#0f5c96');
  ocean.addColorStop(0.5, '#1479b8');
  ocean.addColorStop(0.7, '#0f5c96');
  ocean.addColorStop(1, '#0c2d52');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  // Enlem/boylam çizgileri
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = Math.max(1, W / 2048);
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = latY(lat) * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Kıyı sığlıkları: karayı bulanık açık mavi gölgeyle çiz
  ctx.save();
  ctx.shadowColor = 'rgba(90, 220, 235, 0.85)';
  ctx.shadowBlur = W / 160;
  ctx.fillStyle = '#2aa7c9';
  tracePolygons(ctx, polys, W, H);
  ctx.fill('evenodd');
  ctx.restore();

  // Kara: enleme göre renk bantları (buz, orman, çöl, tropik)
  const land = document.createElement('canvas');
  land.width = W;
  land.height = H;
  const lctx = land.getContext('2d')!;
  const g = lctx.createLinearGradient(0, 0, 0, H);
  const stops: [number, string][] = [
    [90, '#eef3f6'],
    [72, '#dfe8e6'],
    [64, '#5f8a4f'],
    [50, '#79a05a'],
    [40, '#b6a86a'],
    [33, '#e0bf7f'],
    [18, '#e6c584'],
    [10, '#7fa257'],
    [0, '#4f8c46'],
    [-12, '#6f9a4f'],
    [-22, '#d4b77c'],
    [-34, '#a9a066'],
    [-48, '#6f9256'],
    [-62, '#dfe8e6'],
    [-90, '#f2f6f8'],
  ];
  for (const [lat, c] of stops) g.addColorStop(latY(lat), c);
  lctx.fillStyle = g;
  tracePolygons(lctx, polys, W, H);
  lctx.fill('evenodd');

  // Doku: sadece karanın üstüne rastgele lekeler (oyun haritası hissi)
  lctx.globalCompositeOperation = 'source-atop';
  const rnd = mulberry32(7);
  const n = Math.round((W * H) / 2500);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = (0.5 + rnd() * 2.5) * (W / 2048);
    lctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)';
    lctx.beginPath();
    lctx.arc(x, y, r * 3, 0, Math.PI * 2);
    lctx.fill();
  }
  // Kıyı çizgisi
  lctx.globalCompositeOperation = 'source-over';
  lctx.strokeStyle = 'rgba(255,255,240,0.35)';
  lctx.lineWidth = Math.max(1, W / 1500);
  tracePolygons(lctx, polys, W, H);
  lctx.stroke();

  ctx.drawImage(land, 0, 0);
  return canvas;
}
