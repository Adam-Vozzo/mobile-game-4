import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    drawCircle: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

const makeContainer = () => ({ addChild: vi.fn() });

const hitEvent = (overrides: Partial<{ x: number; y: number; livesRemaining: number }> = {}) => ({
  x: 300, y: 200, livesRemaining: 2,
  ...overrides,
});

describe('fx/player-death-shockwave', () => {
  let PlayerDeathShockwave: typeof import('../src/fx/player-death-shockwave').PlayerDeathShockwave;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;
  let events: typeof import('../src/engine/events').events;

  beforeEach(async () => {
    vi.resetModules();
    ({ PlayerDeathShockwave } = await import('../src/fx/player-death-shockwave'));
    ({ config, DEFAULTS } = await import('../src/config'));
    ({ events } = await import('../src/engine/events'));
    Object.assign(config.juice, DEFAULTS.juice);
    Object.assign(config.flow, DEFAULTS.flow);
  });

  it('does not add a ring on hit when toggle is off', () => {
    config.juice.playerDeathShockwave = false;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent());
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
    d.destroy();
  });

  it('adds a ring on hit when toggle is on', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent());
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(1);
    d.destroy();
  });

  it('ring is positioned at the hit coordinates', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent({ x: 500, y: 350 }));
    const ring = (d as unknown as { rings: Array<{ x: number; y: number }> }).rings[0]!;
    expect(ring.x).toBe(500);
    expect(ring.y).toBe(350);
    d.destroy();
  });

  it('ring radius grows with lives lost (livesRemaining=0 > livesRemaining=2)', () => {
    config.juice.playerDeathShockwave = true;
    config.flow.startingLives = 3;

    const d1 = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent({ livesRemaining: 2 })); // 1 death
    const ring1 = (d1 as unknown as { rings: Array<{ maxRadius: number }> }).rings[0]!;
    d1.destroy();

    vi.resetModules();

    const d2 = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent({ livesRemaining: 0 })); // 3 deaths (game-over hit)
    const ring2 = (d2 as unknown as { rings: Array<{ maxRadius: number }> }).rings[0]!;
    d2.destroy();

    expect(ring2.maxRadius).toBeGreaterThan(ring1.maxRadius);
  });

  it('ring expires after its duration has elapsed', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent());
    d.step(0.60); // DURATION is 0.55 s
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
    d.destroy();
  });

  it('ring is still alive before its duration elapses', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent());
    d.step(0.25);
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(1);
    d.destroy();
  });

  it('clear() removes all active rings', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    events.emit('playerHit', hitEvent());
    events.emit('playerHit', hitEvent({ x: 100 }));
    d.clear();
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
    d.destroy();
  });

  it('caps concurrent rings at 6, dropping the oldest', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    for (let i = 0; i < 8; i++) {
      events.emit('playerHit', hitEvent({ x: i * 50 }));
    }
    const rings = (d as unknown as { rings: Array<{ x: number }> }).rings;
    expect(rings).toHaveLength(6);
    expect(rings[0]!.x).toBe(100); // first two (x=0, x=50) dropped
    d.destroy();
  });

  it('step() calls drawCircle for each active ring', () => {
    config.juice.playerDeathShockwave = true;
    const container = makeContainer();
    const d = new PlayerDeathShockwave(container as never);
    const g = (d as unknown as { g: { drawCircle: ReturnType<typeof vi.fn> } }).g;
    events.emit('playerHit', hitEvent());
    events.emit('playerHit', hitEvent({ x: 100 }));
    d.step(0.1);
    expect(g.drawCircle).toHaveBeenCalledTimes(2);
    d.destroy();
  });

  it('destroy() unsubscribes the playerHit listener', () => {
    config.juice.playerDeathShockwave = true;
    const d = new PlayerDeathShockwave(makeContainer() as never);
    d.destroy();
    events.emit('playerHit', hitEvent());
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
  });
});
