# Vehicle cabin glazing

- Base: v1.80 development, `9961b9d54c08827715ec667121d84445c4fb461d`; draft only. No revision to glazing in buildings or the city-map distant silhouettes.
- The authored opening bus preserves its glass, wheels and moving doors. Better cabin-nearness metric plus one 288-triangle seat silhouette at middle distance, never drawn together with the detailed cabin. The authored compact's separate low-alpha window and headlamp materials do not need substitution.
- Generated street cars and both generated buses use actual openings, opaque low-cost seats behind a pale gradient pane, separate window draw batches, and no pane depth-write/shadow/refraction. The fallback opening bus still uses its existing door positions and slide signals.
- Node checks: `node tests/city-assets.test.cjs` (real r128 GLB, animation+LOD) and `node tests/offline-version-match.test.cjs` passed. Review GitHub run “Vehicle glass browser review” for same-camera screenshots plus draw/triangle counts. 402×690 is a Chromium viewport, not a physical iPhone.
