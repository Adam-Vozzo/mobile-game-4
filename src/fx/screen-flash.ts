import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';

/**
 * Full-screen color flash that fades out over a short duration.
 * One Graphics quad, recolored per-flash. Redraws only when color changes.
 */
export class ScreenFlash {
  private readonly g: Graphics;
  private alpha = 0;
  private decayRate = 0;
  private currentColor = -1;

  constructor(layer: Container) {
    this.g = new Graphics();
    this.g.alpha = 0;
    layer.addChild(this.g);
  }

  /** Trigger a flash. Color as 0xRRGGBB, startAlpha in [0,1], durationS > 0. */
  flash(color: number, startAlpha: number, durationS: number): void {
    if (color !== this.currentColor) {
      this.currentColor = color;
      this.g.clear();
      this.g.beginFill(color, 1);
      // Oversized rect — covers any viewport without resize bookkeeping.
      this.g.drawRect(-1024, -512, 8192, 4096);
      this.g.endFill();
    }
    this.alpha = startAlpha;
    this.decayRate = startAlpha / Math.max(0.001, durationS);
    this.g.alpha = startAlpha;
  }

  step(dt: number): void {
    if (this.alpha <= 0) return;
    this.alpha = Math.max(0, this.alpha - this.decayRate * dt);
    this.g.alpha = this.alpha;
  }

  clear(): void {
    this.alpha = 0;
    this.g.alpha = 0;
  }
}
