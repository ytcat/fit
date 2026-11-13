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
  CA._setLoader(() => ({ load(url, ok, _p, err) { const n = url.split('/').pop(); calls[n] = (calls[n] || 0) + 1; if (/bus/.test(n)) setTimeout(() => ok({ scene: new THREE.Group(), animations: [] }), 1); else if (/station/.test(n)) setTimeout(() => err(Error('404')), 1); else pending.push(ok); } }));
  assert.deepEqual(CA.status(), { bus: 'idle', station: 'idle', oldtown: 'idle' });
  const t0 = Date.now(), r1 = await CA.ready(60);
  assert.ok(Date.now() - t0 < 400, 'ready() returns after its timeout even while a file is still loading');
  assert.ok(r1.bus && r1.station === null && r1.oldtown === null, 'only what is ready is used');
  assert.deepEqual(CA.status(), { bus: 'ready', station: 'failed', oldtown: 'loading' });
  await CA.ready(30); await CA.preload(['bus']);
  assert.equal(calls['gloryland-bus.glb'], 1, 'the bus is fetched once (cache)'); assert.equal(calls['gloryland-oldtown.glb'], 1, 'a slow file is not requested twice');
  assert.equal(calls['gloryland-station.glb'], 2, 'a failed file is tried again next time');
  pending[0]({ scene: new THREE.Group(), animations: [] }); await new Promise(r => setTimeout(r, 5));
  assert.equal(CA.status().oldtown, 'ready', 'a late file is ready for the next play');

  // ---- the real models (the page's r128 GLTFLoader)
  const parse = f => new Promise((ok, err) => { const b = fs.readFileSync(f); new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), './', ok, err); });
  const bus = await parse('assets/street/ch01-bus/gloryland-bus.glb'), station = await parse('assets/street/ch01-station/gloryland-station.glb');
  const c = { group: new THREE.Group(), objects: {}, disposables: [], opts: {} }, h = CA.dress(c, { bus, station, oldtown: null });
  assert.ok(h.active && h.bus && h.station && !h.oldtown && c.objects.bus === h.bus.wrap, 'the wrapper is objects.bus');
  c.group.updateMatrixWorld(true);
  const m = h.bus.model.matrixWorld; assert.ok(m.determinant() > 0, 'never mirrored'); h.bus.model.traverse(o => assert.ok(o.scale.x > 0 && o.scale.y > 0 && o.scale.z > 0, 'positive scale ' + o.name));
  near(h.bus.wrap.position.y, -.15, 1e-9, 'root at road level'); near(new THREE.Box3().setFromObject(h.bus.model).min.y, -.15, .01, 'tyres on the road');
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
  assert.ok(!manifest.urls.some(u => /\.glb|assets\/street\//.test(u)), 'no city model in the offline manifest');
  assert.ok(manifest.urls.some(u => /adventure\/story\/city-assets\.js\?v=/.test(u)), 'the loader script itself is offline');
  assert.ok(/city-assets\.js\?v=\d+/.test(html) && html.indexOf('city-assets.js') < html.indexOf('dream-sets.js') && html.indexOf('GLTFLoader.js') < html.indexOf('city-assets.js'), 'load order');
  assert.ok(!/\.glb/.test(fs.readFileSync('scripts/build_offline_manifest.py', 'utf8')), 'the manifest builder does not add models');
  assert.ok(worker.includes('\\/assets\\/street\\/') && /caches\.open\(STREET\)/.test(worker), 'the offline worker keeps a model after first use (runtime cache)');
  assert.ok(/CityAssets\?\.preload\(\)/.test(fs.readFileSync('adventure/oldtown.js', 'utf8')), 'preload when the Adventure opens the first time');
  console.log('city assets: ok', JSON.stringify({ walkChecks: n, solids: solids.length }));
})().catch(e => { console.error(e); process.exit(1); });
