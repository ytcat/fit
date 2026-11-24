// Free walk across the whole town (GOTR-0118): the pure rules, the languages, the story ticket and the offline pack.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const C = require('../adventure/free-walk/free-walk-core.js');
const src = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ---- every word in EN / HE / RU, nothing single-language (owner rule 2026-11-23) */
const HE = /[֐-׿]/, RU = /[Ѐ-ӿ]/, LETTERS = /[A-Za-z]{2}/;
for (const [k, v] of Object.entries(C.COPY)) {
  for (const l of C.LANGS) assert.ok(typeof v[l] === 'string' && v[l].trim(), `${k}: ${l} missing`);
  if (LETTERS.test(v.en.replace(/WASD/g, ''))) { assert.ok(HE.test(v.he), `${k}: he is not Hebrew`); assert.ok(RU.test(v.ru), `${k}: ru is not Russian`); }
  for (const l of C.LANGS) assert.equal((v[l].match(/\{n\}/g) || []).length, (v.en.match(/\{n\}/g) || []).length, `${k}: placeholders differ in ${l}`);
}
assert.equal(C.text('he', 'metres', { n: 12 }), '12 מ׳'); assert.equal(C.text('xx', 'title'), 'Free walk'); assert.equal(C.text('ru', 'title'), 'Свободная прогулка');
// The mode never shows a literal: visible text comes from t(...) / placeName(...) (symbols only otherwise), and no RTL layout.
for (const file of ['adventure/free-walk/free-walk.js', 'adventure/free-walk/free-walk-town.js']) {
  const s = src(file);
  for (const m of s.matchAll(/\bel\('[^']*', '[^']*', '([^']*)'\)/g)) assert.ok(!/[A-Za-z֐-׿Ѐ-ӿ]/.test(m[1]), `${file}: literal text "${m[1]}"`);
  for (const m of s.matchAll(/(?:textContent|title|label)\s*=\s*'([^']*)'/g)) assert.ok(!/[A-Za-z֐-׿Ѐ-ӿ]/.test(m[1]), `${file}: literal text "${m[1]}"`);
  for (const m of s.matchAll(/setAttribute\('aria-label', '([^']*)'\)/g)) assert.fail(`${file}: literal aria-label "${m[1]}"`);
  assert.ok(!/dir\s*=\s*['"]rtl|\.dir\s*=\s*[^;]*rtl|direction\s*=\s*['"]rtl/.test(s), `${file}: no right-to-left layout`);
  assert.ok(!HE.test(s) && !RU.test(s), `${file}: language text lives in free-walk-core.js only`);
}
assert.ok(/direction:ltr/.test(src('adventure/free-walk/free-walk.css')) && !/inset-inline|margin-inline|padding-inline/.test(src('adventure/free-walk/free-walk.css')), 'free walk layout is left-to-right in every language');
// The town's signs read in every language: each sign text of the map has a Hebrew and a Russian version.
{ const map = src('adventure/gloryland-map.js'), texts = new Set([...map.matchAll(/sign\(W, \{ text: '([^']+)'/g)].map(m => m[1]));
  for (const m of map.matchAll(/\['([A-Z0-9 ]+)', '([A-Z0-9 ]+)', '#/g)) { texts.add(m[1]); texts.add(m[2]); }
  global.THREE = require('../assets/vendor/three.min.js'); global.window = global; require('../adventure/gloryland-map.js');
  const T = globalThis.GlorylandMap.SIGN_TEXT; assert.ok(texts.size >= 20, 'sign texts found');
  for (const t of texts) { assert.ok(HE.test(T.he[t] || ''), `sign ${t}: he`); assert.ok(RU.test(T.ru[t] || '') || /^[0-9 /]+$/.test(T.ru[t] || 'x'), `sign ${t}: ru`); } }
// The old standalone page only forwards into the game: no hard-coded language or direction, no text of its own.
{ const page = src('chapter1-roam.html'); assert.ok(!/dir="rtl"|lang="he"/.test(page) && !HE.test(page) && !RU.test(page), 'chapter1-roam.html is language-neutral'); assert.match(page, /index\.html#free-walk/); }

/* ---- the walkable town: a height field joined to the streets; roofs, walls and the sea are not walkable */
{
  const nx = 40, nz = 20, h = new Float32Array(nx * nz).fill(1.2);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (i >= 10 && i < 20 && j >= 5 && j < 15) h[j * nx + i] = 12;        // a building
    if (i >= 22 && i < 30 && j >= 5 && j < 15) h[j * nx + i] = 1.35;      // a pavement 15 cm up (walkable)
    if (j >= 18) h[j * nx + i] = -.5;                                     // the sea
    if (i >= 32 && i < 36 && j >= 2 && j < 6) h[j * nx + i] = 1.2 + .25 * (i - 31); // a steep step up: 25 cm a cell is still a ramp
  }
  const walk = C.walkGrid(h, nx, nz, { step: .32, sea: .15, seeds: [1 * nx + 1], erode: 1 });
  const at = (i, j) => walk[j * nx + i];
  assert.equal(at(14, 9), 0, 'roof not walkable'); assert.equal(at(25, 9), 1, 'pavement walkable'); assert.equal(at(5, 19), 0, 'sea not walkable');
  assert.equal(at(9, 9), 0, 'one cell off the wall (body radius)'); assert.equal(at(5, 5), 1);
  const g = C.grid({ x0: 0, z0: 0, cell: .5, nx, nz, heights: h, walk });
  const s = { x: 2, z: 4.6, ry: 0, dist: 0 };
  for (let k = 0; k < 120; k++) g.move(s, 2.2, 0, 1 / 30);                 // walk east into the building: stops before it
  assert.ok(s.x < 5 && g.allowed(s.x, s.z), 'stops at the wall'); assert.ok(s.dist > 2);
  const s2 = { x: 2, z: 2, ry: 0, dist: 0 }; for (let k = 0; k < 400; k++) g.move(s2, 2.2, 2.2, 1 / 30);
  assert.ok(g.allowed(s2.x, s2.z), 'never leaves the walkable grid (slides along walls)');
  assert.ok(Math.abs(g.height(12.6, 4.6) - 1.35) < .01 && Math.abs(g.height(4, 4) - 1.2) < 1e-5);
  assert.ok(g.top(7, 4.5) === 12, 'the camera sees roofs');
  const n = g.nearest(7, 4.6); assert.ok(n && g.allowed(n.x, n.z));
  // a car footprint never traps the body: from inside it the body steps out; from outside it does not walk in
  const car = (x, z) => Math.abs(x - 3) < 1 && Math.abs(z - 3) < 1, inCar = { x: 3, z: 3, ry: 0, dist: 0 };
  for (let k = 0; k < 30; k++) g.move(inCar, 2, 0, 1 / 30, car); assert.ok(inCar.x > 4, 'steps out of a car footprint');
  const atCar = { x: 1.5, z: 3, ry: 0, dist: 0 }; for (let k = 0; k < 30; k++) g.move(atCar, 2, 0, 1 / 30, car); assert.ok(atCar.x <= 2, 'does not walk into a car');
  // a pocket closed by posts is dropped
  const w2 = Uint8Array.from(walk); C.blockDiscs(w2, { x0: 0, z0: 0, cell: .5, nx, nz }, [[2.5, 1.5, .9]]); w2[3 * nx + 5] = 1;
  const dropped = C.keepConnected(w2, nx, nz, [12 * nx + 2]); assert.ok(dropped >= 1 && w2[3 * nx + 5] === 0, 'enclosed cell dropped');
  // the stick is camera-relative: forward goes away from the camera
  const [vx, vz] = C.velocity(0, 1, 0, 2); assert.ok(Math.abs(vx) < 1e-9 && Math.abs(vz + 2) < 1e-9);
  const [rx, rz] = C.velocity(1, 0, Math.PI / 2, 2); assert.ok(Math.abs(rx) < 1e-9 && Math.abs(rz + 2) < 1e-9);
  // the walk's own save: any broken or old value falls back to a place; never the game save's key
  assert.ok(C.saveKey('p1').startsWith('gotr.freewalk.v1.') && C.saveKey('p1') !== C.LEGACY_KEY);
  for (const raw of [null, '', '{', '{"x":"a"}', '{"x":1e9,"z":1}', '[]']) { const r = C.restore(raw, g, { x: 3, z: 3, ry: 1 }); assert.equal(r.restored, false); assert.equal(r.x, 3); }
  const ok = C.restore(C.serialize({ x: 4, z: 4, ry: 7 }), g, { x: 3, z: 3 }); assert.ok(ok.restored && ok.x === 4 && Math.abs(ok.ry - (7 - 2 * Math.PI)) < 1e-3);
  assert.equal(C.legacyPlace('{"id":"otto","x":1,"z":2}'), 'otto'); assert.equal(C.legacyPlace('{"id":"docks"}'), 'docks_quay'); assert.equal(C.legacyPlace('x'), null);
}
/* ---- districts */
assert.equal(C.district(16, 0, [{ id: 'a', x: 0, z: 0, r: 30 }, { id: 'b', x: 25, z: 0, r: 30 }]).id, 'b');
assert.equal(C.district(100, 0, [{ id: 'a', x: 0, z: 0, r: 30 }]), null);

/* ---- traffic: a car always stops before a person in its lane, and goes on when the way is clear */
{
  for (const stand of [6, 12, 30, 60]) {
    const car = { s: 0, speed: 7.5, cruise: 7.5 }; let minGap = Infinity;
    for (let k = 0; k < 600; k++) { C.carStep(car, 1 / 30, { u: stand, v: .3 }); minGap = Math.min(minGap, stand - car.s); assert.ok(!C.carHits(car, stand, .3), `car hits a person standing ${stand} m ahead`); }
    assert.equal(car.speed, 0, 'stopped'); assert.ok(minGap > C.CAR.halfLen, 'stops before the person');
  }
  const car = { s: 0, speed: 0, cruise: 7 }; for (let k = 0; k < 300; k++) C.carStep(car, 1 / 30, null); assert.ok(car.speed > 6 && car.s > 20, 'clear road: drives');
  const side = { s: 0, speed: 7, cruise: 7 }; for (let k = 0; k < 60; k++) C.carStep(side, 1 / 30, { u: 15, v: 4 }); assert.ok(side.s > 10, 'a person on the pavement does not stop it');
  const queue = { s: 0, speed: 7, cruise: 7 }; for (let k = 0; k < 300; k++) C.carStep(queue, 1 / 30, null, 20 - queue.s); assert.ok(queue.s < 20 - 2 * C.CAR.halfLen, 'keeps behind the car in front');
  const g = C.roadGraph([{ a: [0, 0], b: [50, 0], w: 9 }, { a: [50, 0], b: [50, 40], w: 9 }, { a: [50.5, .5], b: [100, 0], w: 9 }], 2);
  assert.equal(g.nodes.length, 4); assert.equal(g.edges.length, 3);
  const n = C.nextEdge(g, 0, 1, () => .1); assert.ok(n.e !== 0 && n.dir === 1, 'turns into a street leaving the crossing');
  assert.deepEqual(C.nextEdge(g, 1, 1, () => .5), { e: 1, dir: -1 }, 'a dead end turns back');
  const pose = C.lanePose(g, 0, 1, 10); assert.ok(pose.z > 0 && Math.abs(pose.x - 10) < 1e-9, 'right-hand lane');
}

/* ---- the story walk ticket: deliberate marker + physical entry -> that step once, through the quest action */
{
  let now = 1000, live = { profile: 'p1', step: 'market_robber', target: 'market_stall', boss: false }, broken = false; const store = new Map();
  const storage = () => { if (broken) throw Error('no storage'); return { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) }; };
  const N1 = 'a'.repeat(32); let nonce = N1;
  const W = C.storyWalk(storage, () => now, () => nonce, () => live);
  assert.equal(W.consume(N1), null, 'nothing armed: nothing starts');
  assert.equal(W.arm('otto'), null, 'another place: no ticket');
  live = { ...live, boss: true }; assert.equal(W.arm('market_stall'), null, 'a boss is never started by walking'); live = { ...live, boss: false };
  const t = W.arm('market_stall'); assert.equal(t.step, 'market_robber');
  assert.equal(W.entered(null, 2), false, 'spawning inside the ring is not an entry'); assert.equal(W.entered(3, 2), false); assert.equal(W.entered(6, 3.9), true); assert.equal(W.entered(3.9, 3), false, 'staying inside is not a second entry');
  assert.equal(W.consume('b'.repeat(32)), null, 'another run\'s nonce');
  assert.equal(W.consume(N1).step, 'market_robber', 'one launch'); assert.equal(W.consume(N1), null, 'never twice');
  W.arm('market_stall'); W.cancel(N1); assert.equal(W.consume(N1), null, 'marker changed: cancelled');
  W.arm('market_stall'); live = { ...live, step: 'buy_heavy_bag', target: 'otto' }; assert.equal(W.consume(N1), null, 'the story moved on: no launch'); live = { profile: 'p1', step: 'market_robber', target: 'market_stall', boss: false };
  W.arm('market_stall'); live = { ...live, profile: 'p2' }; assert.equal(W.consume(N1), null, 'another profile'); live = { ...live, profile: 'p1' };
  W.arm('market_stall'); now += 31 * 60 * 1000; assert.equal(W.consume(N1), null, 'expired');
  live = null; assert.equal(W.arm('market_stall'), null, 'a locked step never arms');
  broken = true; assert.equal(W.arm('market_stall'), null); assert.equal(W.consume(N1), null); broken = false;
  // the mode wires it: a marker change re-arms or cancels, entry consumes, the map launches through AdventureOldTown.start only after a live re-check
  const fw = src('adventure/free-walk/free-walk.js'), ui = src('adventure/adventure-ui.js');
  assert.match(fw, /tickets\(\)\.entered\(R\.prevD, straight\)/); assert.match(fw, /tickets\(\)\.consume\(R\.ticket\.nonce\)/);
  assert.match(fw, /arm\(STORY_IDS\.includes\(R\.destination\) \? R\.destination : null\)/);
  assert.match(ui, /story: ticket => alive && !window\.StoryScenes\?\.playing && !window\.app\?\.engine\?\.fightIQDemo && !!window\.FreeWalk\?\.tickets\?\.\(\)\.still\(ticket\) && !!window\.AdventureOldTown\?\.start && \(window\.AdventureOldTown\.start\(ctx, ticket\.step\), true\)/);
  assert.ok(!/gameAction|recordStory|devSkip/.test(fw), 'the walk never writes the game save itself');
}

/* ---- in the game and offline */
{
  const html = src('index.html'), manifest = JSON.parse(src('offline-manifest.json')).urls.map(u => u.split('?')[0]);
  for (const f of ['free-walk-core.js', 'free-walk-town.js', 'free-walk.js', 'free-walk.css']) {
    assert.ok(html.includes('./adventure/free-walk/' + f + '?v='), f + ' loads in the game'); assert.ok(manifest.includes('./adventure/free-walk/' + f), f + ' is in the offline pack');
  }
  assert.ok(manifest.includes('./adventure/gloryland-map.js') && manifest.includes('./adventure/story/street-life.js'));
}
console.log('free-walk: ok');
