// node tests/story-cast-market.test.cjs — GOTR-0092: Fang (wolf), Mrs. Hazel (doe), Otto (otter) on the game rig.
// Builds, face dynamics, everyday pose, Fang boxing bare-handed, outfit by place, part bounds with the mirrored root, wiring.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/story-cast.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const IDS = ['fang', 'hazel', 'otto'];

// ---- registered next to Bruno and Brick, without replacing them
assert.deepEqual(StoryCast.ids, ['bruno', 'brick', ...IDS], 'ids');
for (const id of IDS) { for (const lang of ['en', 'he', 'ru']) assert.ok(StoryCast.names[id][lang], id + ' ' + lang); assert.equal(StoryCast.defs[id].id, id); }
assert.equal(StoryCast.names.fang.ru, 'Фанг', 'same name as the story text'); assert.equal(StoryCast.names.hazel.en, 'Mrs. Hazel');

const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
const tris = c => { let n = 0, m = 0; c.root.traverse(o => { let v = o.visible, q = o; while (v && q.parent && q !== c.root) { q = q.parent; v = q.visible; } if (o.isMesh && v) { m++; n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { meshes: m, triangles: Math.round(n) }; };
const width = (c, y0, y1) => { const P = c.skin.geometry.attributes.position; let w = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.abs(P.getX(i)) < .3) w = Math.max(w, Math.abs(P.getX(i))); } return w; };
const front = (c, y0, y1) => { const P = c.skin.geometry.attributes.position; let z = -9; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.abs(P.getX(i)) < .03) z = Math.max(z, P.getZ(i)); } return z; };
const lion = new LionCoach(data, { species: 'lion' });
const rigs = {};
for (const id of IDS) {
  const c = rigs[id] = StoryCast.rig(id, engine); assert.ok(c && c.character === id && c.species === 'lion', id + ' builds'); assert.equal(StoryCast.rig(id, engine), c, 'cached');
  const p = c.skin.geometry.attributes.position.array, n = c.skin.geometry.attributes.normal.array; for (let i = 0; i < p.length; i += 61) assert.ok(Number.isFinite(p[i]) && Number.isFinite(n[i]), id + ': finite skin');
  const m = DreamPose.civil(c, { t: 1, dist: 0 }); assert.ok(m.handErrors.every(x => x < .02), id + ' stands with relaxed arms'); assert.ok(m.hands.every(h => h[1] < 1.2), id + ': arms down, no guard');
  const t = tris(c); console.log(id, JSON.stringify(t)); assert.ok(t.triangles < 470000, id + ': no heavier than the lion fighter (' + t.triangles + ')');
  assert.ok(!c.gloveMeshes.L.visible && !c.gloveMeshes.R.visible && !c.shorts.visible, id + ': no boxing kit');
  assert.ok(c.faceActing && c.faceActing.eyes.length >= 2, id + ': blinking eyes'); assert.ok(c.castSprings.some(s => s.kind === 'ear'), id + ': ears with inertia');
  // the jaw morph sits on anatomy channel 12, under the mouth line, and opens downward
  const M = c.skin.geometry.attributes.avatarMuscle; let jawN = 0, down = 0; for (let i = 0; i < M.count; i++) if (M.getW(i) === 12 && M.getY(i) < -1e-4) { jawN++; down += M.getY(i); } assert.ok(jawN > 300 && down < 0, id + ': lower jaw morph (' + jawN + ' vertices)');
  // the head is sculpted, not the lion's
  assert.ok(Math.abs(front(c, 1.9, 1.99) - front(lion, 1.9, 1.99)) > .006 || Math.abs(width(c, 1.95, 2.05) - width(lion, 1.95, 2.05)) > .006, id + ': own head shape');
  // StoryCast.outfit leaves story characters in their own clothes
  assert.equal(StoryCast.outfit(c, 'kit'), true); assert.equal(StoryCast.outfit(c, 'street'), true); assert.ok(!c.gloveMeshes.L.visible, id + ': outfit() does not put the kit back');
}
const fang = rigs.fang, hazel = rigs.hazel, otto = rigs.otto;
assert.ok(front(fang, 1.9, 1.98) > front(lion, 1.9, 1.98) + .08, 'the wolf has a long muzzle');
console.log('waist half-widths lion/fang/hazel/otto', [lion, fang, hazel, otto].map(c => width(c, 1.05, 1.15).toFixed(3)).join(' '));
assert.ok(width(fang, 1.05, 1.15) > width(lion, 1.05, 1.15) * 1.06, 'Fang is bigger than the lion fighter'); const arm = c => { const P = c.skin.geometry.attributes.position; let z = 0; for (let i = 0; i < P.count; i++) if (Math.abs(Math.abs(P.getX(i)) - .5) < .03) z = Math.max(z, Math.abs(P.getZ(i))); return z; }; console.log('upper arm half-depth lion/fang/hazel/otto', [lion, fang, hazel, otto].map(c => arm(c).toFixed(3)).join(' '));
assert.ok(width(hazel, 1.05, 1.15) < width(fang, 1.05, 1.15) && arm(hazel) < arm(lion) && arm(hazel) < arm(fang), 'Mrs. Hazel is slimmer');
assert.ok(width(otto, 1.1, 1.25) > width(lion, 1.1, 1.25) * 1.05, 'Otto is stocky');
{ const top = c => { const P = c.skin.geometry.attributes.position; let y = 0; for (let i = 0; i < P.count; i++) y = Math.max(y, P.getY(i)); return y; }; assert.ok(top(hazel) < top(lion) - .02 && top(otto) < top(lion) - .02, 'Mrs. Hazel and Otto stand lower than the fighters'); }
assert.ok(hazel.castProps.handbag && StoryCast.market.handbag(hazel) === hazel.castProps.handbag, 'the handbag is a prop the robbery can take');

