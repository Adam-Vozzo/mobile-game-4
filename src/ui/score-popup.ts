import { config } from '../config';
import { events } from '../engine/events';

const DURATION_MS = 800;

export class ScorePopup {
  private readonly host: HTMLElement;
  private readonly unsub: () => void;

  constructor(host: HTMLElement) {
    this.host = host;
    this.unsub = events.on('kill', (e) => this.onKill(e.x, e.y, e.r, e.g, e.b, e.pointValue * e.multiplier));
  }

  private onKill(x: number, y: number, r: number, g: number, b: number, points: number): void {
    if (!config.juice.scorePopups) return;

    const el = document.createElement('div');
    el.className = 'score-popup';
    el.textContent = `+${points}`;

    const ri = Math.round(r * 255);
    const gi = Math.round(g * 255);
    const bi = Math.round(b * 255);
    el.style.color = `rgb(${ri},${gi},${bi})`;
    el.style.textShadow = `0 0 8px rgb(${ri},${gi},${bi})`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    this.host.appendChild(el);

    setTimeout(() => el.remove(), DURATION_MS + 50);
  }

  destroy(): void {
    this.unsub();
  }
}
