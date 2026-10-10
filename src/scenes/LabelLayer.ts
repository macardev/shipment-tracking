import { Vector3, type Camera } from 'three';
import { t } from '../i18n';

export interface Label {
  el: HTMLDivElement;
  pos: Vector3;
  key?: string;
  text?: string;
  /** false dönerse etiket gizlenir (ör. dünyanın arka yüzü, sis mesafesi). */
  visible?: (camera: Camera) => boolean;
  shown: boolean;
  lastX: number;
  lastY: number;
}

const tmp = new Vector3();

/** 3D noktalara bağlı HTML etiketleri (ucuz: WebGL metin çizimi yok). */
export class LabelLayer {
  readonly el: HTMLDivElement;
  private labels: Label[] = [];

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'label-layer';
    host.appendChild(this.el);
  }

  add(opts: { key?: string; text?: string; cls?: string; visible?: Label['visible'] }): Label {
    const el = document.createElement('div');
    el.className = `label3d ${opts.cls ?? ''}`;
    el.style.display = 'none';
    this.el.appendChild(el);
    const label: Label = { el, pos: new Vector3(), key: opts.key, text: opts.text, visible: opts.visible, shown: false, lastX: -1, lastY: -1 };
    this.setText(label);
    this.labels.push(label);
    return label;
  }

  setText(label: Label, text?: string) {
    if (text !== undefined) label.text = text;
    const parts = [label.key ? t(label.key) : '', label.text ?? ''].filter(Boolean);
    label.el.textContent = parts.join(' · ');
  }

  refreshTexts() {
    this.labels.forEach((l) => this.setText(l));
  }

  update(camera: Camera, width: number, height: number) {
    for (const l of this.labels) {
      tmp.copy(l.pos).project(camera);
      const ok = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && (!l.visible || l.visible(camera));
      if (ok !== l.shown) {
        l.el.style.display = ok ? '' : 'none';
        l.shown = ok;
      }
      if (!ok) continue;
      const x = Math.round((tmp.x * 0.5 + 0.5) * width);
      const y = Math.round((-tmp.y * 0.5 + 0.5) * height);
      if (x !== l.lastX || y !== l.lastY) {
        l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        l.lastX = x;
        l.lastY = y;
      }
    }
  }

  dispose() {
    this.el.remove();
    this.labels = [];
  }
}
