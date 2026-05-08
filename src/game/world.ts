import type { RendererBundle } from '../render/renderer';
import { Player } from './player';
import { Bullets } from './bullets';
import { Wanderers } from './enemies/wanderer';
import { Grunts } from './enemies/grunt';
import { Weavers } from './enemies/weaver';
import { BlackHoles } from './enemies/black-hole';
import { Splitters, Shards } from './enemies/splitter';
import { Snakes } from './enemies/snake';
import { Pinwheels } from './enemies/pinwheel';
import { ScoreState } from './score';
import { SpawnDirector } from './spawn-director';
import { ParticleSystem } from '../fx/particles';
import { ReactiveGrid } from '../fx/grid';
import { ScreenFlash } from '../fx/screen-flash';
import { SurgeGlow } from '../fx/surge-glow';
import { CameraPunch } from '../fx/camera-punch';
import { HitstopDistortion } from '../fx/hitstop-distortion';
import { PlayerDeathShockwave } from '../fx/player-death-shockwave';
import { DangerVignette } from '../fx/danger-vignette';
import { PlayerTrail } from '../fx/player-trail';
import { config } from '../config';
import { defaultRng } from '../engine/rng';
import { events } from '../engine/events';
import { TIMING } from '../engine/loop';
import type { ControlsDispatcher, InputState } from '../input/controls';
import { length } from '../engine/math';

const SHAKE_DECAY = 8;

const SLOW_MO_SCALE = 0.15;
const SLOW_MO_DURATION = 1.5;
const SLOW_MO_MULT_THRESHOLD = 5;

const FLASH_KILL_COLOR = 0xff2bd6;
const FLASH_KILL_ALPHA = 0.35;
const FLASH_KILL_DURATION = 0.15;

const FLASH_GRUNT_COLOR = 0xff7700;
const FLASH_WEAVER_COLOR = 0xaaff00;
const FLASH_BH_COLOR = 0xaa00ff;
const FLASH_SPLITTER_COLOR = 0xffdd00;
const FLASH_SHARD_COLOR = 0xff8800;
const FLASH_SNAKE_COLOR = 0x00ffaa;
const FLASH_PINWHEEL_COLOR = 0xcc44ff;

const FLASH_HIT_COLOR = 0xffffff;
const FLASH_HIT_ALPHA = 0.55;
const FLASH_HIT_DURATION = 0.3;

const INVINC_DURATION = 2.0;
const INVINC_BLINK_PERIOD = 0.12;
const DEATH_CAM_DURATION = 1.5;
const DEATH_CAM_SCALE = 0.06;

type GameState = 'playing' | 'dying' | 'over';

export class World {
  readonly renderer: RendererBundle;
  readonly player: Player;
  readonly bullets: Bullets;
  readonly wanderers: Wanderers;
  readonly grunts: Grunts;
  readonly weavers: Weavers;
  readonly blackHoles: BlackHoles;
  readonly splitters: Splitters;
  readonly shards: Shards;
  readonly snakes: Snakes;
  readonly pinwheels: Pinwheels;
  readonly particles: ParticleSystem;
  readonly grid: ReactiveGrid;
  readonly flash: ScreenFlash;
  readonly surgeGlow: SurgeGlow;
  readonly cameraPunch: CameraPunch;
  readonly distortion: HitstopDistortion;
  readonly deathShockwave: PlayerDeathShockwave;
  readonly dangerVignette: DangerVignette;
  readonly playerTrail: PlayerTrail;
  readonly score = new ScoreState();
  readonly director = new SpawnDirector();

  lives: number = config.flow.startingLives;
  private gameState: GameState = 'playing';

  private spawnTimer = 0.5;
  private surgeWasActive = false;
  private shakeAmp = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private hitstopFrames = 0;
  private timeScale = 1;
  private slowMoTimer = 0;
  private invincTimer = 0;
  private deathCamTimer = 0;

