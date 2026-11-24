"""Bus door parts fix (owner 2026-11-25: "the doors in the middle of the bus have text that floats in the air when the
doors are open"). Deterministic patch of assets/street/ch01-bus/gloryland-bus.glb, Python 3 standard library only.

Root cause: in build_city_bus.py the kerb-side 'GLORYLAND TRANSIT' lettering, two service-hatch latches and the front
side marker belong to the static Body, but they were placed where the kerb-side door leaves are. When the leaves swing
out, these parts stay in the air in the door openings. build_city_bus.py now places them properly; this script applies
exactly the same change to the shipped GLB (Blender 4.3.2, which exported it, is not available here, and a re-export
with another Blender version would change the whole file):

  1. kerb-side fleet name (Body__02 warm ivory): x -0.05 -> 1.55, on the panel between the middle and the front doors
  2. kerb-side service-hatch latches (Body__05 brushed aluminum) next to the seams at x -1.15 and 3.80: on the other
     side of their seam (x -1.02 -> -1.28 and 3.93 -> 3.67) instead of on the middle door's jamb / the front door leaf
  3. kerb-side front side marker (Body__12 amber indicators, x 4.87) is on the front door's right leaf: it moves into a
     new mesh node 'Entry_right_door__12 amber indicators', a child of the Entry_right_door hinge (the closed bus looks
     the same; the marker swings with the leaf)

Coordinates are the GLB's (x forward, y up, the kerb side is -z). Every selection is checked (vertex counts, whole
triangles only). The input must be the original export (sha256 below); the output is the same bytes on every run.

usage: python3 scripts/authoring/patch_bus_door_parts.py [in.glb] [out.glb]   (default: the shipped file, in place)
"""
import hashlib, json, math, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'assets/street/ch01-bus/gloryland-bus.glb'
DST = Path(sys.argv[2]) if len(sys.argv) > 2 else SRC
ORIGINAL = 'a4bf1866c71250d52665badee61a8e6eb6bce1321f86d61f418b42c07c906876'  # Codex's export, art/city-components-20261113
PATCHED = 'ca789b33d385d4dc26d5f619b020afe695236ad7b52e00429e99c648bff03d75'   # what this script makes of it
LETTERING_DX = 1.60      # kerb-side fleet name: centre -0.05 -> 1.55
LATCH_DX = -.26          # latch at seam + 0.13 -> seam - 0.13
MARKER_NODE = 'Entry_right_door__12 amber indicators'

data = SRC.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest == PATCHED:
    sys.exit(print(f'{SRC}: already patched (sha256 {digest}); nothing to do.'))
if digest != ORIGINAL:
    sys.exit(f'{SRC}: not the original export (sha256 {digest}); already patched? Nothing written.')

