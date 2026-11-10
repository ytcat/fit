"""WCAG contrast of the token pairs the UI relies on. Usage: python3 qa/gotr-0015/contrast.py
Reads design-tokens.css (palette A) and qa/gotr-0015/palettes.cjs (B, C)."""
import re,sys,json,subprocess,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
def tokens(text):
    return {k:v.strip() for k,v in re.findall(r'(--gr-[a-z0-9-]+)\s*:\s*([^;}]+)',text)}
base=tokens((root/'design-tokens.css').read_text().split('[dir=rtl]')[0])
palettes=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require(process.argv[1])))',str(root/'qa/gotr-0015/palettes.cjs')]))
def resolve(name,t,depth=0):
    v=t[name]
    for _ in range(6):
        m=re.search(r'var\((--gr-[a-z0-9-]+)\)',v)
        if not m:break
        v=v.replace(m.group(0),t[m.group(1)])
    return v
def rgba(v):
    v=v.strip()
    if v.startswith('#'):
        h=v[1:]
        if len(h) in(3,4):h=''.join(c*2 for c in h)
        return [int(h[i:i+2],16) for i in(0,2,4)]+[int(h[6:8],16)/255 if len(h)==8 else 1]
    m=re.match(r'rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:/\s*([\d.]+))?\)',v)
    return [int(m.group(1)),int(m.group(2)),int(m.group(3)),float(m.group(4) or 1)]
def over(fg,bg):
    a=fg[3];return [fg[i]*a+bg[i]*(1-a) for i in range(3)]+[1]
def lum(c):
    f=lambda x:(x/255)/12.92 if x/255<=.03928 else ((x/255+.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def ratio(a,b):
    la,lb=lum(a),lum(b);return (max(la,lb)+.05)/(min(la,lb)+.05)
# (text token, background token or list of layered backgrounds, minimum ratio, note)
PAIRS=[
 ('--gr-text',['--gr-bg'],4.5,'body text on app background'),
 ('--gr-text',['--gr-surface'],4.5,'text on dialogs/toolbars'),
 ('--gr-text',['--gr-surface-2'],4.5,'text on cards'),
 ('--gr-text',['--gr-surface-3'],4.5,'secondary button label'),
 ('--gr-text',['--gr-surface-4'],4.5,'secondary button label, hover'),
 ('--gr-text-muted',['--gr-surface'],4.5,'muted text on dialogs'),
 ('--gr-text-muted',['--gr-surface-2'],4.5,'muted text on cards'),
 ('--gr-text-muted',['--gr-surface-3'],4.5,'muted text on raised controls'),
 ('--gr-text-faint',['--gr-surface'],3.0,'faint captions / disabled (non-essential)'),
 ('--gr-accent-ink',['--gr-accent'],4.5,'primary button label'),
 ('--gr-accent-ink',['--gr-accent-hover'],4.5,'primary button label, hover'),
 ('--gr-accent-ink',['--gr-accent-press'],4.5,'primary button label, pressed'),
 ('--gr-accent-text',['--gr-surface'],4.5,'accent-coloured text on dialogs'),
 ('--gr-accent-text',['--gr-surface-2'],4.5,'accent-coloured text on cards'),
 ('--gr-text',['--gr-surface-2','--gr-accent-soft'],4.5,'text on a selected card'),
 ('--gr-accent-text',['--gr-surface-2','--gr-accent-soft'],4.5,'accent text on a selected card'),
 ('--gr-info-text',['--gr-surface'],4.5,'info text'),
 ('--gr-gold',['--gr-surface'],4.5,'price / coins on dialogs'),
 ('--gr-gold',['--gr-surface-2'],4.5,'price on cards'),
 ('--gr-gold',['--gr-surface-3'],4.5,'coins on a secondary button'),
 ('--gr-gold-ink',['--gr-gold'],4.5,'label on a gold badge'),
 ('--gr-success',['--gr-surface'],4.5,'success text'),
 ('--gr-warning',['--gr-surface'],4.5,'warning text'),
 ('--gr-danger',['--gr-surface'],4.5,'error text'),
 ('--gr-text',['--gr-stage-top','--gr-scene-chip'],4.5,'move button label over a light part of the scene'),
 ('--gr-focus',['--gr-surface'],3.0,'focus ring against dialogs'),
 ('--gr-focus',['--gr-bg'],3.0,'focus ring against the app background'),
 ('--gr-border-strong',['--gr-surface'],1.5,'input outline (decorative boundary)'),
 ('--gr-accent',['--gr-surface'],3.0,'selected outline / indicator'),
]
bad=0
for name,over_ in [('A',{}),('B',palettes['B']),('C',palettes['C'])]:
    t=dict(base);t.update(over_);print(f'== palette {name}')
    for fg,bgs,need,note in PAIRS:
        bg=rgba(resolve(bgs[0],t))
        for extra in bgs[1:]:bg=over(rgba(resolve(extra,t)),bg)
        f=over(rgba(resolve(fg,t)),bg);r=ratio(f,bg);ok=r>=need;bad+=not ok
        print(f"  {'ok  ' if ok else 'FAIL'} {r:5.2f} (>= {need}) {fg} on {'+'.join(bgs)} - {note}")
print('CONTRAST FAILURES',bad);sys.exit(1 if bad else 0)
