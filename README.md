# Neon Drift

Mobile-first PWA twin-stick shooter in the spirit of Geometry Wars: pure vector,
neon, glow, lavish particles. Score-chasing, juice-heavy, score-multiplier
driven.

## Status

Iteration 1 — vertical slice. See `CHANGELOG.md` for what's in.

## Run locally

```bash
npm install
npm run dev    # http://localhost:5173
```

Use a phone-shaped browser viewport (landscape). On a real device, install as
a PWA from the browser menu.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e         # requires `npm run test:e2e:install` once
```

## Project docs

- `DESIGN.md` — vision, pillars, control rationale
- `ROADMAP.md` — Now / Next / Later / Ideas
- `CHANGELOG.md` — append-only iteration log
- `ARCHITECTURE.md` — module map
- `KNOWN_ISSUES.md` — bugs & tech debt
- `PLAYTEST_NOTES.md` — free-form human feedback
- `TWEAKS_FEEDBACK.jsonl` — structured feedback from the Tweaks Menu
- `PERF.md` — frame budget & current measurements
- `LOCKED_PARAMS.md` — feel-critical defaults

## License

Private.
