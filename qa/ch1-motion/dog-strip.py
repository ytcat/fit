# The dog walker before/after (ch1-motion): the film's own frame at 5.0 s with a 2x crop of her, and two QA close-ups.
# usage: python3 qa/ch1-motion/dog-strip.py RUNS_DIR OUT.webp
import sys
from PIL import Image, ImageDraw
runs, out = sys.argv[1:3]
row_h = 420
img = Image.new('RGB', (70 + 280 + 210 + 2 * 244, 22 + 2 * row_h), (24, 24, 24))
d = ImageDraw.Draw(img)
for row, tag in enumerate(['before', 'after']):
    y = 22 + row * row_h
    d.text((6, y + row_h // 2), tag, fill=(240, 240, 240))
    film = Image.open('%s/dogfilm-%s-5.00.png' % (runs, tag)).convert('RGB')
    img.paste(film.crop((0, 40, 402, 640)).resize((280, 418)), (70, y))
    img.paste(film.crop((170, 240, 275, 330)).resize((210, 180)), (350, y))       # her and the dog in the film frame, 2x
    for i, t in enumerate(['5.00', '5.30']):
        c = Image.open('%s/dog-%s-%s.png' % (runs, tag, t)).convert('RGB').crop((0, 80, 402, 560)).resize((244, 291))
        img.paste(c, (560 + i * 244, y))
d.text((74, 5), 'film frame 5.0 s', fill=(240, 240, 240)); d.text((354, 5), 'her in the film frame, 2x', fill=(240, 240, 240)); d.text((564, 5), 'QA close-up 5.0 s / 5.3 s', fill=(240, 240, 240))
img.save(out, 'WEBP', quality=82); print(out, img.size)
