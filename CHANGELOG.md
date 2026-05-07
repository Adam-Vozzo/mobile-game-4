# Changelog

Append-only iteration log. One concern per entry. Don't edit past entries.

## 0.14.0 — Iteration 14: Main Menu Shell (2026-05-07)

**Choice: FEATURE** — No feedback, no bugs, no open PRs. ROADMAP.Next lists
"Main menu shell" explicitly. The game currently drops players into live combat
with no context; a title screen completes the basic game flow loop.

**What:**
- `MainMenu` class in `src/ui/main-menu.ts`. Fullscreen overlay shown on boot,
  z-index 150 (above HUD at 10, below game-over at 200, below tweaks at 1000).
  - **NEON DRIFT** title in large cyan glowing text (`clamp(56px, 10vw, 88px)`).
  - Tagline "CHAIN KILLS · BUILD MULTIPLIER · SURVIVE" in dim caps.
  - Best score row (hidden until a score > 0 has been saved to localStorage).
  - **TAP TO PLAY** button with a gentle pulsing glow animation.
  - "4-FINGER TAP FOR SETTINGS" hint in dim text.
  - Deliberately semi-transparent background (`rgba(0,0,0,0.72)`) so the live
    reactive grid shows through — provides atmospheric movement with zero
    gameplay active.
- **Flow on boot**: `loop.start()` is called with `loop.setPaused(true)`.
  The render loop runs (grid animates), simulation does not (no enemies, no
  physics). `mainMenu.show()` is called after all setup completes.
- **"TAP TO PLAY"**: hides menu, calls `startGame()` → `world.reset()`,
  `loop.setPaused(false)`, `musicEngine.start()`.
- **"MAIN MENU" button** added to the game-over overlay (secondary, dim — below
  the primary "PLAY AGAIN" CTA). Routes to `returnToMenu()` → `world.reset()`,
  `loop.setPaused(true)`, `musicEngine.stop()`, `mainMenu.show()`. If no
  `onMenu` callback is provided, the button is hidden (backwards-compatible).
- Smoke test updated to click `#mm-play` before the game-interaction loop.
- 106 tests still passing (no new unit tests needed — UI overlay has no
  extractable pure logic).
- Bundle: 22.94 KB gzip (no change — CSS additions are compressed alongside
  existing styles).

**Risks:**
- The "MAIN MENU" button on game-over adds a new escape route that skips the
  retry flow. Risk is low: it's a secondary action, subdued visually.
- `world.reset()` is called at every entry to `startGame()` — harmless double
  reset on first play but consistent with the retry path.

**Toggles added:** none

## 0.13.0 — Iteration 13: Pinwheel Enemy (2026-05-07)

**Choice: FEATURE** — No feedback, no bugs, no open PRs. ROADMAP.Next lists
Pinwheel as the last remaining named enemy type. Mechanically distinctive as
the first enemy with an active shield layer: three drone satellites orbit the
core and absorb bullets, forcing players to time shots through the rotating
gaps rather than just peppering the enemy directly.

**What:**
- `Pinwheels` class in `src/game/enemies/pinwheel.ts`. Pool cap 4 (2 max
  concurrent with swap headroom). Each pinwheel has:
  - **Hub**: violet 6-pointed star, 3 HP. Drifts toward the player at 38 px/s
    with a gentle steering lag. Visually counter-rotates (opposite direction to
    the drone constellation) for kinetic contrast.
  - **Three drones**: pale violet circles (r=8) that orbit the hub at radius 46
    with angular speed 1.7 rad/s (~1 full rotation every 3.7 s). Unkillable —
    bullets are absorbed silently. Players must thread shots through the ~60°
    rotating gaps.
  - **Wall margin**: hub bounces off walls keeping the full orbit extent inside
    world bounds (margin = hubRadius + orbitRadius + droneRadius).
- **Kill FX**: triple purple burst (core + outer ring + white spark), grid push
  1.3×, screen shake 10×, screen flash, hitstop, slow-mo at high multiplier.
  175 pts.
- **First-hit feedback**: small violet particle burst + mild shake + flash.
- `flow.pinwheelEnemy` experimental toggle (default off) wired into Tweaks
  Menu under Flow with description.
- **Spawn Director**: pinwheel weight rises 0→0.10 between difficulty 0.5→1.0
  (late-game only), gated by toggle.
- **Flat spawner**: 15% chance when `pinwheelEnemy` is on and fewer than 2
  concurrent pinwheels exist; also folded into the `newEnemyTypes` branch at
  8% weight displacing other types proportionally.
