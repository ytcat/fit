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
  * The jowl (main review round 4: "walking, the jowl goes 2-3 cm into the towel"): the cheek fur below the jaw line (head-frame
    y < `jowl_y`) wider than `jowl_x` is drawn in towards `jowl_x` over `jowl_len` (smoothstep), so the bust's lower cheeks lie on
    the towel's top instead of in it; the neck tube was slimmed to match (`neck_rx`, `mid_rx`). tests/bruno-head.test.cjs probes
    every walking frame for contact (jowl_x=.5, the old cheek, fails it).
  * Round 5, the look pass (owner: "Bruno looked terrible ... I want him to look much more natural with more face details"):
    - detail: the source's relief (fur clumps, brow folds, muzzle and lip creases, nostrils, ear insides) baked as a tangent-space
      normal map (`nsize`, `nstrength`); the face (eyes, brows, muzzle, nose, mouth) unwrapped on its own with `face_share` of the
      atlas; the atlas baked at `size` (2048) px; `tris` 20k for the skin;
    - eyes: a glossy ball in each socket (`eye_r`, its front `eye_out` proud of the socket's pupil point), amber iris (`iris_a`),
      dark pupil (`pupil_a`), a catch-light (`glint_r`) and an upper lid with a dark lash rim (`lid_a`, `lid_r`) the page turns down
      to blink (nodes brunoEye*/brunoLid*); the painted iris and the glow map are gone;
    - colour and material: the reference's dark chocolate fur (`fur_base`, darker `fur_crown` on the crown and back, warmer
      `fur_cheek` on the cheeks), a warm `cream` muzzle and brows, a wet slate nose (`nose_rgb`, roughness .28), soft-sheen lips;
      a roughness map;
    - fur cards: a sparse ring of alpha-tested strands (cheeks, the chin's front, ear rims, nape; `cards`, `card_seed`), coloured
      from the fur they grow on, kept clear of the collar and towel (tests/bruno-head.test.cjs probes them);
    - mouth: the muzzle cut along the lip line (`mouth_y`, `mouth_x`), a dark lip line, a dark pocket with upper teeth and a tongue
      behind it, and a 'jaw' morph on the skin, the mouth and the fur (the lower jaw turned `jaw_angle` about a hinge at `jaw_y`,
      `jaw_z`; the corners stay shut) that the page drives from his speech;
    - proportion: `scale` .6 (was .63), chin and neck kept in place (`dy`, `dz`).
    - round 5b (main review): the nose's normal map replaced by fine pebbling (`pebble`) with two pressed-in, darker nostrils
      (`nostril`), roughness `nose_rough` (a broad highlight, not plastic); the brows pushed in (`brow_in`), their cream trimmed at
      the rim (`brow_trim`) and dimmed (`brow_dim`) so they do not hood the eyes; fuller strands and a front jowl ring of cards so the
      outline reads at film distance.
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
P = dict(scale=.6, dy=.124, dz=.0524, cut=-.12, tris=20000, quality=86, rough=.85, size=2048, nsize=1024, rsize=256, nquality=90, nstrength=1.0,
         mouth_y=.005, mouth_x=.092, mouth_front=.22, jaw_y=.06, jaw_z=.1, jaw_angle=.13,
         eye_r=.027, eye_out=.0075, eye_fwd=.55, iris_a=.88, pupil_a=.34, lid_a=.95, lid_r=1.07, glint_r=.0028,
         fur_crown='3a2e27', fur_cheek='5c4a3f', fur_base='4a3c33', cream='b8a689', nose_rgb='1f2429', cards=1, card_seed=5,
         face_share=.5, uv_pack_margin=.006, brow_in=.005, brow_dim=.82, brow_trim=.45, nose_rough=.4, pebble=1.0, nostril=1.0,
         neck_top=.1, neck_y=-.07, neck_zc=0.0, neck_rx=.185, neck_rz=.15, neck_rzb=.17, mid_y=-.01, mid_rx=.16, mid_rzb=.15, neck_bottom=-.2, neck_shrink=.72, shrink_from=-.065, shrink_len=.06, seg=48,
         fur=1.0, fur_contrast=.65, fur_rgb='6f4a31', eyes=1.4, eye_x=.122, eye_z=.108, eye_rx=.065, eye_rz=.05, crack=1, inpaint=1, band=64, margin=16, smooth=30, uv_angle=66.0, uv_margin=.004, remesh=.003, solid=.012, strands=.9, nape_rz=.24, nape_rx=.2, iris_r=.0135, pupil_r=.0048, catch_r=.0036, iris_gain=2.2, iris_mix=.45, iris_glow=.32, catch_glow=.95, brim_dark=.78, brim_edge=.85, brim_smooth=8, jowl_x=.165, jowl_y=-.005, jowl_len=.035, fur_lo=.55, tube=1, debug='')
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
W = H = P['size']  # the game atlas (every bake below) at `size` px; the source texture keeps its own size

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
# the jowl's underside (main review round 4: walking, the cheek fur under the jaw came down into the towel on his shoulder): below the
# jaw line the sides are drawn in toward the neck, to at most `jowl_x` from the middle, eased in over `jowl_len` below `jowl_y`
# (the underside only: from the front and the side the cheeks above keep their shape)
bm = bmesh.new(); bm.from_mesh(me); jowl_n = 0
for v in bm.verts:
    y, ax = v.co.z, abs(v.co.x)
    if y > P['jowl_y'] or ax <= P['jowl_x']: continue
    t = min(1.0, (P['jowl_y'] - y) / P['jowl_len']); f = t * t * (3 - 2 * t)
    v.co.x = math.copysign(ax - (ax - P['jowl_x']) * f, v.co.x); jowl_n += 1
bm.to_mesh(me); bm.free()
# the brim's lip: the voxels left it lumpy (a ragged dark edge over the eyes in close-ups); its vertices are smoothed in place
bm = bmesh.new(); bm.from_mesh(me)
def in_brim(co): x, y, z = co.x / s, (co.y + P['dz']) / s, (co.z - P['dy']) / s; return abs(x) < .33 and y < -.1 and .22 < z < .335
lip = [v for v in bm.verts if in_brim(v.co)]
for _ in range(P['brim_smooth']): bmesh.ops.smooth_vert(bm, verts=lip, factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(me); bm.free(); brim_verts = len(lip)
# the brows (main review round 5: "tone them down ... so they don't hood the eyes"): the bulge over each eye pushed in along its
# normal, up to `brow_in` at its middle, fading out to the cap's brim above and the eye below
bm = bmesh.new(); bm.from_mesh(me); bm.normal_update(); brow_n = 0
for v in bm.verts:
    hx, hy, hz = v.co.x, v.co.z, -v.co.y
    if hz < .15 or not (.2 < hy < .262) or not (.03 < abs(hx) < .165): continue
    w = math.sin(math.pi * (hy - .2) / .062) * min(1.0, (abs(hx) - .03) / .02, (.165 - abs(hx)) / .03)
    v.co -= v.normal * P['brow_in'] * max(0.0, w); brow_n += 1
bm.to_mesh(me); bm.free()
# the mouth (round 5: "a featureless mouth"; the jaw opens when he talks): the muzzle is cut along the lip line (head-frame y `mouth_y`,
# |x| < `mouth_x`, the front only) and the cut opened into a slit; the lower lip's copies ride the jaw morph (section 8), the corners
# stay closed. A mouth (dark inside, upper teeth, tongue) sits behind it inside the head.
MY, MX = P['mouth_y'], P['mouth_x']
bm = bmesh.new(); bm.from_mesh(me)
reg = [f for f in bm.faces if all(abs(v.co.x) < MX + .03 and -v.co.y > P['mouth_front'] and abs(v.co.z - MY) < .02 for v in f.verts)]
geom = list({e for f in reg for e in f.edges}) + list({v for f in reg for v in f.verts}) + reg
res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector((0, 0, MY)), plane_no=Vector((0, 0, 1)))
slit = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and all(abs(v.co.x) < MX and abs(v.co.z - MY) < 1e-6 for v in e.verts)]
bmesh.ops.split_edges(bm, edges=slit)
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
bm.to_mesh(me); bm.free(); mouth = dict(slit_edges=len(slit))

