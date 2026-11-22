// node tests/paws-phone.test.cjs — GOTR-0100 follow-up (paws on phones): with a worker the page never builds a paw shape during
// play. Until the worker delivers, a paw shows the quick stand-in (same anatomy, a few ms), then the real shape; shapes are asked for
// in priority order (the one on screen first, then a scene's prefetch, then the warm-up); a paw small on screen draws the low-detail
// version made in the same worker job, chosen per camera while the renderer projects the scene; the full-detail paw is unchanged.
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const FILE = path.resolve('adventure/story/paws.js');
const Sync = require(FILE); // node: no Worker -> built on demand (the reference data)
assert.equal(Sync.sync, true);

// ---- the page with a (fake) worker: jobs are recorded, answered by hand
const jobs = [], workers = [];
global.navigator = { hardwareConcurrency: 8 };
global.Worker = class { constructor(src) { this.src = src; workers.push(this); } postMessage(q) { jobs.push({ w: this, q }); } terminate() { } };
global.document = { currentScript: { src: 'http://x/adventure/story/paws.js?v=1' } };
const P = (() => { const m = { exports: {} }; new Function('module', 'exports', fs.readFileSync(FILE, 'utf8'))(m, m.exports); return m.exports; })();
delete global.document;
assert.equal(P.sync, false, 'a page with Worker support builds in workers');
const answer = j => { const d = Sync.build(j.q.species, j.q.shape, 'L', { wraps: j.q.wraps }); j.w.onmessage({ data: { key: j.q.key, d } }); };

const rig = (() => { const root = new THREE.Group(), joints = { handL: new THREE.Bone(), handR: new THREE.Bone() }; root.add(joints.handL, joints.handR); return { root, joints, species: 'lion', character: 'fang', renderTime: 0 }; })();
const t0 = Date.now(), [pl, pr] = P.attach(rig, { fallback: '#6f737c' }), attachMs = Date.now() - t0;
assert.equal(P.debug.page.length, 0, 'attach builds nothing on the page');
assert.ok(attachMs < 400, 'attach is quick (' + attachMs + ' ms, the stand-in only)');
assert.equal(pl.userData.pawDetail, 'quick', 'the stand-in shows until the worker delivers'); assert.equal(pl.userData.paw.species, 'wolf');
assert.ok(pl.geometry.index.count / 3 < 5000 && pl.geometry.attributes.color, 'the stand-in is one coloured mesh');
assert.ok(workers.length === 2, 'two workers on a phone with 8 cores'); assert.equal(jobs.length, 2, 'one job per worker at a time (the rest waits in the priority queue)');
assert.deepEqual(jobs.map(j => j.q.shape), ['fist', 'relaxed'], 'the shape wanted now (a fist: no pose yet) goes first');
// a coming scene moves up the queue: Mrs. Hazel before the rest of Fang's shapes
P.prefetch(['hazel'], { prio: 1, shapes: ['relaxed'] });
rig.renderTime = 1; rig.pawPose = { L: 'relaxed', R: 'relaxed', time: 1 }; rig.root.updateMatrixWorld(true);
assert.equal(pl.userData.pawDetail, 'quick', 'still the stand-in (nothing delivered), no build on the page'); assert.equal(P.debug.page.length, 0);
answer(jobs[0]); // fist delivered -> the next job: hazel relaxed (prio 1) before fang grip/open/point (prio 2)
assert.equal(jobs[2].q.species, 'doe', 'a prefetched scene jumps the warm-up queue');
rig.root.updateMatrixWorld(true);
assert.deepEqual([pl.userData.shape, pl.userData.pawDetail], ['fist', 'full'], 'the nearest ready shape at full detail while the wanted one is on its way');
answer(jobs[1]); rig.renderTime = 2; rig.pawPose = { L: 'relaxed', R: 'relaxed', time: 2 };
for (let k = 0; k < 4; k++) { rig.root.updateMatrixWorld(true); const t = Date.now(); while (Date.now() - t < 30); }
assert.deepEqual([pl.userData.shape, pl.userData.pawDetail, pr.userData.shape], ['relaxed', 'full', 'relaxed'], 'the wanted shape once it is ready');
// full detail is exactly the reference paw (the look up close is unchanged)
const ref = Sync.geometry('wolf', 'relaxed', 'L', pl.userData.coat || new THREE.Color(), {});
assert.deepEqual(Array.from(pl.geometry.attributes.position.array.slice(0, 300)), Array.from(ref.attributes.position.array.slice(0, 300)), 'full-detail positions = the reference');
assert.equal(pl.geometry.index.count, ref.index.count, 'full-detail triangles = the reference');

// ---- detail by size on screen: the renderer calls the marker's update(camera) before drawing the paw
const scene = new THREE.Scene(); scene.add(rig.root); scene.updateMatrixWorld(true);
const marker = rig.joints.handL.children[rig.joints.handL.children.indexOf(pl) - 1];
assert.ok(marker && marker.isLOD && marker.autoUpdate && marker.userData.storyPart, 'a detail marker just before the paw (kept out of the kit lists)');
const cam = new THREE.PerspectiveCamera(36, 402 / 690, .1, 200), look = d => { cam.position.set(0, 0, d); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true); marker.update(cam); };
look(2); assert.equal(pl.userData.pawDetail, 'full', 'close: full detail');
look(12); assert.equal(pl.userData.pawDetail, 'lod', 'far (under 3 % of the view): low detail');
const lodTris = pl.geometry.index.count / 3; assert.ok(lodTris <= 1000 && lodTris >= 500, 'low detail ~900 triangles (' + lodTris + ')');
look(9.5); assert.equal(pl.userData.pawDetail, 'lod', 'hysteresis: stays low between 3 and 4 %');
look(5); assert.equal(pl.userData.pawDetail, 'full', 'back to full detail when it comes closer');
assert.equal(P.debug.page.length, 0, 'never built on the page');

// ---- the stand-in and the low-detail paw for every species
for (const sp of P.species) for (const w of [false, true]) {
  const t = Date.now(), q = P.quick(sp, 'relaxed', 'L', { wraps: w }), ms = Date.now() - t, d = Sync.build(sp, 'fist', 'R', { wraps: w });
  assert.ok(q.stats.quick && q.idx.length / 3 < 5000 && ms < 200, sp + ' stand-in: ' + q.idx.length / 3 + ' triangles in ' + ms + ' ms');
  for (let i = 0; i < q.idx.length; i++) assert.ok(q.idx[i] < q.pos.length / 3);
  assert.ok(d.lod && d.lod.idx.length / 3 < 1100 && d.lod.idx.length / 3 > 400, sp + ' low detail ' + d.lod.idx.length / 3);
  assert.equal(d.lod.pos[0], -Sync.build(sp, 'fist', 'L', { wraps: w }).lod.pos[0], 'the right low-detail paw is the mirrored left');
}
// ---- the hooks: films and the story panel ask for their paws ahead
const src = f => fs.readFileSync(f, 'utf8');
assert.match(src('adventure/story/dream-scenes.js'), /pawsFor\(scene0, e, 1\);/, 'a film asks for its cast paws before its set is built');
assert.match(src('adventure/oldtown.js'), /DreamScenes\?\.prefetch\?\.\(cur\.scene \|\| cur\.id\)/, 'the story panel prefetches the coming scene');
console.log('paws phone ok', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
