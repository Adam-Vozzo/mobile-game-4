import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioBus } from '../src/audio/bus';
import { events } from '../src/engine/events';
import type { EnemyType } from '../src/engine/events';
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
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: { value: 1 },
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

    events.emit('kill', { x: 200, y: 200, r: 1, g: 0, b: 0.8, pointValue: 25, multiplier: 1, enemyType: 'wanderer' });

    expect(stub.createOscillator).toHaveBeenCalled();
    expect(stub.createBuffer).toHaveBeenCalled();

    teardown();
  });

  it('plays playerHit sound when playerHit event fires', () => {
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    const teardown = bus.init();

    events.emit('playerHit', { x: 50, y: 50, livesRemaining: 2 });

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

  it('plays generic kill sound when enemyKillVariation is false', () => {
    config.audio.enemyKillVariation = false;
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    bus.init();
    bus.playKill('grunt');

    // Generic sound: sine kick + noise buffer.
    expect(stub.createOscillator).toHaveBeenCalled();
    expect(stub.createBuffer).toHaveBeenCalled();
  });

  it('plays varied sound when enemyKillVariation is true', () => {
    config.audio.enemyKillVariation = true;
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    bus.init();
    bus.playKill('grunt');

    // Grunt: heavy sine sub-kick + lowpass noise.
    expect(stub.createOscillator).toHaveBeenCalled();
    expect(stub.createBuffer).toHaveBeenCalled();
    config.audio.enemyKillVariation = false;
  });

  const allEnemyTypes: EnemyType[] = [
    'wanderer', 'grunt', 'weaver', 'splitter', 'shard', 'snake', 'blackHole', 'pinwheel',
  ];

  it.each(allEnemyTypes)('playKill(%s) does not throw with variation enabled', (type) => {
    config.audio.enemyKillVariation = true;
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    bus.init();
    expect(() => bus.playKill(type)).not.toThrow();
    config.audio.enemyKillVariation = false;
  });

  it('kill event carries enemyType through to playKill', () => {
    config.audio.enemyKillVariation = true;
    const stub = makeAudioStub();
    (globalThis as Globals).AudioContext = vi.fn(() => stub);

    const bus = new AudioBus();
    const teardown = bus.init();

    // Black hole: sub-bass heavy — should call createOscillator twice (sub + mid).
    stub.createOscillator.mockClear();
    events.emit('kill', {
      x: 0, y: 0, r: 0.67, g: 0, b: 1, pointValue: 200, multiplier: 2,
      enemyType: 'blackHole',
    });
    expect(stub.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(2);

    teardown();
    config.audio.enemyKillVariation = false;
  });
});
