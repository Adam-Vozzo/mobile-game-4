import { config } from '../config';

/**
 * Score + chained-kill multiplier.
 *
 * The multiplier sits at 1 by default. Each kill within `windowMs` of the
 * previous kill grows it by `+1`, capped at `max`. When idle, it decays at
 * `decayPerSecond` toward 1 — but never goes below 1 unless the player dies.
 */
export class ScoreState {
  score = 0;
  multiplier = 1;
  /** ms since last kill */
  private sinceKillMs = 9999;
  /** raw decimal multiplier; integer multiplier shown to player */
  private mulRaw = 1;

  reset(): void {
    this.score = 0;
    this.multiplier = 1;
    this.mulRaw = 1;
    this.sinceKillMs = 9999;
  }

  onKill(pointValue: number): void {
    const cfg = config.score.multiplier;
    if (this.sinceKillMs <= cfg.windowMs) {
      this.mulRaw = Math.min(cfg.max, this.mulRaw + 1);
    } else {
      // Outside the chain window — keep the raw value, just reset chain timer.
      // (Some prior versions reset to 1; keeping current value preserves
      // earned multiplier on a clean re-engagement and feels less punishing.
      // Pure decay handles the punishment instead.)
    }
    this.sinceKillMs = 0;
    this.multiplier = Math.floor(this.mulRaw);
    this.score += pointValue * this.multiplier;
  }

  /** dt in seconds. */
  step(dt: number): void {
    this.sinceKillMs += dt * 1000;
    const cfg = config.score.multiplier;
    if (this.sinceKillMs > cfg.windowMs) {
      this.mulRaw -= cfg.decayPerSecond * dt;
      if (this.mulRaw < 1) this.mulRaw = 1;
      this.multiplier = Math.floor(this.mulRaw);
    }
  }
}
