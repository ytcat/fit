# Compose the mitt-cross and fight-cross frames into before/after webp strips and print how much each frame
# changed from the previous one (a strip that does not move is caught). Usage: python3 -I qa/gotr-0032/cross-compose.py
import os, json
from PIL import Image, ImageChops, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
res = json.load(open(os.path.join(here, 'cross-strips.json')))['results']
for case in ['mitt', 'fight']:
    rows = []
    for version in ['before', 'after']:
        shots = [r for r in res if r.get('case') == case and r['version'] == version and 'file' in r]
        tiles, last = [], None
        for r in shots:
            im = Image.open(os.path.join(frames, r['file'])).convert('RGB')
            if last is not None:
                d = ImageChops.difference(im.convert('L'), last.convert('L'))
                print(case, version, r['offset'], 'changed px', sum(1 for v in d.get_flattened_data() if v > 24) if hasattr(d, 'get_flattened_data') else sum(1 for v in d.getdata() if v > 24))
            last = im
            w, h = im.size
            t = im.crop((int(w * .05), int(h * .12), int(w * .95), int(h * .66))).resize((int(w * .90 * .5), int(h * .54 * .5)))
            ImageDraw.Draw(t).text((5, 5), f"{version} {r['offset']:+d}", fill=(255, 255, 255))
            tiles.append(t)
        row = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height))
        x = 0
        for t in tiles:
            row.paste(t, (x, 0)); x += t.width
        rows.append(row)
    sheet = Image.new('RGB', (rows[0].width, rows[0].height * 2))
    sheet.paste(rows[0], (0, 0)); sheet.paste(rows[1], (0, rows[0].height))
    sheet.save(os.path.join(here, f'{case}-cross-before-after.webp'), quality=78)
    print(case, sheet.size)
