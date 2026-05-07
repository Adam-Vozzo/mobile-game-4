import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    x: 0,
    y: 0,
    rotation: 0,
    visible: false,
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    Container: vi.fn().mockImplementation(() => ({ addChild: vi.fn() })),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

const makeContainer = () => ({ addChild: vi.fn() });

describe('game/enemies/splitter', () => {
  let Splitters: typeof import('../src/game/enemies/splitter').Splitters;
  let Shards: typeof import('../src/game/enemies/splitter').Shards;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;

  beforeEach(async () => {
    vi.resetModules();
    ({ Splitters, Shards } = await import('../src/game/enemies/splitter'));
    ({ config, DEFAULTS } = await import('../src/config'));
    Object.assign(config.enemies.splitter, DEFAULTS.enemies.splitter);
    Object.assign(config.enemies.shard, DEFAULTS.enemies.shard);
  });

  describe('Splitters', () => {
    it('starts empty', () => {
      const s = new Splitters(makeContainer() as never);
      expect(s.count).toBe(0);
    });

    it('spawn increments count and sets correct hp', () => {
      const s = new Splitters(makeContainer() as never);
      s.spawn(100, 200);
      expect(s.count).toBe(1);
      const inst = s.pool.items[0]!;
      expect(inst.hp).toBe(config.enemies.splitter.hp);
      expect(inst.x).toBe(100);
      expect(inst.y).toBe(200);
    });

    it('damage() decrements hp without killing when hp > 1', () => {
      const s = new Splitters(makeContainer() as never);
      s.spawn(100, 200);
      const dead = s.damage(0);
      expect(dead).toBe(false);
      expect(s.pool.items[0]!.hp).toBe(config.enemies.splitter.hp - 1);
    });

    it('damage() returns true when hp reaches 0', () => {
      const s = new Splitters(makeContainer() as never);
      s.spawn(100, 200);
      s.pool.items[0]!.hp = 1;
      const dead = s.damage(0);
      expect(dead).toBe(true);
    });

    it('releaseAt() hides graphics and decrements count', () => {
      const s = new Splitters(makeContainer() as never);
      s.spawn(100, 200);
      const inst = s.pool.items[0]!;
      s.releaseAt(0);
      expect(s.count).toBe(0);
      expect(inst.g.visible).toBe(false);
    });

    it('releaseAll() clears all instances', () => {
      const s = new Splitters(makeContainer() as never);
      s.spawn(100, 200);
      s.spawn(300, 400);
      s.releaseAll();
      expect(s.count).toBe(0);
    });

    it('step() moves splitter (nonzero velocity)', () => {
      const s = new Splitters(makeContainer() as never);
      s.spawn(400, 300);
      const inst = s.pool.items[0]!;
      inst.heading = 0;
      inst.vx = config.enemies.splitter.speed;
      inst.vy = 0;
      const xBefore = inst.x;
      s.step(0.1, 1600, 900);
      expect(inst.x).toBeGreaterThan(xBefore);
    });

    it('step() bounces off left edge', () => {
      const s = new Splitters(makeContainer() as never);
      const r = config.enemies.splitter.radius;
      s.spawn(r - 1, 300);
      const inst = s.pool.items[0]!;
      inst.vx = -50;
      s.step(0, 1600, 900);
      expect(inst.x).toBeGreaterThanOrEqual(r);
    });
  });

  describe('Shards', () => {
    it('starts empty', () => {
      const sh = new Shards(makeContainer() as never);
      expect(sh.count).toBe(0);
    });

    it('spawn increments count and sets velocity from angle', () => {
      const sh = new Shards(makeContainer() as never);
      sh.spawn(100, 200, 0); // angle = 0 => heading east
      expect(sh.count).toBe(1);
      const inst = sh.pool.items[0]!;
      expect(inst.vx).toBeCloseTo(config.enemies.shard.speed, 0);
      expect(inst.vy).toBeCloseTo(0, 1);
    });

    it('step() steers shard toward player', () => {
      const sh = new Shards(makeContainer() as never);
      sh.spawn(100, 300, Math.PI); // starts heading west
      const inst = sh.pool.items[0]!;
      // Player is to the east at (800, 300).
      sh.step(0.5, 1600, 900, 800, 300);
      // After steering toward player to the right, vx should become positive.
      expect(inst.vx).toBeGreaterThan(0);
    });

    it('releaseAt() hides graphics', () => {
      const sh = new Shards(makeContainer() as never);
      sh.spawn(100, 200, 0);
      const inst = sh.pool.items[0]!;
      sh.releaseAt(0);
      expect(sh.count).toBe(0);
      expect(inst.g.visible).toBe(false);
    });

    it('releaseAll() clears all shards', () => {
      const sh = new Shards(makeContainer() as never);
      sh.spawn(100, 200, 0);
      sh.spawn(300, 400, Math.PI);
      sh.releaseAll();
      expect(sh.count).toBe(0);
    });
  });
});
