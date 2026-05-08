import { Graphics, BLEND_MODES } from 'pixi.js';
import type { Container } from 'pixi.js';
import { config } from '../config';
import { drawPlayerShip } from '../render/ships';
import type { PlayerState } from '../game/player';

const TRAIL_LENGTH = 8;
const SAMPLE_INTERVAL = 0.045; // seconds (~22 samples/s → ~360 ms of trail)
const ALPHA_MAX = 0.35;
const SPEED_THRESHOLD = 30; // px/s — suppress trail when nearly stationary

interface Snapshot {
  x: number;
  y: number;
  rot: number;
}

/**
 * Ghost afterimage trail behind the player ship. Pre-allocates TRAIL_LENGTH
 * Graphics with the ship shape drawn once; each frame just updates position,
 * rotation, and alpha — no geometry regeneration.
 *
 * Added to the vector layer before the player so it renders behind the ship.
 */
export class PlayerTrail {
  private readonly ghosts: Graphics[] = [];
  private readonly snapshots: Snapshot[] = [];
  private sampleTimer = 0;

  constructor(layer: Container) {
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawPlayerShip(g);
      g.alpha = 0;
      layer.addChild(g);
      this.ghosts.push(g);
    }
  }

  step(dt: number, player: PlayerState): void {
    if (!config.juice.playerTrail) {
      this.hideAll();
      return;
    }

    this.sampleTimer += dt;
    if (this.sampleTimer >= SAMPLE_INTERVAL) {
      this.sampleTimer -= SAMPLE_INTERVAL;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed >= SPEED_THRESHOLD && player.alive && !player.blink) {
        this.snapshots.push({ x: player.x, y: player.y, rot: player.facing });
        if (this.snapshots.length > TRAIL_LENGTH) this.snapshots.shift();
      } else if (this.snapshots.length > 0) {
        // Player stopped or dead — shed oldest snapshot so trail fades out.
        this.snapshots.shift();
      }
    }

    const n = this.snapshots.length;
    const visible = player.alive && !player.blink;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const ghost = this.ghosts[i]!;
      if (!visible || i >= n) {
        ghost.alpha = 0;
        continue;
      }
      const snap = this.snapshots[i]!; // 0 = oldest, n-1 = newest
      ghost.x = snap.x;
      ghost.y = snap.y;
      ghost.rotation = snap.rot;
      // Linear ramp: oldest ghost → dim, newest ghost → ALPHA_MAX.
      ghost.alpha = ((i + 1) / n) * ALPHA_MAX;
    }
  }

  clear(): void {
    this.snapshots.length = 0;
    this.sampleTimer = 0;
    this.hideAll();
  }

  private hideAll(): void {
    for (const g of this.ghosts) g.alpha = 0;
  }
}
