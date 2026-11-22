# Checkpoint: paws v2 (GOTR-0100, every bare-handed character)

Branch `agent/paws-v2` (from `origin/claude/ecstatic-clarke-9as2ak` = live v1.84). Not merged, not released, no version bump
(only the `?v=` of changed files in `index.html` = `2026112295` and a regenerated `offline-manifest.json`; its version is untouched).

## What changed
- `adventure/story/paws.js` (new, loaded before `story-cast.js`): one shared paw builder. Each paw shape is ONE continuous surface
  from a signed distance field (wrist cone inside the forearm, carpus, four metacarpals that end in knuckle heads, the padded palm,
  thenar and hypothenar mounds, four fingers as round-cone chains with joint knobs, an opposable thumb, raised pads) joined with
  smooth unions, extracted with surface nets (3.4 mm grid), the largest piece kept (a closed pocket inside a fist would leave a
  hidden shell), reduced by quadric edge collapse, projected back onto the field, normals from the field. Claws are curved keratin
  cones rooted inside the fingertips (drawn in to ~55 % in a fist), in the same mesh. Vertex colours: the coat on the back sampled
  from the character's own forearm (no seam at the wrist), a lighter palm, dark leather pads (heart-shaped palm pad with three lobes,
  a pad on every fingertip and middle phalanx, thumb pad), glossy claws (per-vertex gloss in the shader), field-baked ambient
  occlusion; the rig's fur bump map on the fur.
  - Species looks: lion (Fighter; biggest, thick fingers, brown-pink pads, short dark claws), bear (Bruno; dark pads, long horn
    claws), rabbit (Mack/rabbit Fighter; slimmer, pale pink pads, small light claws), wolf (Fang; black pads, longer dark claws),
    otter (Otto; short webbed fingers, small dark claws), doe (Mrs. Hazel; slender, hoof-like dark fingertips, no claws), crocodile
    (Rourke; thick, scaly vertex pattern, blunt claws), bulldog (built and tested; Brick wears gloves in every scene).
  - Shapes: relaxed, open, point, grip, fist. Swapped (never morphed); an opening/closing hand passes the grip for ~2 frames.
    DreamPose stamps `rig.pawPose = { L, R, time: renderTime }` from the gesture (`Paws.shapeFor`: hang/hips/cross -> relaxed,
    open/wave/shrug/low/count -> open, strap -> relaxed (a full grip went into the chest), point/thumb -> point, carry/chin/exact reach (mop, props) -> grip, fist/pound -> fist);
    no fresh stamp (fights, drills, guard) -> fist. `rig.pawHold = { L|R: object }` -> grip while the object shows (Hazel's handbag,
    Fang's held jacket). `rig.pawOverride` for QA.
  - Wraps (`track_wraps`, Rourke): a second field surface offset 3.6 mm over the wrist, palm, knuckles and the root of the thumb,
    from the forearm (up to 6 cm above the wrist) to just past the knuckles, fingers and thumb free; overlapping turns as real steps
    plus shading and an X over the back of the hand; merged into the same mesh, the skin under the cloth left out and the skin at the
    cloth edge tucked under it.
  - Built once per species/shape/side and shared by every rig (positions, normals, index, uv, gloss shared; colours per coat). A Web
    Worker (the same file) builds shapes in the background: every shape of a species is requested when a rig attaches paws; the lion,
    bear and rabbit basics are made ~2.5 s after page load. The first shape of a species is built on the page if nothing is ready.
- `adventure/story/story-cast.js`: `bareHands(rig, fur, pad, o)` -> `Paws.attach` (Fighter street outfit, Bruno); `track_wraps` ->
  paws in wraps (the old torus wraps are gone); fallback simple hand if paws.js is missing.
- `adventure/story/cast-market.js`: Fang, Hazel, Otto hands -> `SC.bareHands`; `pawHold` for Hazel's bag and Fang's jacket.
- `adventure/story/cast-docks.js`: Rourke -> crocodile paws in wraps (one mesh per hand).
- `adventure/story/street-wear.js`: unchanged (already calls `SC.bareHands`).
- `adventure/story/dream-pose.js`: paw shape per gesture (`st.paws` override), stamps `rig.pawPose`.
- `tests/paws.test.cjs` (new). Node tests that load story-cast now also load paws.js (as the page does); `tests/rourke-cast.test.cjs`
  accepts the merged wrapped paw.
- QA tools: `qa/paws/tools/closeup.cjs` (studio close-ups), `film.cjs` (film frames + close views), `fight.cjs` (ringless bout),
  `probe.cjs`, `pairs.py` (before/after sheets).

## Numbers
- Triangles per paw: bare 5,600 (5,080 skin + 520 claws; doe 5,600 skin), wrapped 3,950-4,550 (incl. ~1,500 cloth); one mesh and
  one draw call per paw. Before: 5,360 per hand (Fighter, Bruno, Hazel, Otto), Fang 11,300, Rourke 11,220 + 4,164 wraps (two meshes).
  Street fight vs Fang, whole frame (SwiftShader, 402x690): 707-746 k after vs 690-756 k before.
- Sizes (lion): relaxed 0.177 x 0.235 m, fist 0.165 m wide (old hand 0.094 x 0.15 m).
- Build time per shape (node on this machine): ~0.3-0.9 s; in the browser this runs in the worker.

## Checks
- `node tests/paws.test.cjs` PASS (every species x shape x side: one connected skin, <= 6,000 triangles, claws rooted in the
  fingertips, mirror and outward winding; wraps; pose -> shape; shared geometry; every call site; index.html order; offline pack).
- `bash scripts/run-tests.sh -j 2 story cast paw street docks market fight ringless dream offline-version`: files=38 fails=0
  (888 s). An earlier run with film renders in parallel had rourke-cast and story-clean-gym time out; both pass alone and in the
  clean run.
- `node tests/story-arm-clearance.test.cjs` PASS (it caught the full grip on the bag strap going into the chest: strap -> relaxed).

## Evidence
`qa/paws/*-before-after.webp` (before = live v1.84, after = this branch; headless Chromium/SwiftShader, the game's renderer):
close-up sheets per character (`fighter`, `fighter-wraps`, `pip`, `bruno`, `fang`, `hazel`, `otto`, `rourke`): back, palm and 3/4
of both paws, relaxed and fist, plus six gesture body shots; film frames at 402x690 and a close view from the film camera
(`dream_opening` 9.84/21.66, `dream_gym_talk` 8.25/13.75/19.25, `dream_market_reward` 1.63/11.38, `dream_otto_shop` 15.53/19.97,
`dream_docks` 7.5/22.5); `fight-street-fang-*` (guard and punch, game view and close render). Re-render with the tools in
`qa/paws/tools/` (close-ups: `node qa/paws/tools/closeup.cjs <dir>`; films: `CLOSE=<actor> node qa/paws/tools/film.cjs <dir> <scene> <t,t>`;
fight: `node qa/paws/tools/fight.cjs <dir> street fang`; pairs: `python3 qa/paws/tools/pairs.py <before> <after> <out>`).

## Next
- Owner review of `qa/paws/*.webp`. If accepted: integrator merges and releases (bump version, manifest, worker).
- Possible follow-ups: a coarser first shape when the worker has not delivered yet (phones), a lower-detail paw for distant
  characters, Brick bare paws if a scene ever needs them (bulldog look exists).
