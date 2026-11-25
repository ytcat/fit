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
P = dict(scale=.72, dy=.032, dz=.06, cut=-.2, scarf_top=-.045, scarf_scale=1.0, scarf_dy=0.0, tris=14000, scarf_tris=3000,
         quality=86, rough=.8, size=1024, warm=.7, gain=1.0, scarf=0,
         neck_cut=-.045, neck_zc=-.03, neck_rx=.082, neck_rz=.087, neck_bottom=-.2, neck_fit=.985)
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
# The neck below the jaw (owner 2026-11-25, v1.96: "what is in her neck?"). Where the scarf came off, the source's neck is left with
# holes and ragged edges, and its top rim flared out over the collar. Below `neck_cut` the neck (not the kerchief's drape) is replaced
# by a clean elliptic tube (centre z `neck_zc`, half-widths `neck_rx`, `neck_rz`; a little inside the source neck so the cut edge lies
# flush on it), from just inside the jaw down to `neck_bottom` inside the collar. Its colour: the source neck's own colours sampled
# round the cut (white throat in front, brown at the back), painted as a small strip into an unused corner of the texture atlas and
# mapped round the tube, so it continues the fur without a seam or texture streaks.
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc
from math import cos, sin, pi
tube_info = {}
def neck_tube(b2):
    global pix
    uvl = b2.loops.layers.uv.active; b2.faces.ensure_lookup_table()
    def face_uv(f): return Vector((sum(l[uvl].uv.x for l in f.loops) / len(f.loops), sum(l[uvl].uv.y for l in f.loops) / len(f.loops)))
    def texel(uv): return pix[min(Hh - 1, max(0, int(uv.y * Hh))), min(W - 1, max(0, int(uv.x * W))), :3]
    def is_red(f): r, g, b = texel(face_uv(f)); return r > .25 and r > 1.7 * g and r > 1.5 * b
    gone = [f for f in b2.faces if f.calc_center_median().z < P['neck_cut'] and not is_red(f)]
    bmesh.ops.delete(b2, geom=gone, context='FACES'); bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context='VERTS')
    # loose crumbs left by the scarf (small islands below the jaw)
    b2.faces.ensure_lookup_table(); seen, crumbs = set(), []
    for f in b2.faces:
        if f in seen: continue
        st, isl = [f], []; seen.add(f)
        while st:
            q = st.pop(); isl.append(q)
            for e in q.edges:
                for g2 in e.link_faces:
                    if g2 not in seen: seen.add(g2); st.append(g2)
        if len(isl) < 40 and max(q.calc_center_median().z for q in isl) < .02: crumbs += isl
    bmesh.ops.delete(b2, geom=crumbs, context='FACES'); bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context='VERTS')
    b2.faces.ensure_lookup_table()
    # the neck's colours round the cut (fur only, not the kerchief)
    fur = [f for f in b2.faces if not is_red(f) and f.calc_center_median().z < .02]
    tmp = bmesh.new(); vmap = {}
    for f in fur:
        vs = []
        for v in f.verts:
            if v not in vmap: vmap[v] = tmp.verts.new(v.co)
            vs.append(vmap[v])
        try: tmp.faces.new(vs)
        except ValueError: pass
    tmp.faces.ensure_lookup_table(); tree = BVHTree.FromBMesh(tmp)
    # the tube's ellipse fitted to the fur neck just above the cut (x half-width, front and back), a hair inside it
    band = [v.co for f in fur for v in f.verts if P['neck_cut'] < v.co.z < P['neck_cut'] + .012]
    if band and P['neck_fit'] > 0:
        xs = [abs(c.x) for c in band]; zs = [-c.y for c in band]
        zf, zb = max(zs), min(zs); P['neck_zc'] = round((zf + zb) / 2, 4); P['neck_rz'] = round((zf - zb) / 2 * P['neck_fit'], 4); P['neck_rx'] = round(sorted(xs)[int(len(xs) * .9)] * P['neck_fit'], 4)
    fur_by_tmp = list(fur)
    seg = 40; ring_col = []
    for k in range(seg):
        a = 2 * pi * k / seg; q = Vector((sin(a) * P['neck_rx'] * 1.6, -(P['neck_zc'] + cos(a) * P['neck_rz'] * 1.6), P['neck_cut'] + .006))
        loc, nrm, idx, dist = tree.find_nearest(q)
        f = fur_by_tmp[idx] if idx is not None and idx < len(fur_by_tmp) else None
        if f is None: ring_col.append(np.array([.5, .35, .25])); continue
        wts = poly_3d_calc([v.co for v in f.verts], loc); uv = sum((l[uvl].uv * w for l, w in zip(f.loops, wts)), Vector((0, 0)))
        ring_col.append(np.array(texel(uv)))
    tmp.free()
    ring_col = np.array(ring_col)
    # the back of the neck lies under the kerchief's drape: its samples catch cloth and lining; it takes the sides' brown instead
    ang = np.array([2 * pi * k / seg for k in range(seg)]); side = np.abs(np.cos(ang)) < .35
    back = np.cos(ang) < -.35; ring_col[back] = ring_col[side].mean(0)
    for _ in range(2): ring_col = (np.roll(ring_col, 1, 0) + 2 * ring_col + np.roll(ring_col, -1, 0)) / 4
    # an unused corner of the atlas (no face UV covers it) for the strip
    cov = np.zeros((128, 128), bool)
    for f in b2.faces:
        us = [l[uvl].uv for l in f.loops]; x0 = int(min(u.x for u in us) * 128); x1 = int(max(u.x for u in us) * 128); y0 = int(min(u.y for u in us) * 128); y1 = int(max(u.y for u in us) * 128)
        cov[max(0, y0 - 1):min(128, y1 + 2), max(0, x0 - 1):min(128, x1 + 2)] = True
    sw, sh = 12, 2; spot = None
    for y in range(127 - sh, 0, -1):
        for x in range(0, 128 - sw):
            if not cov[y:y + sh, x:x + sw].any(): spot = (x, y); break
        if spot: break
    assert spot, 'no free corner in the texture atlas for the neck colours'
    X0, Y0, PW, PH = spot[0] * W // 128, spot[1] * Hh // 128, sw * W // 128, sh * Hh // 128
    for c in range(PW):
        t = c / (PW - 1) * seg; k0 = int(t) % seg; k1 = (k0 + 1) % seg; fr = t - int(t)
        pix[Y0:Y0 + PH, X0 + c, :3] = ring_col[k0] * (1 - fr) + ring_col[k1] * fr
    U = lambda t: (X0 + .5 + t * (PW - 1)) / W; Vv = (Y0 + PH / 2) / Hh
    ys, y = [], 0.0
    while y > P['neck_bottom'] - 1e-6: ys.append(y); y -= .02
    rings = [[b2.verts.new(Vector((sin(2 * pi * k / seg) * P['neck_rx'], -(P['neck_zc'] + cos(2 * pi * k / seg) * P['neck_rz']), y))) for k in range(seg)] for y in ys]
    faces = []
    for r in range(len(rings) - 1):
        for k in range(seg):
            f = b2.faces.new((rings[r][k], rings[r + 1][k], rings[r + 1][(k + 1) % seg], rings[r][(k + 1) % seg])); faces.append((f, k))
    b2.normal_update()
    for f, k in faces:
        cm = f.calc_center_median()
        if f.normal.dot(Vector((cm.x, cm.y + P['neck_zc'], 0))) < 0: f.normal_flip()
        for l in f.loops:
            kv = next(i for i in range(seg) if any(l.vert is rr[i] for rr in rings))
            t = kv / seg
            if k == seg - 1 and kv == 0: t = 1.0  # the last column closes the ring at the strip's far end
            l[uvl].uv = Vector((U(t), Vv))
    tube_info.update(removed=len(gone), crumbs=len(crumbs), tube_faces=len(faces), strip=[X0, Y0, PW, PH])
headObj, head_n0 = piece('hazelHead', lambda i: i not in red, P['tris'], cut=P['cut'], xf=neck_tube)
scarfObj, scarf_n0 = piece('neckScarf', lambda i: i in red, P['scarf_tris'], xf=widen) if P['scarf'] else (None, 0)
bm.free(); bpy.data.objects.remove(ob, do_unlink=True)

# material: base colour JPEG, constant roughness, no metal; the coat's colour matched to her body
base.pixels = pix.ravel().tolist(); base.update()  # the neck strip painted by neck_tube
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
print('REPORT ' + json.dumps(dict(params=P, neck=tube_info, source_tris=src_tris, head=dict(before=head_n0, tris=tri(headObj), bounds=bounds(headObj)),
                                  scarf=dict(faces=len(red), exported=bool(scarfObj), tris=tri(scarfObj) if scarfObj else 0), texture=list(base.size), bytes=os.path.getsize(out))))
