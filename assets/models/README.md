# Character assets

`coach-surface-v2.json` contains the current connected T-pose body, baked
topology-based arm weights, shorts and glove surfaces. Rebuild it with
`python3 scripts/build_coach.py` from the repository root (Python, NumPy and
SciPy). The default coach uses `boxing-coach-v2.js` for skinning and motion.

Keep `coach-surface.json` and `boxing-coach.js` together as the legacy pair for
cached R24 pages. The version 2 model requires the version 2 controller.

Self-contained GLB avatars can be selected with **Load Local File**. Supported
clip names are `Jab`, `Cross`, `Lead_Hook`, `Rear_Hook`, `Uppercut`,
`Rear_Uppercut`, `Slip_Right`, `Roll`, `Footwork` and optionally `Idle_Guard`.
Each clip should begin and finish in guard. Native clips are preserved; unknown
rest poses and bone axes are never assigned guessed joint rotations.

The current arm solver uses the authored +Z arm front and a -Z outer elbow
fold (`posterior-z`). `shoulder-correctives-v2.json` is baked for that frame;
v1 remains available for older clients. A new controller ignores a shoulder
corrective with an incompatible hinge frame and uses the continuous surface.
Rebuild v2 offline with:

```sh
node scripts/authoring/export_shoulder_pose.cjs /tmp/shoulder-pose.json
python3 scripts/authoring/build_shoulder_correctives.py /tmp/shoulder-pose.json assets/models/shoulder-correctives-v2.json
```
