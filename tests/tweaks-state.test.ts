import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyOverlay, captureOverlay } from '../src/tweaks/state';
import { buildRegistry } from '../src/tweaks/registry';
import { config, DEFAULTS } from '../src/config';

// Reset live config to defaults between tests.
beforeEach(() => {
  Object.assign(config.controls, structuredClone(DEFAULTS.controls));
  Object.assign(config.juice, structuredClone(DEFAULTS.juice));
  Object.assign(config.audio, structuredClone(DEFAULTS.audio));
  Object.assign(config.flow, structuredClone(DEFAULTS.flow));
  Object.assign(config.debug, structuredClone(DEFAULTS.debug));
  Object.assign(config.score.multiplier, structuredClone(DEFAULTS.score.multiplier));
});

describe('tweaks/state', () => {
  it('captureOverlay only emits non-default values', () => {
    const reg = buildRegistry();
    const empty = captureOverlay(reg);
    expect(Object.keys(empty)).toEqual([]);

    config.juice.particleDensity = 1.5; // non-default
    const overlay = captureOverlay(reg);
    expect(overlay['juice.particleDensity']).toBe(1.5);
    expect(Object.keys(overlay)).toContain('juice.particleDensity');
  });

  it('applyOverlay applies values matching the registry', () => {
    const reg = buildRegistry();
    expect(config.juice.screenShakeIntensity).toBe(DEFAULTS.juice.screenShakeIntensity);
    applyOverlay(reg, { 'juice.screenShakeIntensity': 0.5 });
    expect(config.juice.screenShakeIntensity).toBe(0.5);
  });

  it('applyOverlay ignores type-mismatched values silently', () => {
    const reg = buildRegistry();
    const before = config.controls.autoFire;
    applyOverlay(reg, { 'controls.autoFire': 'not a boolean' as unknown as boolean });
    expect(config.controls.autoFire).toBe(before);
  });

  it('applyOverlay ignores unknown paths silently', () => {
    const reg = buildRegistry();
    expect(() => applyOverlay(reg, { 'no.such.path': 1 })).not.toThrow();
  });
});

describe('tweaks/registry', () => {
  it('every tweak has a default that round-trips through get/set', () => {
    const reg = buildRegistry();
    for (const t of reg) {
      const orig = t.get();
      // Set to default, read back; should be equal.
      (t.set as (v: unknown) => void)(t.default);
      expect(t.get()).toBe(t.default);
      // Restore.
      (t.set as (v: unknown) => void)(orig);
    }
  });

  it('exposes both control schemes', () => {
    const reg = buildRegistry();
    const scheme = reg.find((t) => t.path === 'controls.scheme');
    expect(scheme).toBeDefined();
    expect(scheme!.kind).toBe('select');
    if (scheme!.kind !== 'select') return;
    expect(scheme!.options).toContain('single-thumb-autoaim');
    expect(scheme!.options).toContain('virtual-twin-sticks');
  });
});

describe('tweaks/feedback recordFeedback', () => {
  // jsdom-less node env test — simulate localStorage + clipboard.
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      },
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
    });
  });

  it('appends entries to the buffer and writes JSONL to clipboard', async () => {
    const { recordFeedback, loadBuffer, clearBuffer } = await import('../src/tweaks/feedback');
    clearBuffer();
    const r = await recordFeedback('LIKE', 'felt great');
    expect(r.entry.tag).toBe('LIKE');
    expect(r.entry.note).toBe('felt great');
    expect(r.jsonl.endsWith('\n')).toBe(true);
    expect(r.copiedToClipboard).toBe(true);
    const buf = loadBuffer();
    expect(buf.length).toBe(1);
    expect(buf[0]!.tag).toBe('LIKE');
  });
});
