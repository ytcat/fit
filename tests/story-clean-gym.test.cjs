// GOTR-0099: the night mop shift (2026-11-22 rebuild): rules (dirt grid, dirty mop smears, rinse, clock, streak, areas,
// stars), saved wage, story wiring, the picture's game entry, and a real 402x690 touch run through the story route.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const M = require('../adventure/story/mop-core.js'), A = require('../adventure-progress.js'), D = require('../game-domain.js'), SF = require('../adventure/story-flow.js'), ST = require('../adventure/story.js');
process.chdir(path.join(__dirname,'..'));
const R = M.MOP, DT = 1/120;
const run = (g, s) => { for (let t = 0; t < s && !g.done; t += DT) g.step(DT); };
/** Mops from a to b with the finger held down (the head follows at MOP.speed). */
function stroke(g, a, b) { if (!g.begin(a)) return false; run(g, 1.2); g.drag(b); run(g, Math.hypot(b.x - a.x, b.z - a.z) / R.speed + .15); g.release(); return true; }
/** A careful worker: rows across the floor, rinsing in time, until the marks reach goal (or the clock runs out). */
function shift(g, goal = 101, rinseAt = .55, gap = .25) {
  for (let pass = 0; pass < 3; pass++) for (let row = 0, z = R.minZ + .12; z < R.maxZ && !g.done && g.marks < goal; row++, z += gap) {
    const [x0, x1] = row % 2 ? [R.maxX - .08, R.minX + .08] : [R.minX + .08, R.maxX - .08];
    g.begin({ x: x0, z }); run(g, .6);
    for (let k = 1; k <= 24 && !g.done && g.marks < goal; k++) {
      g.drag({ x: x0 + (x1 - x0) * k / 24, z }); run(g, Math.abs(x1 - x0) / 24 / R.speed + .01);
      if (g.load > rinseAt) { g.rinse(); run(g, 3); g.begin({ x: x0 + (x1 - x0) * k / 24, z }); run(g, 1); }
    }
    g.release();
  }
}