# ---- 3. new UVs with margins: Smart UV Project on a smoothed copy (the fur relief would split it into thousands of islands; same
#         topology, so its UVs map corner for corner), into v BAND/H..1 (the band below holds the neck's colours)
BAND = P['band'] * H // 1024; V0 = BAND / H
Ls = bpy.data.objects.new('smooth', me.copy()); scn.collection.objects.link(Ls)
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = Ls; Ls.select_set(True)
sm = Ls.modifiers.new('sm', 'SMOOTH'); sm.factor = 1.0; sm.iterations = P['smooth']; bpy.ops.object.modifier_apply(modifier=sm.name)
Ls.data.uv_layers.new(name='UVMap')
# round 5 ("more face details"): the face (eyes, brows, muzzle, nose, mouth) is unwrapped on its own and given `face_share` of the
# atlas (texel density raised against the cap, ears and back of the head), then everything is packed together
def is_face(c, n): hx, hy, hz = c.x, c.z, -c.y; return hz > .1 and abs(hx) < .19 and -.07 < hy < .275 and -n.y > .25
face_sel = np.array([is_face(p.center, p.normal) for p in me.polygons])
def smart(sel):
    bpy.ops.object.mode_set(mode='EDIT'); bmx = bmesh.from_edit_mesh(Ls.data); bmx.faces.ensure_lookup_table()
    for f in bmx.faces: f.select_set(False)
    for f, k in zip(bmx.faces, sel): f.select_set(bool(k))
    bmx.select_flush_mode(); bmesh.update_edit_mesh(Ls.data)
    bpy.ops.uv.smart_project(angle_limit=math.radians(P['uv_angle']), island_margin=P['uv_margin'], area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.object.mode_set(mode='OBJECT')
smart(face_sel); smart(~face_sel)
uvs = np.zeros(len(Ls.data.loops) * 2, np.float32); Ls.data.uv_layers[0].data.foreach_get('uv', uvs); uvs = uvs.reshape(-1, 2)
loop_poly = np.zeros(len(Ls.data.loops), int)
for p in me.polygons: loop_poly[p.loop_start:p.loop_start + p.loop_total] = p.index
def uv_area(u):
    a = np.zeros(len(me.polygons))
    for p in me.polygons:
        q = u[p.loop_start:p.loop_start + p.loop_total]; a[p.index] = .5 * abs(np.dot(q[:, 0], np.roll(q[:, 1], -1)) - np.dot(q[:, 1], np.roll(q[:, 0], -1)))
    return a
A3 = np.array([p.area for p in me.polygons]); Auv = uv_area(uvs)
dens_f, dens_r = Auv[face_sel].sum() / A3[face_sel].sum(), Auv[~face_sel].sum() / A3[~face_sel].sum()
want = A3[~face_sel].sum() / A3[face_sel].sum() * P['face_share'] / (1 - P['face_share'])  # face density / rest density
uvs[face_sel[loop_poly]] *= math.sqrt(want * dens_r / dens_f)
Ls.data.uv_layers[0].data.foreach_set('uv', uvs.ravel())
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
try: bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=P['uv_pack_margin'], shape_method='CONCAVE')
except TypeError: bpy.ops.uv.pack_islands(rotate=True, margin=P['uv_pack_margin'])
bpy.ops.object.mode_set(mode='OBJECT')
uvs = np.zeros(len(Ls.data.loops) * 2, np.float32); Ls.data.uv_layers[0].data.foreach_get('uv', uvs); uvs = uvs.reshape(-1, 2)
Auv = uv_area(uvs); face_share = float(Auv[face_sel].sum() / Auv.sum())
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
# round 5 ("smooth and blobby ... the remesh threw away the source's detail"): the 98k source's relief (fur clumps, brow folds,
# muzzle and lip creases, nostrils, ear insides) as a tangent-space normal map on the game mesh, same rays as the colour
NB = bpy.data.images.new('normal bake', W, H, float_buffer=True); NB.colorspace_settings.name = 'Non-Color'
nm_ = emit_material('ntarget', lambda nt, e: None); tn = nm_.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = NB
for n in nm_.node_tree.nodes: n.select = False
tn.select = True; nm_.node_tree.nodes.active = tn; me.materials.append(nm_)
bpy.ops.object.select_all(action='DESELECT'); S.select_set(True); L.select_set(True); bpy.context.view_layer.objects.active = L
bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', margin=P['margin'], margin_type='EXTEND', use_selected_to_active=True, cage_extrusion=.012, max_ray_distance=.03, use_clear=True)
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
hexc = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
def smn(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
hx_, hy_, hz_ = pos[..., 0], pos[..., 2], -pos[..., 1]  # the head frame
sel = (fur_w > .8) & used
med = np.median(col[sel], axis=0)
ratio = np.clip(np.maximum(col, 1e-4) / np.maximum(med, 1e-4), P['fur_lo'], 2.0)  # the darkest streaks read as smudges once the fur is lighter
# round 5 (owner: "much more natural"; the reference's dark chocolate fur, seed 11): darker on the crown and the back of the head,
# lighter and warmer on the cheeks (no orange cast: the saturation stays near the reference's ~0.4)
cheek_w = smn((hz_ + .02) / .12) * smn((.17 - hy_) / .1) * smn((np.abs(hx_) - .06) / .06)
crown_w = np.maximum(smn((hy_ - .16) / .1), smn((-.05 - hz_) / .12)) * (1 - cheek_w)
tgt = hexc(P['fur_base'])[None, None] * (1 - cheek_w - crown_w)[..., None] + hexc(P['fur_crown']) * crown_w[..., None] + hexc(P['fur_cheek']) * cheek_w[..., None]
fur_col = tgt * ratio ** P['fur_contrast']  # the median lands on the target; darker/lighter strands keep a softened contrast
k = (fur_w * P['fur'])[..., None]
col = np.clip(col * (1 - k) + fur_col * k, 0, 1)
lum = col @ LUM
# the muzzle, brows and ear insides: the source's cold grey-white to the reference's warm cream (its own shading kept)
light_w = np.clip((lum - .3) / .12, 0, 1) * (~cap) * used * (1 - eye_zone)
lmed = np.median(lum[light_w > .9]) if (light_w > .9).any() else .5
cream = hexc(P['cream'])[None, None] * (np.maximum(lum, 1e-4) / lmed)[..., None] ** .85
col = np.clip(col * (1 - light_w[..., None]) + cream * light_w[..., None], 0, 1)
# the brows smaller and dimmer (main review round 5): the cream above the eyes eroded at its rim (`brow_trim`; the rim goes to the
# fur round it) and dimmed (`brow_dim`)
brow_m = (light_w > .05) & (hy_ > .198) & (hy_ < .265) & (hz_ > .12) & (np.abs(hx_) > .035)
bk = brow_m.astype(np.float32)
for _ in range(4): bk = box3(bk) / 9
keep_b = np.clip((bk - P['brow_trim']) / .25, 0, 1) * brow_m; trim_b = (light_w * brow_m) * (1 - keep_b)
col = col * (1 - trim_b[..., None]) + np.clip(fur_col * 1.05, 0, 1) * trim_b[..., None]
col = col * (1 - (1 - P['brow_dim']) * keep_b[..., None])
# the nose: wet dark slate (glossy in the roughness map); the lip line along the mouth's cut, the lower lip a shade darker
nose_m = used & (np.abs(hx_) < .09) & (hy_ > .035) & (hy_ < .17) & (hz_ > .27) & (lum < .3)
nlum = np.median(lum[nose_m]) if nose_m.any() else .06
col[nose_m] = np.clip(hexc(P['nose_rgb']) * (np.maximum(lum[nose_m], 1e-4) / nlum)[:, None] ** .7, 0, 1)
# two clear nostrils on the nose's lower front (from the nose's own extent): darker, pressed in (normal map), less glossy
ny0 = hy_[nose_m].min() if nose_m.any() else .05
nostril_w = np.zeros_like(lum)
for sd_ in (-1, 1):
    e_ = np.hypot((hx_ - sd_ * .027) / .0125, (hy_ - (ny0 + .019)) / .0075)
    nostril_w = np.maximum(nostril_w, np.clip((1.15 - e_) / .3, 0, 1) * nose_m)
col = col * (1 - .75 * nostril_w[..., None])
front_m = used & (hz_ > P['mouth_front']) & (np.abs(hx_) < MX + .012)
lip_d = np.abs(hy_ - MY)
lipline = front_m * np.clip((.0035 - lip_d) / .0015, 0, 1)
lower_lip = front_m * smn((MY - hy_) / .002) * smn((hy_ - (MY - .009)) / .003) * (1 - lipline)
col = col * (1 - lipline[..., None]) + np.array([.09, .06, .05], np.float32) * lipline[..., None]
col = col * (1 - .25 * lower_lip[..., None])
col = np.clip(col * (1 - .45 * eye_w[..., None]), 0, 1)  # the sockets darker: the eyeballs (section 8) sit in shadow, not on grey
fur_after = np.median(col[sel], axis=0)
lum = col @ LUM
fur_rel = float(np.std(lum[sel]) / max(1e-4, np.median(lum[sel])))  # the fur's own strand contrast, for the neck strip

# ---- 5b. the eyes (round 5: real eyeballs in the sockets, section 8; the painted iris and glow are gone): each socket's pupil point
#          (the darkest texels round the eye) and its facing; a dark lid line along the socket's upper rim
eyes = []; sockets = []; nrm_img = nrm  # (section 6 reuses the name `nrm`)
for side in (-1, 1):
    near = used & (sy < -.08) & (np.hypot(sx - side * P['eye_x'], sz - P['eye_z']) < .045)
    thr = np.quantile(lum[near], .12); dark = near & (lum <= thr)
    c3 = pos[dark].mean(0); c3 = pos[dark][np.argmin(np.linalg.norm(pos[dark] - c3, axis=-1))]  # the dark texel nearest their middle: on the surface
    nn = nrm[near & (np.linalg.norm(pos - c3, axis=-1) < .012)].mean(0); nn = nn / max(1e-6, np.linalg.norm(nn))
    d = np.linalg.norm(pos - c3, axis=-1); d[~used] = 9
    rim = np.clip(1 - np.abs(d - P['eye_r'] * .95) / .0035, 0, 1) * smn((pos[..., 2] - c3[2]) / .007) * (d < .04)
    col = col * (1 - .75 * rim[..., None])
    sockets.append((side, Vector(c3.tolist()), Vector(nn.tolist())))

# ---- 5c. the cap brim (owner review: "the dark ragged band under the brim"): its underside (facing down) and its front edge get one
#          even colour from the cap's own top (`brim_dark`, `brim_edge` of it); the shading of the light does the rest
cap_top = np.median(col[cap & (nrm[..., 2] > .6) & used], axis=0)
under = cap & used & (nrm[..., 2] < -.05)
edge = cap & used & ~under & (np.abs(nrm[..., 2]) < .35) & (sy < -.2) & (sz < .315)
for m_, k_ in ((under, P['brim_dark']), (edge, P['brim_edge'])):
    w_ = m_.astype(np.float32); w_ = np.clip(box3(w_) / 9, 0, 1) * m_  # soft at the region's own border
    col = col * (1 - w_[..., None]) + (cap_top * k_)[None, None, :] * w_[..., None]
brim = dict(brow_verts=brow_n, jowl_verts=jowl_n, smoothed_verts=brim_verts, cap_top=np.round(cap_top, 3).tolist(), under=int(under.sum()), edge=int(edge.sum()))

n_head_polys, n_head_verts = len(me.polygons), len(me.vertices)
# ---- 6. the neck tube (a separate surface, its UVs in the band at the bottom of the atlas)
X0, Y0, PW, PH = 2, 2, W - 4, BAND - 6
bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv.active
seg = P['seg']; zc, rx, rz = P['neck_zc'], P['neck_rx'], P['neck_rz']
ys = list(np.arange(P['neck_top'], P['neck_y'], -.02)) + [P['neck_y']] + list(np.arange(P['neck_y'] - .02, P['neck_bottom'], -.02)) + [P['neck_bottom']]
def kk(y, c=1.0): # narrower under the collar at the front only (never through the open cardigan front); the sides and back stay full,
    # so no step shows where the collar sits lower (arm raised, head up; main review round 3)
    if y >= P['shrink_from']: return 1.0
    f = max(0.0, min(1.0, (c - .2) / .5)); t = min(1.0, (P['shrink_from'] - y) / P['shrink_len']); t = t * t * (3 - 2 * t)
    return 1 - (1 - P['neck_shrink']) * t * f
def sm(t): t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
def prof(y, a, b, c):  # collar (neck_y) -> mid_y -> neck_top: a at the collar, b at the nape's narrowest, c inside the skull
    if y <= P['mid_y']: return a + (b - a) * sm((y - P['neck_y']) / (P['mid_y'] - P['neck_y']))
    return b + (c - b) * sm((y - P['mid_y']) / (P['neck_top'] - P['mid_y']))
def ring_pt(j, y):  # a neck that tapers from the collar to the nape (visible under the skull from behind), then widens into the skull
    a = 2 * math.pi * j / seg; c, sn = math.cos(a), math.sin(a)
    rxx = prof(y, rx, P['mid_rx'], P['nape_rx']) if y > P['neck_y'] else rx
    rzz = (prof(y, P['neck_rzb'], P['mid_rzb'], P['nape_rz']) if y > P['neck_y'] else P['neck_rzb']) if c < 0 else rz
    k_ = kk(y, math.cos(a)); return Vector((sn * rxx * k_, -(zc + c * rzz * k_), y))
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

# ---- 7. textures and the head's material: base colour (`size`), the baked relief as a normal map (`nsize`, `nstrength`), roughness
#         (`rsize`: rough fur and cap, a softer cream muzzle, soft-sheen lips, a wet glossy nose)
def srgb_lin(c): c = np.asarray(c, np.float32); return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
import tempfile
TMP = tempfile.mkdtemp()
def to_img(name, arr, size, fmt, colour=True, save=0):  # save: written as a JPEG of that quality, so the GLB carries that file
    h, w = arr.shape[:2]; im = bpy.data.images.new(name, w, h, alpha=arr.shape[2] == 4); im.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    a = np.ones((h, w, 4), np.float32); a[..., :arr.shape[2]] = arr; im.pixels = a.ravel().tolist(); im.update()
    if size < w: im.scale(size, size * h // w)
    im.file_format = fmt
    if save:
        fp = os.path.join(TMP, name.replace(' ', '-') + '.jpg'); im.filepath_raw = fp
        try: im.save(filepath=fp, quality=save)
        except TypeError: im.save()
        im2 = bpy.data.images.load(fp); im2.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'; im2.name = name
        bpy.data.images.remove(im); im = im2
    return im
B = to_img('Bruno head', col, P['size'], 'JPEG', save=P['quality'])
nv = pixels(NB)[..., :3] * 2 - 1; ln = np.linalg.norm(nv, axis=-1); flat = np.array([0, 0, 1], np.float32)
bad = (ln < .5) | ~used; normal_missed = int((bad & used).sum())
nv = np.where(bad[..., None], flat, nv / np.maximum(ln, 1e-6)[..., None])
nv = flat * (1 - P['nstrength']) + nv * P['nstrength']; nv /= np.linalg.norm(nv, axis=-1, keepdims=True)
nv[Y0 - 2:Y0 + PH + 2, :] = flat  # the neck band: flat (its strands are in the colour)
# the nose (main review round 5: "crumpled black plastic wrap"): the source's wrinkle noise replaced by fine pebbling (cells ~2 mm,
# from the position, so it is even across the island) and the two nostrils pressed in; the normal from the texel gradient of that
# height (tangent space: u, v)
rng_n = np.random.default_rng(11); G = rng_n.normal(0, 1, (64, 64, 64)).astype(np.float32)
def vnoise(p, cell):
    q = p / cell; i0 = np.floor(q).astype(int); f = q - i0; f = f * f * (3 - 2 * f); out_ = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                out_ = out_ + w * G[(i0[..., 0] + dx) % 64, (i0[..., 1] + dy) % 64, (i0[..., 2] + dz) % 64]
    return out_
nose_soft = box3(box3(nose_m.astype(np.float32))) / 81
hgt = -2.2 * nostril_w * P['nostril']; on_ = nose_soft > 0
hgt[on_] += (np.abs(vnoise(pos[on_], .0022)) * .7 + vnoise(pos[on_], .0045) * .3) * P['pebble'] * nose_soft[on_]
gu = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) / 2; gv = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) / 2
pn = np.stack([-gu * .9, -gv * .9, np.ones_like(gu)], -1); pn /= np.linalg.norm(pn, axis=-1, keepdims=True)
inside_n = (box3(nose_m.astype(np.float32)) > 8.5)[..., None]
nv = np.where(inside_n, pn, nv * (1 - nose_soft[..., None]) + pn * nose_soft[..., None]); nv /= np.linalg.norm(nv, axis=-1, keepdims=True)
N = to_img('Bruno head normal', nv * .5 + .5, P['nsize'], 'JPEG', colour=False, save=P['nquality'])
rough = np.full(lum.shape, P['rough'], np.float32)
rough[cap] = .9; rough = rough * (1 - .15 * light_w)
lipm = np.clip(lipline + lower_lip, 0, 1); rough = rough * (1 - lipm) + .5 * lipm
rough[nose_m] = P['nose_rough']
rough[nostril_w > .3] = .6
R = to_img('Bruno head roughness', np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1), P['rsize'], 'JPEG', colour=False, save=P['quality'])
if P['debug']:
    os.makedirs(P['debug'], exist_ok=True)
    for im, name in ((cov, 'coverage'), (T1, 'source-padded'), (B0, 'baked'), (B, 'final'), (N, 'normal')):
        cp = im.copy(); cp.filepath_raw = os.path.join(P['debug'], name + '.png'); cp.file_format = 'PNG'; cp.save(); bpy.data.images.remove(cp)
