/**
 * Fixed-timestep simulation, decoupled from render.
 *
 * `step(dt)` runs at a fixed cadence (default ~120Hz logic) regardless of
 * render rate. `render(alpha)` runs as fast as the browser allows, with an
 * interpolation alpha in [0,1].
 *
 * We cap accumulated work to avoid the spiral-of-death after a tab-switch.
 */
export interface LoopHooks {
  step: (dt: number) => void;
  render: (alpha: number) => void;
  /** Optional per-frame callback that receives wall-clock perf info. */
  onFrame?: (info: FrameInfo) => void;
}

export interface FrameInfo {
  fps: number;
  simMs: number;
  renderMs: number;
  steps: number;
}

const SIM_HZ = 120;
const SIM_DT = 1 / SIM_HZ;
/** Cap simulation steps per frame to avoid spiral-of-death after long stalls. */
const MAX_STEPS_PER_FRAME = 5;

export class Loop {
  private hooks: LoopHooks;
  private accumulator = 0;
  private lastNow = 0;
  private rafId = 0;
  private running = false;
  private fpsEMA = 60;
  private simMsEMA = 0;
  private renderMsEMA = 0;

  constructor(hooks: LoopHooks) {
    this.hooks = hooks;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastNow = performance.now();
    this.accumulator = 0;
    const tick = (now: number): void => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
      const elapsed = (now - this.lastNow) / 1000;
      this.lastNow = now;
      const fpsInstant = elapsed > 0 ? 1 / elapsed : 60;
      this.fpsEMA = this.fpsEMA * 0.9 + fpsInstant * 0.1;

      this.accumulator += elapsed;
      if (this.accumulator > MAX_STEPS_PER_FRAME * SIM_DT) {
        this.accumulator = MAX_STEPS_PER_FRAME * SIM_DT;
      }

      let steps = 0;
      const simStart = performance.now();
      while (this.accumulator >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
        this.hooks.step(SIM_DT);
        this.accumulator -= SIM_DT;
        steps++;
      }
      const simMs = performance.now() - simStart;
      this.simMsEMA = this.simMsEMA * 0.9 + simMs * 0.1;

      const alpha = this.accumulator / SIM_DT;
      const renderStart = performance.now();
      this.hooks.render(alpha);
      const renderMs = performance.now() - renderStart;
      this.renderMsEMA = this.renderMsEMA * 0.9 + renderMs * 0.1;

      this.hooks.onFrame?.({
        fps: this.fpsEMA,
        simMs: this.simMsEMA,
        renderMs: this.renderMsEMA,
        steps,
      });
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }
}

export const TIMING = { SIM_HZ, SIM_DT, MAX_STEPS_PER_FRAME } as const;
