# Locked Params

These defaults are feel-critical. Changing them requires a corresponding entry
in `TWEAKS_FEEDBACK.jsonl` that asks for the change. Cite the entry timestamp
in the commit message.

The intent is to prevent quiet drift. New ideas land as default-off
experimental toggles in the Tweaks Menu, then graduate to defaults only after
a feedback entry asks for it.

## Currently locked (as of v0.1.0)

| param                              | default | reason locked                                   |
| ---------------------------------- | ------- | ----------------------------------------------- |
| `controls.scheme`                  | `single-thumb-autoaim` | Highest floor on touch. See DESIGN.md.   |
| `juice.particleDensity`            | 1.0     | Identity setting. Don't quietly throttle.       |
| `juice.screenShakeIntensity`       | 1.0     | Tuned to feel meaningful, not disorienting.     |
| `score.multiplier.decayPerSecond`  | 1.0     | The risk/reward clock. Changes alter pacing.    |
| `score.multiplier.windowMs`        | 1500    | Dictates chain pressure.                        |
| `player.fireRatePerSecond`         | 8       | Tuned with bullet speed for tracer feel.        |
| `player.bulletSpeed`               | 1100    | Tuned with fire rate.                           |

## How to unlock

1. Use the Tweaks Menu to find a value that feels better.
2. Press DISLIKE on the current default, then LIKE on the new value, with a
   note explaining what changed. (Both go to `TWEAKS_FEEDBACK.jsonl`.)
3. Update `config.ts`. Reference the timestamp(s) in the commit message and
   in `CHANGELOG.md`.
4. Update this file's table.