def new_mat(name, cull=True):
    m = bpy.data.materials.new(name); nt = m.node_tree if m.node_tree else (setattr(m, 'use_nodes', True) or m.node_tree)
    m.use_backface_culling = cull; return m, nt, next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
mat, nt, bsdf = new_mat('Bruno head')
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = B; nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
ntex = nt.nodes.new('ShaderNodeTexImage'); ntex.image = N; nmap = nt.nodes.new('ShaderNodeNormalMap'); nmap.uv_map = 'UVMap'; nmap.inputs['Strength'].default_value = 1.0
nt.links.new(ntex.outputs['Color'], nmap.inputs['Color']); nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
rtex = nt.nodes.new('ShaderNodeTexImage'); rtex.image = R; sep = nt.nodes.new('ShaderNodeSeparateColor')
nt.links.new(rtex.outputs['Color'], sep.inputs['Color']); nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
bsdf.inputs['Metallic'].default_value = 0
me.materials.clear(); me.materials.append(mat)
def plain(name, hexrgb, rough_, emit=0.0, cull=True):
    m, nt_, b = new_mat(name, cull); c = srgb_lin(hexc(hexrgb)).tolist()
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough_; b.inputs['Metallic'].default_value = 0
    if emit: b.inputs['Emission Color'].default_value = (*c, 1); b.inputs['Emission Strength'].default_value = emit
    return m

