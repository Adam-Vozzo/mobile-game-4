import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MusicEngine } from '../src/audio/music';
import { config } from '../src/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Globals = typeof globalThis & { AudioContext?: any };

function makeAudioStub() {
  const makeGain = () => ({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });

  const makeOsc = () => ({
    type: 'sine' as OscillatorType,
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      value: 440,
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });

  const buffer = { getChannelData: vi.fn(() => new Float32Array(100)) };

  const ctx = {
    currentTime: 0,
    state: 'running',
    sampleRate: 44100,
    destination: {},
    createGain: vi.fn(makeGain),
    createOscillator: vi.fn(makeOsc),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: { value: 0 },
      connect: vi.fn(),
    })),
    createBuffer: vi.fn(() => buffer),
    createBufferSource: vi.fn(() => ({
      buffer: null as unknown,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  };

  return ctx;
}

describe('MusicEngine', () => {
  let savedAudioContext: unknown;

  beforeEach(() => {
    savedAudioContext = (globalThis as Globals).AudioContext;
    config.audio.musicEnabled = true;
    config.audio.musicVolume = 0.5;
  });

  afterEach(() => {
    if (savedAudioContext !== undefined) {
      (globalThis as Globals).AudioContext = savedAudioContext;
    } else {
      (globalThis as Globals).AudioContext = undefined;
    }
    config.audio.musicEnabled = false;
  });

  it('isRunning is false before start()', () => {
    const engine = new MusicEngine();
    expect(engine.isRunning).toBe(false);
  });

  it('start() creates an AudioContext when musicEnabled is true', () => {
    const stub = makeAudioStub();
    const factory = vi.fn(() => stub);
    (globalThis as Globals).AudioContext = factory;

    const engine = new MusicEngine();
    engine.start();
    expect(factory).toHaveBeenCalledOnce();
    expect(engine.isRunning).toBe(true);
    engine.stop();
  });

  it('start() is a no-op when musicEnabled is false', () => {
    config.audio.musicEnabled = false;
    const factory = vi.fn(() => makeAudioStub());
    (globalThis as Globals).AudioContext = factory;

    const engine = new MusicEngine();
    engine.start();
    expect(factory).not.toHaveBeenCalled();
    expect(engine.isRunning).toBe(false);
  });

  it('start() is idempotent — calling twice does not create two AudioContexts', () => {
    const factory = vi.fn(() => makeAudioStub());
    (globalThis as Globals).AudioContext = factory;

    const engine = new MusicEngine();
    engine.start();
    engine.start();
    expect(factory).toHaveBeenCalledOnce();
    engine.stop();
  });

  it('stop() sets isRunning to false', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const engine = new MusicEngine();
    engine.start();
    expect(engine.isRunning).toBe(true);
    engine.stop();
    expect(engine.isRunning).toBe(false);
  });

  it('handles missing AudioContext without throwing', () => {
    (globalThis as Globals).AudioContext = undefined;
    const engine = new MusicEngine();
    expect(() => engine.start()).not.toThrow();
    expect(engine.isRunning).toBe(false);
  });

  it('updateVolume() does not throw when not running', () => {
    const engine = new MusicEngine();
    expect(() => engine.updateVolume()).not.toThrow();
  });
});
