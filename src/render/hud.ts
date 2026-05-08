import type { ScoreState } from '../game/score';
import type { FrameInfo } from '../engine/loop';
import { config } from '../config';

export class HUD {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private multEl: HTMLElement;
  private livesEl: HTMLElement;
  private bombEl: HTMLElement;
  private perfEl: HTMLElement;
  private particleCounter: () => number = () => 0;
  private entityCounter: () => number = () => 0;
  private lastScore = -1;
  private lastMult = -1;
  private lastLives = -1;
  private lastBombCharges = -1;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-row hud-top-left">
        <span class="hud-label">Score</span>
        <span class="hud-value" id="hud-score">0</span>
        <span class="hud-lives" id="hud-lives"></span>
        <span class="hud-bomb" id="hud-bomb"></span>
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
    this.livesEl = this.root.querySelector('#hud-lives') as HTMLElement;
    this.bombEl = this.root.querySelector('#hud-bomb') as HTMLElement;
    this.perfEl = this.root.querySelector('#hud-perf') as HTMLElement;
  }

  bindCounters(particles: () => number, entities: () => number): void {
    this.particleCounter = particles;
    this.entityCounter = entities;
  }

  /** Force all dirty flags so the next update() re-renders every element. */
  invalidate(): void {
    this.lastScore = -1;
    this.lastMult = -1;
    this.lastLives = -1;
    this.lastBombCharges = -1;
  }

  update(score: ScoreState, frame: FrameInfo | null, lives = 3, bombCharges = 0): void {
    if (score.score !== this.lastScore) {
      this.scoreEl.textContent = formatScore(score.score);
      this.lastScore = score.score;
    }
    if (score.multiplier !== this.lastMult) {
      this.multEl.textContent = `x${score.multiplier}`;
      this.lastMult = score.multiplier;
    }
    if (lives !== this.lastLives) {
      this.livesEl.innerHTML = renderLives(lives);
      this.lastLives = lives;
    }
    if (bombCharges !== this.lastBombCharges) {
      if (config.flow.bomb) {
        this.bombEl.textContent = bombCharges > 0 ? '◈ BOMB' : '◈';
        this.bombEl.className = bombCharges > 0 ? 'hud-bomb' : 'hud-bomb hud-bomb--empty';
      } else {
        this.bombEl.textContent = '';
      }
      this.lastBombCharges = bombCharges;
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
  return Math.floor(n).toString().padStart(7, '0');
}

function renderLives(lives: number): string {
  const max = 3;
  const filled = Math.max(0, Math.min(lives, max));
  let html = '';
  for (let i = 0; i < max; i++) {
    html += i < filled
      ? '<span class="life-pip life-pip--on">◆</span>'
      : '<span class="life-pip life-pip--off">◆</span>';
  }
  return html;
}
