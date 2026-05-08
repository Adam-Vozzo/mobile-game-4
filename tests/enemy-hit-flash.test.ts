import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  const makeGraphics = () => ({
    blendMode: 0,
    visible: false,
    x: 0,
    y: 0,
    alpha: 1,
    clear: vi.fn().mockReturnThis(),
    beginFill: vi.fn().mockReturnThis(),
    drawCircle: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
  });
  return {
    Graphics: vi.fn().mockImplementation(makeGraphics),
    BLEND_MODES: { ADD: 1, NORMAL: 0 },
  };
});

import { config } from '../src/config';
import { EnemyHitFlash } from '../src/fx/enemy-hit-flash';

const makeContainer = () => ({ addChild: vi.fn() });

beforeEach(() => {
  config.juice.enemyHitFlash = false;
});

describe('EnemyHitFlash', () => {
  it('allocates 16 Graphics objects', () => {
    const parent = makeContainer();
    new EnemyHitFlash(parent as never);
    expect(parent.addChild).toHaveBeenCalledTimes(16);
  });

  it('all slots start invisible', () => {
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    const slots = (fx as never)['slots'] as Array<{ g: { visible: boolean } }>;
    expect(slots.every(s => !s.g.visible)).toBe(true);
  });

  it('toggle off: flash() does not show any slot', () => {
    config.juice.enemyHitFlash = false;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(100, 200, 14);
    const slots = (fx as never)['slots'] as Array<{ g: { visible: boolean } }>;
    expect(slots.every(s => !s.g.visible)).toBe(true);
  });

  it('toggle on: flash() makes a slot visible', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(100, 200, 14);
    const slots = (fx as never)['slots'] as Array<{ g: { visible: boolean } }>;
    expect(slots.some(s => s.g.visible)).toBe(true);
  });

  it('flash positions slot at (x, y)', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(300, 450, 14);
    const slots = (fx as never)['slots'] as Array<{ g: { x: number; y: number; visible: boolean } }>;
    const active = slots.find(s => s.g.visible);
    expect(active?.g.x).toBe(300);
    expect(active?.g.y).toBe(450);
  });

  it('flash sets alpha to 1.0 initially', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(100, 100, 10);
    const slots = (fx as never)['slots'] as Array<{ g: { alpha: number; visible: boolean } }>;
    const active = slots.find(s => s.g.visible);
    expect(active?.g.alpha).toBe(1.0);
  });

  it('step decays alpha and hides slot after duration', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(0, 0, 10);
    // Step past the full duration (0.1 s).
    fx.step(0.15);
    const slots = (fx as never)['slots'] as Array<{ g: { visible: boolean } }>;
    expect(slots.every(s => !s.g.visible)).toBe(true);
  });

  it('step reduces alpha proportionally mid-flight', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(0, 0, 10);
    fx.step(0.05); // half the 0.1 s duration
    const slots = (fx as never)['slots'] as Array<{ g: { alpha: number; visible: boolean } }>;
    const active = slots.find(s => s.g.visible);
    expect(active).toBeDefined();
    // ttl was 0.1, now 0.05; alpha = 0.05/0.1 = 0.5
    expect(active!.g.alpha).toBeCloseTo(0.5, 2);
  });

  it('clear() hides all active slots', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(10, 10, 14);
    fx.flash(20, 20, 14);
    fx.clear();
    const slots = (fx as never)['slots'] as Array<{ g: { visible: boolean } }>;
    expect(slots.every(s => !s.g.visible)).toBe(true);
  });

  it('ring-buffer wraps: 17th flash reuses first slot', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    // Fill all 16 slots.
    for (let i = 0; i < 16; i++) fx.flash(i * 10, 0, 10);
    // 17th flash reuses slot 0 — head wraps back to 0.
    const slots = (fx as never)['slots'] as Array<{ g: { x: number; visible: boolean } }>;
    const firstX = slots[0]!.g.x;
    fx.flash(999, 0, 10);
    expect(slots[0]!.g.x).toBe(999);
    expect(firstX).not.toBe(999);
  });

  it('drawCircle uses radius × FLASH_RADIUS_SCALE', () => {
    config.juice.enemyHitFlash = true;
    const parent = makeContainer();
    const fx = new EnemyHitFlash(parent as never);
    fx.flash(0, 0, 14);
    const slots = (fx as never)['slots'] as Array<{ g: { drawCircle: ReturnType<typeof vi.fn> } }>;
    const active = slots.find(s => s.g.drawCircle.mock.calls.length > 0);
    expect(active).toBeDefined();
    const [cx, cy, r] = active!.g.drawCircle.mock.calls[0] as [number, number, number];
    expect(cx).toBe(0);
    expect(cy).toBe(0);
    expect(r).toBeCloseTo(14 * 1.45, 3);
  });
});
