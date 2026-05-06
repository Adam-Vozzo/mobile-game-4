# Changelog

Append-only iteration log. One concern per entry. Don't edit past entries.

## 0.5.0 — Iteration 5: New enemy types — Grunt + Weaver (2026-05-06)

**Choice: FEATURE** — top feel-affecting ROADMAP item. Only one enemy type
(Wanderer) existed; a single-enemy game has no tactical variety. Two new types
add distinct threat personalities without requiring a spawn director rewrite.

### What

- **Grunt** (`src/game/enemies/grunt.ts`): heavy orange triangle. Idles slowly
  (wanders) until the player enters its 260 px detection radius, then charges at
  3× idle speed and faces the player (visual threat cue). Larger hitbox (radius
  16), worth 50 pts. Orange particle burst on kill; heavier shake and grid kick.
- **Weaver** (`src/game/enemies/weaver.ts`): slim lime chevron. Homes toward the
  player while oscillating side-to-side in a sine wave, making it harder to
  predict. Smaller hitbox (radius 11), worth 75 pts. Lime particle burst on kill.
- **New ship shapes** in `src/render/ships.ts`: `drawGrunt` (filled triangle,
  orange glow layers) and `drawWeaver` (open chevron/V, lime glow layers) —
  matching the stacked-halo style of existing shapes.
- **Toggle**: `flow.newEnemyTypes` (experimental, default off) in the Tweaks Menu
  → Flow category. When off, only Wanderers spawn (existing behaviour unchanged).
  When on, spawn director picks: 50% Wanderer / 30% Grunt / 20% Weaver. The
  combined enemy count respects `enemies.spawn.maxAlive`.
- **Auto-aim** now considers all enemy types, not just wanderers, so the player
  leads shots correctly when new types are present.
- **Config**: added `enemies.grunt.*` and `enemies.weaver.*` blocks; `flow.newEnemyTypes`.
- **`buildVersion`** bumped to 0.5.0.

### Risks

- Grunt charge detection radius (260 px) may feel too tight on large screens
  where the player has more room — tweak `detectionRadius` if playtests flag.
- Weaver wave amplitude (0.7×) and frequency (2.5 rad/s) are first-pass;
  may feel too chaotic or too easy — both are config values, adjustable.
- New enemy pools add 2×64 Graphics objects to the scene graph at startup; all
  are invisible until acquired. Negligible on modern hardware; watch PixiJS
  container child count if performance regresses.
- Bundle size: negligible increase (~1 KB gz, two small modules).

## 0.4.0 — Iteration 4: Kill feedback triad (2026-05-06)

Choice: FEATURE — implementing hitstop, slow-mo, and screen flash.

- **Hitstop** (`juice.hitstopMs`, experimental slider 0–80 ms): freezes the
  simulation for N fixed-step frames (120 Hz) after each kill. Shake and flash
  still tick during freeze so they feel instantaneous. Was registered in the
  tweaks menu since v0.2.0 but had no effect; now implemented.
- **Slow-mo on big kill** (`juice.slowMoOnBigKill`, experimental toggle):
  when enabled and the player's multiplier is ≥ 5×, each kill drops the time
  scale to 0.15× for 1.5 s then recovers. Uses real dt for the timer so the
  window is always 1.5 wall-clock seconds. Player-hit cancels slow-mo. Was
  registered since v0.2.0 but unimplemented; now live.
- **Screen flash** (`juice.screenFlash`, new experimental toggle): full-screen
  colour overlay that pops on events and fades out. Kill → magenta 0.35 alpha /
  150 ms; player-hit → white 0.55 alpha / 300 ms. Implemented as a single
  oversized `Graphics` quad in a new `overlay` render layer above particles.
  Color is cached; redraws only on color change (once per event type).
- `renderer.ts`: added `overlay: Container` as the top-most render layer for
  UI-plane effects that sit above game content.
- `src/fx/screen-flash.ts`: new ScreenFlash class.
- `config.ts`: added `juice.screenFlash` (default false); bumped version to
  0.4.0.
- All three effects default off; promote any or all via TWEAKS_FEEDBACK.
- Risks: screen flash slightly shakes with the camera (stage-level offset
  applies to the overlay too) — imperceptible at the short durations used.
- Bundle: +0.44 KB gz game JS. Total ≪ 500 KB.
- Tests: no new unit tests needed; effects are thin presentation
  wrappers with no domain logic to unit-test.

## 0.3.0 — Iteration 3: Audio SFX Bus (2026-05-06)

**Choice: FEATURE** — top ROADMAP "Next" item; config stubs for audio were already
present, events system already had `kill`/`playerHit`; clean moment to land it.

### What
- New `src/audio/bus.ts`: `AudioBus` class wraps the Web Audio API with three
  procedurally-synthesised sounds:
  - **shoot** — square-wave blip, 820→340 Hz in 45 ms (fires every shot)
  - **kill** — sine kick (130→38 Hz, 180 ms) + white-noise burst through a 1.8 kHz
    highpass (90 ms)
  - **playerHit** — sawtooth wail, 380→55 Hz descending over 380 ms
- Lazy-init: `AudioContext` is created on the first sound call, naturally satisfying
  browser user-gesture requirements.
- Graceful degradation: no throw if `AudioContext` is absent (old/restricted browsers).
- `AudioBus.init()` subscribes to `kill`, `playerHit`, and new `shoot` events;
  returns a teardown fn.
