# GOTR-0097: draws the walk measurements of gait-data.cjs (before | after) as one picture.
#   python3 qa/gotr-0097/tools/gait-chart.py qa/gotr-0097/gait-before.json qa/gotr-0097/gait-after.json qa/gotr-0097/gait-chart.webp
import json, sys
from PIL import Image, ImageDraw
CONTACT = .012
def panel(d, title, W=760, H=520):
    im = Image.new('RGB', (W, H), (250, 249, 246)); g = ImageDraw.Draw(im); fr = d['frames']; n = len(fr); x0, x1 = 60, W - 20
    X = lambda i: x0 + (x1 - x0) * i / (n - 1)
    g.text((x0, 8), title, fill=(20, 20, 20))
    ps = [f['pelvis'] for f in fr]; lo, hi = min(ps), max(ps)
    g.text((x0, 26), 'stride %.2f m, %.2f steps/s at %.2f m/s | pelvis bob %.1f cm (min %.3f max %.3f m)' % (d['stride'], d['cadence'], d['speed'], (hi - lo) * 100, lo, hi), fill=(60, 60, 60))
    # 1) pelvis height (cm above its lowest), scale 0..8 cm
    top, bot = 60, 190; g.text((4, top), 'pelvis', fill=(40, 40, 140)); g.rectangle([x0, top, x1, bot], outline=(200, 200, 200))
    for cm in range(0, 9, 2): y = bot - (bot - top) * cm / 8; g.line([x0, y, x1, y], fill=(230, 230, 230)); g.text((x0 - 26, y - 6), '%dcm' % cm, fill=(120, 120, 120))
    g.line([(X(i), bot - (bot - top) * (p - lo) * 100 / 8) for i, p in enumerate(ps)], fill=(40, 40, 160), width=3)
    # 2) foot heights (lowest sole point), 0..30 cm, contact bars
    top2, bot2 = 215, 395; g.rectangle([x0, top2, x1, bot2], outline=(200, 200, 200)); g.text((4, top2), 'feet', fill=(20, 20, 20))
    for cm in range(0, 31, 10): y = bot2 - (bot2 - top2) * cm / 30; g.line([x0, y, x1, y], fill=(230, 230, 230)); g.text((x0 - 30, y - 6), '%dcm' % cm, fill=(120, 120, 120))
    for s, col in (('L', (200, 70, 50)), ('R', (40, 140, 90))): g.line([(X(i), bot2 - (bot2 - top2) * max(0, f[s]['low']) * 100 / 30) for i, f in enumerate(fr)], fill=col, width=3)
    bars = 412
    for k, (s, col) in enumerate((('L', (200, 70, 50)), ('R', (40, 140, 90)))):
        g.text((4, bars + k * 16), s + ' down', fill=col)
        for i, f in enumerate(fr):
            if f[s]['low'] < CONTACT: g.rectangle([X(i) - 3, bars + k * 16, X(i) + 3, bars + k * 16 + 10], fill=col)
    air = [i for i, f in enumerate(fr) if min(f['L']['low'], f['R']['low']) >= CONTACT]
    g.text((4, bars + 34), 'airborne', fill=(0, 0, 0))
    for i in air: g.rectangle([X(i) - 3, bars + 34, X(i) + 3, bars + 44], fill=(0, 0, 0))
    # stance sliding: travel of the heel and ball while the whole sole is down (foot flat)
    slide = 0
    for s in 'LR':
        held = None
        for f in fr:
            if f[s]['heel'][0] < CONTACT and f[s]['ball'][0] < CONTACT:
                if held: slide = max(slide, abs(f[s]['heel'][1] - held[0]), abs(f[s]['ball'][1] - held[1]))
                else: held = (f[s]['heel'][1], f[s]['ball'][1])
            else: held = None
    kn = [f['L']['knee'] for f in fr]
    g.text((x0, H - 46), 'airborne frames %d of %d | foot-flat sliding %.1f mm | left knee %d-%d deg' % (len(air), n, slide * 1000, min(kn), max(kn)), fill=(20, 20, 20))
    return im
a, b = [json.load(open(p)) for p in sys.argv[1:3]]
pa, pb = panel(a, 'BEFORE (v1.69): ' + a['species'] + ' ' + a['wear']), panel(b, 'AFTER (GOTR-0097): ' + b['species'] + ' ' + b['wear'])
out = Image.new('RGB', (pa.width + pb.width, pa.height), (255, 255, 255)); out.paste(pa, (0, 0)); out.paste(pb, (pa.width, 0)); out.save(sys.argv[3], quality=90)
print('wrote', sys.argv[3])
