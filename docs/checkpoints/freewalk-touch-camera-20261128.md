# FreeWalk touch and camera follow-up

Base `6b77e4a`, live v1.99 release record, on `fix/freewalk-touch-camera-20261128`. The supplied 5.83-second iPhone recording shows the player crossing the Fairground toward Bruno's gym, with abrupt changes in camera distance during a held drag. The accompanying still shows the left stick deflected while the player is stationary. The still alone cannot establish what blocked movement. The original attachment stays outside the repository.

- A held movement gesture keeps one directional reference until it returns to neutral. Switching thumb direction during that gesture still steers immediately. Looking with the right stick remains independent. The drawn thumb reflects the actual dead zone and filtered direction. A held request that makes almost no progress gains an amber border after 180 ms of simulation and clears on movement or release.
- Pointer release is caught outside the original pad, with touch-end, cancellation, lost capture and page lifecycle cleanup. Moving onto another control does not hand it the active pointer.
- The chase camera keeps the eased orbit in tight corners. It briefly holds its chosen side rather than switching for a transient obstruction, refines the solid ray, and begins shortening the boom before a nearby obstruction when walking. The current solid ray still constrains the camera.
- The focused Node touch, camera, portrait, FreeWalk, intersection-yield and offline-version checks passed. Named cases include turning away from a blocked forward drag, no camera yaw snap at a wall, and simultaneous movement/look inputs.

Physical iPhone Safari and final release verification remain open.

## Old Town fountain

The approved fountain GLB had no animation tracks. FreeWalk now animates moving highlights on the existing jet arches and 12 expanding/fading ripple rings at the six authored impact points. The basin, its collision and the fallback are unchanged. In 393×852 Chromium, with the avatar stationary, three samples at 240 ms intervals showed different rendered water frames and ripple sizes, a solid basin, and no WebGL shader or page errors. The GIF is those three actual game frames. Evidence is in `qa/approved-city/evidence/freewalk-20261128/`.

## Fairground browser replay

The final browser probe dispatched Chromium touchscreen events in 393×852 portrait, then advanced the real FreeWalk simulation in fixed 1/30 s steps on a clear Fairground path selected for the rendered heading. A slight sideways variation during the forward drag remained filtered, and the measured lateral drift was under 2 cm. The right stick rotated the camera while the left kept its movement reference. Touch cancellation cleared movement and a new left gesture walked again. No page errors occurred.

The bounded orbit recorded at most 0.1134 rad per simulation step. A solid edge still shortened the boom by up to 1.68 m in one straight-walk step. The simultaneous look segment changed by at most 0.002 m per step. This is a game-step measurement, with no physical device frame-rate or whole-route smoothness claim. See `qa/approved-city/evidence/freewalk-20261128/controls.json`. Main and the deployed version were not changed.

### Fountain visual refinement

The next pass keeps the authored stonework and upgrades the water. Two scales of animated highlights travel down the original jet arcs. The water uses directional surface waves, six local impact waves, and a stronger reflection at glancing angles. Finer ripple rings and one batch of 42 small ballistic splash droplets mark the landing points. There are no new external assets. The existing basin collision and fallback remain in place.

393×852 Chromium software WebGL passed the stationary-player fountain check. Eight fixed-camera renders showed distinct water frames and ring sizes, 42 splash particles, and zero page or shader errors. The checked source is `b898cb4`. Focused FreeWalk, crossings, and offline-version tests also passed. The evidence folder includes the loop, a matched comparison, and measurements. Physical iPhone Safari rendering and frame rate remain unverified.

### Clear water and plaza redesign

The owner asked for transparent water and streams, more natural impact, more fountain detail, and designed seating, trees and bins. The revised basin exposes staggered ceramic mosaic through translucent water, with depth tint and moving light on the tilework. Bronze trim and inset accents dress the basin and upper bowl. Falling streams use a clear blend and the less luminous impact treatment from this pass. The two seating bays use timber slats, iron supports and matching bins, and four existing authored trees have planted stone surrounds. Layout additions apply in FreeWalk.

Browser pass on `9b7c344` at 393×852 confirmed distinct fountain frames, clear surfaces and jets, both solid benches, both main approaches open, and four park trees. No page or shader errors on the final run. Focused FreeWalk, crossings and offline-version tests passed. See `qa/approved-city/evidence/freewalk-20261128/fountain-clear-water.gif`, `fountain-plaza.jpg` and `fountain-plaza.json`. Physical iPhone Safari remains unverified.

### Fountain impact follow-up

The owner approved the plaza and asked for a more natural landing without uniform circles. The rendered impact now uses a short spreading patch of broken foam, off-axis surface highlights and a fan of moving droplets. The baked circular overlays and rigid splash spikes were removed from the render. The basin, clear water and furniture layout are retained.

In 393×852 Chromium, eight close-up frames of the stationary fountain changed over time. The final browser run at `7bb7589` verified 54 spray points, six filtered jet arcs, absent ring overlays, clear water and jets, a solid basin, open main approaches and no page or shader errors. FreeWalk, crossings and offline-version tests passed. Physical iPhone Safari remains unverified.
