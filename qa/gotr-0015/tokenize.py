"""GOTR-0015 one-off migration: replace hard-coded colours in the app CSS with --gr-* tokens.
Property- and selector-aware defaults plus an explicit override table. The output was reviewed
rule by rule (run with --report to list every replacement). Re-running on tokenised files is a no-op.
Usage: python3 qa/gotr-0015/tokenize.py [--report] [--dry]"""
import re,sys,colorsys,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
FILES=['game-shell.css','club-interface.css','ringside-layout.css','ringfighter-controls.css','workout-experience.css','career-interface.css']
HEX=re.compile(r'#[0-9a-fA-F]{3,8}\b')
def parse(h):
    h=h[1:].lower()
    if len(h) in(3,4):h=''.join(c*2 for c in h)
    r,g,b=[int(h[i:i+2],16)/255 for i in(0,2,4)];a=int(h[6:8],16)/255 if len(h)==8 else 1
    hue,l,s=colorsys.rgb_to_hls(r,g,b);return dict(a=a,h=hue*360,s=s*100,l=l*100)
SELECTED=re.compile(r'aria-pressed=true|aria-selected=true|aria-current|\.selected\b|\.is-current|data-active=true|\.bg-amber-500|\[open\]')
BUTTON=re.compile(r'button|\.workout-tool|\.career-secondary|\.career-player-choice|\.ringside-choose|\.ringside-control|\.ringside-done|\.stage-sound|#openPracticeControls|#prevBtn|#nextBtn|#combinationBtn|\.store-category|\.world-tab|\.challenge-day|\.game-wallet')
def gold(c):return 18<=c['h']<=66 and c['s']>=24
def kind(sel,last):
    return dict(selected=bool(SELECTED.search(last)),hover=':hover' in last,button=bool(BUTTON.search(last)),backdrop='::backdrop' in last)
def text(c,k,solid):
    if c['l']<=24:return 'var(--gr-accent-ink)'
    if 80<=c['h']<=170 and c['s']>=45:return 'var(--gr-success)'
    if (c['h']<=18 or c['h']>=340) and c['s']>=60:return 'var(--gr-danger)'
    if solid:return 'var(--gr-accent-ink)'
    if c['l']>=80 or (gold(c) and c['l']>=76) or (k['button'] and c['l']>=70):return 'var(--gr-text)'
    return 'var(--gr-text-muted)'
def fill(c,k):
    a,l=c['a'],c['l']
    if k['backdrop']:return 'var(--gr-scrim)'
    if a<1:
        if l>=95:return 'var(--gr-hairline)'
        if gold(c) and l>=45:return 'var(--gr-accent-soft)' if k['selected'] else 'var(--gr-hairline)'
        if l<=35:return 'var(--gr-scene-chip-strong)' if a>=.9 else 'var(--gr-scene-chip)'
        return 'var(--gr-hairline)'
    if gold(c) and l>=45 and c['s']>=38:return 'var(--gr-accent-hover)' if k['hover'] else 'var(--gr-accent)'
    if gold(c) and 12<=l<45:return 'var(--gr-accent-soft)' if k['selected'] else 'var(--gr-surface-3)'
    if l>=45:
        if 80<=c['h']<=170 and c['s']>=25:return 'var(--gr-success)'
        return 'var(--gr-text-muted)'
    if k['selected']:return 'var(--gr-accent-soft)'
    if k['hover']:return 'var(--gr-surface-4)' if k['button'] else 'var(--gr-surface-3)'
    if k['button']:return 'var(--gr-surface-3)'
    return 'var(--gr-bg)' if l<=8 else 'var(--gr-surface)' if l<=12.5 else 'var(--gr-surface-2)' if l<=18 else 'var(--gr-surface-3)'
