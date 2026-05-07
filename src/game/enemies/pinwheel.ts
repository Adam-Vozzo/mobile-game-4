import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { Pool } from '../../engine/pool';
import { defaultRng } from '../../engine/rng';
import { config } from '../../config';
import { drawPinwheelHub, drawPinwheelDrone } from '../../render/ships';

const DRONE_COUNT = 3;
// Pool cap = maxConcurrent * 2 for headroom during swap-on-release.
const PINWHEEL_CAP = 4;

export interface PinwheelInst {
  g: Graphics;
  droneGs: [Graphics, Graphics, Graphics];
  x: number;
  y: number;
  vx: number;
  vy: number;
  orbitAngle: number;
  hp: number;
}

export class Pinwheels {
  readonly pool: Pool<PinwheelInst>;

  constructor(parent: Container) {
    this.pool = new Pool<PinwheelInst>(PINWHEEL_CAP, () => {
      const g = new Graphics();
      g.blendMode = BLEND_MODES.ADD;
      drawPinwheelHub(g);
      g.visible = false;
      parent.addChild(g);

      const droneGs: [Graphics, Graphics, Graphics] = [
        new Graphics(),
        new Graphics(),
        new Graphics(),
      ];
      for (const dg of droneGs) {
        dg.blendMode = BLEND_MODES.ADD;
        drawPinwheelDrone(dg);
        dg.visible = false;
        parent.addChild(dg);
      }

      return { g, droneGs, x: 0, y: 0, vx: 0, vy: 0, orbitAngle: 0, hp: 0 };
    });
  }

  spawn(x: number, y: number): void {
    const e = this.pool.acquire();
    if (!e) return;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.orbitAngle = defaultRng.next() * Math.PI * 2;
    e.hp = config.enemies.pinwheel.hp;
    e.g.x = x;
    e.g.y = y;
    e.g.rotation = 0;
    e.g.visible = true;
    for (const dg of e.droneGs) dg.visible = true;
    this._placeDrones(e);
  }

  step(dt: number, worldW: number, worldH: number, playerX: number, playerY: number): void {
    const cfg = config.enemies.pinwheel;
    const items = this.pool.items;
    for (let i = 0; i < this.pool.size; i++) {
      const e = items[i]!;

      // Drift toward player.
      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const tx = (dx / dist) * cfg.speed;
      const ty = (dy / dist) * cfg.speed;
      e.vx += (tx - e.vx) * Math.min(1, 1.5 * dt);
      e.vy += (ty - e.vy) * Math.min(1, 1.5 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Keep hub + full orbit extent inside world bounds.
      const margin = cfg.hubRadius + cfg.orbitRadius + cfg.droneRadius;
      if (e.x < margin) { e.x = margin; e.vx = Math.abs(e.vx); }
      else if (e.x > worldW - margin) { e.x = worldW - margin; e.vx = -Math.abs(e.vx); }
      if (e.y < margin) { e.y = margin; e.vy = Math.abs(e.vy); }
      else if (e.y > worldH - margin) { e.y = worldH - margin; e.vy = -Math.abs(e.vy); }

      // Advance orbit; hub counter-rotates for visual contrast.
      e.orbitAngle += cfg.orbitSpeed * dt;
      e.g.x = e.x;
      e.g.y = e.y;
      e.g.rotation -= cfg.orbitSpeed * 0.4 * dt;

      this._placeDrones(e);
    }
  }

  private _placeDrones(e: PinwheelInst): void {
    const orbitR = config.enemies.pinwheel.orbitRadius;
    for (let i = 0; i < DRONE_COUNT; i++) {
      const angle = e.orbitAngle + (i * Math.PI * 2) / DRONE_COUNT;
      const dg = e.droneGs[i]!;
      dg.x = e.x + Math.cos(angle) * orbitR;
      dg.y = e.y + Math.sin(angle) * orbitR;
    }
  }

  /** Returns true if the pinwheel is now dead. */
  damage(i: number): boolean {
    const e = this.pool.items[i];
    if (!e) return false;
    e.hp--;
    return e.hp <= 0;
  }

  releaseAt(i: number): void {
    const e = this.pool.items[i];
    if (!e) return;
    e.g.visible = false;
    for (const dg of e.droneGs) dg.visible = false;
    this.pool.releaseAt(i);
  }

  releaseAll(): void {
    for (let i = this.pool.size - 1; i >= 0; i--) this.releaseAt(i);
  }

  get count(): number {
    return this.pool.size;
  }
}
