# Roadmap

Living document. Edited freely each iteration. Move things around as priorities
change.

## Now

- **Iteration 1: Vertical slice.** ✅ Landed in v0.1.0.
- **Iteration 2: Tweaks Menu.** ✅ Landed in v0.2.0. All 5 categories
  wired (Controls, Visual juice, Audio, Game flow, Debug); LIKE/DISLIKE/COMPARE
  feedback writer; second control scheme (virtual-twin-sticks) added as a
  toggle.
- **Iteration 3: Audio SFX Bus.** ✅ Landed in v0.3.0. Web Audio API synthesiser,
  3 sounds (shoot/kill/playerHit), lazy AudioContext, sfxEnabled toggle, 7 new tests.
- **Iteration 4: Kill feedback triad.** ✅ Landed in v0.4.0. Hitstop,
  slow-mo on big kill, and screen flash — all experimental toggles in the
  Visual Juice category.
- **Iteration 5: New enemy types — Grunt + Weaver.** ✅ Landed in v0.5.0.
  Grunt (heavy charger, orange) and Weaver (sinusoidal homing, lime) added
  behind `flow.newEnemyTypes` experimental toggle. Auto-aim updated to target
  all enemy types.
- **Iteration 6: Game-over flow.** ✅ Landed in v0.6.0. Lives system (3 lives),
  invincibility window, death cam, score panel with best-score persistence,
  retry. Score accumulates across lives; only multiplier resets on hit.
- **Iteration 7: Procedural music + beat reactivity.** ✅ Landed in v0.7.0.
  128 BPM synthwave loop (kick/snare/hihat/bass/lead), all Web Audio API —
  no asset files. Beat-driven grid pulse + snare flash. `audio.musicEnabled`
  experimental toggle; `audio.musicReactivity` experimental toggle.
- **Iteration 8: Spawn Director.** ✅ Landed in v0.8.0.
  `SpawnDirector` class — difficulty curve (0→1 over 120 s), interpolated
  spawn interval, escalating enemy mix, random surge bursts. Experimental
  toggle `spawnDirector.enabled`.
- **Iteration 9: Surge Visual Indicator.** ✅ Landed in v0.9.0.
  `SurgeGlow` FX class — orange screen-edge pulsing glow during surge bursts.
  `surgeChange` event added to event bus. `juice.surgeIndicator` experimental toggle.
- **Iteration 10: Black Hole enemy.** ✅ Landed in v0.10.0.
  Gravity-well enemy (5 HP) — bends bullets and pulls the player. Massive death
  explosion. `flow.blackHoleEnemy` experimental toggle.

- **Iteration 11: Splitter Enemy.** ✅ Landed in v0.11.0.
  Yellow square (2 HP) that splits into 2 fast orange Shards on death. Shards
  home aggressively. `flow.splitterEnemy` experimental toggle.

- **Iteration 12: Snake Enemy.** ✅ Landed in v0.12.0.
  Teal segmented enemy (2 HP): body absorbs bullets, only head is killable.
  Position-history ring-buffer drives segment following. `flow.snakeEnemy`
  experimental toggle.

- **Iteration 13: Pinwheel Enemy.** ✅ Landed in v0.13.0.
  Violet rotating hub (3 HP) shielded by three orbiting drones that absorb
  bullets. Players must time shots through the rotating 60° gaps. `flow.pinwheelEnemy`
  experimental toggle.

- **Iteration 14: Main Menu Shell.** ✅ Landed in v0.14.0.
  Title screen ("NEON DRIFT") with best score, pulsing play button, and
  "MAIN MENU" escape on game-over. Loop starts paused; reactive grid
  shows through the semi-transparent overlay.

- **Iteration 15: Camera Punch.** ✅ Landed in v0.15.0.
  Directional camera displacement toward each kill, beat-synced to drum hits.
  Underdamped spring return with subtle overshoot. `juice.cameraPunch`
  experimental toggle + `juice.cameraPunchMagnitude` slider.

