# Performance

## Targets

- 60fps on a Pixel-class Android (Pixel 5/6/7) and recent iPhone (≥12) in
  Safari.
- Per-frame budget: **simulation ≤ 4ms**, **render ≤ 8ms** with the design's
  target entity and particle counts.
- Bundle ≤ **500 KB gzipped**. Revise deliberately, never silently. If we're
  approaching it, write it down here first.

## Particle ambition

- Heavy combat: **thousands** of particles on screen, not hundreds. This is
  Geometry Wars' identity and the engineering must rise to meet it.
- Implementation: PixiJS `ParticleContainer` (batched, instanced under the
  hood). Particle struct is plain numbers in pre-sized typed arrays + a
  per-particle Pixi `Sprite` from a fixed soft-circle texture, stored in a
  pool.

## Current measurements

> First slice. These will be filled in once we run on real devices.

| build | device                  | sim ms | render ms | particles peak | fps |
| ----- | ----------------------- | ------ | --------- | -------------- | --- |
| 0.1.0 | Pixel 5 / Chrome        | tbd    | tbd       | tbd            | tbd |
| 0.1.0 | iPhone 13 / Safari      | tbd    | tbd       | tbd            | tbd |
| 0.1.0 | Desktop / Chrome (dev)  | tbd    | tbd       | tbd            | tbd |

## Bundle

| build | gzipped | notes                                             |
| ----- | ------- | ------------------------------------------------- |
| 0.1.0 | ~159 KB | Pixi 142 KB gz, app 8 KB, Workbox SW ~10 KB.      |
| 0.2.0 | ~168 KB | + Tweaks Menu (12 KB app, 1.7 KB CSS).            |

## Optimisation log

Append-only. Every actual optimisation gets a line.

- *(none yet — first slice in flight)*
