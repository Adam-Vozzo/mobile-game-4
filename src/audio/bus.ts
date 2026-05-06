/**
 * SFX bus — procedurally synthesised sounds via Web Audio API.
 * No asset files. Appropriate for the electronic/neon aesthetic.
 *
 * Lazy-init: AudioContext is created on the first play() call so the browser
 * user-gesture requirement is naturally satisfied (the first sound always
 * follows a tap/keypress that starts the game or fires a shot).
 */

import { config } from '../config';
import { events } from '../engine/events';

export class AudioBus {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly unsubs: Array<() => void> = [];

  /** Call once at boot. Returns teardown fn. */
  init(): () => void {
    const offShoot = events.on('shoot', () => this.playShoot());
    const offKill = events.on('kill', () => this.playKill());
    const offHit = events.on('playerHit', () => this.playPlayerHit());
    this.unsubs.push(offShoot, offKill, offHit);
    return () => this.destroy();
  }

  destroy(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  private getCtx(): { ctx: AudioContext; master: GainNode } | null {
    if (!config.audio.sfxEnabled) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.masterGain!.gain.value = config.audio.sfxVolume;
    return { ctx: this.ctx, master: this.masterGain! };
  }

  private playShoot(): void {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, master } = r;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(820, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playKill(): void {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, master } = r;
    const t = ctx.currentTime;

    // Kick: sine tone, pitch-drop
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(130, t);
    kick.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    kickGain.gain.setValueAtTime(0.45, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    kick.connect(kickGain);
    kickGain.connect(master);
    kick.start(t);
    kick.stop(t + 0.2);

    // Noise burst: white noise through highpass
    const bufLen = Math.ceil(ctx.sampleRate * 0.09);
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    noise.connect(hp);
    hp.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  private playPlayerHit(): void {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, master } = r;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.35);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.4);
  }
}

export const audioBus = new AudioBus();