# ---- 8. the parts that make the face live (round 5): the mouth behind the lip cut, real eyes with lids, a ring of fur cards, the jaw
from mathutils import Matrix
from mathutils.bvhtree import BVHTree
hv = [v.co.copy() for v in me.vertices]; tree = BVHTree.FromPolygons(hv, [tuple(p.vertices) for p in me.polygons])
def sd(p):  # signed distance to the head's skin (negative inside)
    loc, n, i, d = tree.find_nearest(p); return (p - loc).dot(n) if loc is not None else 1.0
HB = lambda hx, hy, hz: Vector((hx, -hz, hy))  # head frame -> Blender coords
def mk_obj(name, verts, faces, mats, fmat, uvs_=None, out_from=None):
    m = bpy.data.meshes.new(name); m.from_pydata([tuple(v) for v in verts], [], faces); m.update()
    if out_from is not None:  # outward faces (the page draws front faces only)
        bmo = bmesh.new(); bmo.from_mesh(m); bmo.normal_update()
        bmesh.ops.reverse_faces(bmo, faces=[f_ for f_ in bmo.faces if (f_.calc_center_median() - out_from).dot(f_.normal) < 0]); bmo.to_mesh(m); bmo.free(); m.update()
    for mt in mats: m.materials.append(mt)
    for p_, k_ in zip(m.polygons, fmat): p_.material_index = k_; p_.use_smooth = True
    if uvs_ is not None:
        uvl_ = m.uv_layers.new(name='UVMap')
        for p_ in m.polygons:
            for li in range(p_.loop_start, p_.loop_start + p_.loop_total): uvl_.data[li].uv = uvs_[m.loops[li].vertex_index]
    o = bpy.data.objects.new(name, m); scn.collection.objects.link(o); return o
