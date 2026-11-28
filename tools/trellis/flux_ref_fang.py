import os, shutil, sys
from gradio_client import Client
c = Client('black-forest-labs/FLUX.1-schnell', verbose=False, token=os.environ['HF_TOKEN'])
prompt = ("head and short neck bust of an anthropomorphic grey wolf, a hardened street tough and market robber, "
  "broad face, heavy strong jaw, layered shaggy grey cheek fur with lighter cream fur on the muzzle and throat, "
  "amber eyes, stern serious expression, mouth closed and neutral, upright pointed ears, "
  "three-quarter view facing left, the whole head and a short neck visible, nothing below the neck, "
  "stylized realistic 3D character sculpt, game character art, soft even studio lighting, "
  "isolated on plain pure white background, centered, no clothes, no text")
for seed in [int(x) for x in sys.argv[1:]]:
    try:
        r, s = c.predict(prompt=prompt, seed=seed, randomize_seed=False, width=1024, height=1024, num_inference_steps=4, api_name="/infer")
        shutil.copy(r['path'] if isinstance(r, dict) else r, f"ref-{seed}.webp"); print('ok', seed)
    except Exception as e: print('FAIL step=FLUX /infer seed', seed, str(e)[:300])
