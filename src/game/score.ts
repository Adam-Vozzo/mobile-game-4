import { config } from '../config';

const BEST_SCORE_KEY = 'neonDrift.bestScore';

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
  peakMultiplier = 1;
  /** ms since last kill */
  private sinceKillMs = 9999;
  /** raw decimal multiplier; integer multiplier shown to player */
  private mulRaw = 1;

  /** Full reset — use on game-over / retry. */
  reset(): void {
    this.score = 0;
    this.multiplier = 1;
    this.peakMultiplier = 1;
    this.mulRaw = 1;
    this.sinceKillMs = 9999;
  }

  /** Multiplier-only reset — use on player hit (score survives between lives). */
  resetMultiplier(): void {
    this.multiplier = 1;
    this.mulRaw = 1;
    this.sinceKillMs = 9999;
  }

  onKill(pointValue: number): void {
    const cfg = config.score.multiplier;
    if (this.sinceKillMs <= cfg.windowMs) {
      this.mulRaw = Math.min(cfg.max, this.mulRaw + 1);
    }
    this.sinceKillMs = 0;
    this.multiplier = Math.floor(this.mulRaw);
    if (this.multiplier > this.peakMultiplier) this.peakMultiplier = this.multiplier;
    this.score += pointValue * this.multiplier;
  }

  /** Extra +1 multiplier point awarded when Danger Close is active on a kill. */
  onKillBonus(): void {
    const cfg = config.score.multiplier;
    this.mulRaw = Math.min(cfg.max, this.mulRaw + 1);
    this.multiplier = Math.floor(this.mulRaw);
    if (this.multiplier > this.peakMultiplier) this.peakMultiplier = this.multiplier;
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

  static loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  /** Saves score if it's a new best. Returns the new best. */
  static saveBestScore(score: number): number {
    const prev = ScoreState.loadBestScore();
    const best = Math.max(prev, Math.floor(score));
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch { /* quota exceeded or private mode */ }
    return best;
  }
}
