import { Graphics, Container, BLEND_MODES } from 'pixi.js';
import { config } from '../config';
import type { Viewport } from '../types';

/**
 * Spring-mass deformable grid. Each grid point is pulled toward its rest
 * position by a spring and damped each tick. Player and explosions push
 * nearby points outward (push) and toward (pull) respectively.
 *
 * Drawn as faint additive lines. Sparse enough to read silhouette of the
 * player, dense enough for the deformation to register.
 */

export interface GridPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rx: number; // rest x
  ry: number; // rest y
}

export class ReactiveGrid {
  cols = 0;
  rows = 0;
  cellW = 0;
  cellH = 0;
  points: GridPoint[] = [];
  private g: Graphics;

  constructor(parent: Container) {
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    parent.addChild(this.g);
  }

  layout(viewport: Viewport): void {
    const cfg = config.grid;
    // Aim for ~cfg.colsTarget cols at the current aspect; tweak rows from cell size.
    const cellW = viewport.width / cfg.colsTarget;
    const cellH = cellW; // square cells
    const cols = Math.ceil(viewport.width / cellW) + 1;
    const rows = Math.ceil(viewport.height / cellH) + 1;
    this.cellW = cellW;
    this.cellH = cellH;
    this.cols = cols;
    this.rows = rows;

    this.points = new Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const rx = i * cellW;
        const ry = j * cellH;
        this.points[j * cols + i] = { x: rx, y: ry, vx: 0, vy: 0, rx, ry };
      }
    }
  }

  /** Push points away from (x,y) (e.g., explosions). */
  push(x: number, y: number, strength: number, radius?: number): void {
    const r = radius ?? config.grid.influenceRadius;
    const r2 = r * r;
    const reactivity = config.juice.gridReactivity;
    const points = this.points;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const dx = p.x - x;
      const dy = p.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / r) * strength * reactivity;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    }
  }

  /** Pull points toward (x,y) (e.g., player presence). */
  pull(x: number, y: number, strength: number, radius?: number): void {
    const r = radius ?? config.grid.influenceRadius;
    const r2 = r * r;
    const reactivity = config.juice.gridReactivity;
    const points = this.points;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const dx = x - p.x;
      const dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / r) * strength * reactivity;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    }
  }

  step(dt: number): void {
    const cfg = config.grid;
    const k = cfg.spring;
    const c = cfg.damping;
    const points = this.points;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const ax = (p.rx - p.x) * k - p.vx * c;
      const ay = (p.ry - p.y) * k - p.vy * c;
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(): void {
    const g = this.g;
    g.clear();
    if (this.points.length === 0) return;
    // Two colour stops based on displacement magnitude — calmer cyan when
    // resting, hotter when distorted. Drawn as thin additive lines.
    g.lineStyle({ width: 1, color: 0x0d3b66, alpha: 0.32 });
    const cols = this.cols;
    const rows = this.rows;
    for (let j = 0; j < rows; j++) {
      const rowOff = j * cols;
      for (let i = 0; i < cols - 1; i++) {
        const a = this.points[rowOff + i]!;
        const b = this.points[rowOff + i + 1]!;
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows - 1; j++) {
        const a = this.points[j * cols + i]!;
        const b = this.points[(j + 1) * cols + i]!;
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
    }

    // Pass 2 — only highly-displaced segments, hotter colour, additive halo.
    const threshold = 6; // pixels displaced
    const t2 = threshold * threshold;
    g.lineStyle({ width: 2, color: 0x00fff7, alpha: 0.5 });
    for (let j = 0; j < rows; j++) {
      const rowOff = j * cols;
      for (let i = 0; i < cols - 1; i++) {
        const a = this.points[rowOff + i]!;
        const b = this.points[rowOff + i + 1]!;
        if (
          this.dispSq(a) > t2 ||
          this.dispSq(b) > t2
        ) {
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
        }
      }
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows - 1; j++) {
        const a = this.points[j * cols + i]!;
        const b = this.points[(j + 1) * cols + i]!;
        if (this.dispSq(a) > t2 || this.dispSq(b) > t2) {
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
        }
      }
    }
  }

  private dispSq(p: GridPoint): number {
    const dx = p.x - p.rx;
    const dy = p.y - p.ry;
    return dx * dx + dy * dy;
  }
}
