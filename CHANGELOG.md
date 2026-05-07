# Changelog

Append-only iteration log. One concern per entry. Don't edit past entries.

## 0.9.0 — Iteration 9: Surge Visual Indicator (2026-05-07)

**Choice: FEATURE** — No feedback to act on. Surge Visual Indicator is the first item
in the ROADMAP "Next" list and directly serves the Spawn Director (iteration 8):
when a surge fires, players felt the extra enemies but had no forewarning. An animated
screen-edge glow + surge-start flash now communicates burst timing clearly.

### What landed

- **`src/fx/surge-glow.ts`** — `SurgeGlow` class.
  - Draws 4 additive-blend edge strips (36 px thick, 60 px overshoot for shake coverage).
  - `setSurging(active)` drives an intensity envelope (rise: 5/s, decay: 1.8/s).
  - Alpha pulses at 2.5 Hz between 0.08 and 0.48 scaled by intensity.
  - Geometry redrawn lazily only when viewport dimensions change.
  - `clear()` instantly hides glow (called on game reset/retry).
- **`src/engine/events.ts`** — Added `surgeChange: { active: boolean }` event for
  future listeners (audio hit, future mode logic).
- **`src/config.ts`** — Added `juice.surgeIndicator: boolean` (default `false`).
- **`src/game/world.ts`** — `updateSurge()` private method detects `director.isSurging`
  transitions, emits `surgeChange`, triggers a brief orange screen flash on surge start
  (when `screenFlash` is also on), and drives `surgeGlow`. Glow steps in playing,
  death-cam, and hitstop paths so it fades cleanly in all states.
- **`src/tweaks/registry.ts`** — `juice.surgeIndicator` toggle under Visual Juice
  (experimental, default off, with description).
- **`buildVersion`** bumped to `0.9.0`.

### Tests

- 5 new tests in `tests/surge-glow.test.ts`: starts invisible, rises when surging,
  decays after surge ends, clear() resets, geometry redrawn only on viewport change.
- Total: **57 tests passing**.

### Toggles added

- `juice.surgeIndicator` — experimental, default **off**.
  Description: "Animated orange screen-edge glow during Spawn Director surge bursts. Requires Spawn Director on."

### Risks

- Glow is purely additive so it has zero impact on legibility (adds brightness, never darkens).
- `surgeChange` event adds a marginal allocation cost (one Set lookup per transition,
  which is rare — every ~50 s on average).

### Bundle

- index.js: 17.99 KB gz (was 17.49 KB; +0.50 KB for SurgeGlow module).

## 0.8.0 — Iteration 8: Spawn Director (2026-05-06)

**Choice: FEATURE** — No feedback to act on. Spawn Director is the top remaining
feel-affecting roadmap item: replaces flat enemy spawning with an escalating
difficulty curve, dynamic enemy mix, and random surge bursts.

### What landed

- `src/game/spawn-director.ts` — new `SpawnDirector` class.
  - Smooth difficulty curve: 0→1 over `rampSeconds` (default 120 s).
  - Spawn interval interpolates 1.4 s → 0.35 s as difficulty rises.
  - Simultaneous enemy cap scales from 16 → 32.
  - Enemy mix shifts with smoothstep transitions: Wanderers-only early,
    Grunts appear at t≈0.2, Weavers at t≈0.45 — max mix is ~40/30/30.
  - Respects `flow.newEnemyTypes` flag — Wanderers-only when false.
  - Random "surge" bursts (2% chance/s, 4 s long, 3.3× spawn rate) create
    intensity peaks and troughs.
- `src/config.ts` — new `spawnDirector` config block with 9 tunable params.
- `src/game/world.ts` — director wired in; flat-rate path preserved when
  director is disabled. `spawnAt()` helper extracted (DRY).
- `src/tweaks/registry.ts` — experimental toggle registered under Flow.

### Tests

- 9 new tests in `tests/spawn-director.test.ts` covering: difficulty curve,
  clamping, cap enforcement, spawn production, enemy type selection by
  `newEnemyTypes` flag, variety at max difficulty, surge state, and reset.
- Total: **52 tests passing**.

### Toggles

- `spawnDirector.enabled` — experimental, default **off**.
  Description: "Escalating pressure over 2 min — spawn rate ramps, enemy mix
  shifts, random surges spike intensity."

### Risks

- Surge bursts with all enemy types enabled may create temporarily dense
  screens on low-end devices; `maxMaxAlive: 32` cap limits worst case.
- Difficulty ramp is 120 s — may feel too slow early; `rampSeconds` is
  config-exposed for easy tuning via feedback.

### Bundle

- index.js: 17.49 KB gz (was 17.49 KB; +negligible for director module).

## 0.7.0 — Iteration 7: Procedural music engine + beat reactivity (2026-05-06)

**Choice: FEATURE** — No feedback to act on. Music is design pillar 7 (music-reactive
flourishes) and the top remaining feel-affecting roadmap item. Implemented as a
Web Audio API synthesizer (no asset files) behind an experimental toggle.

### What

