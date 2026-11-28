# Claude → ChatGPT/Codex handoff (always current)

**What this is:** the single place that shows what Claude has done and what is still open from Claude's side. Claude updates it at the start and end of every task and pushes it. ChatGPT/Codex: read it, together with `docs/glory-of-the-ring/FEEDBACK_BACKLOG.md`, before you plan any work.

**Owner, 2026-11-27:** "ChatGPT will continue … combine everything that is opened from your place and put this in git with clear instructions … ChatGPT has to have all the visibility what you are doing all the time."

**Snapshot:** 2026-11-28. Live: **v1.99** (https://ytcat.github.io/fit/, ChatGPT's PR #47).

- **Everything is pushed.** Every Claude branch is on GitHub. There is no local-only work; Claude's cloud container is temporary.
- **Fixes already on `main`:** Claude's GOTR-0128, GOTR-0130 and GOTR-0131 fixes are on `main`, live in v1.99.

---

## 1. Open work from Claude (do these)

| # | Item | Where | State | Next step |
|---|---|---|---|---|
| 1 | **Bruno's TRELLIS.2 head (GOTR-0139)** | `agent/bruno-head` @ `f0bcbc0` | **Owner approved the look ("Good go", 2026-11-27).** Not merged. | Merge `origin/main`; redo the join sheets on the final head; run the 29 related tests and the full suite; send the seam close-ups; release. The exact steps are in the backlog entry and in `docs/checkpoints/bruno-trellis-head.md` on the branch. |
| 2 | **Street-fight camera (GOTR-0129)** | `agent/street-camera` @ `f876eff` | WIP, untested. Paused by the owner on 2026-11-25. | The ringless sets (street, docks, underground) declare a camera stage; `camera-director.js` keeps the camera inside it. Merge `origin/main`, finish `tests/ringless-camera.test.cjs`, then take 393x852 before/after screenshots. Handoff: `docs/checkpoints/street-camera.md` on the branch. |
| 3 | **Owner QA feedback on v1.97/v1.98 (GOTR-0132…0138)** | backlog | OPEN | Owner's order: 0133 joystick → 0134 speed, direction arrow and blocking objects → 0135 camera zooms into the hair → 0136 HUD, Run and go-to-destination buttons → 0132 cars in the market and box cars → 0138 rework the Fang robbery film → 0137 mopping replacement (proposal first; the owner chooses). **v1.99 may already cover parts of 0132–0136:** check the live build first. |
| 4 | **Avatar joins audit, open findings** | `qa/avatar-joins/AUDIT.md` | Open | #8 whiskers through the gloves/paws; #9 Rourke's teeth through his wrapped fists; #10 mane through the hood; #11 Brick head–neck; #12 tail root through the shorts/jeans/trousers (design); #13 Rourke's waist; #14 Otto's collar; #15 Fang/Hazel collar ring; #16 Fang's ragged jacket front edge; #17 the neck-base weight step on the lion body; #18 thin folds in the front armpit of thick clothes. Owner rule: every join is checked from every view, at rest and in motion (AGENTS.md). |

## 2. Parked (do not touch without the owner)

- **Brick (bulldog):** on hold by the owner.
  - `agent/dream-1` and `agent/dream-1b` hold older code-head trials, which the owner rejected.
  - ChatGPT's art handoff is on `art/review-handoff-2026-11-25`.
- **Stale branches:** `agent/head` and `agent/story-flow` (2026-11-12) were superseded by later releases. Do not merge them.

## 3. Already merged (the backlog lines saying "not merged" are out of date)

These branches are all ancestors of `main`, so they are live:

- `agent/brick-bag-trial`, `agent/paws-portraits`, `agent/paws-v2`, `agent/cast-market`
- `agent/arrival-background`, `agent/bus-door-text`, `agent/walk-gait`, `agent/story-walk`, `agent/pc-smooth-start`, `agent/walk-town-look`, `agent/free-walk-city`
- `agent/hazel-trellis-head`, `fix/hazel-neck`
- `agent/avatar-joins`, `agent/armpit-fold`, `agent/arm-fixes`, `fix/otto-arm`
- `agent/lang-audit`, `agent/mop-night`, `agent/crowd-people`
- `agent/blender-props`, `agent/blender-props-2`, `agent/render-realism`
- `agent/punch-drive`, `agent/ch1-motion`, `agent/super-punch`, `agent/rourke-cast`
- `agent/dream-flow`

Checked with `git merge-base --is-ancestor` on 2026-11-28.

## 4. Tools and sources added by Claude

- `tools/trellis/`: the free Hugging Face pipeline (a FLUX reference picture, then a TRELLIS.2 GLB, then a Blender check render), with the owner's rules in its README. The token comes from the command environment only.
- `assets/characters/bruno/trellis/` and `qa/bruno-trellis/`: Bruno's TRELLIS source and the pictures the owner approved.
- `docs/checkpoints/pause-2026-11-25.md`: the owner's pause on 2026-11-25. Its "next" list is folded into section 1 above.

## 5. Owner rules Claude worked under

The full rules are in AGENTS.md:

- Short, accurate, evidence-based reports. Test before a release, and give links.
- **Joins rule** for avatars, as in AGENTS.md.
- **Languages:** EN/HE/RU everywhere; layout always left-to-right; never `dir="rtl"`.
- **Body geometry:** never call `setIndex` on a character body's geometry (it crashed an iPhone).
- **Real tap:** `tests/story-clean-gym.test.cjs` must keep a real touchscreen tap.
- **Releases:** go through a PR merged with the full 40-character head SHA, under the AGENTS.md publishing checklist.
- **No company material in this repo:** the Radiflow UI skills are never committed to this public repo.
- **No model names** in commits, PRs or code.

---

## 6. Claude work log (newest first)

Claude adds one line per task: date, what was done, branch@SHA, the checks run, and the status.

- **2026-11-28** — Handoff to ChatGPT.
  - Merged `main` (v1.99) into `claude/ecstatic-clarke-9as2ak`.
  - Added GOTR-0132…0139 to the backlog; set GOTR-0128/0130/0131 to live in v1.99 and GOTR-0129 to WIP.
  - Added this file, `tools/trellis/`, Bruno's TRELLIS source and the AGENTS.md visibility rule.
  - Docs, tools and source assets only, with no game code change, merged to `main` by PR.
- **2026-11-26/27** — Bruno head rounds 1–5c on `agent/bruno-head` (latest `f0bcbc0`).
  - The owner said "terrible" on round 4, then asked to improve the head, then approved the look ("Good go").
  - The four Bruno tests pass on the branch; the full suite has not been run on it.
- **2026-11-25** — GOTR-0128, GOTR-0130 and GOTR-0131 fixed (now in v1.99). GOTR-0129 WIP. The owner paused development.
