/**
 * Camera punch: on kill, briefly displaces the stage toward the kill position,
 * then springs back. Fires on the next music beat (beat-sync) or immediately
 * if no beat arrives within MAX_WAIT_S (graceful when music is off).
 *
 * Spring is intentionally underdamped (ζ ≈ 0.66) for a subtle overshoot that
 * reads as physical momentum rather than a simple lerp.
 */

import { events } from '../engine/events';
import type { KillEvent } from '../engine/events';
import type { PlayerState } from '../game/player';
import { config } from '../config';

const SPRING_K = 280;
const DAMPING = 22;
const MAX_WAIT_S = 0.3;

interface Pending {
  dx: number;
  dy: number;
  magnitude: number;
}

export class CameraPunch {
  offsetX = 0;
  offsetY = 0;

  private velX = 0;
  private velY = 0;
  private pending: Pending[] = [];
  private waitTimer = 0;
  private hasPending = false;

  private readonly unsubKill: () => void;
  private readonly unsubBeat: () => void;

  constructor(private readonly playerState: PlayerState) {
    this.unsubKill = events.on('kill', (e) => this._onKill(e));
    this.unsubBeat = events.on('musicBeat', () => this._onBeat());
  }

  destroy(): void {
    this.unsubKill();
    this.unsubBeat();
  }

  step(dt: number): void {
    if (!config.juice.cameraPunch) {
      this.offsetX = 0;
      this.offsetY = 0;
      this.velX = 0;
      this.velY = 0;
      if (this.hasPending) {
        this.pending = [];
        this.hasPending = false;
      }
      return;
    }

    if (this.hasPending) {
      this.waitTimer += dt;
      if (this.waitTimer >= MAX_WAIT_S) this._fire();
    }

    // Underdamped spring pulls offset back toward zero
    const ax = -SPRING_K * this.offsetX - DAMPING * this.velX;
    const ay = -SPRING_K * this.offsetY - DAMPING * this.velY;
    this.velX += ax * dt;
    this.velY += ay * dt;
    this.offsetX += this.velX * dt;
    this.offsetY += this.velY * dt;

    // Dead-zone: halt jitter near rest
    if (Math.abs(this.offsetX) < 0.05 && Math.abs(this.velX) < 0.5) {
      this.offsetX = 0;
      this.velX = 0;
    }
    if (Math.abs(this.offsetY) < 0.05 && Math.abs(this.velY) < 0.5) {
      this.offsetY = 0;
      this.velY = 0;
    }
  }

  clear(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.velX = 0;
    this.velY = 0;
    this.pending = [];
    this.hasPending = false;
    this.waitTimer = 0;
  }

  private _onKill(e: KillEvent): void {
    if (!config.juice.cameraPunch) return;
    const dx = e.x - this.playerState.x;
    const dy = e.y - this.playerState.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const base = config.juice.cameraPunchMagnitude;
    const scale = Math.min(2.5, e.pointValue / 50);
    this.pending.push({ dx: dx / dist, dy: dy / dist, magnitude: base * scale });
    if (!this.hasPending) {
      this.waitTimer = 0;
      this.hasPending = true;
    }
  }

  private _onBeat(): void {
    if (this.hasPending) this._fire();
  }

  private _fire(): void {
    if (!this.hasPending) return;
    let mx = 0;
    let my = 0;
    for (const p of this.pending) {
      mx += p.dx * p.magnitude;
      my += p.dy * p.magnitude;
    }
    // Cap total displacement
    const len = Math.sqrt(mx * mx + my * my) || 1;
    const cap = config.juice.cameraPunchMagnitude * 3;
    if (len > cap) {
      mx *= cap / len;
      my *= cap / len;
    }
    // Snap to displacement; spring returns to zero
    this.offsetX += mx;
    this.offsetY += my;
    const absLen = Math.sqrt(this.offsetX * this.offsetX + this.offsetY * this.offsetY);
    if (absLen > cap) {
      this.offsetX *= cap / absLen;
      this.offsetY *= cap / absLen;
    }
    this.pending = [];
    this.hasPending = false;
    this.waitTimer = 0;
  }
}
