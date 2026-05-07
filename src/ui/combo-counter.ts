import { config } from '../config';

// DOM overlay — CSS animation is cheaper than polling the WebGL render loop for this.
export class ComboCounter {
  private readonly el: HTMLElement;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMult = 1;

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'combo-counter';
    this.el.setAttribute('aria-hidden', 'true');
    host.appendChild(this.el);
  }

  update(mult: number): void {
    if (!config.juice.comboCounter) {
      this.lastMult = mult;
      return;
    }
    if (mult > this.lastMult && mult > 1) {
      this.trigger(mult);
    }
    this.lastMult = mult;
  }

  private trigger(mult: number): void {
    if (this.fadeTimer !== null) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.el.textContent = `×${mult}`;
    this.el.classList.remove('combo-pop');
    void this.el.offsetWidth; // force reflow so class re-add restarts the keyframe animation
    this.el.classList.add('combo-pop');

    this.fadeTimer = setTimeout(() => {
      this.el.classList.remove('combo-pop');
      this.fadeTimer = null;
    }, 1400);
  }

  reset(): void {
    this.lastMult = 1;
    if (this.fadeTimer !== null) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.el.classList.remove('combo-pop');
  }

  destroy(): void {
    this.reset();
    this.el.remove();
  }
}
