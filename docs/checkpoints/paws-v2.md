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
See the report / GOTR-0100 entry (triangles per paw, build times, test results).

## Next
- Owner review of `qa/paws/*.webp`. If accepted: integrator merges and releases (bump version, manifest, worker).
- Possible follow-ups: a coarser first shape when the worker has not delivered yet (phones), a lower-detail paw for distant
  characters, Brick bare paws if a scene ever needs them (bulldog look exists).
