import type { Viewport } from '../../types';
import { config } from '../../config';
import { clamp } from '../../engine/math';
import type { ControlSchemeImpl, InputState } from '../controls';
import { isMenuEvent } from '../controls';

/**
 * Classic virtual twin-sticks: left-half = move, right-half = aim/fire.
 * Cramped on phones (the stated design problem with this scheme); ships as a
 * toggle option from the Tweaks Menu so the human can A/B against the v1
 * default (single-thumb auto-aim).
 */
interface Stick {
  active: boolean;
  pointerId: number;
  originX: number;
  originY: number;
  curX: number;
  curY: number;
}

export class VirtualTwinSticksScheme implements ControlSchemeImpl {
  private host: HTMLElement | null = null;
  private viewport: Viewport | null = null;
  private left: Stick = empty();
  private right: Stick = empty();
  private boundDown = (e: PointerEvent) => this.onDown(e);
  private boundMove = (e: PointerEvent) => this.onMove(e);
  private boundUp = (e: PointerEvent) => this.onUp(e);

  attach(host: HTMLElement, viewport: Viewport): void {
    this.host = host;
    this.viewport = viewport;
    host.addEventListener('pointerdown', this.boundDown, { passive: false });
    host.addEventListener('pointermove', this.boundMove, { passive: false });
    host.addEventListener('pointerup', this.boundUp, { passive: false });
    host.addEventListener('pointercancel', this.boundUp, { passive: false });
  }

  detach(): void {
    if (!this.host) return;
    this.host.removeEventListener('pointerdown', this.boundDown);
    this.host.removeEventListener('pointermove', this.boundMove);
    this.host.removeEventListener('pointerup', this.boundUp);
    this.host.removeEventListener('pointercancel', this.boundUp);
    this.host = null;
    this.left = empty();
    this.right = empty();
  }

  private isLeftSide(x: number): boolean {
    if (!this.viewport) return x < window.innerWidth / 2;
    return x < this.viewport.width / 2;
  }

  private onDown(e: PointerEvent): void {
    if (isMenuEvent(e)) return;
    const isLeft = this.isLeftSide(e.clientX);
    const stick = isLeft ? this.left : this.right;
    if (stick.active) return; // ignore secondary touches on same side
    stick.active = true;
    stick.pointerId = e.pointerType === 'mouse' ? -1 : e.pointerId;
    stick.originX = e.clientX;
    stick.originY = e.clientY;
    stick.curX = e.clientX;
    stick.curY = e.clientY;
    e.preventDefault();
  }

  private onMove(e: PointerEvent): void {
    const id = e.pointerType === 'mouse' ? -1 : e.pointerId;
    if (this.left.active && this.left.pointerId === id) {
      this.left.curX = e.clientX;
      this.left.curY = e.clientY;
    } else if (this.right.active && this.right.pointerId === id) {
      this.right.curX = e.clientX;
      this.right.curY = e.clientY;
    }
  }

  private onUp(e: PointerEvent): void {
    const id = e.pointerType === 'mouse' ? -1 : e.pointerId;
    if (this.left.active && this.left.pointerId === id) this.left = empty();
    if (this.right.active && this.right.pointerId === id) this.right = empty();
  }

  read(state: InputState): void {
    state.fire = false;
    state.hasAim = false;
    state.aimX = 0;
    state.aimY = 0;
    state.moveX = 0;
    state.moveY = 0;
    if (this.left.active) {
      const v = stickVec(this.left);
      state.moveX = v.x;
      state.moveY = v.y;
    }
    if (this.right.active) {
      const v = stickVec(this.right);
      const m = Math.hypot(v.x, v.y);
      if (m > 0.05) {
        state.hasAim = true;
        state.aimX = v.x / m;
        state.aimY = v.y / m;
        state.fire = true; // hold-to-fire on the right stick
      }
    }
  }
}

function empty(): Stick {
  return { active: false, pointerId: -2, originX: 0, originY: 0, curX: 0, curY: 0 };
}

function stickVec(s: Stick): { x: number; y: number } {
  const dx = s.curX - s.originX;
  const dy = s.curY - s.originY;
  const len = Math.hypot(dx, dy);
  const dead = config.controls.deadZonePx;
  const full = config.controls.fullTiltPx;
  if (len <= dead) return { x: 0, y: 0 };
  const t = clamp((len - dead) / (full - dead), 0, 1);
  return { x: (dx / len) * t, y: (dy / len) * t };
}