// ---- the floor and the dirt: a seeded layout of four kinds of dirt in three areas; fresh shifts have fresh dirt
{
  const g = new M.MopTrial({ seed: 5 }), kinds = new Set(g.stains.map(s => s.kind));
  assert.deepEqual([...kinds].sort(), ['chalk', 'print', 'scuff', 'sweat']);
  assert.equal(g.nx * g.nz, M.NX * M.NZ); assert.ok(g.start > 100); assert.ok(g.startZone.every(v => v > 20), 'every area has dirt');
  assert.ok(g.stains.every(s => M.inFloor(s)), 'all stains on the floor');
  assert.deepEqual(new M.MopTrial({ seed: 5 }).stains, g.stains, 'same seed, same floor');
  assert.notDeepEqual(new M.MopTrial({ seed: 6 }).stains, g.stains, 'another seed, another floor');
  assert.equal(M.inFloor(R.bucket), false); assert.equal(M.atBucket(R.bucket), true); assert.equal(M.atBucket({ x: R.maxX, z: R.maxZ }), false, 'the bucket is off the floor');
}
// ---- no time pressure before the first stroke; no progress from a tap, from outside the floor, or from carrying the mop
{
  const g = new M.MopTrial();
  run(g, 120); assert.equal(g.done, false); assert.equal(g.left, R.time, 'the clock waits for the first stroke'); assert.equal(g.marks, 0); assert.equal(g.finish(), false);
  assert.equal(g.begin({ x: 100, z: 0 }), false);
  const s = g.stains.find(q => q.kind === 'chalk');
  assert.equal(g.begin({ x: s.x, z: s.z }), true); run(g, 1); g.release(); assert.equal(g.lift, false);
  const k0 = g.marks; g.begin({ x: s.x, z: s.z }); g.release(); run(g, .5); assert.equal(g.marks, k0, 'a tap cleans nothing');
  assert.equal(g.started, true); assert.ok(g.left < R.time, 'the clock runs once the work starts');
  const far = new M.MopTrial(), q = far.stains.find(x => x.kind === 'scuff');
  far.point = { x: R.minX + .05, z: R.maxZ - .05 }; far.begin({ x: q.x, z: q.z }); assert.equal(far.lift, true, 'a far touch carries the mop');
  const before = far.residual(); for (let i = 0; i < 6 && far.lift; i++) far.step(DT); assert.equal(far.residual(), before, 'nothing is cleaned while the mop is carried');
}
// ---- cleaning: the mop follows the finger no faster than MOP.speed; scuffs need more passes than chalk
{
  const g = new M.MopTrial({ seed: 3 }), c = g.stains.find(s => s.kind === 'chalk');
  g.begin({ x: c.x - .35, z: c.z }); run(g, 1); g.drag({ x: c.x + .35, z: c.z }); g.step(.05);
  assert.ok(Math.hypot(g.point.x - (c.x - .35), g.point.z - c.z) <= R.speed * .05 + 1e-9, 'speed limit');
  run(g, 1); g.release(); assert.ok(g.marks > 0); assert.ok(g.load > 0, 'the mop picks the dirt up');
  const cell = (q, x, z) => q.dirt[Math.floor((z - R.minZ) / R.cell) * q.nx + Math.floor((x - R.minX) / R.cell)];
  const fresh = new M.MopTrial({ seed: 3 }), sc = fresh.stains.find(s => s.kind === 'scuff'), ch = fresh.stains.find(s => s.kind === 'chalk');
  const a0 = cell(fresh, sc.x, sc.z), b0 = cell(fresh, ch.x, ch.z);
  for (const s of [sc, ch]) stroke(fresh, { x: s.x - .3, z: s.z }, { x: s.x + .3, z: s.z });
  assert.ok(cell(fresh, sc.x, sc.z) / a0 > cell(fresh, ch.x, ch.z) / b0 + .1, 'a scuff is more stubborn than chalk');
}
// ---- a dirty mop smears grey water back on clean boards; rinsing (with the walk to the bucket) gives a clean mop
{
  const g = new M.MopTrial({ seed: 2 }); g.load = .95; g.started = true;
  const clean = { x: (R.minX + R.maxX) / 2, z: R.maxZ - .15 }; g.dirt.fill(0); // a clean floor
  g._marks = g.computeMarks(); const m0 = g.marks; assert.equal(m0, 100);
  stroke(g, { x: R.minX + .2, z: clean.z }, { x: R.maxX - .2, z: clean.z });
  assert.ok(g.smears >= 1, 'smear counted'); assert.ok(g.marks < m0, 'smears are dirt again: ' + m0 + ' -> ' + g.marks); assert.ok(g.load < .95, 'what is smeared leaves the mop');
  assert.ok(g.smearMarks.length > 0, 'the picture gets smear streaks');
  assert.equal(g.rinse(), true); assert.equal(g.rinse(), false, 'one rinse at a time'); assert.ok(g.rinsing);
  const dur = g.rinseDur; assert.ok(dur >= R.rinseTime && dur <= R.rinseTime + 1.6 + 1e-9, 'rinse = dunk and wring + the walk');
  assert.equal(g.begin({ x: 1, z: 0 }), true); g.drag({ x: 2, z: 0 }); const r0 = g.residual(); run(g, dur - .05); assert.equal(g.residual(), r0, 'no mopping while rinsing');
  run(g, .2); assert.equal(g.rinsing, false); assert.equal(g.load, 0, 'clean mop'); assert.equal(g.rinses, 1);
  assert.ok(g.events.some(e => e.type === 'rinsed'));
  const d = new M.MopTrial(); assert.ok(d.begin({ x: R.maxX - .1, z: R.maxZ - .1 })); run(d, .5); d.load = .5; d.drag({ x: R.bucket.x, z: R.bucket.z }); assert.equal(d.rinsing, true, 'drag the mop into the bucket to rinse');
  const kb = new M.MopTrial(); kb.key('rinse', true); assert.equal(kb.rinsing, true, 'R rinses');
}
// ---- streak: a long clean stroke buys time; areas buy more; never more than MOP.bonusCap
{
  const g = new M.MopTrial({ seed: 4 }); shift(g, 101);
  assert.ok(g.best >= 3, 'clean strokes build a streak'); assert.ok(g.bonus > 0 && g.bonus <= R.bonusCap + 1e-9);
  assert.ok(g.events.some(e => e.type === 'stroke'));
}
// ---- the clock: time up under 25 % = no stars, nothing finished; the careful worker reaches 3 stars; finished shifts are immutable
{
  const idle = new M.MopTrial(); const s = idle.stains[0]; stroke(idle, { x: s.x - .2, z: s.z }, { x: s.x + .2, z: s.z }); run(idle, R.time + 1);
  assert.equal(idle.done, true); assert.equal(idle.lightsOut, true); assert.equal(idle.finished, false); assert.equal(idle.result(A.starsFor).stars, 0);
  const one = new M.MopTrial({ seed: 8 }); shift(one, 25); assert.ok(one.marks >= 25 && one.marks < 50, String(one.marks)); assert.ok(one.finish()); assert.equal(one.finish(), false);
  const m = one.marks; shift(one, 101); assert.equal(one.marks, m, 'finished shift is immutable'); assert.equal(one.result(A.starsFor).stars, 1);
  const best = new M.MopTrial({ seed: 8 }); shift(best, 101); const r = best.result(A.starsFor);
  assert.ok(best.done && r.finished && r.stars === 3, JSON.stringify(r)); assert.equal(r.smears, 0, 'rinsing in time: no smears');
  const lazy = new M.MopTrial({ seed: 8 }); shift(lazy, 101, 2); assert.ok(lazy.smears > 0 && lazy.marks < r.value - 20, 'never rinsing smears the floor: ' + lazy.marks);
  assert.deepEqual(Object.keys(r).sort(), ['cleaned', 'finished', 'left', 'lightsOut', 'metric', 'missionId', 'rinses', 'score', 'smears', 'stars', 'streak', 'value', 'zones']);
  assert.equal(r.missionId, 'clean_gym'); assert.equal(r.metric, 'marks'); assert.equal(r.value, best.marks);
  assert.deepEqual([...M.PAY], [...D.jobs.clean_gym]);
  const old = A.fresh(); old.missions.clean_gym = { stars: 2, value: 15, plays: 3 }; A.validate(old);
  assert.deepEqual(old.missions.clean_gym, { stars: 2, value: 50, plays: 3 }, 'legacy save migration unchanged');
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
  const { CareerStore } = require('../career-progress.js'), mem = () => ({ values: new Map(), getItem(k) { return this.values.get(k) || null; }, setItem(k, v) { this.values.set(k, v); } });
  const disk = mem(), s = new CareerStore(disk); s.create('Mop QA');
  assert.ok(s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 80 } }).ok);
  const paid = s.gameAction({ type: 'job', jobId: 'clean_gym', stars: 3 }); assert.ok(paid.ok, paid.error); assert.equal(s.wallet().coins, 15);
  assert.equal(new CareerStore(disk).wallet().coins, 15, 'the wage survives a reload');
  const raw = JSON.parse([...disk.values.values()].find(v => v.includes('job-pay-v1'))), key = [...disk.values.keys()].find(k => disk.values.get(k).includes('job-pay-v1'));
  const forged = JSON.stringify(raw).replace('"coins":15,"xp":0,"rule":"job-pay-v1"', '"coins":500,"xp":0,"rule":"job-pay-v1"'); assert.notEqual(forged, JSON.stringify(raw));
  const d2 = mem(); for (const [k, v] of disk.values) d2.setItem(k, k === key ? forged : v); assert.notEqual(new CareerStore(d2).wallet().coins, 500, 'a forged wage does not load');
}
// ---- the step: required after the first Brick bout; nobody else in the gym: Bruno's note, the Fighter talking to himself (EN/HE/RU)
{
  const ot = fs.readFileSync('adventure/oldtown.js', 'utf8'); assert.match(ot, /clean_gym: \{ kind: 'scene', scene: 'clean_gym' \}/);
  const s = SF.find('clean_gym'); assert.equal(s.side, undefined); assert.equal(SF.unlocks('first_brick').next, 'clean_gym'); assert.equal(s.stand, undefined, 'no stand-in any more');
  for (const k of ['job', 'job_0', 'job_1', 'job_2', 'job_3']) { const l = ST.lines.clean_gym[k][0]; assert.equal(l.who, 'fighter', k + ': alone at night'); for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang] && l.text[lang].length < 80, k + ' ' + lang); }
  assert.match(ST.lines.clean_gym.intro[0].text.en, /^Note on the door/); assert.match(ST.lines.clean_gym.outro[0].text.en, /^Note on the desk/);
  const g = { adventure: A.fresh() }; A.recordMission(g, 'clean_gym', { marks: 25 }, true); assert.equal(SF.doneOf(g, s), true, 'one star finishes the required shift');
  const html = fs.readFileSync('index.html', 'utf8'); assert.ok(html.indexOf('adventure/story/mop-core.js') > html.indexOf('adventure/story/trials-core.js') && html.indexOf('adventure/story/mop-game.js') > html.indexOf('adventure/story/story-scenes.js'), 'load order');
  const man = fs.readFileSync('offline-manifest.json', 'utf8'); assert.ok(man.includes('mop-core.js') && man.includes('mop-game.js'), 'offline manifest');
}
{
  const win = { StoryScenes: { games: {} } }, ctx = { window: win, THREE: require('../assets/vendor/three.min.js'), console };
  vm.runInNewContext(fs.readFileSync('adventure/story/mop-game.js', 'utf8'), ctx);
  const g = win.StoryScenes.games.clean_gym;
  assert.ok(g.direct && g.mount); assert.equal(g.set, 'dream_gym'); assert.equal(g.wear, 'street');
  assert.deepEqual(Object.keys(g.roles), ['fighter'], 'nobody else in the gym at night');
  assert.equal(g.keymap.r, 'rinse');
  for (const l of ['en', 'he', 'ru']) for (const k of ['title', 'goal', 'help', 'keyboard', 'finish', 'rinse', 'mop', 'clock', 'stroke', 'smear', 'rinsed', 'lightsOut', 'noteTitle', 'note', 'detail']) assert.ok(g.words[l][k], l + ' ' + k);
  const src = fs.readFileSync('adventure/story/mop-game.js', 'utf8'); assert.ok(!/setIndex\(\s*[^)]*\bbody\b/.test(src) && !/skin\.geometry\.setIndex/.test(src), 'no body index swaps');
  const pose = fs.readFileSync('adventure/story/dream-pose.js', 'utf8'); assert.match(pose, /st\.twist \|\| 0/); assert.match(pose, /hipYaw/);
}
console.log('PASS clean-gym night shift: rules, smears, rinse, clock, streak, stars, wages and story wiring');

