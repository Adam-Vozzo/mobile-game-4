import { ScoreState } from '../game/score';

/** Full-screen title / main menu. Shown on boot; dismissed on "play". */
export class MainMenu {
  private el: HTMLElement;
  private bestEl: HTMLElement;
  private bestValueEl: HTMLElement;

  constructor(host: HTMLElement, onPlay: () => void) {
    this.el = document.createElement('div');
    this.el.id = 'main-menu';
    this.el.innerHTML = `
      <div class="mm-inner">
        <div class="mm-title-group">
          <div class="mm-subtitle">CHAIN KILLS · BUILD MULTIPLIER · SURVIVE</div>
          <h1 class="mm-title">NEON<br>DRIFT</h1>
        </div>
        <div class="mm-best" id="mm-best">
          <span class="mm-best-label">BEST</span>
          <span class="mm-best-value" id="mm-best-value">0000000</span>
        </div>
        <button class="mm-play" id="mm-play">TAP TO PLAY</button>
        <div class="mm-hint">4-FINGER TAP FOR SETTINGS</div>
      </div>
    `;
    host.appendChild(this.el);

    this.bestEl = this.el.querySelector('#mm-best') as HTMLElement;
    this.bestValueEl = this.el.querySelector('#mm-best-value') as HTMLElement;

    (this.el.querySelector('#mm-play') as HTMLButtonElement).addEventListener('click', () => {
      this.hide();
      onPlay();
    });
  }

  show(): void {
    const best = ScoreState.loadBestScore();
    if (best > 0) {
      this.bestValueEl.textContent = Math.floor(best).toString().padStart(7, '0');
      this.bestEl.style.visibility = 'visible';
    } else {
      this.bestEl.style.visibility = 'hidden';
    }
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
