import { Graphics, BLEND_MODES } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { Viewport } from '../types';
import { config } from '../config';

const VIGNETTE_COLOR = 0xff0030;
const EDGE_WIDTH = 48;
const OVERSHOOT = 60;
const PULSE_HZ = 1.5;
const ALPHA_MIN = 0.12;
const ALPHA_MAX = 0.58;
const RISE_SPEED = 2.5;
const DECAY_SPEED = 2.0;

/**
 * Persistent crimson screen-edge vignette that pulses when the player is on
 * their last life. Distinct from the orange surge glow (different colour,
 * slower pulse, different trigger) and the per-hit flash (persistent, not
 * one-shot).
 */
export class DangerVignette {
  private readonly g: Graphics;
  private intensity = 0;
  private phase = 0;
  private lastVpWidth = 0;
  private lastVpHeight = 0;

  constructor(layer: Container) {
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    this.g.alpha = 0;
    layer.addChild(this.g);
  }

  step(dt: number, lives: number, vp: Viewport): void {
    const danger = config.juice.dangerVignette && lives === 1;

    if (danger) {
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
    // Half-rectified sine, squared — sharp beats with clear silence between.
    const raw = Math.max(0, Math.sin(this.phase));
    const pulse = raw * raw;
    this.g.alpha = (ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * pulse) * this.intensity;
  }

  clear(): void {
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
    this.g.beginFill(VIGNETTE_COLOR, 1);
    this.g.drawRect(-o, -o, w + o * 2, e + o);
    this.g.drawRect(-o, h - e, w + o * 2, e + o);
    this.g.drawRect(-o, e, e + o, h - e * 2);
    this.g.drawRect(w - e, e, e + o, h - e * 2);
    this.g.endFill();
  }
}
