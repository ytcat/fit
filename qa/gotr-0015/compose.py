"""Builds the small evidence sheets in qa/gotr-0015/ from raw screenshots made by shots.cjs.
Usage: python3 qa/gotr-0015/compose.py RAW_DIR
  compare-<view>-<screen>.webp   before | after (EN)
  spot-<lang>-phone.webp         after, Hebrew (RTL) and Russian
  palettes-<view>-<screen>.webp  A crimson | B electric blue | C volt on graphite (token values only)"""
import sys,pathlib
from PIL import Image,ImageDraw
raw=pathlib.Path(sys.argv[1]);out=pathlib.Path(__file__).resolve().parent
MAIN=['train','fight','fightcombos','shop','shopcombo','academy','world','lab','menu','menumoves','profile','venues','cup','results','scorecards','routine','timing','practice']
def load(name):
    p=raw/(name+'.webp');return Image.open(p).convert('RGB') if p.exists() else None
def sheet(images,labels,dest,scale=1.0,gap=8,quality=58):
    images=[i for i in images if i is not None]
    if not images:return False
    if scale!=1:images=[i.resize((round(i.width*scale),round(i.height*scale)),Image.LANCZOS) for i in images]
    bar=18;w=sum(i.width for i in images)+gap*(len(images)-1);h=max(i.height for i in images)+bar
    s=Image.new('RGB',(w,h),(9,12,17));d=ImageDraw.Draw(s);x=0
    for im,label in zip(images,labels):
        d.text((x+6,3),label,fill=(244,246,250));s.paste(im,(x,bar));x+=im.width+gap
    s.save(dest,quality=quality,method=6);return True
made=0
for view,scale in(('phone',1),('desk',.5)):
    for screen in MAIN:
        b,a=load(f'before-{view}-{screen}-en'),load(f'after-{view}-{screen}-en')
        if b is None or a is None:continue
        made+=sheet([b,a],['BEFORE','AFTER'],out/f'compare-{view}-{screen}.webp',scale)
    for screen in('fight','shop','academy'):
        ims=[load(f'after-palette{p}-{view}-{screen}-en') for p in 'ABC']
        if all(i is not None for i in ims):made+=sheet(ims,['A  crimson (default)','B  electric blue','C  volt on graphite'],out/f'palettes-{view}-{screen}.webp',scale,quality=62)
for lang in('he','ru'):
    ims=[load(f'after-phone-{s}-{lang}') for s in('fight','shop','academy','menu')]
    if all(i is not None for i in ims):made+=sheet(ims,[lang.upper()+' fight',lang.upper()+' shop',lang.upper()+' academy',lang.upper()+' training menu'],out/f'spot-{lang}-phone.webp')
print('wrote',made,'sheets to',out)
