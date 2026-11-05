"""Read-only baseline checks. All output goes outside application sources."""
import json, subprocess, time, sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
rows=[]
for test in sorted((root/'tests').glob('*.test.cjs')):
    started=time.perf_counter()
    with (out/(test.name+'.log')).open('w') as log:
        result=subprocess.run(['node',str(test.relative_to(root))],cwd=root,stdout=log,stderr=subprocess.STDOUT)
    row={'test':str(test.relative_to(root)),'exitCode':result.returncode,'seconds':time.perf_counter()-started,'log':test.name+'.log'}
    rows.append(row);(out/'results.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)
with (out/'syntax.log').open('w') as log:
    syntax=[]
    for f in sorted(root.rglob('*.js')):
        if 'node_modules' not in f.parts:syntax.append({'file':str(f.relative_to(root)),'exitCode':subprocess.run(['node','--check',str(f)],cwd=root,stdout=log,stderr=subprocess.STDOUT).returncode})
(out/'syntax.json').write_text(json.dumps(syntax,indent=2))
print(json.dumps({'tests':len(rows),'failures':sum(x['exitCode']!=0 for x in rows),'syntaxFailures':sum(x['exitCode']!=0 for x in syntax)}),flush=True)
