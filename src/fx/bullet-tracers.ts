import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { config } from '../config';
import type { Bullets } from '../game/bullets';

// Bullet is drawn along +x in local space; rear edge is at -BULLET_HALF_LEN.
const BULLET_HALF_LEN = 7;
const STREAK_LEN = 26;

function drawStreak(g: Graphics): void {
  const rear = -BULLET_HALF_LEN;
  // Outer faint halo — full length
  g.lineStyle({ width: 5, color: 0x00fff7, alpha: 0.15 });
  g.moveTo(rear, 0);
  g.lineTo(rear - STREAK_LEN, 0);
  // Mid glow — 60% length
  g.lineStyle({ width: 2.5, color: 0x00fff7, alpha: 0.45 });
  g.moveTo(rear, 0);
  g.lineTo(rear - STREAK_LEN * 0.6, 0);
  // Bright core — 28% length (hottest near the bullet)
  g.lineStyle({ width: 1.2, color: 0xffffff, alpha: 0.9 });
  g.moveTo(rear, 0);
  g.lineTo(rear - STREAK_LEN * 0.28, 0);
}

export class BulletTracers {
  private readonly gfx: Graphics[];

  constructor(parent: Container, cap: number) {
    this.gfx = [];
    for (let i = 0; i < cap; i++) {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawStreak(g);
      g.visible = false;
      parent.addChild(g);
      this.gfx.push(g);
    }
  }

  step(bullets: Bullets): void {
    const on = config.juice.bulletTracers;
    const n = bullets.count;
    const items = bullets.pool.items;

    for (let i = 0; i < this.gfx.length; i++) {
      const g = this.gfx[i]!;
      if (!on || i >= n) {
        g.visible = false;
        continue;
      }
      const b = items[i]!;
      g.x = b.x;
      g.y = b.y;
      g.rotation = b.g.rotation;
      g.visible = true;
    }
  }

  clear(): void {
    for (const g of this.gfx) g.visible = false;
  }
}
