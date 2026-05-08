import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    visible: false,
    x: 0,
    y: 0,
    alpha: 1,
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    drawCircle: vi.fn().mockReturnThis(),
    beginFill: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

import { DangerCloseRing } from '../src/fx/danger-close-ring';

const makeContainer = () => ({ addChild: vi.fn() });

describe('DangerCloseRing', () => {
  it('allocates 2 Graphics objects (halo + core)', () => {
    const parent = makeContainer();
    new DangerCloseRing(parent as never);
    expect(parent.addChild).toHaveBeenCalledTimes(2);
  });

  it('both objects start invisible', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    const g = (ring as never)['g'] as { visible: boolean };
    const halo = (ring as never)['halo'] as { visible: boolean };
    expect(g.visible).toBe(false);
    expect(halo.visible).toBe(false);
  });

  it('step with active=false keeps both invisible', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    ring.step(0.016, false, 100, 200);
    const g = (ring as never)['g'] as { visible: boolean };
    const halo = (ring as never)['halo'] as { visible: boolean };
    expect(g.visible).toBe(false);
    expect(halo.visible).toBe(false);
  });

  it('step with active=true makes both visible', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    ring.step(0.016, true, 100, 200);
    const g = (ring as never)['g'] as { visible: boolean };
    const halo = (ring as never)['halo'] as { visible: boolean };
    expect(g.visible).toBe(true);
    expect(halo.visible).toBe(true);
  });

  it('step positions graphics at (px, py) when active', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    ring.step(0.016, true, 400, 300);
    const g = (ring as never)['g'] as { x: number; y: number };
    const halo = (ring as never)['halo'] as { x: number; y: number };
    expect(g.x).toBe(400);
    expect(g.y).toBe(300);
    expect(halo.x).toBe(400);
    expect(halo.y).toBe(300);
  });

  it('clear() hides both objects and resets phase', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    ring.step(0.016, true, 100, 100);
    ring.clear();
    const g = (ring as never)['g'] as { visible: boolean };
    const halo = (ring as never)['halo'] as { visible: boolean };
    expect(g.visible).toBe(false);
    expect(halo.visible).toBe(false);
    expect((ring as never)['phase']).toBe(0);
  });

  it('phase advances on each step when active', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    const phaseBefore = (ring as never)['phase'] as number;
    ring.step(0.1, true, 0, 0);
    const phaseAfter = (ring as never)['phase'] as number;
    expect(phaseAfter).toBeGreaterThan(phaseBefore);
  });

  it('phase wraps within [0, 2π) range', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    // Step many times to accumulate phase past 2π
    for (let i = 0; i < 200; i++) ring.step(0.1, true, 0, 0);
    const phase = (ring as never)['phase'] as number;
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(Math.PI * 2);
  });

  it('step with active=false immediately hides after being active', () => {
    const parent = makeContainer();
    const ring = new DangerCloseRing(parent as never);
    ring.step(0.016, true, 50, 50);
    ring.step(0.016, false, 50, 50);
    const g = (ring as never)['g'] as { visible: boolean };
    expect(g.visible).toBe(false);
  });
});
