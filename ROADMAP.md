# Roadmap

Living document. Edited freely each iteration. Move things around as priorities
change.

## Now

- **Iteration 1: Vertical slice.** Player ship, single-thumb auto-aim, bullets,
  Wanderer enemy, particle pool with PixiJS ParticleContainer, reactive grid,
  score + multiplier HUD, PWA shell, CI green. *(in progress)*
- **Iteration 2: Tweaks Menu.** Hidden gesture to open, persisted to
  localStorage, live perf overlay, LIKE/DISLIKE/COMPARE writer to
  `TWEAKS_FEEDBACK.jsonl`. CONTROLS + VISUAL JUICE categories, plus a second
  control scheme as a toggle.

## Next

- Audio: Howler-driven SFX bus, layered hit/explosion/spawn sounds.
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
