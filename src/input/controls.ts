import { config, type ControlScheme } from '../config';
import type { Viewport } from '../types';

/**
 * Control schemes return a per-tick `InputState` that the world systems read.
 * `move{X,Y}` are normalised in [-1..1]. `aim{X,Y}` are a unit vector or zero.
 * `fire` is a request — auto-fire schemes set this true while dragging.
 */
export interface InputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  /** has aim direction this tick (otherwise auto-aim takes over) */
  hasAim: boolean;
  fire: boolean;
}

export interface ControlSchemeImpl {
  attach(host: HTMLElement, viewport: Viewport): void;
  detach(): void;
  read(state: InputState): void;
}

const ZERO_INPUT: InputState = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  hasAim: false,
  fire: false,
};

export class ControlsDispatcher {
  private active: ControlSchemeImpl | null = null;
  private host: HTMLElement | null = null;
  private viewport: Viewport | null = null;
  private currentScheme: ControlScheme = 'single-thumb-autoaim';

  attach(host: HTMLElement, viewport: Viewport, scheme: ControlScheme, factory: (s: ControlScheme) => ControlSchemeImpl): void {
    this.host = host;
    this.viewport = viewport;
    this.currentScheme = scheme;
    this.active = factory(scheme);
    this.active.attach(host, viewport);
  }

  /** Hot-swap to a new scheme without recreating the host. */
  swap(scheme: ControlScheme, factory: (s: ControlScheme) => ControlSchemeImpl): void {
    if (!this.host || !this.viewport) return;
    if (this.active) this.active.detach();
    this.currentScheme = scheme;
    this.active = factory(scheme);
    this.active.attach(this.host, this.viewport);
  }

  read(state: InputState): void {
    Object.assign(state, ZERO_INPUT);
    this.active?.read(state);
    // Apply auto-fire if config says so.
    if (config.controls.autoFire) {
      state.fire = state.fire || (state.moveX !== 0 || state.moveY !== 0);
    }
  }

  get scheme(): ControlScheme {
    return this.currentScheme;
  }
}

export function makeInputState(): InputState {
  return { ...ZERO_INPUT };
}
