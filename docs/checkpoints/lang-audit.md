# Checkpoint: lang-audit (branch agent/lang-audit)

Owner rules (2026-11-23): every player-visible text in EN/HE/RU following app.lang; the layout stays
left-to-right in every language (no RTL mirroring for Hebrew).

## Done so far
- RTL mirroring removed: html dir is always `ltr` (index.html setLanguage); every `x.dir = lang==='he'?'rtl':'ltr'`
  (academy-stage, bag-break, dream-scenes, story-scenes, career-interface, fight-pause, fighter-stats, game-shell),
  modes-menu RTL placement, all `[dir=rtl]` / `.gm-rtl` CSS rules, the oldtown current-step arrow.
  `text-align:start/end` -> `left/right`. Hebrew lines read RTL inside their own box via
  `:lang(he) body *{unicode-bidi:plaintext}` (design-tokens.css).
- `scripts/lang-audit.cjs`: static audit (he-only, ru-only, lang-map, en-sink, en-data, html-text, rtl).
- `qa/lang-audit/sweep.cjs`: browser sweep EN/HE/RU with screenshots.

## Next
- Run before/after sweeps, fix gaps, add tests/lang-generic.test.cjs + tests/lang-allow.json, bump ?v=, manifest.
