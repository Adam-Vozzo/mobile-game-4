import { Graphics, BLEND_MODES } from 'pixi.js';
import type { Container } from 'pixi.js';

const PULSE_FREQ = 3.5;
const BASE_RADIUS = 60;
const PULSE_AMP = 10;

export class DangerCloseRing {
  private g: Graphics;
  private halo: Graphics;
  private phase = 0;

  constructor(parent: Container) {
    this.halo = new Graphics();
    this.halo.blendMode = BLEND_MODES.ADD;
    this.halo.visible = false;
    parent.addChild(this.halo);

    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    this.g.visible = false;
    parent.addChild(this.g);
  }

  step(dt: number, active: boolean, px: number, py: number): void {
    if (!active) {
      this.g.visible = false;
      this.halo.visible = false;
      return;
    }
    this.phase = (this.phase + dt * PULSE_FREQ * Math.PI * 2) % (Math.PI * 2);
    const pulse = Math.sin(this.phase);
    const r = BASE_RADIUS + pulse * PULSE_AMP;
    const coreAlpha = 0.7 + 0.3 * pulse;
    const haloAlpha = 0.18 + 0.12 * Math.max(0, pulse);

    this.halo.clear();
    this.halo.lineStyle(6, 0xff2bd6, haloAlpha);
    this.halo.drawCircle(0, 0, r + 6);
    this.halo.x = px;
    this.halo.y = py;
    this.halo.visible = true;

    this.g.clear();
    this.g.lineStyle(1.5, 0xffff66, coreAlpha);
    this.g.drawCircle(0, 0, r);
    this.g.x = px;
    this.g.y = py;
    this.g.visible = true;
  }

  clear(): void {
    this.g.visible = false;
    this.halo.visible = false;
    this.phase = 0;
  }
}
