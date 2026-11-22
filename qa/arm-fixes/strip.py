"""Compose frame strips: python3 qa/arm-fixes/strip.py out.webp scale "label|glob-or-files,..." ...
Each row argument is "label|file1,file2,..." (files in order); rows are stacked, a label is drawn on the first frame of each row,
and each frame gets its file's last '-' field (the time) in the corner."""
import sys, os
from PIL import Image, ImageDraw

out, scale = sys.argv[1], float(sys.argv[2])
rows = []
for arg in sys.argv[3:]:
    label, files = arg.split('|', 1)
    if '{t}' in files: rows.append((label, [files.replace('{t}', t) for t in os.environ['TIMES'].split(',')])); continue
    rows.append((label, [f for f in files.split(',') if f]))
ims = [[Image.open(f).convert('RGB') for f in fs] for _, fs in rows]
w, h = ims[0][0].size
cw, ch = int(w * scale), int(h * scale)
cols = max(len(r) for r in ims)
sheet = Image.new('RGB', (cw * cols, ch * len(ims)), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for r, (row, (label, files)) in enumerate(zip(ims, rows)):
    for c, (im, f) in enumerate(zip(row, files)):
        sheet.paste(im.resize((cw, ch), Image.LANCZOS), (c * cw, r * ch))
        tag = os.path.splitext(os.path.basename(f))[0].split('-')[-1]
        d.rectangle([c * cw, r * ch + ch - 18, c * cw + 60, r * ch + ch], fill=(0, 0, 0))
        d.text((c * cw + 4, r * ch + ch - 15), tag, fill=(255, 255, 0))
    d.rectangle([0, r * ch, 8 + 7 * len(label), r * ch + 16], fill=(0, 0, 0))
    d.text((4, r * ch + 2), label, fill=(255, 255, 255))
sheet.save(out, quality=82)
print(out, sheet.size)
