"""Render realism sheets and picture numbers.
usage: python3 qa/render-realism/sheet.py <before_dir> <before_tag> <after_dir> <after_tag> <out_dir>
For each case and quality: <out_dir>/<case>-<quality>.webp (top row before, bottom row after, 402x690 frames) and
<out_dir>/picture-numbers.json: per frame mean luma (Rec.709 on sRGB values, 0-255), share of clipped (>= 250) and crushed
(<= 6) pixels and RMS contrast, measured on the picture area only (the film's black bars and subtitle are left out).
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageStat

bdir, btag, adir, atag, out = sys.argv[1:6]
os.makedirs(out, exist_ok=True)
CASES = ['dream_opening', 'dream_market_robbery', 'dream_otto_shop', 'dream_gym_talk', 'ring', 'street']
FILM_BOX = (0, 50, 402, 570)  # between the film's top bar and the subtitle bar


def numbers(img, film):
    im = img.convert('RGB').crop(FILM_BOX if film else (0, 0, img.width, img.height))
    r, g, b = im.split()
    luma = Image.merge('RGB', (r, g, b)).convert('L')
    hist = luma.histogram(); n = sum(hist)
    st = ImageStat.Stat(luma)
    return {'mean': round(st.mean[0], 1), 'rms': round(st.stddev[0], 1),
            'clipped%': round(100 * sum(hist[250:]) / n, 2), 'crushed%': round(100 * sum(hist[:7]) / n, 2)}


report = {}
for q in ('high', 'low'):
    for c in CASES:
        film = c.startswith('dream')
        i, rows = 0, []
        while os.path.exists(os.path.join(bdir, f'{btag}-{q}-{c}-{i}.png')) and os.path.exists(os.path.join(adir, f'{atag}-{q}-{c}-{i}.png')):
            rows.append((Image.open(os.path.join(bdir, f'{btag}-{q}-{c}-{i}.png')), Image.open(os.path.join(adir, f'{atag}-{q}-{c}-{i}.png'))))
            i += 1
        if not rows:
            continue
        w, h = rows[0][0].size
        sheet = Image.new('RGB', (w * len(rows), h * 2 + 28), (16, 16, 18))
        d = ImageDraw.Draw(sheet)
        for k, (b, a) in enumerate(rows):
            sheet.paste(b.convert('RGB'), (k * w, 14)); sheet.paste(a.convert('RGB'), (k * w, h + 28))
            nb, na = numbers(b, film), numbers(a, film)
            report.setdefault(f'{c}-{q}', []).append({'frame': k, 'before': nb, 'after': na})
        d.text((4, 1), f'{c} · {q} · BEFORE (da5607b)', fill=(230, 230, 230)); d.text((4, h + 15), f'{c} · {q} · AFTER (render-look)', fill=(255, 210, 120))
        sheet.save(os.path.join(out, f'{c}-{q}.webp'), quality=82)
json.dump(report, open(os.path.join(out, 'picture-numbers.json'), 'w'), indent=1)
for k, v in report.items():
    mb = sum(x['before']['mean'] for x in v) / len(v); ma = sum(x['after']['mean'] for x in v) / len(v)
    cb = max(x['before']['clipped%'] for x in v); ca = max(x['after']['clipped%'] for x in v)
    kb = max(x['before']['crushed%'] for x in v); ka = max(x['after']['crushed%'] for x in v)
    rb = sum(x['before']['rms'] for x in v) / len(v); ra = sum(x['after']['rms'] for x in v) / len(v)
    print(f'{k:28s} mean {mb:6.1f} -> {ma:6.1f}  rms {rb:5.1f} -> {ra:5.1f}  clipped max {cb:5.2f} -> {ca:5.2f}%  crushed max {kb:5.2f} -> {ka:5.2f}%')