- **`src/audio/music.ts`** — `MusicEngine` class. 128 BPM synthwave loop procedurally
  synthesised from Web Audio API primitives:
  - **Kick drum**: sine oscillator with pitch-drop (180→38 Hz), heavy low end.
  - **Snare**: noise burst (highpass 1800 Hz) + sine body tone.
  - **Hi-hat**: short noise burst (highpass 8000 Hz) on off-beats.
  - **Bass**: triangle oscillator, A-minor-pentatonic 16-step sequence, lowpass-filtered.
  - **Lead melody**: sawtooth + resonant lowpass (Q=5), A-minor-pentatonic, one note
    per quarter note, filter sweep on each note.
  - Lookahead scheduler: schedules 150ms of audio every 50ms — no glitches.
  - `start()` / `stop()` / `updateVolume()` / `isRunning` public API.
  - `start()` is idempotent and self-guards on `config.audio.musicEnabled`.
- **Beat reactivity** (`src/game/world.ts`): listens for `musicBeat` events.
  - Kick: `grid.push()` from screen center — subtle rhythmic breath in the grid.
  - Snare: dim purple `screenFlash` pulse (0x8833ff, α=0.08) when `screenFlash` is on.
  - Only fires when `config.audio.musicReactivity` is true.
- **`musicBeat` event** added to `GameEvents` / `src/engine/events.ts`:
  `{ isKick: boolean, step: number }`.
- **`audio.musicEnabled`** config field added (default `false`).
- **Tweaks Menu** (Audio category):
  - `audio.musicEnabled` — "Procedural music (128 BPM synthwave)" — experimental, default off.
  - `audio.musicReactivity` — "Music-reactive grid + particles" — experimental (label updated).
  - `audio.musicVolume` slider moved below `musicEnabled` for better UX grouping.
- **Wired in `main.ts`**:
  - `pointerdown` on host calls `musicEngine.start()` (satisfies AudioContext user-gesture
    requirement; `start()` ignores the call if disabled or already running).
  - `gameOver` event stops the music.
  - Retry (PLAY AGAIN button) restarts the music.
- **`buildVersion`** bumped to `0.7.0`.
- 7 new tests for `MusicEngine`; total now 43 passing.
- Bundle: 163 KB gz (still well under 500 KB target).

### Risks

- The procedural music has no randomisation between runs (deterministic sequence). This
  is intentional for v1 — it's easy to predict which notes will play and lets the human
  judge if the loop is listenable before adding variation.
- Beat events use `setTimeout` for scheduling: if the tab is backgrounded, timer precision
  degrades and beats may drift from the audio. The audio itself stays accurate (Web Audio
  API schedules ahead). Reactivity may feel slightly late after a tab-switch — acceptable.
- The `pointerdown` listener to start music fires on every pointer event (not just once),
  but `start()` is idempotent so there's no performance cost.

## 0.6.0 — Iteration 6: Game-over flow — lives, death cam, score panel, retry (2026-05-06)

**Choice: FEATURE** — No feedback to act on; game-over flow was the top ROADMAP item
and the most critical missing piece for playability (dying had zero consequence).

### What

- **Lives system**: 3 lives (`config.flow.startingLives`). Tracked in `World.lives`,
  displayed in HUD as three cyan `◆` pips below the score.
- **Invincibility window**: 2 s after each non-fatal hit. Player blinks every 120 ms
  during this window; collision is suppressed. Prevents cheap double-hits.
- **Score survives between lives**: on hit, only the multiplier is reset
  (`score.resetMultiplier()` instead of full `score.reset()`). Score accumulates;
  the game-over panel shows what you earned.
- **Death cam**: on the last life, `gameState` transitions to `'dying'`. Sim
  trickles at 0.06× speed for 1.5 s — huge particle burst + shake plays out
  in dramatic slow-mo before the overlay appears.
- **Game-over overlay** (`src/ui/game-over.ts`): neon HTML panel shows SCORE,
  BEST (localStorage), PEAK MULT, plus a "PLAY AGAIN" button. Fades in with a
  CSS scale animation. "NEW BEST" badge pulses in yellow when a personal best
  is beaten.
- **Best score persistence**: `ScoreState.loadBestScore()` / `saveBestScore()` via
  `localStorage`. Key `'neonDrift.bestScore'`. Safe-guarded try/catch for private
  mode.
- **`peakMultiplier`** added to `ScoreState` — tracks the highest multiplier seen in
  the current run; shown in the game-over panel.
- **`World.reset()`**: full retry — clears all enemies/bullets/particles, repositions
  player, resets lives + score, restores `gameState = 'playing'`.
- `ParticleSystem.clear()` and `ScreenFlash.clear()` added (used by reset).
- `releaseAll()` added to `Wanderers`, `Grunts`, `Weavers`, `Bullets` (used by reset).
- `buildVersion` bumped to `0.6.0`.
- 2 new tests for `peakMultiplier` and `resetMultiplier`.

### Risks

- The 600 ms overlay delay is tuned for the 1.5 s death-cam + 0.06× playback:
  adjust `setTimeout` in `main.ts` if the death-cam speed changes.
- `gameOver` event is emitted once and never cleared; retrying with a second
  death won't double-subscribe because `events.on` is idempotent across sessions.
- Best score persists across page refreshes; no way to clear it from the UI
  (can be added later as a Tweaks Menu option).

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
