import { describe, it, expect, beforeEach } from 'vitest';
import { SpawnDirector } from '../src/game/spawn-director';
import { config, DEFAULTS } from '../src/config';

describe('game/spawn-director', () => {
  beforeEach(() => {
    // Restore director config to defaults.
    Object.assign(config.spawnDirector, DEFAULTS.spawnDirector);
    // Restore flow.newEnemyTypes.
    config.flow.newEnemyTypes = DEFAULTS.flow.newEnemyTypes;
  });

  it('starts at difficulty 0', () => {
    const d = new SpawnDirector();
    expect(d.difficulty).toBe(0);
  });

  it('difficulty reaches 1 after rampSeconds', () => {
    const d = new SpawnDirector();
    // tick past ramp without triggering spawns in a controllable way
    d.tick(config.spawnDirector.rampSeconds, 9999);
    expect(d.difficulty).toBe(1);
  });

  it('difficulty clamps at 1', () => {
    const d = new SpawnDirector();
    d.tick(config.spawnDirector.rampSeconds * 3, 9999);
    expect(d.difficulty).toBe(1);
  });

  it('returns no spawns when alive count is at global cap', () => {
    const d = new SpawnDirector();
    // Pass the absolute maximum — no slots available regardless of difficulty.
    const cap = config.spawnDirector.maxMaxAlive;
    const spawns = d.tick(10, cap);
    expect(spawns.length).toBe(0);
  });

  it('returns spawns when there is room', () => {
    const d = new SpawnDirector();
    // tick a large dt to guarantee several spawn timer overflows
    const spawns = d.tick(8, 0);
    expect(spawns.length).toBeGreaterThan(0);
  });

  it('only spawns wanderers when newEnemyTypes is false', () => {
    config.flow.newEnemyTypes = false;
    const d = new SpawnDirector();
    // advance well past ramp to reach max difficulty (where grunts/weavers would appear)
    d.tick(config.spawnDirector.rampSeconds, 9999); // advance elapsed without spawning
    const types = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const spawns = d.tick(2, 0);
      for (const t of spawns) types.add(t);
    }
    expect(types.size).toBe(1);
    expect(types.has('wanderer')).toBe(true);
  });

  it('spawns varied enemy types at max difficulty when newEnemyTypes is true', () => {
    config.flow.newEnemyTypes = true;
    config.spawnDirector.rampSeconds = 1; // speed up ramp
    const d = new SpawnDirector();
    d.tick(2, 9999); // advance to t=1
    const types = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const spawns = d.tick(0.5, 0);
      for (const t of spawns) types.add(t);
    }
    expect(types.has('grunt')).toBe(true);
    expect(types.has('weaver')).toBe(true);
  });

  it('isSurging is false initially', () => {
    const d = new SpawnDirector();
    expect(d.isSurging).toBe(false);
  });

  it('reset clears elapsed and surge state', () => {
    config.spawnDirector.surgeChancePerSecond = 1.0; // guaranteed surge
    config.spawnDirector.surgeDuration = 10;
    const d = new SpawnDirector();
    d.tick(2, 9999); // triggers surge
    d.reset();
    expect(d.difficulty).toBe(0);
    expect(d.isSurging).toBe(false);
  });
});
