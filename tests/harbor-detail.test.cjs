const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('../assets/vendor/three.min.js');

const cache = new Map();
const loads = [];
const ready = [];
const gltf = () => ({scene: new THREE.Group()});
const CityAssets = {
  cached(names) { return Object.fromEntries(names.map(name => [name, cache.get(name)])); },
  ready(_ms, names) { ready.push(...names); return Promise.resolve(); },
  load(name) { loads.push(name); return Promise.resolve(gltf()); }
};
const window = {CityAssets};
vm.runInNewContext(fs.readFileSync('adventure/free-walk/harbor-detail.js', 'utf8'), {window, THREE});
const {mount, prepare} = window.FreeWalkHarborDetail;

(async () => {
  const map = new THREE.Group();
  await prepare(100);
  assert.deepEqual(ready, ['harborcranefar', 'harborshipfar']);
  cache.set('harborcranefar', gltf());
  assert.equal(mount(map, 3, .4), null, 'an incomplete pair leaves stock rendering and collision in place');
  assert.equal(map.children.length, 0);
  cache.set('harborshipfar', gltf());
  const harbor = mount(map, 3, .4);
  assert.equal(harbor.colliders.length, 8);
  for (const [, z] of harbor.colliders) assert.ok(z >= 145.8 - .001 && z < 159);
  assert.deepEqual(map.children[0].children[2].position.toArray(), [5, 0, 56.4]);
  harbor.update({x: 150, z: -120});
  assert.equal(loads.length, 0);
  harbor.update({x: 9, z: 153});
  await Promise.resolve();
  harbor.update({x: 9, z: 153});
  assert.equal(harbor.snapshot().filter(e => e.tier === 'near').length, 2);
  assert.equal(harbor.snapshot().filter(e => e.tier === 'mid').length, 1);
  for (const node of map.children[0].children) assert.equal(node.children.filter(o => o.visible).length, 1);
  harbor.update({x: 150, z: -120});
  assert.ok(harbor.snapshot().every(e => e.tier === 'far'));
  harbor.update({x: 9, z: 153});
  assert.equal(loads.length, new Set(loads).size, 'reuse the requested detail tiers');
  harbor.dispose();
  assert.equal(map.children.length, 0);
  console.log('PASS harbor fallback with partial assets, lazy tiers, caps, fixed placement, and disposal');
})().catch(error => { console.error(error); process.exitCode = 1; });
