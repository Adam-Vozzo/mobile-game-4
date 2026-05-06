import type { RendererBundle } from '../render/renderer';
import { Player } from './player';
import { Bullets } from './bullets';
import { Wanderers } from './enemies/wanderer';
import { ScoreState } from './score';
import { ParticleSystem } from '../fx/particles';
import { ReactiveGrid } from '../fx/grid';
import { ScreenFlash } from '../fx/screen-flash';
import { config } from '../config';
import { defaultRng } from '../engine/rng';
import { events } from '../engine/events';
import { TIMING } from '../engine/loop';
import type { ControlsDispatcher, InputState } from '../input/controls';
import { length } from '../engine/math';

const SHAKE_DECAY = 8;

// Slow-mo constants — not user-tweakable yet; the toggle is the knob.
const SLOW_MO_SCALE = 0.15;
const SLOW_MO_DURATION = 1.5; // seconds
const SLOW_MO_MULT_THRESHOLD = 5;

// Flash constants — feel-tuned; intensity controlled by the screenFlash toggle.
const FLASH_KILL_COLOR = 0xff2bd6; // magenta, matches enemy tint
const FLASH_KILL_ALPHA = 0.35;
const FLASH_KILL_DURATION = 0.15; // seconds

const FLASH_HIT_COLOR = 0xffffff; // white — "ow"
const FLASH_HIT_ALPHA = 0.55;
const FLASH_HIT_DURATION = 0.3; // seconds

export class World {
  readonly renderer: RendererBundle;
  readonly player: Player;
  readonly bullets: Bullets;
  readonly wanderers: Wanderers;
  readonly particles: ParticleSystem;
  readonly grid: ReactiveGrid;
  readonly flash: ScreenFlash;
  readonly score = new ScoreState();
  private spawnTimer = 0.5;
  private shakeAmp = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  // Hitstop: number of fixed sim-frames remaining where simulation is frozen.
  private hitstopFrames = 0;
  // Slow-mo: time scale applied to all simulation dt; timer uses real dt.
  private timeScale = 1;
  private slowMoTimer = 0;

  constructor(renderer: RendererBundle) {
    this.renderer = renderer;
    const center = {
      x: renderer.viewport.halfW,
      y: renderer.viewport.halfH,
    };
    this.grid = new ReactiveGrid(renderer.layers.grid);
    this.grid.layout(renderer.viewport);
    this.player = new Player(renderer.layers.vector, center.x, center.y);
    this.bullets = new Bullets(renderer.layers.vector);
    this.wanderers = new Wanderers(renderer.layers.vector);
    this.particles = new ParticleSystem(renderer.layers.particles, renderer.particleTexture);
    this.flash = new ScreenFlash(renderer.layers.overlay);
  }

  /** Convenience for tests / smoke. */
  entityCount(): number {
    return 1 + this.bullets.count + this.wanderers.count;
  }

  step(dt: number, controls: ControlsDispatcher, input: InputState): void {
    // Hitstop: freeze simulation for N fixed-step frames, but keep shake and
    // flash ticking so they feel responsive even during the freeze.
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      this.decayShake(dt);
      this.flash.step(dt);
      return;
    }

