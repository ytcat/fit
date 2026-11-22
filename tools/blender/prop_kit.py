# Shared helpers for the Glory of the Ring prop scripts (headless Blender 5.x Python module, `bpy`).
#
# Game contract (adventure/story/city-assets.js, CityAssets.propKit):
#   * metres, Blender Z up (exported Y up), each prop's origin at its base centre (or its wall mount, see the prop),
#     front toward -Y in Blender = +Z in the game (glTF Y up: Blender (x, y, z) -> game (x, z, -y)); a wall-mounted
#     prop has its back on the wall plane y = 0 and stands out toward -Y;
#   * one top-level mesh node per prop, named like the prop (the game places it by name);
#   * four shared material CLASSES and a linear vertex colour (COLOR_0) for the paint colour of every face:
#       gloss   - painted iron, enamel, vinyl, brass (PBR roughness ~0.4)
#       matte   - wood, terracotta, soil, foliage, rubber, cloth (merged into the set's street batch, roughness 0.82)
#       glow    - always-lit bulbs (unlit in the game)
#       lantern - street-lamp glass: lit at dusk, pale glass by day (the game decides by the set's time of day)
#     The game merges every instance of every prop into these few meshes: no per-prop draw calls.
# Everything is deterministic (fixed seeds, no time-based input): re-running a script rebuilds identical files.
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix

CLASSES = {'gloss': (.40, 0.0), 'matte': (.82, 0.0), 'glow': (.5, 0.0), 'lantern': (.08, 0.0)}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for n in list(CLASSES): _class_mat(n)


def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)


def _class_mat(cls):
    m = bpy.data.materials.get(cls)
    if m: return m
    m = bpy.data.materials.new(cls); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    a = nt.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Color'
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    rough, metal = CLASSES[cls]; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if cls in ('glow', 'lantern'):
        nt.links.new(a.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 3.0 if cls == 'glow' else 1.6
    return m


def _own(ob, col, cls, var=0.0, seed=0):
    """Assigns the class material and paints every face corner with col (hex or linear rgb), +- var brightness per face."""
    me = ob.data
    me.materials.clear(); me.materials.append(_class_mat(cls))
    rgb = srgb(col) if isinstance(col, str) else col
    ob['paint'] = (*rgb, var, seed)
    return ob


def _paint(ob):
    """Writes the colour attribute from the object's 'paint' (after modifiers are applied)."""
    r, g, b, var, seed = ob['paint']; me = ob.data
    if 'Color' in me.color_attributes: me.color_attributes.remove(me.color_attributes['Color'])
    at = me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER'); rnd = random.Random(seed)
    fc = list(ob['fcols']) if 'fcols' in ob and len(ob['fcols']) == 3 * len(me.polygons) else None
    for p in me.polygons:
        k = 1 + (rnd.uniform(-var, var) if var else 0)
        c = fc[3 * p.index:3 * p.index + 3] if fc else (r, g, b)
        for li in p.loop_indices: at.data[li].color = (min(1, c[0] * k), min(1, c[1] * k), min(1, c[2] * k), 1)


def link(name, me):
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); return ob


def lathe(name, prof, col, cls='gloss', segs=24, smooth=True, var=0, seed=0, cap_top=True, cap_bot=True, rot=0.0):
    """prof: [(radius, z)] bottom to top: a solid of revolution about Z."""
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs + rot), r * math.sin(2 * math.pi * i / segs + rot), z)) for i in range(segs)])
    for a, b in zip(rings, rings[1:]):
        for i in range(segs): bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    if cap_bot and prof[0][0] > 1e-4: bm.faces.new(list(reversed(rings[0])))
    if cap_top and prof[-1][0] > 1e-4: bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    if smooth: me.set_sharp_from_angle(angle=math.radians(50))
    return _own(link(name, me), col, cls, var, seed)