def ellipsoid(c, r, seg=20, ring=12):
    vs = [c + Vector((0, 0, r[2]))]
    for i in range(1, ring):
        th = math.pi * i / ring
        for j in range(seg): ph = 2 * math.pi * j / seg; vs.append(c + Vector((r[0] * math.sin(th) * math.cos(ph), r[1] * math.sin(th) * math.sin(ph), r[2] * math.cos(th))))
    vs.append(c - Vector((0, 0, r[2]))); fs = []; last = len(vs) - 1
    for j in range(seg): fs.append((0, 1 + j, 1 + (j + 1) % seg))
    for i in range(ring - 2):
        for j in range(seg): a0 = 1 + i * seg; fs.append((a0 + j, a0 + seg + j, a0 + seg + (j + 1) % seg, a0 + (j + 1) % seg))
    a0 = 1 + (ring - 2) * seg
    for j in range(seg): fs.append((a0 + j, last, a0 + (j + 1) % seg))
    return vs, fs
def fit_inside(build, margin):  # shrinks a part about its centre until every vertex is `margin` inside the skin
    f = 1.0
    for _ in range(25):
        vs, fs = build(f)
        if max(sd(v) for v in vs) < -margin: return vs, fs, f
        f *= .94
    return vs, fs, f
sm1 = lambda t: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, t)))
def jaw_w(co, lower=False):  # how much of the jaw's turn a point of the skin takes
    hx, hy, hz = co.x, co.z, -co.y
    if hy > MY + 1e-6 or (abs(hy - MY) <= 1e-6 and not lower): return 0.0
    return (1 - sm1((abs(hx) - (MX - .015)) / .05)) * sm1((hz - .1) / .14)
