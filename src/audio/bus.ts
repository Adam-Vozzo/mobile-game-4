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
import type { EnemyType } from '../engine/events';

export class AudioBus {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly unsubs: Array<() => void> = [];

  /** Call once at boot. Returns teardown fn. */
  init(): () => void {
    const offShoot = events.on('shoot', () => this.playShoot());
    const offKill = events.on('kill', (e) => this.playKill(e.enemyType));
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

  playKill(enemyType: EnemyType): void {
    const r = this.getCtx();
    if (!r) return;
    if (config.audio.enemyKillVariation) {
      this.playKillVaried(r.ctx, r.master, enemyType);
    } else {
      this.playKillGeneric(r.ctx, r.master);
    }
  }

  // Generic baseline kill sound (used when variation is off, or as fallback).
  private playKillGeneric(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

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

  // Dispatches a bespoke synth voice per enemy archetype.
  private playKillVaried(ctx: AudioContext, master: GainNode, type: EnemyType): void {
    switch (type) {
      case 'wanderer':
        this.playKillGeneric(ctx, master);
        break;
      case 'grunt':
        this.playKillGrunt(ctx, master);
        break;
      case 'weaver':
        this.playKillWeaver(ctx, master);
        break;
      case 'splitter':
        this.playKillSplitter(ctx, master);
        break;
      case 'shard':
        this.playKillShard(ctx, master);
        break;
      case 'snake':
        this.playKillSnake(ctx, master);
        break;
      case 'blackHole':
        this.playKillBlackHole(ctx, master);
        break;
      case 'pinwheel':
        this.playKillPinwheel(ctx, master);
        break;
    }
  }

  // Grunt: heavy thud — deep sub-kick with dense noise, sluggish decay.
  private playKillGrunt(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(80, t);
    kick.frequency.exponentialRampToValueAtTime(22, t + 0.22);
    kickGain.gain.setValueAtTime(0.55, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    kick.connect(kickGain);
    kickGain.connect(master);
    kick.start(t);
    kick.stop(t + 0.3);

    const bufLen = Math.ceil(ctx.sampleRate * 0.14);
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(master);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  // Weaver: bright high-pitched chirp — fast frequency rise, very short.
  private playKillWeaver(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.09);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Splitter: double-pop — two staggered hits suggesting the split.
  private playKillSplitter(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    const pop = (delay: number, freq: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + delay + 0.08);
      gain.gain.setValueAtTime(vol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t + delay);
      osc.stop(t + delay + 0.11);
    };

    pop(0, 220, 0.4);
    pop(0.055, 310, 0.3);

    // Crunch noise burst.
    const bufLen = Math.ceil(ctx.sampleRate * 0.06);
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start(t);
    noise.stop(t + 0.07);
  }

  // Shard: tiny high-freq pop — light, fast, disposable.
  private playKillShard(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.045);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  // Snake: sinuous downward glide — resonant fall suggesting the body collapsing.
  private playKillSnake(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.22);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.22);
    lp.Q.value = 2.5;

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Black Hole: massive sub-bass implosion — very low, long, rumbling.
  private playKillBlackHole(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, t);
    sub.frequency.exponentialRampToValueAtTime(14, t + 0.5);
    subGain.gain.setValueAtTime(0.6, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    sub.connect(subGain);
    subGain.connect(master);
    sub.start(t);
    sub.stop(t + 0.6);

    // Mid crunch layer.
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = 'sawtooth';
    mid.frequency.setValueAtTime(110, t);
    mid.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    midGain.gain.setValueAtTime(0.22, t);
    midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    mid.connect(midGain);
    midGain.connect(master);
    mid.start(t);
    mid.stop(t + 0.35);

    // White noise rumble.
    const bufLen = Math.ceil(ctx.sampleRate * 0.25);
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(master);
    noise.start(t);
    noise.stop(t + 0.26);
  }

  // Pinwheel: whirry mechanical click — noise burst with a high spinning sweep.
  private playKillPinwheel(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime;

    // Spinning sweep.
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.16);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(t);
    osc.stop(t + 0.19);

    // Metallic click.
    const bufLen = Math.ceil(ctx.sampleRate * 0.05);
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(master);
    noise.start(t);
    noise.stop(t + 0.06);
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
