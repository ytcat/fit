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

const report = {};
(async () => {
  // ---- the file (round 5, the look pass): the skin (node brunoHead: base colour <= 2048 px, the source's relief as a normal map, a
  // roughness map, no metal) with a 'jaw' morph; the mouth (jaw morph); two eyes with lids; alpha-tested fur cards; phone budget
  const glb = fs.readFileSync(FILE), json = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  assert.ok(glb.length < 1.5e6, 'file under 1.5 MB: ' + glb.length);
  assert.ok(!json.extensionsRequired?.length, 'no required extensions'); assert.ok(!json.animations?.length && !json.skins?.length, 'no animations or skins');
  const nodeOf = n => json.nodes.find(q => q.name === n), meshOf = n => json.meshes[nodeOf(n)?.mesh];
  const skinMesh = meshOf('brunoHead'); assert.ok(skinMesh && skinMesh.primitives.length === 1, 'the skin: one primitive');
  const skinMat = json.materials[skinMesh.primitives[0].material], pbr = skinMat.pbrMetallicRoughness;
  assert.ok(pbr.baseColorTexture && skinMat.normalTexture && pbr.metallicRoughnessTexture && !(pbr.metallicFactor > 0), 'colour, normal and roughness maps, no metal');
  const imgOf = ti => json.images[json.textures[ti].source];
  assert.ok(imgOf(pbr.baseColorTexture.index).mimeType === 'image/jpeg' && imgOf(skinMat.normalTexture.index).mimeType === 'image/jpeg', 'JPEG colour and normal maps');
  for (const n of ['brunoHead', 'brunoMouth', 'brunoFur']) assert.ok(meshOf(n)?.extras?.targetNames?.includes('jaw'), n + ': a jaw morph');
  for (const sd of ['L', 'R']) { const e = nodeOf('brunoEye' + sd); assert.ok(e && e.children?.map(k => json.nodes[k].name).sort().join() === ['brunoEyeBall' + sd, 'brunoGlint' + sd, 'brunoLid' + sd].sort().join(), 'eye ' + sd + ': ball, catch-light, lid'); }
  const furMat = json.materials[meshOf('brunoFur').primitives[0].material]; assert.ok(furMat.alphaMode === 'MASK' && furMat.doubleSided, 'fur cards: alpha-tested, two-sided (no sorting)');
  const triOf = m => m.primitives.reduce((n, p) => n + json.accessors[p.indices].count / 3, 0), allTris = json.meshes.reduce((n, m) => n + triOf(m), 0);
  assert.ok(triOf(skinMesh) >= 18000 && triOf(skinMesh) <= 24000 && allTris <= 27000, 'triangles: skin ' + triOf(skinMesh) + ', all ' + allTris);
  const bin = 20 + glb.readUInt32LE(12) + 8, bv = json.bufferViews[imgOf(pbr.baseColorTexture.index).bufferView], img = glb.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength);
  let at = 2, size = null; assert.equal(img.readUInt16BE(0), 0xffd8, 'a JPEG');
  while (at < img.length && !size) { const m = img.readUInt16BE(at), len = img.readUInt16BE(at + 2); if (m >= 0xffc0 && m <= 0xffc3) size = [img.readUInt16BE(at + 7), img.readUInt16BE(at + 5)]; at += 2 + len; }
  assert.ok(size && size[0] <= 2048 && size[1] <= 2048, 'texture at most 2048 px: ' + size);
  const pos = json.accessors[skinMesh.primitives[0].attributes.POSITION], [x0, y0, z0] = pos.min, [x1, y1, z1] = pos.max;
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
  let mesh = null; model.traverse(o => { if (o.userData.part === 'brunoHead') mesh = o; }); assert.ok(mesh.castShadow && mesh.layers.mask === 1 && mesh.material.metalness === 0 && mesh.material.map?.encoding === THREE.sRGBEncoding);
  assert.ok(code.every(o => o.layers.mask === 0), 'every code head part off the render layers: no doubled ears, cap, brows or ruff');
  assert.deepEqual(rest.map(o => o.layers.mask), restMasks, 'nothing else changes: whistle, buttons, paws, shoes, clothes'); assert.ok(keep.every(o => o.layers.mask === 1));
  assert.ok(mesh.material.normalMap && cfgEyes(), 'the relief map and the pupil positions (QA, tests/bruno-head-eyes)');
  // the face acts: talking opens the jaw (skin, mouth and the chin's fur together), the lids blink on the rigs' rhythm
  { const F = c.castHead.group.userData.face; assert.ok(F.jaw.length >= 3 && F.lids.length === 2, 'jaw meshes ' + F.jaw.length + ', lids ' + F.lids.length);
    StoryCast.talk(c, 1); for (let k = 0; k < 10; k++) c.updateMane(1 + k / 30); const open = F.jaw.map(([o, k]) => o.morphTargetInfluences[k]);
    StoryCast.talk(c, 0); for (let k = 0; k < 20; k++) c.updateMane(2 + k / 30); const shut = F.jaw.map(([o, k]) => o.morphTargetInfluences[k]);
    assert.ok(open.every(v => v > .5) && shut.every(v => v < .05), 'jaw opens with speech and closes: ' + open.map(v => v.toFixed(2)) + ' / ' + shut.map(v => v.toFixed(2)));
    const q0 = F.lids[0][0].quaternion.clone(); c.updateMane(4.5); const shutLid = F.lids[0][0].quaternion.angleTo(q0); c.updateMane(4.0);
    assert.ok(shutLid > 1 && F.lids[0][0].quaternion.angleTo(F.lids[0][1]) < 1e-6, 'the lids close on a blink (' + shutLid.toFixed(2) + ' rad) and open again'); report.face = { open: +open[0].toFixed(2), lid: +shutLid.toFixed(2) }; }
  // the towel: with the model its part of the merged towel-and-whistle mesh is not drawn (whistle and cord are) and the towel that
  // crosses the shoulder outside the model's neck shows; with the code head, the other way round
  const towel = c.root.getObjectByName('Bruno: towel (authored head)'), merged = keep[0];
  assert.ok(towel && towel.visible && merged.geometry.drawRange.start > 1000 && merged.geometry.drawRange.start < merged.geometry.attributes.position.count, 'towel swapped: draw from ' + merged.geometry.drawRange.start);
  { let e = 9; const P = towel.geometry.attributes.position, v = V(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y > 1.74) e = Math.min(e, Math.hypot(v.x / .2, v.z / (v.z < 0 ? .17 : .15))); }
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
  const inside = (hands = ['handR']) => { c.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert(); let worst = 0; for (const hj of hands) c.joints[hj].traverse(o => { if (!o.isMesh || !o.visible) return; const P = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), v = V(); for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(m); let best = 1e9, k = -1; for (let j = 0; j < mv.length; j++) { const d = mv[j].distanceToSquared(v); if (d < best) { best = d; k = j; } } if (best < .0016) worst = Math.max(worst, -v.clone().sub(mv[k]).dot(mn[k])); } }); return worst; };
  let chinIn = 0; for (const talk of [0, 1]) for (let k = 0; k < 30; k++) { DreamPose.civil(c, { t: 6 + k / 15, dt: 1 / 15, dist: 0, talk, arms: { L: 'hips', R: 'chin' }, look: { yaw: 0, pitch: 0 } }); chinIn = Math.max(chinIn, inside()); }
  assert.ok(chinIn < .004, 'hand to the chin: the paw stays out of the muzzle (' + chinIn.toFixed(3) + ' m inside)');
  assert.ok(c.gestureAt?.chin, 'his own chin target while the model is on'); H.on(c, false); assert.ok(!c.gestureAt, 'the code head\'s target with the code head'); H.on(c, true);
  // the referee's Sunday Punch wave-off (gym-fight.js): with the model his own arc beside the head (gestureAt.waveOff); over the
  // whole swing no paw inside the head (gym-fight's default arc crosses the hands over the head: up to 4 cm inside)
  const arc = c.gestureAt.waveOff; assert.ok(arc && /bruno\.gestureAt\?\.waveOff/.test(fs.readFileSync('adventure/story/gym-fight.js', 'utf8')), 'the referee uses his own wave-off arc');
  let waveIn = 0; for (let q = -1; q <= 1.001; q += .25) { for (let k = 0; k < 20; k++) DreamPose.civil(c, { t: 4 + k / 30, dt: 1 / 30, dist: 0, arms: { L: 'count', R: 'count' }, reach: { L: [-(arc.x0 - arc.amp * q), 2.02 + .04 * Math.abs(q), arc.z], R: [arc.x0 - arc.amp * q, 2.02 + .04 * Math.abs(q), arc.z] }, lean: .04, look: { yaw: 0, pitch: -.3 } }); waveIn = Math.max(waveIn, inside(['handL', 'handR'])); }
  assert.ok(waveIn < .004, 'wave-off: no paw inside the head (' + waveIn.toFixed(3) + ' m)');
  // the towel (main review round 3): ONE piece, one layer, closed; lying on the cardigan over the shoulder in stand, left arm raised and
  // walk, with the shader's own deformation (rig.skinPoint: DQ + linear + anatomy morph): every outer vertex 2 mm .. 16 mm over the
  // cardigan point it was made from; no fold-over: the towel's top-surface triangles keep facing out (turned slivers at the skin's own
  // crease below 10 mm2 in all)
  { const T = c.castTowel, tg = T.alt.geometry, I = tg.index.array, nvt = tg.attributes.position.count, par = Int32Array.from({ length: nvt }, (_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let t = 0; t < I.length; t += 3) { par[f(I[t + 1])] = f(I[t]); par[f(I[t + 2])] = f(I[t]); }
    const roots = new Set(); for (let t = 0; t < I.length; t++) roots.add(f(I[t])); assert.equal(roots.size, 1, 'the towel is one piece');
    const ecount = new Map(); for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) { const k = a < b ? a + ':' + b : b + ':' + a; ecount.set(k, (ecount.get(k) || 0) + 1); }
    let open = 0; for (const [k, n] of ecount) { const [a, b] = k.split(':').map(Number); if (T.src[a] >= 0 && T.src[b] >= 0 && n !== 2) open++; } assert.equal(open, 0, 'closed: every edge of the cloth\'s top surface is shared, the hems and both ends end in a wall (no open edge)');
    const SI = c.skin.geometry.attributes.skinIndex, NR = c.skin.geometry.attributes.normal, P0 = tg.attributes.position, src = T.src, out = []; for (let k = 0; k < src.length; k++) if (src[k] >= 0 && P0.getY(k) > 1.6) out.push(k);
    for (const [nm, st] of [['stand', {}], ['left arm raised', { arms: { L: 'hips', R: 'hips' }, reach: { L: { at: [-.55, 2.0, .25], w: 1, pole: [-1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } } }], ['walk', { walk: 1 }]]) {
      DreamPose.reset(c); for (let k = 0; k < 30; k++) DreamPose.civil(c, { t: 2 + k / 30, dt: 1 / 30, dist: st.walk ? (2 + k / 30) * 1.25 : 0, ...st }); c.syncSkin(); window.AvatarAnatomy?.update(c);
      let lo = 9, hi = -9; const posed = [], nrm = [];
      for (const k of out) { const a = c.skinPoint(T.alt, k), sk = c.skinPoint(c.skin, src[k]), q4 = c.dqReal[SI.getX(src[k])], n = V().fromBufferAttribute(NR, src[k]).applyQuaternion(new THREE.Quaternion(q4.x, q4.y, q4.z, q4.w)).normalize(), h = a.distanceTo(sk) * Math.sign(a.clone().sub(sk).dot(n) + .004); if (h < lo && process.env.FOLD_DEBUG) console.log('low', h.toFixed(4), V().fromBufferAttribute(P0, k).toArray().map(x => +x.toFixed(3)), 'src', V().fromBufferAttribute(c.skin.geometry.attributes.position, src[k]).toArray().map(x => +x.toFixed(3))); lo = Math.min(lo, h); hi = Math.max(hi, h); posed.push(a); nrm.push(n); }
      assert.ok(lo > .002 && hi < .016, nm + ': the towel lies on the cardigan over the shoulder, ' + lo.toFixed(4) + '..' + hi.toFixed(4) + ' m above it');
      // no fold-over: every top-surface triangle of the towel still faces the way it faced at rest, turned by its bones (a fold turns
      // it over); the same count on the cardigan under it, for comparison (the skin's own creases)
      const pk = new Map(); out.forEach((k, j) => pk.set(k, j)); let folds = 0, faces = 0, under = 0, foldArea = 0; const TSI = tg.attributes.skinIndex, rot = k => { const q4 = c.dqReal[TSI.getX(k)]; return new THREE.Quaternion(q4.x, q4.y, q4.z, q4.w); };
      const base = new Map(), bp = k => { if (!base.has(k)) base.set(k, c.skinPoint(c.skin, src[k])); return base.get(k); }, SP = c.skin.geometry.attributes.position, rp = i => V().fromBufferAttribute(SP, i);
      for (let t = 0; t < I.length; t += 3) { const ja = pk.get(I[t]), jb = pk.get(I[t + 1]), jc = pk.get(I[t + 2]); if (ja == null || jb == null || jc == null) continue; faces++;
        const A = posed[ja], fn = posed[jb].clone().sub(A).cross(posed[jc].clone().sub(A)), R0 = V().fromBufferAttribute(P0, I[t]), rn = V().fromBufferAttribute(P0, I[t + 1]).sub(R0).cross(V().fromBufferAttribute(P0, I[t + 2]).sub(R0)).applyQuaternion(rot(I[t]));
        if (fn.lengthSq() > 1e-14 && rn.lengthSq() > 1e-14 && fn.dot(rn) < 0) { folds++; foldArea += rn.length() / 2 * 1e6; if (process.env.FOLD_DEBUG) console.log('fold at', R0.toArray().map(x => +x.toFixed(3)), 'area mm2', +(rn.length() / 2 * 1e6).toFixed(2)); }
        const B0 = bp(I[t]), bn = bp(I[t + 1]).clone().sub(B0).cross(bp(I[t + 2]).clone().sub(B0)), S0 = rp(src[I[t]]), sn = rp(src[I[t + 1]]).sub(S0).cross(rp(src[I[t + 2]]).sub(S0)).applyQuaternion(rot(I[t]));
        if (bn.lengthSq() > 1e-14 && sn.lengthSq() > 1e-14 && bn.dot(sn) < 0) under++; }
      if (process.env.FOLD_DEBUG) console.log(nm, 'towel folds', folds, 'cardigan folds under it', under, 'of', faces);
      assert.ok(faces > 1000 && foldArea < 10, nm + ': no overlapping towel layers (' + folds + ' of ' + faces + ' top-surface triangles turned, ' + foldArea.toFixed(1) + ' mm2 in all: slivers at a crease of the skin, which has ' + under + ' there itself)');
      report.towel = report.towel || {}; report.towel[nm] = { above: [+lo.toFixed(4), +hi.toFixed(4)], foldedMm2: +foldArea.toFixed(1), folded: folds, skinFolded: under };
    }
    DreamPose.reset(c);
  }
  // the head and the towel never go into each other (main review round 4: walking, the jowl went 2-3 cm into the towel's top corner):
  // every walking frame of the gym talk, the docks and fight night (every 1/6 s) and the head-seams poses. Exact geometry: the towel
  // as the shader draws it (rig.skinPoint), the model by its world matrix; a towel vertex is inside the head when the nearest model
  // triangle's outward normal points away from it (> 1 mm), a head vertex is inside the towel when it lies under the towel's top
  // surface within the cloth's thickness (> 1 mm under it, less than 7 mm: the towel lies 7-15 mm over the cardigan)
  { const T = c.castTowel, tg = T.alt.geometry, TI = tg.index.array, src = T.src, mg = mesh.geometry, MI = mg.index.array, MPs = mg.attributes.position;
    const outIdx = []; for (let k = 0; k < src.length; k++) if (src[k] >= 0) outIdx.push(k);
    const topTris = []; for (let t = 0; t < TI.length; t += 3) if (src[TI[t]] >= 0 && src[TI[t + 1]] >= 0 && src[TI[t + 2]] >= 0) topTris.push(TI[t], TI[t + 1], TI[t + 2]);
    const tri = new THREE.Triangle(), q = V(), cell = .025, keyOf = (x, y, z) => Math.floor(x / cell) + ',' + Math.floor(y / cell) + ',' + Math.floor(z / cell);
    const grid = (pts, tris) => { const g = new Map(); for (let t = 0; t < tris.length; t += 3) { const a = pts[tris[t]], b = pts[tris[t + 1]], d = pts[tris[t + 2]], k = keyOf((a.x + b.x + d.x) / 3, (a.y + b.y + d.y) / 3, (a.z + b.z + d.z) / 3); if (!g.has(k)) g.set(k, []); g.get(k).push(t); } return g; };
    const nearest = (p, pts, tris, g) => { const [x, y, z] = [Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell)]; let best = 1e9, bt = -1, bq = V();
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const t of g.get((x + dx) + ',' + (y + dy) + ',' + (z + dz)) || []) { tri.set(pts[tris[t]], pts[tris[t + 1]], pts[tris[t + 2]]); tri.closestPointToPoint(p, q); const d = q.distanceToSquared(p); if (d < best) { best = d; bt = t; bq.copy(q); } }
      if (bt < 0) return null; tri.set(pts[tris[bt]], pts[tris[bt + 1]], pts[tris[bt + 2]]); const n = tri.getNormal(V()); return { d: Math.sqrt(best), s: p.clone().sub(bq).dot(n), t: bt, q: bq.clone(), n }; };
    // the model's winding: outward (checked on the cap's top)
    let outward = 0; { const P = MPs; for (let t = 0; t < MI.length; t += 3) { const a = V().fromBufferAttribute(P, MI[t]); if (a.y < .3) continue; tri.set(a, V().fromBufferAttribute(P, MI[t + 1]), V().fromBufferAttribute(P, MI[t + 2])); outward += Math.sign(tri.getNormal(V()).dot(a.clone().sub(V(0, .15, 0)))); } }
    const ws = outward > 0 ? 1 : -1;
    // faces inside the model's own neck (the bust's neck cone and its inner shell, inside the tube: turned toward the neck's axis below
    // the jaw line) are never seen and are not the surface a towel could touch
    const hidden = new Uint8Array(MI.length / 3); { const P = MPs, a = V(), b = V(), d = V(); for (let t = 0; t < MI.length; t += 3) { a.fromBufferAttribute(P, MI[t]); b.fromBufferAttribute(P, MI[t + 1]); d.fromBufferAttribute(P, MI[t + 2]); const cy = (a.y + b.y + d.y) / 3, cx = (a.x + b.x + d.x) / 3, cz = (a.z + b.z + d.z) / 3; tri.set(a, b, d); const n = tri.getNormal(V()); if (cy < .03 && Math.hypot(cx, cz) > .1 && (cx * n.x + cz * n.z) * ws < 0) hidden[t / 3] = 1; } } if (process.env.CONTACT_DEBUG) console.log('model winding (cap top votes)', outward);
    let fur = null; model.traverse(o => { if (o.userData.part === 'brunoFur') fur = o; });
    const SK = c.skin.geometry, SKP = SK.attributes.position, skinNear = [], inNear = new Uint8Array(SKP.count);
    const folded = new Uint8Array(SKP.count); { const F = c.castHead.skin; for (let j = 0; j < F.idx.length; j++) if (F.k[j] > 0) folded[F.idx[j]] = 1; } // the skin head folded inside the model is not a surface
    for (let i = 0; i < SKP.count; i++) { const y = SKP.getY(i); if (!folded[i] && y > 1.45 && y < 2.0 && Math.abs(SKP.getX(i)) < .4) { skinNear.push(i); inNear[i] = 1; } }
    const skinTris = []; { const I = SK.index.array; for (let t = 0; t < I.length; t += 3) if (inNear[I[t]] && inNear[I[t + 1]] && inNear[I[t + 2]]) skinTris.push(I[t], I[t + 1], I[t + 2]); }
    const contact = () => {
      c.syncSkin(); window.AvatarAnatomy?.update(c); c.root.updateMatrixWorld(true);
      const tp = new Array(src.length); for (const k of outIdx) tp[k] = c.skinPoint(T.alt, k);
      const box = new THREE.Box3(); for (const k of outIdx) box.expandByPoint(tp[k]); box.expandByScalar(.02);
      const hp = new Array(MPs.count), MT = mg.morphAttributes.position?.[0], MIF = mesh.morphTargetInfluences?.[0] || 0; for (let i = 0; i < MPs.count; i++) { hp[i] = V().fromBufferAttribute(MPs, i); if (MT) hp[i].addScaledVector(V().fromBufferAttribute(MT, i), MIF); hp[i].applyMatrix4(mesh.matrixWorld); }
      const hbox = new THREE.Box3(); for (const v of hp) hbox.expandByPoint(v); hbox.expandByScalar(.02);
      const hTris = []; for (let t = 0; t < MI.length; t += 3) { const a = hp[MI[t]]; if (box.containsPoint(a) && !hidden[t / 3]) hTris.push(MI[t], MI[t + 1], MI[t + 2]); }
      const hg = grid(hp, hTris), tgd = grid(tp, topTris); let towelIn = 0, towelDeep = 0, headIn = 0, headDeep = 0;
      const mh = Math.sign(mesh.matrixWorld.determinant()) * ws, mt = Math.sign(T.alt.matrixWorld.determinant()); // a mirrored root turns the world winding over
      for (const k of outIdx) { const p = tp[k]; if (!hbox.containsPoint(p)) continue; const r = nearest(p, hp, hTris, hg); if (r && r.d < .03 && r.s * mh < -.001) { towelIn++; towelDeep = Math.max(towelDeep, -r.s * mh); if (process.env.CONTACT_DEBUG > 1 && towelIn < 4) { const iv = new THREE.Matrix4().copy(c.joints.head.matrixWorld).invert(), nq = r.n.clone().transformDirection(iv); console.log('  nearest model point (head frame)', r.q.clone().applyMatrix4(iv).toArray().map(x => +x.toFixed(3)), 'normal', nq.toArray().map(x => +x.toFixed(2)), 'model vertex', hTris[r.t]); } if (process.env.CONTACT_DEBUG > 1 && towelIn < 4) console.log('  towel in head: rest', V().fromBufferAttribute(tg.attributes.position, k).toArray().map(x => +x.toFixed(3)), 'head frame', p.clone().applyMatrix4(new THREE.Matrix4().copy(c.joints.head.matrixWorld).invert()).toArray().map(x => +x.toFixed(3)), 'dist', r.d.toFixed(3)); } }
      for (let i = 0; i < hp.length; i++) { const p = hp[i]; if (!box.containsPoint(p)) continue; const r = nearest(p, tp, topTris, tgd); if (r && r.s * mt < -.001 && r.s * mt > -.007 && r.d < .012) { headIn++; headDeep = Math.max(headDeep, -r.s * mt); if (process.env.CONTACT_DEBUG > 1 && headIn < 4) console.log('  head in towel: head frame', V().fromBufferAttribute(MPs, i).toArray().map(x => +x.toFixed(3)), 'under the towel top by', (-r.s * mt).toFixed(4)); } }
      // the fur cards (round 5): none of their vertices under the towel's top surface or inside the body's skin (collar, cardigan),
      // with the jaw where the face acting has it
      let furIn = 0, furDeep = 0, furSkin = 0, furSkinDeep = 0;
      if (fur) {
        const FP = fur.geometry.attributes.position, mt = fur.geometry.morphAttributes.position?.[0], inf = fur.morphTargetInfluences?.[0] || 0, fp = [];
        for (let i = 0; i < FP.count; i++) { const v = V().fromBufferAttribute(FP, i); if (mt) v.addScaledVector(V().fromBufferAttribute(mt, i), inf); fp.push(v.applyMatrix4(fur.matrixWorld)); }
        const sp = new Map(); for (const i of skinNear) sp.set(i, c.skinPoint(c.skin, i)); const spts = []; for (const [i, v] of sp) spts[i] = v;
        const sg = grid(spts, skinTris); let wsk = 0; for (let t = 0; t < skinTris.length; t += 3) { const A = spts[skinTris[t]]; if (A.z > .12 && Math.abs(A.x) < .1 && A.y > 1.3 && A.y < 1.5) { tri.set(A, spts[skinTris[t + 1]], spts[skinTris[t + 2]]); wsk += Math.sign(tri.getNormal(V()).z); } }
        wsk = wsk >= 0 ? 1 : -1;
        for (const p of fp) {
          if (box.containsPoint(p)) { const r = nearest(p, tp, topTris, tgd); if (r && r.s < -.001 && r.s > -.015 && r.d < .015) { furIn++; furDeep = Math.max(furDeep, -r.s); } }
          const q = nearest(p, spts, skinTris, sg); if (q && q.d < .02 && q.s * wsk < -.002) { furSkin++; furSkinDeep = Math.max(furSkinDeep, -q.s * wsk); }
        }
      }
      return { towelIn, towelDeep, headIn, headDeep, furIn, furDeep, furSkin, furSkinDeep };
    };
    const frames = [];
    for (const [mod, ids] of [[Core, ['dream_gym_talk']], [require('../adventure/story/docks-core'), ['dream_docks', 'dream_fight_night']]]) for (const id of ids) {
      const S = mod.scenes[id]; DreamPose.reset(c);
      for (let t = 0; t <= S.duration; t += 1 / 6) { const st = Core.sample(S, t).actors.bruno; if (!st || st.act === 'off') continue;
        DreamPose.civil(c, { t, dt: 1 / 6, dist: st.dist, walk: +st.walking, arms: st.arms, lean: st.lean, drop: st.drop, talk: st.talk ? 1 : 0, look: { yaw: 0, pitch: 0 } }); c.updateMane(t);
        if (st.walking) frames.push([id + ' ' + t.toFixed(2), contact()]); }
    }
    const POSE = { talk: { talk: 1, arms: { R: 'open' } }, walk: { walk: 1 }, point: { arms: { R: 'point' } }, hips: { arms: { L: 'hips', R: 'hips' } }, shrug: { arms: { L: 'shrug', R: 'shrug' } }, 'look left': { look: { yaw: .7, pitch: 0 } }, 'look right': { look: { yaw: -.7, pitch: 0 } }, 'look down': { look: { yaw: 0, pitch: -.5 } }, 'look up': { look: { yaw: 0, pitch: .35 } }, chin: { arms: { L: 'hips', R: 'chin' } }, cross: { arms: { L: 'cross', R: 'cross2' } } };
    for (const [nm, st] of Object.entries(POSE)) { DreamPose.reset(c); for (let k = 0; k < 30; k++) { const t = 2 + k / 30; DreamPose.civil(c, { t, dt: 1 / 30, dist: st.walk ? t * 1.25 : 0, ...st }); if (st.talk) StoryCast.talk(c, 1); c.updateMane(t); } frames.push(['pose ' + nm, contact()]); }
    const worst = frames.reduce((w, [n, r]) => ({ towelIn: w.towelIn + r.towelIn, headIn: w.headIn + r.headIn, towelDeep: Math.max(w.towelDeep, r.towelDeep), headDeep: Math.max(w.headDeep, r.headDeep), furIn: w.furIn + r.furIn, furSkin: w.furSkin + r.furSkin, furDeep: Math.max(w.furDeep, r.furDeep, r.furSkinDeep), at: r.towelIn || r.headIn || r.furIn || r.furSkin ? w.at.concat(n) : w.at }), { towelIn: 0, headIn: 0, towelDeep: 0, headDeep: 0, furIn: 0, furSkin: 0, furDeep: 0, at: [] });
    if (process.env.CONTACT_DEBUG) for (const [n, r] of frames) if (r.towelIn || r.headIn) console.log('contact', n, JSON.stringify(r));
    assert.ok(frames.length > 40, 'walking frames and poses checked: ' + frames.length);
    assert.equal(worst.towelIn, 0, 'no towel vertex inside the head (' + worst.towelIn + ', deepest ' + worst.towelDeep.toFixed(3) + ' m at ' + worst.at.slice(0, 3) + ')');
    assert.equal(worst.headIn, 0, 'no head vertex inside the towel (' + worst.headIn + ', deepest ' + worst.headDeep.toFixed(3) + ' m at ' + worst.at.slice(0, 3) + ')');
    assert.ok(fur, 'the fur cards are probed');
    assert.equal(worst.furIn + worst.furSkin, 0, 'no fur card inside the towel (' + worst.furIn + ') or the body (' + worst.furSkin + '), deepest ' + worst.furDeep.toFixed(3) + ' m at ' + worst.at.slice(0, 3));
    report.contact = { frames: frames.length, towelIn: worst.towelIn, headIn: worst.headIn, furIn: worst.furIn, furSkin: worst.furSkin };
    DreamPose.reset(c);
  }

  // ---- the gym-fight referee is the same rig (gym-fight.js: Cast.rig('bruno')): the model is on and rides the joint in his poses
  for (const [nm, st] of [['count', { arms: { L: 'hips', R: 'count' }, reach: { R: [.3, 1.5, .38] }, look: { yaw: 0, pitch: -.45 }, lean: .2 }], ['raise', { arms: { L: 'hips', R: 'hips' }, reach: { R: { at: [.55, 2.0, .25], w: 1, pole: [1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } } }]]) {
    c.root.scale.set(1, 1, 1); DreamPose.civil(c, { t: 5, dt: 1 / 30, dist: 0, ...st }); c.updateMane(5); c.root.updateMatrixWorld(true);
    assert.ok(model.matrixWorld.equals(head.matrixWorld) && mesh.layers.mask === 1, 'referee ' + nm + ': the authored head is on');
  }
  assert.ok(/Cast\.rig\('bruno', e\)/.test(fs.readFileSync('adventure/story/gym-fight.js', 'utf8')), 'the referee is the story rig');
  // the ground rule (same as Fang's and Hazel's): lying on his back the model is raised off the ground, standing it sits on the joint again
  const lowest = () => { c.root.updateMatrixWorld(true); let y = 1e9; const P = mesh.geometry.attributes.position, v = V(); for (let i = 0; i < P.count; i += 7) y = Math.min(y, v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld).y); return y; };
  DreamPose.reset(c); for (let k = 0; k < 30; k++) DreamPose.civil(c, { t: 1 + k / 30, dt: 1 / 30, dist: 0 }); c.root.scale.set(-1, 1, 1); c.root.position.set(0, .25, 0); c.root.rotation.set(-Math.PI / 2, 0, 0);
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
  const html = fs.readFileSync('index.html', 'utf8'); assert.ok(/cast-market\.js\?v=20261126br5/.test(html) && /dream-scenes\.js\?v=20261126br/.test(html), 'changed scripts re-fetched');
  console.log('bruno head ok', JSON.stringify({ ...report, tris: allTris, bytes: glb.length, folded, deep, poses: n, lowEye: +lowEye.toFixed(3), talkNod: +talkNod.toFixed(3), lying: [+sunk.toFixed(3), +rested.toFixed(3)] }));
})().catch(e => { console.error(e); process.exit(1); });
