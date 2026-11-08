---
name: quality-first-routing
description: Apply automatically to every RingFighter/Fit development, code review, debugging, testing, documentation, asset, animation or graphics task. Optimize Codex model delegation, file access and context while preserving full implementation and visual quality.
---

# Quality-first Codex routing (Fit)

**Primary objective:** maximize VERIFIED high-quality work per unit of Codex usage, not minimum tokens per response. Never weaken acceptance criteria to save usage.

## Important host limitations
- Skills guide decisions but cannot automatically change the primary agent's model or guarantee implicit invocation. The root AGENTS.md requests application on every task.
- When supported in this Codex client, delegate to project agents in `.codex/agents/`; their model settings select their own models. Do not spawn an agent merely to switch models: a subagent has overhead.
- If agents are unavailable, perform the work in the current agent. For complex 3D/physics/reasoning that needs Astra, recommend or explicitly select Astra when available; do **not** claim you switched models.
- Verify account access and client compatibility; never rely on an unavailable model or on Hugging Face APIs as a hidden replacement for Codex.

## Routing decision — before each coherent phase
1. **Zero-model work first:** run file listing, exact searches, static analysis, deterministic code, tests and calculations through tools/scripts. Searching a file does not require an extra LLM agent.
2. **Luna / `fit_scout`**: bounded read-only reconnaissance, file maps, errors/log condensation, documentation lookup, or short extraction. Spawn only when findings can be returned concisely and prevent substantial primary-context loading.
3. **Sol / `fit_engineer`**: normal scoped implementation, integrations, UI fixes, build/test maintenance and routine code review.
4. **Astra / `fit_realism`**: difficult math or algorithm design, physics, 3D character deformation, realistic boxing biomechanics, IK, animation blending, collision/impact mechanics, renderer architecture, hard intermittent regressions, and visual judgment requiring deep technical reasoning. IMPORTANT: not every arithmetic operation requires Astra; deterministic numeric calculation is better executed by code. Use Astra when *reasoning about* math/physics is genuinely difficult.
5. **Review:** deterministic tests first; Sol reviews meaningful code changes; involve Astra for demanding motion/graphics/physics correctness or disputed findings.
6. **Escalation:** if cheap reconnaissance is uncertain, stop guessing and escalate. If a routine change affects bone rigs, GPU performance, collision or human motion, route its design and assessment to Astra. Never silently downgrade.

## Token-efficiency procedure
- Read only file names / relevant lines before full files. Prefer git diffs and scoped commands. Exclude generated assets, binaries, screenshots and node_modules from broad text dumps.
- Read existing docs and recent relevant commit notes; avoid reconstructing project history from scratch.
- Keep main context clean: subagents return exact file paths, findings, uncertainties and reproduction steps, not transcripts or complete logs.
- Default to one active writer. Parallel agents only for independent work with clearly nonoverlapping ownership and a likely net benefit.
- Avoid repeated unbounded retries. After two failed hypotheses, stop, record evidence and escalate root-cause analysis.
- Use stable scripts and tests rather than spending model tokens on repeatable checks.
- Keep write changes scoped, reversible and auditable; no model/quality shortcuts hidden in code.
- Preserve important constraints: phone and desktop performance, no mandatory paid GPU/cloud, realistic lion and other avatars, convincing shoulder/hip/foot mechanics, impact compression, responsive defense, coherent audio and complete arena visibility.

## Quality acceptance gates
1. Identify what the user asked and measurable/visual acceptance criteria; don't shrink scope to save tokens.
2. Confirm existing baseline and make focused modifications.
3. Run relevant automated checks, plus rendering/animation screenshots or recordings when the environment supports them.
4. For strikes inspect guard hand, wrist orientation, elbow path, torso/hip rotation, planted/moving feet, hit timing, recoil and target response. Do not equate passing unit tests with realism.
5. Confirm no regressions in existing modes and mobile performance where testable.
6. Only merge after quality gates pass (or report blockers and leave unmerged). Never claim to have tested unsupported devices or visual quality without evidence.

## Reporting
Summarize objective, actual files changed, tested commands/results, remaining limitations and any agent/model delegation actually performed. Do not invent percentage savings or quality gains. Prefer completed features per usage window as the optimization metric.

Read `references/RESEARCH.md` only when planning routing architecture, changing model policy or checking sources.
