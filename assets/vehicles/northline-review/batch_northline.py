import bpy, sys, json
from collections import Counter
from mathutils import Vector
from pathlib import Path
source, output = map(Path,sys.argv[sys.argv.index("--")+1:])
def read_asset(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.context.scene.objects if obj.type=="MESH"]
def signature(meshes):
    tris=Counter()
    for obj in meshes:
        m=obj.data; m.calc_loop_triangles()
        for t in m.loop_triangles:
            mat=m.materials[t.material_index].name
            assert m.materials[t.material_index]
            p=tuple(sorted(tuple(round(x,4) for x in obj.matrix_world@ m.vertices[i].co) for i in t.vertices))
            tris[(mat,p)]+=1
    return tris
meshes=read_asset(source)
expected=signature(meshes)
assert len(meshes)==153 and sum(expected.values())==21318
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    assert o.parent is None and len(o.data.materials)==1
    o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.join()
obj=bpy.context.object
obj.name="Northline_5_Static_Mobile"
assert len(obj.data.materials)==11
assert signature([obj])==expected
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_materials="EXPORT",export_animations=False,export_apply=False,export_cameras=False,export_lights=False)
actual=signature(read_asset(output))
print(json.dumps({'source_triangles':sum(expected.values()),'batched_triangles':sum(actual.values()),'triangle_signature_added':sum((actual-expected).values()),'triangle_signature_removed':sum((expected-actual).values())}))
assert actual==expected
