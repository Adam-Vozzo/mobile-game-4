# Known Issues

Severity: 🔴 critical (blocks ship), 🟠 major (degrades feel), 🟡 minor, 💭 tech-debt.

## Open

- 💭 No real bloom post-process pass yet. Glow is approximated by stacked
  half-alpha strokes. May upgrade to a Pixi `BlurFilter` pass on a low-res RT
  if/when frame budget allows. Do not invest until measurements demand.
- 💭 Particle sprite uses a runtime-generated radial-gradient texture. Fine
  for v1; revisit if texture upload cost is measurable at boot.
- 💭 No real audio yet. Hooks reserved (`engine/events.ts`); SFX layer is on
  the roadmap.
- 🟡 Single-thumb auto-aim picks **nearest** enemy. May feel wrong in dense
  combat (it can flip-flop between two close threats). Defer until playtest
  feedback warrants smarter targeting (sticky / cone / user-aimed).
- 🟡 Reactive grid uses a fixed 32×18 cell count. May feel too coarse on tall
  phones in landscape; adaptive density is on the iteration 2+ list.
- 💭 PWA icons are SVG only. Apple's home-screen icon will fall back to the
  favicon SVG. Acceptable for v1 internal use; rasterise before public release.
- 💭 No bundle-size CI gate enforced yet beyond the `bundle:size` script.
  Need to wire it as a CI failure once the actual size stabilises.

## Closed

(none yet)
