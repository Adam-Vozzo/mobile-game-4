import { describe, it, expect, beforeEach } from 'vitest';
import { GameEffects, SLOW_MO_MULT_THRESHOLD, SLOW_MO_DURATION, SLOW_MO_SCALE } from '../src/fx/effects';
import { config, DEFAULTS } from '../src/config';

const DT = 1 / 120; // SIM_DT

function resetJuice(): void {
  Object.assign(config.juice, DEFAULTS.juice);
}

describe('GameEffects', () => {
  let fx: GameEffects;

  beforeEach(() => {
    resetJuice();
    fx = new GameEffects();
  });

  // --- hitstop ---

  it('starts with no hitstop active', () => {
    expect(fx.tickHitstop(DT)).toBe(false);
  });

  it('freezes for the configured duration after onKill', () => {
    config.juice.hitstopMs = 30; // 0.03 s
    fx.onKill(1);
    // Immediately frozen
    expect(fx.tickHitstop(DT)).toBe(true);
  });

  it('hitstop expires after enough ticks', () => {
    config.juice.hitstopMs = 30;
    fx.onKill(1);
    // Drain the full 30 ms in one large step.
    fx.tickHitstop(0.03);
    expect(fx.tickHitstop(DT)).toBe(false);
  });

  it('hitstop does not trigger when hitstopMs = 0 (default)', () => {
    // Default is 0 — no hitstop expected.
    fx.onKill(10);
    expect(fx.tickHitstop(DT)).toBe(false);
  });

  it('overlapping kills extend hitstop without doubling', () => {
    config.juice.hitstopMs = 40;
    fx.onKill(1);
    // Consume 20 ms
    fx.tickHitstop(0.02);
    // Second kill resets to full 40 ms
    fx.onKill(1);
    // Should still be frozen after another 30 ms (< 40 ms)
    fx.tickHitstop(0.03);
    expect(fx.tickHitstop(DT)).toBe(true);
  });

  // --- slow-mo ---

  it('starts at timeScale 1', () => {
    expect(fx.timeScale).toBe(1);
  });

  it('sets timeScale to SLOW_MO_SCALE when multiplier meets threshold', () => {
    config.juice.slowMoOnBigKill = true;
    fx.onKill(SLOW_MO_MULT_THRESHOLD);
    expect(fx.timeScale).toBe(SLOW_MO_SCALE);
  });

  it('does not trigger slow-mo below threshold', () => {
    config.juice.slowMoOnBigKill = true;
    fx.onKill(SLOW_MO_MULT_THRESHOLD - 1);
    expect(fx.timeScale).toBe(1);
  });

  it('does not trigger slow-mo when toggle is off', () => {
    config.juice.slowMoOnBigKill = false;
    fx.onKill(SLOW_MO_MULT_THRESHOLD);
    expect(fx.timeScale).toBe(1);
  });

  it('restores timeScale after SLOW_MO_DURATION real seconds', () => {
    config.juice.slowMoOnBigKill = true;
    fx.onKill(SLOW_MO_MULT_THRESHOLD);
    // Advance past the full window.
    fx.tickSlowMo(SLOW_MO_DURATION + 0.01);
    expect(fx.timeScale).toBe(1);
  });

  it('timeScale is still low mid-window', () => {
    config.juice.slowMoOnBigKill = true;
    fx.onKill(SLOW_MO_MULT_THRESHOLD);
    fx.tickSlowMo(SLOW_MO_DURATION * 0.5);
    expect(fx.timeScale).toBe(SLOW_MO_SCALE);
  });

  it('onPlayerHit snaps timeScale back to 1 immediately', () => {
    config.juice.slowMoOnBigKill = true;
    fx.onKill(SLOW_MO_MULT_THRESHOLD);
    expect(fx.timeScale).toBe(SLOW_MO_SCALE);
    fx.onPlayerHit();
    expect(fx.timeScale).toBe(1);
  });

  // --- flash ---

  it('flashAlpha starts at 0', () => {
    expect(fx.flashAlpha).toBe(0);
  });

  it('kill flash triggers when flashOnKill is enabled', () => {
    config.juice.flashOnKill = true;
    fx.onKill(1);
    expect(fx.flashAlpha).toBeGreaterThan(0);
  });

  it('kill flash does not trigger when flashOnKill is off (default)', () => {
    fx.onKill(10);
    expect(fx.flashAlpha).toBe(0);
  });

  it('player hit flash is always triggered regardless of toggle', () => {
    config.juice.flashOnKill = false;
    fx.onPlayerHit();
    expect(fx.flashAlpha).toBeGreaterThan(0);
  });

  it('player hit flash is stronger than kill flash', () => {
    config.juice.flashOnKill = true;
    const killFlash = new GameEffects();
    killFlash.onKill(1);

    const hitFlash = new GameEffects();
    hitFlash.onPlayerHit();

    expect(hitFlash.flashAlpha).toBeGreaterThan(killFlash.flashAlpha);
  });

  it('flash decays toward zero via stepAlways', () => {
    config.juice.flashOnKill = true;
    fx.onKill(1);
    const initial = fx.flashAlpha;
    fx.stepAlways(0.5);
    expect(fx.flashAlpha).toBeLessThan(initial);
  });

  it('flash reaches 0 after sufficient real time', () => {
    config.juice.flashOnKill = true;
    fx.onKill(1);
    // Drive to zero in one large step (flashAlpha / FLASH_DECAY < 1s)
    fx.stepAlways(1);
    expect(fx.flashAlpha).toBe(0);
  });
});
