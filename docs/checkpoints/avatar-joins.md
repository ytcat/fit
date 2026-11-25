# Checkpoint: avatar-joins (GOTR-0127, full audit of every character's joins and deformations)

Branch `agent/avatar-joins` (from `origin/claude/ecstatic-clarke-9as2ak`, merged with it again at 249f16c incl. `fix/hazel-neck`).
Not merged to main, not released, no version bump. Owner rule: AGENTS.md "Avatars and character parts: joins must be checked".

## What changed
- `boxing-coach-v2.js`: boxing shorts extracted past their openings and clipped exactly at the leg hems (.735) and the waist
  (1.085): no saw-tooth hem, no jagged rim under the waistband (shared by the Fighter, Mack, Brick). Glove cuff opens to
  .066 x .062 at the elbow end (the forearm no longer comes through it), glove end unchanged; top binding and SB label follow.
  Side piping: one skinned tube seated 3 mm over the fabric (`rig.shortsPiping`, 'Satin side piping'), no rigid thigh tubes.
- `adventure/story/story-cast.js`: Brick hides the piping (his trunks have their painted stripe).
- `adventure/story/street-wear.js`: sneaker tread closed on the centre line (no slit along the sole).
- `index.html` ?v= for the three files, `offline-manifest.json` regenerated.
- Tried and reverted (measured worse / no gain, see AUDIT.md #6/#7): the skin's axillary correction on the clothes at their
  own height (avatar-detail.js `avatarLift`), and an extra armhole smoothing of the hoodie.

## Evidence
- `qa/avatar-joins/AUDIT.md`: every finding (character, join, pose, severity, status, picture).
- Sheets `qa/avatar-joins/*.webp` (before | after close-ups; frames from `batch.cjs`, phone 402x690, 5 views per join).
- Numbers `qa/avatar-joins/measure-before.json` / `measure-after.json`.

## Tools
- `node qa/avatar-joins/audit.cjs [variant ...]` (OUT=dir, ROOT=other checkout) + `report.cjs <dir>`: numeric pass.
- `node qa/avatar-joins/covers.cjs [variant ...]`: skin through covers (noisy for closed gloves/boots; triage aid).
- `node qa/avatar-joins/studio.cjs <out> <variant> [poses] [joins] [views]`, `batch.cjs <out> [variant ...]`: close-ups.
  STUDIO_SETUP / STUDIO_AFTER run page JS before/after the rig is built (experiments).
- `python3 qa/avatar-joins/sheet.py grid|pair|tiles ...`: sheets. `node qa/avatar-joins/measure.cjs`: test numbers.

## Checks run
See the end of this file (updated with the final run).

## Next
- Armpit fold (AUDIT #5-#7): pose-space corrective for the raised arm / a collision-aware axilla pass; hoodie armhole
  re-authored. Route to fit_realism.
- Small open items #8-#14.
