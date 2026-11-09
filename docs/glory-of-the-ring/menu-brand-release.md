# Compact training menu and public name — 2026-11-09

Source changes: `70d7fd3`, arena preview art: `48ea185`. Current integration `5888f7e` preserves the latest documentation-only main updates through `f98bf5e`.

The Training tab previously occupied the flexible content row of the dialog. It now precedes content in DOM order and has an explicit fixed grid row. All three tabs remain compact while the content and Back to game remain inside the dialog. The public title is **Glory of the Ring**, as specified by the current product brief; technical IDs, saved profiles, URL and backup format remain unchanged. Arena/floor signs and actual gallery renders match the public title. Changed URLs and the optional complete offline pack are versioned together.

## Evidence

- `node tests/club-interface.test.cjs`: PASS, including tab-before-content order and existing controls/mode behavior.
- `APP_URL=http://127.0.0.1:8134 NODE_PATH=/tmp/fit-tools/node_modules node qa/menu-brand/browser.cjs`: PASS36 combinations:393×852,320×568,844×390,1100×950 × EN/HE/RU × Training/Moves/Settings. No clipped visible buttons, ratings or dialog overflow; pause retained; long-name header fits320px; no page errors.
- `APP_URL=http://127.0.0.1:8134 NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/offline.cjs`: PASS,86 versioned offline assets, local lion loads without network.
- Changed JS syntax and `git diff --check`: PASS.
- Scoped Sol read-only review: no actionable blockers; static review only.
- Full suite and deployment are required before main publication; linked in the release handoff after completion.

Actual app screenshots: [Training](../../qa/menu-brand/practice-393.png), [Moves](../../qa/menu-brand/moves-393.png), [Settings](../../qa/menu-brand/settings-393.png), [landscape](../../qa/menu-brand/practice-844.png), [320px header](../../qa/menu-brand/header-320.png). Raw browser assertions: [results](../../qa/menu-brand/results.json). Gallery previews are actual paused arena renders, not concept art.

This task changes no combat logic, mesh counts or lighting. It does not claim measured physical-phone performance; browser viewports use Linux Chromium. Other open action-control/shop requests are separate and remain open. Rollback the isolated menu/public-title commits together and regenerate the corresponding offline manifest; saved data needs no migration.
