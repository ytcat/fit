# Checkpoint: coach-called combo drills (GOTR-0112) + v1.87

- **Changed:** `adventure/story/call-core.js` (rules), `adventure/oldtown.js` (night_shadow, night_bag, fight_prep, advanced_training run CallDrill; `#advCalls` UI; bag finish at power >= 0.55), `adventure-progress.js` (metric `combos`), `adventure/story/story.css`, tests `call-drills`, `adventure-oldtown`. Merged `agent/paws-v2` (GOTR-0100). Version 1.87.
- **Checks:** `node tests/call-drills.test.cjs`, `node tests/adventure-oldtown.test.cjs`, `node tests/paws.test.cjs` pass; full suite `bash scripts/run-tests.sh -j 2` before release. Bot playthroughs (scratchpad `drill3.cjs`, presses via `fighterPad.press`): bag 13/17 calls, mitts 12/12, counter 7/8 in slow headless time, no page errors.
- **Remaining:** convert the Chapter 2 missions (one_two_mitts, bag_power, roll_under_hook, curb_footwork, influencer_challenge, rooftop_callout) to called combos; phone check.
- **Media:** `qa/gotr-0112/hoodie-v185-vs-v186.png`, `qa/paws/*.webp`.
