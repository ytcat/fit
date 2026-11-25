// node tests/hazel-head.test.cjs — Mrs. Hazel's authored head (TRELLIS.2, owner approved 2026-11-25: "perfect") on the game rig
// (cast-market.js, the same path as Fang's): the real GLB parsed with the page's GLTFLoader (budget, frame, one JPEG); a failed
// download keeps the code head and her headscarf (never both) and a later call retries; on the head joint, the code head and the
// skinned headscarf off the render layers, the skin head folded inside the model and restored exactly; it follows the head joint
// through her films (robbery: at the stall, the snatch, the reach; reward: the bag handed back, talk, walk, stoop); offline pack.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; global.addEventListener = () => {};
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
const RealLoader = THREE.GLTFLoader; let mode = 'fail'; const requests = [];
THREE.GLTFLoader = class { load(url, ok, _p, err) { requests.push(url); if (mode === 'fail' || !/hazel/.test(url)) { setTimeout(() => err(Error('404')), 1); return; } const b = fs.readFileSync(url.replace(/^\.\//, '').split('?')[0]); new RealLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), '', ok, err); } };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const H = StoryCast.market.heads.hazel, FILE = 'assets/characters/hazel/hazel-head.glb';
const Core = require('../adventure/story/dream-core'), M = require('../adventure/story/market-core');

(async () => {
  // ---- the file: one mesh, phone budget, one JPEG <= 1024 px, static, nothing the r128 loader cannot read
  const glb = fs.readFileSync(FILE), json = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  assert.ok(glb.length < 1.5e6, 'small file: ' + glb.length);
  assert.ok(!json.extensionsRequired?.length, 'no required extensions'); assert.equal(json.meshes.length, 1, 'one mesh (no neck scarf node)'); assert.equal(json.materials.length, 1);
  assert.equal(json.images.length, 1); assert.equal(json.images[0].mimeType, 'image/jpeg'); assert.ok(!json.animations?.length && !json.skins?.length, 'static');
  assert.ok(!json.materials[0].pbrMetallicRoughness?.metallicRoughnessTexture && !(json.materials[0].pbrMetallicRoughness?.metallicFactor > 0), 'no metal map, no metal');
  const tris = json.meshes[0].primitives.reduce((n, p) => n + json.accessors[p.indices].count / 3, 0); assert.ok(tris >= 12000 && tris <= 20000, 'triangles ' + tris);
  const bin = 20 + glb.readUInt32LE(12) + 8, bv = json.bufferViews[json.images[0].bufferView], img = glb.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength);
  let at = 2, size = null; assert.equal(img.readUInt16BE(0), 0xffd8, 'a JPEG');
  while (at < img.length && !size) { const m = img.readUInt16BE(at), len = img.readUInt16BE(at + 2); if (m >= 0xffc0 && m <= 0xffc3) size = [img.readUInt16BE(at + 7), img.readUInt16BE(at + 5)]; at += 2 + len; }
  assert.ok(size && size[0] <= 1024 && size[1] <= 1024, 'texture at most 1024 px: ' + size);
  const pos = json.accessors[json.meshes[0].primitives[0].attributes.POSITION], [x0, y0, z0] = pos.min, [x1, y1, z1] = pos.max;
  assert.ok(z1 > .32 && z1 < .39, 'nose forward (+Z) where the code head has it (0.36): ' + z1);
  assert.ok(x1 > .28 && x1 < .36 && Math.abs(x0 + x1) < .02, 'ears out to the sides like the code head (0.35), centred: ' + x0 + '..' + x1);
  assert.ok(y1 > .34 && y1 < .44 && y0 > -.24 && y0 < -.16, 'kerchief on top, the neck stump below the jaw: ' + y0 + '..' + y1);

  // ---- fallback: the download fails -> the code head and the headscarf stay, nothing hidden, no model
  const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
  data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json')); global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
  const c = StoryCast.rig('hazel', engine); await H.ready(2000);
  const head = c.joints.head, code = []; for (const o of head.children) o.traverse(q => { if (q.isMesh) code.push(q); });
  const scarf = c.root.getObjectByName('Hazel: headscarf'); assert.ok(scarf?.isSkinnedMesh, 'the code headscarf is a skinned shell');
  const P0 = c.castBase.position.array.slice();
  assert.equal(H.state(), 'failed'); assert.equal(c.castHead.on, false); assert.ok(code.length > 10 && code.every(o => o.layers.mask === 1) && scarf.layers.mask === 1, 'code head and scarf show');
  assert.ok(!head.getObjectByName('Hazel: authored head'), 'never both');
  assert.equal(StoryCast.market.head.state(), 'idle', "Fang's file is not asked for by Hazel");

  // ---- a later call retries; when it arrives it goes on the rig that is already built
  mode = 'ok'; assert.equal(await H.ready(20000), 'ready'); assert.ok(requests.filter(u => /hazel/.test(u)).length >= 2 && requests.every(u => u === H.url), 'retried, same URL');
  assert.equal(c.castHead.on, true);
  const model = head.getObjectByName('Hazel: authored head'); assert.ok(model && model.parent === head, 'a child of the head joint');
  let mesh = null; model.traverse(o => { if (o.isMesh) mesh = o; }); assert.ok(mesh.castShadow && mesh.layers.mask === 1 && mesh.material.metalness === 0 && mesh.material.map?.encoding === THREE.sRGBEncoding);
  assert.ok(code.every(o => o.layers.mask === 0) && scarf.layers.mask === 0, 'code head, knot and headscarf off the render layers (no doubled kerchief)'); const vis = code.map(o => o.visible);
  // the skin's head and neck above the cardigan fold into the model; nothing below the collar moves
  const a = c.castBase.position.array, box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position); box.expandByScalar(-.01);
  let folded = 0, deep = 0, out = 0;
  for (let i = 0; i < a.length / 3; i++) {
    const moved = a[i * 3] !== P0[i * 3] || a[i * 3 + 2] !== P0[i * 3 + 2];
    if (P0[i * 3 + 1] < 1.78) { assert.ok(!moved, 'no change below the collar'); continue; }
    if (moved) folded++;
    if (moved && P0[i * 3 + 1] > 1.86) { deep++; if (!box.containsPoint(new THREE.Vector3(-a[i * 3], a[i * 3 + 1] - 1.84, a[i * 3 + 2]))) out++; }
  }
  assert.ok(folded > 15000, 'skin head folded: ' + folded); assert.ok(out / deep < .01, 'the folded skin head lies inside the model: ' + out + ' of ' + deep);
  // off: exactly as before; on again
  assert.equal(H.on(c, false), false); assert.ok(!model.parent && code.every(o => o.layers.mask === 1) && scarf.layers.mask === 1, 'code head back');
  assert.deepEqual(c.castBase.position.array, P0, 'skin restored exactly'); assert.deepEqual(code.map(o => o.visible), vis, 'visible flags untouched');
  assert.equal(H.on(c, true), true); assert.equal(H.on(c, true), true, 'idempotent'); assert.equal(head.children.filter(o => o.name === 'Hazel: authored head').length, 1);

  // ---- her films: the model rides the head joint in every pose (talk, walk, stoop, the bag snatched and reached for, the bag handed back)
  const V = (...v) => new THREE.Vector3(...v);
  let n = 0, lowEye = 9, highFloat = 0;
  for (const id of ['dream_market_robbery', 'dream_market_reward']) {
    const S = M.scenes[id];
    for (let t = 0; t <= S.duration; t += .25) {
      const s = Core.sample(S, t), st = s.actors.hazel; if (!st || st.act === 'off') continue;
      c.root.position.set(st.x, st.y || 0, st.z); c.root.rotation.set(0, st.ry, 0); c.root.scale.set(-1, 1, 1); c.root.updateMatrixWorld(true);
      DreamPose.civil(c, { t, dt: 1 / 30, dist: st.dist, walk: +st.walking, arms: st.arms, lean: st.lean, talk: st.talk ? 1 : 0, look: { yaw: 0, pitch: 0 } });
      if (st.talk) StoryCast.talk(c, .8); c.updateMane(t); c.root.updateMatrixWorld(true);
      assert.ok(model.matrixWorld.equals(head.matrixWorld), id + ' t ' + t.toFixed(2) + ': follows the head joint');
      const eye = V(.12, .18, .1).applyMatrix4(head.matrixWorld); lowEye = Math.min(lowEye, eye.y); n++;
    }
  }
  assert.ok(n > 100 && lowEye > 1.3, 'standing in her films, eyes at ' + lowEye.toFixed(2) + ' m (' + n + ' poses)');
  // the ground rule (same as Fang's): lying on her back the model is raised off the ground, standing it sits on the joint again
  const lowest = () => { c.root.updateMatrixWorld(true); let y = 1e9; const P = mesh.geometry.attributes.position, v = V(); for (let i = 0; i < P.count; i += 7) y = Math.min(y, v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld).y); return y; };
  DreamPose.civil(c, { t: 1, dt: 1 / 30, dist: 0 }); c.root.position.set(0, .25, 0); c.root.rotation.set(-Math.PI / 2, 0, 0); c.root.scale.set(1, 1, 1);
  const sunk = lowest(); for (let k = 1; k <= 40; k++) c.updateMane(100 + k / 30); const rested = lowest();
  assert.ok(rested > sunk + .05, 'lying down the head is raised: ' + sunk.toFixed(3) + ' -> ' + rested.toFixed(3));
  c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); DreamPose.civil(c, { t: 2, dt: 1 / 30, dist: 0 }); for (let k = 1; k <= 60; k++) c.updateMane(102 + k / 30);
  assert.ok(Math.abs(model.rotation.x) < .01 && model.position.length() < .005, 'standing: on the joint again');

  // ---- wiring: offline pack, films and portrait wait for it
  const manifest = JSON.parse(fs.readFileSync('offline-manifest.json', 'utf8')); assert.ok(manifest.urls.includes(H.url), 'precached under the URL the page asks for');
  const dream = fs.readFileSync('adventure/story/dream-scenes.js', 'utf8'); assert.ok(/market\.heads\[r\]\.ready\(5000\)/.test(dream) && /\['fang', 'hazel'\]/.test(dream), 'films with her (and the film before the market) ask for her head');
  for (const id of ['dream_market_robbery', 'dream_market_reward']) assert.ok(Object.values(M.scenes[id].actors).some(x => x.rig === 'hazel'), id + ' has Hazel');
  assert.ok(/market\?\.heads\?\.\[rig\?\.castHead\?\.id\]/.test(fs.readFileSync('adventure/portraits.js', 'utf8')), 'the portrait waits for her head');
  console.log('hazel head ok', JSON.stringify({ tris, bytes: glb.length, folded, deep, poses: n, lowEye: +lowEye.toFixed(3), lying: [+sunk.toFixed(3), +rested.toFixed(3)] }));
})().catch(e => { console.error(e); process.exit(1); });
