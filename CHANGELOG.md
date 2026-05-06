# Changelog

## 0.3.0 — Iteration 3: Effects layer

**Choice: FEATURE** — No feedback to action, all gates green; effects layer is
design pillar #6 ("Screen shake, hitstop, slow-mo, audio impact on every
meaningful event") and the highest feel ROI available.

### What shipped

- **`src/fx/effects.ts`** — New `GameEffects` pure-state class. No PixiJS
  dependency; holds hitstop, slow-mo, and flash state and exposes `onKill()`
  / `onPlayerHit()` hooks plus per-tick helpers. Fully testable in isolation.

- **Hitstop** — When `juice.hitstopMs > 0`, the simulation freezes for that
  many milliseconds after each kill (flash continues to fade during the
  freeze so it's visible). Overlapping kills extend, not stack, the freeze.
  Default 0 ms (off); exposed via existing experimental slider in the Tweaks
  Menu (0–80 ms). Try 20–40 ms for a punchy feel.

- **Slow-mo on big kill** — When `juice.slowMoOnBigKill` is on and the
  multiplier reaches 5 ×, the simulation scales to 0.25 × speed for 1.5 real
  seconds. Each subsequent qualifying kill refreshes the window. Score-decay
  and particle motion both slow, reinforcing the drama. The effect snaps back
  immediately on a player hit. Default off; existing experimental toggle in
  Tweaks Menu.

- **Screen flash** — A DOM white overlay (`mix-blend-mode: screen`) flashes
  on kill (0.28 α, gated by new `juice.flashOnKill` toggle) and on player hit
  (0.55 α, always — critical feedback). DOM placement means it is screen-space
  and unaffected by the camera-shake stage transform. Decays at 2.5 α/s.
  `juice.flashOnKill` default off; experimental toggle added to Visual Juice
  category.

- **Simulation time-scale propagated** — all simulation systems (player
  movement, fire rate, enemies, bullets, spawn timer, particles, grid, score
  decay) now use `effectiveDt = dt × timeScale`. Shake decay uses real `dt`
  so it doesn't feel sluggish during slow-mo.

### Tests

- 19 new tests in `tests/effects.test.ts` covering hitstop duration,
  expiry, overlap, slow-mo triggering / threshold / recovery / player-hit
  snap, and flash for both kill and player-hit paths.
- Total: 46 tests passing (was 27).

### Risks

- The DOM flash overlay (`mix-blend-mode: screen`) is not supported in all
  contexts — notably Safari may handle blending differently. Fallback: opacity
  without blending still communicates the hit.
- Slow-mo at 0.25× still runs at 120 Hz steps, so it's CPU-cheap. If the
  effect ever gets extended to 5+ seconds, revisit.

### Toggles added

| path | default | experimental |
|------|---------|--------------|
| `juice.flashOnKill` | false | yes |

(hitstopMs slider and slowMoOnBigKill toggle were already registered in v0.2.0
as experimental; no registry change needed for those, only the implementation
was missing.)

### Bundle

- Main chunk: 12.61 KB gz (was 12.19 KB, +0.42 KB). Well within 500 KB cap.

Append-only iteration log. One concern per entry. Don't edit past entries.

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
