import type { Shipment, ShipPosition } from '../data/types';
import { fmtDateTime, t } from '../i18n';
import { esc } from './common';

/** Bilgi paneli: masaüstünde sol sütun, mobilde aşağıdan açılan çekmece. */
export class InfoPanel {
  readonly el: HTMLElement;
  private lastKey = '';

  constructor(private s: Shipment) {
    this.el = document.createElement('aside');
    this.el.className = 'sheet';
    this.el.innerHTML = `
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-summary"></div>
      <div class="sheet-body"></div>`;
    this.setupDrag();
  }

  private setupDrag() {
    const handle = this.el.querySelector<HTMLElement>('.sheet-handle')!;
    const summary = this.el.querySelector<HTMLElement>('.sheet-summary')!;
    let startY = 0;
    let dy = 0;
    let dragging = false;
    const toggle = () => this.el.classList.toggle('expanded');
    summary.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 820px)').matches) toggle();
    });
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      startY = e.clientY;
      dy = 0;
      handle.setPointerCapture(e.pointerId);
      this.el.classList.add('dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dy = e.clientY - startY;
      const expanded = this.el.classList.contains('expanded');
      const base = expanded ? '0px' : 'calc(100% - var(--peek, 150px))';
      this.el.style.transform = `translateY(calc(${base} + ${dy}px))`;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      this.el.classList.remove('dragging');
      this.el.style.transform = '';
      if (Math.abs(dy) < 6) toggle();
      else if (dy < -30) this.el.classList.add('expanded');
      else if (dy > 30) this.el.classList.remove('expanded');
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  update(p: ShipPosition, now: number, force = false) {
    const s = this.s;
    const statusKey = p.phase === 'atSea' ? (p.inCanal ? 'inCanal' : 'atSea') : p.phase;
    const pillCls = p.inCanal ? 'canal' : p.phase === 'arrived' ? 'arrived' : '';
    const left = Math.max(0, s.eta - now);
    const d = Math.floor(left / 86400000);
    const h = Math.floor((left % 86400000) / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const etaIn = left <= 0 ? '' : d > 0 ? t('detail.etaIn', { d, h }) : t('detail.etaInHours', { h, m });
    const pct = (p.progress * 100).toFixed(1);

    this.el.querySelector('.sheet-summary')!.innerHTML = `
      <span class="status-pill ${pillCls}">● ${esc(t(`detail.status.${statusKey}`))}</span>
      <div class="trk">${esc(s.trackingNo)}</div>
      <div class="route-line">${esc(s.origin.name)} → ${esc(s.destination.name)}</div>
      <div class="eta-big"><div><div class="lbl">${esc(t('detail.eta'))}</div><div class="val">${esc(fmtDateTime(s.eta))}</div></div><div class="in">${esc(etaIn)}</div></div>
      <div class="progress">
        <div class="bar"><i style="width:${pct}%"></i><b style="inset-inline-start:${pct}%"></b></div>
        <div class="ends"><span>${esc(s.origin.code)}</span><span>${esc(t('detail.progress'))} %${Math.round(p.progress * 100)}</span><span>${esc(s.destination.code)}</span></div>
      </div>`;

    // Gövde (zaman çizelgesi) sadece değişince yeniden çizilir
    const doneCount = s.milestones.filter((ms) => ms.time <= now).length;
    const key = `${doneCount}|${p.area}|${p.speedKn}|${t('detail.location')}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;
    const fact = (k: string, v: string, wide = false) => `<div class="fact ${wide ? 'wide' : ''}"><div class="k">${esc(t(k))}</div><div class="v">${esc(v)}</div></div>`;
    this.el.querySelector('.sheet-body')!.innerHTML = `
      <div class="facts">
        ${fact('detail.location', `${t(`area.${p.area}`)} · ${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°`, true)}
        ${fact('detail.vessel', `${s.vessel.name}`)}
        ${fact('detail.speed', `${p.speedKn.toFixed(1)} ${t('detail.kn')}`)}
        ${fact('detail.container', s.containerNo)}
        ${fact('detail.bl', s.bl)}
        ${fact('detail.cargo', s.cargo, true)}
      </div>
      <h4 class="section-title">${esc(t('detail.timeline'))}</h4>
      <ol class="timeline">
        ${s.milestones
          .map((ms, i) => {
            const cls = i < doneCount ? 'done' : i === doneCount ? 'current' : 'upcoming';
            return `<li class="${cls}"><div class="t">${esc(t(`ms.${ms.key}`))}</div><div class="s">${esc(ms.place)} · ${esc(fmtDateTime(ms.time))}</div></li>`;
          })
          .join('')}
      </ol>`;
  }
}
