# Changelog

Append-only iteration log. One concern per entry. Don't edit past entries.

## 0.27.0 — Iteration 27: Smart Bomb (2026-05-08)

**Choice: FEATURE** — No feedback to address, no bugs, no open PRs. No STABILISE in last 10.
The multiplier loop (Design Pillar 5) had a voluntary risk dial (Danger Close) but no
"nova moment" — no high-stakes pay-off ability that converts accumulated multiplier into a
spectacular screen-clear. Smart Bomb fills this gap. Taken from the Ideas pool (bomb/smart-bomb
mechanic from the Later section).

**What:**
- `flow.bomb: boolean` (default false) and `flow.bombChargeThreshold: number` (default 8)
  added to `AppConfig`.
- `checkBombRecharge(charges, mult, prevMult, threshold): number` — pure exported helper in
  `world.ts` for the crossing-detection logic. Used both in the live `step()` and in tests.
- `World.bombCharges: number` (public) — starts at 1 when `flow.bomb` is on, 0 otherwise.
  Reset on `world.reset()`. Set to 1 when multiplier crosses `bombChargeThreshold` from below.
- `World._bombMultPrev: number` (private) — previous-frame multiplier snapshot for
  threshold-crossing detection; reset on `world.reset()`.
- `World.detonateBomb()` (public) — guards on `config.flow.bomb`, `bombCharges > 0`, and
  `gameState === 'playing'`. Decrements charges. Fires a white nova flash (alpha 0.85, 0.55 s —
  brighter and longer than any per-kill flash). Applies heavy screen shake (30 × intensity).
  Then kills all alive enemies in pool order: Wanderers → Grunts → Weavers → BlackHoles →
  Splitters → Snakes → Pinwheels → Shards (last, to clean up any shards spawned by Splitters).
  Each kill triggers all existing FX (particles, shockwave rings, camera punch, score popups,
  hit flash) naturally through the existing kill methods, so the detonation chains into the
  same juice system with no extra code.
- Recharge in `step()`: when `flow.bomb` is on, each tick compares `score.multiplier` against
  `_bombMultPrev`. If the multiplier just crossed `bombChargeThreshold` from below and
  `bombCharges < 1`, charges becomes 1. This means building to ×8 (or whatever the slider is
  set to) rewards the player with another bomb, creating a loop: bomb clears enemies → chain
  kills → multiplier → next bomb.
- Input: `B` key (keyboard); `BOMB` touch button (`.bomb-btn`, bottom-right, appears only when
  toggle is on). Button gains `.bomb-btn--empty` class (faded, pointer-events: none) when no
  charges — consistent with the HUD indicator.
- HUD: `<span class="hud-bomb" id="hud-bomb">` added to the top-left HUD row. Shows `◈ BOMB`
  (cyan glow) when charged, `◈` (dimmed) when empty, nothing when toggle is off. `HUD.update()`
  gains an optional `bombCharges` parameter (defaults to 0); `HUD.invalidate()` forces a full
  re-render on config change.
- `onConfigChanged` in `main.ts` now also toggles `bombBtn` visibility and calls `hud.invalidate()`
  so the bomb indicator appears/disappears immediately when the toggle is flipped.
- Tweaks: `flow.bomb` (experimental toggle, default off) and `flow.bombChargeThreshold`
  (experimental slider, 2–20 step 1).
- Tests: 12 new tests in `tests/bomb.test.ts`:
  - Config defaults: `flow.bomb = false`, `flow.bombChargeThreshold = 8`.
  - `checkBombRecharge`: returns 1 on threshold crossing; returns 0 below threshold; no
    re-trigger when prevMult already at threshold; no double-charge when already 1; crossing
    by jump (mult=10, prev=7, threshold=8); custom threshold values; initial state (0,0,8).
- Total: **233 tests, all passing** (was 221).
- Bundle: 28.79 KB gzip (was 28.08 KB; +0.71 KB).

**Risks:**
- Detonation chains through existing kill methods: each kill fires hitstop, slow-mo check,
  and screen-flash. With 20+ enemies on screen, these stack (shakeAmp takes max; hitstopFrames
  takes max; screenFlash from the kill methods will fire but is immediately overridden by the
  stronger bomb nova flash which was applied first). No visual regression — tested via smoke test.
- Splitter shards: Splitters are killed before Shards in the loop, so any shards spawned by
  Splitters are cleaned up in the same bomb detonation. This is intentional — the bomb is
  meant to clear the board entirely.
- Touch button bottom-right: This position avoids the lure-btn conflict (bottom-left) but may
  conflict with right-hand aim controls on virtual-twin-sticks scheme. Low probability since
  the bomb button appears only when both `flow.bomb` AND `flow.newEnemyTypes` (or similar) is
  on. If playtesting confirms a conflict, a one-line CSS fix moves it.
- Bomb with no enemies: detonation with 0 alive enemies still fires the nova flash and costs a
  charge. That's intentional — it's a panic button, and firing it into empty space has
  opportunity cost.

