# Bumps the ?v= cache keys of the given files wherever the page or a loader references them (index.html, adventure-ui.js
# MAP_SRC, oldtown/story loaders). usage: python3 qa/lang-audit/bump-v.py <stamp> file1 file2 ...
import re, sys, os
stamp, files = sys.argv[1], sys.argv[2:]
refs = ['index.html'] + [os.path.join(d, f) for d in ['.', 'adventure', 'adventure/story'] for f in os.listdir(d) if f.endswith('.js')]
for r in refs:
    s = open(r, encoding='utf8').read(); t = s
    for f in files:
        base = os.path.basename(f)
        # ./path/file.js?v=..., or "file.js?v=..." relative to the loader
        t = re.sub(r'((?:\./)?' + re.escape(f) + r'\?v=)[\w.-]+', lambda m: m.group(1) + stamp, t)
        if r != 'index.html': t = re.sub(r'([\'"`/])(' + re.escape(base) + r'\?v=)[\w.-]+', lambda m: m.group(1) + m.group(2) + stamp, t)
    if t != s: open(r, 'w', encoding='utf8').write(t); print('bumped in', r)
