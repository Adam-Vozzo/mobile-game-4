import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { config } from '../config';
import { drawPlayerShip } from '../render/ships';
import { clamp, length } from '../engine/math';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** facing in radians. Aim is decoupled from velocity. */
  facing: number;
  fireCooldown: number;
  alive: boolean;
}

export class Player {
  readonly state: PlayerState;
  private g: Graphics;

  constructor(parent: Container, x: number, y: number) {
    this.state = {
      x,
      y,
      vx: 0,
      vy: 0,
      facing: 0,
      fireCooldown: 0,
      alive: true,
    };
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    drawPlayerShip(this.g);
    parent.addChild(this.g);
  }

  /** Apply movement input — `mx,my` in [-1..1]. Pure simulation. */
  applyMove(dt: number, mx: number, my: number): void {
    const cfg = config.player;
    const ax = mx * cfg.accel;
    const ay = my * cfg.accel;
    this.state.vx += ax * dt;
    this.state.vy += ay * dt;

    // Drag (exponential)
    const dragK = Math.max(0, 1 - cfg.drag * dt);
    this.state.vx *= dragK;
    this.state.vy *= dragK;

    // Clamp speed
    const sp = length(this.state.vx, this.state.vy);
    if (sp > cfg.maxSpeed) {
      const k = cfg.maxSpeed / sp;
      this.state.vx *= k;
      this.state.vy *= k;
    }

    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;
  }

  clampToWorld(worldW: number, worldH: number): void {
    const r = config.player.radius;
    this.state.x = clamp(this.state.x, r, worldW - r);
    this.state.y = clamp(this.state.y, r, worldH - r);
    if (this.state.x === r || this.state.x === worldW - r) this.state.vx = 0;
    if (this.state.y === r || this.state.y === worldH - r) this.state.vy = 0;
  }

  setFacing(rad: number): void {
    this.state.facing = rad;
  }

  /** Tick the fire cooldown, return true if a new shot is ready. */
  consumeFireTick(dt: number, wantFire: boolean): boolean {
    this.state.fireCooldown -= dt;
    if (!wantFire) return false;
    if (this.state.fireCooldown > 0) return false;
    this.state.fireCooldown += 1 / config.player.fireRatePerSecond;
    if (this.state.fireCooldown < 0) this.state.fireCooldown = 0;
    return true;
  }

  render(): void {
    this.g.x = this.state.x;
    this.g.y = this.state.y;
    this.g.rotation = this.state.facing;
    this.g.visible = this.state.alive;
  }
}
