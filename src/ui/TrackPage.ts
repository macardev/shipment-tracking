import type { ShipmentProvider } from '../data/ShipmentProvider';
import { onLangChange, t } from '../i18n';
import { applyI18n, brandHtml, esc, langSelect, type Page } from './common';

export function mountTrackPage(root: HTMLElement, provider: ShipmentProvider): Page {
  root.innerHTML = `
    <div class="track-page">
      <div class="track-top">${brandHtml()}<div class="lang-slot"></div></div>
      <main class="track-hero">
        <h1><span data-i18n="track.title"></span></h1>
        <p class="sub" data-i18n="track.subtitle"></p>
        <form class="track-form" autocomplete="off">
          <input name="no" data-i18n-ph="track.placeholder" aria-label="tracking number" />
          <button class="btn-primary" type="submit" data-i18n="track.button"></button>
        </form>
        <div class="track-msg" role="status"></div>
        <div class="samples">
          <span data-i18n="track.samples"></span>
          ${provider
            .listSamples()
            .map((s) => `<button class="chip" type="button" data-no="${esc(s.trackingNo)}"><b>${esc(s.trackingNo)}</b><span data-i18n="${s.hintKey}"></span></button>`)
            .join('')}
        </div>
        <section class="features">
          <div class="feature"><h3 data-i18n="track.f1.t"></h3><p data-i18n="track.f1.d"></p></div>
          <div class="feature"><h3 data-i18n="track.f2.t"></h3><p data-i18n="track.f2.d"></p></div>
          <div class="feature"><h3 data-i18n="track.f3.t"></h3><p data-i18n="track.f3.d"></p></div>
        </section>
      </main>
      <div class="demo-note" data-i18n="track.demoNote"></div>
    </div>`;
  root.querySelector('.lang-slot')!.appendChild(langSelect());
  applyI18n(root);

  const form = root.querySelector('form')!;
  const input = form.querySelector('input')!;
  const btn = form.querySelector('button')!;
  const msg = root.querySelector<HTMLElement>('.track-msg')!;

  async function go(no: string) {
    if (!no.trim()) return;
    btn.disabled = true;
    msg.textContent = t('track.loading');
    const s = await provider.getShipment(no);
    btn.disabled = false;
    if (!s) {
      msg.textContent = t('track.notFound');
      return;
    }
    location.hash = `#/track/${encodeURIComponent(s.trackingNo)}${location.hash.includes('debug=1') ? '?debug=1' : ''}`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void go(input.value);
  });
  root.querySelectorAll<HTMLButtonElement>('.chip').forEach((c) =>
    c.addEventListener('click', () => {
      input.value = c.dataset.no!;
      void go(c.dataset.no!);
    }),
  );

  const off = onLangChange(() => applyI18n(root));
  return { unmount: off };
}
