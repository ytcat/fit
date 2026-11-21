// node tests/rourke-cast.test.cjs — Rourke, the crocodile dock worker (Chapter 1 beat 10, the Docks fight), adventure/story/cast-docks.js.
// Part 1 (the rig in Node, like story-cast-market): registered next to the other casts; a crocodile head (long flat snout, eyes high
// on the skull, teeth along the closed jaw, a jaw that opens in speech); no ears, mane or fur; a scaled, countershaded skin; a tail;
// his own clothes (work trousers, bare chest, wraps, boots); the lion's fight moves; part bounds in guard, punches, hits and a
// knockdown, mirrored; the Opponent slot without the boxing kit. Part 2 (the real app in headless Chromium): the rig builds in the
// page, and as the Opponent of a live Docks bout (ringless) no glove or kit mesh shows and the whole body stays in a body-sized bound.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), http = require('node:http');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/story-cast.js', 'adventure/story/cast-market.js', 'adventure/story/cast-docks.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });

// ---- registered after the market cast, without replacing anyone
assert.deepEqual(StoryCast.ids, ['bruno', 'brick', 'fang', 'hazel', 'otto', 'rourke'], 'ids');
assert.deepEqual(StoryCast.names.rourke, { en: 'Rourke', he: 'רורק', ru: 'Рурк' }, 'names as in the story text');
assert.equal(StoryCast.defs.rourke.id, 'rourke'); assert.ok(StoryCast.market && StoryCast.docks, 'both cast files loaded');

