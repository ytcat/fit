# GOTR-0040 — punch power meter in fights and training

`power-meter.js` + `power-meter.css` (new files, tags in `index.html`).

- **Fight:** a slim "Power" row (4 px bar + label) under each health bar, inside that corner of the HUD, shows the
  last *landed* punch of that fighter (not blocked, head or body). It fills, then fades to a faint trace over
  1.8 s; power shots (≥ 70 %) turn red with a glow. Resets for each new bout.
- **Training** (heavy bag, dummy, speed bag, mitts, sparring): a 128 px gauge in the stage's top-right corner:
  bar for the last punch, white tick for the session best, text "Last 72 · Best 91". Only the fighter's own
  punches count; resets when the station changes.
- **Values** are the contact event's real impulse scaled per target, from measured ranges (`impulses.cjs`):
  heavy bag 56–104 (scale 110), mitts 12–33 (scale 36), fight severity 0.07–1.6 (scale 1.6), light targets
  0.3–1.3 (scale 1.3). Unit test: `tests/impact-power.test.cjs`.
- **Words:** Power / Last / Best — עוצמה / אחרון / שיא — Сила / Удар / Рекорд.

## Layout check (`layout-browser.cjs`, real app, headless Chromium)
Overlap of every meter with buttons, the game pad (`#fighterPad`), Burst, health bars/names and the cue:
**0 overlaps** at 402×690 (EN/HE/RU), 360×640, 852×393 and 1366×768, mitts in Play and quick fight
(`layout-results.json`). Screenshots: `train-phone-en.webp`, `fight-phone-he.webp` (RTL), `fight-land-en.webp`.
Not checked on a physical phone.