if (process.argv.includes('--static-only') && process.env.GOTR_REQUIRE_MOP_BROWSER !== '1') process.exit(0);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch {
    if (process.env.GOTR_REQUIRE_MOP_BROWSER === '1') throw Error('Required Chromium mop coverage needs Playwright');
    console.log('SKIP browser part: Playwright is not installed'); process.exit(0);
  }
}
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ executablePath: process.env.GOTR_CHROMIUM || undefined, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 }, hasTouch: true, isMobile: true }), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    const CDP = await p.context().newCDPSession(p);
    const touch = (type, a = []) => CDP.send('Input.dispatchTouchEvent', { type, touchPoints: a.map(({ x, y }) => ({ x, y, id: 1 })) });
    const wait = (fn, a, timeout = 180000) => p.waitForFunction(fn, a, { timeout });
    const art = process.env.GOTR_MOP_ARTIFACTS;
    const shot = async name => { if (!art) return; fs.mkdirSync(art, { recursive: true }); await p.screenshot({ path: path.join(art, name + '.png'), timeout: 60000 }); };
    await p.addInitScript(() => { localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); });
    await p.goto(url); await wait(() => window.ringfighterGame?.store && window.MopGame && window.StoryScenes?.games.clean_gym);
    if (await p.locator('dialog.career-welcome[open]').count()) {
      await p.locator('dialog.career-welcome[open] input[name=player]').fill('Mop QA');
      await p.locator('dialog.career-welcome[open] button[type=submit]').tap();
    }
    await wait(() => app.engine.coach?.anatomy && ringfighterGame.store.game());
    await p.evaluate(() => { StoryScenes?.stop(); ringfighterGame.close(); });
    const begin = async (afterBrick = false) => {
      const gate = await p.evaluate(afterBrick => {
        const rg = ringfighterGame, st = rg.store; rg.close();
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
        const change = a => { const r = st.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; };
        for (const step of ['dream_arrival', 'dream_gym_talk', 'first_brick']) {
          const s = StoryFlow.find(step);
          if (!StoryFlow.doneOf(st.game(), s)) change({ type: 'adventure', adventure: 'story', step, outcome: step === 'first_brick' ? 'lost' : undefined });
        }
        if (!StoryFlow.playable(st.game(), 'clean_gym')) throw Error('required shift not unlocked by first Brick bout');
        const cx = { store: st, startTraining: rg.startTraining, startFight: rg.startFight, change };
        const selected = afterBrick ? StoryFlow.state(st.game(), 1).current?.id : null;
        if (afterBrick) {
          const forced = AdventureOldTown.before(cx, 'night_shadow', { force: true });
          const devSkip = AdventureOldTown.devSkip(cx, 'clean_gym');
          AdventureOldTown.afterBeat('first_brick', { ok: true, won: false });
          return { selected, forced, devSkip };
        }
        AdventureOldTown.start(cx, 'clean_gym');
      }, afterBrick);
      const next = p.locator('#sfBeat .sf-beat-main');
      if (afterBrick) {
        assert.deepEqual(gate, { selected: 'clean_gym', forced: false, devSkip: false });
        assert.match(await next.textContent(), /Clean the gym/i);
        await next.tap();
      }
      if (await next.count()) await next.tap();
      await wait(() => StoryScenes.debug?.sim && StoryScenes.debug.projectFloor && app.engine.fightIQDemo === StoryScenes.debug && StoryScenes.stats()?.calls);
    };
    const state = () => p.evaluate(() => ({ marks: StoryScenes.debug?.sim?.marks, progress: document.querySelector('.story-mop-bar')?.getAttribute('aria-valuenow'), coins: GameDomain.wallet(ringfighterGame.store.game()).coins, wages: ringfighterGame.store.game().ledger.filter(t => t.rule === 'job-pay-v1').length }));
    const proj = (x, z) => p.evaluate(([x, z]) => StoryScenes.debug.projectFloor(x, z), [x, z]);
    const headAt = (x, z, tol = .08) => wait(([x, z, tol]) => { const s = StoryScenes.debug.sim; return s.done || (Math.hypot(s.point.x - x, s.point.z - z) < tol && !s.lift && !s.rinsing); }, [x, z, tol]);
    const rinse = async () => { const b = await p.locator('.mop-night-rinse').boundingBox(); await touch('touchStart', [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }]); await touch('touchEnd'); await wait(() => StoryScenes.debug.sim.rinses > 0 && !StoryScenes.debug.sim.rinsing); };
    // rows with a held finger, rinsing on the bucket's button when the mop turns grey, until the marks reach goal
    const mop = async goal => {
      for (let z = R.minZ + .15; z < R.maxZ - .05; z += .3) for (const [x0, x1] of [[R.minX + .1, R.maxX - .1], [R.maxX - .1, R.minX + .1]]) {
        if ((await state()).marks >= goal) return;
        await touch('touchStart', [await proj(x0, z)]); await headAt(x0, z);
        for (let k = 1; k <= 6; k++) {
          const x = x0 + (x1 - x0) * k / 6; await touch('touchMove', [await proj(x, z)]); await headAt(x, z, .12);
          if (await p.evaluate(() => StoryScenes.debug.sim.load > .5)) { await touch('touchEnd'); await rinse(); await touch('touchStart', [await proj(x, z)]); await headAt(x, z); }
        }
        await touch('touchEnd'); z += .15;
      }
    };
    const before = await p.evaluate(() => ({ scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), parent: app.engine.stage.parentElement.id, coins: GameDomain.wallet(ringfighterGame.store.game()).coins }));
    await begin(true);
    const inGame = await p.evaluate(() => ({
      outfit: StoryCast.outfitOf(app.engine.coach), rigs: Object.keys(StoryScenes.debug.rigs), note: !document.querySelector('.mop-night-note').hidden,
      oldControls: !!document.querySelector('dialog[data-game=clean_gym] > .story-pad'),
      corners: [[MopCore.MOP.minX, MopCore.MOP.minZ], [MopCore.MOP.maxX, MopCore.MOP.minZ], [MopCore.MOP.minX, MopCore.MOP.maxZ], [MopCore.MOP.maxX, MopCore.MOP.maxZ]].map(([x, z]) => { const p = StoryScenes.debug.projectFloor(x, z); return { ...p, hit: document.elementFromPoint(p.x, p.y)?.classList.contains('story-mop-surface') }; }),
      rinse: (() => { const r = document.querySelector('.mop-night-rinse').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
      lamp: !!StoryScenes.debug.memo && !!document.querySelector('.mop-night-clock'), h: innerHeight, w: innerWidth
    }));
    await shot('01-night-floor');
    assert.equal(inGame.outfit, 'street'); assert.deepEqual(inGame.rigs, ['fighter'], 'no coach at night'); assert.equal(inGame.oldControls, false); assert.equal(inGame.note, true, "Bruno's note before the first stroke");
    assert.ok(inGame.corners.every(a => a.x > 8 && a.x < inGame.w - 8 && a.y > 140 && a.y < inGame.h - 95 && a.hit), 'the whole floor is a drag target: ' + JSON.stringify(inGame));
    assert.ok(inGame.rinse.x >= 0 && inGame.rinse.x + inGame.rinse.w <= inGame.w && inGame.rinse.h >= 36, 'the rinse button is on screen and big enough');
    const s0 = await p.evaluate(() => StoryScenes.debug.sim.stains.find(s => s.kind === 'chalk'));
    const center = await proj(s0.x, s0.z), right = await proj(s0.x + .4, s0.z);
    await touch('touchStart', [{ x: 6, y: 150 }]); await touch('touchMove', [center]); await touch('touchEnd');
    assert.equal((await state()).marks, 0, 'a drag beginning off the floor cannot clean');
    await touch('touchStart', [center]); await touch('touchCancel'); await touch('touchMove', [right]).catch(() => {}); await touch('touchEnd').catch(() => {});
    await p.waitForTimeout(400); assert.equal((await state()).marks, 0, 'tap/cancel cannot clean');
    await mop(5);
    const dirty = await state(); assert.ok(dirty.marks >= 5); assert.equal(dirty.coins, before.coins);
    const body = await p.evaluate(() => StoryScenes.debug.memo.qa); assert.ok(body.both && body.low < .015 && body.top < .015, 'both hands on the handle: ' + JSON.stringify(body));
    await shot('02-mid-shift');
    await p.locator('dialog[data-game=clean_gym] .story-retry').tap(); await wait(() => StoryScenes.debug.sim.marks === 0);
    await p.locator('dialog[data-game=clean_gym] .story-quit:not(.story-retry)').tap(); await wait(() => !StoryScenes.playing);
    assert.deepEqual(await state().then(t => [t.coins, t.wages]), [before.coins, 0], 'quit and retry do not pay');
    assert.deepEqual(await p.evaluate(() => { const g = ringfighterGame.store.game(); return [StoryFlow.state(g, 1).current.id, StoryFlow.playable(g, 'night_shadow')]; }), ['clean_gym', false], 'quit leaves cleaning required');
    await begin();
    await p.setViewportSize({ width: 690, height: 402 }); await wait(() => innerWidth === 690);
    await p.setViewportSize({ width: 402, height: 690 }); await wait(() => innerWidth === 402 && document.querySelector('.story-mop-surface'));
    await mop(25);
    await wait(() => Number(document.querySelector('.story-mop-bar')?.getAttribute('aria-valuenow')) >= 25);
    const ongoing = await state(); assert.ok(ongoing.marks >= 25, JSON.stringify(ongoing)); assert.equal(ongoing.coins, before.coins);
    await p.locator('.story-mop-finish').tap();
    await wait(() => StoryScenes.debug?.result?.finished && document.querySelector('.story-result-pay'));
    const got = await p.evaluate(() => ({ stars: StoryScenes.debug.result.stars, pay: StoryScenes.debug.result.pay, saved: StoryScenes.debug.saved?.ok, rinses: StoryScenes.debug.result.rinses }));
    assert.ok(got.saved); assert.equal(got.pay, M.PAY[got.stars]); assert.ok(got.pay >= 6);
    await shot('03-shift-complete');
    await p.locator('.story-result .story-btn-main').tap(); await wait(() => !StoryScenes.playing);
    const after = await p.evaluate(() => ({
      scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), parent: app.engine.stage.parentElement.id,
      done: StoryFlow.doneOf(ringfighterGame.store.game(), StoryFlow.find('clean_gym')),
      coins: GameDomain.wallet(ringfighterGame.store.game()).coins,
      wages: ringfighterGame.store.game().ledger.filter(t => t.rule === 'job-pay-v1').length
    }));
    assert.deepEqual(after.scale, before.scale); assert.equal(after.outfit, before.outfit); assert.equal(after.parent, before.parent);
    assert.equal(after.done, true); assert.equal(await p.evaluate(() => StoryFlow.state(ringfighterGame.store.game(), 1).current.id), 'night_shadow'); assert.equal(after.wages, 1); assert.equal(after.coins - before.coins, got.pay);
    const best = await p.evaluate(() => ringfighterGame.store.game().adventure.missions.clean_gym.stars);
    // a replay that runs out of time under 25 %: lights out, no stars, nothing paid, the best result kept
    await begin();
    assert.equal((await state()).marks, 0);
    await p.evaluate(() => { const s = StoryScenes.debug.sim; s.started = true; s.left = .3; });
    await wait(() => StoryScenes.debug?.result && document.querySelector('.story-result'));
    const out = await p.evaluate(() => ({ r: StoryScenes.debug.result, dark: document.querySelector('.mop-night-dark')?.dataset.on, best: ringfighterGame.store.game().adventure.missions.clean_gym.stars }));
    assert.equal(out.r.finished, false); assert.equal(out.r.stars, 0); assert.equal(out.r.lightsOut, true); assert.equal(out.dark, 'true'); assert.equal(out.best, best);
    await shot('04-lights-out');
    await p.locator('.story-result .story-btn-main').tap(); await wait(() => !StoryScenes.playing);
    assert.deepEqual(await state().then(o => [o.coins, o.wages]), [after.coins, 1]);
    assert.deepEqual(errors, []);
    console.log('PASS browser: clean-gym job', JSON.stringify({ device: '402x690 touch', partial: ongoing.marks, got, body: { top: body.top, low: body.low, steps: body.steps } }));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
