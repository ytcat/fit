// node tests/dream-scenes.test.cjs — Chapter 1 "The Dream" slice 1 (GOTR-0078): scene scripts, hooks, cast, outfits, walk.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
const G = require('../glossary.js'), C = require('../adventure/story/dream-core.js');
for (const f of ['boxing-routines.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/story-cast.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'));
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} != ${b}`);

// ---- scene scripts
assert.deepEqual(C.ids, ['dream_opening', 'dream_gym_talk', 'dream_after_brick'], 'the three hook ids');
const all = [...C.ids.map(id => [id, C.scenes[id]]), ['dream_after_brick win', C.variant('dream_after_brick', 'win')]];
for (const [id, s] of all) {
  assert.deepEqual(C.validate(s), [], id + ' script is valid');
  assert.equal(C.sample(s, 0).done, false); assert.equal(C.sample(s, s.duration + 5).done, true, id + ' ends');
  for (const l of s.lines) { assert.ok(l.text.en.length <= 56, id + ' line is short: ' + l.text.en); for (const lang of ['he', 'ru']) assert.ok(!/[A-Za-z]/.test(G.strip(l.text[lang])), id + ' ' + lang + ' untranslated: ' + l.text[lang]); }
  for (let t = 0; t <= s.duration; t += .25) { const f = C.sample(s, t); assert.ok(f.camera.pos.every(Number.isFinite) && f.camera.look.every(Number.isFinite), id + ' camera at ' + t); for (const a of Object.values(f.actors)) assert.ok([a.x, a.y, a.z, a.ry, a.dist].every(Number.isFinite), id + ' actor at ' + t); }
}
assert.equal(C.variant('dream_after_brick').outcome, 'loss', 'the loss is the default story'); assert.equal(C.variant('dream_after_brick', 'win').outcome, 'win');
{ const loss = C.variant('dream_after_brick', 'loss').lines.map(l => l.text.en).join(' '), win = C.variant('dream_after_brick', 'win').lines; // GOTR-0084 wording
  assert.ok(/kept getting up/.test(loss) && /You clean, run errands/.test(loss) && /Deal! When do we start/.test(loss) && /Mop's over there/.test(loss), 'the job offer after a loss');
  assert.ok(win[0].who === 'brick' && /rematch/.test(win[0].text.en) && win.some(l => /You clean, run errands/.test(l.text.en)), 'the same deal after a win; Brick wants a rematch'); }
const talk = C.scenes.dream_gym_talk, said = talk.lines.map(l => l.text.en).join(' ');
for (const w of [/Are you Bruno/, /off the bus/, /become a champion/, /money for training/, /whatever it takes/, /The best started here/, /Talk is free/, /glove up/, /won't last a minute/]) assert.ok(w.test(said), 'beat 1 says ' + w); // GOTR-0084
assert.equal(talk.tap, true); assert.ok(talk.lines.filter(l => l.hold).length >= 8, 'tap to advance');
assert.equal(C.sample(talk, 43).actors.brick.walking, false); assert.ok(Math.hypot(C.sample(talk, 43).actors.brick.x - C.sample(talk, 43).actors.fighter.x, 0) < 3.5, 'Brick has stepped forward');
// opening film: the bus arrives and stops, the doors open, he steps down, walks, ends at the gym door; cuts are counted
const film = C.scenes.dream_opening; assert.equal(film.set, 'dream_street'); assert.equal(film.intro, 'map'); assert.equal(film.outfit.fighter, 'street'); assert.equal(film.lines.length, 0, 'no text in the film');
assert.ok(C.sample(film, 0).props.bus[0] < -50 && Math.abs(C.sample(film, 8).props.bus[0] + 1) < 1e-6 && C.sample(film, 16).props.bus[0] > 60, 'the bus pulls in, stops, leaves');
assert.equal(C.sample(film, 6).props.doors[0], 0); assert.equal(C.sample(film, 8).props.doors[0], 1);
assert.equal(C.sample(film, 5).actors.fighter.act, 'off'); near(C.sample(film, 7.5).actors.fighter.y, .26, 1e-9, 'on the bus floor'); near(C.sample(film, 9).actors.fighter.y, 0, 1e-9, 'on the pavement');
const end = C.sample(film, film.duration).actors.fighter; near(end.x, C.places.GYM[0], .6, 'at the gym door'); near(end.z, C.places.GYM[1], .6, 'at the gym door');
assert.equal(C.sample(film, film.duration).camera.shot, 6, 'seven shots'); assert.equal(C.sample(film, 9.59).camera.shot, 0); assert.equal(C.sample(film, 9.6).camera.shot, 1, 'a cut jumps');
for (let t = 15.7; t < 29.3; t += .3) { const a = C.sample(film, t).actors.fighter; if (a.walking) assert.ok(a.speed > .9 && a.speed < 1.6, 'walking pace at ' + t.toFixed(1) + ': ' + a.speed.toFixed(2)); }
let d0 = -1; for (let t = 0; t <= film.duration; t += .05) { const d = C.sample(film, t).actors.fighter.dist; assert.ok(d >= d0 - 1e-9, 'distance never runs back'); d0 = d; }

// ---- hooks wired into the page and the scene player
const html = fs.readFileSync('index.html', 'utf8'), manifest = fs.readFileSync('offline-manifest.json', 'utf8');
for (const f of ['dream-core.js', 'story-cast.js', 'dream-pose.js', 'dream-sets.js', 'dream-scenes.js', 'dream.css']) { assert.ok(html.includes('./adventure/story/' + f + '?v='), f + ' is loaded with a version tag'); assert.ok(manifest.includes('adventure/story/' + f), f + ' is cached offline'); }
assert.ok(html.indexOf('story-scenes.js') < html.indexOf('dream-core.js') && html.indexOf('story-cast.js') < html.indexOf('dream-scenes.js'), 'load order');
const player = fs.readFileSync('adventure/story/story-scenes.js', 'utf8'); assert.ok(/DreamScenes\?\.has\(id\)\) return window\.DreamScenes\.play\(id, opts\)/.test(player), 'StoryScenes.play forwards the dream ids');
const hooks = fs.readFileSync('docs/adventure/DREAM_HOOKS.md', 'utf8'); for (const w of ['dream_opening', 'dream_gym_talk', 'dream_after_brick', 'StoryCast.outfit', 'StoryCast.asOpponent', "'bruno'", "'brick'"]) assert.ok(hooks.includes(w), 'hooks doc names ' + w);

// ---- cast: both new characters build on the rig and animate (boxing moves for Brick)
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
assert.deepEqual(StoryCast.ids, ['bruno', 'brick']);
const tris = c => { let n = 0, m = 0; c.root.traverse(o => { let v = o.visible, q = o; while (v && q.parent && q !== c.root) { q = q.parent; v = q.visible; } if (o.isMesh && v) { m++; n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { meshes: m, triangles: Math.round(n) }; };
const finite = c => { const p = c.skin.geometry.attributes.position.array, n = c.skin.geometry.attributes.normal.array; for (let i = 0; i < p.length; i += 97) assert.ok(Number.isFinite(p[i]) && Number.isFinite(n[i]), 'finite skin'); };
for (const id of StoryCast.ids) {
  const c = StoryCast.rig(id, engine); assert.ok(c && c.character === id && c.species === 'lion', id + ' builds'); assert.equal(StoryCast.rig(id, engine), c, 'cached'); finite(c);
  for (const lang of ['en', 'he', 'ru']) assert.ok(StoryCast.names[id][lang]);
  const m = DreamPose.civil(c, { t: 1, dist: 0 }); assert.ok(m.handErrors.every(x => x < .02), id + ' stands with relaxed arms');
  console.log(id, JSON.stringify(tris(c)));
}
const brick = StoryCast.rig('brick', engine), bruno = StoryCast.rig('bruno', engine);
for (const move of ['jab', 'cross', 'hook', 'uppercut', 'slip', 'roll']) for (let i = 0; i <= 12; i++) { const m = brick.update(i * .1, move, 'one_two'); assert.ok(m.handErrors.every(x => x < .001) && m.hands.every(p => p.every(Number.isFinite)), 'Brick boxes: ' + move); }
assert.ok(brick.gloveMeshes.L.visible && brick.shorts.visible, 'Brick wears gloves and trunks'); assert.ok(!bruno.gloveMeshes.L.visible && !bruno.shorts.visible, 'Bruno wears no kit');
const width = (c, y0, y1) => { const P = c.skin.geometry.attributes.position; let w = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.abs(P.getX(i)) < .3) w = Math.max(w, Math.abs(P.getX(i))); } return w; };
const lion = new LionCoach(data, { species: 'lion' });
assert.ok(width(brick, 1.18, 1.22) > width(lion, 1.18, 1.22) * 1.1, 'Brick is stockier than the lion'); assert.ok(width(brick, 2.0, 2.1) > width(lion, 2.0, 2.1) * 1.15, 'bulldog skull is wider');
// Brick as the fight Opponent: takes the partner slot, restore() frees it
const restore = StoryCast.asOpponent(engine, 'brick'); assert.equal(engine.arena.castOpponent, brick); restore(); assert.equal(engine.arena.castOpponent, null);
assert.ok(/this\.castOpponent/.test(fs.readFileSync('training-arena.js', 'utf8')), 'the arena honours the cast Opponent');

// ---- outfits: street clothes on both species, and the kit comes back exactly
for (const species of ['lion', 'rabbit']) {
  const c = species === 'lion' ? lion : new LionCoach(data, { species }), g = c.skin.geometry, kit = StoryCast.kitParts(c);
  const snap = () => ({ attrs: ['position', 'normal', 'color', 'avatarMass'].map(k => g.attributes[k]), vis: Object.values(kit).flat().map(o => o.visible), sum: g.attributes.position.array.reduce((n, v, i) => i % 53 ? n : n + v, 0) });
  const before = snap(), t0 = tris(c);
  assert.equal(StoryCast.outfitOf(c), 'kit'); assert.equal(StoryCast.outfit(c, 'nonsense'), false);
  assert.equal(StoryCast.outfit(c, 'street'), true); assert.equal(StoryCast.outfitOf(c), 'street'); finite(c);
  assert.ok(!c.gloveMeshes.L.visible && !c.gloveMeshes.R.visible && !c.shorts.visible, species + ': no gloves or trunks in street clothes');
  assert.ok(g.attributes.position !== before.attrs[0], 'street streams are in use'); assert.ok(width(c, 1.18, 1.22) > width({ skin: { geometry: { attributes: { position: before.attrs[0] } } } }, 1.18, 1.22) + .03, species + ': the hoodie hangs loose over the waist');
  StoryCast.bag(c, 'shoulder'); assert.ok(c.storyCast.bag.visible, 'bag on the shoulder'); const t1 = tris(c);
  DreamPose.civil(c, { t: 0, dist: 0, arms: { R: 'strap' } });
  assert.equal(StoryCast.outfit(c, 'kit'), true); const after = snap();
  assert.ok(after.attrs.every((a, i) => a === before.attrs[i]), species + ': the kit streams are back'); assert.deepEqual(after.vis, before.vis, species + ': every kit part is visible again'); assert.equal(after.sum, before.sum, species + ': the body is untouched');
  assert.ok(!c.storyCast.bag.visible, 'bag off with the kit'); assert.deepEqual(tris(c), t0, species + ': same draw list as before');
  StoryCast.outfit(c, 'street'); StoryCast.outfit(c, 'kit'); assert.deepEqual(snap().vis, before.vis, 'twice');
  console.log(species, 'kit', JSON.stringify(t0), 'street+bag', JSON.stringify(t1));
  if (species === 'lion') {
    // ---- walk cycle: a planted foot stays on its spot while the body travels (no sliding), and each foot lifts in its swing
    StoryCast.outfit(c, 'street'); let worst = 0, lift = 0; const hold = {};
    for (let i = 0; i <= 400; i++) {
      const dist = i * .01; c.root.position.set(0, 0, dist); c.root.rotation.set(0, 0, 0); DreamPose.civil(c, { t: i * .008, dist, walk: 1 });
      const balls = DreamPose.feet(c);
      ['L', 'R'].forEach((s, k) => { const p = (dist / DreamPose.STRIDE + (k ? .5 : 0)) % 1, planted = p > .2 * DreamPose.DUTY && p < .6 * DreamPose.DUTY; if (planted) { if (hold[s]) worst = Math.max(worst, Math.hypot(balls[k][0] - hold[s][0], balls[k][2] - hold[s][2])); else hold[s] = balls[k]; } else hold[s] = null; lift = Math.max(lift, balls[k][1]); });
    }
    console.log('walk: worst slide of a planted foot (m)', worst.toFixed(4), 'highest foot lift (m)', lift.toFixed(3));
    assert.ok(worst < .02, 'planted foot slides ' + worst); assert.ok(lift > .05, 'feet lift in the swing');
    StoryCast.outfit(c, 'kit');
  }
}
console.log('dream scenes ok');

// ---- owner's clothes rule: kit and gloves only in the gym and the ring; outside a fight people stand like people
{
  const S = require('../adventure/story/story-core.js'), src = fs.readFileSync('adventure/story/story-scenes.js', 'utf8');
  const games = [...src.matchAll(/\n    (\w+): \{\n      set: '(\w+)', roles:/g)].map(m => [m[1], { set: m[2] }]);
  assert.ok(games.length >= 5, 'trials found'); assert.ok(/StoryCast\.outfit\(c, wear/.test(src) && /C\.outfitFor\(placeKind\)/.test(src), 'the player dresses every rig for the place');
  const everything = [...Object.entries(S.scenes), ...games, ...all];
  const fighter = new LionCoach(data, { species: 'lion' }), other = new LionCoach(data, { species: 'rabbit' });
  for (const [id, sc] of everything) {
    const place = sc.place || S.placeOf(sc), wear = S.outfitFor(place); assert.ok(S.PLACES.includes(place), id + ' has a place: ' + place);
    if (['gym', 'ring'].includes(place)) { assert.equal(wear, 'kit'); continue; }
    assert.notEqual(wear, 'kit', id + ' (' + place + '): no boxing kit');
    for (const c of [fighter, other]) {
      assert.equal(StoryCast.outfit(c, wear, { tint: '#8f2f22' }), true); assert.notEqual(StoryCast.outfitOf(c), 'kit', id + ': dressed for the ' + place);
      assert.ok(!c.gloveMeshes.L.visible && !c.gloveMeshes.R.visible && !c.shorts.visible, id + ': no gloves or trunks on the ' + place);
    }
    // nobody stands in the guard or punches in a scene that has no fight (scene.fight marks the three that do)
    for (const [who, a] of Object.entries(sc.actors || {})) a.keys.forEach(k => { if (S.FIGHT_ACTS.includes(k.act)) assert.ok(sc.fight === true, id + ': ' + who + ' is in a fight act (' + k.act + ') in a scene without a fight'); });
  }
  for (const c of [fighter, other]) for (const wear of ['street', 'track_wraps']) {
    StoryCast.outfit(c, wear); const m = DreamPose.civil(c, { t: 2, dist: 0 });
    assert.ok(m.hands.every(h => h[1] < 1.2), wear + ': relaxed hands hang below the chest (not the guard): ' + m.hands.map(h => h[1].toFixed(2)));
    const g = c.update(2, 'guard', 'one_two', { guardCover: 1 }); assert.ok(g.hands.every(h => h[1] > 1.4), 'the guard is at the chin, for contrast');
    StoryCast.outfit(c, 'kit'); assert.ok(c.gloveMeshes.L.visible && c.shorts.visible, 'kit back');
  }
  assert.ok(/everyday\(c, a, t, o\)/.test(src) && /FIGHT_ACTS/.test(src), 'the player poses non-fight acts with everyday body language');
  for (const f of fs.readdirSync('adventure/story').filter(f => f.endsWith('.js'))) new vm.Script(fs.readFileSync('adventure/story/' + f, 'utf8'), { filename: f }); // every story script parses
  console.log('clothes rule ok:', everything.length, 'scenes and trials');
}

// ---- motion outside a fight: no guard leaking into walks, trial intros or idles; the arms swing against the legs
{
  const src = fs.readFileSync('adventure/story/story-scenes.js', 'utf8');
  assert.ok(/if \(everyday\(c, a, t, o\)\) return/.test(src), 'every non-fight act goes through the everyday pose first');
  assert.ok(/act: hot \? 'guard' : 'idle'/.test(src) && !/pose\(f, \{ act: 'guard', walking/.test(src), 'trials: the guard comes up only in the fight moment; the chase is a walk');
  const c = new LionCoach(data, { species: 'lion' }); StoryCast.outfit(c, 'street');
  let opposite = 0, n = 0, maxHand = 0;
  for (let i = 0; i < 116; i++) { const dist = i * .01, m = DreamPose.civil(c, { t: i * .008, dist, walk: 1 }), footL = c.point(c.joints.footL).z, handL = m.hands[0][2] - .055; maxHand = Math.max(maxHand, m.hands[0][1], m.hands[1][1]); if (Math.abs(footL) > .12) { n++; if (Math.sign(footL) !== Math.sign(handL)) opposite++; } }
  assert.ok(opposite / n > .85, 'the arm swings against its leg: ' + opposite + '/' + n); assert.ok(maxHand < 1.15, 'hands stay low while walking: ' + maxHand.toFixed(2));
  DreamPose.reset(c); const a = DreamPose.civil(c, { t: 1, dist: 0 }), b = DreamPose.civil(c, { t: 5, dist: 0 }); assert.ok(a.hands.every(h => h[1] < 1.1) && b.hands.every(h => h[1] < 1.1), 'idle: arms down');
  const y1 = c.joints.head.rotation.y; DreamPose.civil(c, { t: 9, dist: 0 }); assert.notEqual(c.joints.head.rotation.y, y1, 'idle: the head glances around');
  console.log('motion ok');
}
