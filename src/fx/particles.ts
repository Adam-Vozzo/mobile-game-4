import { Sprite, Texture, ParticleContainer, BLEND_MODES } from 'pixi.js';
import { Pool } from '../engine/pool';
import { defaultRng } from '../engine/rng';
import { config } from '../config';

/**
 * Particle pool — sacred. Target thousands on screen during heavy combat.
 *
 * Per-particle state lives in plain numeric properties on the Sprite (we
 * piggyback on Pixi's allocations) plus a few extra fields. There is **zero**
 * allocation per spawn — the pool is created once at boot.
 *
 * The pool is index-based via Pool<T>. Active particles live at indices
 * [0, size). Releases swap-with-last and decrement size.
 *
 * Drawing uses Pixi's `ParticleContainer` so transforms upload as a batched
 * buffer per frame. That's what makes thousands cheap.
 */

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number; // remaining seconds
  maxLife: number;
  startScale: number;
  /** drag per second — higher = trails fade faster motionwise */
  drag: number;
}

export class ParticleSystem {
  readonly pool: Pool<Particle>;

  constructor(container: ParticleContainer, texture: Texture) {
    const cap = config.juice.particleCap;
    this.pool = new Pool<Particle>(cap, () => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.blendMode = BLEND_MODES.ADD;
      sprite.visible = false;
      // ParticleContainer batches all children regardless of `visible`, so
      // unspawned/dead sprites must also be transparent. Otherwise 4096 stacked
      // white sprites pile up at (0,0) — the "mysterious top-left blob".
      sprite.alpha = 0;
      container.addChild(sprite);
      return {
        sprite,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        startScale: 1,
        drag: 1.5,
      };
    });
  }

  get count(): number {
    return this.pool.size;
  }

  /**
   * Emit a burst at (x,y) coloured `tint` (0xRRGGBB). `count` is pre-density;
   * the active particle density multiplier scales it. Caller passes a
   * speed/life scale ∈ ~[0.5..2] for variation between event types.
   */
  burst(x: number, y: number, count: number, tint: number, speedScale = 1, lifeScale = 1): void {
    const rng = defaultRng;
    const j = config.juice;
    const density = j.particleDensity;
    const want = Math.max(0, Math.floor(count * density));
    const cap = Math.min(want, this.pool.free);
    for (let i = 0; i < cap; i++) {
      const p = this.pool.acquire();
      if (!p) break;
      const ang = rng.next() * Math.PI * 2;
      const speed =
        (j.particleSpeedMin + rng.next() * (j.particleSpeedMax - j.particleSpeedMin)) *
        speedScale;
      p.vx = Math.cos(ang) * speed;
      p.vy = Math.sin(ang) * speed;
      p.maxLife =
        (j.particleLifeMin + rng.next() * (j.particleLifeMax - j.particleLifeMin)) * lifeScale;
      p.life = p.maxLife;
      p.startScale = 0.18 + rng.next() * 0.18;
      p.drag = 1.5 + rng.next() * 2.0;

      p.sprite.x = x;
      p.sprite.y = y;
      p.sprite.tint = tint;
      p.sprite.scale.set(p.startScale);
      p.sprite.alpha = 1;
      p.sprite.visible = true;
    }
  }

  /** Per-tick simulation step. Mutates particles in place. */
  step(dt: number): void {
    const items = this.pool.items;
    for (let i = this.pool.size - 1; i >= 0; i--) {
      const p = items[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        p.sprite.alpha = 0;
        this.pool.releaseAt(i);
        continue;
      }
      const dragK = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragK;
      p.vy *= dragK;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      // Fade + slight shrink over life.
      const t = p.life / p.maxLife;
      p.sprite.alpha = t;
      const s = p.startScale * (0.5 + 0.5 * t);
      p.sprite.scale.set(s);
    }
  }

  /** Instantly retire all active particles (e.g. on retry). */
  clear(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) {
      const p = this.pool.items[i]!;
      p.sprite.visible = false;
      p.sprite.alpha = 0;
      this.pool.releaseAt(i);
    }
  }

  /** For test/diag — number of particles ready to spawn without exhaustion. */
  get free(): number {
    return this.pool.free;
  }
}
