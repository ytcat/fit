// node qa/blender-props-2/arena-tiers.cjs: the built venues with and without the round-2 Blender props (triangles, meshes, crowd tiers)
const path = require('path'); process.chdir(path.join(__dirname, '../..'));
global.THREE = require(process.cwd() + '/assets/vendor/three.min.js'); global.window = global; global.self = global;
const fs = require('fs'), vm = require('vm');
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, k) => k === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) }), style: {} }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8')); vm.runInThisContext(fs.readFileSync('adventure/story/city-assets.js', 'utf8'));
const parse = f => new Promise((ok, err) => { const b = fs.readFileSync(f); new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), './', ok, err); });
(async () => {
  const d = await parse('assets/street/ch01-props/gloryland-dock-props.glb'), r = await parse('assets/street/ch01-props/gloryland-ring-props.glb');
  const kit = CityAssets.propKit({ dockProps: d, ringProps: r }), A = require(process.cwd() + '/arena-sets.js'), rows = {};
  for (const id of ['docks', 'boxing_club', 'regional', 'championship']) {
    const g = A.build(id, 'en', null, { kit: null }), m = A.build(id, 'en', null, { kit });
    rows[id] = { before: { triangles: g.stats.triangles, meshes: g.stats.meshes, crowdTiers: g.stats.people.tiers }, after: { triangles: m.stats.triangles, meshes: m.stats.meshes, crowdTiers: m.stats.people.tiers, props: m.stats.props } };
    console.log(id, JSON.stringify(rows[id]));
  }
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
})();
