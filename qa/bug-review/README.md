# Bug release evidence

Start the app with `python3 -m http.server 8128 --bind 127.0.0.1` from the repository root. Run `browser.cjs` with Playwright in NODE_PATH; set QA_OUT to choose the artifact directory. Default output is outside the served app, `/workspace/ringfighter-review/bugs`.

All PNGs are actual app renders. Store/currency fixtures and synthetic KO presentation setup are labeled in the report; these are not human-played activity claims. `results.json` contains the assertions' measured outputs. Performance samples include the source baseline SHA/build label, software-renderer environment, raw frames and P50/P95 summaries. Do not interpret viewport emulation as physical phone testing.

See `docs/game/short-session-bugfix.md` for scope, commands and limitations. The rejected crossover screenshot is deliberately excluded from shipped evidence.
