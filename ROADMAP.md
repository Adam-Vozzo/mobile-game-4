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

## Next

- Wire `TWEAKS_FEEDBACK.jsonl` into a CI/repo workflow so downloaded
  feedback gets appended automatically.
- 2–3 more enemy types: Snake (chains of segments), Pinwheel (orbiting drones),
  Splitter (splits on death).
- Main menu shell.

## Later

- Second mode (probably Pacifism or Sequence).
- Bomb / smart-bomb mechanic (only if it serves the multiplier loop).
- Music-reactive grid/particle flourishes.
- Adaptive quality only as a graceful degradation toggle for genuinely low-end
  devices. Never a default.

## Ideas (unranked)

- Risk modifier: voluntary "danger close" multiplier boost.
- Geometric "biomes" of enemy mixes.
- Photo-mode / replay snapshot.
- Per-kill camera punch synced to drum hits.
