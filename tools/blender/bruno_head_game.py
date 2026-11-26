"""Coach Bruno's game head from the owner-approved TRELLIS.2 source (assets/characters/bruno/trellis/bruno-head-trellis-source.glb,
owner 2026-11-26: "yes").

    <blender-python> tools/blender/bruno_head_game.py -- <source.glb> <out.glb> [key=value ...]
    (the shipped file: defaults, assets/characters/bruno/bruno-head.glb)

Like tools/blender/hazel_head_game.py and fang_head_game.py: the bust is scaled and moved into Bruno's head-joint frame (metres;
+Y up, +Z toward the nose, origin = the head joint; `scale`, `dy`, `dz`), brought to a phone budget and written with one JPEG
base-colour map (<= 1024 px), constant roughness and no metal (the TRELLIS metal map is ~1 everywhere: an artifact on fur).
Node 'brunoHead'. What is different, and why:

  * Geometry. This source is made of thin walls (head, cap and ears are two sheets ~1.5 mm apart, the cap in several layers; 1.1k
    open edges, 2.8k edges shared by 3+ faces), so the usual weld + decimate stopped at ~29k triangles. The walls are thickened
    inward (`solid`) and voxel-remeshed (`remesh`) into one closed skin of the same outer shape, the inner bubbles dropped, cut at
    `cut` (head-frame y, under the collar) and decimated to `tris`. New UVs (Smart UV Project on a smoothed copy, `smooth`
    iterations, so the fur relief does not split it into thousands of islands; same topology, so the UVs map corner for corner).
  * Cracks. The fine crack lines on the light muzzle and brows were the source atlas's chart borders: the texels on each chart's
    edge are dark speckle and every UV seam sampled them. Coverage of the source UVs is baked, the edge texels (`inpaint` px) and the
    gaps between charts are refilled from each chart's interior; that padded texture is baked onto the new layout (rays from the
    game surface to the source) with `margin` px of extended edges, so no seam on the phone samples a neighbouring island. Thin
    dark lines left inside the light areas are filled from their light neighbours (`crack`); bake rays that missed are filled too.
  * Size (main review 2026-11-26: "too big ... a mask on the shoulders"): scale 0.63 m per source unit, the chin at head-frame y
    -0.05: the cap's top is 2.4 cm above the code head's (it was 7 cm).
  * The neck. The source bust ends in a long fur cone under the chin, cut on a slant, with ragged fur tips. Below `cut` it is gone;
    a clean neck tube (centre z `neck_zc`, front half-depth `neck_rz`) runs from inside the skull (`neck_top`) down into the body
    (`neck_bottom`). From the collar (`neck_y`: `neck_rx` wide, back `neck_rzb`) it tapers to the nape (`mid_y`: `mid_rx`,
    `mid_rzb`: a visible neck under the skull from behind) and widens again into the skull (`nape_rx`, `nape_rz`); under the collar
    it narrows (`shrink_from`, `shrink_len`, `neck_shrink`) so it never shows through the open cardigan front. The bust's cut rim
    lies inside the tube and the body. Its colours: the head's own fur sampled round the jaw line, with fur strands of the head
    fur's own contrast (`strands`), in a band of `band` px at the bottom of the atlas (the head's UVs sit above it).
    tube=0 leaves the tube out (the negative control of tests/head-seams.test.cjs).
  * Eyes (main review: "eyes vanish in the game ... he looks eyeless"): each pupil found in the bake (darkest texels round the
    eye), the iris (`iris_r` round it, the source's own shape) lifted (`iris_gain`, warmed by `iris_mix`), the pupil dark, a
    catch-light painted (`catch_r`); iris and catch-light also go into an emissive map (`iris_glow`, `catch_glow`) so they read in
    the films' shadowed sockets. The pupil positions are printed (REPORT eyes) for HEADS.bruno.eyes (QA and tests).
  * The cap brim (main review: "the dark ragged band under the brim"): the remesh left its lip lumpy, so the lip's vertices are
    smoothed (`brim_smooth` passes), and its underside and front edge get one even colour from the cap's top (`brim_dark`,
    `brim_edge`).
  * Colour. The source fur is near black (as dark as the FLUX picture); Bruno's body fur is #6f4a31. The dark fur texels (not the
    cap, found by position; not the cream muzzle and brows, the nose or the eyes) move to the body's fur colour: median matched per
    channel, the texture's own variation kept at `fur_contrast` (clamped at `fur_lo`: the darkest streaks read as smudges once the
    fur is lighter). The eyes (`eye_*`, source units) keep their own colours and their dark texels are lifted by `eyes`.
Prints a JSON report line 'REPORT'.
"""
import bpy, bmesh, sys, json, os, math
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
P = dict(scale=.63, dy=.1327, dz=.055, cut=-.12, tris=14600, quality=86, rough=.85, size=1024,
         neck_top=.1, neck_y=-.07, neck_zc=0.0, neck_rx=.2, neck_rz=.15, neck_rzb=.17, mid_y=-.01, mid_rx=.17, mid_rzb=.15, neck_bottom=-.2, neck_shrink=.75, shrink_from=-.075, shrink_len=.06, seg=48,
         fur=1.0, fur_contrast=.65, fur_rgb='6f4a31', eyes=1.4, eye_x=.122, eye_z=.108, eye_rx=.065, eye_rz=.05, crack=1, inpaint=1, band=64, margin=16, smooth=30, uv_angle=66.0, uv_margin=.004, remesh=.003, solid=.012, strands=.9, nape_rz=.24, nape_rx=.2, iris_r=.0135, pupil_r=.0048, catch_r=.0036, iris_gain=2.2, iris_mix=.45, iris_glow=.35, catch_glow=.95, brim_dark=.78, brim_edge=.85, brim_smooth=8, fur_lo=.55, tube=1, debug='')
