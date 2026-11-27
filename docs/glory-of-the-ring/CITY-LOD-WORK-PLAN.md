# City detail by distance — release work plan

Goal: good silhouettes at street scale and convincing close-ups, without keeping a hero mesh active for every city placement.

- Author near, mid and far representations from the same Blender source. Match pivot, bounds, ground contact, distinctive silhouette and markings. Use the existing tile culling, shared geometry and instanced or batched materials. Keep scene collision separate and stable while LOD changes. Retain a lightweight fallback if art fails to load.
- First implementation: the four approved container liveries. Load one shared shell and four stencil meshes, not four standalone full assets. The Walk scene has 239 container placements; keep most on cheap shapes. Limit near instances with a fixed budget, or pool/instance them. Show rods, handles, hinges and wear up close; use colored corrugated shells with cheap decals at distance. Do not repeat a freight ID on adjacent hero units. Test stable transitions, no double-render and no collider changes.
- Once separately approved, the crane and feeder ship keep their recognizable silhouettes at distance. Reserve cable, railing and deck details for the near model. Pause shop screen and character updates out of range, not just when drawing is skipped.
- Verify from the player camera: walk toward, away and back, check corners, close-up and long view, repeat day/night path. Record frame-time (median and tail), draw calls/triangles and memory or resource-growth evidence if available. Clearly label desktop mobile emulation versus physical iPhone. No launch without passing the existing release checks.
- Do not implement full district streaming yet. Revisit if repeated real-device runs show memory pressure or loading stalls; measure and distinguish memory from rendering cost first.

The container palette has owner approval for integration and testing. Crane, ship, publication and performance claims are not implied.
