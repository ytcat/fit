# Character assets

`coach-surface.json` contains the original connected body, shorts and glove
surfaces. Rebuild it with `python3 scripts/build_coach.py` from the repository
root. The default coach uses `boxing-coach.js` for skinning and motion.

Self-contained GLB avatars can be selected with **Load Local File**. Supported
clip names are `Jab`, `Cross`, `Lead_Hook`, `Rear_Hook`, `Uppercut`,
`Rear_Uppercut`, `Slip_Right`, `Roll`, `Footwork` and optionally `Idle_Guard`.
Each clip should begin and finish in guard. Native clips are preserved; unknown
rest poses and bone axes are never assigned guessed joint rotations.
