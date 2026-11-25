# RingFighter agent guidance

Maintain the game's established working behavior and quality. For every development task, apply the quality-first efficiency workflow in `.agents/skills/quality-first-routing/SKILL.md`. Do not treat cost reduction as permission to skip essential tests, dilute realism, or claim unverified results.

Use targeted searches and existing documentation. Delegate narrow, read-only discovery to `fit_scout` only when its expected context savings exceed subagent overhead. Use `fit_engineer` for bounded conventional changes and `fit_realism` for mathematically or visually demanding 3D/animation/physics work. Select an available model explicitly if a configured model is unavailable; never silently replace `fit_realism` with a lower-capability agent for hard tasks.

Keep subagent output concise and avoid uncontrolled parallelism. All production changes must pass available relevant checks. Report any limitations honestly.

## Git checkpoints for interrupted sessions

- Before editing, inspect `git status --short --branch` and `git worktree list`. When resuming, locate the last checkpoint for that task and read its handoff. Reuse its branch or give new work a unique `wip/<topic>` branch. Preserve earlier and concurrent edits.
- Commit the first recoverable slice as soon as it exists. Checkpoint after each small slice, roughly every 20 minutes while editing, and before long tests or renders and any pause. An unfinished commit can be marked WIP. Stage the relevant sources, assets, and tests by path.
- Keep a short `docs/checkpoints/<topic>.md` handoff on the same branch. Record what changed, what remains, the next command or file, the checks run and their results, and where to retrieve review media. Keep the feedback backlog and film tracker current where the work affects them.
- Push each checkpoint to a Git remote authorized for its contents and confirm the remote branch points to the exact commit. Fit's GitHub repository is public. Use an approved private destination for private drafts or media. If a push is unavailable, provide a verified downloadable Git bundle and say the checkpoint is local. Save important review clips and source assets from temporary directories to an authorized durable location.
- Report the branch, commit SHA, backup location, and next step after each checkpoint. Record verification and release status separately. Creating a checkpoint does not authorize merging or deploying it.

## Publishing while other agents work in parallel (Claude and ChatGPT/Codex)

Before every publish to `main` (the live site https://ytcat.github.io/fit/):
1. `git fetch origin`; read the live `version.js` (https://ytcat.github.io/fit/version.js) and `origin/main:version.js`. They must match; if not, a publish is still deploying: wait and re-check.
2. Merge `origin/main` into the release branch. Check open pull requests and recent branches of the other agent for version numbers already taken.
3. The new version = highest of live, `main` and any taken number + 1. Bump `version.js`, `index.html` `version.js?v=`, `offline-worker.js`, `scripts/build_offline_manifest.py`, then regenerate `offline-manifest.json` (`tests/offline-version-match.test.cjs` checks them).
4. Run the full suite on the merged tree. Immediately before merging, fetch again; if `main` moved, merge and test again.
5. After publishing, confirm the live `version.js` shows the new number and record it in `docs/glory-of-the-ring/RELEASES.md`.

## Mandatory continuous user feedback intake (Glory of the Ring)

At the START of every new task/session, open and review [`docs/glory-of-the-ring/FEEDBACK_BACKLOG.md`](docs/glory-of-the-ring/FEEDBACK_BACKLOG.md) before planning or changing code. It is the single source of truth for user-submitted fixes, corrections and feature requests. Check its OPEN, TRIAGE, IN PROGRESS and BLOCKED entries against the current code and the user's current priority. Codex must re-read the latest version before work and update statuses with actual commits/QA evidence when done. Preserve the full backlog and coordinate with other agents; avoid overwrite races or duplicate work. A user report is a request to investigate, not proof of root cause. Consult [Glory of the Ring PRD entry](GLORY_OF_THE_RING_START_HERE.md) for product requirements. Do not claim Codex reads updates automatically outside a launched session.

## Languages (owner rule, 2026-11-23)

Nothing in the game is specific to one language. Every player-visible text exists in all supported languages (EN/HE/RU) and follows the player's language setting in every mode, page and film. An example given in one language is only an example: implement it in all languages. Never ship single-language UI.

Layout direction is always left-to-right, in every language (owner, 2026-11-23: "Hebrew will not change sides anywhere. Left to right will be kept"). Do not mirror layouts, panels, controls or the pad for Hebrew and never set `dir="rtl"` on containers; Hebrew text still reads naturally inside its own line (use `dir="auto"` or bidi isolation on individual text elements only where punctuation would otherwise jump).

## Avatars and character parts: joins must be checked (owner rule, 2026-11-25)

Owner: "for all your work on avatars, check those kind of things ... how it make sense that you change the head and not check that it is not fit smoothly on the body". Any change to a character's head, body, hands, clothes or props is not done, and must not be merged or released, until every join between parts is checked:
- Look at each seam (head–neck–collar, neck–shoulders, wrists–gloves/paws, waist–trousers, ankles–shoes, hair/kerchief/cap–ears, held props–hands) from the front, side, back, below (camera at chest height looking up) and 3/4, at phone size, in the rest pose and in motion (talk, walk, guard, punch, reach, knockdown where they occur). Close-ups, not only full-body shots.
- Fail on: visible cut edges, rims, flares or fringes; gaps or see-through slits; parts poking through clothes or skin; doubled parts (old + new); colour or texture steps across a seam; floating pieces.
- Add an automated check where possible (e.g. the lowest ring of a new head mesh must stay inside the body/collar in every tested pose; no vertex of one part outside its allowed envelope).
- The report and the owner's before/after pictures must include these seam close-ups. A seam nobody looked at is a failed check, not a pass.
