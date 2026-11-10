"""Print a compact summary of results-<tag>.json and convert the PNG screenshots to small WebP files.
Usage: python3 qa/gotr-0021/summary.py [tag] [--webp]"""
import glob, json, os, sys

here = os.path.dirname(os.path.abspath(__file__))
tag = next((a for a in sys.argv[1:] if not a.startswith('--')), 'after')
data = json.load(open(os.path.join(here, 'results-%s.json' % tag)))
print('page errors:', data['errors'])
for row in data['results']:
    if 'reducedMotion' in row:
        print(row['viewport'], 'reduced motion', row['reducedMotion'])
        continue
    print(row['viewport'], row['lang'], row.get('dir'), row.get('labels'), 'introBannerOverlapsHud=%s' % row.get('introBannerOverlapsHud'), row.get('realFight', ''), row.get('low', ''))
    for s in row['states']:
        print('  ', s['state'], s['phase'], {k: round(v, 1) for k, v in s['reported'].items()}, 'shown', s['shown'], 'bars%', s['bars'], 'hud', repr(s['hud']), 'plate', s['health'], 'chipBottom', s['chipBottom'], 'tabsTop', s['tabsTop'], 'moves', s['movesChecked'], 'banner', s['bannerShown'], s.get('resultBannerOverlapsHud', ''))
if '--webp' in sys.argv:
    from PIL import Image
    for png in sorted(glob.glob(os.path.join(here, '*.png'))):
        if os.path.basename(png).startswith('_'):
            continue
        im = Image.open(png).convert('RGB')
        if im.width > 900:
            im = im.resize((im.width * 3 // 4, im.height * 3 // 4), Image.LANCZOS)
        webp = png[:-4] + '.webp'
        im.save(webp, quality=72, method=6)
        os.remove(png)
        print(os.path.basename(webp), os.path.getsize(webp))
