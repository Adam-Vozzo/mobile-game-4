/**
 * Declarative registry of tweakable values.
 *
 * Each tweak references a property path inside `config`. The Tweaks Menu
 * reads/writes via `get()`/`set()`. Values are typed; the menu renders the
 * appropriate widget per `kind`.
 *
 * Adding a new tweak: add a row here, optionally list it in
 * `LOCKED_PARAMS.md`, and the menu picks it up automatically.
 */
import { config, DEFAULTS, type AppConfig, type ControlScheme } from '../config';

export type TweakKind = 'toggle' | 'select' | 'slider';

export interface TweakBase<T> {
  category: TweakCategory;
  /** dot-path for stable IDs and persistence keys */
  path: string;
  label: string;
  description?: string;
  experimental?: boolean;
  get: () => T;
  set: (v: T) => void;
  default: T;
}

export type TweakCategory = 'controls' | 'visual' | 'audio' | 'flow' | 'debug';

export interface ToggleTweak extends TweakBase<boolean> {
  kind: 'toggle';
}

export interface SelectTweak extends TweakBase<string> {
  kind: 'select';
  options: readonly string[];
}

export interface SliderTweak extends TweakBase<number> {
  kind: 'slider';
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export type Tweak = ToggleTweak | SelectTweak | SliderTweak;

const CONTROL_SCHEMES = ['single-thumb-autoaim', 'virtual-twin-sticks'] as const;

/** Build the tweaks registry. Called once at boot. */
export function buildRegistry(): readonly Tweak[] {
  const reg: Tweak[] = [];

  // CONTROLS
  const schemeTweak: SelectTweak = {
    category: 'controls',
    kind: 'select',
    path: 'controls.scheme',
    label: 'Scheme',
    description: 'Touch input style. Switching takes effect immediately.',
    options: CONTROL_SCHEMES,
    get: () => config.controls.scheme,
    set: (v) => {
      config.controls.scheme = v as ControlScheme;
    },
    default: DEFAULTS.controls.scheme,
  };
  reg.push(schemeTweak);
  reg.push(slider('controls', 'controls.deadZonePx', 'Dead zone', 0, 60, 1, 'px'));
  reg.push(slider('controls', 'controls.fullTiltPx', 'Full-tilt distance', 30, 200, 1, 'px'));
  reg.push(slider('controls', 'controls.autoAimStrength', 'Auto-aim strength', 0, 1, 0.05));
  reg.push(toggle('controls', 'controls.autoFire', 'Auto-fire'));

  // VISUAL JUICE
  reg.push(slider('visual', 'juice.particleDensity', 'Particle density', 0.25, 2.0, 0.05));
  reg.push(slider('visual', 'juice.bloomIntensity', 'Bloom intensity', 0, 2, 0.05));
  reg.push(slider('visual', 'juice.screenShakeIntensity', 'Screen shake', 0, 2, 0.05));
  reg.push(slider('visual', 'juice.gridReactivity', 'Grid reactivity', 0, 2, 0.05));
  reg.push(slider('visual', 'juice.hitstopMs', 'Hitstop on kill', 0, 80, 1, 'ms', true));
  reg.push(toggle('visual', 'juice.slowMoOnBigKill', 'Slow-mo on big kill', true));
  reg.push(toggle('visual', 'juice.screenFlash', 'Screen flash on events', true));

  // AUDIO
  reg.push(toggle('audio', 'audio.sfxEnabled', 'SFX enabled'));
  reg.push(slider('audio', 'audio.sfxVolume', 'SFX volume', 0, 1, 0.05));
  reg.push(toggle('audio', 'audio.musicEnabled', 'Procedural music (128 BPM synthwave)', true));
  reg.push(slider('audio', 'audio.musicVolume', 'Music volume', 0, 1, 0.05));
  reg.push(toggle('audio', 'audio.musicReactivity', 'Music-reactive grid + particles', true));

  // FLOW
  reg.push(slider('flow', 'flow.spawnRateMultiplier', 'Spawn rate', 0.25, 3, 0.05));
  reg.push(slider('flow', 'flow.startingLives', 'Starting lives', 1, 9, 1));
  reg.push(slider('flow', 'score.multiplier.decayPerSecond', 'Mult decay/sec', 0, 4, 0.1));
  reg.push(toggle('flow', 'flow.newEnemyTypes', 'New enemy types (Grunt + Weaver)', true));

  // DEBUG
  reg.push(toggle('debug', 'debug.fpsOverlay', 'FPS overlay'));
  reg.push(toggle('debug', 'debug.drawHitboxes', 'Draw hitboxes', true));
  reg.push(toggle('debug', 'debug.entityOverlay', 'Entity count overlay'));
  reg.push(toggle('debug', 'debug.particleCountOverlay', 'Particle count overlay'));
  reg.push(toggle('debug', 'debug.simulateLowEnd', 'Simulate low-end device', true));

  return reg;
}

function getPath<T = unknown>(obj: unknown, path: string): T {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur as T;
}

function setPath(obj: unknown, path: string, v: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]!] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = v;
}

function slider(
  category: TweakCategory,
  path: string,
  label: string,
  min: number,
  max: number,
  step: number,
  unit?: string,
  experimental = false,
): SliderTweak {
  const t: SliderTweak = {
    category,
    kind: 'slider',
    path,
    label,
    min,
    max,
    step,
    get: () => getPath<number>(config, path),
    set: (v) => setPath(config, path, v),
    default: getPath<number>(DEFAULTS, path),
  };
  if (unit !== undefined) t.unit = unit;
  if (experimental) t.experimental = true;
  return t;
}

function toggle(
  category: TweakCategory,
  path: string,
  label: string,
  experimental = false,
): ToggleTweak {
  const t: ToggleTweak = {
    category,
    kind: 'toggle',
    path,
    label,
    get: () => getPath<boolean>(config, path),
    set: (v) => setPath(config, path, v),
    default: getPath<boolean>(DEFAULTS, path),
  };
  if (experimental) t.experimental = true;
  return t;
}

/** For tests / export — produce a JSON snapshot of the live config. */
export function snapshotConfig(): AppConfig {
  return structuredClone(config);
}