def jaw_d(co, w):  # the jaw turned open by `jaw_angle` about a hinge (head frame y `jaw_y`, z `jaw_z`), times w
    hy, hz = co.z, -co.y; dy, dz = hy - P['jaw_y'], hz - P['jaw_z']; a = P['jaw_angle']
    ny_, nz_ = dy * math.cos(a) - dz * math.sin(a), dy * math.sin(a) + dz * math.cos(a)
    return Vector((0, -(nz_ - dz) * w, (ny_ - dy) * w))
def add_jaw(o, weights):
    o.shape_key_add(name='Basis', from_mix=False); k = o.shape_key_add(name='jaw', from_mix=False)
    k.value = 0.0  # closed at rest (the page drives it)
    for i, v in enumerate(o.data.vertices): k.data[i].co = v.co + jaw_d(v.co, weights[i])
# the mouth: a dark pocket behind the lips, the upper teeth just behind the upper lip, a tongue on the pocket's floor
hit = tree.ray_cast(HB(0, MY + .0005, 1.0), Vector((0, 1, 0)))[0]; zl = -hit.y if hit is not None else .32
def pocket(f): return ellipsoid(HB(0, MY - .004, zl - .045), Vector((.075, .045, .034)) * f)
def tongue(f): return ellipsoid(HB(0, MY - .019, zl - .03), Vector((.042, .03, .011)) * f, 16, 8)
def teeth(f):
    vs, fs = [], []
    for i, t in enumerate(np.linspace(-1, 1, 15)):
        x = .05 * t * f; z = zl - .009 - .03 * t * t
        vs += [HB(x, MY + .004, z), HB(x, MY - .006 * f, z)]
        if i: fs.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    return vs, fs
pv, pf, pk = fit_inside(pocket, .003); tv, tf, tk = fit_inside(tongue, .002); qv, qf, qk = fit_inside(teeth, .0015)
mv = pv + tv + qv; mf = pf + [tuple(i + len(pv) for i in f) for f in tf] + [tuple(i + len(pv) + len(tv) for i in f) for f in qf]
MO = mk_obj('brunoMouth', mv, mf, [plain('Bruno mouth', '2a1012', .6), plain('Bruno tongue', '8a3a3a', .45), plain('Bruno teeth', 'e6dcc6', .35, cull=False)],
            [0] * len(pf) + [1] * len(tf) + [2] * len(qf), out_from=None)
add_jaw(MO, [sm1((MY - v.z) / .012) for v in pv] + [1.0] * len(tv) + [0.0] * len(qv))
mouth.update(lip_z=round(zl, 4), pocket=round(pk, 3), tongue=round(tk, 3), teeth=round(qk, 3))
# the eyes: a glossy ball in each socket (amber iris, dark pupil, a catch-light), its front `eye_out` proud of the socket's pupil
# point, looking `eye_fwd` of the way from the socket's facing to straight ahead; an upper lid (fur, a dark lash rim) the page turns
# down to blink (node brunoLid*, about its own x axis)
fur_near = []
ball_m = [plain('Bruno pupil', '070505', .12), plain('Bruno iris', 'b0712e', .18, emit=P['iris_glow']), plain('Bruno eye', '1d1612', .16)]
glint_m = plain('Bruno catch-light', 'fffaf0', .2, emit=1.0)
for side, c3, nn in sockets:
    Rr = P['eye_r']; f = (nn * (1 - P['eye_fwd']) + Vector((0, -1, 0)) * P['eye_fwd']).normalized()
    u = (Vector((0, 0, 1)) - f * f.z).normalized(); r = u.cross(f); cen = c3 - f * (Rr - P['eye_out'])
    M = Matrix((r, u, f)).transposed().to_4x4(); M.translation = cen
    tag = 'L' if side > 0 else 'R'
    E_ = bpy.data.objects.new('brunoEye' + tag, None); scn.collection.objects.link(E_); E_.matrix_world = M
    A = [0, .1, .2, P['pupil_a'], .4, .55, P['iris_a'], .8, .95, 1.15, 1.4, 1.7, 2.0, 2.4, 2.8, math.pi]; SEG = 32
    vs = [Vector((0, 0, Rr))]
    for a in A[1:-1]:
        for j in range(SEG): ph = 2 * math.pi * j / SEG; vs.append(Vector((Rr * math.sin(a) * math.cos(ph), Rr * math.sin(a) * math.sin(ph), Rr * math.cos(a))))
    vs.append(Vector((0, 0, -Rr))); fs, fm = [], []; band = lambda a: 0 if a <= P['pupil_a'] + 1e-6 else 1 if a <= P['iris_a'] + 1e-6 else 2
    for j in range(SEG): fs.append((0, 1 + j, 1 + (j + 1) % SEG)); fm.append(band(A[1]))
    for i in range(len(A) - 3):
        for j in range(SEG): a0 = 1 + i * SEG; fs.append((a0 + j, a0 + SEG + j, a0 + SEG + (j + 1) % SEG, a0 + (j + 1) % SEG)); fm.append(band(A[i + 2]))
    a0 = 1 + (len(A) - 3) * SEG
    for j in range(SEG): fs.append((a0 + j, len(vs) - 1, a0 + (j + 1) % SEG)); fm.append(2)
    ball = mk_obj('brunoEyeBall' + tag, vs, fs, ball_m, fm, out_from=Vector()); ball.parent = E_; ball.matrix_parent_inverse.identity(); ball.matrix_basis.identity()
    gd = Vector((.5, .85, 0)).normalized(); gc = (gd * math.sin(.33) + Vector((0, 0, 1)) * math.cos(.33)) * Rr * 1.004
    gn = gc.normalized(); gx = gn.cross(Vector((0, 1, 0))).normalized(); gy = gn.cross(gx)
    gv = [gc] + [gc + (gx * math.cos(2 * math.pi * j / 10) + gy * math.sin(2 * math.pi * j / 10)) * P['glint_r'] for j in range(10)]
    gl = mk_obj('brunoGlint' + tag, gv, [(0, 1 + j, 1 + (j + 1) % 10) for j in range(10)], [glint_m], [0] * 10, out_from=Vector()); gl.parent = E_; gl.matrix_parent_inverse.identity(); gl.matrix_basis.identity()
    # the lid's fur colour: the socket's upper surround
    d_ = np.linalg.norm(pos - np.array(c3), axis=-1); ring_ = used & (d_ > .026) & (d_ < .042) & (pos[..., 2] > c3.z + .006)
    ring_ &= lum < .3  # the fur round the socket, not the cream brow above it
    lid_c = np.median(col[ring_], axis=0) * .9 if ring_.any() else fur_after; fur_near.append(lid_c)
    lid_m = [plain('Bruno lid ' + tag, '%02x%02x%02x' % tuple(int(v * 255) for v in lid_c), .9, cull=False), plain('Bruno lash ' + tag, '120c0a', .7, cull=False)]
    Rl = Rr * P['lid_r']; AL = np.linspace(-.5, P['lid_a'], 12); BL = np.linspace(-1.3, 1.3, 15); lv = []
    for al in AL:
        for be in BL: lv.append(Vector((math.sin(be), math.cos(be) * math.cos(al), math.cos(be) * math.sin(al))) * Rl)
    lf, lm = [], []
    for i in range(len(AL) - 1):
        for j in range(len(BL) - 1): a0 = i * len(BL) + j; lf.append((a0, a0 + 1, a0 + len(BL) + 1, a0 + len(BL))); lm.append(1 if AL[i + 1] > P['lid_a'] - .12 else 0)
    lid = mk_obj('brunoLid' + tag, lv, lf, lid_m, lm, out_from=Vector()); lid.parent = E_; lid.matrix_parent_inverse.identity(); lid.matrix_basis.identity()
    pokes = sum(1 for v in vs if math.acos(max(-1, min(1, v.z / Rr))) > P['iris_a'] + .3 and sd(M @ v) > .0005)
    front = M @ Vector((0, 0, Rr))
    eyes.append(dict(side=side, pupil_head=[round(front.x, 4), round(front.z, 4), round(-front.y, 4)], centre_head=[round(cen.x, 4), round(cen.z, 4), round(-cen.y, 4)], ball_pokes=pokes,
                     lid_colour=np.round(lid_c, 3).tolist()))
