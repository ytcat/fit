# Player feedback implementation brief — RingFighter / Fit

**Repository:** `ytcat/fit`  
**Status:** Approved product feedback to implement on an isolated feature branch.  
**Relationship:** This brief supplements `FIT_RISE_OF_THE_CHAMPIONS_MASTER_PRD_V2.md` v2.2. It is an implementation task, not another research request.

## What the player reported
1. The word "School" does not fit a boxing club product. Replace the player-facing concept with **Boxing Club** (short nav label **Club**). Use **Academy** only for the advanced later-career institution.
2. Menus are hard to understand. Moves and combos must be easy to find. In manual Play mode each must be available as a clear dropdown/popover containing actual tappable buttons.
3. Opponents stand too close; straight punches need more visible extension, rear-foot/hip/back/leg work, and the non-punching hand must defend.
4. Manual controls feel delayed. First action must start immediately. If the player taps three combos quickly, accept all three and execute FIFO in order, without losing or interrupting earlier accepted commands.

## Critical source findings (current default branch inspected 8 Nov 2026)
- `game-shell.js` currently labels the profile tab "Your school"/"School name" in English and "בית הספר שלך"/"שם בית הספר" in Hebrew. It also uses "Save school", "Build your school", and the school hint. This is the actual visible terminology to fix.
- `game-domain.js` stores the object as `g.school`, creates a default `${playerName} School`, and contains quest IDs `steady_school` and `school_minutes`. These are persisted schema details; preserve them initially for backward compatibility. Change UI copy and new-profile display name. Only migrate an exact auto-generated legacy suffix; never rewrite user-customized names.
- The main manual-control UI is in `ringfighter-controls.js` and `ringfighter-controls.css`. It currently uses left/right side rails and Moves/Combos/Defence pages, which are not sufficiently discoverable.
- `boxing-input.js` currently rejects a combo while another sequence/queue is active (`canCombo()`) and clears training commands when a new move interrupts a combo.
- `boxing-fight.js` currently has a short `playerQueue`, a single `playerCombo`; `requestPlayerCombo()` rejects when a combo or queue exists, while `requestPlayerMove()` clears an active combo. This is the direct reason rapid combo taps can be rejected/interrupted.
- `fight-arena.js` already has dynamic separation in `separateTorso()`, currently using a 1.02 m baseline clearance plus jab/cross preparation. Tune from measured baseline; do not blindly replace the solver.
- `boxing-coach-v2.js` owns the procedural whole-body kinematics and should be improved through its existing skeleton/IK contracts rather than arm-only overrides.

## Exact work order
Implement the complete requirements in PRD section **25B**:
- Consistent Boxing Club terminology across EN/HE/RU, with backward-compatible stored data.
- Simple navigation: World | Train | Fight | Combos | Boxing Club.
- Touch-first Moves and Combos dropdowns/popovers with real buttons, sequences, unlock status, keyboard support, RTL and accessible focus. The popover must be non-modal so it does not block input.
- Unified bounded FIFO action-group queue shared by single moves and complete combos. If idle, start the first action in the same input event/simulation tick. If active, enqueue subsequent groups. At least three complete queued combos must be accepted. A combo is atomic and cannot be interrupted by later queued commands. Show queue state and a clear-queue action. Clear safely at round/match/mode/character transitions.
- Calibrate opponent spacing and realistic long straight mechanics: near-full safe extension, aligned wrist, shoulder protraction, rear foot pivot, hip/chest rotation, weight transfer and opposite glove guarding the face. Preserve correct hook/uppercut mechanics and real collision contact.

## Required tests
- Legacy save migration and custom club name preservation.
- Manual Play dropdown discoverability in <=2 taps on phone.
- Three combos tapped within 300 ms: first starts immediately, second and third accepted and execute in order.
- Mixed move/combo/move FIFO; full queue; clear queue; round end; KO; character/mode change; no stale action.
- Event-to-visible-motion p50/p95; target <=50 ms on 60 FPS device, measured rather than asserted from code.
- Jab/cross front/side/rear-3/4 videos for lion and rabbit, checking extension, wrist, rear foot/hip, opposite glove, distance and contact.
- Full regression, mobile portrait/desktop, EN/HE/RU, accessibility, performance and save/reward ledger.

## Guardrails
- Do not edit the active PRD implementation branch or another agent's worktree. Create an isolated branch from current integrated main after checking its latest state.
- Do not patch only the UI for queueing: `boxing-input.js` and `boxing-fight.js` must change together.
- Do not use a modal for move/combos dropdowns because the current input guard rejects actions when a game modal is open.
- Do not increase opponent spacing blindly; tune the existing dynamic range solver and validate real contacts.
- Preserve current Three.js/GLB systems, training modes, fight results, existing unlocks, offline behavior and free virtual-currency economy.
- No feature is complete until evidence and regression tests are provided.

**Execution instruction:** Read PRD v2.2 section 25B, inspect current integrated main and active branches, then implement this feedback end-to-end on an isolated branch. Do not stop at a plan. Commit in logical milestones and publish a PR with before/after captures and test results.