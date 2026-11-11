# GOTR-0037 — visible muscle definition on every avatar

Owner request: muscles you can see on the fighters (separated deltoids, traps, lats, pecs with a
lower edge, six-pack and obliques, serratus, biceps/triceps split, forearms, calves), each with its own
form shadow, crease and highlight — not smooth arms and torsos.

## Technique (and why)
The body is already dense (121,804 vertices, mean edge 6.5 mm after the Phong refinement), i.e. about one
vertex per pixel at the game's pixel-ratio caps (1–2). So the definition is **real surface relief, built once
at load, carried per vertex** — no texture, no UV seams, no per-pixel muscle maths:

1. **Data-driven atlas** (`avatar-anatomy.js`, `MUSCLE_ATLAS`): 38 muscle parts (mirrored → 22 named
   groups per side) in the shared rig's T-pose space, each an origin→insertion belly with widths, height,
   belly position and edge style. Anchors snap to the avatar's own skin (nearest vertex facing the hint), so
   any body on this rig gets the same anatomy. Per-species profiles: lion = heavier bulk, softer edges;
   rabbit = leaner, crisper separations, stronger serratus/obliques/forearms.
2. **Relief**: bellies evaluated on the skin (crisp side borders, smooth tendon ends; abs/serratus/pec edge
   as crisp pads), overlapping groups do not stack, then a 3 cm band-pass keeps only part of the bulk on
   the torso (silhouette, gear and contact fit stay those of the authored body) and more on the limbs.
   Waist (belts) and boot zones only carve. Relief ≤ 16 mm out / 12 mm in.
3. **Normals + crease term** baked from the relieved surface (int8), applied *after* the axilla field and the
   guard-shoulder bake so the forms survive them; creases darken the albedo, crests get a slight sheen.
4. **Pose response** through the existing corrective channels: 22 definition channels scaled per frame
   (biceps bunch with elbow flexion, triceps and deltoid with extension/elevation, lats flatten as the arm
   reaches, pec/obliques/serratus with the punch and twist, abs/back/legs with load).
5. **Fur no longer hides it**: strands inherit their root's relief and normal, and back-facing strand
   triangles no longer flip their normal (that flip made the light specks on backs).
6. Fixed on the way: a 4 mm step in the old abs/pec corrective (bright line under the pecs) and the dark
   colour band under the chest.

Cost on the GPU: two extra normalized vertex attributes (12 bytes/vertex), ~30 vertex ALU ops, one varying
and ~6 fragment ops; no new draw calls, textures or triangles. Build: once per species (cached).

## Evidence (`*.webp`)
- `<species>-<guard|jab|hook>-gym.webp`: front, 3/4, side, back — same camera rig and lights, top = before
  (`2ef46f6`), bottom = after.
- `<species>-closeups-gym.webp`: torso, hook torso, back, arm, jab shoulder, legs.
- `arena-<guard|jab>.webp`: Championship arena, lion and rabbit, 3/4, side, back.
- `muscle-atlas-<species>.webp`: every atlas group painted on the rest pose and labelled.
- Frame cost: see below (`perf.cjs`).

Scripts: `capture.cjs` (matched renders, `rig.cjs` camera rig), `labels.cjs` (atlas sheet), `compose.py`
(sheets), `perf.cjs` (paired A/B render-time sampling). Test: `tests/muscle-definition.test.cjs`.

## Frame cost
`perf.cjs` (paired A/B in one page, 402×690 CSS px at DPR 3, lion posed in a jab, rendered alone in the app's
scene and lights; A = with definition, B = the same rig built with it switched off; 30 samples each,
interleaved). Result in `perf-ab.json`:

| level | canvas | with | without | ratio |
|---|---|---|---|---|
| 3 (default: ratio 1.5, shadows) | 579×799 | 4521 ms | 4705 ms | 0.96 |
| 0 (floor: ratio 1, no shadows, detail off) | 386×533 | 3123 ms | 3147 ms | 0.99 |

Triangles 500,475 in both, no new draw calls or textures; +2.15 MB vertex data per rig (body + fur).
The difference is inside the measurement noise (the VM had a load average of 17–30 during the run, which
is why a single software-rendered character took seconds); the expected cost is the per-vertex work
listed above, i.e. a few percent of the character's vertex shading at most. Build cost (once per species,
cached): ~90 ms warm / ~0.4 s cold in node on this VM; 3.1 s in the loaded browser run (the whole
`LionCoach` build took 12 s in the same run). Phones will be slower; it happens during the load screen.
Adaptive quality: the floor level (0) turns off the per-pixel crease/sheen and the normal detail
(`AvatarAnatomy.definition.setQuality`, called from `updateQuality`).

## Limits / what is still below the reference
- Relief is per vertex (6.5 mm): fine fibre striations and veins are not there; very close cameras show
  soft crease lines rather than illustrated ink lines.
- Shapes are procedural bellies, not an artist's sculpt: transitions (pec→delt, lat→teres) are simpler than
  the reference; an authored high-res sculpt baked to a normal/cavity map would close most of the gap.
- Lighting was not changed: the existing key/fill/rims already read the forms in the gym and arena; a
  stronger rim on backs would add more, but it is a global scene change.
- Pre-existing, not addressed: a skinning crease behind the armpit when the arm reaches forward (visible
  in before and after), and the shoulder-front zig-zag seam.
- No physical phone was available; all timings are SwiftShader on a loaded shared VM.
