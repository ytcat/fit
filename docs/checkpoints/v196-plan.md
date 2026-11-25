# v1.96 plan (owner, 2026-11-25)

Scope, nothing else until the owner's manual QA of v1.95 comes back:
1. **Hazel** (Market Row fruit seller): TRELLIS.2 head like Fang (GOTR-0102 pipeline). Picture: elderly hornless doe,
   red polka-dot kerchief over the head knotted under the chin, closed smile, 3/4 view (`gen_ref.py`, FLUX.1-schnell).
2. **Bruno** (the coach): rebuild with a TRELLIS.2 head the same way.
3. **Brick: ON HOLD (owner, 2026-11-25: "Dont do brick for now").** ChatGPT's art handoff is on branch
   `art/review-handoff-2026-11-25` (Brick reference still + video, earlier editable head, body profile; three vehicles).
   Review only; do not integrate until the owner says so.

Pipeline (free ZeroGPU only; never paid; stop and report the exact step and error if the quota blocks):
FLUX /infer -> transparent PNG -> TRELLIS.2 /start_session, /preprocess_image, /image_to_3d (resolution 1024),
/extract_glb (decimation 100000, texture 1024) -> Blender check (tools/blender/fang_view.py) -> owner approves the
GLB + comparison -> fit like Fang (tools/blender/fang_head_game.py: ~16k tris, colour match, head-joint child,
code head as fallback, offline pack) -> targeted tests, full suite, release.

Status 2026-11-25 05:05 UTC: ZeroGPU quota exhausted ("You have exceeded your ZeroGPU runs limit"); retry scheduled 11:06 UTC.
Then: owner's v1.95 manual-QA findings go into the backlog first.
