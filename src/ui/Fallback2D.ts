import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';
import type { Shipment, ShipPosition } from '../data/types';
import { t } from '../i18n';
import { esc } from './common';

// Gösterilecek bölge (Türkiye → Körfez)
const LON0 = 18;
const LON1 = 64;
const LAT0 = 6;
const LAT1 = 46;
const W = 920;
const H = (W * (LAT1 - LAT0)) / (LON1 - LON0) / Math.cos((26 * Math.PI) / 180);

const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * W;
const py = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * H;

/** WebGL olmayan cihazlar için 2D SVG harita: uygulama çökmez, rota yine görünür. */
export class Fallback2D {
  readonly el: HTMLElement;
  private ship: SVGCircleElement;
  private done: SVGPolylineElement;

  constructor(private s: Shipment) {
    const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
    const fc = feature(topo, topo.objects.land);
    const feats = 'features' in fc ? fc.features : [fc];
    let d = '';
    for (const f of feats) {
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const poly of polys)
        for (const ring of poly as number[][][]) {
          if (!ring.some(([lon, lat]) => lon > LON0 - 20 && lon < LON1 + 20 && lat > LAT0 - 20 && lat < LAT1 + 20)) continue;
          d += 'M' + ring.map(([lon, lat]) => `${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join('L') + 'Z';
        }
    }
    const routePts = s.route.map((w) => `${px(w.lon).toFixed(1)},${py(w.lat).toFixed(1)}`).join(' ');
    this.el = document.createElement('div');
    this.el.className = 'fallback';
    this.el.innerHTML = `
      <div><b>${esc(t('fallback.title'))}</b><div style="color:var(--ink-dim);font-size:13px">${esc(t('fallback.desc'))}</div></div>
      <svg viewBox="0 0 ${W} ${H.toFixed(0)}" preserveAspectRatio="xMidYMid meet">
        <rect width="100%" height="100%" fill="#0f5c96" rx="12"/>
        <path d="${d}" fill="#e0bf7f" stroke="#fff6dc" stroke-width="0.8" stroke-opacity="0.5"/>
        <polyline points="${routePts}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2.5" stroke-dasharray="6 6"/>
        <polyline class="done" fill="none" stroke="#ff8a3d" stroke-width="4" stroke-linecap="round"/>
        ${s.route
          .filter((w) => w.label)
          .map((w) => `<g><circle cx="${px(w.lon)}" cy="${py(w.lat)}" r="4" fill="#7fd3ff"/><text x="${px(w.lon) + 7}" y="${py(w.lat) - 6}" fill="#fff" font-size="13">${esc(w.label!)}</text></g>`)
          .join('')}
        <circle class="ship" r="8" fill="#ffd166" stroke="#2b1d00" stroke-width="2"/>
      </svg>`;
    this.ship = this.el.querySelector('circle.ship')!;
    this.done = this.el.querySelector('polyline.done')!;
  }

  update(p: ShipPosition) {
    this.ship.setAttribute('cx', px(p.lon).toFixed(1));
    this.ship.setAttribute('cy', py(p.lat).toFixed(1));
    const pts = this.s.route.slice(0, p.segIndex + 1).map((w) => `${px(w.lon).toFixed(1)},${py(w.lat).toFixed(1)}`);
    pts.push(`${px(p.lon).toFixed(1)},${py(p.lat).toFixed(1)}`);
    this.done.setAttribute('points', pts.join(' '));
  }
}