def line(c,k,solid):
    if solid:return 'var(--gr-accent)'
    if 80<=c['h']<=170 and c['s']>=18 and c['l']>=40 and c['a']==1:return 'var(--gr-success-line)'
    if gold(c) and c['l']>=45:
        if k['selected']:return 'var(--gr-accent)'
        return 'var(--gr-border-strong)' if (k['hover'] and c['a']==1) else 'var(--gr-border)'
    if c['l']>=95:return 'var(--gr-border)'
    if k['selected']:return 'var(--gr-accent)'
    if k['hover']:return 'var(--gr-border-strong)'
    return 'var(--gr-border-strong)' if (c['l']>=36 and c['a']==1 and k['button']) else 'var(--gr-border)'
# Explicit decisions: (selector regex, property regex, replacement for the WHOLE value or None to keep default, per-colour token)
# value: full replacement of the declaration value.  tok: every colour in the value becomes this token.
O=[]
def o(sel,prop,value=None,tok=None):O.append((re.compile(sel),re.compile('^(?:'+prop+')$'),value,tok))
T=lambda n:'var(--gr-'+n+')'
# --- shadows and scrims
o(r'\.game-dialog button:not\(\.game-close\)','box-shadow','none')
o(r'\.club-studio$|\.ringside-layout \.club-studio','box-shadow',T('shadow-2'))
o(r'\.club-app dialog$|\.ringside-layout \.ringside-drawer$','box-shadow',T('shadow-3'))
o(r'\.game-wallet$','box-shadow','none')
o(r'\.academy-hero$','box-shadow','none')
o(r'\.academy-emblem$','box-shadow','none')
o(r'\.club-character\[aria-pressed=true\]','box-shadow','none')
o(r'\.club-contact:after','box-shadow','inset 0 0 45px '+T('hairline'))
o(r'\.club-status\[data-playing=true\]:before','box-shadow','0 0 8px '+T('success-soft'))
o(r'\.ringside-playback #playBtn$','box-shadow',T('shadow-2'))
o(r'footer\.club-transport','box-shadow',T('shadow-2'))
o(r'\.manual-move$','box-shadow',T('shadow-1'))
o(r'\.fight-health-track','background',T('scene-chip'))
o(r'\.fight-health-track','border',tok=T('scene-line'))
# --- brand, wallet (coins are the one place gold belongs in the header)
o(r'\.game-wallet$','background',T('surface-3'))
o(r'\.game-wallet$','color',T('text'))
o(r'\.game-wallet$','border-color',T('border-strong'))
o(r'\.game-wallet-coins','background',T('gold-soft'))
o(r'\.store-product small|\.venue-choice small|\.game-combo-balance|\.game-cup-champion','color',T('gold'))
o(r'\.fight-knockout','color',T('gold'))
o(r'\.fight-result-title','color',T('text'))
# --- primary fills keep a matching border
o(r'combo-buy:disabled','background',T('surface-3'))
o(r'combo-buy:disabled','color',T('text-faint'))
o(r'combo-buy:disabled','border-color',T('border'))
o(r'data-state=complete\] \.game-button\.academy-start','color',T('text'))
o(r'data-state=complete\] \.academy-lesson-number','background',T('success'))
# --- corner colours and semantic states
o(r'fight-health-player:first-child','background',T('corner-red')+'!important')
o(r'fight-health-player:last-child \.fight-health-fill','background',T('corner-blue')+'!important')
o(r'manual-rail\[data-side=rear\] \.manual-move','border-color',T('info-line'))
o(r'manual-rail\[data-side=rear\] \.manual-move','background',T('scene-chip'))
o(r'^\.manual-move$','border',tok=T('accent-line'))
o(r'^\.manual-move$','background',T('scene-chip'))
o(r'^\.manual-move$|data-meta=true','color',T('text'))
o(r'\.manual-move:hover','background',T('scene-chip-strong'))
o(r'data-meta=true','background',T('scene-chip'))
o(r'\.game-reward|\.iq-tip$','background',T('success-soft'))
o(r'\.iq-tip$|\.iq-feedback$','border',tok=T('border'))
o(r'iq-feedback\[data-correct=true\]','background',T('success-soft'))
o(r'iq-feedback\[data-correct=false\]','background',T('warning-soft'))
o(r'iq-feedback\[data-correct=false\]','border-color',T('warning-line'))
o(r'\.game-notice','color',T('warning'))
o(r'\.game-notice','border',tok=T('warning-line'))
o(r'fight-clock-urgent','color',T('warning')+'!important')
o(r'fight-clock-urgent','border-color',T('warning-line')+'!important')
o(r'fight-clock-urgent','background',T('scene-chip-strong')+'!important')
o(r'data-kind=countdown\]$','border',tok=T('warning-line'))
o(r'data-kind=countdown\]$','background',T('scene-chip-strong'))
o(r'data-kind=countdown\] strong','color',T('warning'))
o(r'\.career-error','color',T('danger'))
o(r'has-error \.club-loader','border-color',T('danger'))
o(r'data-scene=arena\] \.club-status:before','background',T('corner-red'))
o(r'\.club-status\[data-playing=true\]:before','background',T('success'))
o(r'\.club-status:before','background',T('text-faint'))
o(r'challenge-day\.complete','color',T('success'))
# --- gradients collapse to flat surfaces
o(r'\.game-world-hero$','background',T('surface-2'))
o(r'\.academy-hero$','background',T('surface-2'))
o(r'\.academy-hero$','border',tok=T('border'))
o(r'\.academy-lesson$','background',T('surface-2'))
o(r'\.game-cup-stage$','background',T('surface-2'))
o(r'\.game-cup-stage\.is-current','background',T('accent-soft'))
o(r'\.store-product$','background',T('surface-2'))
o(r'\.store-product\[aria-pressed=true\]$','background',T('accent-soft'))
o(r'\.club-character$','background',T('surface-2'))
o(r'\.club-character\[aria-pressed=true\]$','background',T('accent-soft'))
o(r'\.club-character\[aria-pressed=true\] strong','color',T('text'))
o(r'\.club-equipment\[aria-pressed=true\]$','color',T('text'))
o(r'\.club-sidebar$','background','none')
o(r'\.club-tip$','background',T('surface-2'))
o(r'\.club-fight-info$','background',T('surface-2'))
o(r'\.career-panel$','background',T('surface-2'))
o(r'\.club-loading$','background',T('surface'))
o(r'\.ringside-layout \.ringside-drawer$','background',T('surface'))
o(r'\.ringside-drawer \.practice-control-heading$','background',T('surface'))
o(r'\.bout-announcement$','background','linear-gradient(90deg,transparent,'+T('scene-chip-strong')+' 18%,'+T('scene-chip-strong')+' 82%,transparent)')
o(r'\.bout-announcement$','border-top|border-bottom',tok=T('scene-line'))
o(r'\.bout-announcement$','color',T('text'))
o(r'\.bout-announcement span','color',T('accent-text'))
o(r'data-kind=fight\] strong','color',T('text'))
o(r'data-scene=arena\] \.club-stage-heading','background',T('surface-2'))
o(r'\.club-app #stageContainer$','background','radial-gradient(ellipse at 35% 35%,'+T('stage-top')+','+T('stage-bottom')+')')
o(r'data-scene=arena\] #stageContainer','background',T('stage-bottom'))
o(r'\.practice-clear main','background','radial-gradient(ellipse at 50% 42%,'+T('stage-top')+','+T('stage-bottom')+' 74%)')
# --- dialogs and their chrome
o(r'^\.game-dialog$|^\.challenge-dialog$|^#practiceControls$|^\.training-dialog$|^\.club-app dialog$','background',T('surface'))
o(r'^\.game-dialog$|^\.challenge-dialog$|^#practiceControls$|^\.training-dialog$|^\.club-app dialog$|\.ringside-layout \.ringside-drawer$','border',tok=T('border'))
o(r'^\.game-close$','color',T('text'))
o(r'.','outline',tok=T('focus'))
o(r'focus-visible','outline',tok=T('focus'))
# --- segmented controls: inset container
o(r'^\.input-mode-switch$|^\.ringside-menu-tabs$|^\.club-camera-group$','background',T('bg'))
o(r'^\.input-mode-switch$|^\.ringside-menu-tabs$|^\.club-camera-group$','border',tok=T('border'))
o(r'\.input-mode-switch button|\.ringside-menu-tabs button|\.club-camera-group button$|^\.manual-pages button$','color',T('text-muted'))
o(r'club-camera-group button\[aria-pressed=true\]','background',T('surface-4'))
o(r'club-camera-group button\[aria-pressed=true\]','color',T('text'))
o(r'^\.manual-pages button$','background',T('scene-chip-strong'))
o(r'^\.manual-pages button$','border',tok=T('scene-line'))
# --- toolbar buttons
o(r'^\.ringside-choose$','background',T('surface-3'))
o(r'^\.ringside-choose$','border',tok=T('border'))
o(r'^\.ringside-choose$','color',T('text'))
o(r'^\.ringside-control$','background',T('surface-3'))
o(r'^\.ringside-control$','border',tok=T('border'))
o(r'^\.ringside-control$','color',T('text'))
o(r'ringside-control\[aria-pressed=true\]$','background',T('accent-soft'))
o(r'ringside-control\[aria-pressed=true\]$','color',T('text'))
o(r'^\.career-profile-button$','background',T('surface-3'))
o(r'^\.career-profile-button$','color',T('text'))
o(r'^\.career-profile-button$','border',tok=T('border'))
o(r'^\.ringside-toolbar$','background',T('surface'))
o(r'^\.ringside-toolbar$','border-bottom',tok=T('border'))
o(r'ringside-playback #playBtn$','background',T('scene-chip-strong'))
o(r'ringside-playback #playBtn$','border',tok=T('scene-line'))
o(r'ringside-playback #playBtn','color|background|border-left|border-right',tok=T('text'))
o(r'ringside-playback #playBtn$','color',T('text'))
# --- progress, pips, meters
o(r'academy-meter-bar$|\.academy-pips span$','background',T('bg'))
o(r'academy-meter strong','color',T('text'))
o(r'\.academy-tagline','color',T('text'))
o(r'academy-heading::after','background',T('border'))
o(r'summary::before','border',tok=T('border-strong'))
# --- overlays on the 3D scene
o(r'^\.fight-hud$|\.club-app \.fight-hud$','color',T('text'))
o(r'^\.fight-hud$|\.club-app \.fight-hud$','border',tok=T('scene-line'))
o(r'career-drill-cue$','border',tok=T('scene-line'))
o(r'career-drill-cue$|^\.manual-status$|^\.workout-next$','color',T('text'))
o(r'^\.stage-sound$','color',T('text'))
o(r'^\.game-combo-button$','background',T('scene-chip-strong'))
o(r'\.store-view-reset','background',T('scene-chip-strong'))
o(r'ringside-layout \.fight-results$','background',T('scene-chip-strong'))
o(r'ringside-layout \.fight-results$','border',tok=T('scene-line'))
o(r'\.fight-card strong','color',T('text'))
o(r'\.game-swatch','border',tok=T('scene-line'))
# --- text accents that carried the old gold
o(r'\.club-fight-mark','color',T('text'))
o(r'\.career-account a|\.game-world-edit summary','color',T('accent-text'))
o(r'\.training-bar \.training-speed|\.training-bar>\.fight-launch|\.training-bar \.training-timing|#speedBtn','color',T('text'))
o(r'\.training-bar>\.fight-launch','border-color',T('border'))
o(r'\.career-heading strong','color',T('text'))
o(r'\.equipment-icon','color',T('accent-text'))
o(r'\.ringside-full-controls input','accent-color',T('accent'))
o(r'\.club-brand #appSubtitle|\.club-keyboard|\.club-view-label|\.club-stance$','color',T('text-faint'))
# --- inputs
o(r'input$|select$|input,|select,','background',T('surface-2'))
o(r'input$|select$|input,|select,','border',tok=T('border-strong'))
o(r'input$|select$|input,|select,','color',T('text'))
# --- small refinements found in review
o(r'practice-techniques button$','background',T('surface-3'))
o(r'button\.bg-amber-500:before|aria-pressed=true\]:before','background',T('hairline'))
o(r'#comboCodes','color',T('text'))
o(r'iq-note\[open\]','border-color',T('border-strong'))
o(r'\.academy-eyebrow|\.club-eyebrow','color',T('accent-text'))
o(r'^:root$','.*',None)
# --- generic fallbacks
o(r'.','scrollbar-color',tok=T('border-strong'))
o(r'.','box-shadow|filter|text-shadow',tok=T('shadow-color'))
def decide(sel,last,prop,value,solid):
    for rs,rp,val,tok in O:
        if rs.search(last) and rp.match(prop):
            if tok is None and val is None:break
            return val if val is not None else HEX.sub(tok,value)
    k=kind(sel,last)
    def rep(m):
        c=parse(m.group(0))
        if prop in('color','fill','-webkit-text-fill-color','accent-color','caret-color'):return text(c,k,solid)
        if prop.startswith('background'):return fill(c,k)
        if prop.startswith('border') or prop.startswith('outline'):return line(c,k,solid)
        return 'var(--gr-shadow-color)'
    new=HEX.sub(rep,value)
    # A gradient whose stops all landed on the same token is a flat fill.
    m=re.fullmatch(r'(?:linear|radial)-gradient\((.*)\)',new)
    if m:
        toks=set(re.findall(r'var\(--gr-[a-z0-9-]+\)',new))
        if len(toks)==1 and not HEX.search(new) and 'transparent' not in new:new=toks.pop()
    return new