  constructor(renderer: RendererBundle) {
    this.renderer = renderer;
    const center = {
      x: renderer.viewport.halfW,
      y: renderer.viewport.halfH,
    };
    this.grid = new ReactiveGrid(renderer.layers.grid);
    this.grid.layout(renderer.viewport);
    // Trail must be added to vector before Player so it renders behind the ship.
    this.playerTrail = new PlayerTrail(renderer.layers.vector);
    this.player = new Player(renderer.layers.vector, center.x, center.y);
    this.bullets = new Bullets(renderer.layers.vector);
    this.wanderers = new Wanderers(renderer.layers.vector);
    this.grunts = new Grunts(renderer.layers.vector);
    this.weavers = new Weavers(renderer.layers.vector);
    this.blackHoles = new BlackHoles(renderer.layers.vector);
    this.splitters = new Splitters(renderer.layers.vector);
    this.shards = new Shards(renderer.layers.vector);
    this.snakes = new Snakes(renderer.layers.vector);
    this.pinwheels = new Pinwheels(renderer.layers.vector);
    this.particles = new ParticleSystem(renderer.layers.particles, renderer.particleTexture);
    this.flash = new ScreenFlash(renderer.layers.overlay);
    this.surgeGlow = new SurgeGlow(renderer.layers.overlay);
    this.cameraPunch = new CameraPunch(this.player.state);
    this.distortion = new HitstopDistortion(renderer.layers.overlay);
    this.deathShockwave = new PlayerDeathShockwave(renderer.layers.overlay);
    this.dangerVignette = new DangerVignette(renderer.layers.overlay);

    events.on('musicBeat', ({ isKick }) => {
      if (!config.audio.musicReactivity) return;
      if (isKick) {
        // Push grid outward from center on kick — subtle rhythmic breath.
        this.grid.push(
          renderer.viewport.halfW,
          renderer.viewport.halfH,
          config.grid.explosionInfluence * 0.18,
          config.grid.influenceRadius * 1.6,
        );
      } else {
        // Snare: light screen flash (dim, fast).
        if (config.juice.screenFlash) {
          this.flash.flash(0x8833ff, 0.08, 0.06);
        }
      }
    });
  }

  entityCount(): number {
    return (
      1 +
      this.bullets.count +
      this.wanderers.count +
      this.grunts.count +
      this.weavers.count +
      this.blackHoles.count +
      this.splitters.count +
      this.shards.count +
      this.snakes.count +
      this.pinwheels.count
    );
  }

  get isOver(): boolean {
    return this.gameState === 'over';
  }

  reset(): void {
    this.lives = config.flow.startingLives;
    this.gameState = 'playing';
    this.invincTimer = 0;
    this.deathCamTimer = 0;
    this.timeScale = 1;
    this.slowMoTimer = 0;
    this.hitstopFrames = 0;
    this.spawnTimer = 0.5;
    this.shakeAmp = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.score.reset();
    this.director.reset();
    this.player.reset(this.renderer.viewport.halfW, this.renderer.viewport.halfH);
    this.wanderers.releaseAll();
    this.grunts.releaseAll();
    this.weavers.releaseAll();
    this.blackHoles.releaseAll();
    this.splitters.releaseAll();
    this.shards.releaseAll();
    this.snakes.releaseAll();
    this.pinwheels.releaseAll();
    this.bullets.releaseAll();
    this.particles.clear();
    this.flash.clear();
    this.surgeGlow.clear();
    this.cameraPunch.clear();
    this.distortion.clear();
    this.deathShockwave.clear();
    this.dangerVignette.clear();
    this.playerTrail.clear();
    this.surgeWasActive = false;
    this.renderer.app.stage.position.set(0, 0);
  }

  step(dt: number, controls: ControlsDispatcher, input: InputState): void {
    // Death cam: simulation trickles in slow-mo, then freezes.
    if (this.gameState === 'dying') {
      this.deathCamTimer -= dt;
      if (this.deathCamTimer <= 0) {
        this.gameState = 'over';
        const bestScore = ScoreState.saveBestScore(this.score.score);
        events.emit('gameOver', {
          score: this.score.score,
          bestScore,
          peakMultiplier: this.score.peakMultiplier,
        });
      }
      // Keep particles/grid/flash ticking at death-cam speed.
      const ddt = dt * DEATH_CAM_SCALE;
      this.particles.step(ddt);
      this.grid.step(ddt);
      this.decayShake(dt);
      this.cameraPunch.step(dt);
      this.flash.step(dt);
      this.distortion.step(dt);
      this.deathShockwave.step(dt);
      this.dangerVignette.step(dt, this.lives, this.renderer.viewport);
      this.playerTrail.step(dt, this.player.state);
      if (config.juice.surgeIndicator) this.surgeGlow.step(dt, this.renderer.viewport);
      return;
    }

    if (this.gameState === 'over') return;

    // Hitstop.
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      this.decayShake(dt);
      this.cameraPunch.step(dt);
      this.flash.step(dt);
      this.distortion.step(dt);
      this.deathShockwave.step(dt);
      this.dangerVignette.step(dt, this.lives, this.renderer.viewport);
      this.playerTrail.step(dt, this.player.state);
      if (config.juice.surgeIndicator) this.surgeGlow.step(dt, this.renderer.viewport);
      return;
    }

