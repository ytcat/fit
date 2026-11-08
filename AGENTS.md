# RingFighter agent guidance

Maintain the game's established working behavior and quality. For every development task, apply the quality-first efficiency workflow in `.agents/skills/quality-first-routing/SKILL.md`. Do not treat cost reduction as permission to skip essential tests, dilute realism, or claim unverified results.

Use targeted searches and existing documentation. Delegate narrow, read-only discovery to `fit_scout` only when its expected context savings exceed subagent overhead. Use `fit_engineer` for bounded conventional changes and `fit_realism` for mathematically or visually demanding 3D/animation/physics work. Select an available model explicitly if a configured model is unavailable; never silently replace `fit_realism` with a lower-capability agent for hard tasks.

Keep subagent output concise and avoid uncontrolled parallelism. All production changes must pass available relevant checks. Report any limitations honestly.