const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
const shown = (o, root) => { for (let q = o; q && q !== root; q = q.parent) if (!q.visible) return false; return true; };
const tris = c => { let n = 0, m = 0; c.root.traverse(o => { if (o.isMesh && shown(o, c.root)) { m++; n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { meshes: m, triangles: Math.round(n) }; };
const lion = new LionCoach(data, { species: 'lion' }), fang = StoryCast.rig('fang', engine);
const c = StoryCast.rig('rourke', engine);
assert.ok(c && c.character === 'rourke' && c.species === 'lion', 'Rourke builds on the lion fighter rig'); assert.equal(StoryCast.rig('rourke', engine), c, 'cached');
{ const p = c.skin.geometry.attributes.position.array, n = c.skin.geometry.attributes.normal.array; for (let i = 0; i < p.length; i += 37) assert.ok(Number.isFinite(p[i]) && Number.isFinite(n[i]), 'finite skin'); }
const tf = tris(fang), tr = tris(c); console.log('triangles fang', JSON.stringify(tf), 'rourke', JSON.stringify(tr));
assert.ok(tr.triangles < tf.triangles * 1.1 && tr.triangles < 470000, 'within Fang\'s triangle budget');

// ---- a crocodile, not a lizard-dog or a wolf: no ears, no mane, no fur anywhere
const meshes = []; c.root.traverse(o => { if (o.isMesh && shown(o, c.root)) meshes.push(o); });
for (const o of meshes) assert.ok(!/\bear\b|ear pivot|inner ear|mane|fur|ruff|tuft|whisker|brow/i.test(o.name || ''), 'no ears, mane, fur or whiskers: ' + o.name);
assert.ok(!(c.castSprings || []).some(s => s.kind === 'ear' || s.kind === 'ruff'), 'no ear or ruff springs');
assert.ok(!c.bodyFur || !c.bodyFur.visible, 'the short body fur is off'); assert.ok(!c.mane || !shown(c.mane, c.root), 'no mane');
assert.ok(c.skin.material.bumpScale < lion.skin.material.bumpScale, 'the fur bump of the skin is turned down (scales, not fur)');
assert.ok(meshes.every(o => !(o.material?.roughness === 1 && o.material?.side === THREE.DoubleSide && o !== c.skin)), 'no fur-lock material');
// head shape (world metres, rest pose): a long flat snout about as long as the skull, the eyes up on the skull
const P = c.skin.geometry.attributes.position, head = [];
for (let i = 0; i < P.count; i++) if (P.getY(i) > 1.72) head.push([P.getX(i), P.getY(i), P.getZ(i)]);
const front = (pts, y0, y1) => Math.max(...pts.filter(p => p[1] > y0 && p[1] < y1 && Math.abs(p[0]) < .03).map(p => p[2]));
const lionHead = []; { const L = lion.skin.geometry.attributes.position; for (let i = 0; i < L.count; i++) if (L.getY(i) > 1.72) lionHead.push([L.getX(i), L.getY(i), L.getZ(i)]); }
const tipZ = front(head, 1.84, 2.0), back = Math.min(...head.filter(p => p[1] > 1.86 && Math.abs(p[0]) < .05).map(p => p[2]));
console.log('snout tip z', tipZ.toFixed(3), 'lion muzzle z', front(lionHead, 1.84, 2.0).toFixed(3), 'skull back z', back.toFixed(3));
assert.ok(tipZ > front(lionHead, 1.84, 2.0) + .15, 'the snout is long');
assert.ok(tipZ - .1 > .8 * (.1 - back), 'the snout (from the eyes) is about as long as the skull behind them');
{ const slab = head.filter(p => Math.abs(p[2] - (tipZ - .06)) < .006 && Math.abs(p[0]) < .2), h = Math.max(...slab.map(p => p[1])) - Math.min(...slab.map(p => p[1])), w = 2 * Math.max(...slab.map(p => Math.abs(p[0])));
  console.log('snout near the tip: height', h.toFixed(3), 'width', w.toFixed(3)); assert.ok(w > 1.4 * h, 'the snout is flat and broad'); }
const eyes = c.joints.head.children.filter(o => o.userData.eye); assert.equal(eyes.length, 2, 'two eyes');
c.root.updateMatrixWorld(true); const restTop = Math.max(...head.filter(p => p[2] > .2).map(p => p[1]));
for (const e of eyes) { const w = e.getWorldPosition(new THREE.Vector3()); assert.ok(Math.abs(w.y - c.joints.head.getWorldPosition(new THREE.Vector3()).y) < .5, 'eye on the head'); }
assert.ok((c.facialRest || []).filter(f => f.eye).length === 2 && c.faceActing.eyes.length === 2, 'the eyes blink with the face acting');
for (const e of eyes) assert.ok(e.position.y + 1.84 > restTop - .01, 'the eyes sit up on the skull, above the snout (rest, head frame): ' + (e.position.y + 1.84).toFixed(3) + ' vs ' + restTop.toFixed(3));
// vertical slit pupils in a yellow-green iris
{ const ball = eyes[0], kids = ball.children; assert.ok(kids.some(k => k.scale.y > 3 * k.scale.x && k.material.color.r < .05), 'a vertical slit pupil');
  const iris = kids.find(k => k.material.color.g > .4); assert.ok(iris && iris.material.color.g > iris.material.color.b * 2, 'yellow-green iris'); }
// teeth along the closed jaw, the upper row hanging over the lower jaw; the lower teeth ride on the jaw hinge
const upper = c.joints.head.children.find(o => o.name === 'Rourke: upper teeth'), hinge = c.castMouth.lower, lowerT = hinge.children.find(o => o.name === 'Rourke: lower teeth');
assert.ok(upper && upper.visible && lowerT && lowerT.visible, 'teeth show with the mouth closed');
assert.ok(upper.geometry.attributes.position.count / 3 / 36 > 30, 'a full row of teeth: ' + Math.round(upper.geometry.attributes.position.count / 108));
// the jaw morph on anatomy channel 12 (and nothing else of the lion's face left on the head)
{ const M = c.skin.geometry.attributes.avatarMuscle; let jawN = 0, down = 0, other = 0;
  for (let i = 0; i < M.count; i++) { if (P.getY(i) < 1.72) continue; const d = Math.hypot(M.getX(i), M.getY(i), M.getZ(i)); if (M.getW(i) === 12 && M.getY(i) < -1e-4) { jawN++; down += M.getY(i); } else if (d > 1e-5 && M.getW(i) !== 12) other++; }
  assert.ok(jawN > 1500 && down < 0, 'lower jaw morph (' + jawN + ' vertices)'); assert.equal(other, 0, 'no other face morph on the head');
  const D = c.skin.geometry.attributes.avatarDefinition; let def = 0; for (let i = 0; i < P.count; i++) if (P.getY(i) > 1.75 && (D.array[i * 4] || D.array[i * 4 + 1] || D.array[i * 4 + 2])) def++; assert.equal(def, 0, 'no lion muscle definition on the head'); }
c.anatomy = { value: new Float32Array(14) }; StoryCast.talk(c, 1); assert.ok(c.anatomy.value[12] > .5 && hinge.rotation.x > .1, 'talk opens the jaw');
c.anatomy.value[12] = 0; StoryCast.talk(c, 0); assert.ok(hinge.rotation.x === 0 && upper.visible, 'mouth closed, teeth still showing'); delete c.anatomy;

// ---- skin: dark olive back, pale throat and belly, a scale pattern (contrast between neighbouring scales), no cloth on the chest
{ const C = c.skin.geometry.attributes.color, lum = i => .2126 * C.getX(i) + .7152 * C.getY(i) + .0722 * C.getZ(i), avg = f => { let s = 0, n = 0; for (let i = 0; i < P.count; i++) if (f(P.getX(i), P.getY(i), P.getZ(i))) { s += lum(i); n++; } return s / n; };
  const backL = avg((x, y, z) => y > 1.2 && y < 1.5 && z < -.1 && Math.abs(x) < .12), bellyL = avg((x, y, z) => y > 1.15 && y < 1.35 && z > .1 && Math.abs(x) < .08), throatL = avg((x, y, z) => y > 1.7 && y < 1.76 && z > .06 && Math.abs(x) < .05), crownL = avg((x, y, z) => y > 2.0 && z > .1 && z < .3 && Math.abs(x) < .06);
  console.log('luminance back/belly/throat/snout top', [backL, bellyL, throatL, crownL].map(v => v.toFixed(3)).join(' ')); assert.ok(bellyL > 2.5 * backL && throatL > 2 * crownL, 'countershaded');
  let jumps = 0, n = 0; for (let i = 0; i < P.count; i += 3) { if (!(P.getY(i) > 1.2 && P.getY(i) < 1.5 && P.getZ(i) < -.1)) continue; n++; if (Math.abs(lum(i) - lum(i + 1)) > .012 || Math.abs(lum(i) - backL) > .02) jumps++; } assert.ok(jumps / n > .3, 'a scale pattern on the back: ' + (jumps / n).toFixed(2));
  let green = 0, k = 0; for (let i = 0; i < P.count; i += 5) { const x = Math.abs(P.getX(i)), y = P.getY(i); if (y > 1.3 && y < 1.55 && x > .12 && x < .25) { k++; if (C.getY(i) > C.getZ(i) * 1.4) green++; } } assert.ok(green / k > .9, 'bare chest: skin colours, not cloth'); }
// tail: a thick tapered crocodile tail with a crest, lagging behind the hips
{ const t = meshes.find(o => o.name === 'Rourke: tail scales'); assert.ok(t, 'a tail'); t.geometry.computeBoundingBox(); const s = t.geometry.boundingBox.getSize(new THREE.Vector3()); assert.ok(s.length() > .9 && s.length() < 1.6, 'tail length ' + s.length().toFixed(2));
  assert.ok(c.castSprings.some(q => q.kind === 'tail'), 'the tail lags'); assert.equal(c.tail.children.length, 1, 'the lion tail is gone'); }

// ---- clothes: the same in films and fights (outfit() leaves him alone), bare wrapped hands, work boots, no kit
const kitShown = () => { const k = StoryCast.kitParts(c); return ['gloves', 'shorts', 'boots', 'trim', 'fur'].flatMap(n => k[n] || []).filter(o => o && shown(o, c.root)); };
assert.deepEqual(kitShown(), [], 'no boxing kit'); assert.ok(!c.gloveMeshes.L.visible && !c.gloveMeshes.R.visible && !c.shorts.visible);
for (const s of ['L', 'R']) { const names = c.joints['hand' + s].children.filter(o => o.visible).map(o => o.name); assert.ok(names.includes('Bare hand') && names.includes('Hand wraps'), 'bare scaly hand in white wraps ' + s); assert.ok(c.joints['foot' + s].children.some(o => o.visible && o.name === 'Rourke: work boot'), 'work boot ' + s); }
assert.ok(c.joints.hips.children.some(o => o.name === 'Rourke: overall straps knot'), 'the overall straps tied round the waist');
assert.equal(StoryCast.outfit(c, 'track_wraps'), true); assert.equal(StoryCast.outfit(c, 'kit'), true); assert.deepEqual(kitShown(), [], 'outfit() does not put the kit back');

// ---- the fight: the lion fighter's own update and moves, bare-handed
assert.ok(!Object.prototype.hasOwnProperty.call(c, 'update') && c.update === LionCoach.prototype.update, 'the lion fighter\'s own update');
for (const move of ['guard', 'jab', 'cross', 'hook', 'rear_hook', 'uppercut', 'rear_uppercut', 'slip', 'roll']) for (let i = 0; i <= 12; i++) { const m = c.update(i * .1, move, 'one_two', { guardCover: 1 }); assert.ok(m.handErrors.every(x => x < .001) && m.hands.every(p => p.every(Number.isFinite)), 'Rourke boxes: ' + move); }
{ const restore = StoryCast.asOpponent(engine, 'rourke'); assert.equal(engine.arena.castOpponent, c); c.gloveMeshes.L.visible = true; c.shorts.visible = true; c.updateMane(1); assert.deepEqual(kitShown(), [], 'kit hidden again every frame in the fight'); restore(); assert.equal(engine.arena.castOpponent, null); }
{ const S = require('../ringless-venues.js'); assert.equal(S.outfitFor('docks'), 'track_wraps'); assert.match(fs.readFileSync('ringless-venues.js', 'utf8'), /if \(!c\.skin \|\| c\.cast\) continue/, 'the Docks staging leaves cast rigs in their own clothes'); }

// ---- part bounds (as the Brick and Fang tests): nothing detached or stretched in guard, punches, a hit, a knockdown and speech,
// with the root mirrored, inside a mirrored cast, and at root scale 1 in a mirrored cast (as in a bout)
{
  const box = new THREE.Box3(), size = new THREE.Vector3(), q = new THREE.Vector3(), headQ = new THREE.Vector3();
  const check = (label) => {
    c.root.updateMatrixWorld(true); const inv = c.root.matrixWorld.clone().invert(); let n = 0; c.joints.head.getWorldPosition(headQ).applyMatrix4(inv);
    c.root.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry.attributes.position?.count || !shown(o, c.root)) return; n++;
      o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(inv.clone().multiply(o.matrixWorld)); box.getSize(size);
      const name = label + ': ' + (o.name || o.parent?.name || o.geometry.type);
      assert.ok(Math.max(size.x, size.y, size.z) < 1.05, name + ' is ' + Math.max(size.x, size.y, size.z).toFixed(2) + ' m long');
      assert.ok(box.min.x > -1.3 && box.max.x < 1.3 && box.min.z > -1.3 && box.max.z < 1.6 && box.min.y > -.35 && box.max.y < 2.7, name + ' leaves the body: ' + JSON.stringify(box));
      let h = o.parent; while (h && h !== c.joints.head) h = h.parent;
      if (h) { box.getCenter(q); assert.ok(q.distanceTo(headQ) < .5 && Math.max(size.x, size.y, size.z) < .95, name + ' floats off the head: ' + q.distanceTo(headQ).toFixed(2)); }
    });
    for (const o of c.root.children) if (o.isSkinnedMesh && o.visible) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; assert.ok(b.min.y > -.05 && b.max.y < 2.4 && b.max.x - b.min.x < 2.1, label + ': ' + (o.name || 'skin') + ' rest bounds'); }
    assert.ok(n > 10, label + ' has parts');
  };
  assert.equal(c.root.scale.x, -1, 'the root is mirrored');
  const poses = { guard: () => c.update(1, 'guard', 'one_two', { guardCover: 1 }), jab: () => c.update(.5 * 1.22, 'jab', 'one_two', { power: 1.2 }), cross: () => c.update(.5 * 1.22, 'cross', 'one_two', {}), hook: () => c.update(.5 * 1.22, 'hook', 'one_two', {}), uppercut: () => c.update(.5 * 1.22, 'rear_uppercut', 'one_two', {}), slip: () => c.update(.5 * 1.22, 'slip', 'one_two', {}),
    hit: () => c.update(1, 'guard', 'one_two', { hitReaction: { part: 'head', amount: 1, side: 1, move: 'cross' } }), down: () => c.update(1, 'guard', 'one_two', { down: 1, presentation: { mode: 'loser', raise: 0 } }), talk: () => DreamPose.civil(c, { t: 3, dist: 0, arms: { L: 'pound', R: 'point' }, look: { yaw: .6, pitch: .1 }, talk: 1 }), walk: () => DreamPose.civil(c, { t: 2, dist: .4, walk: 1 }) };
  for (const [name, f] of Object.entries(poses)) {
    for (let k = 0; k < 3; k++) f(); check('rourke ' + name);
    const home = c.root.parent, cast = new THREE.Group(); cast.scale.x = -1; cast.position.set(.4, 0, -.3); cast.rotation.y = 1.1; cast.add(c.root); f(); check('rourke ' + name + ' (mirrored cast)');
    c.root.scale.set(1, 1, 1); f(); check('rourke ' + name + ' (root scale 1 in a mirrored cast)'); c.root.scale.set(-1, 1, 1); cast.remove(c.root); if (home) home.add(c.root);
  }
  DreamPose.reset(c); console.log('rourke parts stay on the body');
}
{ const m = DreamPose.civil(c, { t: 1, dist: 0 }); assert.ok(m.handErrors.every(x => x < .02) && m.hands.every(h => h[1] < 1.2), 'stands with relaxed arms in the films'); DreamPose.reset(c); }

