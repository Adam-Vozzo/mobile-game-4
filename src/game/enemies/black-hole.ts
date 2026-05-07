import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawBlackHoleOuter, drawBlackHoleInner } from '../../render/ships';

export interface BlackHoleInst {
  outer: Graphics;
  inner: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  wobbleTimer: number;
  hp: number;
  pulseTime: number;
}

const BLACK_HOLE_CAP = 8;

export class BlackHoles {
  readonly pool: Pool<BlackHoleInst>;

  constructor(parent: Container) {
    this.pool = new Pool<BlackHoleInst>(BLACK_HOLE_CAP, () => {
      const outer = new Graphics();
      outer.blendMode = BLEND_MODES.ADD;
      drawBlackHoleOuter(outer);
      outer.visible = false;
      parent.addChild(outer);

      const inner = new Graphics();
      inner.blendMode = BLEND_MODES.ADD;
      drawBlackHoleInner(inner);
      inner.visible = false;
      parent.addChild(inner);

      return {
        outer,
        inner,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        wobbleTimer: 0,
        hp: 0,
        pulseTime: 0,
      };
    });
  }

  spawn(x: number, y: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    const angle = defaultRng.next() * Math.PI * 2;
    e.x = x;
    e.y = y;
    e.vx = Math.cos(angle) * config.enemies.blackHole.speed;
    e.vy = Math.sin(angle) * config.enemies.blackHole.speed;
    e.heading = angle;
    e.wobbleTimer = defaultRng.range(1.5, 3.0);
    e.hp = config.enemies.blackHole.hp;
    e.pulseTime = defaultRng.next() * Math.PI * 2;
    e.outer.x = x;
    e.outer.y = y;
    e.outer.rotation = defaultRng.next() * Math.PI * 2;
    e.outer.visible = true;
    e.inner.x = x;
    e.inner.y = y;
    e.inner.rotation = defaultRng.next() * Math.PI * 2;
    e.inner.visible = true;
  }

  step(dt: number, worldW: number, worldH: number): void {
    const cfg = config.enemies.blackHole;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;

      // Slow drift with occasional heading wobbles.
      e.wobbleTimer -= dt;
      if (e.wobbleTimer <= 0) {
        e.wobbleTimer = defaultRng.range(1.5, 3.0);
        e.heading += defaultRng.unit() * 1.4;
      }
      const tx = Math.cos(e.heading) * cfg.speed;
      const ty = Math.sin(e.heading) * cfg.speed;
      e.vx += (tx - e.vx) * Math.min(1, 1.2 * dt);
      e.vy += (ty - e.vy) * Math.min(1, 1.2 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Soft bounce off edges.
      const r = cfg.radius;
      if (e.x < r) { e.x = r; e.heading = Math.PI - e.heading; }
      else if (e.x > worldW - r) { e.x = worldW - r; e.heading = Math.PI - e.heading; }
      if (e.y < r) { e.y = r; e.heading = -e.heading; }
      else if (e.y > worldH - r) { e.y = worldH - r; e.heading = -e.heading; }

      // Animate: outer rotates slowly CW, inner rotates faster CCW.
      e.pulseTime += dt;
      const pulse = 0.92 + 0.08 * Math.sin(e.pulseTime * 2.8);
      e.outer.rotation += 0.38 * dt;
      e.inner.rotation -= 0.82 * dt;
      e.outer.scale.set(pulse);
      e.inner.scale.set(pulse);
      e.outer.x = e.x;
      e.outer.y = e.y;
      e.inner.x = e.x;
      e.inner.y = e.y;
    }
  }

  /** Register a bullet hit. Returns true if the black hole is now dead. */
  damage(i: number): boolean {
    const e = this.pool.items[i];
    if (!e) return false;
    e.hp--;
    return e.hp <= 0;
  }

  releaseAt(i: number): void {
    const e = this.pool.items[i];
    if (!e) return;
    e.outer.visible = false;
    e.inner.visible = false;
    this.pool.releaseAt(i);
  }

  releaseAll(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) this.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
