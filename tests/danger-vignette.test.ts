import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    alpha: 0,
    clear: vi.fn().mockReturnThis(),
    beginFill: vi.fn().mockReturnThis(),
    drawRect: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

const makeContainer = () => ({ addChild: vi.fn() });
const makeVp = (w = 1600, h = 900) => ({ width: w, height: h, dpr: 1, halfW: w / 2, halfH: h / 2 });

describe('fx/danger-vignette', () => {
  let DangerVignette: typeof import('../src/fx/danger-vignette').DangerVignette;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;

  beforeEach(async () => {
    vi.resetModules();
    ({ DangerVignette } = await import('../src/fx/danger-vignette'));
    ({ config, DEFAULTS } = await import('../src/config'));
    Object.assign(config.juice, DEFAULTS.juice);
    Object.assign(config.flow, DEFAULTS.flow);
  });

  it('starts invisible', () => {
    const v = new DangerVignette(makeContainer() as never);
    const g = (v as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
  });

  it('stays invisible when toggle is off', () => {
    config.juice.dangerVignette = false;
    const v = new DangerVignette(makeContainer() as never);
    v.step(1.0, 1, makeVp());
    const g = (v as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
  });

  it('stays invisible at full lives even with toggle on', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    v.step(1.0, 3, makeVp());
    const g = (v as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
  });

  it('stays invisible at 2 lives', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    v.step(1.0, 2, makeVp());
    const g = (v as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
  });

  it('becomes visible when at 1 life with toggle on', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    // Step with a phase that produces a non-zero pulse (sin(PI/2) = 1)
    const vignette = v as unknown as { phase: number };
    vignette.phase = Math.PI / 2 - 0.01; // just before the peak
    v.step(0.2, 1, makeVp());
    const g = (v as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBeGreaterThan(0);
  });

  it('intensity rises gradually when at danger (1 life)', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    const inner = v as unknown as { intensity: number };
    v.step(0.1, 1, makeVp());
    const i1 = inner.intensity;
    v.step(0.1, 1, makeVp());
    const i2 = inner.intensity;
    expect(i1).toBeGreaterThan(0);
    expect(i2).toBeGreaterThan(i1);
  });

  it('intensity decays when lives go above 1', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    v.step(2.0, 1, makeVp()); // fill intensity
    const before = (v as unknown as { intensity: number }).intensity;
    v.step(0.5, 3, makeVp()); // lives restored
    const after = (v as unknown as { intensity: number }).intensity;
    expect(after).toBeLessThan(before);
  });

  it('clear() immediately hides the vignette and resets intensity', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    v.step(2.0, 1, makeVp());
    v.clear();
    const g = (v as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
    expect((v as unknown as { intensity: number }).intensity).toBe(0);
  });

  it('geometry redrawn on viewport size change, not on same viewport', () => {
    config.juice.dangerVignette = true;
    const v = new DangerVignette(makeContainer() as never);
    const g = (v as unknown as { g: { clear: ReturnType<typeof vi.fn> } }).g;
    const vp = makeVp();
    // Seed intensity then step to trigger a redraw
    const inner = v as unknown as { intensity: number };
    inner.intensity = 1.0;
    v.step(0.1, 1, vp);
    const count1 = g.clear.mock.calls.length;
    v.step(0.1, 1, vp); // same viewport — no redraw
    expect(g.clear.mock.calls.length).toBe(count1);
    v.step(0.1, 1, makeVp(800, 450)); // different — redraw
    expect(g.clear.mock.calls.length).toBeGreaterThan(count1);
  });
});
