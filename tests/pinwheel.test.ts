import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PixiJS — same pattern as other enemy tests.
vi.mock('pixi.js', () => ({
  Container: class {
    addChild() {}
  },
  Graphics: class {
    blendMode = 0;
    visible = false;
    x = 0;
    y = 0;
    rotation = 0;
    clear() { return this; }
    lineStyle() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    drawCircle() { return this; }
    beginFill() { return this; }
    endFill() { return this; }
    closePath() { return this; }
  },
  BLEND_MODES: { ADD: 1 },
}));

vi.mock('../src/render/ships', () => ({
  drawPinwheelHub: vi.fn(),
  drawPinwheelDrone: vi.fn(),
}));

vi.mock('../src/config', () => ({
  config: {
    enemies: {
      pinwheel: {
        hubRadius: 14,
        speed: 38,
        orbitRadius: 46,
        orbitSpeed: 1.7,
        droneRadius: 8,
        hp: 3,
        maxConcurrent: 2,
        pointValue: 175,
      },
    },
  },
}));

import { Pinwheels } from '../src/game/enemies/pinwheel';
import { Container } from 'pixi.js';

function makeContainer(): Container {
  return new Container() as unknown as Container;
}

describe('Pinwheels', () => {
  let pinwheels: Pinwheels;

  beforeEach(() => {
    pinwheels = new Pinwheels(makeContainer());
  });

  it('starts with zero active', () => {
    expect(pinwheels.count).toBe(0);
  });

  it('spawns and becomes visible', () => {
    pinwheels.spawn(100, 100);
    expect(pinwheels.count).toBe(1);
    const e = pinwheels.pool.items[0]!;
    expect(e.g.visible).toBe(true);
    expect(e.droneGs[0]!.visible).toBe(true);
    expect(e.droneGs[1]!.visible).toBe(true);
    expect(e.droneGs[2]!.visible).toBe(true);
  });

  it('initialises hp from config', () => {
    pinwheels.spawn(200, 200);
    expect(pinwheels.pool.items[0]!.hp).toBe(3);
  });

  it('damage decrements hp and returns false while alive', () => {
    pinwheels.spawn(200, 200);
    expect(pinwheels.damage(0)).toBe(false);
    expect(pinwheels.pool.items[0]!.hp).toBe(2);
    expect(pinwheels.damage(0)).toBe(false);
    expect(pinwheels.pool.items[0]!.hp).toBe(1);
  });

  it('damage returns true when hp reaches 0', () => {
    pinwheels.spawn(200, 200);
    pinwheels.damage(0);
    pinwheels.damage(0);
    expect(pinwheels.damage(0)).toBe(true);
    expect(pinwheels.pool.items[0]!.hp).toBe(0);
  });

  it('releaseAt hides graphics and decrements count', () => {
    pinwheels.spawn(100, 100);
    const e = pinwheels.pool.items[0]!;
    pinwheels.releaseAt(0);
    expect(pinwheels.count).toBe(0);
    expect(e.g.visible).toBe(false);
    expect(e.droneGs[0]!.visible).toBe(false);
    expect(e.droneGs[1]!.visible).toBe(false);
    expect(e.droneGs[2]!.visible).toBe(false);
  });

  it('pool cap is at least maxConcurrent', () => {
    // Spawn 2 (maxConcurrent).
    pinwheels.spawn(100, 100);
    pinwheels.spawn(200, 200);
    expect(pinwheels.count).toBe(2);
  });

  it('releaseAll clears all active', () => {
    pinwheels.spawn(100, 100);
    pinwheels.spawn(200, 200);
    pinwheels.releaseAll();
    expect(pinwheels.count).toBe(0);
  });

  it('step advances orbitAngle', () => {
    pinwheels.spawn(400, 300);
    const e = pinwheels.pool.items[0]!;
    const angleBefore = e.orbitAngle;
    pinwheels.step(0.1, 800, 600, 400, 300);
    expect(e.orbitAngle).toBeCloseTo(angleBefore + 1.7 * 0.1, 3);
  });

  it('step moves hub toward player', () => {
    pinwheels.spawn(100, 300);
    const e = pinwheels.pool.items[0]!;
    pinwheels.step(1.0, 800, 600, 700, 300);
    // Should have moved right (toward player at x=700).
    expect(e.x).toBeGreaterThan(100);
    expect(e.y).toBeCloseTo(300, 0);
  });

  it('step keeps hub within wall margins', () => {
    pinwheels.spawn(10, 300);
    const e = pinwheels.pool.items[0]!;
    // Force into left wall.
    e.x = -100;
    e.vx = -50;
    pinwheels.step(0.016, 800, 600, 400, 300);
    const margin = 14 + 46 + 8; // hubRadius + orbitRadius + droneRadius
    expect(e.x).toBeGreaterThanOrEqual(margin);
    expect(e.vx).toBeGreaterThanOrEqual(0);
  });

  it('drone graphics follow orbit positions', () => {
    pinwheels.spawn(400, 300);
    const e = pinwheels.pool.items[0]!;
    e.orbitAngle = 0;
    pinwheels.step(0, 800, 600, 400, 300);
    // Drone 0 should be at (x + orbitRadius, y) when orbitAngle = 0.
    expect(e.droneGs[0]!.x).toBeCloseTo(400 + 46, 0);
    expect(e.droneGs[0]!.y).toBeCloseTo(300, 0);
    // Drone 1 at 120°, drone 2 at 240°.
    expect(e.droneGs[1]!.x).toBeCloseTo(400 + 46 * Math.cos((2 * Math.PI) / 3), 0);
    expect(e.droneGs[2]!.x).toBeCloseTo(400 + 46 * Math.cos((4 * Math.PI) / 3), 0);
  });
});
