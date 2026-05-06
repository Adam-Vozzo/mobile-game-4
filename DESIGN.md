# Neon Drift — Design

## Vision

A polished, juice-heavy, score-chasing arcade game that runs at 60fps on
mid-range mobile in landscape, installable as a PWA, fully playable offline.
Pure vector, neon, additive glow, lavish particles, deformable grid. The
identity is **volume of effect on every kill**.

## Pillars (do not drift)

1. **Pure vector / neon / glow.** No raster sprites. Lines, additive blending,
   bloom feel.
2. **Reactive deformable grid** that responds to player, enemies, explosions.
3. **Lavish particles.** Thousands on screen during heavy combat is the bar,
   not the ceiling. Engineering rises to meet design, not throttles it.
4. **Distinct enemy personalities** with readable silhouettes and movement
   signatures.
5. **Score multiplier** as the primary progression hook. Risk/reward tension.
6. **Screen shake, hitstop, slow-mo, audio impact** on every meaningful event.
7. **Music-reactive flourishes** where natural.

## V1 target mode

A single canonical mode: **Waves/Evolved-style endless** with a score
multiplier that builds on chained kills and decays when idle. Other modes are
post-v1.

## Platform

- Browser + installable PWA, mobile-first, **landscape only**.
- Targets: 60fps on a Pixel-class Android, recent iPhone in Safari.
- Offline via service worker. Install prompt. Fullscreen. Orientation lock.
  Safe-area aware.

## Touch controls — design rationale

Virtual twin-sticks on touch are a known antipattern: cramped, occluded by
thumbs, fatiguing. Multiple schemes will ship behind the Tweaks Menu so the
human can pick:

- **Single-thumb auto-aim** *(v1 default)*: left half drags to move, the ship
  fires automatically at the nearest threat. Only one thumb needed.
- **Virtual twin-sticks**: left half = move, right half = aim/fire. Familiar
  but cramped.
- **Drag-aim**: tap-and-drag anywhere on the right half to set fire vector.
- **Gesture-dash**: swipe direction = directional dash; auto-aim handles fire.

**Default for v1:** single-thumb auto-aim. It's the highest-floor scheme on
small screens, gives the broadest audience an immediate good first ten
seconds, and lets the human compare alternatives via the Tweaks Menu.

## Aesthetic anchors

- Pitch-black background (`#000`).
- Cyan `#00fff7` for player/grid, magenta `#ff2bd6` for enemies, hot yellow
  `#ffff66` and white for explosions and brief flashes.
- Additive blending everywhere effective; bloom-like glow via stacked
  half-alpha strokes.
- Vector ships drawn as line polygons, not filled.

## References

- *Geometry Wars 2 / 3* — particle volume, grid reactivity, multiplier loop.
- *Resogun* — voxel-equivalent silhouettes, kill feedback.
- *Beat Hazard* — music reactivity (later iteration).

## What's deliberately not in scope (yet)

- Multiple game modes
- Bombs / smart-bombs / power-ups
- Boss fights
- Online leaderboards
- Story/tutorial scenes (an ephemeral on-screen prompt is fine)
- Raster art of any kind
