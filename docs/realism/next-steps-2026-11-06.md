# Realism plan audit and free authoring options

Reviewed 2026-11-06. This is an implementation audit and research recommendation,
not a completed appearance upgrade or a new realism score.

## What was actually completed

Remote `main` was checked at **f7a96738611bf2ceaec940a31b44798972134bc5**
(R86). The isolated R87 development branch was at
**b14d3b56213617dc9078e88d189c883a1f1549f7** when reviewed. A concurrent career release then advanced main to `de93d11`. Owned movement
changes were ported onto that base in `/workspace/fit-r88`. This report itself
introduces no imported model, rig replacement or completed sculpt.

Read together:

- [Frozen M0 baseline](baseline.md): actual rendered comparison slots, resource
  inventory, software-browser measurements and explicit hardware/reference gaps.
- [M1 authored-head proposal](m1-authored-head.md): an explicit decision to stop
  extending the unaccepted procedural face and use offline Blender authoring.
- [Game mode contract](../game-mode.md) and
  [R88 movement research](../research/r88-movement-notes.md).
- The user's two inline realism briefs. The specifically named
  `LION_REALISM_UPGRADE_CODEX_PLAN.md` and
  `LION_75_PERCENT_REALISM_CODEX_PLAN.md` were not found as files in this checkout.

M0 and the authoring interchange preparation exist. The Blender template and
round-trip GLB contain the **unchanged baseline head**. Five expression shape-key
slots are empty. The round-trip proves coordinate/loader compatibility, not a
new sculpt, expression system or accepted appearance. The proposed
`LionAppearanceV2` owner and `lionAppearance=v2` switch are not implemented.

Recent releases contain useful shoulder, coat, material and movement work.
Those changes do not complete the authored-character overhaul. The frozen M0
lion already had about 561,000 visible triangles: adding more triangles alone
does not repair its facial planes. Those are historical baseline counts, not
fresh R86/R87 performance measurements.

## Unfinished work, in order

| Workstream | Evidence-backed status | Next concrete deliverable |
| --- | --- | --- |
| Reference/calibration | M0 render board exists; approved photorealistic sheet and independent scores are absent | Freeze an accessible reference board; retain matched app cameras and lighting |
| M1 face | Export/template/unchanged round-trip only; no accepted sculpt integrated | Connected skull, muzzle, jaw and neck; fitted eyes/lids/nose/mouth; UVs, baked detail and real expression deltas |
| M1 integration | Compatibility contract written; runtime owner/fallback absent | Exact neck boundary/weights, selective removal of old head surface, safe load/dispose and v1 fallback; preserve contact landmarks and DQ/depth behavior |
| M2 mane | Existing procedural groom has incremental improvements | Authored directional clumps, coherent rear/side silhouette, anchored secondary motion and measured LOD |
| M3 body/deformation | Existing continuous body and corrective systems; partial upgrades | Art-directed anatomy and pose-space correctives verified in clay, all punches and rear/side views |
| M4–M5 coat/wardrobe/materials | Partial procedural detail and material work | Regional coat direction, coherent baked maps, fitted clothing/glove/boot detail; neutral-light comparison |
| Other characters/objects | No equivalent accepted realistic rabbit/rhino head overhaul | Separate authored species heads and expressions; groom/coat; modeled equipment and room detail using the same acceptance process |
| Movement source | Authored kinematics; no licensed motion-capture integration demonstrated | One cleaned/retargeted boxing motion prototype, compared against existing IK/contact behavior |
| Device/visual acceptance | Browser compatibility evidence; physical phone gate and independent 75/100 review incomplete | Named iPhone/Android sustained full-fight tests, P50/P95 and thermal observations, matched multi-angle review |

The report does not classify all M2–M5 work as absent. It distinguishes partial
runtime improvements from the missing authored assets and acceptance evidence.

## Free tools: what they can and cannot do

Primary project source, licensing information and implementation files were
retrieved online. No third-party character or motion asset was imported.

