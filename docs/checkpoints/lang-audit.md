# Checkpoint: lang-audit (branch `agent/lang-audit`)

Owner rules (2026-11-23, AGENTS.md "Languages"): every player-visible text exists in EN/HE/RU and follows `app.lang`;
the layout stays left-to-right in every language ("Hebrew will not change sides anywhere"). Base: v1.92 +
`origin/claude/ecstatic-clarke-9as2ak` (436afd1). Not merged, no version bump, no PR.

## What changed
- **No RTL layout anywhere.** `index.html` keeps `html dir="ltr"` (setLanguage no longer copies `dict.dir`; the `dir` keys
  are gone); an inline head script sets `html lang` from the saved language before the first paint and defines
  `uiSay(en, he, ru)`. Removed every `x.dir = lang==='he'?'rtl':'ltr'` (academy-stage, bag-break, dream-scenes,
  story-scenes, career-interface, fight-pause, fighter-stats, game-shell), the modes-menu RTL placement (`gm-rtl`),
  all `[dir=rtl]` CSS rules (academy, adventure, dream, club-interface, design-system, design-tokens, fight-hud,
  modes-menu, shop, stage-hud, workout-experience, fight-ui inline CSS), the `◀` current-step arrow, `dir=auto` on two
  containers (story-scenes spoken line, mop note). `text-align:start/end` -> `left/right` in all CSS.
  Hebrew lines still read right-to-left inside their own box: `design-tokens.css`
  `:lang(he) body *{unicode-bidi:plaintext}` + `:lang(he) body{text-align:left}` (paragraph direction from the text,
  `direction` stays ltr, so flex/grid order and alignment are the same as in English).
- **In-world signs in the player's language** (canvas textures; the game name and KO stay Latin per glossary.js):
  Gloryland map signs (`gloryland-map.js` SIGN_WORDS, `adventure-ui.js` passes `lang`; a translated sign keeps the
  English footprint), venue sets (`arena-sets.js` SIGN_WORDS / `SW(L, …)`, repainted by `setLang`), the gym and arena
  posters (`club-world.js` `relabel`), the ring canvas print (`gym-details.js`), the referee badge (`fight-referee.js`
  via `GotrGlossary.onLanguage`), story sets (market-sets, dream-sets, story-sets bus board, bag-break stamp,
  otto-civilian shop mark). `club-interface.js` app.setLanguage calls `world.relabel`, `GymDetails.relabel`,
  `GotrGlossary.relabel`.
- **Glossary consistency** (owner 2026-11-11: Jab/Cross/Hook/Uppercut/Slip/Roll/Guard… stay Latin): the fighter pad and
  the story pads show Hook / Uppercut / Guard / Slip in Latin (isolated in Hebrew); "Straight" is not a glossary term
  and is now translated everywhere — the coach-called chips said "Straight" in HE/RU (ישרה / Прямой now).
- **UI gaps fixed:** "Fight Academy" button label before paint, version tooltip, Pause/Resume and other aria-labels
  (play button, training-menu close, techniques rail, shop preview), status lines (WebGL / avatar / ready to train,
  Freeze/Play motion), seconds suffix in the training status, LION / RABBIT stance line, L / R fight mark, audio credits
  link, document title.
- **Audits and test:** `scripts/lang-audit.cjs` (static, no deps), `scripts/lang-data-audit.cjs` (text tables loaded in
  Node), `qa/lang-audit/sweep.cjs` (browser, EN/HE/RU, 402x690, 30 states incl. map cards, films, coach chips, story
  fight HUD, Super Punch caption, bag trial, mop game and results), `tests/lang-generic.test.cjs` + `tests/lang-allow.json`.
- Updated tests for the LTR rule / localized status lines: app.test (html dir ltr, Russian status line), browser.cjs,
  club-interface.test, fight-guard-hud.test.

## Evidence
- `qa/lang-audit/counts.json` (before/after: static 131 -> 20 findings, all 20 allow-listed; sweep HE 7 foreign + 118
  direction faults -> 0, RU 7 -> 0, EN 0 -> 0), `qa/lang-audit/static-before.json`, `qa/lang-audit/static-after.json`,
  `qa/lang-audit/sweep-before.json`, `qa/lang-audit/sweep-after.json`, screenshots `qa/lang-audit/{before,after}/<lang>-<screen>.webp`,
  sheets `qa/lang-audit/sheet-<lang>-before-after.webp`.

## Resume 2026-11-24
- Paused by the owner on 2026-11-23 (24baa93); merged the release branch (square header logo 45fdcf8, 644f85a) in
  9d6ffa9: the header keeps the new logo, its tooltip is localized, nothing mirrors in Hebrew.

- Final sweep on the merged tree: EN/HE/RU 0 foreign texts, 0 direction faults, html `ltr` in all three (counts.json).
- Full suite (`bash scripts/run-tests.sh -j 2`, machine load ~20 on 4 cores from other agents): 154 files, 4 failures;
  fixed 2 caused here (reference-motion: head script needed a guard for a document without documentElement;
  otto-civilian-lifecycle: pinned cache key, now `otto492e63-lang`). story-clean-gym (welcome-card fill timeout) and
  rourke-cast ("the bout ran (0 frames)") fail the same way on the untouched base tree (436afd1) under the same load.

## Not done / next
- Free walk (`chapter1-roam.html`, `adventure/story/chapter1-roam*.js`, `street-walk.js`) is out of scope (another agent);
  issues listed in the report.
- Coach cue/drill prose (boxing-routines, boxing-coach*, index.html drills) keeps Hebrew/Russian transliterations of
  glossary terms (ג׳אב, хук…, about 150 occurrences); part of it is spoken by speechSynthesis (he-IL / ru-RU), where a
  Latin word would be mispronounced. Left as is: an owner decision (Latin on screen vs. natural speech) is needed.
- Next command: `bash scripts/run-tests.sh -j 2`; re-run `node qa/lang-audit/sweep.cjs . <out>` after UI changes.
