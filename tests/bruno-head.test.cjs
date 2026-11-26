// node tests/bruno-head.test.cjs — Coach Bruno's authored head (TRELLIS.2, owner approved 2026-11-26: "yes") on the game rig
// (story-cast.js builds him; cast-market.js puts the head on, the same path as Fang's and Hazel's): the real GLB parsed with the page's
// GLTFLoader (budget, frame, one JPEG, no metal); a failed download keeps the code head (never both) and a later call retries; on the head
// joint, every code head part (ears, cap, brows, eyes, nose, mouth, cheek ruff) off the render layers and nothing else (towel, whistle,
// buttons, paws, shoes stay); the skin head folded inside the model and restored exactly; he still talks without errors; the model
// follows the head joint through his films and as the gym-fight referee; films and the opening wait for it; offline pack.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; global.addEventListener = () => {};
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
const RealLoader = THREE.GLTFLoader; let mode = 'fail'; const requests = [];
THREE.GLTFLoader = class { load(url, ok, _p, err) { requests.push(url); if (mode === 'fail' || !/bruno/.test(url)) { setTimeout(() => err(Error('404')), 1); return; } const b = fs.readFileSync(url.replace(/^\.\//, '').split('?')[0]); new RealLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), '', ok, err); } };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const H = StoryCast.market.heads.bruno, FILE = 'assets/characters/bruno/bruno-head.glb', cfgEyes = () => Array.isArray(H.cfg.eyes) && H.cfg.eyes.length === 2;
const Core = require('../adventure/story/dream-core');
const V = (...v) => new THREE.Vector3(...v);

(async () => {
  // ---- the file: one mesh, phone budget, one JPEG <= 1024 px, static, nothing the r128 loader cannot read
  const glb = fs.readFileSync(FILE), json = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  assert.ok(glb.length < 1.0e6, 'small file: ' + glb.length);
  assert.ok(!json.extensionsRequired?.length, 'no required extensions'); assert.equal(json.meshes.length, 1, 'one mesh'); assert.equal(json.materials.length, 1);
  assert.equal(json.images.length, 2, 'base colour + the eyes\' glow'); assert.ok(json.images.every(i => i.mimeType === 'image/jpeg')); assert.ok(!json.animations?.length && !json.skins?.length, 'static');
  assert.ok(json.materials[0].emissiveTexture && json.materials[0].pbrMetallicRoughness.baseColorTexture, 'an emissive map (the eyes read in the films\' shadowed sockets)');
  assert.ok(!json.materials[0].pbrMetallicRoughness?.metallicRoughnessTexture && !(json.materials[0].pbrMetallicRoughness?.metallicFactor > 0), 'no metal map, no metal');
  const tris = json.meshes[0].primitives.reduce((n, p) => n + json.accessors[p.indices].count / 3, 0); assert.ok(tris >= 12000 && tris <= 18000, 'triangles ' + tris);
  const bin = 20 + glb.readUInt32LE(12) + 8, bv = json.bufferViews[json.images[0].bufferView], img = glb.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength);
  let at = 2, size = null; assert.equal(img.readUInt16BE(0), 0xffd8, 'a JPEG');
  while (at < img.length && !size) { const m = img.readUInt16BE(at), len = img.readUInt16BE(at + 2); if (m >= 0xffc0 && m <= 0xffc3) size = [img.readUInt16BE(at + 7), img.readUInt16BE(at + 5)]; at += 2 + len; }
  assert.ok(size && size[0] <= 1024 && size[1] <= 1024, 'texture at most 1024 px: ' + size);
  const pos = json.accessors[json.meshes[0].primitives[0].attributes.POSITION], [x0, y0, z0] = pos.min, [x1, y1, z1] = pos.max;
  assert.ok(z1 > .34 && z1 < .42, 'snout forward (+Z), a little past the code head\'s nose (0.35): ' + z1);
  assert.ok(x1 > .21 && x1 < .3 && Math.abs(x0 + x1) < .02, 'ears to the sides, centred: ' + x0 + '..' + x1);
  assert.ok(Math.abs(y0 + .2) < .005, 'the neck tube ends inside the body at -0.2: ' + y0);
  assert.ok(z0 > -.32 && z0 < -.24, 'back of the head: ' + z0);

  // ---- fallback: the download fails -> the code head stays, nothing hidden, no model
  const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
  data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json')); global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
  const c = StoryCast.rig('bruno', engine); await H.ready(2000);
  const head = c.joints.head, code = []; for (const o of head.children) o.traverse(q => { if (q.isMesh) code.push(q); });
  for (const n of ['Bruno: ears, nose, flat cap', 'Bruno: brows', 'Bruno: cheek and neck ruff']) assert.ok(code.some(o => o.name === n), 'the code head has ' + n);
  // owner review 2026-11-26 ("too big ... a mask on the shoulders"): the model's top within 3 cm of the code head's (its cap), head-joint frame
  c.root.updateMatrixWorld(true); const capMesh = head.getObjectByName('Bruno: ears, nose, flat cap'), toHead = new THREE.Matrix4().copy(head.matrixWorld).invert().multiply(capMesh.matrixWorld);
  let codeTop = -9; { const P = capMesh.geometry.attributes.position, v = V(); for (let i = 0; i < P.count; i++) codeTop = Math.max(codeTop, v.fromBufferAttribute(P, i).applyMatrix4(toHead).y); }
  assert.ok(y1 - codeTop <= .03 && y1 - codeTop > -.03, 'head height: model top ' + y1.toFixed(3) + ' vs code head ' + codeTop.toFixed(3));
  const rest = []; c.root.traverse(o => { if ((o.isMesh || o.isLine) && !code.includes(o)) rest.push(o); });
  const keep = ['Bruno: towel and whistle', 'Bruno: buttons'].map(n => c.root.getObjectByName(n)); assert.ok(keep.every(Boolean), 'towel, whistle and buttons on the chest');
  const P0 = c.castBase.position.array.slice(), restMasks = rest.map(o => o.layers.mask);
  assert.equal(H.state(), 'failed'); assert.equal(c.castHead.on, false); assert.ok(code.length > 10 && code.every(o => o.layers.mask === 1), 'code head shows');
  assert.ok(!head.getObjectByName('Bruno: authored head'), 'never both');
  assert.equal(StoryCast.market.head.state(), 'idle', "Fang's file is not asked for by Bruno"); assert.equal(StoryCast.market.heads.hazel.state(), 'idle', "nor Hazel's");

  // ---- a later call retries; when it arrives it goes on the rig that is already built
  mode = 'ok'; assert.equal(await H.ready(20000), 'ready'); assert.ok(requests.filter(u => /bruno/.test(u)).length >= 2 && requests.every(u => u === H.url), 'retried, same URL');
  assert.equal(c.castHead.on, true);
  const model = head.getObjectByName('Bruno: authored head'); assert.ok(model && model.parent === head, 'a child of the head joint');
  let mesh = null; model.traverse(o => { if (o.isMesh) mesh = o; }); assert.ok(mesh.castShadow && mesh.layers.mask === 1 && mesh.material.metalness === 0 && mesh.material.map?.encoding === THREE.sRGBEncoding);
  assert.ok(code.every(o => o.layers.mask === 0), 'every code head part off the render layers: no doubled ears, cap, brows or ruff');
  assert.deepEqual(rest.map(o => o.layers.mask), restMasks, 'nothing else changes: whistle, buttons, paws, shoes, clothes'); assert.ok(keep.every(o => o.layers.mask === 1));
  assert.ok(mesh.material.emissiveMap && cfgEyes(), 'the eyes\' glow map and the pupil positions (QA, tests/bruno-head-eyes)');
  // the towel: with the model its part of the merged towel-and-whistle mesh is not drawn (whistle and cord are) and the towel that
  // crosses the shoulder outside the model's neck shows; with the code head, the other way round
  const towel = c.root.getObjectByName('Bruno: towel (authored head)'), merged = keep[0];
  assert.ok(towel && towel.visible && merged.geometry.drawRange.start > 1000 && merged.geometry.drawRange.start < merged.geometry.attributes.position.count, 'towel swapped: draw from ' + merged.geometry.drawRange.start);
  { let e = 9; const P = towel.geometry.attributes.position, v = V(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y + 1.36 > 1.74) e = Math.min(e, Math.hypot(v.x / .2, v.z / (v.z < 0 ? .17 : .15))); }
    assert.ok(e > 1.02, 'over the shoulder the towel stays outside the neck tube (0.2 wide, 0.15/0.17 deep at the collar): ' + e.toFixed(3)); }
  const vis = code.map(o => o.visible);
  // the skin's head and neck above the collar fold into the model; nothing below the cardigan's neckline moves
  const a = c.castBase.position.array, box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position); box.expandByScalar(-.01);
  let folded = 0, deep = 0, out = 0;
  for (let i = 0; i < a.length / 3; i++) {
    const moved = a[i * 3] !== P0[i * 3] || a[i * 3 + 2] !== P0[i * 3 + 2];
    if (P0[i * 3 + 1] < 1.75) { assert.ok(!moved, 'no change below the neckline (the fold eases in from 1.75)'); continue; }
    if (moved) folded++;
    if (moved && P0[i * 3 + 1] > 1.86) { deep++; if (!box.containsPoint(V(-a[i * 3], a[i * 3 + 1] - 1.84, a[i * 3 + 2]))) out++; }
  }
  assert.ok(folded > 8000, 'skin head folded: ' + folded); assert.ok(out / deep < .01, 'the folded skin head lies inside the model: ' + out + ' of ' + deep);
  // off: exactly as before; on again
  assert.equal(H.on(c, false), false); assert.ok(!model.parent && code.every(o => o.layers.mask === 1), 'code head back');
  assert.ok(!towel.visible && merged.geometry.drawRange.start === 0, 'the code head\'s towel back');
  assert.deepEqual(c.castBase.position.array, P0, 'skin restored exactly'); assert.deepEqual(code.map(o => o.visible), vis, 'visible flags untouched');
  assert.equal(H.on(c, true), true); assert.equal(H.on(c, true), true, 'idempotent'); assert.equal(head.children.filter(o => o.name === 'Bruno: authored head').length, 1);

  // ---- he talks (no jaw on this head: the hidden jaw channel runs, the head nods with the words) and the model rides the head joint
  //      through his films
  let n = 0, lowEye = 9, talkNod = 0;
  const films = [[Core, ['dream_gym_talk', 'dream_after_brick']], [require('../adventure/story/market-core'), ['dream_apology']], [require('../adventure/story/docks-core'), ['dream_docks', 'dream_fight_night', 'dream_chapter_end']], [require('../adventure/story/gym-return-core'), ['dream_new_bag', 'dream_offer']]];
  for (const [mod, ids] of films) for (const id of ids) {
    const S = mod.scenes[id];
    for (let t = 0; t <= S.duration; t += .5) {
      const s = Core.sample(S, t), st = s.actors.bruno; if (!st || st.act === 'off') continue;
      c.root.position.set(st.x, st.y || 0, st.z); c.root.rotation.set(0, st.ry, 0); c.root.scale.set(-1, 1, 1); c.root.updateMatrixWorld(true);
      DreamPose.civil(c, { t, dt: 1 / 30, dist: st.dist, walk: +st.walking, arms: st.arms, lean: st.lean, drop: st.drop, talk: st.talk ? 1 : 0, look: { yaw: 0, pitch: 0 } });
      if (st.talk) StoryCast.talk(c, .8); c.updateMane(t); c.root.updateMatrixWorld(true);
      assert.ok(model.matrixWorld.equals(head.matrixWorld), id + ' t ' + t.toFixed(2) + ': follows the head joint');
      const eye = V(.085, .23, .2).applyMatrix4(head.matrixWorld); lowEye = Math.min(lowEye, eye.y); n++;
    }
  }
  assert.ok(n > 150 && lowEye > 1.3, 'standing in his films, eyes at ' + lowEye.toFixed(2) + ' m (' + n + ' poses)');
  c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0);
  const pitchAt = t => { DreamPose.civil(c, { t, dt: 1 / 30, dist: 0, talk: 1, arms: { R: 'open' } }); StoryCast.talk(c, .9); c.updateMane(t); c.root.updateMatrixWorld(true); return V(0, 0, 1).transformDirection(head.matrixWorld).y; };
  const ps = []; for (let k = 0; k < 30; k++) ps.push(pitchAt(3 + k / 15)); talkNod = Math.max(...ps) - Math.min(...ps);
  assert.ok(talkNod > .01, 'talking, the head moves with the words: ' + talkNod.toFixed(3));
  assert.ok(c.anatomy?.value?.[12] >= 0, 'the jaw channel still runs (hidden)');
  // the hand-to-chin gesture (gym talk "That's me", the apology film): the paw under the model's longer, lower chin, never inside it
  // (with the code head's target the paw went up to 4 cm into the muzzle); the gesture target goes back with the code head
  const MP = mesh.geometry.attributes.position, MN = mesh.geometry.attributes.normal, mv = [], mn = []; for (let i = 0; i < MP.count; i += 2) { mv.push(V().fromBufferAttribute(MP, i)); mn.push(V().fromBufferAttribute(MN, i)); }
  const inside = () => { c.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert(); let worst = 0; c.joints.handR.traverse(o => { if (!o.isMesh || !o.visible) return; const P = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), v = V(); for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(m); let best = 1e9, k = -1; for (let j = 0; j < mv.length; j++) { const d = mv[j].distanceToSquared(v); if (d < best) { best = d; k = j; } } if (best < .0016) worst = Math.max(worst, -v.clone().sub(mv[k]).dot(mn[k])); } }); return worst; };
  let chinIn = 0; for (const talk of [0, 1]) for (let k = 0; k < 30; k++) { DreamPose.civil(c, { t: 6 + k / 15, dt: 1 / 15, dist: 0, talk, arms: { L: 'hips', R: 'chin' }, look: { yaw: 0, pitch: 0 } }); chinIn = Math.max(chinIn, inside()); }
  assert.ok(chinIn < .004, 'hand to the chin: the paw stays out of the muzzle (' + chinIn.toFixed(3) + ' m inside)');
  assert.ok(c.gestureAt?.chin, 'his own chin target while the model is on'); H.on(c, false); assert.ok(!c.gestureAt, 'the code head\'s target with the code head'); H.on(c, true);

  // ---- the gym-fight referee is the same rig (gym-fight.js: Cast.rig('bruno')): the model is on and rides the joint in his poses
  for (const [nm, st] of [['count', { arms: { L: 'hips', R: 'count' }, reach: { R: [.3, 1.5, .38] }, look: { yaw: 0, pitch: -.45 }, lean: .2 }], ['raise', { arms: { L: 'hips', R: 'hips' }, reach: { R: { at: [.55, 2.0, .25], w: 1, pole: [1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } } }]]) {
    c.root.scale.set(1, 1, 1); DreamPose.civil(c, { t: 5, dt: 1 / 30, dist: 0, ...st }); c.updateMane(5); c.root.updateMatrixWorld(true);
    assert.ok(model.matrixWorld.equals(head.matrixWorld) && mesh.layers.mask === 1, 'referee ' + nm + ': the authored head is on');
  }
  assert.ok(/Cast\.rig\('bruno', e\)/.test(fs.readFileSync('adventure/story/gym-fight.js', 'utf8')), 'the referee is the story rig');
  // the ground rule (same as Fang's and Hazel's): lying on his back the model is raised off the ground, standing it sits on the joint again
  const lowest = () => { c.root.updateMatrixWorld(true); let y = 1e9; const P = mesh.geometry.attributes.position, v = V(); for (let i = 0; i < P.count; i += 7) y = Math.min(y, v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld).y); return y; };
  DreamPose.civil(c, { t: 1, dt: 1 / 30, dist: 0 }); c.root.position.set(0, .25, 0); c.root.rotation.set(-Math.PI / 2, 0, 0);
  const sunk = lowest(); for (let k = 1; k <= 40; k++) c.updateMane(100 + k / 30); const rested = lowest();
  assert.ok(rested > sunk + .03, 'lying down the head is raised: ' + sunk.toFixed(3) + ' -> ' + rested.toFixed(3));
  c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); DreamPose.civil(c, { t: 2, dt: 1 / 30, dist: 0 }); for (let k = 1; k <= 60; k++) c.updateMane(102 + k / 30);
  assert.ok(Math.abs(model.rotation.x) < .01 && model.position.length() < .005, 'standing: on the joint again');

  // ---- wiring: offline pack, films (and the opening before the gym talk) and portrait wait for it
  const manifest = JSON.parse(fs.readFileSync('offline-manifest.json', 'utf8')); assert.ok(manifest.urls.includes(H.url), 'precached under the URL the page asks for');
  const dream = fs.readFileSync('adventure/story/dream-scenes.js', 'utf8');
  assert.ok(/market\.heads\[r\]\.ready\(5000\)/.test(dream), 'films with an authored head wait for it (5 s at most)');
  assert.ok(/id === 'dream_opening' && H\.bruno\) out\.add\('bruno'\)/.test(dream), 'the opening asks for his head (the gym talk follows)');
  for (const [mod, id] of [[Core, 'dream_gym_talk'], [require('../adventure/story/docks-core'), 'dream_fight_night']]) assert.ok(Object.values(mod.scenes[id].actors).some(x => x.rig === 'bruno'), id + ' has Bruno');
  assert.ok(/market\?\.heads\?\.\[rig\?\.castHead\?\.id\]/.test(fs.readFileSync('adventure/portraits.js', 'utf8')), 'the portrait waits for his head');
  const html = fs.readFileSync('index.html', 'utf8'); assert.ok(/cast-market\.js\?v=20261126br2/.test(html) && /dream-scenes\.js\?v=20261126br/.test(html), 'changed scripts re-fetched');
  console.log('bruno head ok', JSON.stringify({ tris, bytes: glb.length, folded, deep, poses: n, lowEye: +lowEye.toFixed(3), talkNod: +talkNod.toFixed(3), lying: [+sunk.toFixed(3), +rested.toFixed(3)] }));
})().catch(e => { console.error(e); process.exit(1); });
