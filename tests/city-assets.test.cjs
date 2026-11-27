// node tests/city-assets.test.cjs — GOTR-0089: Codex's street models in the Chapter 1 opening film (adventure/story/city-assets.js).
// Loader cache and fallback (stubbed loader), the real bus / station GLBs parsed with the page's GLTFLoader: wheel roll =
// distance / 0.515 m, the door clip against the Fighter's step-off, feet on the new paving, no GLB in the offline pack.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('adventure/story/city-assets.js', 'utf8'));
const C = require('../adventure/story/dream-core.js'), CA = window.CityAssets;
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} != ${b}`);

(async () => {
  // ---- loader: one request per file (cache), a failure falls back and is retried later, a slow file never blocks
  const calls = {}, pending = [];
  CA._setLoader(() => ({ load(url, ok, _p, err) { const n = url.split('/').pop().split('?')[0]; calls[n] = (calls[n] || 0) + 1; if (/bus|hazel/.test(n)) setTimeout(() => ok({ scene: new THREE.Group(), animations: [] }), 1); else if (/station/.test(n)) setTimeout(() => err(Error('404')), 1); else if (/oldtown/.test(n)) pending.push(ok); } }));
  assert.deepEqual(CA.status(), { harborcranefar: 'idle', harborcranemid: 'idle', harborcranenear: 'idle', harborshipfar: 'idle', harborshipmid: 'idle', harborshipnear: 'idle', harborContainer: 'idle', harborGull: 'idle', ferrisWheel: 'idle', movingHatchback: 'idle', oldParkFountain: 'idle', oldParkBroad: 'idle', oldParkUpright: 'idle', tree: 'idle', car: 'idle', bus: 'idle', station: 'idle', oldtown: 'idle', hazelStall: 'idle', props: 'idle', gymProps: 'idle', marketProps: 'idle', dockProps: 'idle', ringProps: 'idle', stopProps: 'idle' });
  const t0 = Date.now(), r1 = await CA.ready(60);
  assert.ok(Date.now() - t0 < 400, 'ready() returns after its timeout even while a file is still loading');
  assert.ok(r1.bus && r1.tree === null && r1.station === null && r1.oldtown === null, 'only what is ready is used');
  assert.deepEqual(CA.status(), { harborcranefar: 'idle', harborcranemid: 'idle', harborcranenear: 'idle', harborshipfar: 'idle', harborshipmid: 'idle', harborshipnear: 'idle', harborContainer: 'idle', harborGull: 'idle', ferrisWheel: 'idle', movingHatchback: 'idle', oldParkFountain: 'idle', oldParkBroad: 'idle', oldParkUpright: 'idle', tree: 'loading', car: 'loading', bus: 'ready', station: 'failed', oldtown: 'loading', hazelStall: 'idle', props: 'loading', gymProps: 'idle', marketProps: 'idle', dockProps: 'idle', ringProps: 'idle', stopProps: 'loading' }); // the street and bus-stop props join the opening preload, the gym's, market's, docks' and ring's do not
  await CA.ready(30); await CA.preload(['bus']);
  assert.equal(calls['gloryland-bus.glb'], 1, 'the bus is fetched once (cache)'); assert.equal(calls['gloryland-oldtown.glb'], 1, 'a slow file is not requested twice');
  assert.equal(calls['gloryland-station.glb'], 2, 'a failed file is tried again next time');
  pending[0]({ scene: new THREE.Group(), animations: [] }); await new Promise(r => setTimeout(r, 5));
  assert.equal(CA.status().oldtown, 'ready', 'a late file is ready for the next play');
  assert.equal(calls['hazel-fruit-stall-city.glb'], undefined, 'opening preload does not fetch market art');
  const market = await CA.ready(60, ['hazelStall']);
  assert.deepEqual(Object.keys(market), ['hazelStall']);
  assert.ok(market.hazelStall);
  await CA.ready(60, ['hazelStall']);
  assert.equal(calls['hazel-fruit-stall-city.glb'], 1, 'the market films share the cached model');

  // ---- the real models (the page's r128 GLTFLoader)
  const parse = f => new Promise((ok, err) => { const b = fs.readFileSync(f); new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), './', ok, err); });
  const bus = await parse('assets/street/ch01-bus/gloryland-bus.glb'), station = await parse('assets/street/ch01-station/gloryland-station.glb');
  const tree = await parse(CA.FILES.tree);
  const treeSet = { group: new THREE.Group(), objects: {}, disposables: [] };
  const treeArt = CA.dress(treeSet, { tree });
  const treeInstance = treeSet.group.getObjectByName('Old Town street tree');
  assert.ok(treeArt.active && treeInstance && treeArt.stats().triangles <= 59000, 'three trees use a bounded geometry budget');
  const authored = CA.ARRIVAL_TREES.filter(p => p.form === 'street'); // the 'broad' site is city-trees.js (tests/arrival-background.test.cjs)
  const models = authored.map(p => treeSet.group.getObjectByName(p.name));
  assert.equal(models.filter(Boolean).length, 3);
  assert.equal(new Set(models.map(o => o.scale.toArray().join(','))).size, 3);
  for (const [i, model] of models.entries()) {
    const site = authored[i];
    assert.deepEqual(model.position.toArray(), [site.x, 0, site.z]);
    const meshes = root => { const found = []; root.traverse(o => { if (o.isSkinnedMesh) found.push(o); }); return found; };
    meshes(model).forEach((mesh, j) => {
      assert.equal(mesh.geometry, meshes(tree.scene)[j].geometry, 'reuse authored geometry');
      assert.equal(mesh.material, meshes(tree.scene)[j].material, 'reuse authored material and maps');
      assert.ok(mesh.skeleton.bones.every(bone => model.getObjectById(bone.id)), 'skin binds to its own instance only');
      assert.equal(mesh.castShadow, false, 'no extra shadow-map draw');
    });
  }
  const marketTreeSet = { group: new THREE.Group(), objects: {}, disposables: [] };
  const marketTreeArt = CA.dress(marketTreeSet, { tree }, CA.MARKET_TREES);
  assert.ok(marketTreeArt.stats().triangles <= 40000);
  assert.equal(marketTreeSet.group.getObjectByName(CA.ARRIVAL_TREES[0].name), undefined, 'Market does not import the arrival placement');
  for (const site of CA.MARKET_TREES) assert.deepEqual(marketTreeSet.group.getObjectByName(site.name)?.position.toArray(), [site.x, 0, site.z]);
  const sourceBones = [], instanceBones = [];
  tree.scene.traverse(node => { if (node.isBone) sourceBones.push(node); });
  treeInstance.traverse(node => {
    if (node.isBone) instanceBones.push(node);
    if (node.isSkinnedMesh) assert.ok(node.skeleton.bones.every(bone => treeInstance.getObjectById(bone.id)), 'skin binds to the instance');
  });
  assert.equal(instanceBones.length, 3, 'the tree has the authored three-bone rig');
  const cam = new THREE.PerspectiveCamera(36, 402 / 690, .1, 220);
  cam.position.set(10, 1.5, 5); cam.lookAt(10, 2.5, 25);
  treeArt.frame({ t: .5 }, cam);
  assert.ok(models.some(o => !o.visible), 'off-screen authored trees are culled at phone aspect');
  cam.position.set(16, 2, 5); cam.lookAt(17.4, 2.5, -5.4);
  treeArt.frame({ t: .5 }, cam);
  assert.ok(models[2].visible, 'visible arrival tree is not culled');
  const templatePose = sourceBones.map(bone => bone.quaternion.clone());
  treeArt.frame({ t: 0 });
  const initialPose = instanceBones.map(bone => bone.quaternion.clone());
  treeArt.frame({ t: 1 });
  assert.ok(instanceBones.some((bone, i) => bone.quaternion.angleTo(initialPose[i]) > .001), 'the breeze animates the instance');
  assert.ok(sourceBones.every((bone, i) => bone.quaternion.equals(templatePose[i])), 'the cached tree keeps its initial pose');
  treeArt.frame({ t: 0 });
  assert.ok(instanceBones.every((bone, i) => bone.quaternion.equals(initialPose[i])), 'replaying the first frame resets the pose');
  for (const disposable of treeSet.disposables) disposable.dispose();
  const hazelStall = await parse('assets/street/ch01-market/hazel-fruit-stall-city.glb');
  const marketSet = { group: new THREE.Group(), objects: {}, disposables: [] };
  const marketArt = CA.dress(marketSet, { hazelStall });
  const stall = marketSet.group.getObjectByName("Hazel's fruit stall");
  assert.ok(marketArt.active && stall);
  const stallBox = new THREE.Box3().setFromObject(stall);
  near(stallBox.min.y, 0, .03, 'stall rests on the market pavement');
  assert.ok(stallBox.max.z < -2.2, 'stall stays behind the walking lane');
  assert.ok(marketArt.stats().triangles <= 57000, 'stall fits its stated geometry budget');
  for (const disposable of marketSet.disposables) disposable.dispose();
  require('../adventure/gloryland-map.js'); const K = window.GlorylandMap.kit;
  K.initProtos();
  const c = { group: new THREE.Group(), objects: {}, disposables: [], opts: {}, K,
    box: (B,x,y,z,w,h,d,color) => B.add(K.P.box,K.M(x,y,z,w,h,d),K.C(color)) };
  const h = CA.dress(c, { bus, station, oldtown: null });
  assert.ok(h.active && h.bus && h.station && !h.oldtown && c.objects.bus === h.bus.wrap, 'the wrapper is objects.bus');
  c.group.updateMatrixWorld(true);
  const m = h.bus.model.matrixWorld; assert.ok(m.determinant() > 0, 'never mirrored'); h.bus.model.traverse(o => assert.ok(o.scale.x > 0 && o.scale.y > 0 && o.scale.z > 0, 'positive scale ' + o.name));
  near(h.bus.wrap.position.y, -.15, 1e-9, 'root at road level'); near(new THREE.Box3().setFromObject(h.bus.model).min.y, -.15, .01, 'tyres on the road');
  // owner 2026-11-25: nothing of the static body lies over a kerb-side door opening (the fleet name hung in the air in the open
  // middle doors); what is on a leaf is that leaf's child and swings with it (scripts/authoring/patch_bus_door_parts.py)
  {
    const inv = new THREE.Matrix4().copy(h.bus.model.matrixWorld).invert(), v = new THREE.Vector3(), over = {};
    h.bus.model.getObjectByName('Body').traverse(o => { if (!o.isMesh) return; const pos = o.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        for (const [lo, hi] of [[-1.02, .22], [3.86, 5.12]]) if (v.x > lo + .03 && v.x < hi - .03 && v.y > .42 && v.y < 2.66 && v.z < -1.24) over[o.name] = (over[o.name] || 0) + 1; } });
    assert.deepEqual(over, {}, 'static body parts over the kerb-side doors');
    const marker = h.bus.model.getObjectByName('Entry_right_door').children.find(o => o.isMesh && /amber indicators/.test(o.material.name)); // node 'Entry_right_door__12 amber indicators'
    assert.ok(marker?.isMesh && marker.parent.name === 'Entry_right_door', 'the front side marker is on the door leaf');
    const at = t => { h.bus.door(t); h.bus.model.updateMatrixWorld(true); return new THREE.Box3().setFromObject(marker).getCenter(new THREE.Vector3()).applyMatrix4(inv); };
    const shut = at(0); near(shut.x, 4.87, .01, 'marker where it was (closed)'); near(shut.y, .58, .01, 'marker height'); assert.ok(at(1.3).distanceTo(shut) > .3, 'the marker swings out with its leaf'); at(0);
  }
  const realGlass=[]; h.bus.model.traverse(o => { if(o.isMesh && o.material.name.includes('safety glass')) realGlass.push(o); });
  assert.equal(realGlass.length,5,'door leaves and the main coach keep their authored glass');
  assert.ok(realGlass.every(o=>o.material.transparent && !o.material.depthWrite && o.material.opacity<.3 && !o.castShadow));
  assert.equal(h.bus.cabinLOD.geometry.attributes.position.count/3,288,'deliberately bounded low-poly seats');
  const nextToNose=()=>{ cam.position.set(h.bus.wrap.position.x+10,1.55,h.bus.wrap.position.z+3); h.frame({},cam); };
  nextToNose();
  assert.ok(h.bus.inside.every(o=>o.visible) && !h.bus.cabinLOD.visible,'near front/door keeps seats even >9m from the coach midpoint');
  cam.position.set(h.bus.wrap.position.x,1.55,h.bus.wrap.position.z+13); h.frame({},cam);
  assert.ok(h.bus.inside.every(o=>!o.visible) && h.bus.cabinLOD.visible,'middle-distance panes keep silhouettes');
  cam.position.z+=30; h.frame({},cam);
  assert.ok(h.bus.inside.every(o=>!o.visible) && !h.bus.cabinLOD.visible,'very distant coach draws neither seat set');
  h.bus.x0 = null; // start the independent film-roll test at its original first frame
  // wheels: roll = road distance / 0.515 m over the whole film
  const film = C.withCity(C.scenes.dream_opening), wheel = h.bus.wheels[0], x0 = film.props.bus[0].v[0];
  assert.equal(h.bus.wheels.length, 4); assert.equal(CA.TIRE_R, .515);
  for (let t = 0; t <= 16; t += .5) { const s = C.sample(film, t); h.bus.wrap.position.x = s.props.bus[0]; h.frame(s, null); near(wheel.rotation.z, -(x0 - s.props.bus[0]) / .515, 1e-9, 'wheel angle at ' + t); }
  near(CA.wheelAngle(2 * Math.PI * .515), -2 * Math.PI, 1e-12, 'one tyre circumference = one turn');
  // doors vs the step-off: open only once the bus stands, fully open while he steps down, shut before it drives away
  const leaf = h.bus.model.getObjectByName('Entry_left_door'), open = t => { const s = C.sample(film, t); h.bus.wrap.position.x = s.props.bus[0]; h.frame(s, null); c.group.updateMatrixWorld(true); return Math.abs(leaf.rotation.y); };
  const moving = t => Math.abs(C.sample(film, t + .05).props.bus[0] - C.sample(film, t).props.bus[0]) > 1e-4;
  const steps = film.actors.fighter.keys, down0 = steps.find(k => k.y === .57 && k.t > 7).t, kerb = steps.find(k => k.y === 0 && k.t > 7).t;
  for (let t = 5; t < 12; t += .05) {
    if (moving(t)) assert.ok(open(t) < .01, 'doors shut while the bus moves, t ' + t.toFixed(2));
    if (t >= down0 && t <= kerb + .3) {
      assert.ok(open(t) > 1.4, 'doors fully open during the step-off, t ' + t.toFixed(2));
      // he passes between the open leaves (shoulders and the shoulder bag: 0.42 m each side of his centre line)
      const f = C.sample(film, t).actors.fighter, boxes = ['Entry_left_door', 'Entry_right_door'].map(n => new THREE.Box3().setFromObject(h.bus.model.getObjectByName(n)));
      for (const b of boxes) if (f.z + .25 > b.min.z && f.z - .25 < b.max.z) assert.ok(f.x + .42 < b.min.x || f.x - .42 > b.max.x, 'clear of the door leaves at ' + t.toFixed(2));
    }
  }
  assert.ok(open(film.props.doorClip.find(k => k.v[0] === 0 && k.t > 0).t + .01) >= 0 && !moving(6.75), 'doors start once the bus stands');
  // markers: the step-off starts on the entry floor and ends on the kerb marker
  const mk = n => { const v = new THREE.Vector3(); h.bus.model.getObjectByName(n).getWorldPosition(v); return v; };
  h.bus.wrap.position.x = C.BUS_STOP; c.group.updateMatrixWorld(true);
  const fl = mk('Entry_floor_marker'), cu = mk('Entry_curb_marker'), st = steps.find(k => k.t === down0), ke = steps.find(k => k.t === kerb);
  near(st.x, fl.x, .02, 'step-off from the floor marker x'); near(st.z, fl.z, .02, 'floor marker z'); near(st.y, fl.y, .02, 'floor marker height');
  near(ke.x, cu.x, .02, 'kerb marker x'); near(ke.z, cu.z, .02, 'kerb marker z'); near(ke.y, cu.y, .02, 'kerb marker height');
  // feet on the paving: the ground under every pavement position of the walk is at his foot height
  const ground = [], rc = new THREE.Raycaster(); c.group.traverse(o => { if (o.isMesh && /stone|asphalt/.test(o.material.name)) ground.push(o); });
  const groundAt = (x, z) => { let best = -1; for (const [dx, dz] of [[0, 0], [.06, .06], [-.06, .06], [.06, -.06], [-.06, -.06]]) { rc.set(new THREE.Vector3(x + dx, 5, z + dz), new THREE.Vector3(0, -1, 0)); const hit = rc.intersectObjects(ground, false)[0]; if (hit) best = Math.max(best, hit.point.y); } return best; };
  let n = 0;
  for (let t = kerb; t <= 29.5; t += .25) { const f = C.sample(film, t).actors.fighter; if (f.x < CA.LAYOUT.gap[0] || f.x > CA.LAYOUT.gap[1] || f.z < -3.4) continue; const g = groundAt(f.x, f.z); near(f.y, g, .025, `foot height at t ${t.toFixed(2)} (${f.x.toFixed(2)}, ${f.z.toFixed(2)})`); n++; }
  assert.ok(n > 40, 'checked the walk: ' + n);
  // nobody walks through the shelter, the stop sign, the lamps or the bins
  const solids = c.group.getObjectByName('city art (GLB)').children.filter(o => /Shelter|Bus_stop_sign|Streetlamp|Litter_bin|Bench/.test(o.name)).map(o => new THREE.Box3().setFromObject(o));
  assert.ok(solids.length >= 12, 'street furniture placed: ' + solids.length);
  for (let t = kerb; t <= 29.5; t += .1) { const f = C.sample(film, t).actors.fighter; if (!f.walking && t > 9.6 && t < 15.6) continue; for (const b of solids) assert.ok(!(f.x + .3 > b.min.x && f.x - .3 < b.max.x && f.z + .3 > b.min.z && f.z - .3 < b.max.z), `walks into street furniture at t ${t.toFixed(1)}`); }
  // the camera never stands inside an Old Town prototype (front wall + 1.05 m of sills and awnings, 6.7 m deep)
  for (let t = 0; t <= film.duration; t += .1) { const p = C.sample(film, t).camera.pos; for (const [kind, x, z, ry] of CA.LAYOUT.houses) { const hw = kind === 'brick' ? 3.9 : 3.6, out = ry ? [z - 1.05, z + 6.7] : [z - 6.7, z + 1.05]; assert.ok(!(Math.abs(p[0] - x) < hw && p[2] > out[0] && p[2] < out[1] && p[1] < 13), `camera inside the ${kind} house at t ${t.toFixed(1)}`); } }
  // GPU resources go when the set goes
  let disposed = 0; bus.scene.traverse(o => { if (o.isMesh) o.geometry.addEventListener('dispose', () => disposed++); }); for (const d of c.disposables) d.dispose();
  assert.ok(disposed > 30, 'bus geometry disposed: ' + disposed);

  // ---- phones: the ~19 MB of models are never precached by the offline pack (runtime cache on first use only)
  const manifest = JSON.parse(fs.readFileSync('offline-manifest.json', 'utf8')), worker = fs.readFileSync('offline-worker.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
  const marketPrefix = './assets/street/city-review/market-stalls-v1/';
  const approvedStalls = fs.readdirSync(marketPrefix).filter(n => n.endsWith('.glb')).map(n => marketPrefix + n).sort();
  assert.equal(approvedStalls.length, 9, 'five stall types, nine approved GLBs');
  assert.deepEqual(manifest.urls.filter(u => /assets\/street\/[^?]+\.glb(?:\?|$)/.test(u)).sort(), approvedStalls, 'only approved stall GLBs enter the optional offline pack');
  for (const u of manifest.urls.filter(u => /\.glb/.test(u))) {
    assert.ok(approvedStalls.includes(u) || /^\.\/assets\/characters\/[a-z]+\/[a-z]+-head\.glb\?v=\d+$/.test(u), 'large scene and vehicle models stay on demand: ' + u);
    assert.ok(fs.statSync(u.slice(2).split('?')[0]).size < 1.5e6, 'each precached model stays small: ' + u);
  }
  const cityScript = html.match(/src="(\.\/adventure\/story\/city-assets\.js\?v=[\w-]+)"/)?.[1];
  assert.ok(cityScript && manifest.urls.includes(cityScript), 'the exact loader URL is offline');
  assert.ok(html.indexOf('city-assets.js') < html.indexOf('dream-sets.js') && html.indexOf('GLTFLoader.js') < html.indexOf('city-assets.js'), 'load order');
  assert.ok(worker.includes('\\/assets\\/street\\/') && /caches\.open\(STREET\)/.test(worker), 'the offline worker keeps a model after first use (runtime cache)');
  assert.ok(/street\.match\(event\.request\)/.test(worker) && /street\.delete\(event\.request,\{ignoreSearch:true\}\)/.test(worker), 'a new ?v= of a street model replaces the cached older copy');
  assert.ok(/gloryland-bus\.glb\?v=\d+/.test(fs.readFileSync('adventure/story/city-assets.js', 'utf8')), 'the bus model URL carries its version');
  assert.ok(/CityAssets\?\.preload\(\)/.test(fs.readFileSync('adventure/oldtown.js', 'utf8')), 'preload when the Adventure opens the first time');
  console.log('city assets: ok', JSON.stringify({ walkChecks: n, solids: solids.length }));
})().catch(e => { console.error(e); process.exit(1); });