# a sparse ring of fur cards on the silhouette (cheeks and jowls, under the chin, the ear rims, the nape): alpha-tested strands, the
# colours of the fur they grow from, combed down and back, tips tilted out of the skin
rng = np.random.default_rng(P['card_seed'])
cen_p = np.array([tuple(p.center) for p in me.polygons][:n_head_polys]); nrm_p = np.array([tuple(p.normal) for p in me.polygons][:n_head_polys]); ar_p = np.array([p.area for p in me.polygons][:n_head_polys])
hx, hy, hz = cen_p[:, 0], cen_p[:, 2], -cen_p[:, 1]; nx, ny, nz = nrm_p[:, 0], nrm_p[:, 2], -nrm_p[:, 1]
tx_n = np.stack([nrm_img[..., 0], nrm_img[..., 2], -nrm_img[..., 1]], -1)
REG = [('cheek', (np.abs(hx) > .13) & (hy > .045) & (hy < .15) & (hz > -.06) & (hz < .24) & (np.sign(hx) * nx > .55), 60, .046, .022, .75, (0, -1, -.5),
        used & (np.abs(hx_) > .13) & (hy_ > .045) & (hy_ < .15) & (hz_ > -.06) & (hz_ < .24) & (np.sign(hx_) * tx_n[..., 0] > .55)),
       ('jowl', (np.abs(hx) > .16) & (hy > .02) & (hy <= .045) & (hz > .035) & (hz < .2) & (np.sign(hx) * nx > .6), 20, .03, .02, 1.05, (0, -.3, -1),
        used & (np.abs(hx_) > .16) & (hy_ > .02) & (hy_ <= .045) & (hz_ > .035) & (hz_ < .2) & (np.sign(hx_) * tx_n[..., 0] > .6)),
       ('chin', (hy > -.032) & (hy < -.005) & (hz > .25) & (np.abs(hx) < .1) & (ny < -.2), 12, .01, .012, .6, (0, -1, 1.0),
        used & (hy_ > -.032) & (hy_ < -.005) & (hz_ > .25) & (np.abs(hx_) < .1) & (tx_n[..., 1] < -.45)),
       ('nape', (hz < -.1) & (hy > .04) & (hy < .17) & (np.abs(hx) < .13) & (nz < -.5), 30, .034, .02, .5, (0, -1, 0),
        used & (hz_ < -.1) & (hy_ > .04) & (hy_ < .17) & (np.abs(hx_) < .13) & (tx_n[..., 2] < -.5)),
       ('ear', (np.abs(hx) > .19) & (hy > .22) & ((ny > .35) | (np.abs(nx) > .6)), 24, .014, .012, .7, None,
        used & (np.abs(hx_) > .19) & (hy_ > .22))]
