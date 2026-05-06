/**
 * Tweaks Menu UI.
 *
 * DOM-based panel that overlays the game canvas. Pauses the loop while open.
 * Driven by the tweak registry — adding a tweak in `registry.ts` automatically
 * adds a row here.
 */
import { Tweak, TweakCategory, buildRegistry, snapshotConfig } from './registry';
import {
  loadOverlay,
  saveOverlay,
  applyOverlay,
  captureOverlay,
  resetCategory,
} from './state';
import {
  recordFeedback,
  exportConfigToClipboard,
  downloadBuffer,
  clearBuffer,
  loadBuffer,
  type FeedbackTag,
} from './feedback';
import type { FrameInfo } from '../engine/loop';

const CATEGORY_ORDER: readonly TweakCategory[] = ['controls', 'visual', 'audio', 'flow', 'debug'];
const CATEGORY_LABEL: Record<TweakCategory, string> = {
  controls: 'Controls',
  visual: 'Visual juice',
  audio: 'Audio',
  flow: 'Game flow',
  debug: 'Debug',
};

export interface TweaksMenuHooks {
  /** called whenever any tweak value changes */
  onConfigChanged: () => void;
  /** called when the menu opens (pause game) */
  onOpen: () => void;
  /** called when the menu closes (resume game) */
  onClose: () => void;
  /** counters for the live perf overlay */
  particleCount: () => number;
  entityCount: () => number;
}

export class TweaksMenu {
  private root: HTMLElement;
  private panel: HTMLElement;
  private statsEl: HTMLElement;
  private noteEl!: HTMLTextAreaElement;
  private feedbackEl!: HTMLElement;
  private registry = buildRegistry();
  private hooks: TweaksMenuHooks;
  private rowEls = new Map<string, HTMLElement>();
  private isOpen = false;
  private statsRaf = 0;

  constructor(host: HTMLElement, hooks: TweaksMenuHooks) {
    this.hooks = hooks;
    this.root = document.createElement('div');
    this.root.className = 'tweaks-root';
    this.root.style.display = 'none';
    this.root.innerHTML = this.template();
    host.appendChild(this.root);

    this.panel = this.root.querySelector('.tweaks-panel') as HTMLElement;
    this.statsEl = this.root.querySelector('.tweaks-stats') as HTMLElement;
    this.noteEl = this.root.querySelector('.tweaks-note') as HTMLTextAreaElement;
    this.feedbackEl = this.root.querySelector('.tweaks-feedback-status') as HTMLElement;

    // Apply persisted overlay onto live config before building rows.
    applyOverlay(this.registry, loadOverlay());

    this.buildRows();
    this.wireGlobalActions();
    this.root.querySelector('.tweaks-close')?.addEventListener('click', () => this.close());
  }

