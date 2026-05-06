# Roadmap

Living document. Edited freely each iteration. Move things around as priorities
change.

## Now

- **Iteration 1: Vertical slice.** ✅ Landed in v0.1.0.
- **Iteration 2: Tweaks Menu.** ✅ Landed in v0.2.0. All 5 categories
  wired (Controls, Visual juice, Audio, Game flow, Debug); LIKE/DISLIKE/COMPARE
  feedback writer; second control scheme (virtual-twin-sticks) added as a
  toggle.
- **Iteration 3: Effects layer.** ✅ Landed in v0.3.0. Hitstop, slow-mo on
  big-kill chains, screen flash (DOM overlay). All experimental toggles in
  Tweaks Menu.

## Next

- Wire `TWEAKS_FEEDBACK.jsonl` into a CI/repo workflow so downloaded
  feedback gets appended automatically.
- Audio: Howler-driven SFX bus, layered hit/explosion/spawn sounds.
- Music: one looping track + reactive intensity (toggleable).
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
