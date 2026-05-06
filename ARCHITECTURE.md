# Architecture

## Top-level shape

```
src/
  main.ts                  # bootstraps everything; mounts Pixi, kicks loop
  config.ts                # single typed source of all tunable values
  types.ts                 # shared types (Vec2, RGB, Entity ids)
  engine/
    loop.ts                # fixed-timestep simulation + render decouple
    rng.ts                 # seedable PRNG
    pool.ts                # generic object pool
    math.ts                # Vec2 helpers, lerp, clamp, smoothstep
    events.ts              # tiny typed event bus for cross-system signals
  game/
    world.ts               # world state container + step()
    player.ts              # player ship system
    bullets.ts             # bullet pool + system
    enemies/
      wanderer.ts          # Wanderer behaviour
    enemies.ts             # enemy registry / spawn glue
    score.ts               # score + multiplier logic
  fx/
    particles.ts           # particle pool, ParticleContainer-backed
    grid.ts                # reactive deformable grid
    effects.ts             # placeholder for shake/hitstop/slow-mo (iter ≥3)
  render/
    renderer.ts            # Pixi Application setup, layers, resize
    ships.ts               # vector ship draw helpers
    hud.ts                 # DOM HUD (score, mult, perf overlay)
  input/
    controls.ts            # control scheme dispatcher
    schemes/
      single-thumb-autoaim.ts  # default v1 scheme
  pwa/
    register.ts             # service worker registration via vite-plugin-pwa
  styles.css
```

## Responsibilities

- **`engine/loop.ts`** — owns the timing. Fixed simulation tick, accumulator
  pattern, render gets an interpolation alpha. Caller registers `step(dt)` and
  `render(alpha)` callbacks.
- **`config.ts`** — every tunable lives here, fully typed, defaults frozen at
  module load. The Tweaks Menu (iteration 2) overlays this with persistent
  user state.
- **`game/world.ts`** — owns the entity arrays / pools, coordinates per-tick
  systems in fixed order: input → player → bullets → enemies → collisions →
  score → fx → grid.
- **`fx/particles.ts`** — owns the particle pool. Spawning is allocation-free.
  Backed by Pixi `ParticleContainer` for batched draw.
- **`fx/grid.ts`** — spring-mass grid; displaces toward the player and away
  from explosions; relaxes by spring + damping each tick.
- **`render/renderer.ts`** — owns the Pixi `Application`, layer ordering
  (grid → bullets → enemies → player → particles), resize handling.
- **`input/controls.ts`** — dispatches to the active control scheme. Schemes
  are interchangeable modules implementing a small interface.

## Cross-cutting rules

- **Zero allocation in the hot loop.** Pools, reused vectors, typed arrays
  where it matters. No `new` per tick on entities, particles, or vectors.
- **Pure functions where possible.** Systems take state + inputs and mutate
  bounded structures.
- **Events for one-shot signals only.** Per-tick state goes through arrays.
- **Effects layer is event-driven.** Kill events fan out to particles, shake,
  hitstop, score, audio (later). Systems listen rather than reach in.

## Iteration 2: Tweaks Menu

A `tweaks/` module reads/writes to localStorage (key includes build version),
overlays `config.ts` defaults at boot, and binds UI controls to the live
config. It writes a `TWEAKS_FEEDBACK.jsonl` line via `navigator.clipboard` /
download fallback for human consumption.

## What we deliberately don't have

- A full ECS. The entity counts and system count for v1 don't justify it. We
  use plain typed arrays + system functions. If/when complexity warrants, the
  `world.ts` can be migrated component-by-component.
- A scene graph beyond Pixi's. A single root container with three layers is
  enough.
- A general physics engine. Circle-circle / point-rect is plenty.
