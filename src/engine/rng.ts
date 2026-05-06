/**
 * Seedable PRNG. We don't need crypto strength; we need determinism for tests
 * and tuning, and zero allocation in the hot loop.
 *
 * mulberry32 — small, fast, decent statistical quality.
 */
export class RNG {
  private state: number;

  constructor(seed = 0xc0ffee) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  int(loIncl: number, hiIncl: number): number {
    return Math.floor(this.range(loIncl, hiIncl + 1));
  }

  unit(): number {
    return this.next() * 2 - 1;
  }

  /** Mutates `out` to a random unit vector. */
  unitVector(out: { x: number; y: number }): void {
    const a = this.next() * Math.PI * 2;
    out.x = Math.cos(a);
    out.y = Math.sin(a);
  }
}

export const defaultRng = new RNG(0xc0ffee);
