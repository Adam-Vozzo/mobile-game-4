import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawWeaver } from '../../render/ships';

export interface WeaverInst {
  g: Graphics;
  x: number;
  y: number;
  wavePhase: number;
  waveDir: number;
}

const WEAVER_CAP = 64;

export class Weavers {
  readonly pool: Pool<WeaverInst>;

  constructor(parent: Container) {
    this.pool = new Pool<WeaverInst>(WEAVER_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawWeaver(g);
      g.visible = false;
      parent.addChild(g);
      return { g, x: 0, y: 0, wavePhase: 0, waveDir: 1 };
    });
  }

  spawn(x: number, y: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    e.x = x;
    e.y = y;
    e.wavePhase = defaultRng.next() * Math.PI * 2;
    e.waveDir = defaultRng.next() > 0.5 ? 1 : -1;
    e.g.x = x;
    e.g.y = y;
    e.g.rotation = 0;
    e.g.visible = true;
  }

  step(dt: number, worldW: number, worldH: number, playerX: number, playerY: number): void {
    const cfg = config.enemies.weaver;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;
      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Unit vector toward player
      const dirx = dx / dist;
      const diry = dy / dist;
      // Perpendicular (90° CCW * waveDir for consistent handedness)
      const perpx = -diry * e.waveDir;
      const perpy = dirx * e.waveDir;

      e.wavePhase += cfg.waveFreq * dt;
      const wave = Math.sin(e.wavePhase) * cfg.waveAmp;

      const vx = (dirx + perpx * wave) * cfg.speed;
      const vy = (diry + perpy * wave) * cfg.speed;

      e.x += vx * dt;
      e.y += vy * dt;

      const r = cfg.radius;
      e.x = Math.max(r, Math.min(worldW - r, e.x));
      e.y = Math.max(r, Math.min(worldH - r, e.y));

      e.g.x = e.x;
      e.g.y = e.y;
      e.g.rotation = Math.atan2(vy, vx);
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
