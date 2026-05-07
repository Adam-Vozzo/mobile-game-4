import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioBus } from '../src/audio/bus';
import { events } from '../src/engine/events';
import { config } from '../src/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Globals = typeof globalThis & { AudioContext?: any };

function makeAudioStub() {
  const makeGain = () => ({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });

  const makeOsc = () => ({
    type: 'sine',
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
      type: 'highpass',
      frequency: { value: 0 },
      connect: vi.fn(),
    })),
    createBuffer: vi.fn(() => buffer),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  };

  return ctx;
}

describe('AudioBus', () => {
  let savedAudioContext: unknown;

  beforeEach(() => {
    savedAudioContext = (globalThis as Globals).AudioContext;
    config.audio.sfxEnabled = true;
    config.audio.sfxVolume = 0.7;
  });

  afterEach(() => {
    if (savedAudioContext !== undefined) {
      (globalThis as Globals).AudioContext = savedAudioContext;
    } else {
      (globalThis as Globals).AudioContext = undefined;
    }
  });

  it('init() subscribes to events and returns teardown', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    const teardown = bus.init();
    expect(typeof teardown).toBe('function');
    teardown();
  });

  it('plays shoot sound when shoot event fires', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    const teardown = bus.init();

    events.emit('shoot', { x: 100, y: 100 });

    expect(stub.createOscillator).toHaveBeenCalled();
    expect(stub.createGain).toHaveBeenCalled();

    teardown();
  });

  it('plays kill sound when kill event fires', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    const teardown = bus.init();

    events.emit('kill', { x: 200, y: 200, r: 1, g: 0, b: 0.8, pointValue: 25, multiplier: 1 });

    expect(stub.createOscillator).toHaveBeenCalled();
    expect(stub.createBuffer).toHaveBeenCalled();

    teardown();
  });

  it('plays playerHit sound when playerHit event fires', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    const teardown = bus.init();

    events.emit('playerHit', { x: 50, y: 50 });

    expect(stub.createOscillator).toHaveBeenCalled();

    teardown();
  });

  it('silently skips playback when sfxEnabled is false', () => {
    config.audio.sfxEnabled = false;
    const ctxFactory = vi.fn(() => makeAudioStub());
    (globalThis as Globals).AudioContext = ctxFactory;

    const bus = new AudioBus();
    const teardown = bus.init();

    events.emit('shoot', { x: 0, y: 0 });
    expect(ctxFactory).not.toHaveBeenCalled();

    teardown();
    config.audio.sfxEnabled = true;
  });

  it('destroy() cleans up event subscriptions', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    bus.init();

    events.emit('shoot', { x: 0, y: 0 });
    const callCount = stub.createOscillator.mock.calls.length;

    bus.destroy();

    events.emit('shoot', { x: 0, y: 0 });
    expect(stub.createOscillator.mock.calls.length).toBe(callCount);
  });

  it('handles missing AudioContext (old/restricted browsers) without throwing', () => {
    (globalThis as Globals).AudioContext = undefined;

    const bus = new AudioBus();
    const teardown = bus.init();
    expect(() => events.emit('shoot', { x: 0, y: 0 })).not.toThrow();
    teardown();
  });
});
