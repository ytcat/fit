"""Before/after sheets from qa/blender-props/capture.cjs output: python3 qa/blender-props/sheets.py <before dir> <after dir> <out dir>
Top row before, bottom row after, one column per captured shot, the renderer numbers under each picture."""
import json, sys, os
from PIL import Image, ImageDraw
before, after, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
for tag in ('opening', 'market', 'gym', 'walk'):
    for q in ('high', 'low'):
        rows = []
        for d in (before, after):
            j = os.path.join(d, f'{tag}-{q}.json')
            if not os.path.exists(j): break
            meta = json.load(open(j))['rows']
            ims = [Image.open(os.path.join(d, f'{tag}-{q}-{i:02d}.png')).convert('RGB') for i in range(len(meta))]
            rows.append((ims, meta))
        if len(rows) < 2: continue
        w, h = rows[0][0][0].size; s = .5; cw, ch = int(w * s), int(h * s); n = len(rows[0][0])
        sheet = Image.new('RGB', (cw * n, (ch + 18) * 2), (16, 16, 18)); g = ImageDraw.Draw(sheet)
        for r, (ims, meta) in enumerate(rows):
            for i, (im, m) in enumerate(zip(ims, meta)):
                y = r * (ch + 18); sheet.paste(im.resize((cw, ch)), (i * cw, y))
                g.text((i * cw + 4, y + ch + 3), f"{'before' if r == 0 else 'after'} {m.get('t', m.get('step', ''))}: {m['calls']} calls {round(m['triangles'] / 1000)}k tris", fill=(230, 230, 230))
        sheet.save(os.path.join(out, f'{tag}-{q}-before-after.webp'), quality=82)
        print('sheet', tag, q)
