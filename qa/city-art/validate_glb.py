"""Dependency-free structural/finite-data validation of the authored city GLBs."""
import json,struct,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
formats={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}
results=[]
for name in ['ch01-bus/gloryland-bus.glb','ch01-station/gloryland-station.glb','ch01-oldtown/gloryland-oldtown.glb','ch01-car/compact-car.glb','ch01-trees/street-tree.glb','ch01-trees/street-tree-low.glb']:
    path=ROOT/'assets/street'/name;b=path.read_bytes()
    magic,version,total=struct.unpack_from('<III',b)
    assert magic==0x46546c67 and version==2 and total==len(b),name
    n,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a
    d=json.loads(b[20:20+n]);length,kind=struct.unpack_from('<II',b,20+n);assert kind==0x004e4942
    binary=b[28+n:28+n+length]
    assert not d.get('extensionsRequired'),name+' requires external extension'
    assert all('uri' not in x for x in d.get('images',[])),name+' has an external image'
    assert all('uri' not in x for x in d['buffers']),name+' has an external buffer'
    def read(index):
        a=d['accessors'][index];v=d['bufferViews'][a['bufferView']];fmt='<'+formats[a['componentType']]*sizes[a['type']]
        size=struct.calcsize(fmt);stride=v.get('byteStride',size);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        assert offset+(a['count']-1)*stride+size<=len(binary)
        return [struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])]
    triangles=0
    for m in d['meshes']:
        for p in m['primitives']:
            assert p.get('mode',4)==4
            positions=read(p['attributes']['POSITION']);indices=read(p['indices'])
            assert all(all(math.isfinite(v) for v in row) for row in positions)
            assert all(0<=v[0]<len(positions) for v in indices)
            triangles+=len(indices)//3
    for a in d.get('animations',[]):
        for s in a['samplers']:
            times=[v[0] for v in read(s['input'])];assert all(x<y for x,y in zip(times,times[1:])),a['name']
            assert all(all(math.isfinite(x) for x in v) for v in read(s['output']))
    results.append({'asset':name,'status':'PASS','bytes':len(b),'triangles':triangles,'extensionsUsed':d.get('extensionsUsed',[]),'requiredExtensions':[],'animations':[a['name'] for a in d.get('animations',[])]})
(ROOT/'qa/city-art/glb-validation.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
