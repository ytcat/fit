# Before/after strips for ch1-motion: two rows (before, after) of film frames from measure.cjs runs, labelled, as webp.
# usage: python3 qa/ch1-motion/strip.py OUT.webp "before-prefix" "after-prefix" t1,t2,... [crop_top,crop_bottom] [scale]
#   each frame is <prefix>-<t>.png (t with two decimals); a missing frame is left grey.
import sys
from PIL import Image, ImageDraw
out, pa, pb, ts = sys.argv[1:5]
crop = [int(v) for v in (sys.argv[5] if len(sys.argv) > 5 else '40,620').split(',')]
scale = float(sys.argv[6]) if len(sys.argv) > 6 else .5
ts = [t for t in ts.split(',') if t]
W, H = 402, crop[1] - crop[0]
w, h = int(W * scale), int(H * scale)
img = Image.new('RGB', (w * len(ts) + 70, h * 2 + 22), (24, 24, 24))
d = ImageDraw.Draw(img)
for row, (label, pre) in enumerate([('before', pa), ('after', pb)]):
    d.text((6, 22 + row * h + h // 2), label, fill=(240, 240, 240))
    for i, t in enumerate(ts):
        tt = t.split('/')[row] if '/' in t else t
        try:
            f = Image.open('%s-%.2f.png' % (pre, float(tt))).convert('RGB').crop((0, crop[0], W, crop[1])).resize((w, h))
            img.paste(f, (70 + i * w, 22 + row * h))
        except FileNotFoundError:
            pass
        if row == 0: d.text((70 + i * w + 4, 5), 't %s s' % t, fill=(240, 240, 240))
img.save(out, 'WEBP', quality=80)
print(out, img.size)
