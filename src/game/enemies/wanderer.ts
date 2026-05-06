import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawWanderer } from '../../render/ships';

export interface WandererInst {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** noise-curved heading; updated slowly */
  heading: number;
  /** seconds until heading wobble */
  wobbleTimer: number;
  rotation: number;
  rotSpeed: number;
}

const WANDERER_CAP = 128;

export class Wanderers {
  readonly pool: Pool<WandererInst>;

  constructor(parent: Container) {
    this.pool = new Pool<WandererInst>(WANDERER_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawWanderer(g);
      g.visible = false;
      parent.addChild(g);
      return {
        g,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        wobbleTimer: 0,
        rotation: 0,
        rotSpeed: 0,
      };
    });
  }

  spawn(x: number, y: number): void {
    const w = this.pool.acquire();
    if (!w) return;
    const cfg = config.enemies.wanderer;
    w.x = x;
    w.y = y;
    w.heading = defaultRng.next() * Math.PI * 2;
    w.vx = Math.cos(w.heading) * cfg.speed;
    w.vy = Math.sin(w.heading) * cfg.speed;
    w.wobbleTimer = defaultRng.range(0.4, 1.2);
    w.rotation = defaultRng.next() * Math.PI * 2;
    w.rotSpeed = defaultRng.range(-1.6, 1.6);
    w.g.x = x;
    w.g.y = y;
    w.g.rotation = w.rotation;
    w.g.visible = true;
  }

  step(dt: number, worldW: number, worldH: number): void {
    const cfg = config.enemies.wanderer;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const w = items[i]!;
      // Heading wobble — random walk on the heading angle.
      w.wobbleTimer -= dt;
      if (w.wobbleTimer <= 0) {
        w.wobbleTimer = defaultRng.range(0.4, 1.2);
        w.heading += defaultRng.unit() * cfg.turnRate;
      }
      // Smooth velocity toward heading.
      const tx = Math.cos(w.heading) * cfg.speed;
      const ty = Math.sin(w.heading) * cfg.speed;
      w.vx += (tx - w.vx) * Math.min(1, 4 * dt);
      w.vy += (ty - w.vy) * Math.min(1, 4 * dt);
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      // Bounce off the world edge to keep them on-screen.
      const r = cfg.radius;
      if (w.x < r) {
        w.x = r;
        w.heading = Math.PI - w.heading;
      } else if (w.x > worldW - r) {
        w.x = worldW - r;
        w.heading = Math.PI - w.heading;
      }
      if (w.y < r) {
        w.y = r;
        w.heading = -w.heading;
      } else if (w.y > worldH - r) {
        w.y = worldH - r;
        w.heading = -w.heading;
      }

      w.rotation += w.rotSpeed * dt;
      w.g.x = w.x;
      w.g.y = w.y;
      w.g.rotation = w.rotation;
    }
  }

  releaseAt(i: number): void {
    const w = this.pool.items[i];
    if (!w) return;
    w.g.visible = false;
    this.pool.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
