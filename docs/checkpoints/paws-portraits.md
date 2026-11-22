# Checkpoint: paws on phones (GOTR-0100 follow-up) + mature portraits (GOTR-0081)

Branch `agent/paws-portraits` (from `main` = live v1.87, 37247bc). Not merged, not released, no PR, no version bump: only the `?v=`
of changed files in `index.html` (`20261122pp1` / `20261122pp2`) and a regenerated `offline-manifest.json` (its version untouched).

## A. Paws on phones (`adventure/story/paws.js`)
- The page never builds a paw shape during play when Web Workers work. Shapes are built in up to two workers (cores - 2, at least
  one) from a priority queue, one job per worker at a time: 0 the shape wanted on screen now, 1 a character just made or a scene
  about to start, 2 the rest of a character's shapes, 3 the warm-up after load (the Fighter's species, then Bruno's bear).
- Until a shape is ready a paw shows the nearest ready shape of its species, else a **quick stand-in**: the same anatomy (palm,
  knuckles, finger chains, thumb, pads, claws, wraps) as low-poly capsules and ellipsoids with the same colour recipe; 2-7 ms in
  node, ~6-15 ms per stand-in measured in throttled Chromium (4 stand-ins in the fight: 26 ms in total).
- **Low-detail paw** for distant characters: made in the same worker job from the same surface (~900 triangles, no claws; wrapped
  ~935 incl. cloth). A detail marker (an `isLOD` object just before each paw on the hand joint, which three.js r128 updates with each
  camera while projecting) switches a paw to low detail when it is under 3 % of the view height and back above 4 %.
- The full-detail paw is unchanged: positions, normals, colours, gloss and indices are byte-identical to v1.87 for every species,
  shape and side checked (node compare), so the close-ups in `qa/paws/` still hold.
- Prefetch hooks: `DreamScenes.play` asks for its cast's paws (prio 1) before the set is built; the story panel
  (`adventure/oldtown.js`) asks for the current step's film (`DreamScenes.prefetch`) or its speaker (prio 2).
- No Worker support (node tests): built on demand as before. Worker failing in a browser: one shape at a time on the page between
  frames (setTimeout), stand-ins meanwhile. `Paws.debug` counts worker builds, page builds and geometry swaps.

### Numbers (headless Chromium/SwiftShader, 402x690, CPU throttled 4x via CDP, fresh page, scenario at game-ready + 1 s)
`node qa/paws-perf/longtasks.cjs <root> <out.json> opening,market,fight 4`; before = v1.87 with `paws.js` instrumented to log
main-thread builds (`qa/paws-perf/before.json`), after = this branch (`qa/paws-perf/after.json`).

| window | paw builds on the main thread before | after | longest task before → after | long tasks total before → after |
|---|---|---|---|---|
| opening film | none (the warm-up was in time) | none | 5.4 s → 5.3 s | 29.1 s → 29.0 s |
| market robbery | wolf 4.9 s + doe 1.4 s | none (2 stand-ins) | 38.1 s → 24.0 s | 47.1 s → 32.8 s |
| market reward | otter 2.0 s | none | 13.2 s → 10.2 s | 30.3 s → 30.1 s |
| Otto's shop | none | none | 1.6 s → 1.8 s | 29.8 s → 29.9 s |
| street fight vs Fang | wolf 2.2 s + lion 4.5 s | none (4 stand-ins, 26 ms) | 29.4 s → 17.2 s | 50.0 s → 46.9 s |

The remaining multi-second tasks are scene set-up (set and cast building, shader compiles in SwiftShader), not paws: they are the
next phone bottleneck (not in scope here). SwiftShader + 4x throttling is not a phone; no physical phone was measured.

## B. Portraits (`adventure/portraits.js`, `adventure/adventure-ui.js`, `adventure/adventure.css`)
- Every character with a 3D rig is a render of that rig: the Fighter (lion/rabbit), Mack, Bruno, Brick, Fang, Mrs. Hazel, Otto and
  now **Rourke** (speaker id `hook` mapped to the `rourke` rig; was a letter badge). Others keep the monogram badge in the ring.
- Same framing and light for everyone: a first small render finds the top of the head (ears, mane), then one head-and-shoulders
  frame of 0.8 m at a three-quarter view (heads keep their true relative size; a rabbit's ear tips may leave the frame); off-stage
  rigs (and the Fighter outside a fight/film) stand in a neutral pose (arms down, head straight) for the picture, gloves hidden;
  short lighting (key from the far side, cool rim, soft fill) on a dark vignette; 168 px images (sharp at 56 css px on 3x phones).
- Map place card (later chapters): the coach shows as a small portrait/monogram badge instead of an emoji.
- "Pip": already renamed **Mack** (מאק / Мак) everywhere players see it since v1.54 (internal id `pip` kept for saves); checked
  again in the browser (no visible Pip in EN/HE) and by `tests/adventure-story.test.cjs`.
- Where portraits appear: story lines on the map (`#sfBeat`), mission intro/outro lines (`.adv-story`), the quest panel
  (`.sf-quest .sf-pic`), the map place card. There is no portrait in the journal ("Story so far" is text only).

## Checks
- `node tests/paws.test.cjs` PASS; `node tests/paws-phone.test.cjs` (new) PASS; `node tests/portraits.test.cjs` (new) PASS.
- `bash scripts/run-tests.sh -j 2 paw portrait story cast`: files=15 fails=2 (523 s): `story-clean-gym` (known flaky: welcome dialog
  timeout) and `rourke-cast` (the Docks bout counted 28 frames in 200 s, needs 60). Both also fail on unmodified v1.87 in this
  container (base copy: rourke-cast 17 frames, story-clean-gym the same welcome-dialog timeout); rourke-cast passed the bout once alone
  (82 frames) and failed it once (2 frames): SwiftShader frame rate, not the paws.
- `bash scripts/run-tests.sh -j 2 dream market docks offline adventure ringless street oldtown`: files=13 fails=0 (1050 s).

## Evidence
- `qa/paws-perf/before.json`, `after.json` (long tasks), `qa/paws-perf/detail-sheet.webp` (full / low / stand-in, and full vs low at
  the switch size, for lion, wolf, doe, crocodile in wraps); tools `qa/paws-perf/longtasks.cjs`, `qa/paws-perf/detail-sheet.cjs`.
- `qa/gotr-0081/v2/*-before-after.webp` (gallery, large faces, quest panel, story lines for the market robbery and the Docks),
  `after-he-*.webp` (Hebrew), `after-en-mapcard.webp`; tool `qa/gotr-0081/portraits-sheet.cjs <root> <outDir> <tag> <lang>`.

## Next
- Owner review of `qa/gotr-0081/v2/*-before-after.webp` and `qa/paws-perf/detail-sheet.webp`; if accepted the integrator merges and
  releases (bump version, manifest, worker).
- Possible follow-ups: scene set-up long tasks on phones (set/cast building), a physical-phone measurement, authored heads.
