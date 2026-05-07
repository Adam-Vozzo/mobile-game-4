import { config } from '../config';
import { defaultRng } from '../engine/rng';

export type EnemyType = 'wanderer' | 'grunt' | 'weaver' | 'black-hole';

/**
 * Spawn Director: escalates enemy pressure over time via a smooth difficulty
 * curve, shifts the enemy mix as the curve rises, and injects random "surge"
 * bursts so there are clear peaks in intensity.
 *
 * The director is purely a timer/counter — it does not spawn enemies directly.
 * World calls tick() each step and receives a list of enemy types to spawn.
 */
export class SpawnDirector {
  private elapsed = 0;
  private spawnTimer = 0.5;
  private surgeTimer = 0;
  private surgeProbClock = 0;

  reset(): void {
    this.elapsed = 0;
    this.spawnTimer = 0.5;
    this.surgeTimer = 0;
    this.surgeProbClock = 0;
  }

  get difficulty(): number {
    return Math.min(1, this.elapsed / config.spawnDirector.rampSeconds);
  }

  get isSurging(): boolean {
    return this.surgeTimer > 0;
  }

  /** Advance time and return a (possibly empty) list of enemy types to spawn. */
  tick(dt: number, aliveCount: number): EnemyType[] {
    this.elapsed += dt;

    const cfg = config.spawnDirector;
    const t = this.difficulty;

    // Surge check: once per second accumulate probability.
    if (this.surgeTimer > 0) {
      this.surgeTimer -= dt;
    } else {
      this.surgeProbClock += dt;
      if (this.surgeProbClock >= 1) {
        this.surgeProbClock -= 1;
        if (defaultRng.next() < cfg.surgeChancePerSecond) {
          this.surgeTimer = cfg.surgeDuration;
        }
      }
    }

    const baseInterval = lerp(cfg.maxInterval, cfg.minInterval, t);
    const interval = this.surgeTimer > 0 ? baseInterval * cfg.surgeIntervalScale : baseInterval;
    const maxAlive = Math.round(lerp(cfg.minMaxAlive, cfg.maxMaxAlive, t));

    const spawns: EnemyType[] = [];
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer += interval;
      if (aliveCount + spawns.length < maxAlive) {
        spawns.push(this.pickType(t));
      }
    }
    return spawns;
  }

  private pickType(t: number): EnemyType {
    if (!config.flow.newEnemyTypes) return 'wanderer';

    // Grunt weight rises from 0 at t=0.2 to 0.3 at t=0.7.
    const gruntW = smoothstep(0.2, 0.7, t) * 0.3;
    // Weaver weight rises from 0 at t=0.45 to 0.3 at t=1.0.
    const weaverW = smoothstep(0.45, 1.0, t) * 0.3;
    // Black hole weight rises from 0 at t=0.6 to 0.07 at t=1.0 (rare).
    const bhW = config.flow.blackHoleEnemy ? smoothstep(0.6, 1.0, t) * 0.07 : 0;
    const wandererW = Math.max(0, 1 - gruntW - weaverW - bhW);

    const roll = defaultRng.next();
    if (roll < wandererW) return 'wanderer';
    if (roll < wandererW + gruntW) return 'grunt';
    if (roll < wandererW + gruntW + weaverW) return 'weaver';
    return 'black-hole';
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