- Added `ShootEvent` to `GameEvents`; `world.ts` emits `shoot` when a bullet fires.
- `config.audio.sfxEnabled` added; `AudioBus` checks it before constructing
  `AudioContext`, so the setting takes effect without a reload.
- Tweaks Menu: "SFX enabled" toggle wired into the Audio category.
- `audioBus` singleton exported; exposed on `window.__game` for smoke/dev access.

### Tests
- 7 new tests in `tests/audio.test.ts` covering: init/teardown, shoot/kill/playerHit
  playback, sfxEnabled=false silencing, destroy() cleans up event subscriptions,
  missing AudioContext graceful-no-throw.
- Total: **34 tests passing**.

### Risks
- Web Audio API synth sounds are tuned but untested on device — player may find
  the shoot sound fatiguing at high fire rates. `sfxVolume` slider and `sfxEnabled`
  toggle both available immediately from the Tweaks Menu.
- No music yet — audio bus is SFX-only; music track remains a ROADMAP item.

### Bundle
- index.js: 12.87 KB gz (was 12.19 KB; +0.68 KB for the new audio module). Still
  well within 500 KB budget.

## 0.2.0 — Iteration 2: Tweaks Menu

- Added `src/tweaks/` module: state persistence, declarative tweak registry,
  feedback writer, four-finger-tap gesture detector, and the menu UI itself.
- The menu pauses the loop while open, persists user-changed values to
  localStorage keyed by `buildVersion`, and applies them at boot before any
  system reads `config`.
- Five categories wired (the spec asked for at least controls + visual juice):
  Controls, Visual juice, Audio, Game flow, Debug.
- Each tweak renders the right widget for its kind: toggle / select / slider.
  Tweaks tagged `experimental` get a magenta badge; defaults to off.
- Feedback panel: LIKE / DISLIKE / COMPARE buttons + free-text note, write a
  `{timestamp, tag, buildVersion, note, config}` entry to a localStorage
  buffer and copy the JSONL line to the clipboard. "Download feedback" emits
  the full buffer as a `.jsonl` file. "Export config" copies a config JSON
  snapshot to clipboard.
- Live perf line is always visible at the top of the menu while open: fps,
  sim ms, render ms, entity count, particle count, build version.
- Reset per-category and reset-all buttons.
- Open gestures: four-finger tap (touch), backtick/tilde (desktop dev), and
  a small floating gear button when running `npm run dev`.
- Added a second control scheme: `virtual-twin-sticks`. Switching schemes via
  the menu hot-swaps without reloading. Default remains `single-thumb-autoaim`
  per `LOCKED_PARAMS.md`.
- Engine: `Loop.setPaused()` so the menu can freeze simulation cleanly.
- Tests: 7 new tweaks-state/registry/feedback tests; total now 27 passing.
- Bundle: 168 KB gz (still well under 500 KB target).

## 0.1.0 — Iteration 1: Vertical slice

- Repo scaffolded: TypeScript strict, Vite, PixiJS 7, Howler, Workbox via
  vite-plugin-pwa, Vitest, Playwright, ESLint, Prettier.
- Docs stubbed: `DESIGN.md`, `ROADMAP.md`, `CHANGELOG.md`, `ARCHITECTURE.md`,
  `KNOWN_ISSUES.md`, `PLAYTEST_NOTES.md`, `TWEAKS_FEEDBACK.jsonl`, `PERF.md`,
  `LOCKED_PARAMS.md`.
- Engine: fixed-timestep simulation @ 120Hz logic / render-uncoupled, typed
  config module (`src/config.ts`) as the single source of all tunable values.
- Renderer: PixiJS 7 WebGL stage, additive-blend Graphics for ships,
  `ParticleContainer` for thousands of particles. Bloom-like glow approximated
  via stacked half-alpha strokes (no post-process pass yet — kept cheap for v1).
- Reactive grid: 32x18 spring-mass grid, displaces toward player and away from
  explosions; rendered as lines with additive blend.
- Player: cyan vector ship, single-thumb auto-aim control scheme by default.
  Movement via left-half drag with dead-zone; auto-fire at nearest enemy.
- Bullets: object-pooled, 256 cap, simple linear motion.
- Enemy: Wanderer — drifts in a slow noise-curved path, magenta diamond
  silhouette. Object-pooled, 128 cap.
- Particles: object-pooled, 4096 cap targeting thousands on-screen during
  combat. ParticleContainer-backed. Burst on every kill.
- Score + multiplier HUD: tabular numbers, neon text-shadow glow, mult chains
  on consecutive kills within a window, decays when idle.
- PWA: manifest with landscape orientation lock, fullscreen display, theme
  color, SVG icons. Service worker via Workbox precache + runtime caching for
  static assets.
- Touch UX: prevents pinch/zoom, suppresses tap highlight, blocks
  overscroll-bounce, displays a portrait-rotation prompt on small portrait
  screens.
- Tests: Vitest unit tests for the math/RNG/pool/multiplier helpers; Playwright
  smoke test loads the app, renders for 10s, asserts no console errors and a
  non-zero score-able state.
- CI: GitHub Actions matrix runs typecheck → lint → unit → build → bundle-size
  → headless e2e on push and PR.
- Quality gates: typecheck, lint, unit, build all green at commit time;
  bundle ≤ 500 KB gzipped target tracked in `PERF.md`.
