# Parallel agent rules — Glory of the Ring (RingFighter)

You are one of several agents working in parallel, each on its own branch, on a
static web game: `index.html` + plain JS/CSS files in the repo root, three.js vendored
in `assets/vendor/`, no build step. An integrator merges your branch, bumps asset
versions, updates docs and publishes. Read `AGENTS.md` once for project values
(realism, mobile performance, honest evidence), but the rules below win where they differ.

## Branch and commits
- Work ONLY on your own branch `agent/<your-name>` (name given in your task), created from the integration branch `claude/serene-cannon-riwk4l` (same commit as `main`).
- Commit early and often; every commit must leave the app working.
- End every commit message with exactly:
  ```
  Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_012XYxhJ7jTb1Ye5xdCZM7vq
  ```
- Local worktree agents: do NOT push. Cloud-session agents: push ONLY to `origin agent/<your-name>`.
  Nobody except the integrator touches `main`, the integration branch or another agent's branch, and nobody opens a pull request.
  Do not include any model name anywhere else in the repo.

## Files you must not edit (integrator-owned)
- `docs/glory-of-the-ring/FEEDBACK_BACKLOG.md`, `PROJECT_PROGRESS.md`
- existing `?v=...` query strings in `index.html`, the version string inside
  `scripts/build_offline_manifest.py` and `offline-worker.js`
- any file owned by another agent (see the ownership map below). If you
  truly need a change there, keep it minimal, isolated, and list it in your report.
- If you add a NEW js/css file: add its tag to `index.html` with `?v=2026111100`,
  then run `python3 scripts/build_offline_manifest.py` (regenerates
  `offline-manifest.json`; conflicts in that generated file are fine).

## Running and checking
- Preview: from your worktree run (in background)
  `python3 -m http.server <your-port> --bind 127.0.0.1`.
- Browser QA: Playwright is preinstalled — `const {chromium}=require('playwright')`,
  `chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']})`. Never run
  `playwright install`. Run ONE headless browser at a time and use generous timeouts
  (software WebGL is slow).
