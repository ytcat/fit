// node tests/fang-head.test.cjs — Fang's authored head (TRELLIS.2, owner approved 2026-11-24) on the game rig (cast-market.js).
// The real GLB parsed with the page's GLTFLoader: budget, frame (origin at the head joint, +Z nose), one JPEG; on the head joint;
// the code head off the render layers and the skin head folded inside the model (both outfits), restored exactly when off;
// fallback: a failed download keeps the code head (never both) and a later call retries; offline pack has the same URL.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
const RealLoader = THREE.GLTFLoader; let mode = 'fail'; const requests = [];
THREE.GLTFLoader = class { load(url, ok, _p, err) { requests.push(url); if (mode === 'fail') { setTimeout(() => err(Error('404')), 1); return; } const b = fs.readFileSync(url.replace(/^\.\//, '').split('?')[0]); new RealLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), '', ok, err); } };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const H = StoryCast.market.head, FILE = 'assets/characters/fang/fang-head.glb';

(async () => {
  // ---- the file: one mesh, phone budget, one JPEG <= 1024 px, nothing the r128 loader cannot read
  const glb = fs.readFileSync(FILE), json = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  assert.ok(glb.length < 1.5e6, 'small file: ' + glb.length);
  assert.ok(!json.extensionsRequired?.length, 'no required extensions'); assert.equal(json.meshes.length, 1); assert.equal(json.materials.length, 1);
  assert.equal(json.images.length, 1); assert.equal(json.images[0].mimeType, 'image/jpeg', 'JPEG base colour'); assert.ok(!json.animations?.length && !json.skins?.length, 'static');
  const tris = json.meshes[0].primitives.reduce((n, p) => n + json.accessors[p.indices].count / 3, 0); assert.ok(tris >= 12000 && tris <= 20000, 'triangles ' + tris);
  const bin = 20 + glb.readUInt32LE(12) + 8, bv = json.bufferViews[json.images[0].bufferView], img = glb.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength);
  let at = 2, size = null; assert.equal(img.readUInt16BE(0), 0xffd8, 'a JPEG');
  while (at < img.length && !size) { const m = img.readUInt16BE(at), len = img.readUInt16BE(at + 2); if (m >= 0xffc0 && m <= 0xffc3) size = [img.readUInt16BE(at + 7), img.readUInt16BE(at + 5)]; at += 2 + len; }
  assert.ok(size && size[0] <= 1024 && size[1] <= 1024, 'texture at most 1024 px: ' + size);
  const pos = json.accessors[json.meshes[0].primitives[0].attributes.POSITION], [x0, y0, z0] = pos.min, [x1, y1, z1] = pos.max;
  assert.ok(z1 > .36 && z1 < .46 && z0 > -.52 && z0 < -.38, 'nose forward (+Z), the ruff behind: ' + z0 + '..' + z1);
  assert.ok(y1 > .42 && y1 < .53 && y0 > -.32 && y0 < -.24, 'ear tips up, the stump below the jaw: ' + y0 + '..' + y1);
  assert.ok(Math.abs(x0 + x1) < .02 && x1 > .24 && x1 < .32, 'centred on the head joint, head-sized: ' + x0 + '..' + x1);

  // ---- fallback: the download fails -> the code head stays, nothing hidden, no model
  const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
  const c = StoryCast.rig('fang', engine); await H.ready(2000);
  const head = c.joints.head, code = []; for (const o of head.children) o.traverse(q => { if (q.isMesh) code.push(q); });
  const g = c.skin.geometry, P0 = { base: c.castBase.position.array.slice(), fight: c.castFight.position.array.slice() };
  assert.equal(H.state(), 'failed'); assert.equal(c.castHead.on, false, 'no model'); assert.ok(code.length > 15 && code.every(o => o.layers.mask === 1), 'code head shows');
  assert.ok(!head.getObjectByName('Fang: authored head'), 'never both');

  // ---- a later call retries; when it arrives it goes on the rig that is already built
  mode = 'ok'; assert.equal(await H.ready(20000), 'ready'); assert.ok(requests.length >= 2 && requests.every(u => u === H.url), 'retried, same URL');
  assert.equal(c.castHead.on, true, 'model on');
  const model = head.getObjectByName('Fang: authored head'); assert.ok(model && model.parent === head, 'a child of the head joint');
  let mesh = null; model.traverse(o => { if (o.isMesh) mesh = o; }); assert.ok(mesh.castShadow && mesh.layers.mask === 1);
  const map = mesh.material.map; assert.ok(map && map.encoding === THREE.sRGBEncoding, 'colour map in sRGB'); assert.ok(mesh.material.metalness === 0, 'fur is not metal');
  assert.ok(code.every(o => o.layers.mask === 0), 'every code head part is off the render layers'); const vis = code.map(o => o.visible);
  // the skin's head and neck above the collar fold into the model (both outfits); nothing below the collar moves
  const s = c.castHead.skin, rest = P0.base; let folded = 0, inside = 0, below = 0;
  const box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position); box.expandByScalar(-.02);
  for (const [k, A] of [['base', c.castBase.position], ['fight', c.castFight.position]]) {
    const a = A.array, r = P0[k];
    for (let i = 0; i < A.count; i++) {
      const moved = a[i * 3] !== r[i * 3] || a[i * 3 + 2] !== r[i * 3 + 2];
      if (P0.base[i * 3 + 1] < 1.79) { assert.ok(!moved, 'no change below the collar'); below++; continue; }
      if (!moved) continue; folded++; if (box.containsPoint(new THREE.Vector3(-a[i * 3], a[i * 3 + 1] - 1.84, a[i * 3 + 2]))) inside++;
    }
  }
  assert.ok(folded > 30000 && s.idx.length * 2 >= folded, 'skin head folded in both outfits: ' + folded);
  const deep = []; for (let n = 0; n < s.idx.length; n++) if (rest[s.idx[n] * 3 + 1] > 1.86) deep.push(s.idx[n]);
  const a = c.castBase.position.array; let out = 0; for (const i of deep) if (!box.containsPoint(new THREE.Vector3(-a[i * 3], a[i * 3 + 1] - 1.84, a[i * 3 + 2]))) out++;
  assert.ok(out / deep.length < .01, 'the folded skin head lies inside the model: ' + out + ' of ' + deep.length + ' outside');
  // outfit swaps keep it
  StoryCast.market.wear(c, 'fight'); assert.equal(g.attributes.position, c.castFight.position); StoryCast.market.wear(c, 'jacket'); assert.equal(g.attributes.position, c.castBase.position);
  // off: everything exactly as before; on again
  assert.equal(H.on(c, false), false); assert.ok(!model.parent && code.every(o => o.layers.mask === 1), 'code head back');
  assert.deepEqual(c.castBase.position.array, P0.base, 'jacket skin restored exactly'); assert.deepEqual(c.castFight.position.array, P0.fight, 'fight skin restored exactly');
  assert.deepEqual(code.map(o => o.visible), vis, 'visible flags untouched');
  assert.equal(H.on(c, true), true); assert.equal(H.on(c, true), true, 'idempotent'); assert.ok(model.parent === head && head.children.filter(o => o.name === 'Fang: authored head').length === 1);
  assert.ok(c.castBase.position.array.some((v, i) => v !== P0.base[i]), 'folded again');
  // poses: the model rides the head joint (talk, walk, fight, KO): its world matrix is the joint's
  for (const st of [{ t: 1, talk: 1 }, { t: 2, walk: 1, dist: 2 }]) { DreamPose.civil(c, { dt: 1 / 30, ...st }); StoryCast.talk(c, .8); c.root.updateMatrixWorld(true); assert.ok(model.matrixWorld.equals(head.matrixWorld), 'follows the head'); }
  for (const [mv, ex] of [['guard', {}], ['cross', {}], ['guard', { down: true, presentation: { mode: 'loser', raise: 0 } }]]) { c.update(1.3, mv, 'one_two', { simulationTime: 1.3, ...ex }); c.root.updateMatrixWorld(true); assert.ok(model.matrixWorld.equals(head.matrixWorld)); }
  // knocked down on his back: the model nods/lifts so its ears and ruff do not go through the ground; standing again it returns
  const lowest = () => { c.root.updateMatrixWorld(true); let y = 1e9; const P = mesh.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < P.count; i += 7) y = Math.min(y, v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld).y); return y; };
  DreamPose.civil(c, { t: 1, dt: 1 / 30, dist: 0 }); c.root.position.set(0, 0, 0); c.root.rotation.set(-Math.PI / 2, 0, 0); c.root.position.y = .25; c.root.updateMatrixWorld(true);
  const sunk = lowest(); for (let k = 1; k <= 40; k++) c.updateMane(10 + k / 30); const rested = lowest();
  assert.ok(rested > sunk + .1, 'lying down the head is raised off the ground (nod + lift): ' + sunk.toFixed(3) + ' -> ' + rested.toFixed(3));
  c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); DreamPose.civil(c, { t: 2, dt: 1 / 30, dist: 0 }); for (let k = 1; k <= 60; k++) c.updateMane(12 + k / 30);
  assert.ok(Math.abs(model.rotation.x) < .01 && model.position.length() < .005, 'standing: the model sits on the joint again');
  // offline: the page's URL is in the pack; films with Fang wait for the head
  const manifest = JSON.parse(fs.readFileSync('offline-manifest.json', 'utf8')); assert.ok(manifest.urls.includes(H.url), 'precached under the URL the page asks for');
  assert.ok(/market\.heads\[r\]\.ready\(5000\)/.test(fs.readFileSync('adventure/story/dream-scenes.js', 'utf8')), 'films with Fang wait for it');
  console.log('fang head ok', JSON.stringify({ tris, bytes: glb.length, folded, deep: deep.length }));
})().catch(e => { console.error(e); process.exit(1); });