- **Iteration 17: Combo Counter Visual.** ✅ Landed in v0.17.0.
  Large hot-yellow `×N` pop-up centred on screen when the kill-chain multiplier
  increases. CSS keyframe animation (scale spring + fade). `juice.comboCounter`
  experimental toggle.

- **Iteration 18: Floating Score Delta Popups.** ✅ Landed in v0.18.0.
  `+N` labels drift upward from each kill, tinted to the enemy colour. Shows
  the full multiplied value (`pointValue × multiplier`). `juice.scorePopups`
  experimental toggle.

- **Iteration 19: Kill Shockwave Ring.** ✅ Landed in v0.19.0.
  Expanding radial ring at each kill position, tinted to the enemy colour,
  fades over 380 ms with additive blend. Fires on the same tick as hitstop.
  `juice.hitstopDistortion` experimental toggle.

- **Iteration 20: Player Hit Shockwave.** ✅ Landed in v0.20.0.
  Large cyan shockwave ring at the collision point when the player is hit.
  Ring radius scales with danger — 160 + 45 px per life already lost, so
  the final hit pulses largest. Fades over 550 ms with additive blend.
  `juice.playerDeathShockwave` experimental toggle.

- **Iteration 21: Danger Vignette.** ✅ Landed in v0.21.0.
  Crimson screen-edge glow that slowly pulses (1.5 Hz, half-rectified sine²)
  when the player is on their last life. Distinct from the orange surge glow
  (colour, speed, trigger) and the per-hit flash (persistent). Fades in
  ominously, decays on death-cam. `juice.dangerVignette` experimental toggle.

- **Iteration 22: Player Motion Trail.** ✅ Landed in v0.22.0.
  Eight ghost afterimages behind the player ship, sampled every 45 ms, fading
  with a linear alpha ramp over ≤ 360 ms. Suppressed when stopped, dead, or
  blinking. `juice.playerTrail` experimental toggle.

- **Iteration 23: Bullet Tracer Streak.** ✅ Landed in v0.23.0.
  Short additive streak (26 px) behind each bullet — three stacked layers
  (halo/glow/core) tapering away from the bullet rear. Pre-baked geometry,
  zero per-frame GPU cost. `juice.bulletTracers` experimental toggle. Also
  fixed a pre-existing `noUncheckedIndexedAccess` build error in player-trail.

- **Iteration 24: Enemy Hit Flash.** ✅ Landed in v0.24.0.
  White additive disc (radius × 1.45) at the bullet impact point, 100 ms
  linear fade. Fires on all hit events — non-lethal damage (multi-HP enemies)
  and kill events (all types). `juice.enemyHitFlash` experimental toggle.

## Next

- Wire `TWEAKS_FEEDBACK.jsonl` into a CI/repo workflow so downloaded
  feedback gets appended automatically.
- PROMOTE/DEMOTE pass: promote well-liked experimental toggles to
  default-on once playtest data arrives.
- **Polish: per-enemy kill sound variation.** ✅ Landed in v0.25.0. Eight
  distinct synth voices behind `audio.enemyKillVariation` experimental toggle.
- **Feature: Danger Close — risk modifier.** ✅ Landed in v0.26.0. Hold Shift/LURE
  to speed enemies up 70% and gain extra multiplier per kill. `flow.dangerClose`
  experimental toggle + `flow.dangerCloseSpeedMult` slider.

## Later

- Second mode (probably Pacifism or Sequence).
- Bomb / smart-bomb mechanic (only if it serves the multiplier loop).
- Music-reactive grid/particle flourishes.
- Adaptive quality only as a graceful degradation toggle for genuinely low-end
  devices. Never a default.

## Ideas (unranked)

- Geometric "biomes" of enemy mixes — distinct spawn patterns per phase creating tactical variety.
- Photo-mode / replay snapshot.
- Per-kill camera punch synced to drum hits.
- Danger Close touch button refinement — bottom-left conflicts with movement drag; try top-right or hold-anywhere.
- Danger Close visual escalation — ring colour shifts yellow→orange→red as speed multiplier increases.
- Danger Close audio cue — a low drone/heartbeat SFX while active to reinforce tension.