// ---- speech opens the jaw (StoryCast.talk wraps the base talk); a story character's teeth show only with the mouth open
fang.anatomy = { value: new Float32Array(14) }; StoryCast.talk(fang, 1); assert.ok(fang.anatomy.value[12] > .5, 'talk opens the jaw'); assert.ok(fang.castMouth.show.every(m => m.visible), 'teeth show');
fang.anatomy.value[12] = 0; StoryCast.talk(fang, 0); assert.ok(fang.castMouth.show.every(m => !m.visible), 'mouth closed'); delete fang.anatomy;
StoryCast.talk(lion, 1); // still fine on a rig without a cast mouth

// ---- Fang boxes bare-handed with the fight animations; the fight slot takes him
for (const move of ['guard', 'jab', 'cross', 'hook', 'rear_hook', 'uppercut', 'slip', 'roll']) for (let i = 0; i <= 12; i++) { const m = fang.update(i * .1, move, 'one_two', { guardCover: 1 }); assert.ok(m.handErrors.every(x => x < .001) && m.hands.every(p => p.every(Number.isFinite)), 'Fang boxes: ' + move); }
assert.ok(!fang.gloveMeshes.L.visible && !fang.gloveMeshes.R.visible, 'Fang never wears gloves'); assert.ok(StoryCast.market.barehanded.includes('fang'));
assert.ok(['L', 'R'].every(s => fang.joints['hand' + s].children.some(o => o.visible && o.name === 'Bare hand')), 'bare fists');
const restore = StoryCast.asOpponent(engine, 'fang'); assert.equal(engine.arena.castOpponent, fang); restore(); assert.equal(engine.arena.castOpponent, null);
// outfit by place: the street fight (market_robber) is not in the gym, and Fang's rig has no glove to show there
{ const S = require('../adventure/story/story-core.js'); assert.notEqual(S.outfitFor('street'), 'kit', 'street: no kit'); }

// ---- walk: the planted foot does not slide on the new bodies either; the skirt follows the stride
for (const c of [fang, hazel, otto]) {
  let worst = 0; const hold = {}; DreamPose.reset(c);
  for (let i = 0; i <= 240; i++) { const dist = i * .01; c.root.position.set(0, 0, dist); DreamPose.civil(c, { t: i * .008, dist, walk: 1 }); const balls = DreamPose.feet(c);
    ['L', 'R'].forEach((s, k) => { const p = (dist / DreamPose.STRIDE + (k ? .5 : 0)) % 1, planted = p > .2 * DreamPose.DUTY && p < .6 * DreamPose.DUTY; if (planted) { if (hold[s]) worst = Math.max(worst, Math.hypot(balls[k][0] - hold[s][0], balls[k][2] - hold[s][2])); else hold[s] = balls[k]; } else hold[s] = null; }); }
  assert.ok(worst < .02, c.character + ': planted foot slides ' + worst); c.root.position.set(0, 0, 0); DreamPose.reset(c);
}
assert.equal(hazel.cast.stoop > 0, true, 'Mrs. Hazel stands a little stooped');

