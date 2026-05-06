import type { Viewport } from '../../types';
import { config } from '../../config';
import type { ControlSchemeImpl, InputState } from '../controls';
import { clamp } from '../../engine/math';

/**
 * Default v1 scheme.
 *
 * - Touch *anywhere* on screen to begin a drag (the entire screen is the
 *   left-stick, in effect, which sidesteps the problem of where to put the
 *   stick on phones of different shapes).
 * - The drag origin "follows" the thumb if the thumb moves far away — we
 *   relocate the origin so the magnitude vector stays bounded.
 * - Movement vector = (touch - origin), normalised against `fullTiltPx`.
 * - Aim is auto: the player module aims at the nearest enemy each tick.
 * - Fire is implicit while moving (config.controls.autoFire).
 *
 * Mouse is also handled for desktop dev convenience.
 */
export class SingleThumbAutoAimScheme implements ControlSchemeImpl {
  private host: HTMLElement | null = null;
  private originX = 0;
  private originY = 0;
  private touchX = 0;
  private touchY = 0;
  private active = false;
  /** Active touch identifier, or -1 for mouse. -2 for none. */
  private touchId = -2;
  private boundDown = (e: PointerEvent) => this.onDown(e);
  private boundMove = (e: PointerEvent) => this.onMove(e);
  private boundUp = (e: PointerEvent) => this.onUp(e);

  attach(host: HTMLElement, _viewport: Viewport): void {
    this.host = host;
    host.addEventListener('pointerdown', this.boundDown, { passive: false });
    host.addEventListener('pointermove', this.boundMove, { passive: false });
    host.addEventListener('pointerup', this.boundUp, { passive: false });
    host.addEventListener('pointercancel', this.boundUp, { passive: false });
    host.addEventListener('pointerleave', this.boundUp, { passive: false });
  }

  detach(): void {
    if (!this.host) return;
    this.host.removeEventListener('pointerdown', this.boundDown);
    this.host.removeEventListener('pointermove', this.boundMove);
    this.host.removeEventListener('pointerup', this.boundUp);
    this.host.removeEventListener('pointercancel', this.boundUp);
    this.host.removeEventListener('pointerleave', this.boundUp);
    this.host = null;
    this.active = false;
    this.touchId = -2;
  }

  private onDown(e: PointerEvent): void {
    // First touch wins. Multi-touch is reserved for future menu gestures.
    if (this.active) return;
    this.active = true;
    this.touchId = e.pointerType === 'mouse' ? -1 : e.pointerId;
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.touchX = e.clientX;
    this.touchY = e.clientY;
    e.preventDefault();
  }

  private onMove(e: PointerEvent): void {
    if (!this.active) return;
    if (e.pointerType !== 'mouse' && e.pointerId !== this.touchId) return;
    this.touchX = e.clientX;
    this.touchY = e.clientY;
    // Re-anchor origin if the touch has drifted past fullTilt — keeps the
    // stick "under" the thumb, classic mobile follow-stick behaviour.
    const dx = this.touchX - this.originX;
    const dy = this.touchY - this.originY;
    const full = config.controls.fullTiltPx;
    const len = Math.hypot(dx, dy);
    if (len > full) {
      const k = (len - full) / len;
      this.originX += dx * k;
      this.originY += dy * k;
    }
  }

  private onUp(e: PointerEvent): void {
    if (!this.active) return;
    if (e.pointerType !== 'mouse' && e.pointerId !== this.touchId) return;
    this.active = false;
    this.touchId = -2;
  }

  read(state: InputState): void {
    if (!this.active) {
      state.moveX = 0;
      state.moveY = 0;
      state.hasAim = false;
      state.fire = false;
      return;
    }
    const dx = this.touchX - this.originX;
    const dy = this.touchY - this.originY;
    const len = Math.hypot(dx, dy);
    const dead = config.controls.deadZonePx;
    const full = config.controls.fullTiltPx;
    if (len <= dead) {
      state.moveX = 0;
      state.moveY = 0;
    } else {
      const t = clamp((len - dead) / (full - dead), 0, 1);
      const ux = dx / len;
      const uy = dy / len;
      state.moveX = ux * t;
      state.moveY = uy * t;
    }
    // No explicit aim — auto-aim takes over in the world.
    state.hasAim = false;
    state.aimX = 0;
    state.aimY = 0;
    state.fire = config.controls.autoFire;
  }
}
