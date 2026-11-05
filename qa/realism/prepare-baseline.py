"""Copy verified, frozen app captures; never manufacture new art evidence."""
import hashlib,json,pathlib,shutil,sys
root=pathlib.Path(__file__).resolve().parents[2]
evidence=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/lion-realism-evidence/280775e')
manifest=json.loads((evidence/'render-manifest.json').read_text()); rows={r['id']:r for r in manifest['images']}
slots=[('Front face',['textured-neutral-face-front']),('Three-quarter bust',['textured-neutral-face-left-45']),('Profile',['textured-neutral-face-left']),('Full body front',['textured-neutral-body-front']),('Rear',['textured-neutral-body-rear']),('Jab extension',['textured-neutral-motion-jab-0.5-three-quarter']),('Hook rotated shoulder',['textured-neutral-motion-hook-0.47-three-quarter']),('Uppercut load / nominal strike',['textured-neutral-motion-uppercut-0.22-three-quarter','textured-neutral-motion-uppercut-0.47-three-quarter'])]
result={'sourceSHA':manifest['sourceSHA'],'environment':manifest['setup']['environment'],'approvedReference':None,'candidate':None,'note':'Eight slots / nine actual app captures. Uppercut nominal strike phase is not a registered collision. No score assigned.','slots':[]}
for title,ids in slots:
    images=[]
    for id in ids:
        row=rows[id]; data=(evidence/row['file']).read_bytes(); assert hashlib.sha256(data).hexdigest()==row['sha256']
        filename=pathlib.Path(row['file']).name;(root/'qa/realism/baseline'/filename).write_bytes(data)
        images.append({**row,'file':'baseline/'+filename})
    result['slots'].append({'title':title,'images':images})
(root/'qa/realism/baseline-manifest.json').write_text(json.dumps(result,indent=2)+'\n')
print('Verified and copied',sum(len(s['images']) for s in result['slots']),'app renders; reference/candidate intentionally absent.')