// ---- part bounds: nothing sticks out of the body, in talk, walk, guard, a punch and a hook, mirrored and inside a mirrored cast
{
  const box = new THREE.Box3(), size = new THREE.Vector3(), q = new THREE.Vector3(), headQ = new THREE.Vector3();
  const check = (c, label) => {
    c.root.updateMatrixWorld(true); const inv = c.root.matrixWorld.clone().invert(); let n = 0;
    c.joints.head.getWorldPosition(headQ).applyMatrix4(inv);
    c.root.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry.attributes.position?.count) return; let v = true, k = o; while (k && k !== c.root) { v = v && k.visible; k = k.parent; } if (!v) return; n++;
      o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(inv.clone().multiply(o.matrixWorld)); box.getSize(size);
      const name = label + ': ' + (o.name || o.parent?.name || o.geometry.type);
      assert.ok(Math.max(size.x, size.y, size.z) < 1.05, name + ' is ' + Math.max(size.x, size.y, size.z).toFixed(2) + ' m long');
      assert.ok(box.min.x > -1.3 && box.max.x < 1.3 && box.min.z > -1.3 && box.max.z < 1.6 && box.min.y > -.35 && box.max.y < 2.7, name + ' leaves the body: ' + JSON.stringify(box));
      let h = o.parent; while (h && h !== c.joints.head) h = h.parent;
      if (h) { box.getCenter(q); assert.ok(q.distanceTo(headQ) < .5 && Math.max(size.x, size.y, size.z) < .95, name + ' floats off the head: ' + q.distanceTo(headQ).toFixed(2)); }
    });
    // skinned cloth shells and drapes stay on the body in the rest bounds too
    for (const o of c.root.children) if (o.isSkinnedMesh && o.userData.storyPart && o.visible) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; assert.ok(b.min.y > 0 && b.max.y < 2.4 && b.max.x - b.min.x < 1.2, label + ': ' + o.name + ' rest bounds'); }
    assert.ok(n > 8, label + ' has parts');
  };
  for (const id of IDS) {
    const c = rigs[id]; assert.equal(c.root.scale.x, -1, id + ': the root is mirrored');
    const poses = { talk: () => DreamPose.civil(c, { t: 3, dist: 0, arms: { L: 'pound', R: 'point' }, look: { yaw: .6, pitch: .1 }, talk: 1 }), walk: () => DreamPose.civil(c, { t: 2, dist: .4, walk: 1 }), guard: () => c.update(1, 'guard', 'one_two', { guardCover: 1 }), punch: () => c.update(.5 * 1.22, 'jab', 'one_two', { power: 1.2 }), hook: () => c.update(.5 * 1.22, 'hook', 'one_two', {}) };
    for (const [name, f] of Object.entries(poses)) {
      for (let k = 0; k < 3; k++) f(); check(c, id + ' ' + name);
      const home = c.root.parent, cast = new THREE.Group(); cast.scale.x = -1; cast.position.set(.4, 0, -.3); cast.rotation.y = 1.1; cast.add(c.root); f(); check(c, id + ' ' + name + ' (mirrored cast)');
      c.root.scale.set(1, 1, 1); f(); check(c, id + ' ' + name + ' (root scale 1 in a mirrored cast)'); c.root.scale.set(-1, 1, 1); cast.remove(c.root); if (home) home.add(c.root);
    }
    DreamPose.reset(c);
  }
  console.log('market cast parts stay on the body');
}

// ---- wiring: page, offline cache, portraits, hooks doc; story-cast.js untouched by this file
const html = fs.readFileSync('index.html', 'utf8'), manifest = fs.readFileSync('offline-manifest.json', 'utf8');
assert.ok(/\.\/adventure\/story\/cast-market\.js\?v=\d+/.test(html) && manifest.includes('adventure/story/cast-market.js'), 'cast-market.js is loaded and cached offline');
assert.ok(html.indexOf('story-cast.js') < html.indexOf('cast-market.js') && html.indexOf('cast-market.js') < html.indexOf('dream-scenes.js'), 'load order');
const portraits = fs.readFileSync('adventure/portraits.js', 'utf8'); assert.ok(/S\.ids\.includes\(id\)/.test(portraits), 'portraits render every StoryCast character as a 3D head');
const hooks = fs.readFileSync('docs/adventure/DREAM_HOOKS.md', 'utf8'); for (const w of ["'fang'", "'hazel'", "'otto'", 'cast-market.js']) assert.ok(hooks.includes(w), 'hooks doc names ' + w);
console.log('market cast ok');
