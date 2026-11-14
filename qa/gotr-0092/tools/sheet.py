"""Contact sheet: sheet.py <framesDir> <out.webp> <cols> name1 name2 ... ('-' = empty cell). Row labels are the first word of each row."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
d, out, cols, names = Path(sys.argv[1]), sys.argv[2], int(sys.argv[3]), sys.argv[4:]
ims = [Image.open(d / f'{n}.png').convert('RGB') if n != '-' else None for n in names]
w, h = next(i for i in ims if i).size; g = 6; rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (cols * (w + g) - g, rows * (h + g) - g), '#101418'); dr = ImageDraw.Draw(s)
for k, i in enumerate(ims):
    x, y = (k % cols) * (w + g), (k // cols) * (h + g)
    if i: s.paste(i, (x, y)); dr.text((x + 6, y + 4), names[k], fill='#ffffff')
s.save(out, quality=86); print(out, s.size)
