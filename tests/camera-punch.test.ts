import { describe, it, expect, beforeEach } from 'vitest';
import { CameraPunch } from '../src/fx/camera-punch';
import { events } from '../src/engine/events';
import { config, DEFAULTS } from '../src/config';
import type { PlayerState } from '../src/game/player';

const makePlayerState = (x = 400, y = 300): PlayerState => ({
  x,
  y,
  vx: 0,
  vy: 0,
  facing: 0,
  fireCooldown: 0,
  alive: true,
  blink: false,
});

const KILL_25 = {
  x: 500,
  y: 300,
  r: 1,
  g: 0,
  b: 1,
  pointValue: 25,
  multiplier: 1,
  enemyType: 'wanderer' as const,
};

const KILL_200 = {
  x: 500,
  y: 300,
  r: 0.5,
  g: 0,
  b: 1,
  pointValue: 200,
  multiplier: 1,
  enemyType: 'wanderer' as const,
};

describe('fx/camera-punch', () => {
  let ps: PlayerState;
  let punch: CameraPunch;

  beforeEach(() => {
    // Restore juice defaults and enable camera punch for all tests.
    Object.assign(config.juice, DEFAULTS.juice);
    config.juice.cameraPunch = true;
    config.juice.cameraPunchMagnitude = 20;

    ps = makePlayerState();
    punch = new CameraPunch(ps);
  });

  it('starts at zero offset', () => {
    expect(punch.offsetX).toBe(0);
    expect(punch.offsetY).toBe(0);
  });

  it('no displacement without a kill or beat', () => {
    punch.step(1 / 60);
    expect(punch.offsetX).toBe(0);
    expect(punch.offsetY).toBe(0);
  });

  it('fires displacement toward kill on beat', () => {
    events.emit('kill', KILL_25);
    // Punch fires on beat
    events.emit('musicBeat', { isKick: true, step: 0 });
    // Offset should now be non-zero (displacement applied)
    expect(punch.offsetX).not.toBe(0);
  });

  it('displacement direction is toward kill from player', () => {
    // Player at (400, 300), kill at (500, 300) → punch should be in +X direction
    events.emit('kill', KILL_25);
    events.emit('musicBeat', { isKick: true, step: 0 });
    expect(punch.offsetX).toBeGreaterThan(0);
    expect(punch.offsetY).toBe(0); // no Y component for horizontal kill
  });

  it('larger point-value kills create larger displacement', () => {
    const psA = makePlayerState();
    const punchA = new CameraPunch(psA);
    const psB = makePlayerState();
    const punchB = new CameraPunch(psB);

    events.emit('kill', KILL_25);
    events.emit('musicBeat', { isKick: true, step: 0 });
    const smallDisp = punchA.offsetX;

    // Need fresh beat — emit kill then beat to punchB
    // punchB's handler is already registered; both fired above.
    // Destroy punchA to prevent double-accumulation on next beat.
    punchA.destroy();

    events.emit('kill', KILL_200);
    events.emit('musicBeat', { isKick: false, step: 4 });
    const bigDisp = punchB.offsetX;

    expect(bigDisp).toBeGreaterThan(smallDisp);
    punchB.destroy();
  });

  it('spring returns offset back toward zero over time', () => {
    events.emit('kill', KILL_25);
    events.emit('musicBeat', { isKick: true, step: 0 });

    const initial = punch.offsetX;
    expect(initial).toBeGreaterThan(0);

    // Simulate 1 second of physics
    for (let i = 0; i < 60; i++) punch.step(1 / 60);

    expect(Math.abs(punch.offsetX)).toBeLessThan(Math.abs(initial));
  });

  it('fires after MAX_WAIT_S even without a beat', () => {
    events.emit('kill', KILL_25);
    // Step just under max wait — not fired yet
    punch.step(0.25);
    // Kill is pending; offset still 0 (no beat)
    expect(punch.offsetX).toBe(0);
    // Step past threshold
    punch.step(0.06);
    // Now should have fired
    expect(punch.offsetX).not.toBe(0);
  });

  it('clear() resets all state', () => {
    events.emit('kill', KILL_25);
    events.emit('musicBeat', { isKick: true, step: 0 });
    punch.clear();
    expect(punch.offsetX).toBe(0);
    expect(punch.offsetY).toBe(0);
    // No spring motion after clear
    punch.step(1 / 60);
    expect(punch.offsetX).toBe(0);
  });

  it('disabled toggle yields zero offset regardless of kills', () => {
    config.juice.cameraPunch = false;
    events.emit('kill', KILL_25);
    events.emit('musicBeat', { isKick: true, step: 0 });
    punch.step(1 / 60);
    expect(punch.offsetX).toBe(0);
    expect(punch.offsetY).toBe(0);
  });

  it('cleans up event subscriptions on destroy', () => {
    punch.destroy();
    events.emit('kill', KILL_25);
    events.emit('musicBeat', { isKick: true, step: 0 });
    expect(punch.offsetX).toBe(0);
  });
});
