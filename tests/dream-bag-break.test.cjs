// node tests/dream-bag-break.test.cjs — GOTR-0087, Chapter 1 beat 4: the big Cross breaks the old bag's chain and the bag falls.
// Pure part (script, physics, gym state hook) in node; wiring checked in the sources; the film itself in the browser
// (plays once when night_bag is first finished, Skip, rig handed back, bag on the floor afterwards) when Playwright exists.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
process.chdir(path.join(__dirname, '..'));
const C = require('../adventure/story/bag-break-core.js'), G = require('../glossary.js');

// ---- the script
const s = C.scene; assert.deepEqual(C.validate(), [], 'scene is valid'); assert.equal(s.id, 'dream_bag_break');
assert.ok(s.duration >= 12 && s.duration <= 16, 'about 12-16 s: ' + s.duration);
assert.equal(s.set, 'dream_gym'); assert.equal(s.outfit.fighter, 'kit', 'gym = boxing kit and gloves');
assert.equal(s.lines.length, 1, 'one subtitle line'); const line = s.lines[0];
assert.ok(/Bruno's going to kill me/.test(line.text.en)); for (const g of ['he', 'ru']) assert.ok(line.text[g] && !/[A-Za-z]/.test(G.strip(line.text[g]).replace(/Bruno/g, '')), g + ' translated');
assert.deepEqual(C.MOVES.map(m => m.move), ['jab', 'cross', 'cross'], 'Jab-Cross to load up, then the big rear-hand Cross'); assert.ok(C.BIG.big && C.BIG.move === 'cross');
assert.ok(C.wallOf(C.BIG.hit + .3) - C.wallOf(C.BIG.hit) > 1.2, 'slow motion at the impact');
for (let t = 0; t <= s.duration; t += .1) assert.ok(Math.abs(C.wallOf(C.warp(t)) - t) < 1e-3, 'warp is invertible at ' + t.toFixed(1));
assert.equal(C.fighterAt(C.BIG.hit).act, 'punch'); assert.equal(C.fighterAt(C.REACT + .1).act, 'react');
assert.ok(line.t > C.wallOf(C.REACT), 'the line comes in the reaction');

// ---- physics: real pendulum, snap, free flight, lands on its end, one bounce, tips over, rolls a little, rests on the floor
const T = C.track(), ev = T.events, B = C.BAG;
assert.ok(ev.snap > C.BIG.hit && ev.snap < C.BIG.hit + .45, 'the chain snaps just after the big Cross');
assert.ok(C.sample(C.MOVES[1].hit + .3).bag.s > .05, 'the small punches swing the bag'); assert.equal(C.sample(C.MOVES[1].hit + .3).snapped, false, 'but do not break it');
const swingUp = C.sample(ev.snap).bag; assert.ok(swingUp.y > B.cy, 'the bag swings up and away before it drops: y ' + swingUp.y.toFixed(3));
let peak = 0; for (let t = ev.snap; t < ev.snap + .3; t += .01) peak = Math.max(peak, C.sample(t).bag.y); assert.ok(peak >= swingUp.y);
const first = ev.floor[0]; assert.ok(first && !first.flat && first.speed > 3, 'first floor contact is on the bag\'s end, hard');
assert.ok(ev.floor.length >= 2 && ev.floor.length <= 8, 'bounces: ' + ev.floor.length);
let up = 0, prevVy = 0, prevY = C.sample(first.t).bag.y; for (let t = first.t; t < ev.flat; t += 1 / 120) { const y = C.sample(t).bag.y, vy = y - prevY; if (prevVy <= 0 && vy > 0) up++; prevVy = vy; prevY = y; }
assert.ok(up >= 1, 'it bounces after the first contact');
assert.ok(ev.flat > first.t && ev.rest > ev.flat, 'lands on its end, then tips over, then comes to rest');
const end = C.rest().bag; assert.ok(Math.abs(Math.abs(end.th) - Math.PI / 2) < 1e-6, 'lying on its side'); assert.ok(Math.abs(end.y - B.r) < 1e-6, 'resting on the floor (centre at the radius)');
assert.ok(end.s > 1 && end.s < 4, 'it fell away from the mount: ' + end.s.toFixed(2)); assert.ok(Math.abs(end.roll) > .2 && Math.abs(end.w) < .6, 'rolled a little');
const restSample = C.sample(ev.rest + .2).bag, later = C.sample(C.SIM_END).bag; for (const k of ['s', 'y', 'th', 'w']) assert.ok(Math.abs(restSample[k] - later[k]) < .02, 'still after rest: ' + k);
for (let t = 0; t <= C.SIM_END; t += .02) { const f = C.sample(t); assert.ok(Object.values(f.bag).every(Number.isFinite), 'finite bag ' + t); assert.equal(f.links.length, B.links, 'all links every frame'); for (const l of f.links) { assert.ok(l.p.every(Number.isFinite) && l.d.every(Number.isFinite)); assert.ok(l.p[1] > -.001, 'links never under the floor'); } if (f.snapped) { const lowest = Math.min(...[[-B.r, -B.h], [B.r, -B.h], [-B.r, B.h], [B.r, B.h]].map(([lx, ly]) => f.bag.y + lx * Math.sin(f.bag.th) + ly * Math.cos(f.bag.th))); assert.ok(lowest > -.06, 'the bag does not sink into the floor at ' + t.toFixed(2) + ': ' + lowest.toFixed(3)); } }
const fin = C.sample(C.SIM_END); const top = fin.links.slice(0, B.keep); assert.ok(top.every(l => l.p[1] > B.mount - B.keep * B.pitch - .05), 'the broken chain stays on the mount');
assert.ok(fin.links.slice(B.keep, B.keep + B.fly).every(l => l.p[1] < .05), 'the flying links lie on the floor');
assert.ok(Math.abs(C.sample(ev.snap + 1).lamp[0]) > Math.abs(C.sample(ev.snap - .5).lamp[0]), 'the lamp sways after the jolt');

// ---- the state hook: hanging -> broken (night_bag done) -> new (bag bought)
assert.equal(C.gymState(null), 'hanging'); assert.equal(C.gymState({ adventure: { missions: {}, story: { done: [] } } }), 'hanging');
assert.equal(C.gymState({ adventure: { missions: { night_bag: { stars: 1 } }, story: { done: [] } } }), 'broken');
assert.equal(C.gymState({ adventure: { missions: { night_bag: { stars: 2 } }, story: { done: ['buy_heavy_bag'] } } }), 'new');

// ---- wiring in the game
const html = fs.readFileSync('index.html', 'utf8'), manifest = fs.readFileSync('offline-manifest.json', 'utf8');
for (const f of ['bag-break-core.js', 'bag-break.js']) { assert.ok(html.includes('./adventure/story/' + f + '?v='), f + ' loads'); assert.ok(manifest.includes('adventure/story/' + f), f + ' cached offline'); }
assert.ok(html.indexOf('bag-break.js') < html.indexOf('dream-sets.js') && html.indexOf('dream-pose.js') < html.indexOf('bag-break.js'), 'load order');
const ot = fs.readFileSync('adventure/oldtown.js', 'utf8'), film = fs.readFileSync('adventure/story/bag-break.js', 'utf8');
assert.ok(/night_bag: \{[^\n]*after: 'dream_bag_break'/.test(ot), 'night_bag ends with the film');
assert.ok(/first = !!film && at\?\.stars > 0 && !snaps\[id\]\?\.done/.test(ot), 'only the first time the step is finished');
assert.ok(/Watch the scene/.test(ot), 'replayable from the step');
assert.ok(/scene\.add\(c\.root\);[^\n]*c\.root\.scale\.set\(-1, 1, 1\)/.test(film), 'the borrowed rig keeps the mirrored root (GOTR-0074/0085)');
assert.ok(/Cast\(\)\.outfit\(c, 'kit'\)/.test(film) && /giveBack\(borrowed\)/.test(film), 'outfit and rig handed back');
assert.ok(/BagBreak\?\.dress\?\.\(c\)/.test(fs.readFileSync('adventure/story/dream-sets.js', 'utf8')), 'the gym set shows the old bag in its state');
const hooks = fs.readFileSync('docs/adventure/DREAM_HOOKS.md', 'utf8'); for (const w of ['dream_bag_break', 'BagBreak.gymState', "'broken'", 'BagBreak.filmFor']) assert.ok(hooks.includes(w), 'hooks doc names ' + w);
console.log('PASS bag-break script, physics, state hook and wiring', JSON.stringify({ duration: +s.duration.toFixed(2), snap: +ev.snap.toFixed(3), floor: ev.floor.length, rest: +ev.rest.toFixed(2), end: { s: +end.s.toFixed(2), w: +end.w.toFixed(2) } }));

// ---- in the browser (skips without Playwright)
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', x => errors.push(x.message));
    const wait = (f, a) => p.waitForFunction(f, a, { timeout: 300000 });
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* none */ } });
    await p.goto(url, { timeout: 300000 }); await wait(() => window.ringfighterGame && window.GameModes && window.BagBreak);
    await wait(() => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Bag QA'; d.querySelector('button[type=submit]').click(); });
    await wait(() => app.engine.coach?.anatomy); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(800);
    const before = await p.evaluate(() => ({ scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), state: BagBreak.gymState() }));
    assert.equal(before.state, 'hanging', 'fresh save: the bag hangs');
    // finish night_bag through the game's own flow (training run, target reached) and count the films that start
    await p.evaluate(() => { window.__plays = []; const S = StoryScenes, play = S.play; S.play = (id, o) => { window.__plays.push(id); return play.call(S, id, o); };
      const st = ringfighterGame.store; ringfighterGame.close(); AdventureOldTown.launch({ store: st, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = st.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } }, 'night_bag'); });
    await wait(() => app.engine.career.active && AdventureOldTown.run?.id === 'night_bag');
    assert.ok(await p.evaluate(() => /Old heavy bag|old/.test(app.engine.arena.models.heavy.userData.soft.material.map ? 'old' : '')), 'the training bag wears the old bag');
    await p.evaluate(() => { const r = AdventureOldTown.run; r.value = r.target; });
    await wait(() => BagBreak.playing === 'dream_bag_break' && BagBreak.debug?.phase === 'play');
    assert.equal(await p.evaluate(() => BagBreak.gymState()), 'broken', 'the save says broken once night_bag is done');
    await p.evaluate(() => BagBreak.seek(4.3)); await p.waitForTimeout(1500);
    const mid = await p.evaluate(() => ({ scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), skip: !!document.querySelector('dialog.dream-scene .dream-skip') }));
    assert.deepEqual(mid.scale, [-1, 1, 1], 'mirrored root in the film'); assert.equal(mid.outfit, 'kit'); assert.ok(mid.skip, 'Skip button');
    await p.evaluate(() => document.querySelector('dialog.dream-scene .dream-skip').click());
    await wait(() => !BagBreak.playing && !document.querySelector('dialog.dream-scene'));
    const after = await p.evaluate(() => ({ scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), demo: !!app.engine.fightIQDemo, plays: window.__plays.slice() }));
    assert.deepEqual(after.scale, before.scale, 'root scale handed back'); assert.equal(after.outfit, before.outfit, 'outfit handed back'); assert.equal(after.demo, false);
    assert.deepEqual(after.plays.filter(id => id === 'dream_bag_break'), ['dream_bag_break'], 'the film played once');
    // finishing night_bag again does not replay it
    await p.waitForTimeout(1500); await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); const st = ringfighterGame.store; AdventureOldTown.launch({ store: st, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = st.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } }, 'night_bag'); });
    await wait(() => app.engine.career.active && AdventureOldTown.run?.id === 'night_bag'); await p.evaluate(() => { const r = AdventureOldTown.run; r.value = r.target; });
    await wait(() => !app.engine.career.active); await p.waitForTimeout(2500);
    assert.deepEqual(await p.evaluate(() => window.__plays.filter(id => id === 'dream_bag_break').length), 1, 'not again on the second finish');
    // the gym afterwards: the bag on the floor, the empty chain on the mount
    const gym = await p.evaluate(async () => { await StorySets.ready(); const scene = new THREE.Scene(), set = StorySets.build('dream_gym', scene, { renderer: app.engine.renderer }), o = set.objects.oldBag, b = o.bag.group, up = new THREE.Vector3(0, 1, 0).applyQuaternion(b.quaternion); const out = { state: o.state, y: b.position.y, tilt: Math.abs(up.y), links: o.links.map(l => l.position.y) }; set.dispose(); return out; });
    assert.equal(gym.state, 'broken'); assert.ok(Math.abs(gym.y - C.BAG.r) < .01 && gym.tilt < .02, 'the bag lies on the floor in the gym: ' + JSON.stringify(gym));
    assert.ok(gym.links.slice(0, C.BAG.keep).every(y => y > 2.5), 'the empty chain hangs from the mount');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS browser: plays once on finishing night_bag, Skip, rig handed back, bag on the floor afterwards');
  } finally { await browser.close(); server.close(); }
})().catch(x => { console.error(x); process.exit(1); });
