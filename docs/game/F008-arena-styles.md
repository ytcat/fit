# F-008 — selectable arena styles

Baseline main: `831a519fed1a52416453b36e98f69b2f0e4e20aa`.
Branch: `lion/foundation-venue-gallery`.

World → **Arena styles** offers Neighborhood Hall (the original), Neon Strip and Harbor Dome. Three actual app-rendered arena pictures preview the choices. Selection is free and saved per player; it changes fight-night surfaces and signage. It does not change XP, coins, equipment, combat stats, rules, geometry, lighting or camera behavior.

## State and compatibility contract

- `game.venue`: `'default' | 'neon_strip' | 'harbor_dome'`; missing legacy data migrates to `'default'` during existing career validation.
- `{type:'venue',venueId}` uses the existing atomic career transaction. Invalid/unbundled IDs are rejected. Quota failure restores the preceding value and persisted save. Switching profiles restores each profile's own style.
- The bundled renderer catalog and persistent IDs are tested for equality. Missing optional renderer assets show a readable fallback and omit the World entry instead of breaking gameplay.
- `GameVenues.apply(engine,id,lang)` owns only cloned arena/ring materials and generated textures. It leaves fighters, referee, audience, gym/school art, contact logic, fight state and camera untouched. Default restores original material references.
- Each engine's arena transition reapplies the remembered look synchronously after existing `setTarget()` completes, including legacy same-mode New Fight. Return values, errors, receiver/arguments and original property descriptors remain intact; detached wrappers are inert after disposal.
- Theme/locale resources are cached within a bounded catalog. Locale replacement disposes previous generated maps; fight disposal restores original ring resources before their own disposal. No per-frame texture generation/upload is introduced.

## Evidence and gates

`qa/venues/gallery.cjs` exercises the shipped UI: per-profile saves, reload, unchanged wallet, nine EN/HE/RU portrait/landscape layouts without scrolling, and style selection inside an actual fight. It asserts identical match/entry objects and complete match state, camera, control mode and pause restoration.

`qa/venues/preview.cjs` renders fixed front, quarter and reverse cameras on desktop and a 393×852 viewport for every style, inspects linked shaders, counts draws/triangles/uploads/resources and checks default restoration. The gallery thumbnails are these real Three.js arena renders, with actors hidden **only during the thumbnail capture**. No generated concept image is presented as runtime evidence.

```sh
node tests/venue-selection.test.cjs
node tests/game-venues.test.cjs
node tests/game-domain.test.cjs
node tests/club-interface.test.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/venues/gallery.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/venues/preview.cjs
APP_URL=http://127.0.0.1:8132 NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/offline.cjs
```

The offline pack contains **84 same-origin assets** (~21.55 MB uncompressed source files). No remote service, paid package, runtime CDN, new light or model is added. Full validation runs all **73 suites** before publication.

Same-view renderer checks show no added draw calls or submitted triangles across styles, and zero steady buffer/texture uploads from style application. Counts vary with camera culling; compare identical views rather than totals from different cameras. Theme materials/textures consume bounded additional resources, reported in the QA output. Single software-renderer submission times are not gameplay FPS. Physical iPhone/Android sustained FPS, thermal behavior and driver memory remain **NOT VERIFIED**; this is not a claim of passing hardware performance targets.

Source-only review caught the optional-renderer failure and fixed it before publication. Lifecycle review caught the same-mode new-fight gap and verified synchronous reapplication. Existing station return, short sessions, store and all prior modes are retained.

Rollback: choose Neighborhood Hall, or use `?game=classic` for the original interface. A code rollback should revert this milestone's renderer/UI/domain/index/offline changes together; the extra optional venue field grants no progression and does not modify existing records.

Next milestone: F-009, a three-bout local NPC tournament with canonical Play results, checkpoint recovery and an earned title. Its pure rules draft is isolated; it is not included or claimed functional here. The unsafe rope crossover and later realism/PRD gates also remain separate.