- Auto-aim targets the hub.
- 12 new unit tests (count, spawn/release, hp flow, damage, orbit positions,
  step movement, wall clamping); total now **106 passing**.
- Bundle: 22.58 KB gzip (no meaningful change, well under 500 KB target).

**Risks:**
- Rotating drone collision uses live-computed orbit angle every frame (not the
  stored Graphics positions), so collision is authoritative regardless of frame
  rate. Minor duplicated trig with `_placeDrones` — acceptable for clarity.
- At high difficulty with 2 concurrent pinwheels, the arena has 6 rotating
  hazard zones. The slow hub speed (38 px/s) and 2-concurrent cap should keep
  it readable; playtest will tell.

**Toggles added:** `flow.pinwheelEnemy` (experimental, default off)

## 0.12.0 — Iteration 12: Snake Enemy (2026-05-07)

**Choice: FEATURE** — No feedback, no bugs, no open PRs. ROADMAP.Next lists
Snake as the next enemy. It's the most mechanically distinctive of the remaining
candidates: the body segments block bullets, forcing the player to outmanoeuvre
the trail before getting a clear shot at the head.

**What:**
- `Snakes` class in `src/game/enemies/snake.ts`. Pool cap 3; each snake has:
  - **Head**: teal arrowhead (`drawSnakeHead`), 2 HP, loosely steers toward the
    player (55% probability per wobble tick, otherwise random drift). Bounces
    off walls with heading correction.
  - **Body segments**: 5 circles tapering from r=10 to r=5 (`drawSnakeSegment`),
    drawn along a position ring-buffer that the head writes every 4 px of travel.
    Bullet-absorbing (blocks shots silently) but player-lethal on contact.
- **Position history**: Float32Array ring buffer (512 entries). Head pushes a
  sample every 4 px of travel (frame-rate independent); segments read at fixed
  lookback offsets (28 px gap ÷ 4 = 7 steps per segment).
- **Kill FX**: teal + white particle burst, grid push, screen shake, screen
  flash, hitstop, slow-mo at high multiplier. 150 pts.
- **First-hit feedback**: small teal flash + mild shake (hp 2→1).
- `flow.snakeEnemy` experimental toggle (default off) wired into the Tweaks
  Menu under Flow with description.
- Spawn Director: snake weight rises 0→0.12 between difficulty 0.4→0.9 (gated
  by toggle), displacing wanderer weight proportionally.
- Flat spawner: up to 18% chance when `snakeEnemy` is on and fewer than 3
  concurrent snakes exist.
- Auto-aim targets the snake head (not segments).
- 15 new unit tests (all body segment count, pool cap, hp flow, movement, wall
  bounce, history ring-buffer, releaseAt/All); total now 94 passing.
- Bundle: 21.51 KB gzip (no meaningful change).

**Risks:**
- With 3 snakes × 5 segments = 15 body obstacles plus the heads, the arena can
  feel cluttered at high difficulty. The 3-concurrent cap and slow 90 px/s
  speed should keep it manageable; playtest will tell.
- Float32Array `fill()` on spawn (512 entries × 3 snakes max) is negligible
  but revisit if profiling reveals it on ultra-low-end devices.

**Toggles added:** `flow.snakeEnemy` (experimental, default off)

## 0.11.0 — Iteration 11: Splitter Enemy (2026-05-07)

**Choice: FEATURE** — No feedback, no bugs, no open PRs. ROADMAP points to
"Splitter (splits on death)" as next enemy. Highest risk/reward mechanic of
the three candidates: creates emergent tension — destroying one threat creates
two.

**What:**
- `Splitter` enemy: yellow square, slow drift, 2 HP. Takes 2 shots — first hit
  gives a small particle + shake + flash to signal "wounded". On death, explodes
  into a large yellow burst and spawns 2 `Shard` enemies.
- `Shard` enemy: small orange dart, aggressively homes on player, 1 HP. Spawned
  ±30° either side of a direct line to the player — creates a spread the player
  must react to.
- Both classes in `src/game/enemies/splitter.ts`, following existing pool
  patterns (object-pooled, additive-blend Graphics).
- `flow.splitterEnemy` experimental toggle (default off) wired into the Tweaks
  Menu under Flow. Works both with the flat spawner and the Spawn Director.
- Spawn Director: Splitter weight rises 0→0.15 between difficulty 0.3→0.8,
  displacing wanderers proportionally.
- Visual: Splitter is an axis-aligned square (unique vs diamond/triangle/chevron
  family already in use). Shard is a small elongated dart that faces the player.
- `drawSplitter` and `drawShard` added to `src/render/ships.ts` with the same
  three-layer halo/mid/core stroke approach.
