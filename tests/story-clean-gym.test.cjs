// GOTR-0099 side job A "Clean the gym": the mop-lanes rules (lanes, the beat window, big streaks, stains, the bag pendulum,
// ducking and slipping, stars from marks), the job's pay in the save, the step wiring, and in the browser the job itself:
// street clothes and bare hands in the gym, the mop held in an everyday pose (never the guard), the mirrored root kept, the
// step completed with a star and paid, everything given back after.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const M = require('../adventure/story/mop-core.js'), A = require('../adventure-progress.js'), D = require('../game-domain.js'), SF = require('../adventure/story-flow.js'), ST = require('../adventure/story.js');
const R = M.MOP, run = (g, s) => { for (let t = 0; t < s - 1e-9; t += 1 / 120) g.step(1 / 120); return g; };
const quiet = o => ({ ...R, ...o, bag: { ...R.bag, first: 999 } }); // no bag unless asked

// ---- lanes and footwork: left / right step along the lane, up slips to the other lane, the edges hold
{
  const g = new M.MopTrial(quiet({ gap: [99, 99] })); g.nextWet = 99;
  assert.deepEqual([g.f.lane, g.f.spot], [R.start.lane, R.start.spot]);
  g.key('left', true); assert.equal(g.view().phase, 'move'); run(g, R.move + .02); assert.equal(g.f.spot, R.start.spot - 1);
  assert.ok(Math.abs(g.view().body.x - (R.x0 + (R.start.spot - 1) * R.dx)) < 1e-6, 'the Fighter stands on the spot');
  g.key('up', true); run(g, R.slip / 2 - .02); assert.equal(g.body().lane, R.start.lane, 'halfway through a Slip he still counts in the old lane');
  run(g, R.slip / 2 + .04); assert.equal(g.f.lane, 1 - R.start.lane); assert.ok(Math.abs(g.body().z - (R.zLane[1 - R.start.lane] - R.reachZ)) < 1e-6);
  for (let i = 0; i < 9; i++) { g.key('left', true); run(g, R.move + .02); } assert.equal(g.f.spot, 0, 'the lane ends at spot 0');
  g.key('right', true); g.key('right', true); run(g, 2 * R.move + .1); assert.equal(g.f.spot, 2, 'a step pressed during a step is kept (one queued)');
}
// ---- the beat: the push lands every stroke after arriving; a tap within the window wipes, outside it smears
{
  const g = new M.MopTrial(quiet({ gap: [99, 99] })); g.nextWet = 99;
  g.wet.push({ id: 1, lane: g.f.lane, spot: g.f.spot, t0: 0, life: 30, state: 'wet', wipes: 1, big: false, len: 1, turn: 0 }, { id: 2, lane: g.f.lane, spot: g.f.spot + 1, t0: 0, life: 30, state: 'wet', wipes: 2, big: true, len: 1, turn: 0 });
  run(g, R.stroke * .5); assert.equal(g.view().on, 1); assert.equal(g.view().open, false);
  g.key('straight', true); assert.equal(g.smears, 1, 'off the beat: a smear'); assert.equal(g.streak, 0); assert.equal(g.wet[0].state, 'wet');
  run(g, R.whiff); const b = g.beat(); run(g, Math.max(0, -b.d)); // to the landing push
  assert.ok(Math.abs(g.beat().d) <= R.window && g.view().open, 'the ring is closed at the landing push');
  g.key('straight', true); assert.equal(g.wet[0].state, 'clean'); assert.equal(g.cleaned, 1); assert.equal(g.flash.type, 'perfect'); assert.equal(g.score, R.pts.perfect);
  g.key('right', true); run(g, R.move + .02); assert.equal(g.view().on, 2);
  run(g, Math.max(R.whiff, R.stroke - R.move - .04)); run(g, Math.max(0, -g.beat().d)); g.key('straight', true);
  assert.equal(g.wet[1].state, 'wet', 'a big streak needs a second wipe'); assert.equal(g.wet[1].wipes, 1);
  run(g, Math.max(R.whiff, R.stroke - .02)); run(g, Math.max(0, -g.beat().d)); g.key('straight', true);
  assert.equal(g.wet[1].state, 'clean'); assert.equal(g.cleaned, 2); assert.equal(g.streak, 2);
  assert.equal(g.score, R.pts.perfect + R.pts.perfect + R.pts.big, 'big streak bonus');
}
// ---- streaks appear (the first two next to the Fighter), set into stains (combo lost), never more than maxWet at once
{
  const g = new M.MopTrial(quiet({})); run(g, 2.2);
  const first = g.wet.slice(0, 2); assert.ok(first.length === 2 && first.every(w => w.lane === R.start.lane && Math.abs(w.spot - R.start.spot) === 1), 'the first streaks lie next to him');
  run(g, 20); assert.ok(g.wet.filter(w => w.state === 'wet').length <= R.maxWet); assert.ok(g.stains > 0, 'unwiped streaks set'); assert.equal(g.streak, 0);
  assert.ok(g.wet.filter(w => w.state === 'stain').every(w => g.t - w.until < 2.5), 'stains fade out of the list');
}
// ---- the bag: a real pendulum (half period pi*sqrt(L/g)), it knocks a Fighter standing in its lane, ducking or slipping avoids it
{
  const half = Math.PI * Math.sqrt(R.bag.length / M.G), p = M.pendulum(R.bag, half / 2);
  assert.ok(Math.abs(p.half - half) < 1e-9 && Math.abs(p.th - R.bag.theta) < 1e-9, 'out to the full angle at a quarter period');
  assert.equal(M.pendulum(R.bag, half + .01).th, 0, 'back in Bruno\'s hands after one half period');
  assert.ok(p.bottom > R.bag.head, 'at the top of its arc the bag passes over a standing head'); assert.ok(M.pendulum(R.bag, .05).bottom < R.bag.head, 'near the bottom it meets the head');
  const shove = (act, spot = 0) => { const g = new M.MopTrial({ ...R, gap: [99, 99], bag: { ...R.bag, first: .5 } }); g.nextWet = 99; g.f.spot = spot; run(g, .52); assert.equal(g.bag.phase, 'warn'); const lane = g.bag.lane; g.f.lane = lane;
    if (act === 'slip') { run(g, R.bag.warn - .4); g.key('up', true); } run(g, R.bag.warn - (act === 'slip' ? R.bag.warn - .4 : 0) - .02);
    for (let i = 0; i < 400 && !g.stunned() && g.bag; i++) { if (act === 'duck' && !g.ducking() && g.bag.phase === 'swing') { const v = g.view(); if (Math.abs(v.bag.x - v.body.x) < .9) g.key('down', true); } g.step(1 / 120); } return g; };
  const hit = shove('stand'); assert.equal(hit.knocks, 1, 'standing in its lane at the end: knocked'); assert.ok(hit.stunned()); assert.equal(hit.streak, 0); hit.key('left', true); assert.equal(hit.f.from, null, 'no steps while stunned');
  const duck = shove('duck'); assert.equal(duck.knocks, 0, 'ducked under it'); assert.equal(duck.dodges, 1); assert.equal(duck.streak, 1, 'the dodge counts in the combo');
  const slip = shove('slip'); assert.equal(slip.knocks, 0, 'slipped to the other lane'); assert.equal(slip.dodges, 1);
  const far = shove('stand', R.spots - 1); assert.equal(far.knocks, 0, 'the far end of the lane is out of its reach');
}
// ---- a whole shift: 50 s, stars from marks (score / 100), hard mode faster; pay by stars, equal to the save's wage table
{
  const g = new M.MopTrial(); run(g, R.duration + .1); assert.ok(g.done); const r = g.result(A.starsFor);
  assert.equal(r.missionId, 'clean_gym'); assert.equal(r.metric, 'marks'); assert.equal(r.value, Math.floor(r.score / 100)); assert.equal(r.stars, A.starsFor('clean_gym', r.value)); assert.equal(r.stars, 0, 'nobody mopped');
  assert.deepEqual(A.missions.find(m => m.id === 'clean_gym').thresholds, [25, 50, 75]);
  assert.deepEqual([A.starsFor('clean_gym', 24), A.starsFor('clean_gym', 25), A.starsFor('clean_gym', 50), A.starsFor('clean_gym', 75)], [0, 1, 2, 3]);
  assert.deepEqual([...M.PAY], [...D.jobs.clean_gym]); assert.deepEqual([1, 2, 3].map(M.pay), [6, 10, 15]); assert.ok(M.pay(3) < 20, 'a job pays little');
  const h = new M.MopTrial(undefined, { hard: true }); assert.ok(h.nextBag < new M.MopTrial().nextBag);
}
// ---- the wage in the save: only after a recorded shift, coins by its stars, repeatable, forged entries rejected
{
  const p = { id: 'p1', name: 'QA', boxers: { lion: { xp: 0 }, rabbit: { xp: 0 } } };
  const gg = { ledger: [{ id: 'baseline:p1', type: 'baseline', coins: 0, xp: 0, rule: 'migration-v1' }], adventure: A.fresh() }, act = a => { try { return { ok: true, ...D.action(gg, a, p) }; } catch (x) { return { ok: false, error: x.message }; } };
  assert.equal(act({ type: 'job', jobId: 'clean_gym', stars: 1 }).ok, false, 'no shift recorded yet');
  A.recordMission(gg, 'clean_gym', { marks: 52 }, true);
  assert.equal(act({ type: 'job', jobId: 'clean_gym', stars: 3 }).ok, false, 'more stars than the shift earned');
  const one = act({ type: 'job', jobId: 'clean_gym', stars: 2 }); assert.ok(one.ok, one.error); assert.equal(one.coins, 10); assert.equal(gg.ledger.at(-1).id, 'job:clean_gym:1');
  assert.equal(act({ type: 'job', jobId: 'clean_gym', stars: 2 }).ok, false, 'one wage per recorded shift');
  A.recordMission(gg, 'clean_gym', { marks: 30 }, true); const two = act({ type: 'job', jobId: 'clean_gym', stars: 1 }); assert.ok(two.ok); assert.equal(two.coins, 6, 'repeatable: the next shift pays again');
  assert.equal(gg.ledger.filter(t => t.rule === 'job-pay-v1').reduce((n, t) => n + t.coins, 0), 16);
  assert.equal(act({ type: 'job', jobId: 'sweep_docks', stars: 1 }).ok, false, 'unknown job');
  // through the real store: saved, reloaded and re-validated; a forged wage is refused on load
  const { CareerStore } = require('../career-progress.js'), mem = () => ({ values: new Map(), getItem(k) { return this.values.get(k) || null; }, setItem(k, v) { this.values.set(k, v); } });
  const disk = mem(), s = new CareerStore(disk); s.create('Mop QA');
  assert.ok(s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 80 } }).ok);
  const paid = s.gameAction({ type: 'job', jobId: 'clean_gym', stars: 3 }); assert.ok(paid.ok, paid.error); assert.equal(s.wallet().coins, 15);
  assert.equal(new CareerStore(disk).wallet().coins, 15, 'the wage survives a reload');
  const raw = JSON.parse([...disk.values.values()].find(v => v.includes('job-pay-v1'))), key = [...disk.values.keys()].find(k => disk.values.get(k).includes('job-pay-v1'));
  const forged = JSON.stringify(raw).replace('"coins":15,"xp":0,"rule":"job-pay-v1"', '"coins":500,"xp":0,"rule":"job-pay-v1"'); assert.notEqual(forged, JSON.stringify(raw));
  const d2 = mem(); for (const [k, v] of disk.values) d2.setItem(k, k === key ? forged : v); assert.notEqual(new CareerStore(d2).wallet().coins, 500, 'a forged wage does not load');
}
// ---- the step: side job A runs the game; the stand-in note is gone; Bruno's lines exist in EN/HE/RU and reach the journal
{
  const ot = fs.readFileSync('adventure/oldtown.js', 'utf8'); assert.match(ot, /clean_gym: \{ kind: 'scene', scene: 'clean_gym' \}/);
  const s = SF.find('clean_gym'); assert.equal(s.side, true); assert.equal(s.after, 'first_brick'); assert.equal(s.stand, undefined, 'no stand-in any more');
  for (const k of ['job', 'job_0', 'job_1', 'job_2', 'job_3']) { const l = ST.lines.clean_gym[k][0]; assert.equal(l.who, 'bruno'); for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang] && l.text[lang].length < 80, k + ' ' + lang); }
  const g = { adventure: A.fresh() }; A.recordMission(g, 'clean_gym', { marks: 25 }, true); assert.equal(SF.doneOf(g, s), true, 'one star finishes the side job');
  const html = fs.readFileSync('index.html', 'utf8'); assert.ok(html.indexOf('adventure/story/mop-core.js') > html.indexOf('adventure/story/trials-core.js') && html.indexOf('adventure/story/mop-game.js') > html.indexOf('adventure/story/story-scenes.js'), 'load order');
  const man = fs.readFileSync('offline-manifest.json', 'utf8'); assert.ok(man.includes('mop-core.js') && man.includes('mop-game.js'), 'offline manifest');
}
// ---- the picture's contract (no browser): street clothes in the gym, Bruno, Mop label, the Fighter posed only through DreamPose.civil
{
  const win = { StoryScenes: { games: {} } }, ctx = { window: win, THREE: require('../assets/vendor/three.min.js'), console }; vm.runInNewContext(fs.readFileSync('adventure/story/mop-game.js', 'utf8'), ctx);
  const gm = win.StoryScenes.games.clean_gym; assert.ok(gm, 'registered'); assert.equal(gm.set, 'dream_gym'); assert.equal(gm.place, 'gym'); assert.equal(gm.wear, 'street', 'a job: street clothes, no gloves');
  assert.deepEqual(Object.keys(gm.roles), ['fighter', 'bruno']); assert.deepEqual([...gm.pads], ['straight']); assert.equal(gm.padWords('he').straight, 'מגב');
  for (const l of ['en', 'he', 'ru']) for (const k of ['up', 'down', 'left', 'right']) assert.ok(gm.words[l].caps[k], l + ' ' + k);
  const src = fs.readFileSync('adventure/story/mop-game.js', 'utf8'); assert.ok(!/'guard'|guardCover|\.update\(/.test(src), 'never the guard, never the fight controller directly');
  const sc = fs.readFileSync('adventure/story/story-scenes.js', 'utf8'); assert.match(sc, /wear = game\?\.wear \|\| C\.outfitFor\(placeKind\)/); assert.match(sc, /c\.root\.scale\.set\(-1, 1, 1\)/);
}
console.log('PASS clean-gym rules, pendulum bag, stars, wage, step wiring');

// ---- in the browser (skips without Playwright): the job through the real step
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', x => errors.push(x.message));
    const wait = (f, a) => p.waitForFunction(f, a, { timeout: 300000 });
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* none */ } });
    await p.goto(url, { timeout: 300000 }); await wait(() => window.ringfighterGame && window.MopGame && window.StoryScenes?.games?.clean_gym);
    await wait(() => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Mop QA'; d.querySelector('button[type=submit]').click(); });
    await wait(() => app.engine.coach?.anatomy); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(800);
    const before = await p.evaluate(() => ({ scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), coins: GameDomain.wallet(ringfighterGame.store.current().game).coins }));
    await p.evaluate(() => { const st = ringfighterGame.store; ringfighterGame.close(); window.__done = null; window.__res = null; const S = StoryScenes, play = S.play; S.play = (id, o) => play.call(S, id, { ...o, onDone: r => { window.__res = r; o.onDone(r); } });
      AdventureOldTown.launch({ store: st, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = st.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } }, 'clean_gym'); });
    await wait(() => StoryScenes.debug?.sim && app.engine.fightIQDemo === StoryScenes.debug);
    const inGame = await p.evaluate(async () => {
      const run = StoryScenes.debug, g = run.sim, c = app.engine.coach, br = StoryCast.rig('bruno', app.engine); run.intro = 0;
      // stand on a streak and render a frame at the landing push: the mop pose, both hands on the handle
      g.wet.push({ id: 99, lane: g.f.lane, spot: g.f.spot, t0: g.t, life: 30, state: 'wet', wipes: 1, big: false, len: 1, turn: 0 }); for (let i = 0; i < 80; i++) g.step(1 / 120);
      run.frame(1 / 60); const j = c.joints, P = n => j[n].getWorldPosition(new THREE.Vector3()), chest = P('chest'), hR = P('handR'), hL = P('handL'), head = P('head');
      const tutorial = document.querySelector('.story-tutorial .story-say')?.textContent || '';
      return { outfit: StoryCast.outfitOf(c), gloves: !!(c.gloveMeshes?.L?.visible || c.gloveMeshes?.R?.visible), scale: c.root.scale.toArray(), bruno: br.root.parent === c.root.parent, brunoScale: br.root.scale.toArray(),
        hands: [hR.y, hL.y], chest: chest.y, head: head.y, handsGap: hR.distanceTo(hL), reachAhead: Math.min(hR.z, hL.z) - chest.z, wear: run.wear, place: run.place, tutorial, mop: !!run.sim && !!app.engine.fightIQDemo, stats: StoryScenes.stats() };
    });
    assert.equal(inGame.outfit, 'street', 'street clothes for the job'); assert.equal(inGame.gloves, false, 'bare hands'); assert.deepEqual(inGame.scale, [-1, 1, 1], 'mirrored root (GOTR-0074)');
    assert.equal(inGame.place, 'gym'); assert.equal(inGame.wear, 'street'); assert.ok(inGame.bruno, 'Bruno is in the hall'); assert.deepEqual(inGame.brunoScale, [-1, 1, 1]);
    assert.ok(inGame.hands.every(y => y < inGame.chest + .05), 'no guard: both hands below the chest on the mop handle ' + JSON.stringify(inGame));
    assert.ok(inGame.handsGap > .25 && inGame.handsGap < .75, 'two hands apart on one handle'); assert.ok(/Floor's yours/.test(inGame.tutorial), "Bruno's line in the tutorial");
    // play a whole shift with a simple autopilot on the rules and finish the step
    const res = await p.evaluate(async () => {
      const run = StoryScenes.debug, g = run.sim; let plan = null, next = 0;
      while (!g.done) { g.step(1 / 120); if (g.t < next) continue; const v = g.view(); if (['stunned', 'move', 'duck'].includes(v.phase)) continue;
        if (v.bag && v.bag.lane === v.body.lane && v.bag.phase === 'swing' && Math.abs(v.bag.x - v.body.x) < .95) { g.key('down', true); next = g.t + .1; continue; }
        if (v.on != null) { if (plan == null) plan = g.t + (1 - v.strokeK) * v.stroke - .02; if (g.t >= plan) { g.key('straight', true); plan = null; next = g.t + .05; } continue; }
        plan = null; const w = v.wet.filter(x => x.state === 'wet').sort((a, c) => a.left - c.left)[0]; if (!w) continue; if (w.lane !== v.f.lane) g.key('up', true); else g.key(w.spot < v.f.spot ? 'left' : 'right', true); next = g.t + .06; }
      run.frame(1 / 60); await new Promise(r => setTimeout(r, 300)); const r = run.result;
      return { value: r.value, stars: r.stars, pay: r.pay, cleaned: r.cleaned, saved: run.saved?.ok, end: document.querySelector('.story-result .story-say')?.textContent || '', payLine: document.querySelector('.story-result-pay')?.textContent || '' };
    });
    assert.ok(res.saved, 'the shift is saved'); assert.ok(res.stars >= 1, 'the autopilot earns a star: ' + JSON.stringify(res)); assert.equal(res.pay, [0, 6, 10, 15][res.stars]); assert.ok(res.payLine.includes(String(res.pay)));
    assert.ok(res.end.includes('Bruno'), "Bruno's reaction line on the result");
    await p.evaluate(() => document.querySelector('.story-result .story-btn-main').click());
    await wait(() => !StoryScenes.playing && window.__res);
    await p.waitForTimeout(1500);
    const after = await p.evaluate(() => { const g = ringfighterGame.store.current().game; return { scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), done: StoryFlow.doneOf(g, StoryFlow.find('clean_gym')), stars: g.adventure.missions.clean_gym?.stars, coins: GameDomain.wallet(g).coins, jobs: g.ledger.filter(t => t.rule === 'job-pay-v1').length, journal: AdventureStory.journal().filter(l => l.id === 'clean_gym').map(l => l.kind) }; });
    assert.deepEqual(after.scale, before.scale, 'root scale given back'); assert.equal(after.outfit, before.outfit, 'the kit is back after the job');
    assert.equal(after.done, true, 'side job A is done'); assert.equal(after.stars, res.stars); assert.equal(after.jobs, 1); assert.equal(after.coins - before.coins, res.pay, 'paid once');
    assert.ok(after.journal.includes('job') && after.journal.some(k => /^job_\d$/.test(k)), "Bruno's lines are in the journal: " + after.journal);
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS browser: clean-gym job', JSON.stringify({ res, stats: inGame.stats }));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
