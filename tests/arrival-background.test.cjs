// node tests/arrival-background.test.cjs — owner 2026-11-22: the background of the bus-arrival shot (dream_opening 7.25–12.4 s).
// The round tree behind the Lion (-6.4, -5.4) is a branching broadleaf from city-trees.js planted by CityAssets.dress
// (ARRIVAL_TREES), the blue parked car (-16, -2.45) is the compact-car GLB (LAYOUT.cars); each prop exists exactly once,
// as the detailed one or as the generated fallback. Street trees by neighbourhood: broad in Old Town, upright in Market Row.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; global.self = global;
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }) };
const run = f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
run('assets/vendor/GLTFLoader.js');
const parse = f => new Promise((ok, err) => { const b = fs.readFileSync(f); new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), './', ok, err); });

(async () => {
  // ---- the tree recipe: bounded, deterministic, broad vs upright
  run('adventure/story/city-trees.js');
  const T = window.CityTrees;
  assert.deepEqual(T.FORMS, ['broad', 'upright']);
  const size = form => { const t = T.template(form), b = new THREE.Box3(); for (const a of [t.wood.p, t.leaf.p]) for (let i = 0; i < a.length; i += 3) b.expandByPoint(new THREE.Vector3(a[i], a[i + 1], a[i + 2])); return b; };
  const broad = size('broad'), upright = size('upright');
  for (const form of T.FORMS) { const n = T.triangles(form); assert.ok(n >= 900 && n <= 3200, form + ' triangles ' + n); }
  const w = b => Math.max(b.max.x - b.min.x, b.max.z - b.min.z), hgt = b => b.max.y - b.min.y;
  assert.ok(w(broad) > 3.6 && w(broad) / hgt(broad) > .8, 'broad: a wide rounded crown ' + w(broad).toFixed(2) + ' x ' + hgt(broad).toFixed(2));
  assert.ok(w(upright) < 2.8 && w(upright) / hgt(upright) < .6, 'upright: a narrow crown ' + w(upright).toFixed(2) + ' x ' + hgt(upright).toFixed(2));
  assert.ok(T.template('broad').wood.p.length / 9 > 250, 'visible limbs and twigs (bark triangles)');
  const leafCol = T.template('broad').leaf.c, tones = new Set(); for (let i = 0; i < leafCol.length; i += 3) tones.add(Math.round(leafCol[i + 1] * 40));
  assert.ok(tones.size > 12, 'leaf colour varies through the crown: ' + tones.size);
  const a1 = { p: [], n: [], c: [] }, a2 = { p: [], n: [], c: [] }, b1 = { p: [], n: [], c: [] }, b2 = { p: [], n: [], c: [] };
  T.add(a1, a2, 'broad', { x: -6.4, z: -5.4, h: 4.6, yaw: .55 }); T.add(b1, b2, 'broad', { x: -6.4, z: -5.4, h: 4.6, yaw: .55 });
  assert.deepEqual(a2.p.slice(0, 30), b2.p.slice(0, 30), 'deterministic (same tree every replay)');
  const leaves = T.mesh(a2, 'l', 'leaf');
  assert.equal(leaves.material.side, THREE.DoubleSide); assert.ok(leaves.material.vertexColors);
  const sh = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <normal_fragment_begin>' }; leaves.material.onBeforeCompile(sh);
  assert.ok(sh.uniforms.uSway && /transformed\.x \+=/.test(sh.vertexShader) && !/normal \* faceDirection/.test(sh.fragmentShader), 'breeze and two-sided crown normals');

  // ---- CityAssets: the arrival tree and the parked cars through dress(), mutually exclusive with the generated pieces
  run('adventure/story/city-assets.js');
  const CA = window.CityAssets;
  const round = CA.ARRIVAL_TREES.find(s => s.form === 'broad');
  assert.deepEqual([round.x, round.z], [-6.4, -5.4], 'the old round tree keeps its place');
  assert.deepEqual(CA.ARRIVAL_TREES.filter(s => s.form === 'street').map(s => [s.x, s.z]), [[6.6, -5.3], [11.6, 5.4], [17.4, -5.4]], 'the authored trees keep theirs');
  assert.deepEqual(CA.LAYOUT.cars, [[8.4, -2.45, null], [-16, -2.45, '#3b7dd8']], 'the blue car keeps its place and colour');
  for (const site of CA.ARRIVAL_TREES) {
    assert.equal(CA.dresses(null, site), false, 'no city art: the set plants ' + site.name);
    assert.equal(CA.dresses({ tree: null }, site), site.form === 'broad', 'tree GLB not ready: ' + site.name);
    assert.equal(CA.dresses({ tree: {} }, site), true, 'everything ready: ' + site.name);
  }
  const car = await parse(CA.FILES.car);
  const set = (extra = {}) => ({ group: new THREE.Group(), objects: {}, disposables: [], opts: {}, ...extra });
  const c = set(), h = CA.dress(c, { car, bus: null });
  const cars = c.group.getObjectByName('city art (GLB)').children.filter(o => /^Old Town compact/.test(o.name) && !/\(far\)$/.test(o.name));
  assert.equal(cars.length, 2, 'two parked models');
  const at = o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  const blue = cars.find(o => o.name.includes('#3b7dd8')), white = cars.find(o => o !== blue);
  assert.ok(Math.abs(at(blue).x + 16) < .3 && Math.abs(at(blue).z + 2.45) < .3 && Math.abs(at(white).x - 8.4) < .3, 'cars where the generated ones stood');
  assert.ok(new THREE.Box3().setFromObject(blue).min.y > -.16, 'tyres on the road');
  let srcMeshes = 0; car.scene.traverse(o => { if (o.isMesh) srcMeshes++; });
  assert.ok(blue.children.length <= 9 && blue.children.length < srcMeshes, 'one draw call per material: ' + blue.children.length + ' (model ' + srcMeshes + ')');
  assert.equal(blue.children[0].geometry, white.children[0].geometry, 'both cars share the merged geometry');
  const paint = o => o.children.find(m => /enamel/.test(m.material.name)).material;
  assert.notEqual(paint(blue), paint(white)); assert.ok(paint(blue).color.b > paint(blue).color.r * 2, 'the blue car is painted blue');
  assert.equal(blue.rotation.y, white.rotation.y, 'parked the same way as the white car (with the traffic)');
  // far copy (welded per facing): one of the two is drawn, chosen by the camera's distance; never a re-index of a drawn mesh
  const tris = o => { let n = 0; o.traverse(m => { if (m.isMesh) n += m.geometry.index.count / 3; }); return n; };
  assert.equal(h.cars.length, 2); const bc = h.cars.find(k => k.full === blue);
  assert.ok(tris(bc.far) < tris(blue) * .45 && tris(bc.far) > 4000, 'far copy ' + tris(bc.far) + ' of ' + tris(blue));
  assert.ok(Math.abs(new THREE.Box3().setFromObject(bc.far).max.y - new THREE.Box3().setFromObject(blue).max.y) < .05, 'same silhouette height');
  const cam = new THREE.PerspectiveCamera(); cam.position.set(5.9, 1.2, 6.9); h.frame({}, cam); // the arrival close-up: 24 m from the blue car
  assert.ok(!bc.full.visible && bc.far.visible, 'far copy in the arrival shot');
  cam.position.set(-12, 1.6, 2); h.frame({}, cam); assert.ok(bc.full.visible && !bc.far.visible, 'full car close by');
  assert.equal(bc.far.children[0].material, bc.full.children[0].material, 'the far copy shares the materials');
  // parked direction follows the generated car it replaces (dir = -lane): turned half a turn without the model bus (lane 1)
  assert.equal(blue.rotation.y, Math.PI);
  assert.equal(h.trees.length, 1, 'the broad arrival tree is planted by the dressing'); assert.equal(h.trees[0].name, 'Old Town round tree');
  assert.ok(c.group.getObjectByName('city trees (leaf)') && c.group.getObjectByName('city trees (wood)'), 'own meshes without set batches');
  const into = { wood: { p: [], n: [], c: [] }, leaf: { p: [], n: [], c: [] } }, c2 = set({ treeParts: into }); CA.dress(c2, { tree: null });
  assert.ok(into.leaf.p.length > 0 && !c2.group.getObjectByName('city trees (leaf)'), 'into the set\'s tree batches when it has them');
  for (const d of [...c.disposables, ...c2.disposables]) d.dispose?.();

  // ---- the sets: what dream-sets / market-sets plant themselves (source rules; the browser check is qa/arrival-background)
  const read = f => fs.readFileSync(f, 'utf8'), dream = read('adventure/story/dream-sets.js'), market = read('adventure/story/market-sets.js'), story = read('adventure/story/story-sets.js');
  assert.ok(!/tree\(-6\.4, -5\.4\)/.test(dream), 'the round tree is not planted unconditionally any more');
  assert.match(dream, /if \(!window\.CityAssets\?\.dresses\(city, site\)\) tree\(site\.x, site\.z, site\.h, site\.form === 'broad' \? 'broad' : 'upright'\)/);
  assert.match(dream, /for \(const \[x, color\] of \[\[-16, '#3b7dd8'\], \[8\.4, '#f4f1ea'\]\]\) if \(!city\?\.car\) car\(x, -2\.45, color, -lane\); else c\.shade\(x, -2\.45, 4\.5, 2\.1, true\)/);
  assert.equal((dream.match(/car\(-16/g) || []).length, 0, 'no second, unconditional blue car');
  const carLine = dream.split('\n').find(l => l.includes("[[-16, '#3b7dd8'], [8.4, '#f4f1ea']]"));
  assert.match(carLine.split('//')[0], /car\(35\.5, -2\.45, '#45b39d', -lane\); car\(30, 2\.45, '#d9473b', lane\); car\(44, 2\.45, '#f2b632', lane\);/, 'the other parked cars are still built (not in a comment)');
  assert.match(market, /if \(!city\?\.tree\) tree\(x, z, h, 'upright'\)/); assert.match(market, /tree\(x, z, h, 'upright'\); \/\/ Market Row/); assert.match(market, /tree\(-6\.2, -1\.2, 4\.2, 'upright'\); tree\(15\.5, -1\.2, 4\.4, 'upright'\)/);
  assert.match(story, /tree\(x, z, h, 'upright'\); \/\* Market Row/, 'the evening market alley is Market Row too');
  assert.match(story, /const tree = \(x, z, h = 4\.6, form = 'broad'\) => \{\n\s+if \(window\.CityTrees\) CityTrees\.add\(S, treeLeaves, form, \{ x, z, h \}\);\n\s+else \{/, 'one tree or the other, never both');
  // the map keeps its own tree kinds and placements (palms on the waterfront, pines on the hills, broadleaf in Old Town)
  const map = read('adventure/gloryland-map.js');
  for (const k of ['function treeGeo()', 'function pineGeo()', 'function palmGeo()', "addInst(W, 'palms'", "addInst(W, chance(.55) ? 'pines' : 'trees'"]) assert.ok(map.includes(k), 'map unchanged: ' + k);
  // the page loads the tree recipe before the sets use it, and the offline pack carries it
  const html = read('index.html'), manifest = JSON.parse(read('offline-manifest.json'));
  assert.ok(html.indexOf('adventure/story/city-trees.js?v=') > 0 && html.indexOf('adventure/story/city-trees.js?v=') < html.indexOf('adventure/story/dream-sets.js?v='));
  assert.ok(manifest.urls.some(u => /adventure\/story\/city-trees\.js\?v=/.test(u)), 'city-trees.js is in the offline pack');
  console.log('arrival-background: ok', JSON.stringify({ broad: T.triangles('broad'), upright: T.triangles('upright'), carDraws: blue.children.length, carModelMeshes: srcMeshes }));
})().catch(e => { console.error(e); process.exit(1); });
