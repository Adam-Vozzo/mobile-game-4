# Neon Drift

Mobile-first PWA twin-stick shooter in the spirit of Geometry Wars: pure vector,
neon, glow, lavish particles. Score-chasing, juice-heavy, multiplier-driven.

**Current build: v0.15.0** — See `CHANGELOG.md` for the full iteration log.

## Run locally

```bash
npm install
npm run dev    # http://localhost:5173
```

Use a phone-shaped browser viewport (landscape). On a real device, install as
a PWA from the browser menu.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e         # requires `npm run test:e2e:install` once
```

---

## Design

### Vision

A polished, juice-heavy, score-chasing arcade game that runs at 60fps on
mid-range mobile in landscape, installable as a PWA, fully playable offline.
Pure vector, neon, additive glow, lavish particles, deformable grid. The
identity is **volume of effect on every kill**.

### Pillars (do not drift)

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

### V1 target mode

A single canonical mode: **Waves/Evolved-style endless** with a score
multiplier that builds on chained kills and decays when idle. Other modes are
post-v1.

### Platform

- Browser + installable PWA, mobile-first, **landscape only**.
- Targets: 60fps on a Pixel-class Android, recent iPhone in Safari.
- Offline via service worker. Install prompt. Fullscreen. Orientation lock.
  Safe-area aware.

### Touch controls — design rationale

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

### Aesthetic anchors

- Pitch-black background (`#000`).
- Cyan `#00fff7` for player/grid, magenta `#ff2bd6` for enemies, hot yellow
  `#ffff66` and white for explosions and brief flashes.
- Additive blending everywhere effective; bloom-like glow via stacked
  half-alpha strokes.
- Vector ships drawn as line polygons, not filled.

### References

- *Geometry Wars 2 / 3* — particle volume, grid reactivity, multiplier loop.
- *Resogun* — voxel-equivalent silhouettes, kill feedback.
- *Beat Hazard* — music reactivity (later iteration).

### What's deliberately not in scope (yet)

- Multiple game modes
- Bombs / smart-bombs / power-ups
- Boss fights
- Online leaderboards
- Story/tutorial scenes (an ephemeral on-screen prompt is fine)
- Raster art of any kind

---

## Roadmap

### Now (completed)

- **v0.1.0** — Vertical slice.
- **v0.2.0** — Tweaks Menu. All 5 categories wired; LIKE/DISLIKE/COMPARE feedback
  writer; virtual-twin-sticks control scheme toggle.
- **v0.3.0** — Audio SFX Bus. Web Audio API synthesiser, 3 sounds, sfxEnabled toggle.
- **v0.4.0** — Kill feedback triad. Hitstop, slow-mo on big kill, screen flash.
- **v0.5.0** — New enemy types: Grunt (heavy charger) + Weaver (sinusoidal homer).
- **v0.6.0** — Game-over flow. Lives system, invincibility window, death cam,
  best-score persistence, retry.
- **v0.7.0** — Procedural music + beat reactivity. 128 BPM synthwave loop, all
  Web Audio API. Beat-driven grid pulse + snare flash.
- **v0.8.0** — Spawn Director. Difficulty curve, interpolated spawn interval,
  escalating enemy mix, surge bursts.
- **v0.9.0** — Surge Visual Indicator. Orange screen-edge pulsing glow during surges.
- **v0.10.0** — Black Hole enemy. Gravity-well (5 HP), bends bullets, pulls player.
- **v0.11.0** — Splitter enemy. Yellow square that splits into 2 aggressive shards.
- **v0.12.0** — Snake enemy. Teal segmented enemy; body absorbs bullets, only head killable.
- **v0.13.0** — Pinwheel enemy. Violet hub shielded by three orbiting bullet-absorbing drones.
- **v0.14.0** — Main Menu Shell. Title screen with best score, pulsing play button.
- **v0.15.0** — Camera Punch. Beat-synced directional displacement on kill, spring return.

### Next

- Wire `TWEAKS_FEEDBACK.jsonl` into a CI/repo workflow so downloaded
  feedback gets appended automatically.
- PROMOTE/DEMOTE pass: promote well-liked experimental enemy toggles to
  default-on once playtest data arrives.
- Polish: kill-chain combo counter visual (on-screen streak number that
  pops in sync with multiplier gains).

### Later

- Second mode (probably Pacifism or Sequence).
- Bomb / smart-bomb mechanic (only if it serves the multiplier loop).
- Music-reactive grid/particle flourishes.
- Adaptive quality only as a graceful degradation toggle for genuinely low-end
  devices. Never a default.

### Ideas (unranked)

- Risk modifier: voluntary "danger close" multiplier boost.
- Geometric "biomes" of enemy mixes.
- Photo-mode / replay snapshot.

---

## Project docs

| File | Purpose |
|------|---------|
| `DESIGN.md` | Full design constitution (vision, pillars, control rationale) |
| `ROADMAP.md` | Now / Next / Later / Ideas |
| `CHANGELOG.md` | Append-only iteration log |
| `ARCHITECTURE.md` | Module map |
| `KNOWN_ISSUES.md` | Bugs & tech debt |
| `PLAYTEST_NOTES.md` | Free-form human feedback |
| `TWEAKS_FEEDBACK.jsonl` | Structured feedback from the Tweaks Menu |
| `PERF.md` | Frame budget & current measurements |
| `LOCKED_PARAMS.md` | Feel-critical defaults |

## License

Private.
