/**
 * Tiny typed event bus for one-shot signals between systems.
 * Per-tick state belongs in arrays. This is for "kill happened", "wave
 * complete", etc.
 */

export interface KillEvent {
  x: number;
  y: number;
  /** RGB triplet, normalised 0..1 */
  r: number;
  g: number;
  b: number;
  pointValue: number;
  /** kill-chain multiplier active at the moment of the kill */
  multiplier: number;
}

export interface PlayerHitEvent {
  x: number;
  y: number;
}

export interface ShootEvent {
  x: number;
  y: number;
}

export interface GameOverEvent {
  score: number;
  bestScore: number;
  peakMultiplier: number;
}

export interface MusicBeatEvent {
  /** true = kick (downbeat), false = snare (backbeat) */
  isKick: boolean;
  step: number;
}

export interface SurgeChangeEvent {
  active: boolean;
}

export interface GameEvents {
  kill: KillEvent;
  playerHit: PlayerHitEvent;
  shoot: ShootEvent;
  gameOver: GameOverEvent;
  musicBeat: MusicBeatEvent;
  surgeChange: SurgeChangeEvent;
}

type Handler<E> = (e: E) => void;

class TypedBus<TMap> {
  private listeners = new Map<keyof TMap, Set<Handler<TMap[keyof TMap]>>>();

  on<K extends keyof TMap>(type: K, fn: Handler<TMap[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Handler<TMap[keyof TMap]>);
    return () => set!.delete(fn as Handler<TMap[keyof TMap]>);
  }

  emit<K extends keyof TMap>(type: K, e: TMap[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of set) (fn as Handler<TMap[K]>)(e);
  }
}

export const events = new TypedBus<GameEvents>();
