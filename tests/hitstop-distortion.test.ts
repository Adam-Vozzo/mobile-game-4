import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    alpha: 0,
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

const killEvent = (overrides: Partial<{
  x: number; y: number; r: number; g: number; b: number; pointValue: number; multiplier: number;
}> = {}) => ({
  x: 200, y: 150, r: 1, g: 0.5, b: 0, pointValue: 25, multiplier: 1,
  enemyType: 'wanderer' as const,
  ...overrides,
});

describe('fx/hitstop-distortion', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let HitstopDistortion: typeof import('../src/fx/hitstop-distortion').HitstopDistortion;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;
  let events: typeof import('../src/engine/events').events;

  beforeEach(async () => {
    vi.resetModules();
    ({ HitstopDistortion } = await import('../src/fx/hitstop-distortion'));
    ({ config, DEFAULTS } = await import('../src/config'));
    ({ events } = await import('../src/engine/events'));
    Object.assign(config.juice, DEFAULTS.juice);
  });

  it('does not add a ring on kill when toggle is off', () => {
    config.juice.hitstopDistortion = false;
    const d = new HitstopDistortion(makeContainer() as never);
    events.emit('kill', killEvent());
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
    d.destroy();
  });

  it('adds a ring on kill when toggle is on', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    events.emit('kill', killEvent());
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(1);
    d.destroy();
  });

  it('ring is positioned at kill coordinates', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    events.emit('kill', killEvent({ x: 400, y: 300 }));
    const ring = (d as unknown as { rings: Array<{ x: number; y: number }> }).rings[0]!;
    expect(ring.x).toBe(400);
    expect(ring.y).toBe(300);
    d.destroy();
  });

  it('ring expires after its duration has elapsed', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    events.emit('kill', killEvent());
    d.step(0.40); // DURATION is 0.38 s
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
    d.destroy();
  });

  it('ring is still alive before its duration elapses', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    events.emit('kill', killEvent());
    d.step(0.20);
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(1);
    d.destroy();
  });

  it('clear() removes all active rings immediately', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    events.emit('kill', killEvent());
    events.emit('kill', killEvent({ x: 100, y: 50 }));
    d.clear();
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
    d.destroy();
  });

  it('caps concurrent rings at 8, dropping the oldest', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    for (let i = 0; i < 10; i++) {
      events.emit('kill', killEvent({ x: i * 10, y: 0 }));
    }
    const rings = (d as unknown as { rings: Array<{ x: number }> }).rings;
    expect(rings).toHaveLength(8);
    // Oldest two (x=0, x=10) should have been dropped
    expect(rings[0]!.x).toBe(20);
    d.destroy();
  });

  it('step() calls drawCircle for each active ring', () => {
    config.juice.hitstopDistortion = true;
    const container = makeContainer();
    const d = new HitstopDistortion(container as never);
    const g = (d as unknown as { g: { drawCircle: ReturnType<typeof vi.fn> } }).g;
    events.emit('kill', killEvent());
    events.emit('kill', killEvent({ x: 50, y: 50 }));
    d.step(0.05);
    expect(g.drawCircle).toHaveBeenCalledTimes(2);
    d.destroy();
  });

  it('destroy() unsubscribes the kill listener', () => {
    config.juice.hitstopDistortion = true;
    const d = new HitstopDistortion(makeContainer() as never);
    d.destroy();
    events.emit('kill', killEvent());
    const rings = (d as unknown as { rings: unknown[] }).rings;
    expect(rings).toHaveLength(0);
  });
});
