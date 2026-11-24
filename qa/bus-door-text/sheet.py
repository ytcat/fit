"""Before/after sheets from capture.cjs output: python3 qa/bus-door-text/sheet.py <before dir> <after dir> <out dir>
Rows: before, after. Close-up sheets: closed / opening / open per view; film sheets: the film times."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

bdir, adir, out = map(Path, sys.argv[1:4]); out.mkdir(parents=True, exist_ok=True)

def sheet(name, cells, scale):
    """cells: [(label, before file, after file)] -> one column per cell, before on top."""
    ims = [(lab, Image.open(bdir / b).convert('RGB'), Image.open(adir / a).convert('RGB')) for lab, b, a in cells]
    w, h = (int(v * scale) for v in ims[0][1].size); pad = 22
    S = Image.new('RGB', (w * len(ims), (h + pad) * 2), (24, 24, 28)); d = ImageDraw.Draw(S)
    for i, (lab, b, a) in enumerate(ims):
        for r, (im, tag) in enumerate(((b, 'before'), (a, 'after'))):
            S.paste(im.resize((w, h), Image.LANCZOS), (i * w, r * (h + pad) + pad))
            d.text((i * w + 6, r * (h + pad) + 5), f'{tag} · {lab}', fill=(255, 230, 160) if r else (200, 200, 210))
    S.save(out / name, 'WEBP', quality=82, method=6); print(out / name, S.size)

for dev, scale in (('phone', .75), ('pc', .5)):
    B = json.loads((bdir / f'before-{dev}.json').read_text()); A = json.loads((adir / f'after-{dev}.json').read_text())
    sheet(f'film-{dev}-before-after.webp', [(f"film {f['t']} s", f['file'], g['file']) for f, g in zip(B['film'], A['film'])], scale * (.8 if dev == 'phone' else .6))
    for view in ('middle', 'front', 'oblique', 'side'):
        cells = [(f'{view} {c["state"]}', c['file'], g['file']) for c, g in zip(B['close'], A['close']) if c['view'] == view]
        sheet(f'close-{view}-{dev}-before-after.webp', cells, scale)
B = json.loads((bdir / 'before-fallback-phone.json').read_text()); A = json.loads((adir / 'after-fallback-phone.json').read_text())
sheet('fallback-bus-phone-before-after.webp', [(f'{c["view"]} {c["state"]}', c['file'], g['file']) for c, g in zip(B['close'], A['close']) if c['state'] in ('closed', 'open') and c['view'] in ('middle', 'oblique')], .75)
