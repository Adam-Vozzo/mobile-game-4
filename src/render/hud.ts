import type { ScoreState } from '../game/score';
import type { FrameInfo } from '../engine/loop';
import { config } from '../config';

export class HUD {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private multEl: HTMLElement;
  private perfEl: HTMLElement;
  private particleCounter: () => number = () => 0;
  private entityCounter: () => number = () => 0;
  private lastScore = -1;
  private lastMult = -1;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-row hud-top-left">
        <span class="hud-label">Score</span>
        <span class="hud-value" id="hud-score">0</span>
      </div>
      <div class="hud-row hud-top-right">
        <span class="hud-label">Mult</span>
        <span class="hud-mult" id="hud-mult">x1</span>
      </div>
      <div class="hud-perf" id="hud-perf"></div>
      <div id="orientation-prompt">Rotate to landscape</div>
    `;
    host.appendChild(this.root);
    this.scoreEl = this.root.querySelector('#hud-score') as HTMLElement;
    this.multEl = this.root.querySelector('#hud-mult') as HTMLElement;
    this.perfEl = this.root.querySelector('#hud-perf') as HTMLElement;
  }

  bindCounters(particles: () => number, entities: () => number): void {
    this.particleCounter = particles;
    this.entityCounter = entities;
  }

  update(score: ScoreState, frame: FrameInfo | null): void {
    if (score.score !== this.lastScore) {
      this.scoreEl.textContent = formatScore(score.score);
      this.lastScore = score.score;
    }
    if (score.multiplier !== this.lastMult) {
      this.multEl.textContent = `x${score.multiplier}`;
      this.lastMult = score.multiplier;
    }
    const showPerf =
      config.debug.fpsOverlay ||
      config.debug.entityOverlay ||
      config.debug.particleCountOverlay;
    if (showPerf) {
      this.perfEl.classList.add('visible');
      const lines: string[] = [];
      if (config.debug.fpsOverlay && frame) {
        lines.push(
          `${frame.fps.toFixed(1)} fps   sim ${frame.simMs.toFixed(2)}ms   render ${frame.renderMs.toFixed(2)}ms`,
        );
      }
      if (config.debug.entityOverlay) {
        lines.push(`entities ${this.entityCounter()}`);
      }
      if (config.debug.particleCountOverlay) {
        lines.push(`particles ${this.particleCounter()}`);
      }
      this.perfEl.textContent = lines.join('\n');
    } else {
      this.perfEl.classList.remove('visible');
    }
  }
}

function formatScore(n: number): string {
  // Tabular grouping — every 3 digits, no commas (cleaner on small HUD).
  return Math.floor(n).toString().padStart(7, '0');
}
