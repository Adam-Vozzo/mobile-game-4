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

## Next

- Wire `TWEAKS_FEEDBACK.jsonl` into a CI/repo workflow so downloaded
  feedback gets appended automatically.
- Music: one looping track + reactive intensity (toggleable).
- Effects layer formalised: shake / flash / hitstop / slow-mo as event-driven
  systems, all toggleable from the Tweaks Menu.
- 4–6 more enemy types with distinct silhouettes & movement: Grunt, Weaver,
  Snake, Black Hole, Pinwheel, Splitter.
- Spawn director: wave logic + tension curve.
- Game-over flow: death cam, score panel, retry.
- Score persistence (best score local).
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
