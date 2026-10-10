import { positionAt } from '../data/routeMath';
import type { ShipmentProvider } from '../data/ShipmentProvider';
import type { Shipment } from '../data/types';
import { StatsOverlay } from '../debug/StatsOverlay';
import { onLangChange, t } from '../i18n';
import { detectDevice, readQualityChoice, writeQualityChoice, type QualityChoice } from '../perf/DeviceTier';
import { QualityManager } from '../perf/QualityManager';
import type { SceneManager } from '../scenes/SceneManager';
import { SimClock } from '../scenes/SimClock';
import type { CameraMode, SceneEvent, SceneKind } from '../scenes/types';
import { applyI18n, brandHtml, esc, langSelect, type Page } from './common';
import { InfoPanel } from './InfoPanel';

const SPEEDS = [1, 60, 600, 3600];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function mountDetailPage(root: HTMLElement, trackingNo: string, provider: ShipmentProvider): Page {
  let disposed = false;
  let sm: SceneManager | null = null;
  let timer = 0;
  let toastTimer = 0;
  const offs: (() => void)[] = [];
  const debug = /debug=1/.test(location.search + location.hash);

  root.innerHTML = `
    <div class="detail">
      <header class="topbar">
        <button class="icon-btn back" type="button">← <span data-i18n="detail.back"></span></button>
        ${brandHtml()}
        <div class="spacer"></div>
        <select class="pill-select quality" aria-label="quality">
          <option value="auto" data-i18n="quality.auto"></option>
          <option value="low" data-i18n="quality.low"></option>
          <option value="mid" data-i18n="quality.mid"></option>
          <option value="high" data-i18n="quality.high"></option>
        </select>
        <div class="lang-slot"></div>
      </header>
      <div class="detail-main">
        <section class="viewport">
          <div class="canvas-host"></div>
          <div class="ov ov-tl seg view-tabs">
            <button type="button" data-view="globe" data-i18n="view.globe"></button>
            <button type="button" data-view="suez" data-i18n="view.suez"></button>
          </div>
          <div class="ov ov-tr">
            <div class="seg speed">
              <span class="speed-title" data-i18n="speed.title"></span>
              ${SPEEDS.map((s) => `<button type="button" data-speed="${s}">x${s}</button>`).join('')}
            </div>
            <div class="live-pill"><span class="dot"></span><span class="live-text"></span><button type="button" class="go-live" data-i18n="detail.backToLive"></button></div>
          </div>
          <div class="ov ov-bc globe-cta" hidden>
            <button type="button" class="btn-primary cta" data-i18n="view.zoomSuez"></button>
          </div>
          <div class="ov ov-bc seg cam-modes" hidden>
            <button type="button" data-cam="follow" data-i18n="cam.follow"></button>
            <button type="button" data-cam="free" data-i18n="cam.free"></button>
            <button type="button" data-cam="cinematic" data-i18n="cam.cinematic"></button>
          </div>
          <div class="ov ov-bl hud" hidden></div>
          <div class="toast" role="status"></div>
          <div class="fade"></div>
          <div class="overlay-loader"><div class="loader-box"><div class="spinner"></div><div class="loader-text"></div></div></div>
        </section>
      </div>
    </div>`;
  root.querySelector('.lang-slot')!.appendChild(langSelect());
  applyI18n(root);

  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const main = $('.detail-main');
  const viewport = $('.viewport');
  const host = $('.canvas-host');
  const loader = $('.overlay-loader');
  const loaderText = $('.loader-text');
  const fade = $('.fade');
  const toast = $('.toast');
  const hud = $('.hud');
  const qualitySel = $<HTMLSelectElement>('select.quality');
  qualitySel.value = readQualityChoice();

  $('.back').addEventListener('click', () => (location.hash = '#/'));

  const setLoader = (key: string | null) => {
    loader.classList.toggle('hidden', !key);
    if (key) loaderText.textContent = t(key);
  };

  function showToast(text: string, actions: { label: string; fn: () => void }[] = [], ms = 6000) {
    toast.innerHTML = `<span>${esc(text)}</span>`;
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.addEventListener('click', () => {
        toast.classList.remove('on');
        a.fn();
      });
      toast.appendChild(b);
    }
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('on'), ms);
  }

  void (async () => {
    setLoader('track.loading');
    const shipment = await provider.getShipment(trackingNo);
    if (disposed) return;
    if (!shipment) {
      location.hash = '#/';
      return;
    }
    await start(shipment);
  })();

  async function start(shipment: Shipment) {
    const clock = new SimClock();
    const panel = new InfoPanel(shipment);
    main.insertBefore(panel.el, viewport);

    const refresh = (force = false) => {
      const p = positionAt(shipment, clock.time);
      panel.update(p, clock.time, force);
      const live = clock.isLive;
      $('.live-pill').classList.toggle('sim', !live);
      $('.live-text').textContent = live ? t('detail.live') : t('detail.sim', { n: clock.speed });
      $('.go-live').hidden = live;
      root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === clock.speed));
      if (sm?.kind === 'suez') {
        const ct = Math.min(1, Math.max(0, p.canalT));
        hud.innerHTML = `
          <div class="row"><span>${esc(shipment.vessel.name)}</span><b>${p.speedKn.toFixed(1)} ${esc(t('detail.kn'))}</b></div>
          <div class="bar"><i style="width:${(ct * 100).toFixed(1)}%"></i></div>
          <div class="row"><span>${esc(t('hud.canal'))}</span><b>%${Math.round(ct * 100)}</b></div>`;
      }
      // Mobil çekmecenin görünen yüksekliği
      const peek = panel.el.querySelector<HTMLElement>('.sheet-handle')!.offsetHeight + panel.el.querySelector<HTMLElement>('.sheet-summary')!.offsetHeight;
      if (peek > 0) main.style.setProperty('--peek', `${peek}px`);
    };
    refresh(true);
    timer = window.setInterval(() => refresh(), 500);
    offs.push(clock.onChange(() => refresh()));

    // --- Cihaz tespiti ---
    setLoader('loading.device');
    await nextFrame();
    const device = detectDevice();
    if (disposed) return;

    if (device.tier === 'none') {
      root.querySelectorAll<HTMLElement>('.ov').forEach((el) => (el.hidden = true));
      const { Fallback2D } = await import('./Fallback2D');
      if (disposed) return;
      const fb = new Fallback2D(shipment);
      viewport.appendChild(fb.el);
      setLoader(null);
      const iv = window.setInterval(() => fb.update(positionAt(shipment, clock.time)), 1000);
      fb.update(positionAt(shipment, clock.time));
      offs.push(() => clearInterval(iv));
      return;
    }

    const qm = new QualityManager(device.tier, readQualityChoice());
    setLoader('loading.3d');
    const { SceneManager } = await import('../scenes/SceneManager');
    if (disposed) return;
    sm = new SceneManager(host, shipment, clock, qm, onSceneEvent);
    if (debug) viewport.appendChild(new StatsOverlay(sm, qm, device).el);

    qualitySel.addEventListener('change', () => {
      const c = qualitySel.value as QualityChoice;
      writeQualityChoice(c);
      qm.setChoice(c);
    });

    let busy = false;
    async function goTo(kind: SceneKind) {
      if (!sm || busy || sm.kind === kind) return;
      busy = true;
      if (kind === 'suez') {
        await sm.flyToSuez();
        // Gemi kanalda değilse kanal girişine atla ("geçişi izle")
        const p = positionAt(shipment, clock.time);
        if (!p.inCanal) clock.jumpTo(shipment.canal.enterTime + 60_000);
        if (clock.speed === 1) {
          clock.setSpeed(60);
          showToast(t('toast.speedUp'), [], 5000);
        }
      }
      fade.classList.add('on');
      await wait(450);
      await sm.show(kind);
      setViewUi(kind);
      fade.classList.remove('on');
      busy = false;
    }

    function setViewUi(kind: SceneKind) {
      root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === kind));
      $('.globe-cta').hidden = kind !== 'globe';
      $('.cam-modes').hidden = kind !== 'suez';
      hud.hidden = kind !== 'suez';
      setCamUi('follow');
      const p = positionAt(shipment, clock.time);
      $('.globe-cta button').textContent = t(p.inCanal ? 'view.zoomSuez' : 'view.watchCanal');
      $('.globe-cta button').dataset.i18n = p.inCanal ? 'view.zoomSuez' : 'view.watchCanal';
      refresh(true);
    }

    function setCamUi(mode: CameraMode) {
      root.querySelectorAll<HTMLButtonElement>('[data-cam]').forEach((b) => b.classList.toggle('on', b.dataset.cam === mode));
    }

    function onSceneEvent(e: SceneEvent) {
      if (e.type === 'cameraMode') setCamUi(e.mode);
      if (e.type === 'canalExit') {
        showToast(
          t('toast.canalExit'),
          [
            { label: t('toast.replay'), fn: () => clock.jumpTo(shipment.canal.enterTime + 60_000) },
            { label: t('toast.globe'), fn: () => void goTo('globe') },
          ],
          10000,
        );
      }
    }

    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => void goTo(b.dataset.view as SceneKind)));
    $('.globe-cta button').addEventListener('click', () => void goTo('suez'));
    root.querySelectorAll<HTMLButtonElement>('[data-cam]').forEach((b) =>
      b.addEventListener('click', () => {
        sm?.setCameraMode(b.dataset.cam as CameraMode);
        setCamUi(b.dataset.cam as CameraMode);
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = Number(b.dataset.speed);
        if (s === 1) clock.goLive();
        else clock.setSpeed(s);
      }),
    );
    $('.go-live').addEventListener('click', () => clock.goLive());

    offs.push(
      onLangChange(() => {
        applyI18n(root);
        sm?.labels.refreshTexts();
        refresh(true);
      }),
    );

    await sm.show('globe');
    if (disposed) return;
    setViewUi('globe');
    setLoader(null);
  }

  return {
    unmount() {
      disposed = true;
      clearInterval(timer);
      clearTimeout(toastTimer);
      offs.forEach((f) => f());
      sm?.dispose();
      sm = null;
    },
  };
}
