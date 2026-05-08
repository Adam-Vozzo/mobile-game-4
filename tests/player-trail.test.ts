import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    alpha: 0,
    x: 0,
    y: 0,
    rotation: 0,
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

const makeContainer = () => ({ addChild: vi.fn() });

const makePlayer = (overrides: Partial<{
  x: number; y: number; vx: number; vy: number;
  facing: number; alive: boolean; blink: boolean;
}> = {}) => ({
  x: 400, y: 300, vx: 100, vy: 0,
  facing: 0, alive: true, blink: false,
  fireCooldown: 0,
  ...overrides,
});

describe('fx/player-trail', () => {
  let PlayerTrail: typeof import('../src/fx/player-trail').PlayerTrail;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;

  beforeEach(async () => {
    vi.resetModules();
    ({ PlayerTrail } = await import('../src/fx/player-trail'));
    ({ config, DEFAULTS } = await import('../src/config'));
    Object.assign(config.juice, DEFAULTS.juice);
  });

  it('allocates 8 ghost Graphics added to the layer', () => {
    const layer = makeContainer();
    new PlayerTrail(layer as never);
    expect(layer.addChild).toHaveBeenCalledTimes(8);
  });

  it('all ghosts start invisible', () => {
    const trail = new PlayerTrail(makeContainer() as never);
    const ghosts = (trail as unknown as { ghosts: Array<{ alpha: number }> }).ghosts;
    for (const g of ghosts) expect(g.alpha).toBe(0);
  });

  it('toggle off keeps all ghosts hidden even when moving fast', () => {
    config.juice.playerTrail = false;
    const trail = new PlayerTrail(makeContainer() as never);
    // Advance well past the sample interval with fast movement
    trail.step(0.5, makePlayer({ vx: 200, vy: 0 }) as never);
    const ghosts = (trail as unknown as { ghosts: Array<{ alpha: number }> }).ghosts;
    for (const g of ghosts) expect(g.alpha).toBe(0);
  });

  it('snapshots accumulate when moving above threshold', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    // Step past many sample intervals with high speed
    for (let i = 0; i < 10; i++) {
      trail.step(0.05, makePlayer({ x: i * 5, vx: 150, vy: 0 }) as never);
    }
    const snapshots = (trail as unknown as { snapshots: unknown[] }).snapshots;
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it('snapshot count is capped at 8', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    for (let i = 0; i < 30; i++) {
      trail.step(0.05, makePlayer({ x: i * 5, vx: 150, vy: 0 }) as never);
    }
    const snapshots = (trail as unknown as { snapshots: unknown[] }).snapshots;
    expect(snapshots.length).toBeLessThanOrEqual(8);
  });

  it('no snapshots when speed is below threshold', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    for (let i = 0; i < 10; i++) {
      trail.step(0.05, makePlayer({ vx: 5, vy: 0 }) as never); // speed = 5 < 30
    }
    const snapshots = (trail as unknown as { snapshots: unknown[] }).snapshots;
    expect(snapshots.length).toBe(0);
  });

  it('newest ghost has higher alpha than oldest when multiple snapshots exist', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    // Fill at least 3 snapshots
    for (let i = 0; i < 8; i++) {
      trail.step(0.05, makePlayer({ x: i * 10, vx: 150, vy: 0 }) as never);
    }
    const ghosts = (trail as unknown as { ghosts: Array<{ alpha: number }> }).ghosts;
    const snapshots = (trail as unknown as { snapshots: unknown[] }).snapshots;
    if (snapshots.length >= 2) {
      // ghost[0] = oldest (lowest alpha), ghost[n-1] = newest (highest alpha)
      expect(ghosts[snapshots.length - 1]!.alpha).toBeGreaterThan(ghosts[0]!.alpha);
    }
  });

  it('clear() empties snapshots and hides all ghosts', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    for (let i = 0; i < 10; i++) {
      trail.step(0.05, makePlayer({ x: i * 5, vx: 150 }) as never);
    }
    trail.clear();
    const snapshots = (trail as unknown as { snapshots: unknown[] }).snapshots;
    const ghosts = (trail as unknown as { ghosts: Array<{ alpha: number }> }).ghosts;
    expect(snapshots.length).toBe(0);
    for (const g of ghosts) expect(g.alpha).toBe(0);
  });

  it('ghosts hidden when player is not alive', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    // Seed some snapshots first via a living player
    for (let i = 0; i < 5; i++) {
      trail.step(0.05, makePlayer({ x: i * 10, vx: 150 }) as never);
    }
    // Now step with dead player
    trail.step(0.01, makePlayer({ alive: false }) as never);
    const ghosts = (trail as unknown as { ghosts: Array<{ alpha: number }> }).ghosts;
    for (const g of ghosts) expect(g.alpha).toBe(0);
  });

  it('ghosts hidden when player is blinking (invincibility)', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    for (let i = 0; i < 5; i++) {
      trail.step(0.05, makePlayer({ x: i * 10, vx: 150 }) as never);
    }
    trail.step(0.01, makePlayer({ blink: true, vx: 150 }) as never);
    const ghosts = (trail as unknown as { ghosts: Array<{ alpha: number }> }).ghosts;
    for (const g of ghosts) expect(g.alpha).toBe(0);
  });

  it('snapshots decay (shed one per interval) when player stops moving', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    // Fill snapshots
    for (let i = 0; i < 8; i++) {
      trail.step(0.05, makePlayer({ x: i * 10, vx: 150 }) as never);
    }
    const before = (trail as unknown as { snapshots: unknown[] }).snapshots.length;
    // Stop moving — each sample interval sheds one
    trail.step(0.05, makePlayer({ vx: 0, vy: 0 }) as never);
    const after = (trail as unknown as { snapshots: unknown[] }).snapshots.length;
    expect(after).toBeLessThan(before);
  });

  it('ghost position matches the corresponding snapshot', () => {
    config.juice.playerTrail = true;
    const trail = new PlayerTrail(makeContainer() as never);
    trail.step(0.05, makePlayer({ x: 100, y: 200, vx: 150, facing: 0.5 }) as never);
    const snapshots = (trail as unknown as { snapshots: Array<{ x: number; y: number; rot: number }> }).snapshots;
    const ghosts = (trail as unknown as { ghosts: Array<{ x: number; y: number; rotation: number }> }).ghosts;
    if (snapshots.length > 0) {
      const snap = snapshots[0]!;
      expect(ghosts[0]!.x).toBe(snap.x);
      expect(ghosts[0]!.y).toBe(snap.y);
      expect(ghosts[0]!.rotation).toBe(snap.rot);
    }
  });
});
