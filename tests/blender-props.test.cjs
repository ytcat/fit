// node tests/blender-props.test.cjs — owner 2026-11-22 ("as realistic as possible"): street furniture and Bruno's gym props
// modelled in Blender (tools/blender/*-props.py -> assets/street/ch01-props/*.glb) stand where the generated pieces stood.
// Budgets (triangles, one node per prop, four shared material classes), sizes against the generated pieces (collisions and the
// walk unchanged), the merge into the set's batches, and the real sets built in node: each prop exists once, as the model or as
// the generated fallback, never both.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; global.self = global;
const grad = () => ({ addColorStop() {} });
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' || k === 'getImageData' ? ((w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) })) : /Gradient|Pattern/.test(k) ? grad : k === 'measureText' ? () => ({ width: 10 }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d, style: {} }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; }, head: { append() {} }, addEventListener() {} };
global.addEventListener = () => {};
const run = f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
run('assets/vendor/GLTFLoader.js');
const parse = f => new Promise((ok, err) => { const b = fs.readFileSync(f); new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), './', ok, err); });
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);

(async () => {
  run('adventure/story/city-assets.js'); const CA = window.CityAssets;
  assert.equal(CA.FILES.props, './assets/street/ch01-props/gloryland-street-props.glb');
  assert.equal(CA.FILES.gymProps, './assets/street/ch01-props/gloryland-gym-props.glb');
  const props = await parse('assets/street/ch01-props/gloryland-street-props.glb'), gymProps = await parse('assets/street/ch01-props/gloryland-gym-props.glb');

  // ---- the models: one node per prop, budgets, material classes, vertex colours, on the ground
  const STREET = { Lamp: 4000, Bin: 4000, Planter: 4000, Planter_wide: 4000, Bollard: 4000, Bench: 8000, Hydrant: 4000 };
  const GYM = { Lockers: 8000, Gym_bench: 8000, Water_cooler: 4000, Glove_rack: 4000, Medicine_balls: 4000, Dumbbell_rack: 8000, Kettlebells: 4000, Skipping_ropes: 4000, Wall_clock: 4000, Ring_bell: 4000, Speed_bag: 4000, Corner_stool: 4000, Bucket_towel: 4000, Pendant_lamp: 4000 };
  const report = {};
  for (const [g, budget] of [[props, STREET], [gymProps, GYM]]) {
    assert.deepEqual(g.scene.children.map(o => o.name).sort(), Object.keys(budget).sort(), 'one node per prop');
    for (const node of g.scene.children) {
      let tris = 0; node.traverse(o => { if (!o.isMesh) return; tris += o.geometry.index.count / 3; assert.ok(['gloss', 'matte', 'glow', 'lantern'].includes(o.material.name), node.name + ' class ' + o.material.name); assert.ok(o.geometry.attributes.color, node.name + ' vertex colours'); });
      assert.ok(tris <= budget[node.name], `${node.name}: ${tris} triangles > ${budget[node.name]}`); report[node.name] = tris;
      const b = new THREE.Box3().setFromObject(node);
      if (!['Wall_clock', 'Pendant_lamp', 'Glove_rack', 'Skipping_ropes', 'Speed_bag'].includes(node.name)) near(b.min.y, 0, .01, node.name + ' stands on the floor'); // wall props: origin at the floor below them
    }
  }
  const box = (g, n) => new THREE.Box3().setFromObject(g.scene.getObjectByName(n)), size = (g, n) => box(g, n).getSize(new THREE.Vector3());
  // sizes of the generated pieces they replace (story-sets.js): lamp 4.27 m, bin 0.89 / r 0.3, planter 1.1 x 0.5, bollard 0.86 / r 0.1
  near(size(props, 'Lamp').y, 4.25, .1, 'lamp height'); near(size(props, 'Bin').y, .92, .06, 'bin height'); assert.ok(size(props, 'Bin').x <= .6, 'bin footprint');
  near(size(props, 'Bollard').y, .8, .07, 'bollard height'); assert.ok(size(props, 'Bollard').x <= .21, 'bollard footprint (walk clearance 0.36 m)');
  const foot = (g, n, y) => { const v = new THREE.Vector3(); let r = 0; g.scene.getObjectByName(n).traverse(o => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y < y) r = Math.max(r, Math.hypot(v.x, v.z)); } }); return r; };
  assert.ok(foot(props, 'Lamp', .3) <= .151, 'lamp base within the generated 0.14-0.15 m footprint');
  for (const [n, w] of [['Planter', 1.1], ['Planter_wide', 1.6]]) { const t = box(props, n), trough = []; near(t.max.x - t.min.x, w, .2, n + ' width'); assert.ok(t.max.z - t.min.z < .66, n + ' depth'); }
  near(size(gymProps, 'Lockers').x, 3.72, .05, 'six lockers at 0.62 m'); near(size(gymProps, 'Lockers').y, 1.97, .05, 'locker height'); assert.ok(size(gymProps, 'Lockers').z <= .6, 'locker depth');
  near(size(gymProps, 'Pendant_lamp').y, 1.98, .02, 'pendant from the shade rim (3.42 m) to the ceiling (5.4 m)');
  for (const n of ['Glove_rack', 'Skipping_ropes', 'Wall_clock', 'Ring_bell', 'Speed_bag']) { const b = box(gymProps, n); assert.ok(b.min.z >= -.01 && b.max.z > .05, n + ': stands out from the wall (+z), never into it'); }
  near(box(gymProps, 'Glove_rack').min.y, 1.15, .15, 'gloves hang at chest height'); near(size(gymProps, 'Glove_rack').x, 2.6, .12, 'glove rail along the wall');

  // ---- merging: placeProp copies a node into batches (scale and turn allowed), the kit is cached per model
  const kit = CA.propKit({ props, gymProps, bus: null }); assert.ok(kit.get('Lamp') && kit.get('Lockers')); assert.equal(CA.propKit({ props }).get('Lamp'), kit.get('Lamp'), 'parsed once per model');
  assert.equal(CA.propKit({}), null); assert.equal(CA.propKit(null), null);
  const B = () => ({ p: [], n: [], c: [] }), bt = { gloss: B(), matte: B(), glow: B(), lantern: B() };
  const m = new THREE.Matrix4().compose(new THREE.Vector3(3, 0, -2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1.4, 1, 1));
  const n = CA.placeProp(kit.get('Planter'), m, bt); assert.equal(n, report.Planter, 'all triangles placed');
  const pb = new THREE.Box3(); for (let i = 0; i < bt.matte.p.length; i += 3) pb.expandByPoint(new THREE.Vector3(bt.matte.p[i], bt.matte.p[i + 1], bt.matte.p[i + 2]));
  near((pb.min.x + pb.max.x) / 2, 3, .05, 'placed x'); near((pb.min.z + pb.max.z) / 2, -2, .1, 'placed z'); assert.ok(pb.max.z - pb.min.z > 1.4, 'turned and stretched along z');
  assert.ok(bt.matte.c.every(v => v >= 0 && v <= 1), 'linear colours in 0..1 (normalized COLOR_0)');
  assert.ok(bt.matte.n.every(Number.isFinite));

  // ---- the real sets, built in node: model or generated piece, never both
  require('../adventure/gloryland-map.js'); run('adventure/story/city-trees.js'); run('adventure/story/story-sets.js'); run('adventure/story/dream-sets.js'); run('adventure/story/market-sets.js');
  const S = window.StorySets; await S.ready(); if (!S.ids().includes('dream_street')) window.DreamSets.register();
  const build = (id, city) => { const scene = new THREE.Scene(), set = S.build(id, scene, { city }); const street = set.group.children.find(o => o.name === 'street'); const out = { set, street, gloss: set.group.getObjectByName('props (gloss)'), glow: set.group.getObjectByName('glow') }; return out; };
  // colours of the vertices of the street batch near a point (above y0)
  const around = (mesh, x, z, r, y0, y1) => { const P = mesh.geometry.attributes.position, Cc = mesh.geometry.attributes.color, out = new Set(); for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.hypot(P.getX(i) - x, P.getZ(i) - z) < r) out.add([Cc.getX(i), Cc.getY(i), Cc.getZ(i)].map(v => v.toFixed(3)).join()); } return out; };
  const glossAround = (mesh, x, z, r, y0, y1) => mesh ? around(mesh, x, z, r, y0, y1).size : 0;
  const lin = h => { const c = new THREE.Color(h).convertSRGBToLinear(); return [c.r, c.g, c.b].map(v => v.toFixed(3)).join(); };
  const gen = build('dream_street', null), mod = build('dream_street', { props });
  assert.deepEqual(gen.set.props, {}, 'no model: nothing placed');
  assert.deepEqual(mod.set.props, { Lamp: 11, Bin: 3, Planter: 5, Planter_wide: 4, Bollard: 4, Hydrant: 2, Bench: 1 }, JSON.stringify(mod.set.props));
  // a lamp site (x 44, z 4.15) and a bollard (19.7, 4.0): the generated post colour exists only without the model, the model's paint only with it
  assert.ok(around(gen.street, 44, 4.15, .3, 3, 3.7).has(lin('#2f3640')) && glossAround(gen.gloss, 44, 4.15, .3, 3, 3.7) === 0, 'generated lamp');
  assert.ok(!around(mod.street, 44, 4.15, .3, 3, 3.7).has(lin('#2f3640')) && glossAround(mod.gloss, 44, 4.15, .3, 3, 3.7) > 0, 'model lamp only');
  assert.ok(around(gen.street, 19.7, 4.0, .2, .1, .9).has(lin('#3b4350')) && !around(mod.street, 19.7, 4.0, .2, .1, .9).has(lin('#3b4350')), 'one bollard');
  assert.ok(glossAround(mod.gloss, 19.7, 4.0, .2, .1, .9) > 0, 'the bollard model is there');
  // morning: the lantern glass is pale glass in the glossy mesh, not in the unlit glow batch
  assert.equal(around(mod.glow, 44, 4.15, .3, 3.4, 3.95).size, 0, 'no glowing lantern by day');
  // the station model lamps keep their sites: with the station GLB the set places no lamp there
  const withStation = build('dream_street', { props, station: await parse(CA.FILES.station) });
  assert.equal(withStation.set.props.Lamp, 11 - CA.LAYOUT.lamps.length, 'station lamps are not doubled');
  for (const o of [gen, mod, withStation]) o.set.dispose();
  // the gym hall: every generated prop replaced once; heavy bags and the ring untouched
  const gg = build('dream_gym', null), gm = build('dream_gym', { gymProps });
  assert.deepEqual(gm.set.props, { Speed_bag: 1, Lockers: 1, Gym_bench: 1, Water_cooler: 1, Glove_rack: 1, Medicine_balls: 1, Dumbbell_rack: 1, Kettlebells: 1, Skipping_ropes: 1, Wall_clock: 1, Ring_bell: 1, Corner_stool: 1, Bucket_towel: 1, Pendant_lamp: 6 }, JSON.stringify(gm.set.props));
  const lockerCol = lin('#55657a'); assert.ok(around(gg.street, 10.64, 6.26, .5, -.01, 2).has(lockerCol) && !around(gm.street, 10.64, 6.26, .5, -.01, 2).has(lockerCol) && glossAround(gm.gloss, 10.64, 6.26, .5, -.01, 2) > 0, 'one locker bank');
  assert.ok(around(gg.glow, 2.6, 3.6, .2, 3.3, 3.6).size > 0 && around(gm.glow, 2.6, 3.6, .2, 3.3, 3.6).size > 0, 'pendant bulbs glow either way');
  const meshes = o => o.set.group.children.filter(m => m.isMesh).length; assert.ok(meshes(gm) - meshes(gg) <= 1, 'gym: at most one more draw call (' + meshes(gg) + ' -> ' + meshes(gm) + ')');
  const ms = o => o.set.group.children.filter(m => m.isMesh).length; assert.ok(ms(build('dream_street', { props })) - ms(build('dream_street', null)) <= 1, 'street: at most one more draw call');
  const mk = build('dream_market', { props }); assert.equal(mk.set.props.Bin, 2); assert.equal(mk.set.props.Planter_wide, 3);
  gg.set.dispose(); gm.set.dispose(); mk.set.dispose();

  // ---- delivery: the models are fetched by the page loader and kept by the offline worker's street cache after first use
  const html = fs.readFileSync('index.html', 'utf8'), scenes = fs.readFileSync('adventure/story/dream-scenes.js', 'utf8');
  assert.match(scenes, /dream_gym\/\.test\(scene0\.set\)\) cityWait = city\.ready\(undefined, \['gymProps'\]\)/);
  assert.match(scenes, /city\.ready\(undefined, \['hazelStall', 'tree', 'props'\]\)/);
  assert.ok(html.indexOf('city-assets.js?v=') < html.indexOf('story-sets.js?v=') || /CityAssets\?\.propKit/.test(fs.readFileSync('adventure/story/story-sets.js', 'utf8')), 'story-sets reads CityAssets lazily at build time');
  console.log('blender-props: ok', JSON.stringify(report));
})().catch(e => { console.error(e); process.exit(1); });