def cyl(name, r, h, at=(0, 0, 0), rot=(0, 0, 0), col='#888888', cls='gloss', segs=16, bevel=0.0, var=0, seed=0):
    """A cylinder whose BASE is at `at` (rotated about the base)."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=r, depth=h, location=(0, 0, h / 2))
    ob = bpy.context.object; ob.name = name
    bpy.ops.object.transform_apply(location=True)
    ob.rotation_euler = rot; ob.location = at; bpy.ops.object.transform_apply(location=True, rotation=True)
    if bevel: m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = 1; m.limit_method = 'ANGLE'
    ob.data.shade_smooth(); ob.data.set_sharp_from_angle(angle=math.radians(50))
    return _own(ob, col, cls, var, seed)


def box(name, size, at, col='#888888', cls='gloss', bevel=0.006, rot=(0, 0, 0), segs=1, var=0, seed=0):
    """A box centred at `at`."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); ob = bpy.context.object; ob.name = name
    ob.scale = size; bpy.ops.object.transform_apply(scale=True)
    ob.rotation_euler = rot; ob.location = at; bpy.ops.object.transform_apply(location=True, rotation=True)
    if bevel: m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = segs; m.limit_method = 'ANGLE'
    ob.data.shade_smooth(); ob.data.set_sharp_from_angle(angle=math.radians(40))
    return _own(ob, col, cls, var, seed)


def sphere(name, r, at, col, cls='gloss', sub=2, scale=(1, 1, 1), noise=0.0, seed=0, var=0, flat=False):
    """An icosphere, optionally squashed (scale) and roughened (noise = radial jitter, fraction of r)."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r); rnd = random.Random(seed)
    if noise:
        for v in bm.verts: v.co *= 1 + rnd.uniform(-noise, noise)
    for v in bm.verts: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) + Vector(at)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = not flat
    return _own(link(name, me), col, cls, var, seed)


def tube(name, pts, r, col, cls='gloss', res=6, bres=2, var=0, seed=0):
    """A round bar through points (bezier, auto handles)."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = bres; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.resolution_u = res
    ob = link(name, cu); ob['paint'] = (*(srgb(col) if isinstance(col, str) else col), var, seed); ob['cls'] = cls
    return ob


def poly(name, verts, faces, col, cls='gloss', smooth=False, var=0, seed=0):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = smooth
    return _own(link(name, me), col, cls, var, seed)


def shrub(name, centre, radii, cols, seed, leaves=110, size=(.045, .065), core='#2f4f24', bottom=.35):
    """Foliage: a dark core and `leaves` small diamond leaf cards on an ellipsoid, facing out, darker toward the bottom
    (a cheap ambient occlusion). cols: hex leaf colours. ~2 triangles per leaf."""
    rnd = random.Random(seed); c = Vector(centre); R = Vector(radii)
    sphere(name + ' core', 1, centre, core, 'matte', sub=2, scale=(R.x * .82, R.y * .82, R.z * .8), noise=.12, seed=seed, var=.1)
    verts, faces, fcols = [], [], []
    for i in range(leaves):
        while True:
            d = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1)))
            if d.length > 1e-3: d.normalize()
            if d.z > -bottom: break
        p = c + Vector((d.x * R.x, d.y * R.y, d.z * R.z)) * rnd.uniform(.86, 1.04)
        n = Vector((d.x / R.x, d.y / R.y, d.z / R.z)).normalized(); n = (n + Vector((0, 0, .35))).normalized()
        t = n.cross(Vector((0, 0, 1)) if abs(n.z) < .95 else Vector((1, 0, 0))).normalized(); b = n.cross(t)
        a = rnd.uniform(0, 2 * math.pi); t, b = t * math.cos(a) + b * math.sin(a), b * math.cos(a) - t * math.sin(a)
        L = rnd.uniform(*size); W = L * .45; k = len(verts)
        verts += [tuple(p + t * L), tuple(p + b * W + n * .006), tuple(p - t * L * .5), tuple(p - b * W + n * .006)]
        faces.append((k, k + 1, k + 2, k + 3))
        col = srgb(cols[rnd.randrange(len(cols))]); ao = .62 + .38 * (d.z + 1) / 2; j = rnd.uniform(.85, 1.15)
        fcols += [col[0] * ao * j, col[1] * ao * j, col[2] * ao * j]
    ob = poly(name, verts, faces, cols[0], 'matte'); ob['fcols'] = fcols
    return ob


