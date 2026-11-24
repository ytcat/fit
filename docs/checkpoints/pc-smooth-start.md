# pc-smooth-start — PC film stutter and the start flash (owner 2026-11-25)

Branch `agent/pc-smooth-start` from `claude/ecstatic-clarke-9as2ak` (67ddca4, v1.94). Not merged, not released, no version bump.
Backlog: GOTR-0121 (films stuck on PC), GOTR-0122 (training shows, then Adventure). Task C (free-walk entry) was dropped by the
integrator: another agent owns free-walk entry points; nothing in `adventure/free-walk/*` or the free-walk buttons was touched.

## Root causes found

**Films (GOTR-0121).** Measured per frame in the real app (Chromium + SwiftShader, `qa/pc-smooth-start/filmperf.cjs`): every
long frame inside a film had new shader programs or textures in it. Each material, shadow pass and texture was compiled and
uploaded the first time it came into a shot, in the middle of the film: 1.3 s at the cut from the map dive to the street
(18 programs, 30 textures), 0.3–0.6 s at later shots in the gym, Otto's shop and fight night. On Windows/ANGLE shader compilation
is slow, so a PC sees these as the film "stuck". A second cause made it worse on a capable PC: the 'auto' picture quality drops to
low when the *mean* of the first second's frame times is above 1/30 s; those same compile stalls pushed the mean up, so the film
switched to low one second in and recompiled every material again (the +8..15 programs at t = 6 s in opening, gym talk, robbery,
fight night). Smaller: Fang's head and the market models could arrive and be parsed during the morning film (the apology) that leads
into the market, and the gym films started the ringside props download mid-film. Not a cause: the engine does not render the training
scene behind a film (its loop hands the frame to the film and returns); no promise hangs (every film reached its end).

**Start flash (GOTR-0122).** The page painted the plain training page and then the club training screen for the seconds the scripts
needed, then `game-shell.js` boot always called `home()` for any player with a profile, so the Adventure home replaced the gym —
also for a player whose last chosen mode was Training (no mode was remembered at all).

## Fixes

- `adventure/story/dream-scenes.js`: `warmUp(renderer, scene, camera)` before the first frame of every film (and before the map
  dive): `renderer.compile` + one draw of the whole set into a 16×16 target with everything shown and nothing culled (lights keep
  their own state, so the programs are the film's own; same output encoding as the canvas). The cost moves into the existing loading
  dots. Exposed as `DreamScenes.warm`; `bag-break.js` uses it too.
- 'auto' quality uses the **median** of 48 frame times (`slow()`), so a few long frames cannot drop a capable PC; on a device that
  really is slow, the switch rebuilds every material at once (one pause instead of one per later shot) and the next films of the
  same kind in this visit (street with sun shadows / indoor image lighting) start low (no switch at all).
- What the next film needs is fetched and parsed while the current one loads: the apology waits (max 5 s, in parallel) for the market
  models and Fang's head; gym films for the ringside props. `DreamScenes.prefetch` (called by the story panel) now also starts the
  film's models and Fang's head.
- Big high-density screens: a film draws at most 1920×1080×1.2 device pixels (pixel ratio restored after). 1080p and smaller at
  100 % are unchanged; e.g. 1080p at 125–150 % scaling or 1440p+ HiDPI draws slightly softer during films only.
- No per-frame vectors in the film loop (`lens`, `headAt`, map frame).
- Boot cover (`index.html` head, first paint): logo + "Loading…" / "טוען…" / "Загрузка…", body hidden until the shell has chosen the
  mode; the welcome card stays usable above it; never longer than 30 s; not in `?game=classic`. `game-shell.js` boot: a Training
  player (last mode `train`) stays in the gym, everyone else gets the Adventure home, then the cover lifts. The mode is remembered in
  `localStorage['gotr.mode']`: `home()` → adventure, Modes > Training and a free fight from Modes → train. Layout stays LTR.

Shared files touched for B (minimal, for the merge): `index.html` (head script + style, `?v=`), `game-shell.js` (boot end, `home()`
first line, two early returns), `modes-menu.js` (three one-line additions). `adventure-ui.js` untouched.

## Numbers (SwiftShader: relative only)

Tables per film before/after in `qa/pc-smooth-start/README.md` (402×690 and 1366×768, 14 films). Shader programs compiled in
the middle of a film: 402×690 123 (in 29 frames) → 33 (in 1 frame), 1366×768 96 (19 frames) → 33 (1 frame); the one left is the
deliberate one-time rebuild when SwiftShader is found slow, which a capable PC does not take. Longest JS frame per film (402 / 1366):
opening 1310 → 509 / 1150 → 360 ms, gym talk 477 → 110 / 572 → 54, fight night 1055 → 28 / 421 → 52, Otto's shop 444 → 95 /
393 → 95, robbery 520 → 390 / 577 → 63. Wall-time frames are all > 50 ms in SwiftShader at both sizes (software rasterising), so
the >50/>100 counts do not separate; the longest wall frame fell in 12 of 14 films at 1366 and 8 of 14 at 402 (e.g. fight night 14.1 → 4.8 s, gym talk 11.6 →
1.4 s at 1366). The loading dots before a film last longer in SwiftShader (the work moved there: opening 10–11 → 21–29 s, docks
6–10 → 17–20 s); on a real GPU this is mostly the shader compile time that used to interrupt the film.

## Checks

- `node tests/pc-smooth-start.test.cjs` (new: static + real Chromium boot of an Adventure and a Training player) — pass.
- `bash scripts/run-tests.sh -j 1 dream story opening market free-walk clean app browser lang-generic offline-version-match render-look fang-head film-performance paws-phone otto-civilian blender-props pc-smooth shop-preview timed-round`:
  final tree: 34 files, 0 failures (1628 s). An earlier run under load 10 (another agent) failed 3; fixed: `app.test` (head script
  safe without a DOM), `pc-smooth-start` (test observer); `story-clean-gym` passed every re-run, real touchscreen tap kept.
- Evidence: `qa/pc-smooth-start/` (boot sheets before/after, cover in EN/HE/RU, frame tables, the measuring scripts).
- Not checked on a real PC GPU or phone; SwiftShader times are relative.

## Next

Integrator: merge and full suite. Owner check on a PC: the opening film and the market/Otto films should play without pauses; a
reload lands directly in the Adventure home (or the gym after choosing Training).
