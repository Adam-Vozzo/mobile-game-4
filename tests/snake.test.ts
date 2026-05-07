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

describe('game/enemies/snake', () => {
  let Snakes: typeof import('../src/game/enemies/snake').Snakes;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;

  beforeEach(async () => {
    vi.resetModules();
    ({ Snakes } = await import('../src/game/enemies/snake'));
    ({ config, DEFAULTS } = await import('../src/config'));
    Object.assign(config.enemies.snake, DEFAULTS.enemies.snake);
  });

  it('starts empty', () => {
    const s = new Snakes(makeContainer() as never);
    expect(s.count).toBe(0);
  });

  it('spawn increments count and sets correct hp', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    expect(s.count).toBe(1);
    const inst = s.pool.items[0]!;
    expect(inst.hp).toBe(config.enemies.snake.hp);
    expect(inst.x).toBe(200);
    expect(inst.y).toBe(300);
  });

  it('spawn makes head visible', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    const inst = s.pool.items[0]!;
    expect(inst.headG.visible).toBe(true);
  });

  it('spawn makes all body segments visible', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    const inst = s.pool.items[0]!;
    for (const sg of inst.segGs) {
      expect(sg.visible).toBe(true);
    }
  });

  it('spawn seeds history so segments start at spawn position', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    const inst = s.pool.items[0]!;
    // All history entries should be at spawn position.
    expect(inst.histX[0]).toBe(200);
    expect(inst.histY[0]).toBe(300);
    expect(inst.histX[255]).toBe(200);
    expect(inst.histY[255]).toBe(300);
  });

  it('damage() decrements hp without killing when hp > 1', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    const dead = s.damage(0);
    expect(dead).toBe(false);
    expect(s.pool.items[0]!.hp).toBe(config.enemies.snake.hp - 1);
  });

  it('damage() returns true when hp reaches 0', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    s.pool.items[0]!.hp = 1;
    const dead = s.damage(0);
    expect(dead).toBe(true);
  });

  it('releaseAt() hides head and segments and decrements count', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    const inst = s.pool.items[0]!;
    s.releaseAt(0);
    expect(s.count).toBe(0);
    expect(inst.headG.visible).toBe(false);
    for (const sg of inst.segGs) {
      expect(sg.visible).toBe(false);
    }
  });

  it('releaseAll() clears all instances', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(100, 200);
    s.spawn(300, 400);
    s.releaseAll();
    expect(s.count).toBe(0);
  });

  it('cannot spawn more than maxConcurrent snakes', () => {
    const s = new Snakes(makeContainer() as never);
    const max = config.enemies.snake.maxConcurrent;
    for (let i = 0; i < max + 2; i++) s.spawn(100 + i * 20, 200);
    expect(s.count).toBe(max);
  });

  it('step() moves the head (nonzero velocity)', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(400, 300);
    const inst = s.pool.items[0]!;
    inst.heading = 0;
    inst.vx = config.enemies.snake.speed;
    inst.vy = 0;
    const xBefore = inst.x;
    s.step(0.1, 1600, 900, 800, 450);
    expect(inst.x).toBeGreaterThan(xBefore);
  });

  it('step() bounces off left edge', () => {
    const s = new Snakes(makeContainer() as never);
    const r = config.enemies.snake.radius;
    s.spawn(r - 1, 300);
    const inst = s.pool.items[0]!;
    inst.vx = -50;
    inst.vy = 0;
    s.step(0, 1600, 900, 800, 300);
    expect(inst.x).toBeGreaterThanOrEqual(r);
  });

  it('step() bounces off top edge', () => {
    const s = new Snakes(makeContainer() as never);
    const r = config.enemies.snake.radius;
    s.spawn(400, r - 1);
    const inst = s.pool.items[0]!;
    inst.vx = 0;
    inst.vy = -50;
    s.step(0, 1600, 900, 800, 300);
    expect(inst.y).toBeGreaterThanOrEqual(r);
  });

  it('step() updates history ring buffer after sufficient travel', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(400, 300);
    const inst = s.pool.items[0]!;
    const ptrBefore = inst.histPtr;
    inst.heading = 0;
    inst.vx = config.enemies.snake.speed;
    inst.vy = 0;
    // Travel > STEP_DIST (4px) to trigger a history push.
    s.step(0.5, 1600, 900, 800, 300);
    expect(inst.histPtr).toBeGreaterThan(ptrBefore);
  });

  it('segGs array length matches segmentCount', () => {
    const s = new Snakes(makeContainer() as never);
    s.spawn(200, 300);
    expect(s.pool.items[0]!.segGs.length).toBe(config.enemies.snake.segmentCount);
  });
});