for a in argv[2:]:
    k, v = a.split('='); P[k] = type(P[k])(v)
s = P['scale']
def to_head(x, y, z):  # source (Blender, z up, -y forward) -> the head frame kept as Blender coords (export: y up = z, +z = -y)
    return Vector((x * s, y * s - P['dz'], z * s + P['dy']))
def to_src(b):  # Blender coords in the head frame -> source units
    return (b[..., 0] / s, (b[..., 1] + P['dz']) / s, (b[..., 2] - P['dy']) / s)

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=src)
S = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
src_tris = sum(len(p.vertices) - 2 for p in S.data.polygons)
mw = S.matrix_world.copy(); S.parent = None; S.data.transform(mw); S.matrix_world.identity()
for o in list(bpy.context.scene.objects):
    if o is not S: bpy.data.objects.remove(o, do_unlink=True)
S.name = 'source'
for v in S.data.vertices: v.co = to_head(*v.co)
old = S.data.materials[0]
T0 = next(n.image for n in old.node_tree.nodes if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for l in n.outputs[0].links))
W, H = T0.size

scn = bpy.context.scene; scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = 1
def emit_material(name, colour_node):
    m = bpy.data.materials.new(name); nt = m.node_tree if m.node_tree else (setattr(m, 'use_nodes', True) or m.node_tree)
    for n in list(nt.nodes): nt.nodes.remove(n)
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1
    nt.links.new(e.outputs[0], o.inputs['Surface']); colour_node(nt, e)
    return m
def bake_into(ob, img, colour_node, margin):
    keep = list(ob.data.materials); m = emit_material('bake', colour_node); nt = m.node_tree
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    for n in nt.nodes: n.select = False
    t.select = True; nt.nodes.active = t
    ob.data.materials.clear(); ob.data.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='EMIT', margin=margin, margin_type='EXTEND', use_selected_to_active=False, use_clear=True)
    ob.data.materials.clear()
    for k in keep: ob.data.materials.append(k)
def pixels(img): return np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
def box3(a):  # 3x3 box sum (edges clamped)
    p = np.pad(a, [(1, 1), (1, 1)] + [(0, 0)] * (a.ndim - 2), mode='edge'); h, w = a.shape[:2]
    return sum(p[dy:dy + h, dx:dx + w] for dy in range(3) for dx in range(3))
