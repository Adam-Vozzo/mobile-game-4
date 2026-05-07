/** Full-screen game-over panel. Neon vector aesthetic, no raster. */
export class GameOverOverlay {
  private el: HTMLElement;
  private scoreEl: HTMLElement;
  private bestEl: HTMLElement;
  private peakEl: HTMLElement;
  private newBestEl: HTMLElement;

  constructor(host: HTMLElement, onRetry: () => void, onMenu?: () => void) {
    this.el = document.createElement('div');
    this.el.id = 'game-over';
    this.el.innerHTML = `
      <div class="go-inner">
        <h1 class="go-title">GAME OVER</h1>
        <div class="go-scores">
          <div class="go-row">
            <span class="go-label">SCORE</span>
            <span class="go-value" id="go-score">0000000</span>
          </div>
          <div class="go-row">
            <span class="go-label">BEST</span>
            <span class="go-value go-best-val" id="go-best">0000000</span>
            <span class="go-new-best" id="go-new-best">NEW BEST</span>
          </div>
          <div class="go-row">
            <span class="go-label">PEAK MULT</span>
            <span class="go-value go-peak" id="go-peak">x1</span>
          </div>
        </div>
        <button class="go-retry" id="go-retry">PLAY AGAIN</button>
        <button class="go-menu" id="go-menu">MAIN MENU</button>
      </div>
    `;
    this.el.style.display = 'none';
    host.appendChild(this.el);

    this.scoreEl = this.el.querySelector('#go-score') as HTMLElement;
    this.bestEl = this.el.querySelector('#go-best') as HTMLElement;
    this.peakEl = this.el.querySelector('#go-peak') as HTMLElement;
    this.newBestEl = this.el.querySelector('#go-new-best') as HTMLElement;

    (this.el.querySelector('#go-retry') as HTMLButtonElement).addEventListener('click', () => {
      this.hide();
      onRetry();
    });

    const menuBtn = this.el.querySelector('#go-menu') as HTMLButtonElement;
    if (onMenu) {
      menuBtn.addEventListener('click', () => {
        this.hide();
        onMenu();
      });
    } else {
      menuBtn.style.display = 'none';
    }
  }

  show(score: number, bestScore: number, peakMultiplier: number): void {
    const fmt = (n: number): string => Math.floor(n).toString().padStart(7, '0');
    this.scoreEl.textContent = fmt(score);
    this.bestEl.textContent = fmt(bestScore);
    this.peakEl.textContent = `x${peakMultiplier}`;
    this.newBestEl.style.visibility = score >= bestScore && score > 0 ? 'visible' : 'hidden';
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
