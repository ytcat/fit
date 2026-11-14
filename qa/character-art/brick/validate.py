"""Dependency-free delivery audit; reads the actual exported GLB, not its manifest."""
import json, struct, pathlib, hashlib
root=pathlib.Path(__file__).resolve().parents[3]
asset=root/'assets/characters/brick/brick-head.glb'
b=asset.read_bytes();magic,version,length=struct.unpack_from('<III',b)
assert magic==0x46546C67 and version==2 and length==len(b)
n,kind=struct.unpack_from('<II',b,12);assert kind==0x4E4F534A
g=json.loads(b[20:20+n]);bin_start=28+n
tri=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
names={n['name']:i for i,n in enumerate(g['nodes']) if 'name' in n}
expected=['Brick_Head','Brick_Jaw','Brick_Brow_L','Brick_Brow_R','Brick_Jowl_L','Brick_Jowl_R','Brick_Dewlap','Brick_Ear_L','Brick_Ear_R','Brick_Lid_U_L','Brick_Lid_U_R']
assert all(n in names for n in expected)
joints=set(j for skin in g['skins'] for j in skin['joints'])
assert joints=={names[n] for n in expected}, 'Skeleton must contain exactly the eleven contract bones'
assert all('targets' not in p for m in g['meshes'] for p in m['primitives'])
assert all(name in names for name in ['Brick_Eye_L','Brick_Eye_R'])
assert all(names[n] in g['nodes'][names['Brick_Head']]['children'] for n in expected[1:])
assert all(all(s>0 for s in n.get('scale',[1,1,1])) for n in g['nodes'])
assert not g.get('extensionsRequired')
assert not any('uri' in i for i in g.get('images',[]))
assert tri<=40000 and len(b)<=6000000 and len(g['materials'])<=5
images=[]
for im in g['images']:
    bv=g['bufferViews'][im['bufferView']];off=bin_start+bv.get('byteOffset',0)
    assert b[off:off+8]==b'\x89PNG\r\n\x1a\n'
    w,h=struct.unpack_from('>II',b,off+16);assert max(w,h)<=1024
    images.append({'name':im['name'],'width':w,'height':h,'bytes':bv['byteLength']})
report={'passed':True,'glbSha256':hashlib.sha256(b).hexdigest(),'triangles':tri,'bytes':len(b),'materials':len(g['materials']),'bones':expected,'images':images,'requiredExtensions':g.get('extensionsRequired',[]),'selfContained':True,'positiveScale':True,'referenceParityClaim':False}
(pathlib.Path(__file__).parent/'static-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
