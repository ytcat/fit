// node tests/blender-props-2.test.cjs — Blender props round 2 (owner 2026-11-24: more design work before the pause, stability first):
// Market Row, Otto's shop, the Docks, ringside and the bus stop (tools/blender/{market,dock,ring,stop}-props.py ->
// assets/street/ch01-props/*.glb, KHR_mesh_quantization). Budgets, the quantized files read like round 1's, and the real sets built in
// node: each piece exists once, as the model or as the generated fallback, never both; at most one more draw call per story set and
// none in the arena sets (their props bake into the existing sector meshes).
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
  const F = { marketProps: 'gloryland-market-props.glb', dockProps: 'gloryland-dock-props.glb', ringProps: 'gloryland-ring-props.glb', stopProps: 'gloryland-stop-props.glb' };
  const G = {};
  for (const [k, f] of Object.entries(F)) {
    assert.equal(CA.FILES[k], './assets/street/ch01-props/' + f);
    const bytes = fs.readFileSync('assets/street/ch01-props/' + f), j = JSON.parse(bytes.slice(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.ok(j.extensionsRequired.includes('KHR_mesh_quantization'), f + ': quantized (byte normals and colours)');
    assert.ok(bytes.length < 1.2e6, f + ': ' + bytes.length + ' bytes');
    G[k] = await parse('assets/street/ch01-props/' + f);
  }
  assert.ok(CA.OPENING_MODELS === undefined || true); // (not exported) the opening waits for stopProps through ready(): checked below via dream-scenes

  // ---- the models: one node per prop, budgets (4k, 8k for a big piece), classes, vertex colours, on the ground
  const FRUIT = ['apples', 'oranges', 'lemons', 'pears', 'plums', 'limes'];
  const BUDGET = {
    marketProps: Object.fromEntries([...FRUIT.map(k => ['Fruit_crate_' + k, 4000]), ['Stall_counter', 4000], ['Barrel', 4000], ['Sack', 4000], ...['apples', 'pears', 'oranges'].map(k => ['Basket_' + k, 4000]),
      ['Price_board', 4000], ['Hand_cart', 8000], ['Shop_counter', 4000], ['Cash_register', 4000], ['Glove_wall', 8000], ['Shop_shelf', 4000], ['Display_stand', 4000], ['Shop_cartons', 4000], ['Shop_bench', 4000], ['Shop_lamp', 4000]]),
    dockProps: { Dock_crate: 4000, Oil_drum_blue: 4000, Oil_drum_red: 4000, Oil_drum_green: 4000, Oil_drum_rust: 4000, Rope_coil: 4000, Mooring_bollard: 4000, Pallet: 4000, Cargo: 4000, Work_lamp: 4000 },
    ringProps: { Ring_stool: 4000, Water_bucket: 4000, Spit_bucket: 4000, Towel_rack: 4000, Ring_steps: 4000, Judges_table: 4000, Timekeeper_table: 4000 },
    stopProps: { Ticket_machine: 4000 }
  };
  const report = {}, HANG = ['Shop_lamp', 'Work_lamp'], WALL = { Glove_wall: 1.05 }; // the pegboard hangs from 1.05 m, origin on the floor below
  for (const [k, budget] of Object.entries(BUDGET)) {
    assert.deepEqual(G[k].scene.children.map(o => o.name).sort(), Object.keys(budget).sort(), k + ': one node per prop');
    for (const node of G[k].scene.children) {
      let tris = 0; node.traverse(o => { if (!o.isMesh) return; tris += o.geometry.index.count / 3; assert.ok(['gloss', 'matte', 'glow', 'lantern'].includes(o.material.name), node.name + ' class'); assert.ok(o.geometry.attributes.color, node.name + ' colours'); });
      assert.ok(tris <= budget[node.name], `${node.name}: ${tris} > ${budget[node.name]}`); report[node.name] = tris;
      const b = new THREE.Box3().setFromObject(node);
      if (HANG.includes(node.name)) assert.ok(b.min.y < 0 || Math.abs(b.min.y) < .01, node.name + ': hangs from its rim (origin)'); else near(b.min.y, WALL[node.name] || 0, .012, node.name + ' stands on the floor');
    }
  }
  const size = (k, n) => new THREE.Box3().setFromObject(G[k].scene.getObjectByName(n)).getSize(new THREE.Vector3());
  // sizes of the generated pieces they stand in for (market-sets.js, arena-sets.js, dream-sets.js)
  near(size('marketProps', 'Stall_counter').x, 3.0, .06, 'stall width 3.0 (scaled for 3.6)'); near(size('marketProps', 'Stall_counter').y, 2.9, .06, 'back posts under the awning (2.95)');
  near(size('marketProps', 'Shop_counter').x, 2.7, .03, 'counter top 2.7'); near(size('marketProps', 'Shop_counter').y, .95, .01, 'counter height');
  near(size('marketProps', 'Glove_wall').x, 4.6, .02, 'pegboard width'); assert.ok(size('marketProps', 'Glove_wall').z < .36, 'gloves within 0.36 m of the wall');
  near(size('marketProps', 'Barrel').x, .63, .03, 'barrel r 0.3'); near(size('dockProps', 'Oil_drum_blue').y, .88, .01, 'drum 0.88 m'); near(size('dockProps', 'Oil_drum_blue').x, .58, .02, 'drum r 0.29');
  near(size('dockProps', 'Dock_crate').y, .72, .01, 'crate 0.72'); near(size('dockProps', 'Pallet').y, .144, .005, 'pallet height'); near(size('dockProps', 'Cargo').y, .62, .01, 'cargo height');
  near(size('stopProps', 'Ticket_machine').y, 1.62, .02, 'ticket machine 1.55 + canopy'); assert.ok(size('stopProps', 'Ticket_machine').x <= .71, 'ticket machine footprint');
  near(size('ringProps', 'Timekeeper_table').x, 1.93, .05, 'table length 1.9'); near(size('ringProps', 'Ring_stool').y, .52, .01, 'stool seat 0.5');

  // ---- quantized files place like round 1's: unit normals, colours in 0..1
  const kit = CA.propKit({ ...G }); assert.ok(kit.get('Glove_wall') && kit.get('Dock_crate') && kit.get('Ticket_machine'));
  const B = () => ({ p: [], n: [], c: [] }), bt = { gloss: B(), matte: B(), glow: B(), lantern: B() };
  CA.placeProp(kit.get('Oil_drum_red'), new THREE.Matrix4().makeTranslation(2, 0, 1), bt);
  for (const q of Object.values(bt)) { for (let i = 0; i < q.n.length; i += 3) near(Math.hypot(q.n[i], q.n[i + 1], q.n[i + 2]), 1, 1e-3, 'unit normal'); assert.ok(q.c.every(v => v >= 0 && v <= 1), 'colours 0..1'); }
  assert.ok(bt.gloss.c.some((v, i) => i % 3 === 0 && v > bt.gloss.c[i + 2] * 2), 'red paint reads red');
  // cached(): what is loaded now, never waits
  assert.deepEqual(CA.cached(['nothing'], false), { nothing: null });

  // ---- story sets in node: model or generated, never both
  require('../adventure/gloryland-map.js'); run('adventure/story/city-trees.js'); run('adventure/story/story-sets.js'); run('adventure/story/dream-sets.js'); run('adventure/story/market-sets.js');
  const S = window.StorySets; await S.ready(); if (!S.ids().includes('dream_street')) window.DreamSets.register();
  const build = (id, city) => { const set = S.build(id, new THREE.Scene(), { city }); return { set, street: set.group.children.find(o => o.name === 'street'), gloss: set.group.getObjectByName('props (gloss)'), glow: set.group.getObjectByName('glow') }; };
  const around = (mesh, x, z, r, y0, y1) => { const out = new Set(); if (!mesh) return out; const P = mesh.geometry.attributes.position, Cc = mesh.geometry.attributes.color; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.hypot(P.getX(i) - x, P.getZ(i) - z) < r) out.add([Cc.getX(i), Cc.getY(i), Cc.getZ(i)].map(v => v.toFixed(3)).join()); } return out; };
  const lin = h => { const c = new THREE.Color(h).convertSRGBToLinear(); return [c.r, c.g, c.b].map(v => v.toFixed(3)).join(); };
  const meshes = o => o.set.group.children.filter(m => m.isMesh).length;
  const props = await parse('assets/street/ch01-props/gloryland-street-props.glb');

  // Market Row: eight counters, 24 crates on them, 15 on the ground, three barrels and sacks; additions only with the model
  const mg = build('dream_market', { props }), mm = build('dream_market', { props, marketProps: G.marketProps });
  const crates = Object.entries(mm.set.props).filter(([k]) => k.startsWith('Fruit_crate_')).reduce((a, [, n]) => a + n, 0);
  assert.equal(mm.set.props.Stall_counter, 8 + 1, 'eight stalls + Hazel\'s generated-stall fallback (no hazelStall model here)');
  assert.equal(crates, 9 * 3 + 3 + 15, 'crates on counters (9 x 3), Hazel\'s three, 15 on the ground');
  assert.equal(mm.set.props.Barrel, 3); assert.equal(mm.set.props.Sack, 3); assert.equal(mm.set.props.Hand_cart, 1); assert.equal(mm.set.props.Price_board, 3);
  assert.equal(['Basket_apples', 'Basket_pears', 'Basket_oranges'].reduce((a, k) => a + (mm.set.props[k] || 0), 0), 3);
  for (const k of ['Stall_counter', 'Barrel', 'Hand_cart']) assert.ok(!mg.set.props[k], 'no market model without its file: ' + k);
  // the generated counter (#a97c55) and barrel wood (#8a5a38) exist only without the model
  assert.ok(around(mg.street, -16.5, -3.15, 2.1, .87, .93).has(lin('#c29a6f')) && !around(mm.street, -16.5, -3.15, 2.1, .87, .93).has(lin('#c29a6f')), 'one counter');
  assert.ok(around(mg.street, -9.5, -2.0, .35, -.01, .81).has(lin('#8a5a38')) && !around(mm.street, -9.5, -2.0, .35, -.01, .81).has(lin('#8a5a38')), 'one barrel');
  assert.ok(meshes(mm) - meshes(mg) <= 1, `market: at most one more draw call (${meshes(mg)} -> ${meshes(mm)})`);
  // with Hazel's modelled stall the set builds no stall at x 0 at all (her GLB stays)
  const mh = build('dream_market', { props, marketProps: G.marketProps, hazelStall: { scene: new THREE.Group() } });
  assert.equal(mh.set.props.Stall_counter, 8, 'Hazel\'s stall stays her own model');

  // Otto's shop
  const sg = build('dream_shop', { props }), sm = build('dream_shop', { props, marketProps: G.marketProps });
  for (const [k, n] of Object.entries({ Shop_counter: 1, Cash_register: 1, Glove_wall: 1, Shop_shelf: 1, Display_stand: 1, Shop_cartons: 1, Shop_bench: 1, Shop_lamp: 3 })) assert.equal(sm.set.props[k], n, k);
  assert.ok(around(sg.street, 41.1, -3.18, 2.4, 1.0, 3.1).has(lin('#c9a77a')) && !around(sm.street, 41.1, -3.18, 2.4, 1.0, 3.1).has(lin('#c9a77a')), 'one pegboard');
  assert.ok(around(sg.street, 42.2, -1.55, .25, 1.0, 1.3).has(lin('#3b4350')) && !around(sm.street, 42.2, -1.55, .25, 1.0, 1.3).has(lin('#3b4350')), 'one till');
  assert.ok(around(sg.glow, 38.6, -1.4, .15, 2.5, 2.7).size > 0 && around(sm.glow, 38.6, -1.4, .15, 2.5, 2.8).size > 0, 'shop bulbs glow either way');
  assert.ok(meshes(sm) - meshes(sg) <= 1, `shop: at most one more draw call (${meshes(sg)} -> ${meshes(sm)})`);
  // the carried bag and its display point are untouched
  assert.deepEqual(sm.set.objects.display, sg.set.objects.display);

  // the opening's ticket machine
  const og = build('dream_street', { props }), om = build('dream_street', { props, stopProps: G.stopProps });
  assert.equal(om.set.props.Ticket_machine, 1); assert.ok(!og.set.props.Ticket_machine);
  assert.ok(around(og.street, -4.7, 6.3, .45, -.01, 1.56).has(lin('#2f6fc0')) && !around(om.street, -4.7, 6.3, .45, -.01, 1.56).has(lin('#2f6fc0')), 'one ticket machine');

  // Bruno's Gym on fight night: the timekeeper's table and spares, model only; the practice gym is unchanged
  const rg = build('dream_gym_ring', null), rm = build('dream_gym_ring', { ringProps: G.ringProps });
  assert.deepEqual(rm.set.props, { Timekeeper_table: 1, Towel_rack: 1, Water_bucket: 1, Spit_bucket: 1 }); assert.deepEqual(rg.set.props, {});
  assert.deepEqual(build('dream_gym', { ringProps: G.ringProps }).set.props, {}, 'ringside props only on fight night');

  // ---- the arena sets: the docks hangar and the ring venues, baked into the existing meshes (no extra draw call)
  const A = require('../arena-sets.js');
  for (const [id, need] of [['docks', { Dock_crate: 6, Pallet: 4, Cargo: 6, Mooring_bollard: 4, Rope_coil: 3, Work_lamp: 1 }], ['boxing_club', { Ring_stool: 1, Water_bucket: 1, Ring_steps: 1, Towel_rack: 1 }], ['regional', { Timekeeper_table: 1 }], ['championship', { Judges_table: 2, Timekeeper_table: 1 }]]) {
    const gen = A.build(id, 'en', null, { kit: null }), mod = A.build(id, 'en', null, { kit });
    for (const [k, n] of Object.entries(need)) assert.equal(mod.stats.props[k], n, id + ' ' + k);
    assert.deepEqual(gen.stats.props, {}, id + ': nothing placed without the models');
    assert.equal(mod.stats.meshes, gen.stats.meshes, `${id}: no extra draw call (${gen.stats.meshes} -> ${mod.stats.meshes})`);
    report['arena ' + id] = [gen.stats.triangles, mod.stats.triangles];
    gen.dispose(); mod.dispose();
  }
  const dk = A.build('docks', 'en', null, { kit }); assert.equal(Object.entries(dk.stats.props).filter(([k]) => k.startsWith('Oil_drum_')).reduce((a, [, n]) => a + n, 0), 6, 'six drums'); dk.dispose();

  // ---- delivery: the films wait for their files (never longer than CityAssets.WAIT_MS); the fight builds read the cache
  const scenes = fs.readFileSync('adventure/story/dream-scenes.js', 'utf8');
  assert.match(scenes, /city\.ready\(undefined, \['hazelStall', 'tree', 'props', 'marketProps'\]\)/);
  assert.match(scenes, /scene0\.set === 'dream_shop'\) cityWait = city\.ready\(undefined, \['props', 'marketProps'\]\)/);
  assert.match(scenes, /scene0\.set === 'dream_docks'\) cityWait = city\.ready\(undefined, \['dockProps'\]\)/);
  assert.match(fs.readFileSync('adventure/story/city-assets.js', 'utf8'), /OPENING_MODELS = \[[^\]]*'stopProps'\]/);
  assert.match(fs.readFileSync('adventure/story/gym-fight.js', 'utf8'), /CityAssets\?\.cached\?\.\(ring \? \['gymProps', 'ringProps'\]/);
  console.log('blender-props-2: ok', JSON.stringify(report));
})().catch(e => { console.error(e); process.exit(1); });
