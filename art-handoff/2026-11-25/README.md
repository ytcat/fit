# Glory of the Ring — Dot handoff for Claude Code

**Start here.** This branch contains review assets and source patches, not a release or an integration branch. Do not merge it wholesale. Start any proposed integration from the current `main` and preserve Claude's intervening changes.

| Item | Exact source | Status and action |
| --- | --- | --- |
| Three Blender traffic vehicles | [Vehicles ZIP](traffic/Gloryland-3-Vehicles-Blender-GLB.zip) | Northline Hatchback, Midnight Sedan, and Harbor Delivery Van, with actual GLBs, Blender sources, and renders. Start with the hatchback for a matched English in-game free-roam before/after. The sedan and van exceed the stock moving-car footprint; do not replace traffic blindly. |
| City implementation candidate | [City Art ZIP](city/Gloryland-City-Art-Claude.zip) | Source patch, QA, renders, and optional compact car source. Originally built on v1.94 at `2508be160a025dfc8526221afc28a31001fff940`. Port the delta selectively; check for changes already on `main`. This is distinct from the three higher-detail Blender cars. |
| Close-range pedestrian refinement | [Pedestrian source ZIP](city/Gloryland-Pedestrians-Close-Review-Source.zip) | Follow-up patch built on top of the City Art candidate (`da8cd1c1655fd2115813947074db232a780d3544`), not standalone. Reuses the same four animated rigs. Verify actual close passes from multiple angles, preserving the existing dog walker and leash. |
| Midnight Pier Wheel and Rowan the fox | [Fairground and pedestrian ZIP](city/Gloryland-Fairground-and-Pedestrian-Review.zip) | Actual GLB and Blender sources. The wheel has a validated authoring animation with 16 upright cabins; it is not mobile-optimized. Rowan is a static art candidate, not a replacement for an animated pedestrian. |
| Brick | [Older Brick review ZIP](brick/Brick-for-Claude-Review-Only.zip) | **HOLD for integration.** This is the older source and review material, not the restored full model and not a drop-in replacement. Do not install it, resurrect the rejected v1.95 package, or overwrite current stock Brick rig fixes. |
| Chapter 1 walkthrough and Market | [Existing release work in PR #42](https://github.com/ytcat/fit/pull/42) | Do not replay older bus, dog walker, or Market patches on top of shipped changes. Re-test ride exit and Market in current gameplay. Jacket removal still needs a continuous worn-to-held pass if revisited. |

## Integration checks
- Keep identical gameplay and assets in English, Hebrew, and Russian; use English in preview footage. Preserve existing route boundaries, guidance, story triggers, and traffic yield/resume behavior.
- Review from the actual gameplay camera on a physical iPhone, including close passes and the busiest scene. Compare frame time, draw calls, and asset size before selecting LODs.
- For any avatar revision, show real relevant poses from front, side, back, below and three-quarter, checking joins and interactions for clipping. Do not treat a static render as acceptance.
- Bring only verified changes to a separate review PR; no deployment from this handoff.

## SHA-256
- Vehicles: `6b78283c5d62c2aa2cc4b4d897938cdf1d32e9a30c8d34b902eed6c5991e2772`
- City Art: `58a10c17b64696a018e325f599a1506ac4f75147bd8b6506c4846cbe402132dd`
- Pedestrian close-range source: `65ace589f9d943ac11f64b9e18e396ab28eae704124ccdd7bdf2eea1b1eba06a`
- Fairground and Rowan: `2b1e3a35a9465205e9346fb31fc64bfa32bb3ca2aa039544e24059df94e8410e`
- Older Brick review: `70d0c49653f947da3dab3bc20138fec2ee5af540dcf14538edf918569cf632d6`