def finish(name, keep=()):
    """Applies modifiers, converts curves, paints, joins every free object into one mesh named `name` at the origin."""
    objs = [o for o in bpy.context.scene.objects if o.get('done') is None and o.name not in keep]
    for ob in list(objs):
        if ob.type == 'CURVE':
            paint, cls = tuple(ob['paint']), ob['cls']
            bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
            bpy.ops.object.convert(target='MESH'); ob = bpy.context.object
            ob.data.materials.clear(); ob.data.materials.append(_class_mat(cls)); ob['paint'] = paint
            for p in ob.data.polygons: p.use_smooth = True
    objs = [o for o in bpy.context.scene.objects if o.get('done') is None and o.type == 'MESH' and o.name not in keep]
    for ob in objs:
        bpy.context.view_layer.objects.active = ob
        for mod in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
        _paint(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.object; ob.name = name; ob.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # one material slot per class, in a fixed order (deterministic export)
    me = ob.data; order = sorted({s.material.name for s in ob.material_slots}, key=list(CLASSES).index)
    remap = {i: order.index(s.material.name) for i, s in enumerate(ob.material_slots)}
    idx = [remap[p.material_index] for p in me.polygons]; me.materials.clear()
    for n in order: me.materials.append(_class_mat(n))
    for p, i in zip(me.polygons, idx): p.material_index = i
    if 'paint' in ob: del ob['paint']
    ob['done'] = 1
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    return ob, tris


def export(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=True,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_normals=True,
                              export_texcoords=False, export_tangents=False, export_extras=False, export_cameras=False,
                              export_lights=False, export_animations=False, export_morph=False, export_skins=False)


def render(objs, show, path, h, w=None, cam_dir=(.72, -.9), res=420, samples=40, night=False, wall=False):
    """Cycles preview of `show` (others hidden) on a pale floor, the camera framing a prop `h` tall and `w` wide."""
    scn = bpy.context.scene
    for o in objs: o.hide_render = o is not show
    scn.render.engine = 'CYCLES'; scn.cycles.samples = samples; scn.cycles.device = 'CPU'; scn.cycles.use_denoising = False
    scn.render.resolution_x = scn.render.resolution_y = res; scn.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in scn.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    if not scn.world:
        wd = bpy.data.worlds.new('w'); scn.world = wd; wd.use_nodes = True
    bg = scn.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (.16, .17, .25, 1) if night else (.78, .8, .84, 1); bg.inputs['Strength'].default_value = .35 if night else .9
    for n in ('__floor', '__wall', '__sun', '__area', '__cam', '__tgt'):
        if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n])
    bpy.ops.mesh.primitive_plane_add(size=30); fl = bpy.context.object; fl.name = '__floor'
    fm = bpy.data.materials.get('__floor') or bpy.data.materials.new('__floor'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb('#b9b5ad'), 1); fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
    fl.data.materials.append(fm)
    if wall:
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0)); wl = bpy.context.object; wl.name = '__wall'
        wmat = bpy.data.materials.get('__wall') or bpy.data.materials.new('__wall'); wmat.use_nodes = True; wmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb('#e6dcc6'), 1)
        wl.data.materials.append(wmat)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(35))); s = bpy.context.object; s.name = '__sun'; s.data.energy = .4 if night else 3.2; s.data.angle = .2
    bpy.ops.object.light_add(type='AREA', location=(-2, -2.5, 2.5)); a = bpy.context.object; a.name = '__area'; a.data.energy = 40 if night else 120; a.data.size = 3
    a.rotation_euler = (Vector((0, 0, 0)) - a.location).to_track_quat('-Z', 'Y').to_euler()
    w = w or h; d = max(h, w) * 1.9 + .6
    bpy.ops.object.camera_add(location=(d * cam_dir[0], d * cam_dir[1], h * .62 + .3)); cam = bpy.context.object; cam.name = '__cam'; scn.camera = cam; cam.data.lens = 50
    tc = cam.constraints.new('TRACK_TO'); e = bpy.data.objects.new('__tgt', None); bpy.context.collection.objects.link(e); e.location = (0, 0, h * .48); tc.target = e
    if wall: e.location = (0, .1, h * .5)
    scn.render.filepath = path; bpy.ops.render.render(write_still=True)
    for n in ('__floor', '__wall', '__sun', '__area', '__cam', '__tgt'):
        if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n])
