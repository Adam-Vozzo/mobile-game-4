import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';

describe('engine/rng', () => {
  it('is deterministic given the same seed', () => {
    const a = new RNG(42);
    const b = new RNG(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('ranges within [0,1)', () => {
    const r = new RNG(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range respects bounds', () => {
    const r = new RNG(7);
    for (let i = 0; i < 200; i++) {
      const v = r.range(-3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
  });

  it('unitVector returns approx-unit length', () => {
    const r = new RNG(7);
    const v = { x: 0, y: 0 };
    for (let i = 0; i < 50; i++) {
      r.unitVector(v);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 6);
    }
  });
});