| Tool / method | Appropriate use | Verified constraints / limitations |
| --- | --- | --- |
| [Blender](https://github.com/blender/blender) | Sculpt/retopologize, UV, bake normal/roughness/AO, groom geometry, facial shape keys, author animation | Free, GPL tool; offline. CPU rendering/baking is an option; interactive viewport normally uses graphics hardware. Tool license is separate from imported artwork licenses. It requires actual modeling work. |
| [MPFB](https://github.com/makehumancommunity/mpfb2) | Optional anatomically structured **human** body starting point/reference | Source GPLv3; bundled assets CC0 per project's license files. Requires compatible Blender (README specifies 4.2+). Not an animal-head or finished boxer generator. Review any additional asset packs separately. |
| [Rigify](https://github.com/blender/blender-addons/tree/main/rigify) | Offline animator controls, IK/FK and rig-authoring helpers | GPL tool. Animal metarigs exist, including a cat; a quadruped cat rig is not a drop-in biped boxing skeleton. Bake deform-bone motion before export/retarget. |
| [Three.js r128 SkeletonUtils](https://github.com/mrdoob/three.js/blob/r128/examples/js/utils/SkeletonUtils.js) | Retarget a validated animation prototype; its source contains `retarget` and `retargetClip` | Retargeting needs bone/rest-pose/axis/scale mapping. It does not preserve our custom DQ shader, contact landmarks or foot locks automatically. Same-origin bundling and regression checks required before adoption. |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | Optional offline video-pose extraction, followed by manual cleanup and animation baking | Apache-2.0 project; inspected `@mediapipe/tasks-vision` 1.2.2 types expose CPU/GPU delegates. No inference benchmark here. Monocular depth, occlusion, hands and glove/wrist rotation need correction; not a finished boxing clip. Model/video provenance needs separate review. |
| [TripoSR](https://github.com/VAST-AI-Research/TripoSR) | Optional offline image-to-mesh blockout experiment | README states MIT code/weights; `run.py` explicitly falls back to CPU without CUDA. CPU speed/quality not tested here. Its advertised sub-second result uses an A100. Mesh output does not supply our rig, topology, facial controls, dependable hidden surfaces or usable fur. Not the primary delivery route. |
| [xatlas](https://github.com/jpcy/xatlas) | Optional offline UV-atlas helper | MIT. Helps UV construction, not sculpt/anatomy or animation. Blender may already cover the needed workflow. |

Licensing sources:
[MPFB code/output](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md),
[MPFB assets](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.ASSETS.md),
[Rigify source header](https://github.com/blender/blender-addons/blob/main/rigify/__init__.py),
[MediaPipe license](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE).
CPU fallback source:
[TripoSR run.py](https://github.com/VAST-AI-Research/TripoSR/blob/main/run.py).
MediaPipe package metadata/types were inspected via the official npm package,
not assumed from current website examples. Dependency/model licenses still
need pinning if any experiment becomes part of the authoring toolchain.

## Recommended implementation route

1. **Author a lion head first.** Use the existing Blender template and exact
   skeleton references; sculpt primary anatomy before fur. Judge bare gray
   front, profile and three-quarter views. Fit lids, eyeballs, nose, mouth and
   jaw instead of layering visible primitive parts. Retopologize and bake detail
   into modest local textures. Sculpt actual blink/pain/squint/jaw deltas.
2. **Integrate only that appearance region.** Preserve the current body/rig,
   movement clocks and contact solver. Validate the neck seam and shading under
   head/shoulder motion. Import a local geometry/texture or GLB head bundle
   through the scoped owner; a conventional full-body GLB replacement is not
   interchangeable with this application's custom skinning. Keep v1 switchable.
3. **Build the groom around the accepted face.** Directional clumps and layered
   volume with local secondary motion; silhouette before fiber count. Reduce
   overdraw/update cost through measured tiers, not indiscriminate decimation.
4. **Extend the authored workflow to rabbit and rhino**, then body correctives,
   clothing and equipment. Share the appearance interface, not the species'
   skull/muzzle proportions. Bake microdetail; use bounded pose correctives for
   visible muscle contraction rather than proposing a costly muscle simulation.
5. **Prototype better motion separately.** Use a licensed/self-recorded clip,
   optional CPU pose extraction, cleanup and authoring-rig controls; bake and
   retarget to the existing runtime skeleton. Preserve procedural foot support,
   glove orientation, reach and authoritative contacts. Demonstrate a single
   uppercut and recovery before replacing a whole motion library.

A different *authoring* rig can help the animator. A different *runtime*
skeleton is not the first remedy for a cartoon face and would expand the risk
to every existing move and collision. Extra jaw/face controls can be isolated
to the new head first. Reconsider body skeleton changes only if a tested motion
prototype demonstrates a limitation that correctives/retargeting cannot solve.

## Meaning of “without GPU”

No paid service, cloud GPU, dedicated desktop graphics card or runtime AI is
required by this recommended pipeline. Offline CPU authoring/baking can be slow.
Normal interactive Blender work benefits from integrated graphics. The browser
game continues to use the phone/computer's **integrated GPU through WebGL**.
Detailed real-time 3D on phones with literally no GPU acceleration is not a
credible target. Mobile suitability must be measured on hardware; a software
cloud renderer is not proof of sustained phone frame rate.

No verified free asset is claimed here to be a ready-to-use realistic, rigged
boxing lion. No generated concept is claimed to be a finished 3D asset, and
none of these libraries guarantees the subjective 75/100 target.

## Movement regression follow-up

The frozen `9258a05` development candidate failed the existing simultaneous-
contact arm-continuity gate (1.235292 radians versus pi/3) and a dummy uppercut
elbow-plane check. Those failures were not accepted or hidden by relaxed tests.
Candidate `0874c04` adds a stable transported aiming plane and bounded elbow
folding; all 48 isolated suites passed in
[the exact-source run](https://github.com/ytcat/fit/actions/runs/42302034121).
The R88 integration retains the concurrent career work and is validated
separately; see [the release record](../../qa/r88/results/validation.json).
Movement regression fixes do not complete the authored appearance milestones.
