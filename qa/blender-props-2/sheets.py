"""Before/after sheets for Blender props round 2: python3 qa/blender-props-2/sheets.py <shots dir> <out dir>
Film shots: <place>-before-high-NN.png (+ <place>close-before-high-NN.png for the close-ups) against <place>-after-high-NN.png (film shots
first, then the close-ups, as qa/blender-props-2/capture.cjs writes them). Fights: fight-before-<place>-{fight,close}.png against
fight-after-... Top row before, bottom row after; the renderer numbers (draw calls / triangles) under each picture."""
import json, sys, os
from PIL import Image, ImageDraw
shots, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)


def sheet(rows, path, s=.5):
    w, h = rows[0][0][0].size; cw, ch = int(w * s), int(h * s); n = max(len(r[0]) for r in rows)
    im = Image.new('RGB', (cw * n, (ch + 18) * len(rows)), (16, 16, 18)); g = ImageDraw.Draw(im)
    for r, (ims, labels) in enumerate(rows):
        for i, (p, lab) in enumerate(zip(ims, labels)):
            im.paste(p.resize((cw, ch)), (i * cw, r * (ch + 18))); g.text((i * cw + 4, r * (ch + 18) + ch + 3), lab, fill=(230, 230, 230))
    im.save(path, quality=82); print('wrote', path)


def lab(m, tag): return f"{tag} {m.get('t', '')}s  {m.get('calls')} calls  {round((m.get('triangles') or 0) / 1000)}k tris"


for place in ('market', 'shop', 'docks', 'opening'):
    a = os.path.join(shots, f'{place}-after-high.json'); b = os.path.join(shots, f'{place}-before-high.json'); bc = os.path.join(shots, f'{place}close-before-high.json')
    if not (os.path.exists(a) and os.path.exists(b)): continue
    am, bm = json.load(open(a))['rows'], json.load(open(b))['rows']; cm = json.load(open(bc))['rows'] if os.path.exists(bc) else []
    nf = len(bm)
    bims = [Image.open(os.path.join(shots, f'{place}-before-high-{i:02d}.png')).convert('RGB') for i in range(nf)]
    cims = [Image.open(os.path.join(shots, f'{place}close-before-high-{i:02d}.png')).convert('RGB') for i in range(len(cm))]
    aims = [Image.open(os.path.join(shots, f'{place}-after-high-{i:02d}.png')).convert('RGB') for i in range(len(am))]
    sheet([(bims, [lab(m, 'before') for m in bm]), (aims[:nf], [lab(m, 'after') for m in am[:nf]])], os.path.join(out, f'{place}-before-after.webp'))
    if cm: sheet([(cims, [lab(m, 'before') for m in cm]), (aims[nf:], [lab(m, 'after') for m in am[nf:]])], os.path.join(out, f'closeups-{place}-before-after.webp'), s=.6)

fb, fa = os.path.join(shots, 'fight-before.json'), os.path.join(shots, 'fight-after.json')
if os.path.exists(fb) and os.path.exists(fa):
    B = {r['place']: r for r in json.load(open(fb))['rows']}; A = {r['place']: r for r in json.load(open(fa))['rows']}
    for kind in ('fight', 'close'):
        places = [p for p in A if p in B]
        rows = []
        for tag, R in (('before', B), ('after', A)):
            rows.append(([Image.open(os.path.join(shots, f'fight-{tag}-{p}-{kind}.png')).convert('RGB') for p in places],
                         [f"{tag} {p} {R[p][kind]['calls']}c {round(R[p][kind]['triangles'] / 1000)}k" for p in places]))
        sheet(rows, os.path.join(out, f'ring-{kind}-before-after.webp'))
