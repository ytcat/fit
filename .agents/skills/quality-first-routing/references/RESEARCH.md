# Research basis and operational boundaries (2026-11-08)

- OpenAI Build skills: https://learn.chatgpt.com/docs/build-skills — repo skills live in `.agents/skills/`, use `SKILL.md` frontmatter and progressive disclosure; implicit invocation is guidance, not enforcement.
- OpenAI Subagents: https://learn.chatgpt.com/docs/agent-configuration/subagents — custom agents live in `.codex/agents/`, support model and model_reasoning_effort; separate agent threads increase usage, so avoid frivolous delegation.
- OpenAI Models: https://learn.chatgpt.com/docs/models — supported model identifiers include `gpt-6-luna`, `gpt-6.1-sol`, `gpt-6-astra` subject to account/client access.
- Hugging Face / IBM Research model routing (July 2026): https://huggingface.co/blog/ibm-research/model-routing-is-simple-until-it-isnt — optimize cost, quality and latency jointly; simple difficulty classification does not guarantee a better outcome.
- Hugging Face smolagents code agents: https://huggingface.co/learn/agents-course/unit2/smolagents/code_agents — code/tool composition reduces unnecessary actions; standalone smolagents is a separate framework, not a drop-in Codex routing switch.
- Hugging Face benchmarking small models: https://huggingface.co/blog/is-it-agentic-enough — model and tool performance must be evaluated on specific tasks, not assumed.
- OpenAI Skills evaluation: https://developers.openai.com/blog/eval-skills — test skill activation and output quality.
- OpenAI September 2026 skill/prompt efficiency: https://learn.chatgpt.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra — reduce accumulated prompt/context bloat.

## What this implementation does NOT do
- Does not patch Codex's internal model selector.
- Does not choose a model for each individual shell/file tool call; those tools are already deterministic.
- Does not use unverified outside routing services, extra paid APIs, or Hugging Face-hosted inference.
- Does not promise quantified usage reductions without before/after measurement.

## Validation plan
Run at least these representative tasks in the target Codex client and inspect subagent thread model identities:
1. 'Find where the jab wrist orientation is calculated; don't change code' -> targeted tool search, optional scout.
2. 'Update a small help label and test' -> engineer, not Astra.
3. 'Fix uppercut wrist pronation, elbow-to-shoulder trajectory and force transfer' -> Astra realism analysis, relevant visual checks.
4. 'Perform deterministic collision-distance calculations from recorded positions' -> script/code for arithmetic, Astra only if model-level physics interpretation is needed.
5. 'Review a change affecting punch reactions and mobile FPS' -> Sol review plus Astra if physics/visual doubts remain.

Compare usage per **accepted** change, correctness, regressions, test coverage and visual outcomes. Reject routing optimizations that reduce quality.
