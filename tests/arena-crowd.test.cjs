// Owner 2026-11-21: "the crowd is just geometric figures". Built-venue spectators are modelled animal people (rounded heads with
// muzzle, eyes and species ears; bodies with neck, shoulders, waist, bent arms with hands, bent legs with shoes; clothes in the shape;
// varied poses), three levels of detail inside each set's phone triangle budget, and still merged into the per-sector batches.
const assert = require('node:assert/strict');
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({ measureText: t => ({ width: t.length * 25 }) }, { get: (o, k) => o[k] || (() => { }) }) }) };
const sets = require('../arena-sets.js'), S = sets.spectators, tri = g => g ? g.index.count / 3 : 0;
const PERSON_MAX = 1500, SET_MAX = 57500; // per spectator at full detail; per built venue (tests/arena-sets.test.cjs keeps the hard 60,000 phone cap)

// Shape: rounded parts, not boxes. A box has 6 normal directions; the head and body must have many.
const directions = g => { const n = g.attributes.normal, seen = new Set(); for (let i = 0; i < n.count; i++) seen.add([n.getX(i), n.getY(i), n.getZ(i)].map(v => Math.round(v * 8)).join()); return seen.size; };
const slots = g => { const s = g.attributes.slot, out = new Map(); for (let i = 0; i < s.count; i++) out.set(s.getX(i), (out.get(s.getX(i)) || 0) + 1); return out; };
const box = g => { g.computeBoundingBox(); return g.boundingBox; };
assert.ok(S.species.length >= 8 && ['lion', 'rabbit', 'bear', 'wolf', 'fox', 'otter', 'deer', 'dog'].every(s => S.species.includes(s)));
assert.ok(S.outfits.includes('hoodie') && S.outfits.includes('vest') && S.outfits.includes('jacket'));
for (const p of ['crossed', 'pockets', 'fist', 'up', 'phone', 'point', 'hips', 'clap']) assert.ok(S.poses.stand.includes(p), 'standing pose ' + p);
for (const p of ['knees', 'up', 'phone']) assert.ok(S.poses.seat.includes(p), 'seated pose ' + p);
for (const species of S.species) {
  const sizes = [0, 1, 2].map(tier => tri(S.parts({ tier, species }).head));
  assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2], species + ' head detail falls with the level: ' + sizes);
  const head = S.parts({ tier: 2, species }).head, sl = slots(head);
  assert.ok(directions(head) > 60, species + ' head is rounded');
  const front = slot => { const p = head.attributes.position, s = head.attributes.slot; let z = -1; for (let i = 0; i < p.count; i++) if (s.getX(i) === slot) z = Math.max(z, p.getZ(i)); return z; };
  assert.ok(front(1) > front(0) + .01, species + ' has a muzzle in front of the skull');
  for (const s of [1, 2, 3, 15]) assert.ok(sl.get(s) > 0, `${species} head has slot ${s} (muzzle, eyes, glints, nose)`);
  assert.ok(tri(S.parts({ tier: 0, species }).head) >= 40, species + ' far head still has muzzle and ears');
}
assert.ok(box(S.parts({ species: 'rabbit' }).head).max.y > .25, 'rabbit ears stand tall');
assert.ok(box(S.parts({ species: 'lion' }).head).max.x > .15, 'lion mane frames the face');

// Bodies: separate arms and legs that bend, hands, shoes; poses move the hands where they belong; seated guests sit on a chair.
const hands = g => { const p = g.attributes.position, s = g.attributes.slot; let top = -1; for (let i = 0; i < p.count; i++) if (s.getX(i) === 0) top = Math.max(top, p.getY(i)); return top; };
for (const outfit of S.outfits) for (const tier of [0, 1, 2]) {
  const body = S.parts({ tier, outfit }).body, sl = slots(body);
  assert.ok(directions(body) > (tier ? 60 : 30), `${outfit} body at level ${tier} is rounded`);
  for (const s of [0, 8, 9]) assert.ok(sl.get(s) > 0, `${outfit}: fur (hands/neck), trousers and shoes`);
  assert.ok(sl.get(6) > 0 || sl.get(7) > 0, outfit + ' top');
}
assert.ok(slots(S.parts({ outfit: 'vest' }).body).get(14) > 0, 'hi-vis vest stripes');
assert.ok(box(S.parts({ outfit: 'hoodie' }).body).min.z < box(S.parts({ outfit: 'tee' }).body).min.z, 'hoodie hood rests on the back');
assert.ok(hands(S.parts({ pose: 'up' }).body) > 1.85 && hands(S.parts({ pose: 'idle' }).body) < 1.55, 'both arms raised vs arms down');
assert.ok(hands(S.parts({ pose: 'fist' }).body) > 1.85, 'one fist raised');
assert.ok(S.parts({ pose: 'phone' }).body.userData.phone && S.parts({ pose: 'phoneHigh' }).body.userData.phone, 'phone held in a hand');
const seated = S.parts({ seated: true }).body, standing = S.parts({}).body;
assert.ok(slots(seated).get(13) > 0 && box(seated).max.y < 1.2 && box(standing).max.y > 1.4, 'seated guest on a chair');
assert.ok(box(seated).max.z > .45, 'seated legs bend forward at the knee');

// Per-person budget: the most expensive full-detail combination stays under PERSON_MAX.
let worst = 0;
for (const species of S.species) for (const outfit of S.outfits) for (const seat of [false, true]) for (const pose of S.poses[seat ? 'seat' : 'stand']) {
  const p = S.parts({ tier: 2, species, outfit, seated: seat, pose, hat: 'hard' }); worst = Math.max(worst, tri(p.body) + tri(p.head) + tri(p.hat) + 12);
}
assert.ok(worst <= PERSON_MAX, 'worst spectator ' + worst);

// Every venue: builds, stays in budget, varied crowd, few merged meshes, deterministic.
for (const id of sets.ids) {
  const b = sets.build(id, 'en'), st = b.stats, ppl = st.people;
  assert.ok(ppl && ppl.count > 20, id + ' has spectators');
  assert.equal(ppl.tiers.reduce((a, c) => a + c, 0), ppl.count);
  assert.ok(ppl.max <= PERSON_MAX, `${id} spectator ${ppl.max}`);
  assert.ok(st.triangles <= SET_MAX, `${id} set ${st.triangles} triangles`);
  assert.ok(st.meshes <= 48, `${id} merged meshes ${st.meshes}`);
  assert.ok(Object.keys(ppl.species).length >= 6, id + ' species ' + JSON.stringify(ppl.species));
  assert.ok(Object.keys(ppl.poses).length >= 6, id + ' poses ' + JSON.stringify(ppl.poses));
  const crowd = b.sectors.flatMap(s => s.crowd); assert.ok(crowd.length > 0 && crowd.every(m => m.geometry.attributes.color), id + ' crowd stays in vertex-coloured sector batches (sway, culling)');
  const again = sets.build(id, 'en'); assert.equal(again.stats.triangles, st.triangles, id + ' deterministic'); again.dispose(); b.dispose();
  console.log(`PASS ${id}: ${ppl.count} spectators (levels ${ppl.tiers.join('/')}), ${ppl.triangles} spectator triangles, max ${ppl.max}/person, set ${st.triangles}`);
}
// The close circles (street, underground, docks) give their whole front row the full level.
for (const id of ['street', 'underground', 'docks']) assert.ok(sets.build(id, 'en').stats.people.tiers[2] >= 15, id + ' front row at full detail');
console.log(`PASS arena crowd: modelled animal spectators, worst ${worst} triangles per person, every venue <= ${SET_MAX}`);
