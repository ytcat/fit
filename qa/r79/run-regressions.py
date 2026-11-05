"""Run independent Node suites in separate processes; all evidence stays in OUT.
Usage: python qa/r79/run-regressions.py OUT [--resume] [--jobs 2]
Resume only when completed suites used the same frozen application sources.
"""
import argparse,concurrent.futures,hashlib,json,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('out',type=Path);p.add_argument('--resume',action='store_true');p.add_argument('--jobs',type=int,default=2);args=p.parse_args()
root=Path(__file__).resolve().parents[2];out=args.out.resolve();out.mkdir(parents=True,exist_ok=True)
files=list(root.glob('*.js'))+list(root.glob('*.html'))+list((root/'assets/models').glob('*.json'))+list((root/'assets/audio').glob('*'))
source={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files) if f.is_file()}
manifest=out/'source-hashes.json'
if manifest.exists() and json.loads(manifest.read_text())!=source:raise SystemExit('Sources changed: use a fresh output directory.')
manifest.write_text(json.dumps(source,indent=2)+'\n')
rows=json.loads((out/'results.json').read_text()) if args.resume and (out/'results.json').exists() else []
completed={r['test'] for r in rows if r['exitCode']==0};rows=[r for r in rows if r['test'] in completed]
def run(test):
 started=time.perf_counter()
 with (out/(test.name+'.log')).open('w') as log:r=subprocess.run(['node',str(test.relative_to(root))],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 return {'test':str(test.relative_to(root)),'exitCode':r.returncode,'seconds':time.perf_counter()-started,'log':test.name+'.log'}
with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,args.jobs)) as pool:
 pending=[pool.submit(run,t) for t in sorted((root/'tests').glob('*.test.cjs')) if str(t.relative_to(root)) not in completed]
 for task in concurrent.futures.as_completed(pending):
  row=task.result();rows.append(row);(out/'results.json').write_text(json.dumps(sorted(rows,key=lambda r:r['test']),indent=2)+'\n');print(json.dumps(row),flush=True)
syntax=[]
with (out/'syntax.log').open('w') as log:
 for f in sorted(root.rglob('*')):
  if f.suffix in ['.js','.cjs'] and 'node_modules' not in f.parts:syntax.append({'file':str(f.relative_to(root)),'exitCode':subprocess.run(['node','--check',str(f)],cwd=root,stdout=log,stderr=subprocess.STDOUT).returncode})
(out/'syntax.json').write_text(json.dumps(syntax,indent=2)+'\n')
summary={'tests':len(rows),'failures':sum(r['exitCode']!=0 for r in rows),'syntaxFiles':len(syntax),'syntaxFailures':sum(r['exitCode']!=0 for r in syntax)}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary),flush=True);raise SystemExit(bool(summary['failures'] or summary['syntaxFailures']))
