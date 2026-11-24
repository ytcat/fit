# Bus door text · checkpoint (branch `agent/bus-door-text`, GOTR-0120)

Owner bug 2026-11-25: "when the bus stops and the doors open, the doors in the middle of the bus have text that floats in
the air when the doors are open." Base: `claude/ecstatic-clarke-9as2ak` 67ddca4 (v1.94 + RELEASES row). Not merged, no
version bump (version.js and the offline worker's cache version untouched), no PR.

## Root cause (confirmed in the GLB and in pictures)
`assets/street/ch01-bus/gloryland-bus.glb` (authored by `scripts/authoring/build_city_bus.py`): the kerb-side
`GLORYLAND TRANSIT` lettering is part of the static body mesh `Body__02 warm ivory` and was placed at x -0.86…0.76, i.e. over
the middle (exit) door leaves (opening x -1.02…0.22, the leaves are separate hinge nodes `Exit_left_door` / `Exit_right_door`).
When the leaves swing out, the letters stay where the closed leaves were: in the air in the open doorway. A probe of every
static body vertex inside the kerb-side door openings (`qa/bus-door-text/`, numbers below) found three more parts of the
same kind: two service-hatch latches (`Body__05`, at the middle door's jamb x -1.02 and on the front door leaf x 3.93) and
the front side marker (`Body__12`, amber, x 4.87, on the front door's right leaf). The only other hits are the A-pillar
edge and the mirror-arm root, which are the door frame behind the leaf plane (not over the leaf).

## What changed
1. `scripts/authoring/build_city_bus.py`: kerb-side fleet name centred at x 1.55 on the panel between the middle and the
   front doors (the road side keeps the coach centre); a latch that would sit on a door goes to the other side of its seam
   (x -1.28, 3.67); a side marker on a door leaf is built as a child of that leaf's hinge (it then joins
   `Entry_right_door__12 amber indicators` and swings with the leaf).
2. `scripts/authoring/patch_bus_door_parts.py` (new, Python stdlib only): applies exactly that change to the shipped GLB.
   Blender 4.3.2 (which exported it) is not available here; a re-export with Blender 5.2 would change the whole file. The
   patch checks the input sha256 (original a4bf1866…, output ca789b33…, byte-identical on every run), selects whole triangles
   only and refuses anything unexpected. Cross-check: the updated authoring script run under Blender 5.2.4 (a scratch copy with
   a 5.x API shim for `action.fcurves`, not committed) gives the same 42 mesh nodes and the same world vertex positions as the
   patched GLB on every node except the seat upholstery (unchanged by this fix; differs between Blender versions).
   The `.blend` source in `assets/street/ch01-bus/` predates the fix (rebuild with the script in Blender 4.3.2 to refresh it).
3. Numbers: 55,484 triangles (unchanged), 41 → 42 mesh nodes (+1 draw call: the marker on the leaf, 108 triangles),
   2,993,632 → 2,994,616 bytes (+984). `manifest.json` updated; root extras `asset_version` 0.1.1-review.
4. `adventure/story/city-assets.js`: bus URL `gloryland-bus.glb?v=2026112501`. `offline-worker.js`: the street-model runtime
   cache matched with `ignoreSearch`, so a new `?v=` was never fetched by a phone that had played the film with the offline
   pack installed; it now matches the exact URL and a newer copy replaces the older one (`delete(…, {ignoreSearch:true})`
   then `put`). Cache names / versions unchanged.
5. Fallback bus (`adventure/story/dream-sets.js`, used only when the model fails): its middle door is fixed (only the front
   leaves slide) so nothing floated, but the route board (x -1.4…0.6) covered the middle door's kick panel; moved to x
   -0.35…1.65 (between the door and the front wheel arch). `story-sets.js` (the other generated bus): route board on the road
   side, no doors there: unchanged.
6. `index.html`: `city-assets.js` / `dream-sets.js` `?v=20261125busdoor`; `offline-manifest.json` regenerated.
7. `tests/city-assets.test.cjs`: no static body vertex over a kerb-side door opening; the marker is a child of
   `Entry_right_door`, sits where it was when closed and swings out with the leaf; the worker replaces an older street-model
   copy; the bus URL carries a version. (Fails on the old GLB: "static body parts over the kerb-side doors".)

## Checks
- `bash scripts/run-tests.sh -j 1 opening arrival city dream lang-generic offline-version-match city-assets`:
  files=9 fails=0 (803 s, shared machine). The new city-assets check fails on the old GLB, passes on the new one.
- `python3 scripts/authoring/patch_bus_door_parts.py <original> <out>` twice: byte-identical output (sha256 ca789b33…);
  on the shipped (patched) file it reports "already patched" and writes nothing.
- Door-opening probe (every static body vertex inside the kerb-side door openings, outside the leaf plane): before
  `Body__02` 681 (fleet name, middle doors), `Body__05` 108 + 156 (latches), `Body__12` 196 (marker, front door);
  after: none (only the A-pillar edge and mirror-arm root, behind the leaf plane, as before).

## Evidence (`qa/bus-door-text/`, headless Chromium + SwiftShader, film quality high, no page errors)
- `film-phone-before-after.webp` (402×690) and `film-pc-before-after.webp` (1366×768): the film's own camera at 6.9 s
  (closed), 7.3 s (opening), 7.6 s (fully open), 8.4 s (open, he steps off), 9.9 s (closing). The PC frames show the bug:
  `GLORYLAND TRANS…` hanging across the open middle doorway; after, the doorway is empty and the name is on the panel.
- `close-{middle,front,oblique,side}-{phone,pc}-before-after.webp`: fixed cameras (Fighter hidden for these frames, cabin
  at full detail) with the door clip at 0 / 0.65 / 1.3 s. Middle: floating letters gone. Front: the amber marker that hung
  over the open entry steps now swings out on the leaf; closed, it is where it was.
- `fallback-bus-phone-before-after.webp`: generated fallback bus (`NOCITY=1`), the route board clear of the middle door.
- `before-*.json`, `after-*.json`: per-frame draw calls / triangles. Model bus in view: +1 draw call (the marker on the
  leaf), triangles equal (e.g. phone 8.4 s 169 → 170 calls, 568,733 triangles both; PC 7.6 s 220 → 221, 703,619 both).
- Raw PNGs are not committed (re-run the capture to regenerate).

## Remaining
- The bus lettering (`GLORYLAND TRANSIT`, `12 GLORYLAND`, `GL 012`) is still English geometry in the GLB (GOTR-0119
  remaining item); not in scope here.
- Physical phones not checked.

## Next
Integrator: review the before/after sheets, merge with the next release. Command to re-run the pictures:
`ROOT=<tree> [W=1366 H=768] [NOCITY=1] node qa/bus-door-text/capture.cjs <outdir> <tag>`.
