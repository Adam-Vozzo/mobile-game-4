import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal PixiJS stub so BlackHoles can be imported in node.
vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    x: 0,
    y: 0,
    rotation: 0,
    visible: false,
    scale: { set: vi.fn() },
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    drawCircle: vi.fn().mockReturnThis(),
    arc: vi.fn().mockReturnThis(),
    beginFill: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    Container: vi.fn().mockImplementation(() => ({ addChild: vi.fn() })),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

const makeContainer = () => ({ addChild: vi.fn() });

describe('game/enemies/black-hole', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let BlackHoles: typeof import('../src/game/enemies/black-hole').BlackHoles;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;

  beforeEach(async () => {
    vi.resetModules();
    ({ BlackHoles } = await import('../src/game/enemies/black-hole'));
    ({ config, DEFAULTS } = await import('../src/config'));
    Object.assign(config.enemies.blackHole, DEFAULTS.enemies.blackHole);
    config.flow.blackHoleEnemy = false;
  });

  it('starts empty', () => {
    const bh = new BlackHoles(makeContainer() as never);
    expect(bh.count).toBe(0);
  });

  it('spawn increments count and sets correct hp', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(100, 200);
    expect(bh.count).toBe(1);
    const inst = bh.pool.items[0]!;
    expect(inst.hp).toBe(config.enemies.blackHole.hp);
    expect(inst.x).toBe(100);
    expect(inst.y).toBe(200);
  });

  it('damage() decrements hp without killing', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(100, 200);
    const dead = bh.damage(0);
    expect(dead).toBe(false);
    expect(bh.pool.items[0]!.hp).toBe(config.enemies.blackHole.hp - 1);
  });

  it('damage() returns true when hp reaches 0', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(100, 200);
    config.enemies.blackHole.hp = 1;
    bh.pool.items[0]!.hp = 1;
    const dead = bh.damage(0);
    expect(dead).toBe(true);
  });

  it('releaseAt() hides both graphics and decrements count', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(100, 200);
    const inst = bh.pool.items[0]!;
    bh.releaseAt(0);
    expect(bh.count).toBe(0);
    expect(inst.outer.visible).toBe(false);
    expect(inst.inner.visible).toBe(false);
  });

  it('releaseAll() clears all instances', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(100, 200);
    bh.spawn(300, 400);
    bh.releaseAll();
    expect(bh.count).toBe(0);
  });

  it('step() updates position (slow drift)', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(400, 300);
    const inst = bh.pool.items[0]!;
    // Force a specific heading to make position change predictable.
    inst.heading = 0; // east
    inst.vx = config.enemies.blackHole.speed;
    inst.vy = 0;
    const xBefore = inst.x;
    bh.step(0.1, 1600, 900);
    // Should have drifted eastward.
    expect(inst.x).toBeGreaterThan(xBefore);
  });

  it('step() bounces off world edges', () => {
    const bh = new BlackHoles(makeContainer() as never);
    const r = config.enemies.blackHole.radius;
    bh.spawn(r - 1, 300); // just outside left edge
    const inst = bh.pool.items[0]!;
    bh.step(0, 1600, 900); // zero-dt step just triggers clamp
    expect(inst.x).toBeGreaterThanOrEqual(r);
  });

  it('step() animates rotation of both graphics', () => {
    const bh = new BlackHoles(makeContainer() as never);
    bh.spawn(400, 300);
    const inst = bh.pool.items[0]!;
    const outerRot0 = inst.outer.rotation;
    const innerRot0 = inst.inner.rotation;
    bh.step(0.5, 1600, 900);
    // Outer should have rotated CW, inner CCW.
    expect(inst.outer.rotation).toBeGreaterThan(outerRot0);
    expect(inst.inner.rotation).toBeLessThan(innerRot0);
  });
});
