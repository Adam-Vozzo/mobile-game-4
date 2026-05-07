import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal PixiJS stub so SurgeGlow can be imported in node environment.
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

describe('fx/surge-glow', () => {
  // Import after mock is set up.
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let SurgeGlow: typeof import('../src/fx/surge-glow').SurgeGlow;

  beforeEach(async () => {
    vi.resetModules();
    ({ SurgeGlow } = await import('../src/fx/surge-glow'));
  });

  it('starts invisible', () => {
    const glow = new SurgeGlow(makeContainer() as never);
    const g = (glow as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
  });

  it('rises toward visible when surging', () => {
    const glow = new SurgeGlow(makeContainer() as never);
    glow.setSurging(true);
    glow.step(0.1, makeVp());
    const g = (glow as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBeGreaterThan(0);
  });

  it('intensity decays after surge ends', () => {
    const glow = new SurgeGlow(makeContainer() as never);
    glow.setSurging(true);
    glow.step(1.0, makeVp()); // fill up intensity
    glow.setSurging(false);
    const g = (glow as unknown as { g: { alpha: number } }).g;
    const alphaBefore = g.alpha;
    glow.step(0.5, makeVp());
    expect(g.alpha).toBeLessThan(alphaBefore);
  });

  it('clear() immediately hides the glow', () => {
    const glow = new SurgeGlow(makeContainer() as never);
    glow.setSurging(true);
    glow.step(1.0, makeVp());
    glow.clear();
    const g = (glow as unknown as { g: { alpha: number } }).g;
    expect(g.alpha).toBe(0);
  });

  it('geometry is drawn on first step, not again for same viewport', () => {
    const glow = new SurgeGlow(makeContainer() as never);
    const g = (glow as unknown as { g: { clear: ReturnType<typeof vi.fn> } }).g;
    const vp = makeVp();
    glow.setSurging(true);
    glow.step(0.1, vp);
    const after1 = g.clear.mock.calls.length;
    // Same viewport — no redraw.
    glow.step(0.1, vp);
    expect(g.clear.mock.calls.length).toBe(after1);
    // Different viewport — should redraw.
    glow.step(0.1, makeVp(800, 450));
    expect(g.clear.mock.calls.length).toBeGreaterThan(after1);
  });
});
