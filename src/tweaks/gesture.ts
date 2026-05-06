/**
 * Four-finger tap detector. Calls `onTrigger` when four pointers are down at
 * the same time and have not moved beyond a small threshold within the
 * detection window.
 *
 * We deliberately require all four to *come down* within a window — a rolling
 * thumb shouldn't accidentally fire it while playing single-thumb mode.
 */
const WINDOW_MS = 350;
const MAX_MOVE_PX = 24;

interface TouchTrack {
  id: number;
  startX: number;
  startY: number;
  startedAt: number;
  curX: number;
  curY: number;
}

export class FourFingerTap {
  private host: HTMLElement;
  private tracks = new Map<number, TouchTrack>();
  private onTrigger: () => void;
  private boundDown = (e: PointerEvent) => this.onDown(e);
  private boundMove = (e: PointerEvent) => this.onMove(e);
  private boundUp = (e: PointerEvent) => this.onUp(e);

  constructor(host: HTMLElement, onTrigger: () => void) {
    this.host = host;
    this.onTrigger = onTrigger;
  }

  attach(): void {
    this.host.addEventListener('pointerdown', this.boundDown, { passive: true });
    this.host.addEventListener('pointermove', this.boundMove, { passive: true });
    this.host.addEventListener('pointerup', this.boundUp, { passive: true });
    this.host.addEventListener('pointercancel', this.boundUp, { passive: true });
  }

  detach(): void {
    this.host.removeEventListener('pointerdown', this.boundDown);
    this.host.removeEventListener('pointermove', this.boundMove);
    this.host.removeEventListener('pointerup', this.boundUp);
    this.host.removeEventListener('pointercancel', this.boundUp);
    this.tracks.clear();
  }

  private onDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return; // mouse can't multitouch
    const now = performance.now();
    this.tracks.set(e.pointerId, {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startedAt: now,
      curX: e.clientX,
      curY: e.clientY,
    });
    this.evaluate(now);
  }

  private onMove(e: PointerEvent): void {
    const t = this.tracks.get(e.pointerId);
    if (!t) return;
    t.curX = e.clientX;
    t.curY = e.clientY;
  }

  private onUp(e: PointerEvent): void {
    this.tracks.delete(e.pointerId);
  }

  private evaluate(now: number): void {
    if (this.tracks.size < 4) return;
    let countWithinWindow = 0;
    for (const t of this.tracks.values()) {
      const moved = Math.hypot(t.curX - t.startX, t.curY - t.startY);
      if (now - t.startedAt <= WINDOW_MS && moved <= MAX_MOVE_PX) countWithinWindow++;
    }
    if (countWithinWindow >= 4) {
      this.tracks.clear();
      this.onTrigger();
    }
  }
}
