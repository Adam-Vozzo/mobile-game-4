import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    visible: false,
    x: 0,
    y: 0,
    rotation: 0,
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

const makeContainer = () => ({ addChild: vi.fn() });

// Build a minimal Bullets-shaped stub: pool.items, pool.capacity, count
const makeBullets = (
  active: Array<{ x: number; y: number; rotation: number }> = [],
  cap = 8,
) => {
  const items = Array.from({ length: cap }, (_, i) => {
    const b = active[i];
    return {
      x: b?.x ?? 0,
      y: b?.y ?? 0,
      g: { rotation: b?.rotation ?? 0 },
    };
  });
  return {
    pool: { items, capacity: cap },
    count: active.length,
  };
};

describe('fx/bullet-tracers', () => {
  let BulletTracers: typeof import('../src/fx/bullet-tracers').BulletTracers;
  let config: typeof import('../src/config').config;
  let DEFAULTS: typeof import('../src/config').DEFAULTS;

  beforeEach(async () => {
    vi.resetModules();
    ({ BulletTracers } = await import('../src/fx/bullet-tracers'));
    ({ config, DEFAULTS } = await import('../src/config'));
    Object.assign(config.juice, DEFAULTS.juice);
  });

  it('allocates `cap` Graphics objects added to the layer', () => {
    const layer = makeContainer();
    new BulletTracers(layer as never, 4);
    expect(layer.addChild).toHaveBeenCalledTimes(4);
  });

  it('all tracers start invisible', () => {
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    for (const g of gfx) expect(g.visible).toBe(false);
  });

  it('toggle off keeps all tracers hidden even with active bullets', () => {
    config.juice.bulletTracers = false;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const bullets = makeBullets([{ x: 100, y: 50, rotation: 0.5 }], 4);
    tracers.step(bullets as never);
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    for (const g of gfx) expect(g.visible).toBe(false);
  });

  it('toggle on shows exactly N tracers for N active bullets', () => {
    config.juice.bulletTracers = true;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const bullets = makeBullets(
      [
        { x: 10, y: 20, rotation: 0 },
        { x: 30, y: 40, rotation: 1 },
      ],
      4,
    );
    tracers.step(bullets as never);
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    expect(gfx[0]!.visible).toBe(true);
    expect(gfx[1]!.visible).toBe(true);
    expect(gfx[2]!.visible).toBe(false);
    expect(gfx[3]!.visible).toBe(false);
  });

  it('tracer position mirrors the bullet position', () => {
    config.juice.bulletTracers = true;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const bullets = makeBullets([{ x: 123, y: 456, rotation: 0.9 }], 4);
    tracers.step(bullets as never);
    const gfx = (tracers as unknown as { gfx: Array<{ x: number; y: number }> }).gfx;
    expect(gfx[0]!.x).toBe(123);
    expect(gfx[0]!.y).toBe(456);
  });

  it('tracer rotation mirrors the bullet Graphics rotation', () => {
    config.juice.bulletTracers = true;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const bullets = makeBullets([{ x: 0, y: 0, rotation: 1.23 }], 4);
    tracers.step(bullets as never);
    const gfx = (tracers as unknown as { gfx: Array<{ rotation: number }> }).gfx;
    expect(gfx[0]!.rotation).toBe(1.23);
  });

  it('zero active bullets hides all tracers', () => {
    config.juice.bulletTracers = true;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    tracers.step(makeBullets([], 4) as never);
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    for (const g of gfx) expect(g.visible).toBe(false);
  });

  it('going from toggle on → off hides previously visible tracers', () => {
    config.juice.bulletTracers = true;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const bullets = makeBullets([{ x: 0, y: 0, rotation: 0 }], 4);
    tracers.step(bullets as never);
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    expect(gfx[0]!.visible).toBe(true);

    config.juice.bulletTracers = false;
    tracers.step(bullets as never);
    for (const g of gfx) expect(g.visible).toBe(false);
  });

  it('clear() hides all tracers regardless of toggle', () => {
    config.juice.bulletTracers = true;
    const tracers = new BulletTracers(makeContainer() as never, 4);
    const bullets = makeBullets(
      [{ x: 0, y: 0, rotation: 0 }, { x: 1, y: 1, rotation: 1 }],
      4,
    );
    tracers.step(bullets as never);
    tracers.clear();
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    for (const g of gfx) expect(g.visible).toBe(false);
  });

  it('tracers for all cap bullets can be shown simultaneously', () => {
    config.juice.bulletTracers = true;
    const cap = 6;
    const tracers = new BulletTracers(makeContainer() as never, cap);
    const active = Array.from({ length: cap }, (_, i) => ({
      x: i * 10,
      y: i * 5,
      rotation: i * 0.1,
    }));
    tracers.step(makeBullets(active, cap) as never);
    const gfx = (tracers as unknown as { gfx: Array<{ visible: boolean }> }).gfx;
    for (const g of gfx) expect(g.visible).toBe(true);
  });
});
