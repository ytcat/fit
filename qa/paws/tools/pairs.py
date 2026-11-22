"""pairs.py <before dir> <after dir> <out dir>: before/after .webp for the paws review (GOTR-0100).
Close-up sheets (<id>.png from closeup.cjs) become <id>-before-after.webp stacked (before on top); film and fight frames with the
same file name become side-by-side pairs (before left), labelled."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
b, a, out = map(Path, sys.argv[1:4]); out.mkdir(parents=True, exist_ok=True)
def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle((0, im.height - 22, 12 + 7 * len(text), im.height), fill='#101418'); d.text((6, im.height - 18), text, fill='#ffffff'); return im
for f in sorted((a / 'close').glob('*.png')):
    fb = b / 'close' / f.name
    ia = label(Image.open(f).convert('RGB'), 'AFTER (paws.js)')
    if fb.exists():
        ib = label(Image.open(fb).convert('RGB'), 'BEFORE (v1.84)'); s = Image.new('RGB', (ia.width, ib.height + ia.height + 8), '#101418'); s.paste(ib, (0, 0)); s.paste(ia, (0, ib.height + 8))
    else: s = ia
    s.save(out / (f.stem + '-before-after.webp'), quality=82); print(out / (f.stem + '-before-after.webp'), s.size)
for sub in ('film', 'fight'):
    for f in sorted((a / sub).glob('*.png')):
        fb = b / sub / f.name; ia = label(Image.open(f).convert('RGB'), 'AFTER')
        if not fb.exists(): ia.save(out / (f.stem + '.webp'), quality=84); continue
        ib = label(Image.open(fb).convert('RGB'), 'BEFORE'); s = Image.new('RGB', (ib.width + ia.width + 6, max(ib.height, ia.height)), '#101418'); s.paste(ib, (0, 0)); s.paste(ia, (ib.width + 6, 0))
        s.save(out / (f.stem + '-before-after.webp'), quality=84); print(out / (f.stem + '-before-after.webp'), s.size)
