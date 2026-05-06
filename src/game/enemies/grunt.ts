import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawGrunt } from '../../render/ships';

export interface GruntInst {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  wobbleTimer: number;
  rotation: number;
  rotSpeed: number;
  charging: boolean;
}

const GRUNT_CAP = 64;

export class Grunts {
  readonly pool: Pool<GruntInst>;

  constructor(parent: Container) {
    this.pool = new Pool<GruntInst>(GRUNT_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawGrunt(g);
      g.visible = false;
      parent.addChild(g);
      return { g, x: 0, y: 0, vx: 0, vy: 0, heading: 0, wobbleTimer: 0, rotation: 0, rotSpeed: 0, charging: false };
    });
  }

  spawn(x: number, y: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    const cfg = config.enemies.grunt;
    e.x = x;
    e.y = y;
    e.heading = defaultRng.next() * Math.PI * 2;
    e.vx = Math.cos(e.heading) * cfg.idleSpeed;
    e.vy = Math.sin(e.heading) * cfg.idleSpeed;
    e.wobbleTimer = defaultRng.range(0.5, 1.5);
    e.rotation = defaultRng.next() * Math.PI * 2;
    e.rotSpeed = defaultRng.range(-0.8, 0.8);
    e.charging = false;
    e.g.x = x;
    e.g.y = y;
    e.g.rotation = e.rotation;
    e.g.visible = true;
  }

  step(dt: number, worldW: number, worldH: number, playerX: number, playerY: number): void {
    const cfg = config.enemies.grunt;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;
      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < cfg.detectionRadius * cfg.detectionRadius) {
        e.charging = true;
        const dist = Math.sqrt(distSq) || 1;
        const tx = (dx / dist) * cfg.chargeSpeed;
        const ty = (dy / dist) * cfg.chargeSpeed;
        e.vx += (tx - e.vx) * Math.min(1, 5 * dt);
        e.vy += (ty - e.vy) * Math.min(1, 5 * dt);
        // Face player while charging — signals threat
        e.g.rotation = Math.atan2(dy, dx);
      } else {
        e.charging = false;
        e.wobbleTimer -= dt;
        if (e.wobbleTimer <= 0) {
          e.wobbleTimer = defaultRng.range(0.5, 1.5);
          e.heading += defaultRng.unit() * 1.0;
        }
        const tx = Math.cos(e.heading) * cfg.idleSpeed;
        const ty = Math.sin(e.heading) * cfg.idleSpeed;
        e.vx += (tx - e.vx) * Math.min(1, 3 * dt);
        e.vy += (ty - e.vy) * Math.min(1, 3 * dt);
        e.rotation += e.rotSpeed * dt;
        e.g.rotation = e.rotation;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      const r = cfg.radius;
      if (e.x < r) { e.x = r; e.heading = Math.PI - e.heading; e.vx = Math.abs(e.vx); }
      else if (e.x > worldW - r) { e.x = worldW - r; e.heading = Math.PI - e.heading; e.vx = -Math.abs(e.vx); }
      if (e.y < r) { e.y = r; e.heading = -e.heading; e.vy = Math.abs(e.vy); }
      else if (e.y > worldH - r) { e.y = worldH - r; e.heading = -e.heading; e.vy = -Math.abs(e.vy); }

      e.g.x = e.x;
      e.g.y = e.y;
    }
  }

  releaseAt(i: number): void {
    const e = this.pool.items[i];
    if (!e) return;
    e.g.visible = false;
    this.pool.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
