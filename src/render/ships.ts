import { Graphics } from 'pixi.js';

/**
 * Vector ship draw helpers. All shapes are open polylines, drawn with stacked
 * half-alpha strokes to approximate bloom without a full post-process pass.
 *
 * Pixi `Graphics.lineStyle` is sticky for the next path, so each layer needs
 * its own `lineStyle` call. We keep the strokes simple — outer halo, mid
 * stroke, inner core.
 */
export function drawPlayerShip(g: Graphics, color = 0x00fff7): void {
  g.clear();
  // Triangle pointing +x; main module rotates the Graphics container.
  // r is roughly the visual radius matching config.player.radius.
  const r = 14;

  // Outer halo
  g.lineStyle({ width: 8, color, alpha: 0.18, alignment: 0.5 });
  ship(g, r);
  // Mid
  g.lineStyle({ width: 4, color, alpha: 0.45, alignment: 0.5 });
  ship(g, r);
  // Core
  g.lineStyle({ width: 1.5, color: 0xffffff, alpha: 1, alignment: 0.5 });
  ship(g, r);
}

function ship(g: Graphics, r: number): void {
  g.moveTo(r * 1.1, 0);
  g.lineTo(-r * 0.9, -r * 0.85);
  g.lineTo(-r * 0.45, 0);
  g.lineTo(-r * 0.9, r * 0.85);
  g.lineTo(r * 1.1, 0);
}

export function drawWanderer(g: Graphics, color = 0xff2bd6): void {
  g.clear();
  const r = 14;
  // Outer halo
  g.lineStyle({ width: 7, color, alpha: 0.16 });
  diamond(g, r);
  // Mid
  g.lineStyle({ width: 3, color, alpha: 0.5 });
  diamond(g, r);
  // Core
  g.lineStyle({ width: 1.25, color: 0xffffff, alpha: 1 });
  diamond(g, r);
}

function diamond(g: Graphics, r: number): void {
  g.moveTo(r, 0);
  g.lineTo(0, -r);
  g.lineTo(-r, 0);
  g.lineTo(0, r);
  g.lineTo(r, 0);
}

export function drawBullet(g: Graphics, color = 0x00fff7): void {
  g.clear();
  // Stretched bullet drawn along +x; rotated by container.
  const len = 14;
  const half = 1.5;
  // halo
  g.lineStyle({ width: 6, color, alpha: 0.25 });
  bulletPath(g, len, half);
  g.lineStyle({ width: 3, color, alpha: 0.6 });
  bulletPath(g, len, half);
  g.lineStyle({ width: 1, color: 0xffffff, alpha: 1 });
  bulletPath(g, len, half);
}

function bulletPath(g: Graphics, len: number, half: number): void {
  g.moveTo(-len * 0.5, -half);
  g.lineTo(len * 0.5, -half);
  g.moveTo(-len * 0.5, half);
  g.lineTo(len * 0.5, half);
}
