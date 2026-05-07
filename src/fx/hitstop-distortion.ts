import { Graphics, BLEND_MODES } from 'pixi.js';
import type { Container } from 'pixi.js';
import { events } from '../engine/events';
import type { KillEvent } from '../engine/events';
import { config } from '../config';

const MAX_RADIUS = 110;
const RING_THICKNESS_START = 9;
const DURATION = 0.38;
const MAX_RINGS = 8;

interface Ring {
  x: number;
  y: number;
  t: number;
  color: number;
}

/**
 * Expanding radial shockwave ring at each kill position, synced to hitstop.
 * Each kill spawns a ring that grows outward and fades over ~380 ms.
 * Additive blend creates a brief glow burst without obscuring gameplay.
 */
export class HitstopDistortion {
  private readonly g: Graphics;
  private readonly rings: Ring[] = [];
  private readonly unsubKill: () => void;

  constructor(layer: Container) {
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    layer.addChild(this.g);
    this.unsubKill = events.on('kill', (e) => this._onKill(e));
  }

  destroy(): void {
    this.unsubKill();
    this.g.destroy();
  }

  step(dt: number): void {
    if (!config.juice.hitstopDistortion) {
      if (this.rings.length > 0) {
        this.rings.length = 0;
        this.g.clear();
      }
      return;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i]!.t += dt;
      if (this.rings[i]!.t >= DURATION) {
        this.rings.splice(i, 1);
      }
    }

    this.g.clear();
    for (const ring of this.rings) {
      const p = ring.t / DURATION;
      const radius = p * MAX_RADIUS;
      const alpha = (1 - p) * (1 - p); // quadratic falloff
      const thickness = Math.max(1, RING_THICKNESS_START * (1 - p * 0.85));
      this.g.lineStyle(thickness, ring.color, alpha);
      this.g.drawCircle(ring.x, ring.y, radius);
    }
    this.g.lineStyle(0);
  }

  clear(): void {
    this.rings.length = 0;
    this.g.clear();
  }

  private _onKill(e: KillEvent): void {
    if (!config.juice.hitstopDistortion) return;
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    const r = Math.round(e.r * 255);
    const g = Math.round(e.g * 255);
    const b = Math.round(e.b * 255);
    const color = (r << 16) | (g << 8) | b;
    this.rings.push({ x: e.x, y: e.y, t: 0, color });
  }
}
