import { describe, it, expect, beforeEach } from 'vitest';
import { config, DEFAULTS } from '../src/config';
import { checkBombRecharge } from '../src/game/world';

describe('config: bomb defaults', () => {
  it('flow.bomb is false by default', () => {
    expect(DEFAULTS.flow.bomb).toBe(false);
  });

  it('flow.bombChargeThreshold is 8 by default', () => {
    expect(DEFAULTS.flow.bombChargeThreshold).toBe(8);
  });
});

describe('checkBombRecharge', () => {
  beforeEach(() => {
    config.flow.bombChargeThreshold = DEFAULTS.flow.bombChargeThreshold;
  });

  it('returns 1 when multiplier crosses threshold from below', () => {
    expect(checkBombRecharge(0, 8, 7, 8)).toBe(1);
  });

  it('returns 0 when multiplier is below threshold', () => {
    expect(checkBombRecharge(0, 5, 4, 8)).toBe(0);
  });

  it('returns 0 when multiplier is at threshold but was already at threshold last tick (no re-trigger)', () => {
    expect(checkBombRecharge(0, 8, 8, 8)).toBe(0);
  });

  it('returns existing charges (1) when already charged — no double-charge', () => {
    expect(checkBombRecharge(1, 10, 7, 8)).toBe(1);
  });

  it('fires on exact threshold crossing (prevMult one below)', () => {
    expect(checkBombRecharge(0, 8, 7, 8)).toBe(1);
  });

  it('does not fire when mult exceeds threshold but prevMult also exceeded it', () => {
    expect(checkBombRecharge(0, 12, 10, 8)).toBe(0);
  });

  it('fires when mult jumps past threshold (e.g. mult=10, prev=7, threshold=8)', () => {
    expect(checkBombRecharge(0, 10, 7, 8)).toBe(1);
  });

  it('returns 0 when charges is already 1 and mult crosses threshold again', () => {
    expect(checkBombRecharge(1, 8, 7, 8)).toBe(1);
  });

  it('works with custom threshold values', () => {
    expect(checkBombRecharge(0, 15, 14, 15)).toBe(1);
    expect(checkBombRecharge(0, 14, 13, 15)).toBe(0);
  });

  it('returns 0 with prevMult=0 and mult=0 (initial state)', () => {
    expect(checkBombRecharge(0, 0, 0, 8)).toBe(0);
  });
});
