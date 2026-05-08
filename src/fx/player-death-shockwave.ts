import { Graphics, BLEND_MODES } from 'pixi.js';
import type { Container } from 'pixi.js';
import { events } from '../engine/events';
import type { PlayerHitEvent } from '../engine/events';
import { config } from '../config';

/** Cyan player colour (0x00fff7). */
const PLAYER_COLOR = 0x00fff7;
/** Minimum expanding radius at minimum damage (first hit of a fresh game). */
const BASE_RADIUS = 160;
/** Extra radius added per life already lost. */
const RADIUS_PER_DEATH = 45;
const DURATION = 0.55;
const THICKNESS_START = 16;
const MAX_RINGS = 6;

interface Ring {
  x: number;
  y: number;
  t: number;
  maxRadius: number;
}

/**
 * Large expanding shockwave ring at the player's collision point on hit.
 * Ring size scales with danger — the more lives already lost, the bigger the ring.
 * Uses additive blending so it glows without obscuring gameplay.
 */
export class PlayerDeathShockwave {
  private readonly g: Graphics;
  private readonly rings: Ring[] = [];
  private readonly unsubHit: () => void;

  constructor(layer: Container) {
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    layer.addChild(this.g);
    this.unsubHit = events.on('playerHit', (e) => this._onHit(e));
  }

  destroy(): void {
    this.unsubHit();
    this.g.destroy();
  }

  step(dt: number): void {
    if (!config.juice.playerDeathShockwave) {
      if (this.rings.length > 0) {
        this.rings.length = 0;
        this.g.clear();
      }
      return;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i]!.t += dt;
      if (this.rings[i]!.t >= DURATION) this.rings.splice(i, 1);
    }

    this.g.clear();
    for (const ring of this.rings) {
      const p = ring.t / DURATION;
      const radius = p * ring.maxRadius;
      const alpha = (1 - p) * (1 - p);
      const thickness = Math.max(1, THICKNESS_START * (1 - p * 0.9));
      this.g.lineStyle(thickness, PLAYER_COLOR, alpha);
      this.g.drawCircle(ring.x, ring.y, radius);
    }
    this.g.lineStyle(0);
  }

  clear(): void {
    this.rings.length = 0;
    this.g.clear();
  }

  private _onHit(e: PlayerHitEvent): void {
    if (!config.juice.playerDeathShockwave) return;
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    const deathsTaken = config.flow.startingLives - e.livesRemaining;
    const maxRadius = BASE_RADIUS + Math.max(0, deathsTaken) * RADIUS_PER_DEATH;
    this.rings.push({ x: e.x, y: e.y, t: 0, maxRadius });
  }
}
