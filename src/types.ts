export interface Vec2 {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** physical-to-CSS pixel ratio cap actually applied */
  dpr: number;
  /** half extents for convenience */
  halfW: number;
  halfH: number;
}

export type RGB = readonly [number, number, number];

export type EntityId = number;
