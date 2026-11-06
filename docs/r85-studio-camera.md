# R85 — complete studio and reliable camera input

Baseline: published `eb3c50ad829580ecb5fa09b67dca2398d0273cbd`.
Runtime candidate: `b9fe5000fbf5846e7885cad8fd31dccaf10aab32`.
Development was isolated in `/workspace/fit-r85`, `lion/r85-studio-camera`;
the evidence-only release branch is `release/r85-studio-camera`.

## Behavior and causes

Dragging formerly rotated the character or arena root. Frozen poses could keep
cached skin transforms while attached parts moved, and the fight ceremony could
overwrite the user's rotation. R85 orbits the camera around the fitted target
instead. Dragging, presets, refitting and zoom leave actor roots, contact state
and animation time untouched. A user-selected fight view survives the ceremony.

Pointer capture is guarded against failure, with window-level move/end recovery.
Fresh primary gestures clear stale pointers. Cancelled touches, lost capture,
missed mouse-up, blur and page visibility/lifecycle events reset gesture state.
Pinches change zoom without accidentally orbiting; technique scrolling and
manual control buttons retain their own native input behavior.

Minimum camera zoom is now 0.30, previously 0.65. Added compact − / + / Fit
buttons to the existing camera strip, including Play mode and short layouts.
Fit restores default zoom without discarding the chosen angle. EN/HE/RU labels
and accessible names are included.

The front and both side walls now have original local 3D fixtures: entrance
doors, lockers, benches, storage, bag stations, wall bars, medicine balls,
rollers and signs. A ceiling and cross members complete the wider view. Static
geometry/material sharing and instancing limit cost. Near-side walls and their
fixtures cut away together. Cached wall-node lists avoid a full scene traversal
on every update; visibility is rewritten only when the cutaway quadrant changes.

## Existing game mode

Reviewed the supplied conversation and existing R21/R22/R81 instructions.
The existing Watch/Play implementation matches the requested direct-control
mode; no additional competing menu is introduced. Requirements, code ownership
and regression gates are consolidated in [game-mode.md](game-mode.md).
The R84 arm frame, character assets, boxing poses, contacts, scoring and audio
are retained. The only fight behavior adjustment prevents automatic presentation
rotation from overriding the user's camera.

## Cost and validation method

Count every mesh under each scene and every indexed/nonindexed triangle,
including instance multiplicity, before visibility culling. Gym fixture meshes:
41 → 64; submitted geometry capacity: 4,422 → 7,818 triangles. Arena scenery:
20 meshes / 8,546 triangles, unchanged. These are scenery counts, not full-scene
draw-call or memory estimates. The initial candidate exceeded the existing
less-than-65 gym mesh regression gate at 67; shared recovery-ball instancing
and batching the ceiling restored the gate without relaxing it.

`qa/r85/browser.cjs` uses real Chromium pointer/touch input through Playwright
and CDP in all six modes, at 393×650, 844×390 and 1100×950. It checks ordinary
dragging, pinching, touch cancellation, failed capture fallback, presets, zoom
limits, Fit, unchanged roots/time, native technique scrolling, language changes
and viewport-contained controls in Watch and Play. Actual geometry raycasts
check scenery occlusion at eight directions in both gym and arena. Screenshots
are app renders, not generated artwork. Historical QA harnesses remain frozen.

Browser rendering uses software WebGL with DPR 0.75 and shadows disabled for
reproducible inspection. Renderer counts in results describe that configuration.
They do not establish sustained FPS, GPU time or phone thermal behavior.
**Physical iPhone/Android testing remains unverified.**

See [QA evidence and commands](../qa/r85/README.md) for exact results and images.
Rollback is the prior published commit; no asset replacement or migration is
required. Do not revert unrelated newer work if rolling back a later release.