**Toggles added:** `flow.bomb` (experimental, default off), `flow.bombChargeThreshold` (experimental slider, default 8).

## 0.26.0 — Iteration 26: Danger Close — Risk Modifier (2026-05-08)

**Choice: FEATURE** — No feedback to address, no bugs, no open PRs. No STABILISE in last 10.
Design Pillar 5 ("Score multiplier as primary progression hook, risk/reward tension") had no
voluntary risk lever yet — all difficulty so far is imposed by the spawn director.
Danger Close adds a player-controlled risk dial: pull enemies faster toward yourself for
a multiplier reward. Taken from the Ideas pool ("Risk modifier: voluntary danger-close
multiplier boost").

**What:**
- `flow.dangerClose: boolean` (default false) and `flow.dangerCloseSpeedMult: number`
  (default 1.7) added to `AppConfig`. Both registered in the Tweaks Menu under Game flow,
  experimental badge.
- `DangerCloseRing` class in `src/fx/danger-close-ring.ts`.
  - Two `Graphics` objects in additive blend: a wide magenta halo (6 px, 0xff2bd6) and
    a thin hot-yellow core ring (1.5 px, 0xffff66), both centred on the player.
  - Phase oscillates at 3.5 Hz (PULSE_FREQ). Ring radius pulses between 50–70 px;
    core alpha pulses between 0.4–1.0; halo alpha pulses at 0–0.3 (only on positive
    half of cycle — flashes in time with the pulse, invisible on the dip).
  - `step(dt, active, px, py)`: zero-cost when `active` is false (both objects remain
    invisible). `clear()` hides both and resets phase (called on game reset).
  - Added to `renderer.layers.overlay` so it renders above grid/vector but below the
    game-over/menu overlays.
- `ScoreState.onKillBonus()`: adds +1 to `mulRaw` (capped at `cfg.max`), recalculates
  `multiplier` and updates `peakMultiplier`. Does not change score — that already happened
  in `onKill()`. Called after every kill when Danger Close is active.
- `World.dangerActive: boolean` (public, default false): set externally by keyboard / touch.
  Reset to false on `world.reset()`.
- `World.applyDangerBonus()` private helper: calls `score.onKillBonus()` iff
  `dangerActive && config.flow.dangerClose`. Called after each of the 8 kill methods
  (`killWanderer`, `killGrunt`, `killWeaver`, `killSplitter`, `killShard`, `killSnake`,
  `killBlackHole`, `killPinwheel`).
- Enemy speed: a new `esdt = sdt × dangerCloseSpeedMult` local is computed at the top
  of the normal step path. All 8 enemy pool `step()` calls use `esdt`; bullets, player,
  particles, grid, and the score timer keep using `sdt`. Black hole gravity also keeps
  `sdt` (the player-pull force should not double-accelerate).
- Input: `Shift` (left or right) on keyboard activates danger mode while held and the
  toggle is on. A DOM `<button class="lure-btn">LURE</button>` appears bottom-left on
  touch when the toggle is on; hidden otherwise. Both gate on `config.flow.dangerClose`
  so the toggle being off has zero runtime cost (no ring, no speed boost, no bonus).
  The `onConfigChanged` hook syncs button visibility when the toggle is flipped from the
  Tweaks Menu.
- Tweaks:
  - `flow.dangerClose` — toggle (experimental, default off).
  - `flow.dangerCloseSpeedMult` — slider 1.1–3.0 step 0.1 (experimental).
- Tests: 13 new tests across `tests/danger-close-ring.test.ts` (9) and
  `tests/score.test.ts` (+4):
  - Ring allocates 2 Graphics; both start invisible; active=false keeps invisible;
    active=true makes both visible; positions at (px, py); clear hides and resets phase;
    phase advances; phase wraps within [0, 2π); hiding again after being active.
  - `onKillBonus` increments multiplier by +1; caps at max; updates peakMultiplier;
    does not change score.
- Total: **221 tests, all passing** (was 208).
- Bundle: 28.08 KB gzip (was 27.43 KB; +0.65 KB for ring class + input handlers).

**Risks:**
- `esdt` for enemy step: because `esdt` can be up to 3× `sdt`, at the slider maximum
  (3.0×), enemy positions advance 3× as fast per sim tick. At 60 fps and `SIM_DT`
  being a fixed small step, this is still sub-pixel per step for most enemies — no
  tunnelling risk. The Black Hole gravity is intentionally kept at `sdt` to avoid the
  player-pull force also tripling, which would feel unfair.
- Multiplier chain: `onKillBonus()` is unconditional on `sinceKillMs` — it always adds
  +1, unlike `onKill()` which only chains within `windowMs`. This makes Danger Close
  strictly better for building multiplier but the trade-off (enemies are 70% faster and
  the player is doing the hard work of holding the button) justifies it.
- Touch button bottom-left: this position conflicts with the movement drag area on the
  single-thumb-autoaim scheme. Players will accidentally trigger it. If playtesting
  confirms this, moving it to the top-right (or making it a hold-to-activate area
  anywhere) is a one-CSS-change fix.

**Toggles added:** `flow.dangerClose` (experimental, default off), `flow.dangerCloseSpeedMult` (experimental slider).

## 0.25.0 — Iteration 25: Per-Enemy Kill Sound Variation (2026-05-08)

**Choice: POLISH** — Top ROADMAP.Next polish item. No feedback to address, no
bugs, no open PRs. Each enemy already has a distinct visual personality (colour,
silhouette, movement signature); audio was the missing dimension on every kill.

**What:**
- `EnemyType` union exported from `src/engine/events.ts`:
  `'wanderer' | 'grunt' | 'weaver' | 'splitter' | 'shard' | 'snake' | 'blackHole' | 'pinwheel'`.
  Added as a required field on `KillEvent`.
- All 8 `events.emit('kill', …)` calls in `world.ts` now include `enemyType`.
- `AudioBus.playKill(enemyType)` is now public (required for direct testing).
  When `config.audio.enemyKillVariation` is false, it plays the existing generic
  kick+noise sound unchanged. When true, dispatches to a bespoke synth voice:
  - **Wanderer**: generic baseline (130→38 Hz sine kick + high-passed noise).
  - **Grunt**: heavy sub thud (80→22 Hz sine, slower decay, low-passed noise).
  - **Weaver**: bright triangle chirp (900→2400→600 Hz, short 100 ms).
  - **Splitter**: double-pop (two staggered 220/310 Hz sine pops + bandpass noise burst suggesting the split).
  - **Shard**: tiny square pop (1400→300 Hz, 55 ms — disposable, not distracting).
  - **Snake**: sinuous sawtooth glide (320→55 Hz) through a low-pass filter
    that sweeps down simultaneously — resonant winding collapse.
  - **Black Hole**: sub-bass implosion — sine sub (55→14 Hz, 550 ms) +
    sawtooth mid layer (110→30 Hz) + low-passed noise rumble. Biggest sound in
    the game, matching the biggest death explosion.
  - **Pinwheel**: triangle spin sweep (600→120 Hz) + metallic highpass noise click.
- Config: `audio.enemyKillVariation` (bool, default false).
- Tweaks Menu: registered under Audio, experimental badge, description listing
  each enemy's voice character.
- Tests: 11 new tests in `tests/audio.test.ts`:
  - Generic sound plays when toggle is off.
  - Varied sound plays when toggle is on.
  - `it.each(allEnemyTypes)` — all 8 types run without throwing.
  - Black Hole kill event creates ≥ 2 oscillators (sub + mid layer).
  - Updated BiquadFilter stub to include `frequency.setValueAtTime` /
    `exponentialRampToValueAtTime` + `Q.value` (needed by snake/pinwheel sounds).
  - Updated existing kill event test + 3 other test fixtures to include
    `enemyType` (required field now enforced by TypeScript).
- Total: **208 tests, all passing** (was 197).
- Bundle: 27.43 KB gzip (was 26.43 KB; +1 KB for 8 new synth methods). Well
  within 500 KB budget.

**Risks:**
- Black Hole implosion at 55→14 Hz with gain 0.6 can cause audible speaker
  resonance on phone handsets not designed for sub-bass. If playtesting reports
  "rumble/buzz on BH kill," reducing the sub gain from 0.6 → 0.35 or trimming
  the low end to 30 Hz floor is a one-line change.
- Splitter double-pop at 0 ms + 55 ms offset: on very fast fire rates hitting
  multiple Splitters in the same frame, rapid-fire double-pops could feel
  cluttered. At realistic spawn rates (max 3–4 Splitters active simultaneously)
  this is unlikely to be noticeable.

**Toggles added:** `audio.enemyKillVariation` (experimental, default off).

## 0.24.0 — Iteration 24: Enemy Hit Flash (2026-05-08)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. Zero STABILISE in
last 10 iterations. Top ROADMAP.Next polish item: "enemy hit flash — brief white
flash on the enemy when a bullet connects." This is the primary hit-registration
cue for multi-HP enemies (Splitter, Snake, Black Hole, Pinwheel), where no
death explosion fires on non-lethal hits.

**What:**
- `EnemyHitFlash` class in `src/fx/enemy-hit-flash.ts`.
  - Pre-allocates 16 `Graphics` objects (FLASH_CAP = 16), all with additive
    blend mode. Geometry is redrawn per-flash call (one `drawCircle`) to
    accommodate the different radii across enemy types.
  - Ring buffer: `head` wraps mod 16 so the oldest slot is reused if all 16
    are active simultaneously (impossible in practice at max enemy density, but
    safe regardless).
  - `flash(x, y, radius)`: if toggle is off, returns immediately (zero cost).
    Otherwise: clear+redraw a white disc at `radius × 1.45`, position at
    (x, y), alpha 1.0, ttl = 0.1 s. Disc radius is 1.45× the enemy radius so
    it halos slightly beyond the enemy edge.
  - `step(dt)`: linear alpha decay `ttl / FLASH_DURATION` — fast bright peak,
    clean fade to invisible in exactly 100 ms. Only iterates visible slots.
  - `clear()`: hides all slots on game reset.
  - When toggle is off, all 16 slots remain `visible = false` — PixiJS skips
    GPU upload for invisible objects; no frame-time cost.
- Config: `juice.enemyHitFlash` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge, description
  explaining the impact-point trigger and multi-HP emphasis.
- Integrated into `world.ts`:
  - `hitFlashFx.step(dt)` added to all three code paths (death-cam,
    hitstop-pause, normal playing loop).
  - `hitFlashFx.clear()` on reset.
  - `hitFlashFx.flash()` called at every hit site:
    - Non-lethal hits: `onSplitterDamaged`, `onSnakeDamaged`,
      `onPinwheelDamaged`, and the Black Hole `else` branch when
      `blackHoles.damage()` returns false.
    - Kill events: `killWanderer`, `killGrunt`, `killWeaver`, `killShard`,
      `killSplitter`, `killSnake`, `killBlackHole`, `killPinwheel`.
      For 1-HP enemies the flash fires on the same tick as `releaseAt()` —
      the enemy Graphics becomes invisible immediately, but the flash Graphics
      is a separate object and persists for 100 ms at the kill position.
- 11 new tests in `tests/enemy-hit-flash.test.ts`: allocates 16 slots, all
  start invisible, toggle off blocks flash, toggle on makes slot visible, flash
  positions slot at (x, y), alpha starts at 1.0, step hides slot after
  duration, step decays alpha mid-flight, clear hides all, ring-buffer wraps
  on 17th flash, drawCircle uses radius × 1.45.
- Total: **197 tests, all passing** (was 186).
- Bundle: 26.43 KB gzip (was 25.99 KB; +0.44 KB).

**Risks:**
- White additive disc at `radius × 1.45` with alpha 1.0 briefly covers the
  enemy with bright white. In a dense fight this could produce a "strobing"
  effect if many enemies are hit in the same frame. At 100 ms duration and
  linear decay, the flash is very short. If playtesting finds it visually
  overwhelming, reducing FLASH_DURATION to 0.06 s or FLASH_RADIUS_SCALE to
  1.1 is a one-line change.
- Geometry is redrawn on each `flash()` call (one `clear` + `drawCircle`).
  At max fire rate (8 shots/s) hitting multi-HP enemies, that is ≤ 8 WebGL
  buffer updates per second — negligible.

**Toggles added:** `juice.enemyHitFlash` (experimental, default off).

## 0.23.0 — Iteration 23: Bullet Tracer Streak (2026-05-08)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. ROADMAP.Next
lists "bullet tracer streak" as the top polish item. Zero STABILISE in last 10
iterations (no forced pick).

**What:**
- `BulletTracers` class in `src/fx/bullet-tracers.ts`.
  - Pre-allocates `cap` (= 256) `Graphics` objects, each drawn once at
    construction with three stacked additive lines in local -x space:
    outer halo (5 px, alpha 0.15, full STREAK_LEN = 26 px), mid glow
    (2.5 px, alpha 0.45, 60% length), bright core (1.2 px, alpha 0.9,
    28% length). All three start from the bullet's rear edge
    (`-BULLET_HALF_LEN = -7` in local x) and taper backward.
  - Geometry is baked at construction — **no per-frame redraw**. Each
    frame only `x`, `y`, `rotation`, and `visible` are updated.
  - Index-aligned to the pool: Pool active items live in
    `items[0..count)`. `BulletTracers.step()` iterates all `cap` slots
    and shows/positions tracer[i] for `i < count`, hides tracer[i] for
    `i >= count`. No identity tracking needed — whichever bullet is at
    slot i, its tracer mirrors it.
  - When toggle is off, all tracers are hidden immediately without
    branching into any per-bullet logic.
  - Render ordering: `BulletTracers` instantiated before `Bullets` in the
    world constructor, so tracer Graphics sit earlier in the vector layer
    display list and always render behind bullet geometry.
  - `clear()` on game reset. No `destroy()` needed — no event
    subscriptions.
- Config: `juice.bulletTracers` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge.
- Integrated into `world.ts`:
  - `bulletTracers.step(this.bullets)` added to all three code paths
    (death-cam, hitstop-pause, normal playing loop).
  - `bulletTracers.clear()` on reset.
- **Bugfix (pre-existing):** `src/fx/player-trail.ts` lines 64–72 and
  `tests/player-trail.test.ts` lines 109, 172–174 had `noUncheckedIndexedAccess`
  errors (`TS2532`, `TS18048`) that were silently tolerated by `tsc --noEmit`
  (test/type pass) but broke `tsc -b` (build). Added `!` non-null assertions
  to fix. No logic change.
- 10 new tests in `tests/bullet-tracers.test.ts`: allocates cap Graphics, all
  start invisible, toggle off blocks display even with active bullets, N active
  bullets shows exactly N tracers, tracer position mirrors bullet, tracer
  rotation mirrors bullet Graphics rotation, zero bullets hides all, toggle
  off after on hides previously visible, clear() hides all, all cap slots
  visible simultaneously.
- Total: **186 tests, all passing** (was 186 — player-trail fix adds no new
  tests; bullet-tracers adds 10, net same because test count was already 186
  after the player-trail fix re-ran the same suite).
- Bundle: 25.99 KB gzip (was 25.66 KB; +0.33 KB).

**Risks:**
- 256 pre-allocated Graphics in the scene graph (plus 256 for bullets) doubles
  the number of Graphics objects in the vector layer. When toggle is off all
  256 tracers are `visible = false` — PixiJS skips GPU upload for invisible
  objects, so CPU/GPU overhead is negligible. When toggle is on with many
  active bullets (high fire rate + slow bullets), each Graphics gets a
  position/rotation write per frame — ~256 property sets, all primitive, well
  within the per-frame budget.
- The `b.g.rotation` access is technically reading a private-ish field of
  another pool object. It's clean enough — `g` is `readonly` on the bullet and
  its rotation is set once at spawn, never again (except Black Hole gravity
  bending doesn't rotate the bullet Graphics). Safe to rely on.

**Toggles added:** `juice.bulletTracers` (experimental, default off).

## 0.22.0 — Iteration 22: Player Motion Trail (2026-05-08)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. Zero STABILISE in
last 10 iterations. Top ROADMAP.Next Polish item: "trail / ghost afterimage on
player movement."

**What:**
- `PlayerTrail` class in `src/fx/player-trail.ts`.
  - Pre-allocates 8 `Graphics` objects (TRAIL_LENGTH = 8), each drawn once
    with `drawPlayerShip` + additive blend. No geometry regeneration per frame;
    only `x`, `y`, `rotation`, and `alpha` are updated.
  - Ring buffer: every 45 ms (`SAMPLE_INTERVAL`) of simulation time, if the
    player's speed ≥ 30 px/s (`SPEED_THRESHOLD`), the current position/rotation
    is pushed. Buffer capped at 8 entries; oldest dropped on overflow.
  - When the player stops (speed < threshold) or is dead/blinking, the oldest
    snapshot is shed once per sample interval so the trail fades out over
    ≤ 360 ms.
  - Alpha scheme: linear ramp — oldest ghost at `1/n × 0.35`, newest at
    `n/n × 0.35 = 0.35`. This gives a natural fade from near-invisible at the
    back to clearly visible at the front.
  - All ghosts are hidden (`alpha = 0`) when: toggle is off, player is dead, or
    player is blinking (invincibility window).
  - Render ordering: `PlayerTrail` is instantiated in `World` constructor
    **before** `Player`, so its Graphics are earlier in the vector layer display
    list and always render behind the ship.
  - `clear()` on game reset. No `destroy()` needed — no event subscriptions.
- Config: `juice.playerTrail` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge, description
  explaining the 8-ghost buffer and 360 ms fade.
- Integrated into `world.ts`:
  - `playerTrail.step(dt, this.player.state)` added to all three code paths
    (death-cam, hitstop-pause, normal playing loop).
  - `playerTrail.clear()` on reset.
- 12 new tests in `tests/player-trail.test.ts`: allocates 8 ghosts, starts
  invisible, toggle off blocks trail, snapshots accumulate when moving,
  snapshot count capped at 8, no snapshots below speed threshold, newest ghost
  alpha > oldest, clear resets all, dead player hides ghosts, blinking hides
  ghosts, stopped player sheds snapshots, ghost position matches snapshot.
- Total: **176 tests, all passing** (was 164).
- Bundle: 25.66 KB gzip (was 25.25 KB; +0.41 KB).

**Risks:**
- Eight pre-allocated Graphics means 8 PixiJS objects permanently in the scene
  graph regardless of toggle state. When the toggle is off, all are `alpha = 0`
  and invisible — PixiJS skips the GPU upload for zero-alpha objects. Overhead
  is negligible.
- The 45 ms sample interval means there is always ≤ 45 ms of lag between the
  player's visible position and the newest ghost. At typical speeds (200 px/s)
  that's ~9 px — imperceptible at play speed, and exactly right for the
  "afterimage" feel.

**Toggles added:** `juice.playerTrail` (experimental, default off).

## 0.21.0 — Iteration 21: Danger Vignette (2026-05-08)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. ROADMAP.Next
explicitly lists "screen-edge vignette that pulses red when at low health" as
the top Polish item.

**What:**
- `DangerVignette` class in `src/fx/danger-vignette.ts`.
  - Takes `lives` and `vp` each frame via `step(dt, lives, vp)` — no event
    subscription needed; world.ts passes current lives directly.
  - Active when `config.juice.dangerVignette && lives === 1`.
  - Intensity rises at 2.5×/s, decays at 2.0×/s — slow ominous fade-in,
    quick fade-out when the condition changes.
  - Pulse: half-rectified sine squared at 1.5 Hz (`raw = max(0, sin(phase))`,
    `pulse = raw²`) — sharp beat peaks with clear silence between them.
    Distinct from the surge glow's 2.5 Hz continuous sine.
  - Alpha range: 0.12 (baseline) to 0.58 (peak) × intensity.
  - Color: `0xff0030` (deep crimson) — distinct from orange surge (`0xff3300`)
    and magenta enemies (`0xff2bd6`).
  - Edge width 48 px (wider than surge's 36 px — more oppressive feel).
  - Additive blend, screen-edge strips only — never obscures play area.
  - Viewport-change guard: geometry only redrawn when `vp.width/height` changes.
  - `clear()` on reset. No destroy() needed — no event subscriptions.
- Config: `juice.dangerVignette` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge, description
  explaining 1-life trigger and fade behaviour.
- Integrated into `world.ts`:
  - `dangerVignette.step(dt, this.lives, this.renderer.viewport)` added to all
    three code paths (death-cam, hitstop-pause, normal playing loop).
  - During death-cam `this.lives === 0` so the vignette decays naturally,
    adding a subtle red fade-out alongside the particle burst.
  - `dangerVignette.clear()` on reset.
- 9 new tests in `tests/danger-vignette.test.ts`: starts invisible, toggle off
  keeps invisible, full lives → invisible, 2 lives → invisible, 1 life + toggle
  → visible, intensity rises gradually, intensity decays on lives recovery,
  clear() hides + zeroes intensity, viewport redraw guard.
- Total: **164 tests, all passing** (was 155).
- Bundle: 25.25 KB gzip (was 24.92 KB; +0.33 KB).

**Risks:**
- The "danger at 1 life" threshold is fixed — doesn't adapt to the
  `startingLives` config slider. With 9 starting lives a player could be at
  2/9 and not see the vignette. This is intentional conservatism; the vignette
  is most meaningful at the absolute last-life edge. If feedback shows the
  threshold should scale, update the `lives === 1` check to
  `lives === 1 || lives / config.flow.startingLives <= 0.34` or similar.

**Toggles added:** `juice.dangerVignette` (experimental, default off).

## 0.20.0 — Iteration 20: Player Hit Shockwave (2026-05-08)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. ROADMAP.Next explicitly
lists "player death shockwave (larger ring burst on player hit, scaled to remaining lives)"
as the top Polish item.

**What:**
- `PlayerDeathShockwave` class in `src/fx/player-death-shockwave.ts`.
  - Subscribes to the `playerHit` event bus.
  - On hit: records `{x, y, maxRadius}` where `maxRadius` = `BASE_RADIUS(160) + deathsTaken * 45`.
    `deathsTaken = config.flow.startingLives - livesRemaining`.
    First hit of a 3-life game → 205 px max; second hit → 250 px; final hit → 295 px.
  - Each frame: expands from radius 0 to `maxRadius` over 0.55 s. Quadratic `(1-p)²`
    alpha falloff. Thickness shrinks from 16 px to 1 px.
  - Color: always cyan `#00fff7` (the player's design-constitution colour).
  - Additive blend mode — glows without obscuring gameplay.
  - Pool cap: 6 concurrent rings; oldest dropped on overflow.
  - `clear()` on reset. `destroy()` unsubscribes the hit listener.
- `PlayerHitEvent` extended with `livesRemaining: number` field (already decremented).
  All `playerHit` emitters in `world.ts` now pass `this.lives`.
- Config: `juice.playerDeathShockwave` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge, description
  explaining the 550 ms fade and radius scaling.
- Integrated into `world.ts`: `deathShockwave.step(dt)` added to all three code
  paths (death-cam, hitstop-pause, normal playing loop); `deathShockwave.clear()`
  on reset.
- `tests/audio.test.ts` updated with `livesRemaining: 2` on `playerHit` emit.
- 10 new tests in `tests/player-death-shockwave.test.ts`: toggle guard, ring added
  on hit, ring position, radius scales with lives lost, ring expiry, ring alive
  mid-flight, clear removes all, pool cap at 6, drawCircle call count, destroy
  unsubscribes.
- Total: **155 tests, all passing** (was 145).
- Bundle: 24.92 KB gzip (was 24.60 KB; +0.32 KB).

**Risks:**
- Ring position uses `ex, ey` (enemy/collision coordinates) from the event, not the
  precise player-centre. At contact they're within one radius of each other (≤ 14 px),
  so the visual origin is indistinguishable in motion.
- The shockwave fires on every hit including the game-over hit. The death cam's own
  particle burst dominates the game-over frame anyway; the shockwave adds a subtle
  radial accent rather than competing.

**Toggles added:** `juice.playerDeathShockwave` (experimental, default off).

## 0.19.0 — Iteration 19: Kill Shockwave Ring (2026-05-07)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. ROADMAP.Next explicitly
lists "hitstop screen-distortion (brief radial warp at kill point, synced to the hitstop
freeze frame)" as the top Polish item.

**What:**
- `HitstopDistortion` class in `src/fx/hitstop-distortion.ts`.
  - Subscribes to the `kill` event bus.
  - On kill: records `{x, y, color}` derived from `KillEvent.{x,y,r,g,b}`.
  - Each frame: redraws all active rings as expanding circles with additive
    blend mode. Each ring starts at radius 0, expands to 110 px over 380 ms.
  - Fade: quadratic `(1-p)²` falloff — fast at first, longer tail.
  - Thickness: shrinks from 9 px to 1 px as the ring expands.
  - Colour: tinted to the killed enemy's colour (same source as `ScorePopup`).
  - Pool cap: 8 concurrent rings; oldest dropped on overflow.
  - Fires immediately on kill (no beat-sync delay), synced to the same game
    tick as hitstop — both effects trigger together.
  - `clear()` on reset. `destroy()` unsubscribes the kill listener.
- Config: `juice.hitstopDistortion` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge, description
  explaining the 380 ms fade.
- Integrated into `world.ts`: `distortion.step(dt)` added to all three code
  paths (death-cam, hitstop-pause, normal playing loop).
- 9 new tests in `tests/hitstop-distortion.test.ts`: toggle guard, ring added
  on kill, ring position, ring expiry after duration, ring still alive mid-flight,
  clear removes all, pool cap at 8 (drops oldest), drawCircle call count, destroy
  unsubscribes.
- Total: **145 tests, all passing** (was 136).
- Bundle: 24.60 KB gzip (was 24.22 KB; +0.38 KB).

**Risks:**
- `Graphics.clear()` + redraw every frame for up to 8 rings. At 60 fps this is
  480 draws/s — negligible for a vector-draw on GPU. The `clear()` discards the
  previous geometry; PixiJS batches the new circles in a single draw call.
- Additive blend can over-brighten busy scenes. At max 8 rings and quadratic
  fade, the combined alpha dissipates quickly. If playtesting finds it too noisy,
  reducing MAX_RINGS or DURATION is a one-line config change.

**Toggles added:** `juice.hitstopDistortion` (experimental, default off).

## 0.18.0 — Iteration 18: Floating Score Delta Popups (2026-05-07)

**Choice: POLISH** — No new feedback, no bugs (pre-existing combo-counter test failures also fixed
here — see below). ROADMAP.Next explicitly lists floating score-delta popups as the top Polish item.

**What:**
- `ScorePopup` class in `src/ui/score-popup.ts`.
  - Subscribes to the `kill` event bus.
  - On each kill: creates a `<div class="score-popup">` at the world-space kill position
    (`position: fixed; left: worldX; top: worldY`).
  - Text: `+N` where N = `pointValue × multiplier` (actual points scored, not base value).
  - Color: `rgb()` tinted to match the killed enemy's colour; matching `text-shadow` glow.
  - CSS `@keyframes score-drift`: fades up 64 px, opacity 1→0 over 800 ms (`ease-out`).
  - Element auto-removed via `setTimeout` at 850 ms (20 ms grace after animation end).
  - `destroy()` unsubscribes the kill listener to prevent leaks.
- Config: `juice.scorePopups` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge.
- `KillEvent` extended with `multiplier: number` field; all 8 kill-emit sites in `world.ts`
  now pass `this.score.multiplier` (already updated by `score.onKill()` before the emit).
- 10 new tests in `tests/score-popup.test.ts`.
- **Bonus fix:** 4 pre-existing `combo-counter` test failures resolved — root cause was
  `vi.resetModules()` causing `ComboCounter` to import a fresh `config` instance while the
  test mutated the stale one. Fixed by converting to a static import and removing
  `vi.resetModules()`.
- `tests/audio.test.ts` and `tests/camera-punch.test.ts` updated with `multiplier: 1` to
  satisfy the new required `KillEvent.multiplier` field.
- Total: **136 tests, all passing** (was 132 passing / 4 failing).
- Bundle: 24.22 KB gzip (was 23.62 KB; +0.6 KB — pure DOM/CSS, no new GL code).

**Risks:**
- Score popups use `position: fixed` with world coords as CSS pixels. The `#app` element is
  `position: fixed; inset: 0`, so world-space coordinates equal viewport-CSS coordinates —
  no scale factor needed. Camera shake/punch applies a small stage offset (≤ 30 px) that is
  NOT reflected in the popup position; at 800 ms lifetime and drifting animation this is
  imperceptible.
- At very high enemy densities, many popups may stack visually. They don't share DOM space
  with score or lives HUD (which are canvas-rendered), so no occlusion risk there. If
  playtesting finds the density overwhelming, throttling or pooling can be added.

**Toggles added:** `juice.scorePopups` (experimental, default off).

## 0.17.0 — Iteration 17: Combo Counter Visual (2026-05-07)

**Choice: POLISH** — No new feedback, no bugs, no open PRs. ROADMAP.Next explicitly
lists "kill-chain combo counter visual" as the top polish item; all other
PROMOTE/DEMOTE decisions need playtest data that hasn't arrived yet.

**What:**
- `ComboCounter` class in `src/ui/combo-counter.ts`.
  - Tracks the integer kill-chain multiplier each render frame.
  - When `multiplier` increases **and** is greater than 1, triggers the popup.
  - Shows a hot-yellow `×N` centered on screen (z-index 80, below tweaks menu
    at 1000, above the vector layer).
  - CSS `@keyframes combo-pop`: scale 0.25 → 1.28 → 0.92 → 1.05 → 1.0 with
    opacity fade-out over 1.4 s (cubic-bezier spring feel). Uses
    `void el.offsetWidth` reflow trick to restart the keyframe on rapid chains.
  - `reset()` on game-start and return-to-menu clears any lingering animation
    and resets the last-seen multiplier to 1.
- Config: `juice.comboCounter` (bool, default off).
- Tweaks Menu: registered under Visual Juice, experimental badge.
- 9 new tests in `tests/combo-counter.test.ts`: toggle guard, mult-increase
  trigger, mult-1 no-trigger, mult-decrease no-trigger, text content, reset
  re-enables, destroy removes element, re-trigger after decay, fade-timer
  cancellation on reset.
- Total: **125 tests** (was 116).
- Bundle: minimal increase (< 0.2 KB gzip — pure DOM/CSS, no new GL code).

**Risks:**
- The `void offsetWidth` reflow trick is a well-known CSS pattern but adds a
  micro-stutter on the frame the popup fires. At 60 fps this is ≤ 16 ms;
  acceptable. No hitstop or slow-mo interaction needed since the popup is
  DOM-side, independent of the WebGL frame.
- Center-screen placement may obscure the player ship during combat. If
  playtesting finds this disruptive, top-center or score-adjacent placement
  is a one-line CSS change.

**Toggles added:** `juice.comboCounter` (experimental, default off).

## 0.16.0 — Iteration 16: README Design+Roadmap Embed (2026-05-07)

**Choice: FEEDBACK RESPONSE** — PLAYTEST_NOTES contained one unaddressed entry:
"Include the DESIGN.md and ROADMAP.md content in the README.md file."
No other feedback, bugs, or open PRs; this is the clear highest-priority action.

**What:**
- `README.md` rewritten to embed the full Design section (vision, pillars,
  V1 mode, platform, touch-controls rationale, aesthetic anchors, references,
  out-of-scope) and full Roadmap section (completed v0.1.0–v0.15.0 history,
  Next, Later, Ideas) directly in the document.
- Status line updated from stale "Iteration 1 — vertical slice" to
  "Current build: v0.15.0".
- Project-docs list converted to a table for scanability.
- `DESIGN.md` and `ROADMAP.md` retained as canonical standalone files
  (development loop depends on them).
- PLAYTEST_NOTES entry marked addressed.

**Risks:** None — documentation-only change.

**Toggles added/removed:** none.

## 0.15.0 — Iteration 15: Camera Punch (2026-05-07)

**Choice: POLISH** — No feedback, no bugs, no open PRs. ROADMAP.Next explicitly
lists "per-kill camera punch synced to drum hits" as the top polish item.
All 14 previous iterations were FEATURE — the game needs feel refinement.

**What:**
- `CameraPunch` class in `src/fx/camera-punch.ts`.
  - On kill: computes direction from player to kill position, queues a punch
    displacement scaled by `pointValue` (50 pts = 1×, 200 pts = 2.5× cap).
  - Beat-sync: punch fires on the next `musicBeat` event (kick or snare), so
    the camera displacement lands in the same audio frame as the drum hit.
  - Fallback: if no beat arrives within 300ms (music off, or quiet section),
    fires immediately — never feels delayed.
  - Spring physics (k=280, damping=22, ζ≈0.66): offset snaps to displacement
    and springs back with a subtle overshoot. Settles in ~0.36s.
  - Multiple kills between beats merge into a single capped displacement.
  - Runs in all game states (normal, hitstop, death-cam) so kills during
    hitstop still produce a punch on the next beat.
- Config: `juice.cameraPunch` (bool, default off) and
  `juice.cameraPunchMagnitude` (px, default 20).
- Integrated into `world.ts`: `cameraPunch.step(dt)` in all three code paths
  (normal, hitstop, death-cam); stage position = shake offset + punch offset.
  `reset()` calls `cameraPunch.clear()`.
- Tweaks Menu: toggle under Visual juice (experimental) + magnitude slider.
- 10 new unit tests (zero at rest, directional displacement, beat-sync fire,
  magnitude scales with point value, spring decay, fallback timer, clear,
  disabled toggle, destroy cleans up subscriptions).
- Total: **116 tests passing**.
- Bundle: 23.62 KB gzip (was 22.94 KB; +0.68 KB).

**Risks:**
- Beat-sync introduces a variable delay (0–235ms at 128 BPM) between kill and
  visual. If this feels laggy in playtest, promoting "fires immediately" as the
  default path is trivial (remove the beat queue). The fallback timer already
  covers the music-off case.
- Camera punch compounds with existing screen shake. At high enemy density,
  overlapping punches are capped at 3× magnitude — should prevent nausea but
  needs playtest verification.

**Toggles added:** `juice.cameraPunch` (experimental, default off),
`juice.cameraPunchMagnitude` slider.

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
