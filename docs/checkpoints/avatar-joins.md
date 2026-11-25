# Checkpoint: avatar-joins (full audit of every character's joins and deformations)

Branch `agent/avatar-joins` (from `origin/claude/ecstatic-clarke-9as2ak`). Not merged, not released, no version bump.
Owner rule: AGENTS.md "Avatars and character parts: joins must be checked" (2026-11-25).

## State
- WIP: QA tools in `qa/avatar-joins/` (Node numeric audit + browser close-up studio). Audit running.

## Tools
- `node qa/avatar-joins/audit.cjs [variant ...]` (OUT=dir, ROOT=other checkout): CPU-skinned numbers per pose (stretch, folds, creases, hands under the body, arm in trunk, rigid part gaps).
- `node qa/avatar-joins/report.cjs <dir>`: flagged findings.
- `node qa/avatar-joins/studio.cjs <out> <variant> [poses] [joins] [views]` / `batch.cjs <out> [variant ...]`: close-ups (front, side, back, below, 3/4) at phone size in Chromium.
- `python3 qa/avatar-joins/sheet.py grid|pair|tiles ...`: sheets.

## Next
- Triage pictures, fix the visible defects, guard tests, AUDIT.md, sheets.