LUM = np.array([.2126, .7152, .0722], np.float32)

# ---- 1. the source texture's chart borders (the cracks): coverage of the source UVs, the edge texels and the gaps refilled from
#         each chart's interior, so a seam samples its own chart
cov = bpy.data.images.new('coverage', W, H, float_buffer=True); cov.colorspace_settings.name = 'Non-Color'
bake_into(S, cov, lambda nt, e: e.inputs['Color'].__setattr__('default_value', (1, 1, 1, 1)), 0)
valid = pixels(cov)[..., 0] > .99; covered = float(valid.mean())
for _ in range(P['inpaint']): valid &= box3(valid.astype(np.float32)) > 8.5
T = pixels(T0).copy(); T[..., 3] = 1
w = valid.astype(np.float32); acc = T[..., :3] * w[..., None]; filled = 0
for _ in range(512):
    todo = w == 0
    if not todo.any(): break
    ws, cs = box3(w), box3(acc); new = todo & (ws > 0)
    acc[new] = cs[new] / ws[new][:, None]; w[new] = 1; filled += int(new.sum())
T[..., :3] = acc
T1 = bpy.data.images.new('source padded', W, H); T1.pixels = T.ravel().tolist(); T1.update()
def source_tex(nt, e):
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = T1; nt.links.new(t.outputs['Color'], e.inputs['Color'])
S.data.materials.clear(); S.data.materials.append(emit_material('source', source_tex))

# ---- 2. the game mesh: welded (glTF seam splits), cut under the collar, loose fur tips dropped, decimated without UV constraints
#         (the source's hundreds of UV charts held the collapse at ~29k triangles; the colour comes back by a bake)
L = bpy.data.objects.new('brunoHead', S.data.copy()); scn.collection.objects.link(L); me = L.data
while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
if P['remesh'] > 0:  # one closed skin of the same shape (the source has 1.1k open edges and 2.8k edges of 3+ faces: fur cards, doubled shells)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = L; L.select_set(True)
    # the source is all thin walls (head, cap, ears: two sheets ~1.5 mm apart, the cap in several layers): thickened inward first,
    # or the voxels lose them (holes in the cap)
    so = L.modifiers.new('solid', 'SOLIDIFY'); so.thickness = P['solid']; so.offset = -1; so.use_rim = True; bpy.ops.object.modifier_apply(modifier=so.name)
    rm = L.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = P['remesh']; rm.adaptivity = 0; bpy.ops.object.modifier_apply(modifier=rm.name)
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, P['cut'])), plane_no=Vector((0, 0, 1)), clear_inner=True)
bm.verts.ensure_lookup_table(); seen, islands = set(), []
for v in bm.verts:
    if v in seen: continue
    st, isl = [v], []; seen.add(v)
    while st:
        q = st.pop(); isl.append(q)
        for e in q.link_edges:
            u = e.other_vert(q)
            if u not in seen: seen.add(u); st.append(u)
    islands.append(isl)
islands.sort(key=len, reverse=True)
small = [v for isl in islands[1:] if len(isl) < 60 or P['remesh'] > 0 for v in isl]  # remeshed: the inner bubbles go too
bmesh.ops.delete(bm, geom=small, context='VERTS')
bm.to_mesh(me); bm.free()
cut_tris = head_tris = sum(len(p.vertices) - 2 for p in me.polygons)
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = L; L.select_set(True)
for _ in range(4):
    if head_tris <= P['tris'] * 1.03: break
    m = L.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = P['tris'] / head_tris; m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=m.name); head_tris = sum(len(p.vertices) - 2 for p in me.polygons)
