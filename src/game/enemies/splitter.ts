import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawSplitter, drawShard } from '../../render/ships';

export interface SplitterInst {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  wobbleTimer: number;
  rotation: number;
  rotSpeed: number;
  hp: number;
}

export interface ShardInst {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

const SPLITTER_CAP = 48;
const SHARD_CAP = 96;

export class Splitters {
  readonly pool: Pool<SplitterInst>;

  constructor(parent: Container) {
    this.pool = new Pool<SplitterInst>(SPLITTER_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawSplitter(g);
      g.visible = false;
      parent.addChild(g);
      return { g, x: 0, y: 0, vx: 0, vy: 0, heading: 0, wobbleTimer: 0, rotation: 0, rotSpeed: 0, hp: 0 };
    });
  }

  spawn(x: number, y: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    e.x = x;
    e.y = y;
    e.heading = defaultRng.next() * Math.PI * 2;
    e.vx = Math.cos(e.heading) * config.enemies.splitter.speed;
    e.vy = Math.sin(e.heading) * config.enemies.splitter.speed;
    e.wobbleTimer = defaultRng.range(0.6, 1.8);
    e.rotation = defaultRng.next() * Math.PI * 2;
    e.rotSpeed = defaultRng.range(-0.5, 0.5);
    e.hp = config.enemies.splitter.hp;
    e.g.x = x;
    e.g.y = y;
    e.g.rotation = e.rotation;
    e.g.visible = true;
  }

  step(dt: number, worldW: number, worldH: number): void {
    const cfg = config.enemies.splitter;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;
      e.wobbleTimer -= dt;
      if (e.wobbleTimer <= 0) {
        e.wobbleTimer = defaultRng.range(0.6, 1.8);
        e.heading += defaultRng.unit() * 0.8;
      }
      const tx = Math.cos(e.heading) * cfg.speed;
      const ty = Math.sin(e.heading) * cfg.speed;
      e.vx += (tx - e.vx) * Math.min(1, 2.5 * dt);
      e.vy += (ty - e.vy) * Math.min(1, 2.5 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      const r = cfg.radius;
      if (e.x < r) { e.x = r; e.heading = Math.PI - e.heading; e.vx = Math.abs(e.vx); }
      else if (e.x > worldW - r) { e.x = worldW - r; e.heading = Math.PI - e.heading; e.vx = -Math.abs(e.vx); }
      if (e.y < r) { e.y = r; e.heading = -e.heading; e.vy = Math.abs(e.vy); }
      else if (e.y > worldH - r) { e.y = worldH - r; e.heading = -e.heading; e.vy = -Math.abs(e.vy); }

      e.rotation += e.rotSpeed * dt;
      e.g.rotation = e.rotation;
      e.g.x = e.x;
      e.g.y = e.y;
    }
  }

  /** Returns true if the splitter is now dead. */
  damage(i: number): boolean {
    const e = this.pool.items[i];
    if (!e) return false;
    e.hp--;
    return e.hp <= 0;
  }

  releaseAt(i: number): void {
    const e = this.pool.items[i];
    if (!e) return;
    e.g.visible = false;
    this.pool.releaseAt(i);
  }

  releaseAll(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) this.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}

export class Shards {
  readonly pool: Pool<ShardInst>;

  constructor(parent: Container) {
    this.pool = new Pool<ShardInst>(SHARD_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawShard(g);
      g.visible = false;
      parent.addChild(g);
      return { g, x: 0, y: 0, vx: 0, vy: 0, rotation: 0 };
    });
  }

  /** Spawn a shard heading in `angle` radians from (x, y). */
  spawn(x: number, y: number, angle: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    const spd = config.enemies.shard.speed;
    e.x = x;
    e.y = y;
    e.vx = Math.cos(angle) * spd;
    e.vy = Math.sin(angle) * spd;
    e.rotation = angle;
    e.g.x = x;
    e.g.y = y;
    e.g.rotation = angle;
    e.g.visible = true;
  }

  step(dt: number, worldW: number, worldH: number, playerX: number, playerY: number): void {
    const cfg = config.enemies.shard;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;
      // Constantly steer toward player (aggressive homing).
      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetAngle = Math.atan2(dy, dx);
      const tx = (dx / dist) * cfg.speed;
      const ty = (dy / dist) * cfg.speed;
      e.vx += (tx - e.vx) * Math.min(1, 4 * dt);
      e.vy += (ty - e.vy) * Math.min(1, 4 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rotation = targetAngle;

      const r = cfg.radius;
      if (e.x < r) { e.x = r; e.vx = Math.abs(e.vx); }
      else if (e.x > worldW - r) { e.x = worldW - r; e.vx = -Math.abs(e.vx); }
      if (e.y < r) { e.y = r; e.vy = Math.abs(e.vy); }
      else if (e.y > worldH - r) { e.y = worldH - r; e.vy = -Math.abs(e.vy); }

      e.g.x = e.x;
      e.g.y = e.y;
      e.g.rotation = e.rotation;
    }
  }

  releaseAt(i: number): void {
    const e = this.pool.items[i];
    if (!e) return;
    e.g.visible = false;
    this.pool.releaseAt(i);
  }

  releaseAll(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) this.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
