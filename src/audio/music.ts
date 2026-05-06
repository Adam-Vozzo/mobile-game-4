/**
 * Procedural music engine — no asset files.
 * 128 BPM synthwave loop built from Web Audio API oscillators.
 *
 * Architecture: lookahead scheduler checks every 50ms and schedules
 * ~150ms of audio ahead to avoid glitches, same pattern as the SFX bus.
 *
 * Reactivity: emits `musicBeat` events so the world can pulse the grid
 * on kick beats when `audio.musicReactivity` is enabled.
 */

import { config } from '../config';
import { events } from '../engine/events';

const BPM = 128;
const SIXTEENTH_S = 60 / BPM / 4; // duration of one 16th-note step
const STEPS = 16; // steps per bar (one bar = 4 beats)
const LOOKAHEAD_S = 0.15;
const SCHEDULE_INTERVAL_MS = 50;

// A minor pentatonic: A2, C3, D3, E3, G3 (in Hz)
const BASS_SEQ: readonly number[] = [
  110, 0, 110, 0, 130.81, 0, 164.81, 0,
  110, 0, 98, 0, 146.83, 0, 164.81, 98,
];

// Lead notes cycle through A4-minor-pentatonic, one note per quarter note
const LEAD_SEQ: readonly number[] = [440, 523.25, 659.25, 523.25, 587.33, 440, 783.99, 659.25];

const KICK_STEPS = new Set([0, 8]);
const SNARE_STEPS = new Set([4, 12]);
const HIHAT_STEPS = new Set([2, 6, 10, 14]);

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private step = 0;
  private nextStepTime = 0;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private leadIndex = 0;
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }

  /** Start playback. Must be called after a user gesture. No-op if already running or disabled. */
  start(): void {
    if (this.running || !config.audio.musicEnabled) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.master.gain.value = config.audio.musicVolume * 0.55;
    } catch {
      return;
    }
    this.step = 0;
    this.leadIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.running = true;
    this.schedulerId = setInterval(() => this._schedule(), SCHEDULE_INTERVAL_MS);
  }

  /** Fade out and stop playback. */
  stop(): void {
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.running = false;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      const ctx = this.ctx;
      setTimeout(() => void ctx.close(), 600);
      this.ctx = null;
      this.master = null;
    }
  }

  /** Adjust master volume live (called when config changes). */
  updateVolume(): void {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        config.audio.musicVolume * 0.55,
        this.ctx.currentTime,
        0.1,
      );
    }
  }

  private _schedule(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.value = config.audio.musicVolume * 0.55;
    while (this.nextStepTime < now + LOOKAHEAD_S) {
      this._scheduleStep(this.step, this.nextStepTime);
      this.step = (this.step + 1) % STEPS;
      this.nextStepTime += SIXTEENTH_S;
    }
  }

  private _scheduleStep(step: number, t: number): void {
    const ctx = this.ctx!;
    const master = this.master!;

    if (KICK_STEPS.has(step)) {
      this._kick(ctx, master, t);
      this._beatEvent(t, true, step);
    }
    if (SNARE_STEPS.has(step)) {
      this._snare(ctx, master, t);
      this._beatEvent(t, false, step);
    }
    if (HIHAT_STEPS.has(step)) {
      this._hihat(ctx, master, t);
    }

    const bassFreq = BASS_SEQ[step] ?? 0;
    if (bassFreq > 0) {
      this._bass(ctx, master, t, bassFreq);
    }

    // Lead: one note per quarter note (every 4 steps)
    if (step % 4 === 0) {
      const freq = LEAD_SEQ[this.leadIndex % LEAD_SEQ.length]!;
      this._lead(ctx, master, t, freq);
      this.leadIndex++;
    }
  }

  /** Emit musicBeat at the right moment so listeners fire when the beat hits. */
  private _beatEvent(scheduledAt: number, isKick: boolean, step: number): void {
    if (!config.audio.musicReactivity || !this.ctx) return;
    const delayMs = Math.max(0, (scheduledAt - this.ctx.currentTime) * 1000 - 8);
    setTimeout(() => events.emit('musicBeat', { isKick, step }), delayMs);
  }

  // ── Drum synthesis ──────────────────────────────────────────────────────────

  private _kick(ctx: AudioContext, master: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    g.gain.setValueAtTime(0.75, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private _snare(ctx: AudioContext, master: GainNode, t: number): void {
    // Noise layer
    const bufLen = Math.ceil(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(master);
    noise.start(t);
    noise.stop(t + 0.15);
    // Body tone
    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(220, t);
    body.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    bg.gain.setValueAtTime(0.18, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    body.connect(bg);
    bg.connect(master);
    body.start(t);
    body.stop(t + 0.12);
  }

  private _hihat(ctx: AudioContext, master: GainNode, t: number): void {
    const bufLen = Math.ceil(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(hp);
    hp.connect(g);
    g.connect(master);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  // ── Melodic synthesis ───────────────────────────────────────────────────────

  private _bass(ctx: AudioContext, master: GainNode, t: number, freq: number): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const dur = SIXTEENTH_S;
    g.gain.setValueAtTime(0.45, t);
    g.gain.setValueAtTime(0.45, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }

  private _lead(ctx: AudioContext, master: GainNode, t: number, freq: number): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + SIXTEENTH_S * 3.5);
    lp.Q.value = 5;
    const noteDur = SIXTEENTH_S * 3.6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.015);
    g.gain.setValueAtTime(0.1, t + noteDur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + noteDur + 0.01);
  }
}

export const musicEngine = new MusicEngine();
