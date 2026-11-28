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
