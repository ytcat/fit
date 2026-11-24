"""Before/after frame-time table (markdown) from filmperf JSON files.
usage: python3 table.py <before.json[,extra.json]> <after.json> <title>"""
import json, sys
def load(paths):
    rows = {}
    for p in paths.split(','):
        try:
            for r in json.load(open(p))['rows']: rows[r['id']] = r
        except FileNotFoundError: pass
    return rows
B, A, title = load(sys.argv[1]), load(sys.argv[2]), sys.argv[3]
ids = [i for i in A] + [i for i in B if i not in A]
def cell(r, k):
    if not r: return '–'
    v = r.get(k); return '–' if v is None else (str(round(v)) if isinstance(v, float) else str(v))
print(f'### {title}\n')
print('Wall frame time between frames (SwiftShader software GPU, so absolute values are not a PC\'s): frames over 50 / 100 ms, longest, p95, median.  ')
print('JS = time spent inside the film\'s own frame (pose, camera, draw submission, first-use shader compiles and uploads): the part a real GPU does not hide.  ')
print('Load = from play() to the first film frame (black screen with the loading dots).\n')
print('| film | frames | wall >50 ms | wall >100 ms | wall max | wall p95 | JS >50 ms | JS >100 ms | JS max | JS p95 | load ms | quality at end |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|')
for i in ids:
    b, a = B.get(i), A.get(i)
    def pair(k): return f'{cell(b,k)} → {cell(a,k)}'
    q = lambda r: (r or {}).get('stats', {}) and (r.get('stats') or {}).get('quality', '–') or '–'
    print(f"| {i} | {pair('frames')} | {pair('over50')} | {pair('over100')} | {pair('max')} | {pair('p95')} | {pair('js_over50')} | {pair('js_over100')} | {pair('js_max')} | {pair('js_p95')} | {pair('load_ms')} | {q(b)} → {q(a)} |")
print()
print('Long JS frames (> 50 ms) with what was new in them (programs = shader programs compiled, tex = textures uploaded):\n')
for name, R in (('before', B), ('after', A)):
    for i in ids:
        r = R.get(i)
        if not r: continue
        L = [f"t={x['t']}s {x['js']} ms (+{x['newPrograms']} programs, +{x['newTex']} tex)" for x in r.get('long', [])]
        if L: print(f'- {name} {i}: ' + '; '.join(L[:8]))
