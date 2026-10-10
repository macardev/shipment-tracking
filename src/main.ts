import './styles.css';
import { MockProvider } from './data/MockProvider';
import { initLang } from './i18n';
import type { Page } from './ui/common';
import { mountDetailPage } from './ui/DetailPage';
import { mountTrackPage } from './ui/TrackPage';

initLang();
const app = document.getElementById('app')!;
// Gerçek üründe burası API sağlayıcısıyla değiştirilir.
const provider = new MockProvider();
let page: Page | null = null;

function route() {
  page?.unmount();
  const m = location.hash.match(/^#\/track\/([^?]+)/);
  page = m ? mountDetailPage(app, decodeURIComponent(m[1]), provider) : mountTrackPage(app, provider);
}

window.addEventListener('hashchange', route);
route();