- App readiness: `await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000})`.
- Useful page API: `app.engine` (engine; `.coach` is the player's boxer, `.arena`, `.player` = input),
  `app.setLanguage('en'|'he'|'ru')`, `ringfighterGame.quick()` (start a fight),
  `ringfighterGame.startTraining({mode:'heavy'|'pads'|'speed'|'rope'|'none',play:true})`,
  `ringfighterGame.open('world'|'club'|'lab'|'learn')` (World / Shop / Combo loadouts / Fight Academy),
  `document.getElementById('playMode').click()` (manual Play mode), `#watchMode`,
  `document.querySelector('[data-input-page="moves"|"combos"|"defence"]').click()`,
  move buttons `[data-input-move="jab"]`, store `app.engine.career.store`
  (`game()`, `wallet()`, `gameAction(a)`, `award(event)`),
  close dialogs: `document.querySelectorAll('dialog[open]').forEach(d=>d.close())`.
- In this headless software renderer CSS transitions lag; wait ≥2.5 s before judging
  colours of a just-changed state.
- Tests: `node tests/<name>.test.cjs`, or several in parallel with `scripts/run-tests.sh <name-part> ...`
  (e.g. `scripts/run-tests.sh shop loadout accessory`). Run the tests for the files and areas you
  touched, plus any test that mentions them (`grep -l <file> tests/*.cjs`). Do NOT run the full suite:
  the integrator runs it once per release (`scripts/run-tests.sh`). Exception: a change to a shared
  core file (`game-domain.js`, `career-progress.js`, `boxing-coach-v2.js`, `boxing-fight.js`,
  `boxing-input.js`, `fight-arena.js`) — then run `scripts/run-tests.sh -j 1` once at the end.
  All must pass. If your change legitimately alters behaviour a test encodes, update that test on
  purpose, keep its intent, and explain it in your report. Never skip, disable or weaken a test
  just to get green.
- Existing browser QA scripts you can reuse (edit the URL/port): `qa/gotr-0001/layout-browser.cjs`,
  `qa/gotr-0004/browser.cjs`, `qa/gotr-0006/browser.cjs`, `qa/gotr-0006/moves-browser.cjs`,
  `qa/gotr-0013/design-browser.cjs`, `qa/gotr-0016/browser.cjs`.
- Evidence: put your QA script(s) and a few SMALL `.webp` screenshots (PIL is available:
  `Image.open(png).save(webp,quality=80)`) in `qa/<gotr-id>/`. Look at your own
  screenshots (Read tool) — passing assertions are not proof that it looks right.
- EN, HE (RTL) and RU must all work; phone portrait (393×852, 360×640), phone landscape
  (852×393) and desktop (1366×768) must all work.

## Design tokens for any NEW CSS you write
Use these custom properties with fallbacks so the new theme applies automatically:
`var(--gr-bg,#0a0e14)`, `var(--gr-surface,#121823)`, `var(--gr-surface-2,#1a2230)`,
`var(--gr-surface-3,#243044)`, `var(--gr-border,#2b364a)`, `var(--gr-text,#f3f6fb)`,
`var(--gr-text-muted,#9aa7bb)`, `var(--gr-accent,#e63946)`, `var(--gr-accent-ink,#fff)`,
`var(--gr-info,#3b82f6)`, `var(--gr-gold,#f4c152)` (coins/rewards only),
`var(--gr-success,#3ecf8e)`, `var(--gr-warning,#f5a524)`, `var(--gr-danger,#ff5d5d)`,
radii `var(--gr-radius-s,8px)` / `-m,12px` / `-l,16px`, control heights
`var(--gr-control-h,44px)` / `var(--gr-control-h-s,36px)`.
Only the design agent edits existing `.css` files; everyone else puts styles in their own new file.

## Scope discipline
- If the full task is too large, deliver a complete, tested slice rather than a
  half-finished whole, and say exactly what is left.
- Do not refactor or reformat code you are not changing (many files have very long
  lines; reformatting causes merge conflicts).
- Do not claim anything you did not verify. Physical phones cannot be tested here; say so.

## Ownership map (updated 2026-11-11) — edit only your own row
| Agent | Owns |
|---|---|
| `punch-feel` (GOTR-0024 power, GOTR-0025 speed) | `boxing-coach-v2.js`, `contact-response.js`, `padding-deformation.js`, `boxing-routines.js`, `academy-lesson.js` (tempo windows only), impact/sound tuning hunks in `fight-arena.js` and `career-drills.js`, timing constants in `boxing-input.js`, their tests |
| `burst` (GOTR-0005) | `boxing-fight.js`, new `burst-*.js`, new `burst.css`, `ringfighter-controls.js`; minimal additive hunks in `boxing-input.js` and `fight-arena.js` (no timing or impact changes) |
| `gear-3d` (GOTR-0002, boots of GOTR-0003) | `game-accessories.js`, `boxing-footwear.js`, `game-presentation.js`, their tests |
| `shop` (GOTR-0001 / GOTR-0004 finish) | `game-shell.js`, new `shop.css`, `tests/game-domain.test.cjs` (shop cases only) |
| integrator | logo (GOTR-0023), `club-interface.js`, `assets/`, docs, backlog, versions, manifests, merges, publishing; everything not listed |

All existing CSS now uses the `--gr-*` tokens defined in `design-tokens.css` with shared components in `design-system.css` (see `docs/design-system.md`). New UI must use those tokens and component classes; put new styles in your own new CSS file.

The account has a strict usage budget: commit every working step, aim for a complete tested slice within about 45–60 minutes, and report what is left rather than polishing.

## Reporting when you finish (cloud-session agents)
Send your final report to the integrator session with the `send_message` tool of the
`claude-code-remote` server, `session_id: "session_012XYxhJ7jTb1Ye5xdCZM7vq"`. Send it
also if you are blocked. The integrator merges `origin/agent/<your-name>`.

## Final report (≤ 350 words, plain text)
1. Branch name and final commit SHA.
2. Files changed (and any touched outside your ownership, with why).
3. What you verified: commands and results (numbers, not adjectives).
4. What is not done / known limitations / risks.
5. Anything the integrator must do.

## Speed and token budget (owner request 2026-11-11)
- The machine has 4 cores; at most 3 agents run at once. Load average 28 was measured with 5 agents,
  which made a 22-minute test suite take over an hour.
- Numbers before pictures: check layout, positions, speeds and text with DOM/geometry/numeric
  checks first; take screenshots only for final evidence (about 6 per task) and look at each once.
- Reuse the QA helpers instead of writing new ones: render-free fight clock stepping
  (`qa/gotr-0036/charge-time.cjs`), camera checks (`qa/gotr-0047/browser.cjs`), layout audit
  (`qa/gotr-0001/layout-browser.cjs`), i18n audit (`qa/gotr-0046/i18n-audit.cjs` once merged).
- Read only the parts of large files you need (grep, then read the lines around the match).
- Keep reports to the requested length; no progress narration in commits.

## Model routing (owner rule, 2026-11-12)
- **Fable**: 3D, animation, rigs, shaders and other very complicated tasks only.
- **Opus**: story, writing, game design, UI/UX features and most other work.
- **Sonnet**: simple, bounded tasks (copy fixes, small CSS, data tables, test updates, release chores).
The integrator picks the cheapest model that fits each task, keeps at most 3 agents running, reuses an existing agent only when its model fits the new task, and keeps briefs and reports short.
