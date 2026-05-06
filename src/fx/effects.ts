/**
 * Pure effect-state machine for feel events: hitstop, slow-mo, screen flash.
 *
 * No PixiJS here — just numbers. World drives this and applies the results to
 * the scene in step() and render().
 */
import { config } from '../config';

const FLASH_DECAY = 2.5; // alpha per real second
const SLOW_MO_SCALE = 0.25;
const SLOW_MO_DURATION = 1.5; // real seconds
const SLOW_MO_MULT_THRESHOLD = 5;

export class GameEffects {
  /** Current simulation time-scale. 1 = normal, < 1 = slow-mo. */
  timeScale = 1;
  /** Blend-additive white flash intensity, 0..1. */
  flashAlpha = 0;

  private hitstopRemaining = 0;
  private slowMoRemaining = 0;

  /**
   * Must be called every step() regardless of hitstop — flash decays in real
   * time so it's visible and fading during the freeze.
   */
  stepAlways(dt: number): void {
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - FLASH_DECAY * dt);
    }
  }

  /**
   * Returns true while in hitstop; caller should skip the simulation tick.
   * Decrements the hitstop counter by dt each call.
   */
  tickHitstop(dt: number): boolean {
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining = Math.max(0, this.hitstopRemaining - dt);
      return true;
    }
    return false;
  }

  /**
   * Ticks the slow-mo countdown (real time, not scaled time).
   * Updates timeScale when the window expires.
   */
  tickSlowMo(dt: number): void {
    if (this.slowMoRemaining > 0) {
      this.slowMoRemaining -= dt;
      if (this.slowMoRemaining <= 0) {
        this.slowMoRemaining = 0;
        this.timeScale = 1;
      }
    }
  }

  /** Trigger effects for a kill event. Pass the post-kill multiplier. */
  onKill(multiplier: number): void {
    if (config.juice.hitstopMs > 0) {
      // Allow a new kill to extend an ongoing hitstop slightly.
      this.hitstopRemaining = Math.max(this.hitstopRemaining, config.juice.hitstopMs / 1000);
    }
    if (config.juice.slowMoOnBigKill && multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      // Refresh the window on each qualifying kill so chains extend the effect.
      this.slowMoRemaining = SLOW_MO_DURATION;
    }
    if (config.juice.flashOnKill) {
      this.flashAlpha = Math.max(this.flashAlpha, 0.28);
    }
  }

  /** Player took damage — flash hard, snap out of slow-mo. */
  onPlayerHit(): void {
    // Always flash on player hit; severity is higher than a kill flash.
    this.flashAlpha = Math.max(this.flashAlpha, 0.55);
    this.timeScale = 1;
    this.slowMoRemaining = 0;
  }
}

export { SLOW_MO_MULT_THRESHOLD, SLOW_MO_DURATION, SLOW_MO_SCALE };