  /** Public toggle. Idempotent. */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.root.style.display = 'flex';
    this.refreshAllRows();
    this.hooks.onOpen();
    this.tickStats();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.style.display = 'none';
    if (this.statsRaf) cancelAnimationFrame(this.statsRaf);
    this.statsRaf = 0;
    this.hooks.onClose();
  }

  /** Called from the loop's onFrame so the live perf line stays accurate. */
  feedFrameInfo(info: FrameInfo): void {
    this.lastFrameInfo = info;
  }

  private lastFrameInfo: FrameInfo | null = null;

  private template(): string {
    return `
      <div class="tweaks-panel" role="dialog" aria-label="Tweaks Menu">
        <div class="tweaks-header">
          <div class="tweaks-title">Tweaks</div>
          <div class="tweaks-stats" aria-live="polite"></div>
          <button class="tweaks-close" aria-label="Close">×</button>
        </div>

        <div class="tweaks-body"></div>

        <div class="tweaks-feedback">
          <div class="tweaks-feedback-row">
            <button class="tweaks-btn tweaks-like" data-tag="LIKE">Like</button>
            <button class="tweaks-btn tweaks-dislike" data-tag="DISLIKE">Dislike</button>
            <button class="tweaks-btn tweaks-compare" data-tag="COMPARE">Compare</button>
          </div>
          <textarea class="tweaks-note" rows="2" placeholder="Optional note (what felt off / right?)"></textarea>
          <div class="tweaks-feedback-status" aria-live="polite"></div>
          <div class="tweaks-feedback-row">
            <button class="tweaks-btn tweaks-export">Export config</button>
            <button class="tweaks-btn tweaks-download">Download feedback</button>
            <button class="tweaks-btn tweaks-clear-feedback">Clear feedback</button>
          </div>
        </div>

        <div class="tweaks-foot">
          <button class="tweaks-btn tweaks-reset-all">Reset all to defaults</button>
        </div>
      </div>
    `;
  }

  private buildRows(): void {
    const body = this.panel.querySelector('.tweaks-body') as HTMLElement;
    body.innerHTML = '';
    for (const cat of CATEGORY_ORDER) {
      const tweaks = this.registry.filter((t) => t.category === cat);
      if (tweaks.length === 0) continue;
      const section = document.createElement('section');
      section.className = 'tweaks-section';
      const head = document.createElement('div');
      head.className = 'tweaks-section-head';
      head.innerHTML = `<span>${CATEGORY_LABEL[cat]}</span>`;
      const reset = document.createElement('button');
      reset.className = 'tweaks-btn tweaks-reset-cat';
      reset.textContent = 'Reset';
      reset.addEventListener('click', () => {
        resetCategory(this.registry, cat);
        this.persistAndPing();
        this.refreshAllRows();
      });
      head.appendChild(reset);
      section.appendChild(head);
      for (const t of tweaks) {
        section.appendChild(this.buildRow(t));
      }
      body.appendChild(section);
    }
  }

  private buildRow(t: Tweak): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tweaks-row';
    const label = document.createElement('label');
    label.className = 'tweaks-label';
    label.textContent = t.label;
    if (t.experimental) {
      const tag = document.createElement('span');
      tag.className = 'tweaks-exp';
      tag.textContent = 'experimental';
      label.appendChild(tag);
    }
    row.appendChild(label);

    const valueEl = document.createElement('span');
    valueEl.className = 'tweaks-value';
    row.appendChild(valueEl);

    const ctrlWrap = document.createElement('div');
    ctrlWrap.className = 'tweaks-ctrl';
    row.appendChild(ctrlWrap);

    if (t.kind === 'slider') {
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(t.min);
      input.max = String(t.max);
      input.step = String(t.step);
      input.value = String(t.get());
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        t.set(v);
        valueEl.textContent = formatNumber(v, t.unit);
        this.persistAndPing();
      });
      ctrlWrap.appendChild(input);
      valueEl.textContent = formatNumber(t.get(), t.unit);
    } else if (t.kind === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = t.get();
      input.addEventListener('change', () => {
        t.set(input.checked);
        valueEl.textContent = input.checked ? 'on' : 'off';
        this.persistAndPing();
      });
      ctrlWrap.appendChild(input);
      valueEl.textContent = t.get() ? 'on' : 'off';
    } else {
      const select = document.createElement('select');
      for (const o of t.options) {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        if (o === t.get()) opt.selected = true;
        select.appendChild(opt);
      }
      select.addEventListener('change', () => {
        t.set(select.value as never);
        valueEl.textContent = select.value;
        this.persistAndPing();
      });
      ctrlWrap.appendChild(select);
      valueEl.textContent = String(t.get());
    }

    if (t.description) {
      const d = document.createElement('div');
      d.className = 'tweaks-desc';
      d.textContent = t.description;
      row.appendChild(d);
    }

    this.rowEls.set(t.path, row);
    return row;
  }

  private refreshAllRows(): void {
    for (const t of this.registry) {
      const row = this.rowEls.get(t.path);
      if (!row) continue;
      const valueEl = row.querySelector('.tweaks-value') as HTMLElement;
      const input = row.querySelector('input,select') as
        | HTMLInputElement
        | HTMLSelectElement
        | null;
      if (!input) continue;
      const v = t.get();
      if (t.kind === 'toggle') {
        (input as HTMLInputElement).checked = v as boolean;
        valueEl.textContent = v ? 'on' : 'off';
      } else if (t.kind === 'slider') {
        (input as HTMLInputElement).value = String(v);
        valueEl.textContent = formatNumber(v as number, t.unit);
      } else {
        (input as HTMLSelectElement).value = String(v);
        valueEl.textContent = String(v);
      }
    }
  }

  private persistAndPing(): void {
    saveOverlay(captureOverlay(this.registry));
    this.hooks.onConfigChanged();
  }

  private wireGlobalActions(): void {
    const root = this.root;
    root.querySelectorAll<HTMLButtonElement>('.tweaks-feedback-row [data-tag]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleFeedback(btn.dataset.tag as FeedbackTag));
    });
    root.querySelector('.tweaks-export')?.addEventListener('click', async () => {
      const ok = await exportConfigToClipboard();
      this.flashStatus(ok ? 'config copied to clipboard' : 'clipboard write failed');
    });
    root.querySelector('.tweaks-download')?.addEventListener('click', () => {
      downloadBuffer();
      this.flashStatus(`downloaded ${loadBuffer().length} entries`);
    });
    root.querySelector('.tweaks-clear-feedback')?.addEventListener('click', () => {
      clearBuffer();
      this.flashStatus('feedback buffer cleared');
    });
    root.querySelector('.tweaks-reset-all')?.addEventListener('click', () => {
      resetCategory(this.registry); // no category = all
      this.persistAndPing();
      this.refreshAllRows();
      this.flashStatus('all values reset to defaults');
    });
  }

  private async handleFeedback(tag: FeedbackTag): Promise<void> {
    const note = this.noteEl.value;
    const r = await recordFeedback(tag, note);
    this.noteEl.value = '';
    this.flashStatus(
      `${tag} saved · ${r.copiedToClipboard ? 'copied to clipboard' : 'in localStorage buffer'} · ${loadBuffer().length} total`,
    );
  }

  private flashStatus(text: string): void {
    this.feedbackEl.textContent = text;
    setTimeout(() => {
      if (this.feedbackEl.textContent === text) this.feedbackEl.textContent = '';
    }, 2400);
  }

  private tickStats(): void {
    const lines: string[] = [];
    if (this.lastFrameInfo) {
      lines.push(
        `${this.lastFrameInfo.fps.toFixed(1)} fps   sim ${this.lastFrameInfo.simMs.toFixed(2)}ms   render ${this.lastFrameInfo.renderMs.toFixed(2)}ms`,
      );
    }
    lines.push(
      `entities ${this.hooks.entityCount()}   particles ${this.hooks.particleCount()}`,
    );
    lines.push(`build v${snapshotConfig().buildVersion}`);
    this.statsEl.textContent = lines.join('  ·  ');
    this.statsRaf = requestAnimationFrame(() => this.tickStats());
  }
}

function formatNumber(v: number, unit?: string): string {
  let s: string;
  if (Number.isInteger(v)) s = String(v);
  else s = v.toFixed(2);
  return unit ? `${s} ${unit}` : s;
}
