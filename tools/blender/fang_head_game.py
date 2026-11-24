"""Fang's game head from the owner-approved TRELLIS.2 source (assets/characters/fang/trellis/fang-head-trellis-source.glb).

    <blender-python> tools/blender/fang_head_game.py -- <source.glb> <out.glb> [key=value ...]

Bisects the bust just below the neck ruff, scales and moves it into Fang's head-joint frame (metres; +Y up, +Z toward the nose,
origin = the head joint the rig turns the head about), decimates it to a phone budget and writes a self-contained GLB with one
JPEG base-colour map (<= 1024 px). The TRELLIS metallic/roughness map is replaced by constant values (it is matte fur, metal 0).
Parameters (head-joint frame): scale (m per source unit), dy, dz (offset after scaling), cut (y of the cut, head frame),
tilt (cut plane rises toward the nose by tilt * z), tris (target triangles), quality (JPEG). Prints a JSON report line 'REPORT'.
"""
import bpy, bmesh, sys, json, math, os
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
P = dict(scale=.9, dy=.075, dz=-.03, cut=-.17, tilt=0.0, tris=16000, quality=86, rough=.82, size=1024)
for a in argv[2:]:
    k, v = a.split('='); P[k] = type(P[k])(v) if k in P else float(v)

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
src_tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
# detach from the importer's empty, bake its transform into the mesh
mw = ob.matrix_world.copy(); ob.parent = None; ob.data.transform(mw); ob.matrix_world.identity()
for o in list(bpy.context.scene.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
ob.name = ob.data.name = 'Fang head'

# into the head-joint frame. Blender: Z up, -Y forward (glTF +Z) -> head frame y = bz, z = -by
s = P['scale']
bm = bmesh.new(); bm.from_mesh(ob.data)
for v in bm.verts:
    v.co = Vector((v.co.x * s, v.co.y * s - P['dz'], v.co.z * s + P['dy']))
# weld the glTF seam splits (UVs live on the loops, so they survive) so the bust is one connected surface again
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
# cut: keep head-frame y > cut + tilt * z   (blender: z > cut - tilt * y)
no = Vector((0, P['tilt'], 1)).normalized()
res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, P['cut'])), plane_no=no, clear_inner=True)
# drop loose islands left under the cut (tips of fur cards that were cut off from the head)
bm.verts.ensure_lookup_table()
seen, islands = set(), []
for v in bm.verts:
    if v in seen: continue
    stack, isl = [v], []
    seen.add(v)
    while stack:
        q = stack.pop(); isl.append(q)
        for e in q.link_edges:
            w = e.other_vert(q)
            if w not in seen: seen.add(w); stack.append(w)
    islands.append(isl)
islands.sort(key=len, reverse=True)
small = [v for isl in islands[1:] if len(isl) < 30 for v in isl]
bmesh.ops.delete(bm, geom=small, context='VERTS')
bm.to_mesh(ob.data); bm.free()
cut_tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)

# decimate to the phone budget (collapse keeps the silhouette; UV seams are respected)
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
m = ob.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = min(1, P['tris'] / max(cut_tris, 1)); m.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth()
me = ob.data
tris = sum(len(p.vertices) - 2 for p in me.polygons)

# material: the TRELLIS base colour as a JPEG <= size px; constant roughness, no metal
old = me.materials[0]
base = next(n.image for n in old.node_tree.nodes if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for l in n.outputs[0].links))
mr = next((n.image for n in old.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image is not base), None)
stats = None
if mr is not None:
    px = np.array(mr.pixels[:]).reshape(-1, 4)
    stats = dict(rough_mean=float(px[:, 1].mean()), rough_std=float(px[:, 1].std()), metal_mean=float(px[:, 2].mean()), metal_max=float(px[:, 2].max()))
if base.size[0] > P['size']: base.scale(P['size'], P['size'])
base.file_format = 'JPEG'
mat = bpy.data.materials.new('Fang head fur'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = base
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = P['rough']; bsdf.inputs['Metallic'].default_value = 0
me.materials.clear(); me.materials.append(mat)

co = np.array([tuple(v.co) for v in me.vertices])
H = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)  # head frame
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
                          export_image_format='JPEG', export_jpeg_quality=P['quality'], export_animations=False, export_skins=False,
                          export_morph=False, export_extras=False, export_cameras=False, export_lights=False)
print('REPORT ' + json.dumps(dict(params=P, source_tris=src_tris, after_cut=cut_tris, tris=tris, verts=len(me.vertices), islands=len(islands), dropped_verts=len(small),
                                  bounds=[H.min(0).round(4).tolist(), H.max(0).round(4).tolist()], texture=list(base.size), mr_stats=stats, bytes=os.path.getsize(out))))