- 13 new unit tests; total now 79 passing.
- Bundle: 20.21 KB gzip (no change in headroom vs 500 KB target).

**Risks:**
- The 2× spawn-on-death can pile up during surges if both the Splitter toggle
  and Spawn Director are enabled. Shard cap is 96; in the worst case a surge
  could briefly spike entity count. Monitor via entity overlay.
- First-hit damage feedback (small flash) may feel subtle. Playtest will tell.

**Toggles added:** `flow.splitterEnemy` (experimental, default off)

## 0.10.0 — Iteration 10: Black Hole Enemy (2026-05-07)

**Choice: FEATURE** — No feedback, no open PRs, no bugs. Black Hole is the most
drama-per-pixel option from the next enemy batch and from the Ideas pool: a gravity
well that bends bullets and pulls the player, rewarding aggressive play at 200 pts.

### What landed

- **`src/game/enemies/black-hole.ts`** — `BlackHoles` class, pool cap 8.
  - Slow random drift (28 px/s) with soft edge bounce, heading wobbles every 1.5–3 s.
  - **HP-based:** takes 5 bullet hits to destroy; bullets are consumed on each hit.
  - `damage(i)` returns `true` when HP reaches 0.
  - Two Graphics per instance: `outer` (slow CW rotation) + `inner` (faster CCW).
  - Both hide on `releaseAt()` / `releaseAll()`.
- **`src/render/ships.ts`** — `drawBlackHoleOuter()` + `drawBlackHoleInner()`.
  - Faint influence-halo circles hint at the gravity field.
  - Outer: 3 arc segments at r×2.5 + violet core orb + bright event-horizon ring.
  - Inner: 3 arc segments at r×1.68 in pale pink-violet, counter-rotates.
  - Additive blend throughout; pulsing scale (±8% at 2.8 Hz).
- **`src/config.ts`** — `enemies.blackHole` block (radius 22, speed 28, hp 5,
  maxConcurrent 3, influenceRadius 160, bulletGravityStrength 2500,
  playerGravityStrength 1500, pointValue 200). `flow.blackHoleEnemy` toggle added.
  buildVersion → `0.10.0`.
- **`src/game/world.ts`** — full integration:
  - `applyBlackHoleGravity(dt, ps)`: linear-falloff gravity (peak at BH center, zero
    at influenceRadius). Bends all active bullets; pulls player velocity.
  - Gravity applied after enemy movement, before `bullets.step()`, so newly fired
    bullets are bent this frame.
  - `killBlackHole()`: 3.5× particle burst (purple/pink/white), 2× grid push,
    stronger screen shake (18×intensity), double hitstop, purple screen flash.
  - Bullet-BH collision: bullet consumed, HP decrements; death triggers `killBlackHole`.
  - Player-BH collision: `onPlayerHit` (no kill/destroy on player touch).
  - Auto-aim targets black holes alongside other enemies.
  - Non-director spawn: 6% chance per spawn tick, capped at `maxConcurrent` (3),
    independent of `newEnemyTypes`.
  - Director spawn path: black holes appear in `pickType()` at difficulty > 0.6,
    up to 7% weight at t=1.0, gated by `flow.blackHoleEnemy`.
  - `entityCount()`, `reset()`, total-cap accounting all updated.
- **`src/game/spawn-director.ts`** — `EnemyType` extended to `'black-hole'`.
- **`src/tweaks/registry.ts`** — `flow.blackHoleEnemy` toggle registered under Flow,
  experimental, default off.

### Tests

- 9 new tests in `tests/black-hole.test.ts`: starts empty, spawn sets HP, damage
  decrements, damage returns true at death, releaseAt hides both graphics, releaseAll
  clears, step moves position, step bounces edges, step rotates outer CW and inner CCW.
- Total: **66 tests passing**.

### Toggles added

- `flow.blackHoleEnemy` — experimental, default **off**.
  Description: "Gravity-well enemy: curves bullets toward it and pulls the player.
  Requires 5 hits to destroy. High point value (200)."

### Risks

- Bullet gravity iterates over all bullets × all black holes each tick. At 3 BHs
  and 256 bullets this is 768 comparisons per tick — negligible at 120Hz.
- Player gravity is velocity-additive; strong sustained pull near the center can
  briefly push player beyond maxSpeed. Intentional — creates the "danger zone" feel.
- Death explosion is intentionally dramatic (3.5× particles) — watch for particle
  cap pressure if all 3 BHs die simultaneously during a high-density surge.

### Bundle

- index.js: 19.16 KB gz (was 17.99 KB; +1.17 KB for black hole module + draw funcs).

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
