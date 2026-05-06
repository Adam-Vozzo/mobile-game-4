import { describe, it, expect } from 'vitest';
import { DEFAULTS, config } from '../src/config';

describe('config', () => {
  it('DEFAULTS is frozen', () => {
    expect(Object.isFrozen(DEFAULTS)).toBe(true);
  });

  it('live config starts equal to DEFAULTS', () => {
    // Compare a few fields to keep the test focused.
    expect(config.player.fireRatePerSecond).toBe(DEFAULTS.player.fireRatePerSecond);
    expect(config.juice.particleCap).toBe(DEFAULTS.juice.particleCap);
    expect(config.controls.scheme).toBe(DEFAULTS.controls.scheme);
  });
});