# the brim's lip: the voxels left it lumpy (a ragged dark edge over the eyes in close-ups); its vertices are smoothed in place
bm = bmesh.new(); bm.from_mesh(me)
def in_brim(co): x, y, z = co.x / s, (co.y + P['dz']) / s, (co.z - P['dy']) / s; return abs(x) < .33 and y < -.1 and .22 < z < .335
lip = [v for v in bm.verts if in_brim(v.co)]
for _ in range(P['brim_smooth']): bmesh.ops.smooth_vert(bm, verts=lip, factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(me); bm.free(); brim_verts = len(lip)

# ---- 3. new UVs with margins: Smart UV Project on a smoothed copy (the fur relief would split it into thousands of islands; same
#         topology, so its UVs map corner for corner), into v BAND/H..1 (the band below holds the neck's colours)
BAND = P['band']; V0 = BAND / H
Ls = bpy.data.objects.new('smooth', me.copy()); scn.collection.objects.link(Ls)
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = Ls; Ls.select_set(True)
sm = Ls.modifiers.new('sm', 'SMOOTH'); sm.factor = 1.0; sm.iterations = P['smooth']; bpy.ops.object.modifier_apply(modifier=sm.name)
Ls.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(P['uv_angle']), island_margin=P['uv_margin'], area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
uvs = np.zeros(len(Ls.data.loops) * 2, np.float32); Ls.data.uv_layers[0].data.foreach_get('uv', uvs); uvs = uvs.reshape(-1, 2)
uvs[:, 1] = V0 + uvs[:, 1] * (1 - V0)
from bpy_extras import bmesh_utils
bmi = bmesh.new(); bmi.from_mesh(Ls.data)
for f in bmi.faces: f.select = True
n_islands = len(bmesh_utils.bmesh_linked_uv_islands(bmi, bmi.loops.layers.uv.active)); bmi.free()
bpy.data.objects.remove(Ls, do_unlink=True)
me.uv_layers.new(name='UVMap'); me.uv_layers[0].data.foreach_set('uv', uvs.ravel())

# ---- 4. the padded source texture baked onto the new layout (rays from the game surface to the source), and every texel's place
B0 = bpy.data.images.new('baked', W, H); B0.colorspace_settings.name = 'sRGB'
keep = list(me.materials); tm = emit_material('target', lambda nt, e: None); t = tm.node_tree.nodes.new('ShaderNodeTexImage'); t.image = B0
for n in tm.node_tree.nodes: n.select = False
t.select = True; tm.node_tree.nodes.active = t; me.materials.clear(); me.materials.append(tm)
bpy.ops.object.select_all(action='DESELECT'); S.select_set(True); L.select_set(True); bpy.context.view_layer.objects.active = L
bpy.ops.object.bake(type='EMIT', margin=P['margin'], margin_type='EXTEND', use_selected_to_active=True, cage_extrusion=.012, max_ray_distance=.03, use_clear=True)
me.materials.clear()
POS = bpy.data.images.new('pos', W, H, float_buffer=True); POS.colorspace_settings.name = 'Non-Color'
bake_into(L, POS, lambda nt, e: nt.links.new(nt.nodes.new('ShaderNodeNewGeometry').outputs['Position'], e.inputs['Color']), P['margin'])
pos = pixels(POS)[..., :3]; sx, sy, sz = to_src(pos)
NRM = bpy.data.images.new('nrm', W, H, float_buffer=True); NRM.colorspace_settings.name = 'Non-Color'
bake_into(L, NRM, lambda nt, e: nt.links.new(nt.nodes.new('ShaderNodeNewGeometry').outputs['Normal'], e.inputs['Color']), P['margin'])
nrm = pixels(NRM)[..., :3]  # blender coords: z up, -y toward the nose
used = np.abs(pos).sum(-1) > 0
col = pixels(B0)[..., :3].copy()
miss = (col.sum(-1) == 0) & used; missed = int(miss.sum())  # bake rays that found no source surface: filled from their neighbours
w = (~miss & used).astype(np.float32); acc = col * w[..., None]
for _ in range(64):
    todo = miss & (w == 0)
    if not todo.any(): break
    ws, cs = box3(w), box3(acc); new = todo & (ws > 0)
    acc[new] = cs[new] / ws[new][:, None]; w[new] = 1
col = np.where(miss[..., None], acc, col)

# ---- 4. cracks left inside the light areas: thin dark lines a few texels wide, filled from their light neighbours
lum = col @ LUM; crack_n = 0
for _ in range(P['crack'] * 3):
    L5 = np.pad(lum, 2, mode='edge'); h, w_ = lum.shape
    sh = lambda dy, dx: L5[2 + dy:2 + dy + h, 2 + dx:2 + dx + w_]
    ridge = np.zeros(lum.shape, bool)
    for dy, dx in [(0, 2), (2, 0), (2, 2), (2, -2), (0, 1), (1, 0), (1, 1), (1, -1)]:
        a, b2 = sh(dy, dx), sh(-dy, -dx)
        ridge |= (np.minimum(a, b2) - lum > .045) & (a > .4) & (b2 > .4)
    good = ((lum > .4) & ~ridge).astype(np.float32); cs = box3(col * good[..., None]); ws = box3(good)
    fix = ridge & (ws > 2); crack_n += int(fix.sum())
    col[fix] = cs[fix] / ws[fix][:, None]; lum = col @ LUM

# ---- 5. colour: the dark fur toward the body's fur (median per channel, variation compressed), the eyes lifted
cap = ((sz > .335) & (np.abs(sx) < .27)) | ((sz > .25) & (sy < -.18) & (np.abs(sx) < .3))  # crown and peak, not the ears beside them
cap &= ~((np.abs(sx) > .245) & (sz > .2) & (np.abs(sy) < .17))
r_, b_ = col[..., 0], col[..., 2]
fur_w = np.clip((.30 - lum) / .08, 0, 1) * np.clip((r_ - b_ + .02) / .03, 0, 1) * (~cap)
eye_d = np.hypot((np.abs(sx) - P['eye_x']) / P['eye_rx'], (sz - P['eye_z']) / P['eye_rz'])  # the eye and its dark socket (source units)
eye_zone = np.clip((1.15 - eye_d) / .35, 0, 1) * (sy < -.1)
eye_w = eye_zone * np.clip((.4 - lum) / .1, 0, 1)  # the dark texels in it (iris, pupil, socket), not the cream brow above
fur_w = fur_w * (1 - eye_zone)  # the eyes keep their own colours (the fur recolour turned them into flat brown fur)
tgt = np.array([int(P['fur_rgb'][i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
sel = (fur_w > .8) & used
med = np.median(col[sel], axis=0)
ratio = np.clip(np.maximum(col, 1e-4) / np.maximum(med, 1e-4), P['fur_lo'], 2.0)  # the darkest streaks read as smudges once the fur is lighter
fur_col = tgt * ratio ** P['fur_contrast']  # the median lands on the body's colour; darker/lighter strands keep a softened contrast
k = (fur_w * P['fur'])[..., None]
col = np.clip(col * (1 - k) + fur_col * k, 0, 1)
col = np.clip(col * (1 + (P['eyes'] - 1) * eye_w[..., None]), 0, 1)
fur_after = np.median(col[sel], axis=0)
lum = col @ LUM
fur_rel = float(np.std(lum[sel]) / max(1e-4, np.median(lum[sel])))  # the fur's own strand contrast, for the neck strip

# ---- 5b. the eyes read under the heavy brows (owner review 2026-11-26: "eyes vanish in the films, he looks eyeless"): each pupil
#          found as the darkest texels round the eye centre; the iris (source shape, `iris_r` round the pupil) lifted `iris_gain` and
#          warmed, the pupil kept dark, a small catch-light painted up and to one side; the iris and the catch-light also go into an
#          emissive map (`iris_glow`, `catch_glow`) so they read in the films' shadowed sockets. Nothing else glows.
emis = np.zeros_like(col); eyes = []
SM = lambda d, r, e: np.clip((r - d) / e + .5, 0, 1)  # soft disc
for side in (-1, 1):
    near = used & (sy < -.08) & (np.hypot(sx - side * P['eye_x'], sz - P['eye_z']) < .045)
    thr = np.quantile(lum[near], .12); dark = near & (lum <= thr)
    c3 = pos[dark].mean(0); c3 = pos[dark][np.argmin(np.linalg.norm(pos[dark] - c3, axis=-1))]  # the dark texel nearest their middle: on the surface
    d = np.linalg.norm(pos - c3, axis=-1) * used
    d[~used] = 9
    iris = SM(d, P['iris_r'], .003) * (nrm[..., 1] < .2)  # front-facing (blender -y is forward)
    pupil = SM(d, P['pupil_r'], .002) * iris
    catch_at = c3 + np.array([side * -.002 + .003, -.004, .0055])  # up, a little to the viewer's left, toward the surface
    catch = SM(np.linalg.norm(pos - catch_at, axis=-1), P['catch_r'], .0015) * iris
    lifted = np.clip(col * P['iris_gain'], 0, 1) * (1 - P['iris_mix']) + np.array([.46, .30, .16], np.float32) * P['iris_mix']
    ring = (iris * (1 - pupil))[..., None]
    col = col * (1 - ring) + lifted * ring
    col = col * (1 - pupil[..., None]) + np.array([.035, .028, .024], np.float32) * pupil[..., None]
    col = col * (1 - catch[..., None]) + np.array([.96, .94, .9], np.float32) * catch[..., None]
    emis = np.maximum(emis, lifted * ring * P['iris_glow']); emis = np.maximum(emis, np.ones(3, np.float32) * catch[..., None] * P['catch_glow'])
    eyes.append(dict(side=side, pupil_head=[round(float(c3[0]), 4), round(float(c3[2]), 4), round(float(-c3[1]), 4)], iris_texels=int((iris > .5).sum()), catch_texels=int((catch > .5).sum())))

# ---- 5c. the cap brim (owner review: "the dark ragged band under the brim"): its underside (facing down) and its front edge get one
#          even colour from the cap's own top (`brim_dark`, `brim_edge` of it); the shading of the light does the rest
cap_top = np.median(col[cap & (nrm[..., 2] > .6) & used], axis=0)
under = cap & used & (nrm[..., 2] < -.05)
edge = cap & used & ~under & (np.abs(nrm[..., 2]) < .35) & (sy < -.2) & (sz < .315)
for m_, k_ in ((under, P['brim_dark']), (edge, P['brim_edge'])):
    w_ = m_.astype(np.float32); w_ = np.clip(box3(w_) / 9, 0, 1) * m_  # soft at the region's own border
    col = col * (1 - w_[..., None]) + (cap_top * k_)[None, None, :] * w_[..., None]
brim = dict(smoothed_verts=brim_verts, cap_top=np.round(cap_top, 3).tolist(), under=int(under.sum()), edge=int(edge.sum()))

# ---- 6. the neck tube (a separate surface, its UVs in the band at the bottom of the atlas)
X0, Y0, PW, PH = 2, 2, W - 4, BAND - 6
bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv.active
seg = P['seg']; zc, rx, rz = P['neck_zc'], P['neck_rx'], P['neck_rz']
ys = list(np.arange(P['neck_top'], P['neck_y'], -.02)) + [P['neck_y']] + list(np.arange(P['neck_y'] - .02, P['neck_bottom'], -.02)) + [P['neck_bottom']]
def kk(y): return 1.0 if y >= P['shrink_from'] else 1 - (1 - P['neck_shrink']) * min(1, (P['shrink_from'] - y) / P['shrink_len'])  # narrower under the collar: never through the open cardigan front
def sm(t): t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
def prof(y, a, b, c):  # collar (neck_y) -> mid_y -> neck_top: a at the collar, b at the nape's narrowest, c inside the skull
    if y <= P['mid_y']: return a + (b - a) * sm((y - P['neck_y']) / (P['mid_y'] - P['neck_y']))
    return b + (c - b) * sm((y - P['mid_y']) / (P['neck_top'] - P['mid_y']))
def ring_pt(j, y):  # a neck that tapers from the collar to the nape (visible under the skull from behind), then widens into the skull
    a = 2 * math.pi * j / seg; c, sn = math.cos(a), math.sin(a)
    rxx = prof(y, rx, P['mid_rx'], P['nape_rx']) if y > P['neck_y'] else rx
    rzz = (prof(y, P['neck_rzb'], P['mid_rzb'], P['nape_rz']) if y > P['neck_y'] else P['neck_rzb']) if c < 0 else rz
    return Vector((sn * rxx * kk(y), -(zc + c * rzz * kk(y)), y))
if not P['tube']: ys = ys[:2]  # tube=0 (negative control for tests/head-seams): only a stub inside the skull, the raw cut shows
rings = [[bm.verts.new(ring_pt(j, y)) for j in range(seg)] for y in ys]
tube = []
for r in range(len(rings) - 1):
    for j in range(seg):
        f = bm.faces.new((rings[r][j], rings[r + 1][j], rings[r + 1][(j + 1) % seg], rings[r][(j + 1) % seg])); f.smooth = True; tube.append((f, r, j))
bm.normal_update()
for f, r, j in tube:
    cm = f.calc_center_median()
    if f.normal.dot(Vector((cm.x, cm.y + zc, 0))) < 0: f.normal_flip()
    for l in f.loops:
        jv = next(q for q in range(seg) for rr in (r, r + 1) if rings[rr][q] is l.vert)
        rv = r if any(rings[r][q] is l.vert for q in range(seg)) else r + 1
        t = jv / seg
        if j == seg - 1 and jv == 0: t = 1.0  # the last column closes the ring at the strip's far end
        l[uvl].uv = Vector(((X0 + .5 + t * (PW - 1)) / W, (Y0 + .5 + (PH - 1) * (1 - rv / (len(rings) - 1))) / H))
# the strip's colours: the head's fur sampled round the neck a little above the collar, along each column's direction
bm.faces.ensure_lookup_table()
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc
headfaces = [f for f in bm.faces if f not in set(x[0] for x in tube)]
tmp = bmesh.new(); vmap = {}
for f in headfaces:
    vs = []
    for v in f.verts:
        if v not in vmap: vmap[v] = tmp.verts.new(v.co)
        vs.append(vmap[v])
    try: tmp.faces.new(vs)
    except ValueError: pass
tmp.faces.ensure_lookup_table(); tree = BVHTree.FromBMesh(tmp)
def texel(uv): return col[min(H - 1, max(0, int(uv.y * H))), min(W - 1, max(0, int(uv.x * W)))]
ring_col = []
for j in range(seg):
    a = 2 * math.pi * j / seg; acc_c = []
    for y in (P['neck_y'] + .07, P['neck_y'] + .1, P['neck_y'] + .13):  # the jaw line and the cheeks the neck meets (not the bust's dark lower cone)
        q = Vector((math.sin(a) * rx * 1.4, -(zc + math.cos(a) * rz * 1.4), y))
        loc, nrm, idx, dist = tree.find_nearest(q)
        if idx is None or idx >= len(headfaces): continue
        f = headfaces[idx]; wts = poly_3d_calc([v.co for v in f.verts], loc)
        uv = sum((l[uvl].uv * wgt for l, wgt in zip(f.loops, wts)), Vector((0, 0))); acc_c.append(texel(uv))
    ring_col.append(np.mean(acc_c, 0) if acc_c else fur_after)
tmp.free()
ring_col = np.array(ring_col) * .7 + fur_after * .3  # steadier: a third of the matched fur colour
for _ in range(6): ring_col = (np.roll(ring_col, 1, 0) + 2 * ring_col + np.roll(ring_col, -1, 0)) / 4
# the neck's fur (owner review: "give it the fur texture, not a plain colour"): strands of the head fur's own contrast (`strands` of
# it), long along the neck (a texel is ~1 mm across and ~5 mm along the tube), on the colours round the neck
rng = np.random.default_rng(7); nz_ = rng.normal(0, 1, (PH + 4, PW))
for _ in range(2): nz_ = (np.roll(nz_, 1, 1) + 2 * nz_ + np.roll(nz_, -1, 1)) / 4
for _ in range(3): nz_ = (np.roll(nz_, 1, 0) + 2 * nz_ + np.roll(nz_, -1, 0)) / 4
fine = rng.normal(0, 1, (PH + 4, PW)); fine = (np.roll(fine, 1, 0) + fine + np.roll(fine, -1, 0)) / 3
nz_ = nz_ / max(1e-6, nz_.std()) * .75 + fine / max(1e-6, fine.std()) * .45; nz_ /= max(1e-6, nz_.std())
amp = P['strands'] * fur_rel
for cx in range(PW):
    t = cx / (PW - 1) * seg; k0 = int(t) % seg; k1 = (k0 + 1) % seg; fr = t - int(t)
    base_c = ring_col[k0] * (1 - fr) + ring_col[k1] * fr
    col[Y0 - 2:Y0 + PH + 2, X0 + cx] = np.clip(base_c[None, :] * (1 + amp * np.clip(nz_[:, cx], -2.5, 2.5))[:, None], 0, 1)
col[Y0 - 2:Y0 + PH + 2, X0 - 2:X0] = col[Y0 - 2:Y0 + PH + 2, X0:X0 + 1]; col[Y0 - 2:Y0 + PH + 2, X0 + PW:X0 + PW + 2] = col[Y0 - 2:Y0 + PH + 2, X0 + PW - 1:X0 + PW]
bm.to_mesh(me); bm.free()
neck_tris = 2 * len(tube)
for poly in me.polygons: poly.use_smooth = True  # the head too (the remesh came out flat-shaded: facets on the cheeks)

# ---- 7. material and export
B = bpy.data.images.new('Bruno head', W, H); B.colorspace_settings.name = 'sRGB'
img = np.ones((H, W, 4), np.float32); img[..., :3] = col; B.pixels = img.ravel().tolist(); B.update()
if P['size'] < W: B.scale(P['size'], P['size'])
B.file_format = 'JPEG'
if P['debug']:
    os.makedirs(P['debug'], exist_ok=True)
    for im, name in ((cov, 'coverage'), (T1, 'source-padded'), (B0, 'baked'), (B, 'final')):
        im.filepath_raw = os.path.join(P['debug'], name + '.png'); im.file_format = 'PNG'; im.save()
    B.file_format = 'JPEG'
mat = bpy.data.materials.new('Bruno head'); nt = mat.node_tree if mat.node_tree else (setattr(mat, 'use_nodes', True) or mat.node_tree)
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = B
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = P['rough']; bsdf.inputs['Metallic'].default_value = 0
E = bpy.data.images.new('Bruno eyes glow', W, H); E.colorspace_settings.name = 'sRGB'
eimg = np.ones((H, W, 4), np.float32); eimg[..., :3] = np.clip(emis, 0, 1); E.pixels = eimg.ravel().tolist(); E.update()
if P['size'] < W: E.scale(P['size'], P['size'])
E.file_format = 'JPEG'
etex = nt.nodes.new('ShaderNodeTexImage'); etex.image = E
nt.links.new(etex.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = 1.0
me.materials.clear(); me.materials.append(mat)
bpy.data.objects.remove(S, do_unlink=True)
for im in (cov, POS, NRM, T1, B0): bpy.data.images.remove(im)

co = np.array([tuple(v.co) for v in me.vertices]); Hf = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
                          export_image_format='JPEG', export_jpeg_quality=P['quality'], export_animations=False, export_skins=False,
                          export_morph=False, export_extras=False, export_cameras=False, export_lights=False)
print('REPORT ' + json.dumps(dict(params=P, source_tris=src_tris, after_cut=cut_tris, head_tris=head_tris, neck_tris=neck_tris, tris=tris, verts=len(me.vertices),
                                  covered=round(covered, 3), uv_islands=n_islands, bake_missed=missed, inpainted_texels=filled, cracks_filled=crack_n, strip=[X0, Y0, PW, PH],
                                  fur=dict(median_before=np.round(med, 3).tolist(), after=np.round(fur_after, 3).tolist()), neck_colours=np.round(ring_col[::8], 3).tolist(),
                                  eye_texels=int((eye_w > .5).sum()), eyes=eyes, brim=brim, fur_rel=round(fur_rel, 3), cap_texels=int(cap.sum()), bounds=[Hf.min(0).round(4).tolist(), Hf.max(0).round(4).tolist()], bytes=os.path.getsize(out))))
