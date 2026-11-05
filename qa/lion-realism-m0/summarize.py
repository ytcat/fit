"""Summarize saved raw measurements and arrange actual render contact sheets (Pillow)."""
import json, statistics, sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
out=Path(sys.argv[1]);dest=Path(__file__).resolve().parent
rows=[]
for f in sorted((out/'profiles').glob('*.json')):
 d=json.loads(f.read_text());s=d['sample']['summary'];inv=d['inventory']['scene']['summary'];components={}
 for name in {k for r in d['sample']['samples'] for k in r['components']}:
  values=[r['components'].get(name,{}).get('ms',0) for r in d['sample']['samples']];components[name]={'medianMs':statistics.median(values),'maxMs':max(values)}
 rows.append({'profile':d['profile'],'scenario':d['scenario'],'config':d['config'],'summary':s,'scene':inv,'components':components,'startup':d['setup']['startup'],'errors':d['errors']})
(dest/'measurements.json').write_text(json.dumps(rows,indent=2)+'\n')
lines=['|Viewport / scenario|RAF median / p95 ms|Update median / p95 ms|Render submission median / p95 ms|Calls / triangles median|Buffer upload bytes/frame median|','|---|---:|---:|---:|---:|---:|']
for r in rows:
 s=r['summary'];pair=lambda k:f"{s[k]['median']:.2f} / {s[k]['p95']:.2f}"
 lines.append(f"|{r['profile']} / {r['scenario']}|{pair('rafIntervalMs')}|{pair('updateInclusiveMs')}|{pair('renderCpuSubmissionMs')}|{s['calls']['median']:,} / {s['triangles']['median']:,}|{s['bufferUploadBytes']['median']:,}|")
(dest/'measurements.md').write_text('\n'.join(lines)+'\n')
manifest=out/'render-manifest.json'
if manifest.exists():
 images=json.loads(manifest.read_text())['images']
 def sheet(name,selected,cols=4):
  w,h=260,345;canvas=Image.new('RGB',(cols*w,((len(selected)+cols-1)//cols)*h),'#21252c');draw=ImageDraw.Draw(canvas)
  for i,r in enumerate(selected):
   im=Image.open(out/r['file']).convert('RGB');im=ImageOps.contain(im,(w,h-35));x=(i%cols)*w;y=(i//cols)*h;canvas.paste(im,(x+(w-im.width)//2,y));label=r['id'].replace('textured-neutral-','').replace('clay-neutral-','clay ')
   draw.text((x+5,y+h-32),label[:42],fill='white')
  canvas.save(dest/(name+'.jpg'),quality=90)
 sheet('face-eight-views',[r for r in images if r['id'].startswith('textured-neutral-face-')])
 sheet('clay-eight-views',[r for r in images if r['id'].startswith('clay-neutral-face-')])
 sheet('body-eight-views',[r for r in images if r['id'].startswith('textured-production-body-')])
 sheet('underarms',[r for r in images if 'axilla' in r['id']])
 sheet('expressions',[r for r in images if 'textured-neutral-expression' in r['id']])
 sheet('punches',[r for r in images if 'motion' in r['id'] and 'three-quarter' in r['id'] and r['style']=='clay'])
 print('Images:',len(images),'contact sheets generated')
print('Measurements:',len(rows))
