# RingFighter agent guidance

Maintain the game's established working behavior and quality. For every development task, apply the quality-first efficiency workflow in `.agents/skills/quality-first-routing/SKILL.md`. Do not treat cost reduction as permission to skip essential tests, dilute realism, or claim unverified results.

Use targeted searches and existing documentation. Delegate narrow, read-only discovery to `fit_scout` only when its expected context savings exceed subagent overhead. Use `fit_engineer` for bounded conventional changes and `fit_realism` for mathematically or visually demanding 3D/animation/physics work. Select an available model explicitly if a configured model is unavailable; never silently replace `fit_realism` with a lower-capability agent for hard tasks.

Keep subagent output concise and avoid uncontrolled parallelism. All production changes must pass available relevant checks. Report any limitations honestly.

## Mandatory continuous user feedback intake (Glory of the Ring)

At the START of every new task/session, open and review [`docs/glory-of-the-ring/FEEDBACK_BACKLOG.md`](docs/glory-of-the-ring/FEEDBACK_BACKLOG.md) before planning or changing code. It is the single source of truth for user-submitted fixes, corrections and feature requests. Check its OPEN, TRIAGE, IN PROGRESS and BLOCKED entries against the current code and the user's current priority. Codex must re-read the latest version before work and update statuses with actual commits/QA evidence when done. Preserve the full backlog and coordinate with other agents; avoid overwrite races or duplicate work. A user report is a request to investigate, not proof of root cause. Consult [Glory of the Ring PRD entry](GLORY_OF_THE_RING_START_HERE.md) for product requirements. Do not claim Codex reads updates automatically outside a launched session.
