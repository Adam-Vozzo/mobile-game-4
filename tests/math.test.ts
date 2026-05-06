import { describe, it, expect } from 'vitest';
import { clamp, lerp, smoothstep, length, wrapAngle } from '../src/engine/math';

describe('engine/math', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('lerp', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('smoothstep monotonic in [0,1]', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.25) < smoothstep(0, 1, 0.75)).toBe(true);
  });

  it('length', () => {
    expect(length(3, 4)).toBeCloseTo(5);
  });

  it('wrapAngle keeps result in (-pi..pi]', () => {
    const w = wrapAngle(Math.PI * 3);
    expect(w).toBeLessThanOrEqual(Math.PI);
    expect(w).toBeGreaterThan(-Math.PI);
  });
});