report=[];total=0
for f in FILES:
    css=(root/f).read_text()
    def rule(m):
        global total
        sel,body=m.group(1),m.group(2)
        if not HEX.search(body):return m.group(0)
        decls=body.split(';');out=[]
        for part in sel.split(','):pass
        last=re.sub(r'/\*.*?\*/','',sel,flags=re.S).strip()
        if last==':root':return m.group(0)
        # is this rule a solid accent fill (old gold background)? then its text is ink and its border matches.
        solid=False
        for d in decls:
            if ':' in d:
                p,v=d.split(':',1)
                if p.strip().startswith('background') and any(gold(parse(h)) and parse(h)['l']>=45 and parse(h)['s']>=38 and parse(h)['a']==1 for h in HEX.findall(v)):solid=True
        for d in decls:
            if ':' not in d or not HEX.search(d):out.append(d);continue
            p,v=d.split(':',1);imp='!important' if '!important' in v and False else ''
            # each comma-separated selector may differ; decide on the full selector text, overrides match any part
            new=None
            for part in [s.strip() for s in last.split(',')]:
                cand=decide(sel,part,p.strip(),v,solid)
                if new is None:new=cand
                elif cand!=new:
                    new=decide(sel,last,p.strip(),v,solid);break
            n=len(HEX.findall(v));total+=n
            report.append(f'{f[:12]:12} | {last[-70:]:70} | {p.strip()}: {v.strip()[:60]} -> {new.strip()[:90]}')
            out.append(p+':'+new)
        return sel+'{'+';'.join(out)+'}'
    new=re.sub(r'([^{}]+)\{([^{}]*)\}',rule,css)
    if '--dry' not in sys.argv:(root/f).write_text(new)
if '--report' in sys.argv:print('\n'.join(report))
print('replaced',total,'colour values in',len(report),'declarations')
