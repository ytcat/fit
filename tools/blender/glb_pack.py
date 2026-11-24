# Smaller prop GLBs without a decoder (round 2): rewrites a Blender-exported GLB in place with KHR_mesh_quantization -
#   NORMAL   float VEC3          -> normalized BYTE VEC3 (4-byte stride; the game renormalizes every normal it reads)
#   COLOR_0  normalized u16 VEC4 -> normalized UNSIGNED_BYTE VEC4 (linear vertex colours, 1/255 steps are plenty for paint)
# Positions and indices stay as exported. The page's r128 GLTFLoader reads both (CityAssets.parseProps divides colours by 255).
# Deterministic: the same input bytes give the same output bytes.
#
# usage: python3 tools/blender/glb_pack.py <file.glb> [...]
import json, struct, sys


def pack(path):
    data = open(path, 'rb').read()
    jlen = struct.unpack_from('<I', data, 12)[0]; j = json.loads(data[20:20 + jlen])
    boff = 20 + jlen + 8; blen = struct.unpack_from('<I', data, 20 + jlen)[0]; bin_ = data[boff:boff + blen]
    views, accs = j['bufferViews'], j['accessors']
    out = bytearray(); new_views = []

    def put(raw, stride=None, target=None):
        while len(out) % 4: out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(raw)}
        if stride: v['byteStride'] = stride
        if target: v['target'] = target
        out.extend(raw); new_views.append(v); return len(new_views) - 1

    def raw_of(a):
        v = views[a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        size = {5126: 4, 5123: 2, 5125: 4, 5121: 1, 5122: 2, 5120: 1}[a['componentType']] * {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        assert v.get('byteStride', size) == size, 'interleaved input not supported'
        return bin_[o:o + size * a['count']]

    done = {}
    for m in j['meshes']:
        for p in m['primitives']:
            for k, ai in list(p['attributes'].items()) + [('INDEX', p['indices'])]:
                if ai in done: continue
                a = accs[ai]; raw = raw_of(a); target = 34963 if k == 'INDEX' else 34962
                if k == 'NORMAL' and a['componentType'] == 5126:
                    f = struct.unpack('<%df' % (3 * a['count']), raw); b = bytearray()
                    for i in range(a['count']):
                        b += struct.pack('<3b', *[max(-127, min(127, round(c * 127))) for c in f[3 * i:3 * i + 3]]) + b'\0'
                    a.update(bufferView=put(bytes(b), 4, target), componentType=5120, normalized=True); a.pop('byteOffset', None)
                    a.pop('min', None); a.pop('max', None)
                elif k == 'COLOR_0' and a['componentType'] == 5123:
                    u = struct.unpack('<%dH' % (4 * a['count']), raw)
                    b = bytes(max(0, min(255, round(c / 65535 * 255))) for c in u)
                    a.update(bufferView=put(b, None, target), componentType=5121, normalized=True); a.pop('byteOffset', None)
                else:
                    a.update(bufferView=put(raw, None, target)); a.pop('byteOffset', None)
                done[ai] = 1
    for k in ('extensionsUsed', 'extensionsRequired'):
        j[k] = sorted(set(j.get(k, [])) | {'KHR_mesh_quantization'})
    j['bufferViews'] = new_views
    while len(out) % 4: out.append(0)
    j['buffers'] = [{'byteLength': len(out)}]
    js = json.dumps(j, separators=(',', ':'), sort_keys=True).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(out)
    res = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(out), b'BIN\0') + bytes(out)
    open(path, 'wb').write(res)
    return len(data), len(res)


if __name__ == '__main__':
    for p in sys.argv[1:]: print('PACKED', p, *pack(p))
