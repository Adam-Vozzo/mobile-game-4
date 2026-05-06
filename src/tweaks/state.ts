/**
 * Persistence for the Tweaks Menu.
 *
 * Keyed by build version so a new build with renamed tweaks doesn't apply
 * stale values silently. Within a build, we store a sparse `{path: value}`
 * overlay — only paths the user has touched. That makes it forward-compatible
 * if a path is removed in a later build (we just ignore unknown keys).
 */
import { config, DEFAULTS } from '../config';
import type { Tweak } from './registry';

const STORAGE_PREFIX = 'neondrift.tweaks';

type SparseOverlay = Record<string, unknown>;

function storageKey(): string {
  return `${STORAGE_PREFIX}.v${config.buildVersion}`;
}

export function loadOverlay(): SparseOverlay {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as SparseOverlay;
    return {};
  } catch {
    return {};
  }
}

export function saveOverlay(overlay: SparseOverlay): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(overlay));
  } catch {
    // Quota or private mode — silent. Loss-of-tweak isn't fatal.
  }
}

/** Apply a saved overlay onto the live config via the registry. */
export function applyOverlay(registry: readonly Tweak[], overlay: SparseOverlay): void {
  for (const t of registry) {
    if (Object.prototype.hasOwnProperty.call(overlay, t.path)) {
      const v = overlay[t.path];
      try {
        // best-effort type coercion: if a stored value's type differs from
        // the default, ignore it. Prevents stale data from crashing.
        if (typeof v === typeof t.default) {
          (t.set as (v: unknown) => void)(v);
        }
      } catch {
        // ignored
      }
    }
  }
}

/** Read an overlay, find any registry tweak whose live value differs from default. */
export function captureOverlay(registry: readonly Tweak[]): SparseOverlay {
  const out: SparseOverlay = {};
  for (const t of registry) {
    const cur = t.get();
    if (cur !== t.default) out[t.path] = cur;
  }
  return out;
}

/** Reset live values to defaults (single category if given). */
export function resetCategory(registry: readonly Tweak[], category?: string): void {
  for (const t of registry) {
    if (category && t.category !== category) continue;
    (t.set as (v: unknown) => void)(t.default);
  }
}

/** For tests. */
export function defaultsFor(path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = DEFAULTS;
  for (const p of parts) cur = (cur as Record<string, unknown>)[p];
  return cur;
}
