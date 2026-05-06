import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../engine/pool';
import { config } from '../config';
import { drawBullet } from '../render/ships';

interface Bullet {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const BULLET_CAP = 256;

export class Bullets {
  readonly pool: Pool<Bullet>;

  constructor(parent: Container) {
    this.pool = new Pool<Bullet>(BULLET_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawBullet(g);
      g.visible = false;
      parent.addChild(g);
      return { g, x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    });
  }

  spawn(x: number, y: number, dirX: number, dirY: number): void {
    const b = this.pool.acquire();
    if (!b) return;
    const speed = config.player.bulletSpeed;
    b.x = x;
    b.y = y;
    b.vx = dirX * speed;
    b.vy = dirY * speed;
    b.life = config.player.bulletLifeSeconds;
    b.g.x = x;
    b.g.y = y;
    b.g.rotation = Math.atan2(dirY, dirX);
    b.g.visible = true;
  }

  step(dt: number, worldW: number, worldH: number): void {
    const items = this.pool.items;
    for (let i = this.pool.size - 1; i >= 0; i--) {
      const b = items[i]!;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (
        b.life <= 0 ||
        b.x < -20 ||
        b.x > worldW + 20 ||
        b.y < -20 ||
        b.y > worldH + 20
      ) {
        b.g.visible = false;
        this.pool.releaseAt(i);
        continue;
      }
      b.g.x = b.x;
      b.g.y = b.y;
    }
  }

  /** Iterator-friendly access. Avoid allocating in caller. */
  forEachActive(fn: (b: { x: number; y: number; vx: number; vy: number }, i: number) => void): void {
    for (let i = 0; i < this.pool.size; i++) fn(this.pool.items[i]!, i);
  }

  releaseAt(i: number): void {
    const b = this.pool.items[i];
    if (!b) return;
    b.g.visible = false;
    this.pool.releaseAt(i);
  }

  releaseAll(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) this.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
