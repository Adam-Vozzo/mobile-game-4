import type { RendererBundle } from '../render/renderer';
import { Player } from './player';
import { Bullets } from './bullets';
import { Wanderers } from './enemies/wanderer';
import { ScoreState } from './score';
import { ParticleSystem } from '../fx/particles';
import { ReactiveGrid } from '../fx/grid';
import { GameEffects } from '../fx/effects';
import { config } from '../config';
import { defaultRng } from '../engine/rng';
import { events } from '../engine/events';
import type { ControlsDispatcher, InputState } from '../input/controls';
import { length } from '../engine/math';

const SHAKE_DECAY = 8;

export class World {
  readonly renderer: RendererBundle;
  readonly player: Player;
  readonly bullets: Bullets;
  readonly wanderers: Wanderers;
  readonly particles: ParticleSystem;
  readonly grid: ReactiveGrid;
  readonly score = new ScoreState();
  private readonly effects = new GameEffects();
  private spawnTimer = 0.5;
  private shakeAmp = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  /** DOM overlay for screen flash — screen-space, unaffected by camera shake. */
  private readonly flashEl: HTMLDivElement;

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

    // Screen-flash overlay: a white div that sits above the canvas in DOM order.
    // Using a DOM element keeps it screen-space (not subject to the stage shake
    // transform). mix-blend-mode:screen preserves the neon look.
    const canvasHost = renderer.app.view.parentElement ?? document.body;
    this.flashEl = document.createElement('div');
    this.flashEl.style.cssText =
      'position:absolute;inset:0;pointer-events:none;background:#fff;' +
      'opacity:0;mix-blend-mode:screen;z-index:100';
    canvasHost.appendChild(this.flashEl);
  }

  /** Convenience for tests / smoke. */
  entityCount(): number {
    return 1 + this.bullets.count + this.wanderers.count;
  }

  step(dt: number, controls: ControlsDispatcher, input: InputState): void {
    const w = this.renderer.viewport.width;
    const h = this.renderer.viewport.height;

    // Flash always decays in real time — visible and fading during hitstop freeze.
    this.effects.stepAlways(dt);

    // Hitstop: freeze simulation while the kill-impact lands.
    if (this.effects.tickHitstop(dt)) return;

    // Slow-mo: tick the window counter and compute this tick's time scale.
    this.effects.tickSlowMo(dt);
    const effectiveDt = dt * this.effects.timeScale;

    // Input → player
    controls.read(input);
    this.player.applyMove(effectiveDt, input.moveX, input.moveY);
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
      this.player.setFacing(cur + diff * Math.min(1, 18 * effectiveDt * k));
    } else {
      // No targets — face by velocity if moving, else hold.
      if (Math.abs(ps.vx) + Math.abs(ps.vy) > 1) {
        this.player.setFacing(Math.atan2(ps.vy, ps.vx));
      }
    }

    // Fire
    if (this.player.consumeFireTick(effectiveDt, input.fire && (hasTarget || input.hasAim))) {
      const dirx = Math.cos(ps.facing);
      const diry = Math.sin(ps.facing);
      this.bullets.spawn(ps.x + dirx * 16, ps.y + diry * 16, dirx, diry);
    }

    // Enemies
    this.wanderers.step(effectiveDt, w, h);

    // Bullets
    this.bullets.step(effectiveDt, w, h);

    // Collisions: bullets ↔ wanderers
    this.collide();

    // Spawn director (slice-only logic — final spawn director is iter ≥3)
    this.spawnTimer -= effectiveDt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer +=
        config.enemies.spawn.intervalSeconds / Math.max(0.01, config.flow.spawnRateMultiplier);
      if (this.wanderers.count < config.enemies.spawn.maxAlive) {
        this.spawnWanderer(w, h);
      }
    }

    // Particles
    this.particles.step(effectiveDt);

    // Grid: pull around player, decay shake (shake uses real dt for snappiness)
    this.grid.pull(ps.x, ps.y, config.grid.playerInfluence * effectiveDt);
    this.grid.step(effectiveDt);

    if (this.shakeAmp > 0) {
      this.shakeAmp = Math.max(0, this.shakeAmp - SHAKE_DECAY * dt);
      this.shakeOffsetX = (defaultRng.unit() * this.shakeAmp) | 0;
      this.shakeOffsetY = (defaultRng.unit() * this.shakeAmp) | 0;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Score decay (slows with slow-mo so chains are easier to maintain)
    this.score.step(effectiveDt);
  }

  render(_alpha: number): void {
    this.player.render();
    // Camera shake at the stage level.
    this.renderer.app.stage.position.set(this.shakeOffsetX, this.shakeOffsetY);
    // Flash overlay opacity — DOM element is screen-space, unaffected by shake.
    this.flashEl.style.opacity = this.effects.flashAlpha > 0.002
      ? this.effects.flashAlpha.toFixed(3)
      : '0';
    this.grid.draw();
  }

  /** Re-layout grid after a viewport change. */
  onResize(): void {
    this.grid.layout(this.renderer.viewport);
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
    // Feel effects — hitstop, slow-mo, flash (driven by post-kill multiplier)
    this.effects.onKill(this.score.multiplier);
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
    this.effects.onPlayerHit();
    events.emit('playerHit', { x, y });
  }
}
