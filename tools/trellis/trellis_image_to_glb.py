import os, sys, shutil, time
from gradio_client import Client, handle_file
img = sys.argv[1]; out = sys.argv[2]; t0 = time.time()
c = Client('microsoft/TRELLIS.2', verbose=False, token=os.environ['HF_TOKEN'])
c.predict(api_name='/start_session')
pre = c.predict(handle_file(img), api_name='/preprocess_image'); pre = pre['path'] if isinstance(pre, dict) else pre
print('step preprocess ok', round(time.time() - t0)); 
c.predict(handle_file(pre), 0, '1024', api_name='/image_to_3d'); print('step image_to_3d ok', round(time.time() - t0))
a, b = c.predict(100000, 1024, api_name='/extract_glb'); print('step extract_glb ok', round(time.time() - t0))
p = b if isinstance(b, str) else (a if isinstance(a, str) else a.get('path')); shutil.copy(p, out); print('saved', out, os.path.getsize(out))