    // Invincibility blink (uses real dt so the window is wall-clock).
    if (this.invincTimer > 0) {
      this.invincTimer -= dt;
      const blinkPhase = Math.floor(this.invincTimer / INVINC_BLINK_PERIOD);
      this.player.state.blink = blinkPhase % 2 === 0;
      if (this.invincTimer <= 0) {
        this.invincTimer = 0;
        this.player.state.blink = false;
      }
    }

    // Slow-mo.
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.slowMoTimer = 0;
        this.timeScale = 1;
      }
    }
    const sdt = dt * this.timeScale;

    const w = this.renderer.viewport.width;
    const h = this.renderer.viewport.height;

    controls.read(input);
    this.player.applyMove(sdt, input.moveX, input.moveY);
    this.player.clampToWorld(w, h);

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
    for (let i = 0; i < this.blackHoles.count; i++) {
      const e = this.blackHoles.pool.items[i]!;
      checkAimTarget(e.x, e.y);
    }
    for (let i = 0; i < this.splitters.count; i++) {
      const e = this.splitters.pool.items[i]!;
      checkAimTarget(e.x, e.y);
    }
    for (let i = 0; i < this.shards.count; i++) {
      const e = this.shards.pool.items[i]!;
      checkAimTarget(e.x, e.y);
    }
    for (let i = 0; i < this.snakes.count; i++) {
      const e = this.snakes.pool.items[i]!;
      checkAimTarget(e.x, e.y); // target the head
    }
    for (let i = 0; i < this.pinwheels.count; i++) {
      const e = this.pinwheels.pool.items[i]!;
      checkAimTarget(e.x, e.y); // target the hub
    }
    if (input.hasAim) {
      this.player.setFacing(Math.atan2(input.aimY, input.aimX));
    } else if (hasTarget) {
      const target = Math.atan2(ny, nx);
      const cur = ps.facing;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const k = config.controls.autoAimStrength;
      this.player.setFacing(cur + diff * Math.min(1, 18 * sdt * k));
    } else {
      if (Math.abs(ps.vx) + Math.abs(ps.vy) > 1) {
        this.player.setFacing(Math.atan2(ps.vy, ps.vx));
      }
    }

    if (this.player.consumeFireTick(sdt, input.fire && (hasTarget || input.hasAim))) {
      const dirx = Math.cos(ps.facing);
      const diry = Math.sin(ps.facing);
      const bx = ps.x + dirx * 16;
      const by = ps.y + diry * 16;
      this.bullets.spawn(bx, by, dirx, diry);
      events.emit('shoot', { x: bx, y: by });
    }

    this.wanderers.step(sdt, w, h);
    this.grunts.step(sdt, w, h, ps.x, ps.y);
    this.weavers.step(sdt, w, h, ps.x, ps.y);
    this.blackHoles.step(sdt, w, h);
    if (config.flow.blackHoleEnemy && this.blackHoles.count > 0) {
      this.applyBlackHoleGravity(sdt, ps);
    }
    if (config.flow.splitterEnemy) {
      this.splitters.step(sdt, w, h);
      this.shards.step(sdt, w, h, ps.x, ps.y);
    }
    if (config.flow.snakeEnemy) {
      this.snakes.step(sdt, w, h, ps.x, ps.y);
    }
    if (config.flow.pinwheelEnemy) {
      this.pinwheels.step(sdt, w, h, ps.x, ps.y);
    }
    this.bullets.step(sdt, w, h);

    this.collide();

    const total =
      this.wanderers.count + this.grunts.count + this.weavers.count + this.blackHoles.count +
      this.splitters.count + this.shards.count + this.snakes.count;
    if (config.spawnDirector.enabled) {
      const types = this.director.tick(sdt, total);
      for (const type of types) this.spawnEnemyOfType(type, w, h);
      this.updateSurge();
    } else {
      this.spawnTimer -= sdt;
      while (this.spawnTimer <= 0) {
        this.spawnTimer +=
          config.enemies.spawn.intervalSeconds / Math.max(0.01, config.flow.spawnRateMultiplier);
        if (total < config.enemies.spawn.maxAlive) {
          this.spawnEnemy(w, h);
        }
      }
    }

    this.particles.step(sdt);
    this.grid.pull(ps.x, ps.y, config.grid.playerInfluence * sdt);
    this.grid.step(sdt);
    this.decayShake(dt);
    this.cameraPunch.step(dt);
    this.score.step(sdt);
    this.flash.step(dt);
    this.distortion.step(dt);
    this.deathShockwave.step(dt);
    this.dangerVignette.step(dt, this.lives, this.renderer.viewport);
    this.playerTrail.step(dt, this.player.state);
    if (config.juice.surgeIndicator) {
      this.surgeGlow.step(dt, this.renderer.viewport);
    }
  }

  render(_alpha: number): void {
    this.player.render();
    this.renderer.app.stage.position.set(
      this.shakeOffsetX + this.cameraPunch.offsetX,
      this.shakeOffsetY + this.cameraPunch.offsetY,
    );
    this.grid.draw();
  }

  onResize(): void {
    this.grid.layout(this.renderer.viewport);
  }

  private updateSurge(): void {
    const nowSurging = this.director.isSurging;
    if (nowSurging !== this.surgeWasActive) {
      this.surgeWasActive = nowSurging;
      events.emit('surgeChange', { active: nowSurging });
      if (nowSurging && config.juice.screenFlash) {
        this.flash.flash(0xff3300, 0.28, 0.4);
      }
    }
    this.surgeGlow.setSurging(nowSurging && config.juice.surgeIndicator);
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

  private spawnAt(w: number, h: number): { x: number; y: number } {
    const min = config.enemies.spawn.minDistanceFromPlayer;
    const ps = this.player.state;
    let x = defaultRng.range(40, w - 40);
    let y = defaultRng.range(40, h - 40);
    for (let i = 0; i < 6; i++) {
      x = defaultRng.range(40, w - 40);
      y = defaultRng.range(40, h - 40);
      if (length(x - ps.x, y - ps.y) >= min) break;
    }
    return { x, y };
  }

  private spawnEnemy(w: number, h: number): void {
    const { x, y } = this.spawnAt(w, h);
    // Black hole: rare independent spawn regardless of newEnemyTypes.
    if (
      config.flow.blackHoleEnemy &&
      this.blackHoles.count < config.enemies.blackHole.maxConcurrent &&
      defaultRng.next() < 0.06
    ) {
      this.blackHoles.spawn(x, y);
      return;
    }
    if (config.flow.newEnemyTypes) {
      const splitterW = config.flow.splitterEnemy ? 0.12 : 0;
      const snakeW = config.flow.snakeEnemy && this.snakes.count < config.enemies.snake.maxConcurrent ? 0.10 : 0;
      const pinwheelW = config.flow.pinwheelEnemy && this.pinwheels.count < config.enemies.pinwheel.maxConcurrent ? 0.08 : 0;
      const roll = defaultRng.next();
      if (roll < 0.45 - splitterW * 0.5 - snakeW * 0.5 - pinwheelW * 0.5) {
        this.wanderers.spawn(x, y);
      } else if (roll < 0.72 - splitterW * 0.3 - snakeW * 0.3 - pinwheelW * 0.3) {
        this.grunts.spawn(x, y);
      } else if (roll < 1.0 - splitterW - snakeW - pinwheelW) {
        this.weavers.spawn(x, y);
      } else if (roll < 1.0 - splitterW - pinwheelW) {
        this.snakes.spawn(x, y);
      } else if (roll < 1.0 - pinwheelW) {
        this.splitters.spawn(x, y);
      } else {
        this.pinwheels.spawn(x, y);
      }
    } else if (config.flow.pinwheelEnemy && this.pinwheels.count < config.enemies.pinwheel.maxConcurrent) {
      if (defaultRng.next() < 0.15) {
        this.pinwheels.spawn(x, y);
      } else if (config.flow.snakeEnemy && this.snakes.count < config.enemies.snake.maxConcurrent && defaultRng.next() < 0.18) {
        this.snakes.spawn(x, y);
      } else if (config.flow.splitterEnemy && defaultRng.next() < 0.2) {
        this.splitters.spawn(x, y);
      } else {
        this.wanderers.spawn(x, y);
      }
    } else if (config.flow.snakeEnemy && this.snakes.count < config.enemies.snake.maxConcurrent) {
      if (defaultRng.next() < 0.18) {
        this.snakes.spawn(x, y);
      } else if (config.flow.splitterEnemy && defaultRng.next() < 0.2) {
        this.splitters.spawn(x, y);
      } else {
        this.wanderers.spawn(x, y);
      }
    } else if (config.flow.splitterEnemy) {
      if (defaultRng.next() < 0.2) {
        this.splitters.spawn(x, y);
      } else {
        this.wanderers.spawn(x, y);
      }
    } else {
      this.wanderers.spawn(x, y);
    }
  }

  private spawnEnemyOfType(type: import('./spawn-director').EnemyType, w: number, h: number): void {
    const { x, y } = this.spawnAt(w, h);
    if (type === 'grunt') this.grunts.spawn(x, y);
    else if (type === 'weaver') this.weavers.spawn(x, y);
    else if (type === 'splitter') this.splitters.spawn(x, y);
    else if (type === 'snake' && this.snakes.count < config.enemies.snake.maxConcurrent) {
      this.snakes.spawn(x, y);
    } else if (
      type === 'black-hole' &&
      this.blackHoles.count < config.enemies.blackHole.maxConcurrent
    ) {
      this.blackHoles.spawn(x, y);
    } else if (
      type === 'pinwheel' &&
      this.pinwheels.count < config.enemies.pinwheel.maxConcurrent
    ) {
      this.pinwheels.spawn(x, y);
    } else if (type !== 'black-hole' && type !== 'snake' && type !== 'pinwheel') {
      this.wanderers.spawn(x, y);
    }
  }

  private collide(): void {
    const bulletR = config.player.bulletRadius;
    const playerR = config.player.radius;
    const ps = this.player.state;

    outer_w: for (let bi = this.bullets.count - 1; bi >= 0; bi--) {
      const b = this.bullets.pool.items[bi]!;
      for (let ei = this.blackHoles.count - 1; ei >= 0; ei--) {
        const e = this.blackHoles.pool.items[ei]!;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const r = config.enemies.blackHole.radius + bulletR;
        if (dx * dx + dy * dy <= r * r) {
          if (this.blackHoles.damage(ei)) {
            this.killBlackHole(ei, e.x, e.y);
          }
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
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
      for (let ei = this.splitters.count - 1; ei >= 0; ei--) {
        const e = this.splitters.pool.items[ei]!;
        const dx = e.x - b.x; const dy = e.y - b.y;
        const r = config.enemies.splitter.radius + bulletR;
        if (dx * dx + dy * dy <= r * r) {
          if (this.splitters.damage(ei)) {
            this.killSplitter(ei, e.x, e.y, ps.x, ps.y);
          } else {
            this.onSplitterDamaged(e.x, e.y);
          }
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
      for (let ei = this.shards.count - 1; ei >= 0; ei--) {
        const e = this.shards.pool.items[ei]!;
        const dx = e.x - b.x; const dy = e.y - b.y;
        const r = config.enemies.shard.radius + bulletR;
        if (dx * dx + dy * dy <= r * r) {
          this.killShard(ei, e.x, e.y);
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
      // Snake: head is killable; body segments absorb bullets without taking damage.
      for (let ei = this.snakes.count - 1; ei >= 0; ei--) {
        const e = this.snakes.pool.items[ei]!;
        // Check head first.
        const hdx = e.x - b.x; const hdy = e.y - b.y;
        const headR = config.enemies.snake.radius + bulletR;
        if (hdx * hdx + hdy * hdy <= headR * headR) {
          if (this.snakes.damage(ei)) {
            this.killSnake(ei, e.x, e.y);
          } else {
            this.onSnakeDamaged(e.x, e.y);
          }
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
        // Check body segments — they absorb bullets silently.
        const segR = config.enemies.snake.segmentRadius + bulletR;
        const segR2 = segR * segR;
        let segHit = false;
        for (let s = 0; s < config.enemies.snake.segmentCount; s++) {
          const sg = e.segGs[s]!;
          const sdx = sg.x - b.x; const sdy = sg.y - b.y;
          if (sdx * sdx + sdy * sdy <= segR2) {
            segHit = true;
            break;
          }
        }
        if (segHit) {
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
      // Pinwheel: drones absorb bullets; hub takes damage.
      for (let ei = this.pinwheels.count - 1; ei >= 0; ei--) {
        const e = this.pinwheels.pool.items[ei]!;
        // Check drones first — they absorb bullets silently.
        const droneR = config.enemies.pinwheel.droneRadius + bulletR;
        const droneR2 = droneR * droneR;
        const orbitR = config.enemies.pinwheel.orbitRadius;
        let droneHit = false;
        for (let d = 0; d < 3; d++) {
          const angle = e.orbitAngle + (d * Math.PI * 2) / 3;
          const droneX = e.x + Math.cos(angle) * orbitR;
          const droneY = e.y + Math.sin(angle) * orbitR;
          const ddx = droneX - b.x;
          const ddy = droneY - b.y;
          if (ddx * ddx + ddy * ddy <= droneR2) {
            droneHit = true;
            break;
          }
        }
        if (droneHit) {
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
        // Check hub.
        const hdx = e.x - b.x;
        const hdy = e.y - b.y;
        const hubR = config.enemies.pinwheel.hubRadius + bulletR;
        if (hdx * hdx + hdy * hdy <= hubR * hubR) {
          if (this.pinwheels.damage(ei)) {
            this.killPinwheel(ei, e.x, e.y);
          } else {
            this.onPinwheelDamaged(e.x, e.y);
          }
          this.bullets.releaseAt(bi);
          continue outer_w;
        }
      }
    }

    // Skip player collision during invincibility window.
    if (ps.alive && this.invincTimer <= 0) {
      for (let ei = this.blackHoles.count - 1; ei >= 0; ei--) {
        const e = this.blackHoles.pool.items[ei]!;
        const dx = e.x - ps.x;
        const dy = e.y - ps.y;
        const r = playerR + config.enemies.blackHole.radius;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(e.x, e.y);
          return;
        }
      }
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
      for (let ei = this.splitters.count - 1; ei >= 0; ei--) {
        const e = this.splitters.pool.items[ei]!;
        const dx = e.x - ps.x; const dy = e.y - ps.y;
        const r = playerR + config.enemies.splitter.radius;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(e.x, e.y);
          return;
        }
      }
      for (let ei = this.shards.count - 1; ei >= 0; ei--) {
        const e = this.shards.pool.items[ei]!;
        const dx = e.x - ps.x; const dy = e.y - ps.y;
        const r = playerR + config.enemies.shard.radius;
        if (dx * dx + dy * dy <= r * r) {
          this.onPlayerHit(e.x, e.y);
          this.killShard(ei, e.x, e.y);
          return;
        }
      }
      // Snake: touching head or any body segment damages the player.
      for (let ei = this.snakes.count - 1; ei >= 0; ei--) {
        const e = this.snakes.pool.items[ei]!;
        const hdx = e.x - ps.x; const hdy = e.y - ps.y;
        const headR = playerR + config.enemies.snake.radius;
        if (hdx * hdx + hdy * hdy <= headR * headR) {
          this.onPlayerHit(e.x, e.y);
          return;
        }
        const segR = playerR + config.enemies.snake.segmentRadius;
        const segR2 = segR * segR;
        for (let s = 0; s < config.enemies.snake.segmentCount; s++) {
          const sg = e.segGs[s]!;
          const sdx = sg.x - ps.x; const sdy = sg.y - ps.y;
          if (sdx * sdx + sdy * sdy <= segR2) {
            this.onPlayerHit(sg.x, sg.y);
            return;
          }
        }
      }
      // Pinwheel: touching hub or any drone kills the player.
      for (let ei = this.pinwheels.count - 1; ei >= 0; ei--) {
        const e = this.pinwheels.pool.items[ei]!;
        const hubR = playerR + config.enemies.pinwheel.hubRadius;
        const hdx = e.x - ps.x; const hdy = e.y - ps.y;
        if (hdx * hdx + hdy * hdy <= hubR * hubR) {
          this.onPlayerHit(e.x, e.y);
          return;
        }
        const droneR = playerR + config.enemies.pinwheel.droneRadius;
        const droneR2 = droneR * droneR;
        const orbitR = config.enemies.pinwheel.orbitRadius;
        for (let d = 0; d < 3; d++) {
          const angle = e.orbitAngle + (d * Math.PI * 2) / 3;
          const droneX = e.x + Math.cos(angle) * orbitR;
          const droneY = e.y + Math.sin(angle) * orbitR;
          const ddx = droneX - ps.x;
          const ddy = droneY - ps.y;
          if (ddx * ddx + ddy * ddy <= droneR2) {
            this.onPlayerHit(droneX, droneY);
            return;
          }
        }
      }
    }
  }

  private killBlackHole(i: number, x: number, y: number): void {
    const cfg = config.enemies.blackHole;
    this.blackHoles.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    // Massive explosion — more dramatic than any other enemy kill.
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 2.5), 0xaa00ff, 1.2, 1.4);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 1.0), 0xff88ff, 1.6, 0.8);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.5), 0xffffff, 2.0, 0.5);
    this.grid.push(x, y, config.grid.explosionInfluence * 2.0, config.grid.influenceRadius * 1.6);
    this.shakeAmp = Math.max(this.shakeAmp, 18 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_BH_COLOR, 0.55, 0.4);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames * 2);
    }
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }
    events.emit('kill', { x, y, r: 0.67, g: 0, b: 1, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private applyBlackHoleGravity(
    dt: number,
    ps: { x: number; y: number; vx: number; vy: number; alive: boolean },
  ): void {
    const bhCfg = config.enemies.blackHole;
    const influenceR = bhCfg.influenceRadius;
    const influenceR2 = influenceR * influenceR;
    const bulletG = bhCfg.bulletGravityStrength;
    const playerG = bhCfg.playerGravityStrength;

    for (let bi = 0; bi < this.blackHoles.count; bi++) {
      const bh = this.blackHoles.pool.items[bi]!;

      // Gravity on bullets — linear falloff from center to influenceRadius.
      for (let i = 0; i < this.bullets.count; i++) {
        const b = this.bullets.pool.items[i]!;
        const dx = bh.x - b.x;
        const dy = bh.y - b.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < influenceR2 && dist2 > 4) {
          const dist = Math.sqrt(dist2);
          const factor = Math.max(0, 1 - dist / influenceR);
          const accel = bulletG * factor * dt;
          b.vx += (dx / dist) * accel;
          b.vy += (dy / dist) * accel;
        }
      }

      // Gravity on player.
      if (ps.alive) {
        const dpx = bh.x - ps.x;
        const dpy = bh.y - ps.y;
        const pdist2 = dpx * dpx + dpy * dpy;
        if (pdist2 < influenceR2 && pdist2 > 4) {
          const pdist = Math.sqrt(pdist2);
          const pfactor = Math.max(0, 1 - pdist / influenceR);
          const paccel = playerG * pfactor * dt;
          ps.vx += (dpx / pdist) * paccel;
          ps.vy += (dpy / pdist) * paccel;
        }
      }
    }
  }

  private onSplitterDamaged(x: number, y: number): void {
    // First hit feedback — small white flash + mild shake (signals "wounded, not dead").
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.3), 0xffdd00, 0.8, 0.6);
    this.shakeAmp = Math.max(this.shakeAmp, 4 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_SPLITTER_COLOR, 0.18, 0.08);
    }
  }

  private killSplitter(i: number, x: number, y: number, playerX: number, playerY: number): void {
    const cfg = config.enemies.splitter;
    this.splitters.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    // Dramatic split burst.
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 1.2), 0xffdd00, 1.1, 1.0);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.5), 0xff8800, 1.5, 0.7);
    this.grid.push(x, y, config.grid.explosionInfluence * 1.1, config.grid.influenceRadius);
    this.shakeAmp = Math.max(this.shakeAmp, 8 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_SPLITTER_COLOR, 0.38, 0.18);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    // Spawn 2 shards aimed at player with ±30° spread.
    const baseAngle = Math.atan2(playerY - y, playerX - x);
    const spread = Math.PI / 6;
    this.shards.spawn(x, y, baseAngle - spread);
    this.shards.spawn(x, y, baseAngle + spread);
    events.emit('kill', { x, y, r: 1, g: 0.87, b: 0, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private onSnakeDamaged(x: number, y: number): void {
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.3), 0x00ffaa, 0.7, 0.5);
    this.shakeAmp = Math.max(this.shakeAmp, 3 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_SNAKE_COLOR, 0.14, 0.07);
    }
  }

  private onPinwheelDamaged(x: number, y: number): void {
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.3), 0xcc44ff, 0.8, 0.5);
    this.shakeAmp = Math.max(this.shakeAmp, 3 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_PINWHEEL_COLOR, 0.15, 0.07);
    }
  }

  private killPinwheel(i: number, x: number, y: number): void {
    const cfg = config.enemies.pinwheel;
    this.pinwheels.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    // Triple burst — hub core + outer ring + white spark.
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 1.5), 0xcc44ff, 1.2, 1.0);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.8), 0xee88ff, 1.8, 0.7);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.4), 0xffffff, 2.2, 0.4);
    this.grid.push(x, y, config.grid.explosionInfluence * 1.3, config.grid.influenceRadius * 1.2);
    this.shakeAmp = Math.max(this.shakeAmp, 10 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_PINWHEEL_COLOR, 0.45, 0.22);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }
    events.emit('kill', { x, y, r: 0.8, g: 0.27, b: 1, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private killSnake(i: number, x: number, y: number): void {
    const cfg = config.enemies.snake;
    this.snakes.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 1.4), 0x00ffaa, 1.1, 1.0);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.5), 0xffffff, 1.6, 0.6);
    this.grid.push(x, y, config.grid.explosionInfluence * 1.2, config.grid.influenceRadius);
    this.shakeAmp = Math.max(this.shakeAmp, 8 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_SNAKE_COLOR, 0.4, 0.2);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }
    events.emit('kill', { x, y, r: 0, g: 1, b: 0.67, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private killShard(i: number, x: number, y: number): void {
    const cfg = config.enemies.shard;
    this.shards.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.6), 0xff8800, 1.0, 0.7);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.2), 0xffffff, 1.4, 0.4);
    this.grid.push(x, y, config.grid.explosionInfluence * 0.6, config.grid.influenceRadius * 0.8);
    this.shakeAmp = Math.max(this.shakeAmp, 4 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_SHARD_COLOR, 0.22, 0.1);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    events.emit('kill', { x, y, r: 1, g: 0.53, b: 0, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private killWanderer(i: number, x: number, y: number): void {
    const cfg = config.enemies.wanderer;
    this.wanderers.releaseAt(i);
    this.score.onKill(cfg.pointValue);
    this.particles.burst(x, y, config.juice.particlesPerKill, 0xff2bd6, 1, 1);
    this.particles.burst(x, y, Math.floor(config.juice.particlesPerKill * 0.4), 0xffffff, 1.4, 0.6);
    this.grid.push(x, y, config.grid.explosionInfluence, config.grid.influenceRadius);
    this.shakeAmp = Math.max(this.shakeAmp, 6 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_KILL_COLOR, FLASH_KILL_ALPHA, FLASH_KILL_DURATION);
    }
    if (config.juice.hitstopMs > 0) {
      const frames = Math.max(1, Math.round(config.juice.hitstopMs / (TIMING.SIM_DT * 1000)));
      this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }
    if (config.juice.slowMoOnBigKill && this.score.multiplier >= SLOW_MO_MULT_THRESHOLD) {
      this.timeScale = SLOW_MO_SCALE;
      this.slowMoTimer = SLOW_MO_DURATION;
    }
    events.emit('kill', { x, y, r: 1, g: 0.17, b: 0.84, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private killGrunt(i: number, x: number, y: number): void {
    const cfg = config.enemies.grunt;
    this.grunts.releaseAt(i);
    this.score.onKill(cfg.pointValue);
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
    events.emit('kill', { x, y, r: 1, g: 0.47, b: 0, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private killWeaver(i: number, x: number, y: number): void {
    const cfg = config.enemies.weaver;
    this.weavers.releaseAt(i);
    this.score.onKill(cfg.pointValue);
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
    events.emit('kill', { x, y, r: 0.67, g: 1, b: 0, pointValue: cfg.pointValue, multiplier: this.score.multiplier });
  }

  private onPlayerHit(ex: number, ey: number): void {
    this.lives--;
    const ps = this.player.state;

    // Kick multiplier, keep score.
    this.score.resetMultiplier();

    ps.vx = 0;
    ps.vy = 0;
    ps.x = this.renderer.viewport.halfW;
    ps.y = this.renderer.viewport.halfH;

    this.particles.burst(ex, ey, 200, 0xffffff, 1.2, 1.2);
    this.grid.push(ex, ey, config.grid.explosionInfluence * 1.5, config.grid.influenceRadius * 1.4);
    this.shakeAmp = Math.max(this.shakeAmp, 14 * config.juice.screenShakeIntensity);
    if (config.juice.screenFlash) {
      this.flash.flash(FLASH_HIT_COLOR, FLASH_HIT_ALPHA, FLASH_HIT_DURATION);
    }
    this.timeScale = 1;
    this.slowMoTimer = 0;
    events.emit('playerHit', { x: ex, y: ey, livesRemaining: this.lives });

    if (this.lives <= 0) {
      // Last life — trigger dramatic death cam.
      ps.alive = false;
      this.gameState = 'dying';
      this.deathCamTimer = DEATH_CAM_DURATION;
      this.shakeAmp = Math.max(this.shakeAmp, 28 * config.juice.screenShakeIntensity);
      this.particles.burst(ps.x, ps.y, 500, 0xffffff, 2.0, 1.5);
      this.particles.burst(ps.x, ps.y, 300, 0x00fff7, 1.5, 1.2);
      if (config.juice.screenFlash) {
        this.flash.flash(FLASH_HIT_COLOR, 0.85, 0.6);
      }
    } else {
      this.invincTimer = INVINC_DURATION;
    }
  }
}
