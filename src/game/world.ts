import type { RendererBundle } from '../render/renderer';
import { Player } from './player';
import { Bullets } from './bullets';
import { Wanderers } from './enemies/wanderer';
import { Grunts } from './enemies/grunt';
import { Weavers } from './enemies/weaver';
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
const FLASH_KILL_COLOR = 0xff2bd6; // magenta, matches wanderer
const FLASH_KILL_ALPHA = 0.35;
const FLASH_KILL_DURATION = 0.15;

const FLASH_GRUNT_COLOR = 0xff7700; // orange, matches grunt
const FLASH_WEAVER_COLOR = 0xaaff00; // lime, matches weaver

const FLASH_HIT_COLOR = 0xffffff; // white — "ow"
const FLASH_HIT_ALPHA = 0.55;
const FLASH_HIT_DURATION = 0.3;

export class World {
  readonly renderer: RendererBundle;
  readonly player: Player;
  readonly bullets: Bullets;
  readonly wanderers: Wanderers;
  readonly grunts: Grunts;
  readonly weavers: Weavers;
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
    this.grunts = new Grunts(renderer.layers.vector);
    this.weavers = new Weavers(renderer.layers.vector);
    this.particles = new ParticleSystem(renderer.layers.particles, renderer.particleTexture);
    this.flash = new ScreenFlash(renderer.layers.overlay);
  }

  /** Convenience for tests / smoke. */
  entityCount(): number {
    return 1 + this.bullets.count + this.wanderers.count + this.grunts.count + this.weavers.count;
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

    // Auto-aim: pick nearest enemy across all active enemy types.
    const ps = this.player.state;
    let nx = 0,
      ny = 0,
      bestSq = Infinity,
      hasTarget = false;
    const checkAimTarget = (ex: number, ey: number) => {
      const dx = ex - ps.x;
      const dy = ey - ps.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestSq) { bestSq = d2; nx = dx; ny = dy; hasTarget = true; }
    };
    for (let i = 0; i < this.wanderers.count; i++) {
      const e = this.wanderers.pool.items[i]!;
      checkAimTarget(e.x, e.y);
    }
    for (let i = 0; i < this.grunts.count; i++) {
      const e = this.grunts.pool.items[i]!;
      checkAimTarget(e.x, e.y);
    }
    for (let i = 0; i < this.weavers.count; i++) {
      const e = this.weavers.pool.items[i]!;
      checkAimTarget(e.x, e.y);
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
    this.grunts.step(sdt, w, h, ps.x, ps.y);
    this.weavers.step(sdt, w, h, ps.x, ps.y);

    // Bullets
    this.bullets.step(sdt, w, h);

    // Collisions: bullets/player ↔ all enemies
    this.collide();

    // Spawn director
    this.spawnTimer -= sdt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer +=
        config.enemies.spawn.intervalSeconds / Math.max(0.01, config.flow.spawnRateMultiplier);
      const total = this.wanderers.count + this.grunts.count + this.weavers.count;
      if (total < config.enemies.spawn.maxAlive) {
        this.spawnEnemy(w, h);
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

  private spawnEnemy(w: number, h: number): void {
    const min = config.enemies.spawn.minDistanceFromPlayer;
    const ps = this.player.state;
    let x = 0, y = 0;
    for (let i = 0; i < 6; i++) {
      x = defaultRng.range(40, w - 40);
      y = defaultRng.range(40, h - 40);
      if (length(x - ps.x, y - ps.y) >= min) break;
    }
    if (config.flow.newEnemyTypes) {
      const roll = defaultRng.next();
      if (roll < 0.5) {
        this.wanderers.spawn(x, y);
      } else if (roll < 0.8) {
        this.grunts.spawn(x, y);
      } else {
        this.weavers.spawn(x, y);
      }
    } else {
      this.wanderers.spawn(x, y);
    }
  }

  private collide(): void {
    const bulletR = config.player.bulletRadius;
    const playerR = config.player.radius;
    const ps = this.player.state;

    // Bullets vs wanderers
    outer_w: for (let bi = this.bullets.count - 1; bi >= 0; bi--) {
      const b = this.bullets.pool.items[bi]!;
      for (let ei = this.wanderers.count - 1; ei >= 0; ei--) {
        const e = this.wanderers.pool.items[ei]!;
        const dx = e.x - b.x; const dy = e.y - b.y;
        const r = config.enemies.wanderer.radius + bulletR;
        if (dx * dx + dy * dy <= r * r) {
          this.killWanderer(ei, e.x, e.y);
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
      for (let ei = this.grunts.count - 1; ei >= 0; ei--) {
        const e = this.grunts.pool.items[ei]!;
        const dx = e.x - b.x; const dy = e.y - b.y;
        const r = config.enemies.grunt.radius + bulletR;
        if (dx * dx + dy * dy <= r * r) {
          this.killGrunt(ei, e.x, e.y);
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
      for (let ei = this.weavers.count - 1; ei >= 0; ei--) {
        const e = this.weavers.pool.items[ei]!;
        const dx = e.x - b.x; const dy = e.y - b.y;
        const r = config.enemies.weaver.radius + bulletR;
        if (dx * dx + dy * dy <= r * r) {
          this.killWeaver(ei, e.x, e.y);
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
    }

    // Player vs all enemies
    if (ps.alive) {
      for (let ei = this.wanderers.count - 1; ei >= 0; ei--) {
        const e = this.wanderers.pool.items[ei]!;
        const dx = e.x - ps.x; const dy = e.y - ps.y;
        const r = playerR + config.enemies.wanderer.radius;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(e.x, e.y);
          this.killWanderer(ei, e.x, e.y);
          return;
        }
      }
      for (let ei = this.grunts.count - 1; ei >= 0; ei--) {
        const e = this.grunts.pool.items[ei]!;
        const dx = e.x - ps.x; const dy = e.y - ps.y;
        const r = playerR + config.enemies.grunt.radius;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(e.x, e.y);
          this.killGrunt(ei, e.x, e.y);
          return;
        }
      }
      for (let ei = this.weavers.count - 1; ei >= 0; ei--) {
        const e = this.weavers.pool.items[ei]!;
        const dx = e.x - ps.x; const dy = e.y - ps.y;
        const r = playerR + config.enemies.weaver.radius;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(e.x, e.y);
          this.killWeaver(ei, e.x, e.y);
          return;
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

  private killGrunt(i: number, x: number, y: number): void {
    const cfg = config.enemies.grunt;
    this.grunts.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    // Orange particles — heavier burst matching the grunt's bulk
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 1.3), 0xff7700, 1, 1);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.4), 0xffffff, 1.5, 0.7);
    this.grid.push(x, y, config.grid.explosionInfluence * 1.3, config.grid.influenceRadius * 1.1);
    this.shakeAmp = Math.max(this.shakeAmp, 9 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_GRUNT_COLOR, FLASH_KILL_ALPHA, FLASH_KILL_DURATION);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }
    events.emit('kill', { x, y, r: 1, g: 0.47, b: 0, pointValue: cfg.pointValue });
  }

  private killWeaver(i: number, x: number, y: number): void {
    const cfg = config.enemies.weaver;
    this.weavers.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    // Lime particles — nimble, snappy burst
    this.particles.burst(x, y, config.juice.particlesPerKill, 0xaaff00, 1, 1);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.3), 0xffffff, 1.6, 0.5);
    this.grid.push(x, y, config.grid.explosionInfluence * 0.9, config.grid.influenceRadius);
    this.shakeAmp = Math.max(this.shakeAmp, 5 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_WEAVER_COLOR, FLASH_KILL_ALPHA * 0.8, FLASH_KILL_DURATION);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }
    events.emit('kill', { x, y, r: 0.67, g: 1, b: 0, pointValue: cfg.pointValue });
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
