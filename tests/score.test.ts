import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreState } from '../src/game/score';
import { config, DEFAULTS } from '../src/config';

describe('game/score', () => {
  beforeEach(() => {
    // Reset config to defaults so tests are isolated.
    Object.assign(config.score.multiplier, DEFAULTS.score.multiplier);
  });

  it('starts at score 0, multiplier 1', () => {
    const s = new ScoreState();
    expect(s.score).toBe(0);
    expect(s.multiplier).toBe(1);
  });

  it('increments multiplier on chained kills', () => {
    const s = new ScoreState();
    s.onKill(10);
    expect(s.multiplier).toBe(1);
    expect(s.score).toBe(10);
    // chain quickly
    s.step(0.1);
    s.onKill(10);
    expect(s.multiplier).toBe(2);
    expect(s.score).toBe(10 + 10 * 2);
  });

  it('caps multiplier at config.max', () => {
    const s = new ScoreState();
    config.score.multiplier.max = 3;
    s.onKill(1);
    s.step(0.1);
    s.onKill(1);
    s.step(0.1);
    s.onKill(1);
    s.step(0.1);
    s.onKill(1);
    expect(s.multiplier).toBeLessThanOrEqual(3);
  });

  it('decays multiplier when idle past windowMs', () => {
    const s = new ScoreState();
    s.onKill(10);
    s.step(0.1);
    s.onKill(10); // mult = 2
    expect(s.multiplier).toBe(2);
    // wait past window then accumulate decay
    s.step(2.0); // 2s — well past 1.5s window with default decay 1/s
    expect(s.multiplier).toBe(1);
  });

  it('reset returns to baseline', () => {
    const s = new ScoreState();
    s.onKill(10);
    s.step(0.1);
    s.onKill(10);
    s.reset();
    expect(s.score).toBe(0);
    expect(s.multiplier).toBe(1);
  });
});
