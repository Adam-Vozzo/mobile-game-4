import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { config } from '../config';

const FLASH_CAP = 16;
const FLASH_DURATION = 0.1;
const FLASH_RADIUS_SCALE = 1.45;

interface FlashSlot {
  g: Graphics;
  ttl: number;
}

export class EnemyHitFlash {
  private readonly slots: FlashSlot[];
  private head = 0;

  constructor(parent: Container) {
    this.slots = Array.from({ length: FLASH_CAP }, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      g.visible = false;
      parent.addChild(g);
      return { g, ttl: 0 };
    });
  }

  flash(x: number, y: number, radius: number): void {
    if (!config.juice.enemyHitFlash) return;
    const slot = this.slots[this.head]!;
    this.head = (this.head + 1) % FLASH_CAP;
    slot.g.clear();
    slot.g.beginFill(0xffffff, 1.0);
    slot.g.drawCircle(0, 0, radius * FLASH_RADIUS_SCALE);
    slot.g.endFill();
    slot.g.x = x;
    slot.g.y = y;
    slot.g.alpha = 1.0;
    slot.g.visible = true;
    slot.ttl = FLASH_DURATION;
  }

  step(dt: number): void {
    for (let i = 0; i < FLASH_CAP; i++) {
      const s = this.slots[i]!;
      if (!s.g.visible) continue;
      s.ttl -= dt;
      if (s.ttl <= 0) {
        s.g.visible = false;
      } else {
        s.g.alpha = s.ttl / FLASH_DURATION;
      }
    }
  }

  clear(): void {
    for (let i = 0; i < FLASH_CAP; i++) {
      const s = this.slots[i]!;
      s.g.visible = false;
      s.ttl = 0;
    }
  }
}
