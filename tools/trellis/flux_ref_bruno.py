import os, shutil, sys
from gradio_client import Client
c = Client('black-forest-labs/FLUX.1-schnell', verbose=False, token=os.environ['HF_TOKEN'])
prompt = ("head and short neck bust of an anthropomorphic brown bear, an old retired heavyweight boxing champion who now coaches a small gym, about sixty-five years old, "
  "thick dark brown fur, a grey-white muzzle and grey around the eyes from age, small round ears, a broad heavy face, a once-broken flattened nose, a small old scar over one eyebrow, "
  "kind but tough small dark eyes, a warm closed-mouth half smile, "
  "a worn grey-brown tweed flat cap on his head, "
  "three-quarter view facing left, the whole head and a short thick neck visible, nothing below the neck, "
  "stylized realistic 3D character sculpt, game character art, soft even studio lighting, "
  "isolated on plain pure white background, centered, no clothes, no text")
for seed in [int(x) for x in sys.argv[1:]]:
    try:
        r, s = c.predict(prompt=prompt, seed=seed, randomize_seed=False, width=1024, height=1024, num_inference_steps=4, api_name="/infer")
        shutil.copy(r['path'] if isinstance(r, dict) else r, f"bruno-{seed}.webp"); print('ok', seed)
    except Exception as e: print('FAIL step=FLUX /infer seed', seed, str(e)[:300])