TW, TH = 320, 128; strand = np.zeros((TH, TW, 4), np.float32); cv, cf, cuv, cw = [], [], [], []; cards = {}
for ci, (nm, mask, cnt, Lc, Wc, tilt, flow, tmask) in enumerate(REG):
    cc = np.median(col[tmask], axis=0) if tmask.any() else fur_after
    strand[:, ci * 64:ci * 64 + 64, :3] = cc  # no dark halo where the strands' edges are filtered
    for k in range(6):  # the strands of this colour's column: tapering, a little wavy, lighter at the tips
        x0 = ci * 64 + 5 + k * 9.6 + rng.uniform(-2, 2); tl = 1 - rng.uniform(0, .15)
        for v in range(TH):
            t = v / (TH - 1)
            if t > tl: continue
            wdt = 8.0 * (1 - t / tl) ** .7 + 1.2; xc = x0 + 1.5 * math.sin(t * 3 + k)
            for x in range(max(ci * 64, int(xc - wdt / 2)), min(ci * 64 + 64, int(xc + wdt / 2) + 1)):
                strand[v, x, :3] = np.clip(cc * (.9 + .12 * t) * (1 + .08 * math.sin(x * 1.7 + v * .3)), 0, 1); strand[v, x, 3] = 1
    if not P['cards'] or not mask.any(): cards[nm] = 0; continue
    ids = np.where(mask)[0]; pick = rng.choice(ids, size=min(len(ids), cnt * 4), replace=False, p=ar_p[ids] / ar_p[ids].sum()); got = []
    ec = None
    for i in pick:
        if len(got) >= cnt: break
        p_ = np.array([hx[i], hy[i], hz[i]]); n_ = np.array([nx[i], ny[i], nz[i]])
        if any(np.linalg.norm(p_ - q) < .014 for q in got): continue
        D = np.array(flow, float) if flow else p_ - np.array([np.sign(p_[0]) * .225, .27, -.02])
        t_ = D - n_ * D.dot(n_)
        if np.linalg.norm(t_) < 1e-3: continue
        t_ /= np.linalg.norm(t_); dd = t_ * math.cos(tilt) + n_ * math.sin(tilt); sv = np.cross(n_, dd); sv /= np.linalg.norm(sv)
        L_, W_ = Lc * rng.uniform(.8, 1.2), Wc * rng.uniform(.85, 1.15); root = p_ - n_ * .002; tip = root + dd * L_
        b = len(cv); cv += [root - sv * W_ / 2, root + sv * W_ / 2, tip + sv * W_ * .35, tip - sv * W_ * .35]; cf.append((b, b + 1, b + 2, b + 3))
        u0, u1 = (ci * 64 + 2) / TW, (ci * 64 + 62) / TW; cuv += [(u0, 0), (u1, 0), (u1, 1), (u0, 1)]
        w_ = jaw_w(HB(*root)); cw += [w_] * 4; got.append(p_)
    cards[nm] = len(got)
ST = bpy.data.images.new('Bruno fur strands', TW, TH, alpha=True); ST.colorspace_settings.name = 'sRGB'; ST.pixels = strand.ravel().tolist(); ST.update(); ST.file_format = 'PNG'
if cf:
    fm_, fnt, fb = new_mat('Bruno fur cards', cull=False)
    stx = fnt.nodes.new('ShaderNodeTexImage'); stx.image = ST; rnd = fnt.nodes.new('ShaderNodeMath'); rnd.operation = 'ROUND'
    fnt.links.new(stx.outputs['Color'], fb.inputs['Base Color']); fnt.links.new(stx.outputs['Alpha'], rnd.inputs[0]); fnt.links.new(rnd.outputs[0], fb.inputs['Alpha'])
    fb.inputs['Roughness'].default_value = .9; fb.inputs['Metallic'].default_value = 0
    FO = mk_obj('brunoFur', [HB(*v) for v in cv], cf, [fm_], [0] * len(cf), uvs_=cuv); add_jaw(FO, cw)
# the jaw on the skin: below the lip cut, in front, fading to nothing at the mouth's corners and toward the throat; the slit's lower
# copies (their faces lie below the cut) go with it; the neck tube stays
bmj = bmesh.new(); bmj.from_mesh(me); lower = set()
for v in bmj.verts:
    if v.index < n_head_verts and abs(v.co.z - MY) < 1e-6 and abs(v.co.x) < MX and v.link_faces and np.mean([f_.calc_center_median().z for f_ in v.link_faces]) < MY: lower.add(v.index)
bmj.free()
wts = [jaw_w(v.co, v.index in lower) if v.index < n_head_verts else 0.0 for v in me.vertices]
add_jaw(L, wts); mouth.update(lower_lip_verts=len(lower), jaw_verts=sum(1 for w in wts if w > .01))
bpy.data.objects.remove(S, do_unlink=True)
for im in (cov, POS, NRM, T1, B0, NB): bpy.data.images.remove(im)

co = np.array([tuple(v.co) for v in me.vertices]); Hf = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
all_tris = sum(len(p.vertices) - 2 for o in scn.objects if o.type == 'MESH' for p in o.data.polygons)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
xa = dict(export_morph_normal=False, export_try_sparse_sk=True)
try: bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True, export_apply=False,
                               export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
                               export_image_format='AUTO', export_jpeg_quality=P['quality'], export_animations=False, export_skins=False,
                               export_morph=True, export_extras=False, export_cameras=False, export_lights=False, **xa)
except TypeError: bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True, export_apply=False,
                               export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
                               export_image_format='AUTO', export_jpeg_quality=P['quality'], export_animations=False, export_skins=False,
                               export_morph=True, export_morph_normal=False, export_extras=False, export_cameras=False, export_lights=False)
print('REPORT ' + json.dumps(dict(params=P, source_tris=src_tris, after_cut=cut_tris, head_tris=head_tris, neck_tris=neck_tris, tris=tris, all_tris=all_tris, verts=len(me.vertices),
                                  covered=round(covered, 3), uv_islands=n_islands, face_share=round(face_share, 3), bake_missed=missed, normal_missed=normal_missed, inpainted_texels=filled, cracks_filled=crack_n, strip=[X0, Y0, PW, PH],
                                  fur=dict(median_before=np.round(med, 3).tolist(), after=np.round(fur_after, 3).tolist()), neck_colours=np.round(ring_col[::8], 3).tolist(),
                                  eye_texels=int((eye_w > .5).sum()), eyes=eyes, mouth=mouth, cards=cards, brim=brim, fur_rel=round(fur_rel, 3), cap_texels=int(cap.sum()), bounds=[Hf.min(0).round(4).tolist(), Hf.max(0).round(4).tolist()], bytes=os.path.getsize(out))))
