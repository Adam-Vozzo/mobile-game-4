import { Graphics, BLEND_MODES } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Viewport } from '../types';

const SURGE_COLOR = 0xff3300;
const EDGE_WIDTH = 36;
const OVERSHOOT = 60; // extra px beyond screen edge to cover shake
const PULSE_HZ = 2.5;
const ALPHA_MIN = 0.08;
const ALPHA_MAX = 0.48;
const RISE_SPEED = 5;
const DECAY_SPEED = 1.8;

/**
 * Screen-edge glow that pulses orange-red during Spawn Director surge bursts.
 * Drawn as 4 oversized edge strips with additive blending — doesn't obscure
 * the play area, just tints the border.
 */
export class SurgeGlow {
  private readonly g: Graphics;
  private surging = false;
  private intensity = 0; // 0..1
  private phase = 0;
  private lastVpWidth = 0;
  private lastVpHeight = 0;

  constructor(layer: Container) {
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    this.g.alpha = 0;
    layer.addChild(this.g);
  }

  setSurging(active: boolean): void {
    this.surging = active;
  }

  step(dt: number, vp: Viewport): void {
    if (this.surging) {
      this.intensity = Math.min(1, this.intensity + RISE_SPEED * dt);
    } else {
      this.intensity = Math.max(0, this.intensity - DECAY_SPEED * dt);
    }

    if (this.intensity <= 0) {
      this.g.alpha = 0;
      return;
    }

    if (vp.width !== this.lastVpWidth || vp.height !== this.lastVpHeight) {
      this.redraw(vp);
    }

    this.phase += PULSE_HZ * Math.PI * 2 * dt;
    const pulse = Math.sin(this.phase) * 0.5 + 0.5; // 0..1
    this.g.alpha = (ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * pulse) * this.intensity;
  }

  clear(): void {
    this.surging = false;
    this.intensity = 0;
    this.phase = 0;
    this.g.alpha = 0;
  }

  private redraw(vp: Viewport): void {
    const { width: w, height: h } = vp;
    this.lastVpWidth = w;
    this.lastVpHeight = h;
    const o = OVERSHOOT;
    const e = EDGE_WIDTH;
    this.g.clear();
    this.g.beginFill(SURGE_COLOR, 1);
    // Top
    this.g.drawRect(-o, -o, w + o * 2, e + o);
    // Bottom
    this.g.drawRect(-o, h - e, w + o * 2, e + o);
    // Left (between top and bottom strips)
    this.g.drawRect(-o, e, e + o, h - e * 2);
    // Right
    this.g.drawRect(w - e, e, e + o, h - e * 2);
    this.g.endFill();
  }
}