// ---- wiring: page (after cast-market, before the films), offline cache
const html = fs.readFileSync('index.html', 'utf8'), manifest = fs.readFileSync('offline-manifest.json', 'utf8');
assert.ok(/\.\/adventure\/story\/cast-docks\.js\?v=\d+/.test(html) && manifest.includes('adventure/story/cast-docks.js'), 'cast-docks.js is loaded and cached offline');
assert.ok(html.indexOf('cast-market.js') < html.indexOf('cast-docks.js') && html.indexOf('cast-docks.js') < html.indexOf('dream-scenes.js'), 'load order');
console.log('PASS rourke rig (node)');

// ================================================================ part 2: the real app
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = path.resolve('.'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } }), errors = [];
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.docks && window.ringfighterGame?.startFight && window.GameVenues, null, { timeout: 300000 });
    // the rig in the page, every pose in a body-sized bound (rigid parts and a sample of the skinned skin, in the root frame)
    const built = await p.evaluate(() => {
      const e = app.engine, c = StoryCast.rig('rourke', e), out = { ids: StoryCast.ids.slice(), name: StoryCast.names.rourke.en, poses: {} };
      const shown = o => { for (let q = o; q && q !== c.root; q = q.parent) if (!q.visible) return false; return true; };
      const names = []; c.root.traverse(o => { if (o.isMesh && shown(o)) names.push(o.name || ''); }); out.names = names;
      out.furOrEars = names.filter(n => /\bear\b|ear pivot|mane|fur|ruff|tuft|whisker/i.test(n)); out.bodyFur = !!(c.bodyFur && c.bodyFur.visible); out.mane = !!(c.mane && shown(c.mane));
      const bounds = () => {
        c.root.updateMatrixWorld(true); const inv = c.root.matrixWorld.clone().invert(), b = new THREE.Box3(), v = new THREE.Vector3(); let worst = 0;
        c.root.traverse(o => { if (!o.isMesh || !shown(o) || !o.geometry.attributes.position) return; const P = o.geometry.attributes.position, step = o.isSkinnedMesh ? 41 : 7;
          for (let i = 0; i < P.count; i += step) { v.fromBufferAttribute(P, i); if (o.isSkinnedMesh) { o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld); } else v.applyMatrix4(o.matrixWorld); v.applyMatrix4(inv); b.expandByPoint(v); } });
        // a stretched skin shows as an edge far longer than at rest: sample skin triangles
        const a = new THREE.Vector3(), d = new THREE.Vector3(), ra = new THREE.Vector3(), rd = new THREE.Vector3();
        const grow = rig => { const g = rig.skin.geometry, idx = g.index.array, P = g.attributes.position; let w = 0; for (let t = 0; t < idx.length; t += 3 * 97) { const i = idx[t], j = idx[t + 1]; ra.fromBufferAttribute(P, i); rd.fromBufferAttribute(P, j); rig.skin.boneTransform(i, a.copy(ra)); rig.skin.boneTransform(j, d.copy(rd)); w = Math.max(w, a.distanceTo(d) - ra.distanceTo(rd)); } return w; };
        worst = grow(c); const ref = grow(lion);
        return { min: b.min.toArray().map(x => +x.toFixed(3)), max: b.max.toArray().map(x => +x.toFixed(3)), stretch: +worst.toFixed(3), lionStretch: +ref.toFixed(3) };
      };
      const lion = new LionCoach(e.roster.data, { species: 'lion' });
      const poses = { guard: r => r.update(1, 'guard', 'one_two', { guardCover: 1 }), jab: r => r.update(.6, 'jab', 'one_two', { power: 1.2 }), cross: r => r.update(.6, 'cross', 'one_two', {}), hook: r => r.update(.6, 'hook', 'one_two', {}), uppercut: r => r.update(.6, 'rear_uppercut', 'one_two', {}), down: r => r.update(1, 'guard', 'one_two', { down: 1, presentation: { mode: 'loser', raise: 0 } }) };
      for (const [k, f] of Object.entries(poses)) { for (let i = 0; i < 3; i++) { f(c); f(lion); } c.root.updateMatrixWorld(true); lion.root.updateMatrixWorld(true); out.poses[k] = bounds(); }
      return out;
    });
    assert.ok(built.ids.includes('rourke') && built.name === 'Rourke', 'registered in the app');
    assert.deepEqual(built.furOrEars, [], 'no ears, mane or fur in the app'); assert.ok(!built.bodyFur && !built.mane, 'no body fur, no mane');
    for (const [k, b] of Object.entries(built.poses)) {
      console.log('app bound', k, JSON.stringify(b));
      assert.ok(b.min[0] > -1.4 && b.max[0] < 1.4 && b.min[2] > -1.4 && b.max[2] < 1.6 && b.min[1] > -.4 && b.max[1] < 2.6, k + ': the body stays in a body-sized box');
      assert.ok(b.max[1] - b.min[1] < 2.6 && b.max[0] - b.min[0] < 2.2, k + ': nothing flies off'); assert.ok(b.stretch < b.lionStretch + .02, k + ': no skin stretched beyond the lion fighter\'s own (' + b.stretch + ' vs ' + b.lionStretch + ' m)');
    }
    // the Docks bout: Rourke is the Opponent, the venue is ringless, no glove or kit mesh shows on him at any sampled frame
    const bout = await p.evaluate(() => new Promise((resolve, reject) => {
      setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300);
      const e = app.engine, c = StoryCast.rig('rourke', e); window.__restore = StoryCast.asOpponent(e, 'rourke');
      ringfighterGame.startFight({ rounds: 1, roundSeconds: 60, restSeconds: 5, watch: true, seed: 77 }); GameVenues.apply(e, 'docks', 'en'); setInterval(() => { if (!e.arena?.fightView?.ringless) GameVenues.apply(e, 'docks', 'en'); }, 500); // staging only (the adventure sets the venue through the store)
      const shown = o => { for (let q = o; q && q !== c.root; q = q.parent) if (!q.visible) return false; return true; };
      const out = { frames: 0, kit: new Set(), ringless: 0, opponent: 0, hands: 0, punches: new Set() }, t0 = performance.now();
      const tick = () => {
        const view = e.arena?.fightView, m = view?.match;
        if (m && m.phase === 'round' && view.ringless?.id === 'docks') {
          out.frames++; out.ringless++; if (e.arena.rabbit === c) out.opponent++;
          c.root.traverse(o => { if (o.isMesh && shown(o) && !o.userData.storyPart && o !== c.skin) out.kit.add(o.name || o.geometry.type); });
          if (['L', 'R'].every(s => c.joints['hand' + s].children.some(o => o.visible && o.name === 'Hand wraps'))) out.hands++;
          const a = m.fighters.rabbit.action; if (a?.attack) out.punches.add(a.move);
        }
        if (out.frames >= 240 || performance.now() - t0 > 200000) { resolve({ ...out, kit: [...out.kit], punches: [...out.punches] }); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick); setTimeout(() => reject(new Error('bout timeout')), 260000);
    }));
    console.log('docks bout', JSON.stringify(bout));
    assert.ok(bout.frames >= 60, 'the bout ran (' + bout.frames + ' frames)'); assert.equal(bout.opponent, bout.frames, 'Rourke is the Opponent'); assert.ok(bout.ringless >= 60, 'staged ringless in the Docks');
    assert.deepEqual(bout.kit, [], 'no glove, shorts, boot or other kit mesh shows on Rourke'); assert.equal(bout.hands, bout.frames, 'wrapped bare hands throughout');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS rourke in the app: builds, no ears/mane/fur, body-sized bounds in guard/punches/knockdown, Docks bout without kit');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
