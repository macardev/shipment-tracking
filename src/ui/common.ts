import { getLang, setLang, t, type Lang } from '../i18n';

export interface Page {
  unmount(): void;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** data-i18n="anahtar" taşıyan tüm elemanların metnini günceller. */
export function applyI18n(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh!);
  });
}

export function brandHtml(): string {
  return `<div class="brand"><div class="brand-mark">3D</div><div>Seyir 3D<small data-i18n="brand.tagline"></small></div></div>`;
}

export function langSelect(): HTMLSelectElement {
  const sel = document.createElement('select');
  sel.className = 'pill-select';
  sel.setAttribute('aria-label', 'Language');
  const langs: [Lang, string][] = [
    ['tr', 'Türkçe'],
    ['en', 'English'],
    ['ar', 'العربية'],
  ];
  for (const [v, label] of langs) sel.add(new Option(label, v, false, v === getLang()));
  sel.addEventListener('change', () => setLang(sel.value as Lang));
  return sel;
}