    // Slow-mo: lerp timeScale back to 1 when the timer expires.
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt; // real dt — timer expires on wall-clock schedule
      if (this.slowMoTimer <= 0) {
        this.slowMoTimer = 0;
        this.timeScale = 1;
      }
    }
    const sdt = dt * this.timeScale;

    const w = this.renderer.viewport.width;
    const h = this.renderer.viewport.height;

    // Input → player
    controls.read(input);
    this.player.applyMove(sdt, input.moveX, input.moveY);
    this.player.clampToWorld(w, h);

    // Auto-aim: pick nearest enemy.
    const ps = this.player.state;
    let nx = 0,
      ny = 0,
      bestSq = Infinity,
      hasTarget = false;
    for (let i = 0; i < this.wanderers.count; i++) {
      const e = this.wanderers.pool.items[i]!;
      const dx = e.x - ps.x;
      const dy = e.y - ps.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestSq) {
        bestSq = d2;
        nx = dx;
        ny = dy;
        hasTarget = true;
      }
    }
    if (input.hasAim) {
      this.player.setFacing(Math.atan2(input.aimY, input.aimX));
    } else if (hasTarget) {
      // Smooth turn for legibility — full snap would feel rigid.
      const target = Math.atan2(ny, nx);
      const cur = ps.facing;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const k = config.controls.autoAimStrength;
      this.player.setFacing(cur + diff * Math.min(1, 18 * sdt * k));
    } else {
      // No targets — face by velocity if moving, else hold.
      if (Math.abs(ps.vx) + Math.abs(ps.vy) > 1) {
        this.player.setFacing(Math.atan2(ps.vy, ps.vx));
      }
    }

    // Fire
    if (this.player.consumeFireTick(sdt, input.fire && (hasTarget || input.hasAim))) {
      const dirx = Math.cos(ps.facing);
      const diry = Math.sin(ps.facing);
      const bx = ps.x + dirx * 16;
      const by = ps.y + diry * 16;
      this.bullets.spawn(bx, by, dirx, diry);
      events.emit('shoot', { x: bx, y: by });
    }

    // Enemies
    this.wanderers.step(sdt, w, h);

    // Bullets
    this.bullets.step(sdt, w, h);

    // Collisions: bullets ↔ wanderers
    this.collide();

    // Spawn director (slice-only logic — final spawn director is iter ≥3)
    this.spawnTimer -= sdt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer +=
        config.enemies.spawn.intervalSeconds / Math.max(0.01, config.flow.spawnRateMultiplier);
      if (this.wanderers.count < config.enemies.spawn.maxAlive) {
        this.spawnWanderer(w, h);
      }
    }

    // Particles
    this.particles.step(sdt);

    // Grid: pull around player, step spring-mass
    this.grid.pull(ps.x, ps.y, config.grid.playerInfluence * sdt);
    this.grid.step(sdt);

    // Shake: always uses real dt so recovery speed is time-invariant.
    this.decayShake(dt);

    // Score
    this.score.step(sdt);

    // Flash fade (real dt so flash reads at normal speed even in slow-mo)
    this.flash.step(dt);
  }

  render(_alpha: number): void {
    this.player.render();
    // Camera shake at the stage level.
    this.renderer.app.stage.position.set(this.shakeOffsetX, this.shakeOffsetY);
    this.grid.draw();
  }

  /** Re-layout grid after a viewport change. */
  onResize(): void {
    this.grid.layout(this.renderer.viewport);
  }

  private decayShake(dt: number): void {
    if (this.shakeAmp > 0) {
      this.shakeAmp = Math.max(0, this.shakeAmp - SHAKE_DECAY * dt);
      this.shakeOffsetX = (defaultRng.unit() * this.shakeAmp) | 0;
      this.shakeOffsetY = (defaultRng.unit() * this.shakeAmp) | 0;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  private spawnWanderer(w: number, h: number): void {
    const min = config.enemies.spawn.minDistanceFromPlayer;
    const ps = this.player.state;
    let x = 0,
      y = 0;
    // A handful of tries to find a spawn far enough from the player. If we
    // can't, take what we got — the gameplay-level cost is negligible and we
    // never block a tick.
    for (let i = 0; i < 6; i++) {
      x = defaultRng.range(40, w - 40);
      y = defaultRng.range(40, h - 40);
      if (length(x - ps.x, y - ps.y) >= min) break;
    }
    this.wanderers.spawn(x, y);
  }

  private collide(): void {
    const cfg = config.enemies.wanderer;
    const playerR = config.player.radius;
    const ps = this.player.state;
    // Bullets vs wanderers
    for (let bi = this.bullets.count - 1; bi >= 0; bi--) {
      const b = this.bullets.pool.items[bi]!;
      for (let wi = this.wanderers.count - 1; wi >= 0; wi--) {
        const w = this.wanderers.pool.items[wi]!;
        const dx = w.x - b.x;
        const dy = w.y - b.y;
        const r = cfg.radius + config.player.bulletRadius;
        if (dx * dx + dy * dy <= r * r) {
          this.killWanderer(wi, w.x, w.y);
          this.bullets.releaseAt(bi);
          break;
        }
      }
    }

    // Player vs wanderers — slice level: just respawn player at center for now.
    // Full death/lives flow lands in iteration ≥3.
    if (ps.alive) {
      const r = playerR + cfg.radius;
      for (let wi = this.wanderers.count - 1; wi >= 0; wi--) {
        const w = this.wanderers.pool.items[wi]!;
        const dx = w.x - ps.x;
        const dy = w.y - ps.y;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(w.x, w.y);
          this.killWanderer(wi, w.x, w.y);
          break;
        }
      }
    }
  }

  private killWanderer(i: number, x: number, y: number): void {
    const cfg = config.enemies.wanderer;
    this.wanderers.releaseAt(i);
    this.score.onKill(cfg.pointValue);

    // Particle burst — magenta into white core for the hot edge.
    this.particles.burst(x, y, config.juice.particlesPerKill, 0xff2bd6, 1, 1);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.4), 0xffffff, 1.4, 0.6);
    // Grid kick
    this.grid.push(x, y, config.grid.explosionInfluence, config.grid.influenceRadius);
    // Shake
    this.shakeAmp = Math.max(this.shakeAmp, 6 * config.juice.screenShakeIntensity);

    // Screen flash
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_KILL_COLOR, FLASH_KILL_ALPHA, FLASH_KILL_DURATION);
    }

    // Hitstop — convert ms → fixed sim frames (SIM_DT is in seconds).
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      // Only extend hitstop, never shorten an existing one.
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }

    // Slow-mo on big-kill (multiplier already updated by score.onKill above).
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }

    events.emit('kill', { x, y, r: 1, g: 0.17, b: 0.84, pointValue: cfg.pointValue });
  }

  private onPlayerHit(x: number, y: number): void {
    // Slice behaviour: reset score, knock player to centre. Real lives /
    // game-over flow comes in iteration ≥3.
    this.score.reset();
    const ps = this.player.state;
    ps.vx = 0;
    ps.vy = 0;
    ps.x = this.renderer.viewport.halfW;
    ps.y = this.renderer.viewport.halfH;
    this.particles.burst(x, y, 200, 0xffffff, 1.2, 1.2);
    this.grid.push(x, y, config.grid.explosionInfluence * 1.5, config.grid.influenceRadius * 1.4);
    this.shakeAmp = Math.max(this.shakeAmp, 14 * config.juice.screenShakeIntensity);

    // Screen flash — white/intense to signal danger.
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_HIT_COLOR, FLASH_HIT_ALPHA, FLASH_HIT_DURATION);
    }

    // Cancel any slow-mo; player-hit resets momentum.
    this.timeScale = 1;
    this.slowMoTimer = 0;

    events.emit('playerHit', { x, y });
  }
}
