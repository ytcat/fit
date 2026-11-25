"""Mrs. Hazel's game head from the owner-approved TRELLIS.2 source (assets/characters/hazel/trellis/hazel-head-trellis-source.glb).

    <blender-python> tools/blender/hazel_head_game.py -- <source.glb> <out.glb> [key=value ...]

Like tools/blender/fang_head_game.py: scaled and moved into Hazel's head-joint frame (metres; +Y up, +Z toward the nose, origin =
the head joint), decimated to a phone budget, one JPEG base-colour map (<= 1024 px), constant roughness, no metal (the TRELLIS
metal map is an artifact). Node 'hazelHead': the head, ears, the kerchief over the head with its drape at the nape, and the neck
down to `cut` (inside the cardigan collar).
The source's long slim neck ends in a polka-dot scarf wrapped round its base. On Hazel's short neck and cardigan collar it sits
inside the body (tried rigid on the head and on the chest joint, widened 1.3x and raised 3.5 cm: still red fragments through the
collar, qa/hazel-trellis/neck-scarf-trials.webp), so it is left out: the red faces below `scarf_top` (picked by the base colour,
smoothed over neighbours so the white dots go with them) are removed. scarf=1 exports them as node 'neckScarf' (widened by
`scarf_scale` round the neck axis, raised by `scarf_dy`) for another try; the game does not use it.
Colour: `warm` (0..1) moves the coat's orange-brown toward her body's brown (same red channel); `gain` brightness of the coat.
Prints a JSON report line 'REPORT'.
"""
import bpy, bmesh, sys, json, os
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
P = dict(scale=.72, dy=.032, dz=.06, cut=-.2, scarf_top=-.07, scarf_scale=1.0, scarf_dy=0.0, tris=14000, scarf_tris=3000,
         quality=86, rough=.8, size=1024, warm=.7, gain=1.0, scarf=0)
for a in argv[2:]:
    k, v = a.split('='); P[k] = type(P[k])(v)

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
src_tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
mw = ob.matrix_world.copy(); ob.parent = None; ob.data.transform(mw); ob.matrix_world.identity()
for o in list(bpy.context.scene.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)

old = ob.data.materials[0]
base = next(n.image for n in old.node_tree.nodes if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for l in n.outputs[0].links))
W, Hh = base.size; pix = np.array(base.pixels[:]).reshape(Hh, W, 4)

# into the head-joint frame (Blender z up, -y forward -> head frame y = bz, z = -by)
s = P['scale']
bm = bmesh.new(); bm.from_mesh(ob.data)
for v in bm.verts: v.co = Vector((v.co.x * s, v.co.y * s - P['dz'], v.co.z * s + P['dy']))
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
bm.faces.ensure_lookup_table()
uv = bm.loops.layers.uv.active

# the neck scarf: red faces below scarf_top, smoothed over neighbours (dots, folds)
def colour(f):
    u = sum(l[uv].uv.x for l in f.loops) / len(f.loops); w = sum(l[uv].uv.y for l in f.loops) / len(f.loops)
    x = min(W - 1, max(0, int(u * W))); y = min(Hh - 1, max(0, int(w * Hh))); return pix[y, x, :3]
low = {f.index for f in bm.faces if f.calc_center_median().z < P['scarf_top']}
red = set()
for f in bm.faces:
    if f.index not in low: continue
    r, g, b = colour(f)
    if r > .25 and r > 1.7 * g and r > 1.5 * b: red.add(f.index)
for _ in range(4):
    nxt = set(red)
    for f in bm.faces:
        if f.index not in low: continue
        nb = {e2.index for e in f.edges for e2 in e.link_faces if e2 is not f}
        k = sum(1 for i in nb if i in red)
        if f.index not in red and nb and k >= max(2, len(nb) - 1): nxt.add(f.index)
        if f.index in red and k == 0: nxt.discard(f.index)
    red = nxt

def piece(name, keep, budget, xf=None, cut=None):
    b2 = bm.copy(); b2.faces.ensure_lookup_table()
    bmesh.ops.delete(b2, geom=[f for f in b2.faces if not keep(f.index)], context='FACES')
    if cut is not None:
        bmesh.ops.bisect_plane(b2, geom=b2.verts[:] + b2.edges[:] + b2.faces[:], plane_co=Vector((0, 0, cut)), plane_no=Vector((0, 0, 1)), clear_inner=True)
    loose = [v for v in b2.verts if not v.link_faces]; bmesh.ops.delete(b2, geom=loose, context='VERTS')
    if xf: xf(b2)
    me = bpy.data.meshes.new(name); b2.to_mesh(me); b2.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    n0 = sum(len(p.vertices) - 2 for p in me.polygons)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
    m = o.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = min(1, budget / max(n0, 1)); m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=m.name); bpy.ops.object.shade_smooth()
    return o, n0

def widen(b2):  # round the neck axis (x 0, z at the ring's middle), then up
    zs = [v.co.y for v in b2.verts]; zc = (min(zs) + max(zs)) / 2 if zs else 0
    for v in b2.verts: v.co = Vector((v.co.x * P['scarf_scale'], zc + (v.co.y - zc) * P['scarf_scale'], v.co.z + P['scarf_dy']))
headObj, head_n0 = piece('hazelHead', lambda i: i not in red, P['tris'], cut=P['cut'])
scarfObj, scarf_n0 = piece('neckScarf', lambda i: i in red, P['scarf_tris'], xf=widen) if P['scarf'] else (None, 0)
bm.free(); bpy.data.objects.remove(ob, do_unlink=True)

# material: base colour JPEG, constant roughness, no metal; the coat's colour matched to her body
if base.size[0] > P['size']: base.scale(P['size'], P['size'])
if P['warm'] > 0 or P['gain'] != 1:
    px = np.array(base.pixels[:]).reshape(-1, 4)
    r, g, b = px[:, 0:1], px[:, 1:2], px[:, 2:3]
    gr = g / np.maximum(r, 1e-3)
    coat = np.clip((gr - .4) / .08, 0, 1) * np.clip((.85 - gr) / .08, 0, 1) * np.clip((r - b - .05) / .06, 0, 1)  # the brown coat; not the red kerchief, white or black
    target = np.concatenate([r, r * .70, r * .46], 1)  # her body's brown (#87603f: green/red .71, blue/red .47), the coat's own brightness
    px[:, :3] = np.clip(px[:, :3] * (1 - P['warm'] * coat) + target * P['warm'] * coat, 0, 1) * (1 + (P['gain'] - 1) * coat)
    base.pixels = px.ravel().tolist(); base.update()
base.file_format = 'JPEG'
mat = bpy.data.materials.new('Hazel head'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = base
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = P['rough']; bsdf.inputs['Metallic'].default_value = 0
for o in (headObj, scarfObj):
    if o: o.data.materials.clear(); o.data.materials.append(mat)

def bounds(o):
    co = np.array([tuple(v.co) for v in o.data.vertices]); Hf = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)
    return [Hf.min(0).round(4).tolist(), Hf.max(0).round(4).tolist()]
tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
                          export_image_format='JPEG', export_jpeg_quality=P['quality'], export_animations=False, export_skins=False,
                          export_morph=False, export_extras=False, export_cameras=False, export_lights=False)
print('REPORT ' + json.dumps(dict(params=P, source_tris=src_tris, head=dict(before=head_n0, tris=tri(headObj), bounds=bounds(headObj)),
                                  scarf=dict(faces=len(red), exported=bool(scarfObj), tris=tri(scarfObj) if scarfObj else 0), texture=list(base.size), bytes=os.path.getsize(out))))
