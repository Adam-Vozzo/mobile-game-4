import type { Vec2 } from '../types';

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const length = (x: number, y: number): number => Math.sqrt(x * x + y * y);

export const lengthSq = (x: number, y: number): number => x * x + y * y;

export const angleBetween = (x: number, y: number): number => Math.atan2(y, x);

export const wrapAngle = (a: number): number => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

/** Mutates `out` in place. */
export function setVec(out: Vec2, x: number, y: number): Vec2 {
  out.x = x;
  out.y = y;
  return out;
}

/** Mutates `out` in place. */
export function addVec(out: Vec2, ax: number, ay: number): Vec2 {
  out.x += ax;
  out.y += ay;
  return out;
}
