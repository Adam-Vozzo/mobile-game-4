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

export function drawGrunt(g: Graphics, color = 0xff7700): void {
  g.clear();
  const r = 16;
  g.lineStyle({ width: 8, color, alpha: 0.18 });
  triangle(g, r);
  g.lineStyle({ width: 4, color, alpha: 0.48 });
  triangle(g, r);
  g.lineStyle({ width: 1.5, color: 0xffffff, alpha: 1 });
  triangle(g, r);
}

function triangle(g: Graphics, r: number): void {
  g.moveTo(r, 0);
  g.lineTo(-r * 0.55, -r * 0.95);
  g.lineTo(-r * 0.55, r * 0.95);
  g.lineTo(r, 0);
}

export function drawWeaver(g: Graphics, color = 0xaaff00): void {
  g.clear();
  const r = 11;
  g.lineStyle({ width: 6, color, alpha: 0.16 });
  chevron(g, r);
  g.lineStyle({ width: 3, color, alpha: 0.5 });
  chevron(g, r);
  g.lineStyle({ width: 1.25, color: 0xffffff, alpha: 1 });
  chevron(g, r);
}

function chevron(g: Graphics, r: number): void {
  g.moveTo(r, 0);
  g.lineTo(-r * 0.6, -r * 0.9);
  g.moveTo(r, 0);
  g.lineTo(-r * 0.6, r * 0.9);
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

export function drawBlackHoleOuter(g: Graphics): void {
  g.clear();
  const r = 22;
  // Faint gravity-well halos hint at the influence radius.
  g.lineStyle({ width: 16, color: 0x5500bb, alpha: 0.05 });
  g.drawCircle(0, 0, r * 6.5);
  g.lineStyle({ width: 10, color: 0x6622cc, alpha: 0.09 });
  g.drawCircle(0, 0, r * 4);
  // Outer orbit arcs — 3 segments, rotate CW.
  g.lineStyle({ width: 3, color: 0x8833ff, alpha: 0.62 });
  g.arc(0, 0, r * 2.5, 0, Math.PI * 0.45);
  g.arc(0, 0, r * 2.5, Math.PI * 0.75, Math.PI * 1.2);
  g.arc(0, 0, r * 2.5, Math.PI * 1.5, Math.PI * 1.92);
  // Core orb — filled, additive violet glow.
  g.lineStyle({ width: 8, color: 0xaa44ff, alpha: 0.25 });
  g.beginFill(0x4400aa, 0.65);
  g.drawCircle(0, 0, r);
  g.endFill();
  // Bright event-horizon ring.
  g.lineStyle({ width: 2, color: 0xee88ff, alpha: 1 });
  g.drawCircle(0, 0, r);
}

export function drawBlackHoleInner(g: Graphics): void {
  g.clear();
  const r = 22;
  // Inner orbit arcs — 3 segments, counter-rotate CCW at a faster rate.
  g.lineStyle({ width: 2, color: 0xff99ff, alpha: 0.72 });
  g.arc(0, 0, r * 1.68, 0, Math.PI * 0.5);
  g.arc(0, 0, r * 1.68, Math.PI * 0.85, Math.PI * 1.35);
  g.arc(0, 0, r * 1.68, Math.PI * 1.7, Math.PI * 2.0);
}

export function drawSplitter(g: Graphics, color = 0xffdd00): void {
  g.clear();
  const r = 14;
  g.lineStyle({ width: 8, color, alpha: 0.18 });
  square(g, r);
  g.lineStyle({ width: 4, color, alpha: 0.48 });
  square(g, r);
  g.lineStyle({ width: 1.5, color: 0xffffff, alpha: 1 });
  square(g, r);
}

function square(g: Graphics, r: number): void {
  g.moveTo(-r, -r);
  g.lineTo(r, -r);
  g.lineTo(r, r);
  g.lineTo(-r, r);
  g.lineTo(-r, -r);
}

export function drawShard(g: Graphics, color = 0xff8800): void {
  g.clear();
  const r = 8;
  g.lineStyle({ width: 5, color, alpha: 0.2 });
  dart(g, r);
  g.lineStyle({ width: 2.5, color, alpha: 0.55 });
  dart(g, r);
  g.lineStyle({ width: 1, color: 0xffffff, alpha: 1 });
  dart(g, r);
}

function dart(g: Graphics, r: number): void {
  g.moveTo(r * 1.3, 0);
  g.lineTo(-r, -r * 0.6);
  g.lineTo(-r * 0.3, 0);
  g.lineTo(-r, r * 0.6);
  g.lineTo(r * 1.3, 0);
}

export function drawSnakeHead(g: Graphics, color = 0x00ffaa): void {
  g.clear();
  const r = 13;
  g.lineStyle({ width: 8, color, alpha: 0.16 });
  snakeArrow(g, r);
  g.lineStyle({ width: 4, color, alpha: 0.5 });
  snakeArrow(g, r);
  g.lineStyle({ width: 1.5, color: 0xffffff, alpha: 1 });
  snakeArrow(g, r);
}

function snakeArrow(g: Graphics, r: number): void {
  g.moveTo(r * 1.4, 0);
  g.lineTo(-r, -r * 0.65);
  g.lineTo(-r * 0.35, 0);
  g.lineTo(-r, r * 0.65);
  g.lineTo(r * 1.4, 0);
}

export function drawSnakeSegment(g: Graphics, segIndex: number, totalSegs: number, color = 0x00ffaa): void {
  g.clear();
  const t = totalSegs > 1 ? segIndex / (totalSegs - 1) : 0;
  const r = Math.round(10 - t * 5); // 10 near head → 5 at tail
  g.lineStyle({ width: 7, color, alpha: 0.12 - t * 0.06 });
  g.drawCircle(0, 0, r);
  g.lineStyle({ width: 3, color, alpha: 0.4 - t * 0.2 });
  g.drawCircle(0, 0, r);
  g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.9 - t * 0.4 });
  g.drawCircle(0, 0, r);
}

export function drawPinwheelHub(g: Graphics, color = 0xcc44ff): void {
  g.clear();
  g.lineStyle({ width: 8, color, alpha: 0.14 });
  star6(g, 14, 7);
  g.lineStyle({ width: 3, color, alpha: 0.52 });
  star6(g, 14, 7);
  g.lineStyle({ width: 1.25, color: 0xffffff, alpha: 1 });
  star6(g, 14, 7);
}

export function drawPinwheelDrone(g: Graphics, color = 0xee88ff): void {
  g.clear();
  const r = 8;
  g.lineStyle({ width: 6, color, alpha: 0.16 });
  g.drawCircle(0, 0, r);
  g.lineStyle({ width: 2.5, color, alpha: 0.5 });
  g.drawCircle(0, 0, r);
  g.lineStyle({ width: 1, color: 0xffffff, alpha: 1 });
  g.drawCircle(0, 0, r);
}

function star6(g: Graphics, outerR: number, innerR: number): void {
  for (let i = 0; i <= 12; i++) {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
}
