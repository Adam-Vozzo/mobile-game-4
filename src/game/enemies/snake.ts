import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawSnakeHead, drawSnakeSegment } from '../../render/ships';

// Ring buffer length — must exceed (segmentCount+1) * ceil(segmentGap/STEP_DIST).
const HISTORY_SIZE = 512;
// Distance between history samples in pixels.
const STEP_DIST = 4;

const SNAKE_CAP = 3;

export interface SnakeInst {
  headG: Graphics;
  segGs: Graphics[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  wobbleTimer: number;
  hp: number;
  /** Ring buffer of sampled head positions (written every STEP_DIST px of travel). */
  histX: Float32Array;
  histY: Float32Array;
  /** Write pointer into the ring buffer (points to the most-recently written slot). */
  histPtr: number;
  /** Accumulated distance since the last history sample was pushed. */
  distAccum: number;
}

export class Snakes {
  readonly pool: Pool<SnakeInst>;

  constructor(parent: Container) {
    const segCount = config.enemies.snake.segmentCount;
    this.pool = new Pool<SnakeInst>(SNAKE_CAP, () => {
      const headG = new Graphics();
      headG.blendMode = BLEND_MODES.ADD;
      drawSnakeHead(headG);
      headG.visible = false;
      parent.addChild(headG);

      const segGs: Graphics[] = [];
      for (let s = 0; s < segCount; s++) {
        const sg = new Graphics();
        sg.blendMode = BLEND_MODES.ADD;
        drawSnakeSegment(sg, s, segCount);
        sg.visible = false;
        parent.addChild(sg);
        segGs.push(sg);
      }

      return {
        headG,
        segGs,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        heading: 0,
        wobbleTimer: 0,
        hp: 0,
        histX: new Float32Array(HISTORY_SIZE),
        histY: new Float32Array(HISTORY_SIZE),
        histPtr: 0,
        distAccum: 0,
      };
    });
  }

  spawn(x: number, y: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    e.x = x;
    e.y = y;
    e.heading = defaultRng.next() * Math.PI * 2;
    const spd = config.enemies.snake.speed;
    e.vx = Math.cos(e.heading) * spd;
    e.vy = Math.sin(e.heading) * spd;
    e.wobbleTimer = defaultRng.range(0.8, 1.8);
    e.hp = config.enemies.snake.hp;
    e.histPtr = 0;
    e.distAccum = 0;
    // Pre-seed history so segments start at the spawn point.
    e.histX.fill(x);
    e.histY.fill(y);

    e.headG.x = x;
    e.headG.y = y;
    e.headG.rotation = e.heading;
    e.headG.visible = true;
    for (let s = 0; s < config.enemies.snake.segmentCount; s++) {
      e.segGs[s]!.x = x;
      e.segGs[s]!.y = y;
      e.segGs[s]!.visible = true;
    }
  }

  step(dt: number, worldW: number, worldH: number, playerX: number, playerY: number): void {
    const cfg = config.enemies.snake;
    const gapPts = Math.max(1, Math.round(cfg.segmentGap / STEP_DIST));

    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;

      // Steering: periodically snap heading toward player or add a random wobble.
      e.wobbleTimer -= dt;
      if (e.wobbleTimer <= 0) {
        e.wobbleTimer = defaultRng.range(0.8, 1.8);
        if (defaultRng.next() < 0.55) {
          const dx = playerX - e.x;
          const dy = playerY - e.y;
          e.heading = Math.atan2(dy, dx);
        } else {
          e.heading += defaultRng.unit() * 1.1;
        }
      }

      const tx = Math.cos(e.heading) * cfg.speed;
      const ty = Math.sin(e.heading) * cfg.speed;
      e.vx += (tx - e.vx) * Math.min(1, 2.2 * dt);
      e.vy += (ty - e.vy) * Math.min(1, 2.2 * dt);

      const prevX = e.x;
      const prevY = e.y;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Bounce off walls and redirect heading.
      const r = cfg.radius;
      if (e.x < r) {
        e.x = r;
        e.vx = Math.abs(e.vx);
        e.heading = Math.atan2(e.vy, Math.abs(e.vx));
      } else if (e.x > worldW - r) {
        e.x = worldW - r;
        e.vx = -Math.abs(e.vx);
        e.heading = Math.atan2(e.vy, -Math.abs(e.vx));
      }
      if (e.y < r) {
        e.y = r;
        e.vy = Math.abs(e.vy);
        e.heading = Math.atan2(Math.abs(e.vy), e.vx);
      } else if (e.y > worldH - r) {
        e.y = worldH - r;
        e.vy = -Math.abs(e.vy);
        e.heading = Math.atan2(-Math.abs(e.vy), e.vx);
      }

      // Push a sample into the ring buffer once per STEP_DIST pixels traveled.
      const moveDx = e.x - prevX;
      const moveDy = e.y - prevY;
      e.distAccum += Math.sqrt(moveDx * moveDx + moveDy * moveDy);
      while (e.distAccum >= STEP_DIST) {
        e.distAccum -= STEP_DIST;
        e.histPtr = (e.histPtr + 1) % HISTORY_SIZE;
        e.histX[e.histPtr] = e.x;
        e.histY[e.histPtr] = e.y;
      }

      // Sync head graphic.
      e.headG.x = e.x;
      e.headG.y = e.y;
      e.headG.rotation = Math.atan2(e.vy, e.vx);

      // Position body segments along the history trail.
      for (let s = 0; s < cfg.segmentCount; s++) {
        const lookback = (s + 1) * gapPts;
        const idx = ((e.histPtr - lookback) % HISTORY_SIZE + HISTORY_SIZE) % HISTORY_SIZE;
        const sg = e.segGs[s]!;
        sg.x = e.histX[idx] ?? 0;
        sg.y = e.histY[idx] ?? 0;
      }
    }
  }

  /** Returns true if the snake head is now dead. */
  damage(i: number): boolean {
    const e = this.pool.items[i];
    if (!e) return false;
    e.hp--;
    return e.hp <= 0;
  }

  releaseAt(i: number): void {
    const e = this.pool.items[i];
    if (!e) return;
    e.headG.visible = false;
    for (const sg of e.segGs) sg.visible = false;
    this.pool.releaseAt(i);
  }

  releaseAll(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) this.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
