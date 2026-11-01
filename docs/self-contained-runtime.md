# Self-contained runtime requirement

The user requires all runtime animation and character functionality to remain
inside the app, without calls to hosted motion engines or external inference APIs.

Implemented:
- Serve libraries, character surfaces, animation scripts and optional character
  files from the app's own origin; removed GitHub API model discovery.
- Content Security Policy restricts network connections to same-origin resources
  and local blob/data URLs. Runtime scripts/styles are bundled with the app.
- Browser speech may use only voices explicitly flagged as device-local and
  matching the selected language. If none is available, visual cues and the
  locally synthesised bell remain; no remote speech fallback is requested.

## Motion-model integration boundary

Kimodo has not been downloaded, run or embedded. Its code is Apache-2.0; model
checkpoints have their own NVIDIA Open Model License. Source availability is not
proof that all components share the code license.

Official sources:
- https://github.com/nv-tlabs/kimodo
- https://huggingface.co/nvidia/Kimodo-SOMA-RP-v1.2

The published implementation uses Python/PyTorch and GPU-based inference. The
current deployment is a static browser app with no inference backend. There is
no verified browser-compatible Kimodo runtime in this project.

The proposed production workflow is local development-time motion generation,
retargeting and validation, followed by bundling the approved clips with the
app for local playback. If the generator itself must also ship inside the
product, that requires a separate locally hosted/native runtime and a hardware
plan; bundling clips must not be represented as embedding the generator.

No external inference endpoint, account connection, API key or model service has
been added. Offline installation/caching is a separate capability and is not
implemented by the same-origin policy alone.