# ---------------------------------------------------------------- GLB in
jlen = struct.unpack_from('<I', data, 12)[0]
gl = json.loads(data[20:20 + jlen])
blen = struct.unpack_from('<I', data, 20 + jlen)[0]
BIN = data[28 + jlen:28 + jlen + blen]
assert len(gl['buffers']) == 1 and not any(a.get('sparse') for a in gl['accessors'])
FMT = {5126: 'f', 5123: 'H', 5125: 'I'}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
views = [BIN[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in gl['bufferViews']]

def read(ai):
    a = gl['accessors'][ai]; v = gl['bufferViews'][a['bufferView']]
    assert 'byteStride' not in v and a.get('byteOffset', 0) == 0
    n = NCOMP[a['type']]; flat = struct.unpack_from('<%d%s' % (a['count'] * n, FMT[a['componentType']]), views[a['bufferView']])
    return [tuple(flat[i:i + n]) for i in range(0, len(flat), n)] if n > 1 else list(flat)

def write(ai, rows):
    """Replace accessor ai's data (same type); min/max recomputed for positions."""
    a = gl['accessors'][ai]; n = NCOMP[a['type']]
    flat = [c for r in rows for c in r] if n > 1 else list(rows)
    if a['componentType'] == 5123 and max(flat) > 65535: raise SystemExit('index overflow')
    views[a['bufferView']] = struct.pack('<%d%s' % (len(flat), FMT[a['componentType']]), *flat)
    a['count'] = len(rows)
    if 'min' in a:
        a['min'] = [min(r[k] for r in rows) for k in range(n)] if n > 1 else [min(rows)]
        a['max'] = [max(r[k] for r in rows) for k in range(n)] if n > 1 else [max(rows)]

def add_accessor(like, rows):
    """A new accessor + buffer view with the same type and target as accessor `like`."""
    a = dict(gl['accessors'][like]); v = dict(gl['bufferViews'][a['bufferView']])
    gl['bufferViews'].append(v); views.append(b''); a['bufferView'] = len(gl['bufferViews']) - 1
    for k in ('min', 'max'): a.pop(k, None)
    if 'min' in gl['accessors'][like]: a['min'] = a['max'] = []
    gl['accessors'].append(a); write(len(gl['accessors']) - 1, rows); return len(gl['accessors']) - 1

# node transforms: translation / rotation / scale (no matrices in this file)
parent = {c: i for i, n in enumerate(gl['nodes']) for c in n.get('children', [])}
def qrot(q, p):
    x, y, z, w = q; px, py, pz = p
    tx, ty, tz = 2 * (y * pz - z * py), 2 * (z * px - x * pz), 2 * (x * py - y * px)
    return (px + w * tx + y * tz - z * ty, py + w * ty + z * tx - x * tz, pz + w * tz + x * ty - y * tx)
def local_to_world(i, p):
    while True:
        n = gl['nodes'][i]; assert 'matrix' not in n
        s = n.get('scale', [1, 1, 1]); p = qrot(n.get('rotation', [0, 0, 0, 1]), (p[0] * s[0], p[1] * s[1], p[2] * s[2]))
        t = n.get('translation', [0, 0, 0]); p = (p[0] + t[0], p[1] + t[1], p[2] + t[2])
        if i not in parent: return p
        i = parent[i]
def chain_is_translation_only(i):
    while True:
        n = gl['nodes'][i]
        if n.get('rotation', [0, 0, 0, 1]) != [0, 0, 0, 1] or n.get('scale', [1, 1, 1]) != [1, 1, 1]: return False
        if i not in parent: return True
        i = parent[i]
node = {n['name']: i for i, n in enumerate(gl['nodes'])}

def prim_of(name):
    m = gl['meshes'][gl['nodes'][node[name]]['mesh']]; assert len(m['primitives']) == 1; return m['primitives'][0]

def select(name, box):
    """Vertex ids of node `name` inside a world box ((x0,x1),(y0,y1),(z0,z1)); the triangles they make must be whole."""
    pr = prim_of(name); P = read(pr['attributes']['POSITION']); I = read(pr['indices'])
    ni = node[name]; W = [local_to_world(ni, p) for p in P]
    sel = {k for k, w in enumerate(W) if all(lo <= w[d] <= hi for d, (lo, hi) in enumerate(box))}
    for t in range(0, len(I), 3):
        inside = sum(I[t + k] in sel for k in range(3))
        assert inside in (0, 3), f'{name}: a triangle crosses the selection {box}'
    return sel

def translate(name, sel, dx):
    assert chain_is_translation_only(node[name])
    pr = prim_of(name); a = pr['attributes']['POSITION']; P = read(a)
    write(a, [(p[0] + dx, p[1], p[2]) if k in sel else p for k, p in enumerate(P)])

def bounds(name, sel):
    ni = node[name]; P = read(prim_of(name)['attributes']['POSITION']); W = [local_to_world(ni, P[k]) for k in sel]
    return [(round(min(w[d] for w in W), 3), round(max(w[d] for w in W), 3)) for d in range(3)]

# ---------------------------------------------------------------- 1. kerb-side fleet name
KERB = (-1.2790, -1.2770)        # the lettering's face (body side 1.278 m, extruded 0.4 mm)
name = 'Body__02 warm ivory'
letters = select(name, ((-.95, .85), (1.10, 1.27), KERB))
b = bounds(name, letters); assert len(letters) > 400 and b[0][0] > -.9 and b[0][1] < .8, (len(letters), b)
# the road side carries the same lettering (turned half a turn): same size and height; nothing else of this mesh is near
mb = bounds(name, select(name, ((-.95, .85), (1.10, 1.27), (-KERB[1], -KERB[0]))))
assert abs((mb[0][1] - mb[0][0]) - (b[0][1] - b[0][0])) < .002 and mb[1] == b[1], (mb, b)
assert select(name, ((-1.5, 1.5), (1.0, 1.4), (-1.35, -1.27))) == letters
translate(name, letters, LETTERING_DX)
report = [f'fleet name: {len(letters)} vertices, x {b[0]} -> +{LETTERING_DX}']

# ---------------------------------------------------------------- 2. service-hatch latches
name = 'Body__05 brushed aluminum'
for cx in (-1.02, 3.93):
    latch = select(name, ((cx - .06, cx + .06), (1.22, 1.26), (-1.29, -1.25)))
    b = bounds(name, latch); assert 50 <= len(latch) <= 400 and abs((b[0][0] + b[0][1]) / 2 - cx) < .01, (cx, len(latch), b)
    translate(name, latch, LATCH_DX); report.append(f'latch {cx}: {len(latch)} vertices, x {b[0]} -> {LATCH_DX}')

# ---------------------------------------------------------------- 3. front side marker onto the door leaf
name = 'Body__12 amber indicators'; ni = node[name]; pr = prim_of(name)
marker = select(name, ((4.75, 5.0), (.5, .66), (-1.30, -1.25)))
b = bounds(name, marker); assert 50 <= len(marker) <= 400 and abs((b[0][0] + b[0][1]) / 2 - 4.87) < .01, (len(marker), b)
attrs = pr['attributes']; I = read(pr['indices']); cols = {k: read(v) for k, v in attrs.items()}
door = node['Entry_right_door']; assert chain_is_translation_only(door) and chain_is_translation_only(ni)
dpos = local_to_world(door, (0, 0, 0)); centre = tuple(round((lo + hi) / 2 - dpos[d], 4) for d, (lo, hi) in enumerate(b))
keep = [k for k in range(len(cols['POSITION'])) if k not in marker]; move = sorted(marker)
remap_keep = {k: n for n, k in enumerate(keep)}; remap_move = {k: n for n, k in enumerate(move)}
tris = [tuple(I[t:t + 3]) for t in range(0, len(I), 3)]
for k, rows in cols.items(): write(attrs[k], [rows[i] for i in keep])
write(pr['indices'], [remap_keep[i] for t in tris if t[0] not in marker for i in t])
# the moved vertices in the new node's frame: world - (door hinge + centre)
moved = {}
for k, rows in cols.items():
    if k == 'POSITION':
        rows = [local_to_world(ni, rows[i]) for i in move]
        moved[k] = [tuple(w[d] - dpos[d] - centre[d] for d in range(3)) for w in rows]
    else: moved[k] = [rows[i] for i in move]
new_prim = {'attributes': {k: add_accessor(attrs[k], moved[k]) for k in ('POSITION', 'NORMAL', 'TEXCOORD_0') if k in moved},
            'indices': add_accessor(pr['indices'], [remap_move[i] for t in tris if t[0] in marker for i in t]), 'material': pr['material']}
assert set(new_prim['attributes']) == set(attrs)
gl['meshes'].append({'name': 'door side marker', 'primitives': [new_prim]})
gl['nodes'].append({'name': MARKER_NODE, 'mesh': len(gl['meshes']) - 1, 'translation': list(centre)})
gl['nodes'][door]['children'].append(len(gl['nodes']) - 1)
report.append(f'side marker: {len(move)} vertices, {sum(t[0] in marker for t in tris)} triangles -> {MARKER_NODE} at {centre} (hinge {tuple(round(v, 3) for v in dpos)})')

gl['nodes'][node['Gloryland_Bus_12']]['extras']['asset_version'] = '0.1.1-review'
gl['nodes'][node['Gloryland_Bus_12']]['extras']['door_parts_fix'] = 'scripts/authoring/patch_bus_door_parts.py (2026-11-25)'

# ---------------------------------------------------------------- GLB out (buffer views repacked in order, 4-byte aligned)
out = bytearray()
for v, chunk in zip(gl['bufferViews'], views):
    while len(out) % 4: out.append(0)
    v['byteOffset'] = len(out); v['byteLength'] = len(chunk); out += chunk
while len(out) % 4: out.append(0)
gl['buffers'][0]['byteLength'] = len(out)
js = json.dumps(gl, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(out), b'BIN\x00') + bytes(out)
DST.write_bytes(glb)
tri = sum(len(read(p['indices'])) // 3 for m in gl['meshes'] for p in m['primitives'])
print('\n'.join(report))
print(f'{DST}: {len(data)} -> {len(glb)} bytes, {tri} triangles, {len(gl["meshes"])} meshes, sha256 {hashlib.sha256(glb).hexdigest()}')
assert hashlib.sha256(glb).hexdigest() == PATCHED, 'output differs from the reviewed patch'
