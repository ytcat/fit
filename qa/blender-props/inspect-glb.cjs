// node qa/blender-props/inspect-glb.cjs <file.glb> [node names...]: size, base and triangles of each top-level node (the page's r128 GLTFLoader)
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '../..'));
global.THREE = require('../../assets/vendor/three.min.js'); global.window = global; global.self = global;
global.document = { createElement: () => ({ getContext: () => null }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.URL = Object.assign(global.URL || {}, { createObjectURL: () => 'blob:x', revokeObjectURL() {} });
vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
const file = process.argv[2], only = process.argv.slice(3);
const b = fs.readFileSync(file);
new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), './', g => {
  g.scene.updateMatrixWorld(true);
  for (const o of g.scene.children) {
    if (only.length && !only.includes(o.name)) continue;
    let tris = 0, draws = 0; const mats = new Set(), colours = new Set();
    o.traverse(m => { if (m.isMesh) { draws++; tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; mats.add(m.material.name); if (m.geometry.attributes.color) colours.add('COLOR_0'); } });
    const bx = new THREE.Box3().setFromObject(o), s = bx.getSize(new THREE.Vector3());
    console.log(o.name.padEnd(26), 'size', s.toArray().map(v => v.toFixed(2)).join(' x '), 'min y', bx.min.y.toFixed(3), 'centre xz', ((bx.min.x + bx.max.x) / 2 - o.position.x).toFixed(2), ((bx.min.z + bx.max.z) / 2 - o.position.z).toFixed(2), 'tris', tris, 'meshes', draws, [...mats].join(','), [...colours].join(''));
  }
}, e => { console.error(e); process.exit(1); });
