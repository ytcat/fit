// Story walks (GOTR-0120): a real playthrough of the Chapter 1 walks from a NEW profile, with a real save.
//   node qa/story-walk/play.cjs <out dir> [lang=en] [device=phone|pc] [walks=1,2,3,4,5,6] [resume=1]
// phone: 402x690 with touch; the stick is driven by REAL touch events (CDP Input.dispatchTouchEvent) for the first stretch of
//        every walk; pc: 1366x768 without touch; the walk is driven by REAL key presses (keyboard.down/up).
// The rest of each walk (and the last metres into the ring) is walked by FreeWalk.qa.walk: the game's own movement, collision
// and traffic at 30 steps per game second, without drawing (SwiftShader draws a few frames per second; the game caps dt at
// 0.05 s, so walking 370 m to the Docks in real time would take many minutes). Steering: a distance field over the walk grid.
// Each walk: a picture at the start (objective + arrow), near the end (the ring), and of the step that the ring started.
// The walks are reached the way a player reaches them:
//   1 bus stop -> Bruno's gym: the arrival film (Skip tapped) ends at the bus stop and opens the walk
//   2 gym -> market: the apology film (Skip tapped) opens the walk
//   3 market -> Otto's: the quest card's button ("Walk to Otto's shop ...", a real tap) after the street fight (dev skip)
//   4 Otto's -> gym with the bag: the Otto film (Buy tapped, then Skip) opens the walk
//   5 gym -> Docks: the quest card's button after the fight preparation (dev skip)
//   6 Docks -> gym: the quest card's button after the Docks fight (dev skip)
// Steps between walks that are not walks (fights, trainings) are finished with the game's own development skip.
const { chromium } = require('playwright'), fs = require('fs');
const { serve } = require('../free-walk-city/serve.cjs');
const out = process.argv[2] || 'qa/story-walk/out', LANG = process.argv[3] || 'en', DEV = process.argv[4] || 'phone';
const WALKS = (process.argv[5] || '1,2,3,4,5,6').split(',').map(Number), RESUME = process.argv[6] !== '0';
fs.mkdirSync(out, { recursive: true });
const tag = `${DEV}-${LANG}`, report = { lang: LANG, device: DEV, walks: [], errors: [] };
const shot = (p, name) => p.screenshot({ path: `${out}/${tag}-${name}.png` });
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const s = await serve(), base = `http://localhost:${s.address().port}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext(DEV === 'pc' ? { viewport: { width: 1366, height: 768 } } : { viewport: { width: 402, height: 690 }, hasTouch: true, isMobile: true });
  let p = await ctx.newPage(); const cdp = DEV === 'phone' ? await ctx.newCDPSession(p) : null;
  const errs = report.errors; p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 300)));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  async function load(first) {
    await p.goto(base + '/', { timeout: 300000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk && window.AdventureOldTown, null, { timeout: 300000 });
    await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]') || ringfighterGame.store.current(), null, { timeout: 120000 });
    if (first) await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); if (d) { d.querySelector('input').value = 'Story Walk QA'; d.querySelector('button[type=submit]').click(); } }); // QA setup only
    await wait(1500); await p.evaluate(l => app.setLanguage(l), LANG);
  }
  const closeAll = () => p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => { if (!d.classList.contains('free-walk')) d.close(); }); window.AdventureOldTown.closeBeat(); });
  const ctxJs = `({ store: ringfighterGame.store, startFight: ringfighterGame.startFight, startTraining: ringfighterGame.startTraining, change: a => { const r = ringfighterGame.store.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } })`;
  // the game's development skip for every step before `step` that is not done yet
  const skipTo = step => p.evaluate(([step, cj]) => { const g = ringfighterGame, ctx = eval(cj);
    for (const id of AdventureProgress.dreamSteps) { if (id === step) break; if (AdventureProgress.dreamDone(g.store.game(), id)) continue;
      if (id === 'clean_gym') { g.store.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 25 } }); continue; }
      if (!AdventureOldTown.devSkip(ctx, id)) return 'skip failed ' + id; }
    document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat(); return StoryFlow.state(g.store.game(), 1).current?.id; }, [step, ctxJs]);
  const walkOpen = () => p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy && FreeWalk.snapshot().walk, null, { timeout: 300000 });
  // the stick direction (camera frame, h right / v forward) toward the target, from a distance field over the walk grid
  const steer = () => p.evaluate(() => {
    const town = FreeWalk.qa.town, G = town.grid, snap = FreeWalk.snapshot(), t = town.targets[snap.destination], nx = G.nx, N = nx * G.nz;
    if (!window.__field || window.__field.key !== snap.destination) { const dist = new Int32Array(N).fill(-1), q = new Int32Array(N); const t0 = G.idx(t.x, t.z); let h = 0, tl = 0; dist[t0] = 0; q[tl++] = t0;
      while (h < tl) { const k = q[h++], i = k % nx; for (const n of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, k - nx, k + nx]) if (n >= 0 && n < N && dist[n] < 0 && G.walk[n]) { dist[n] = dist[k] + 1; q[tl++] = n; } }
      window.__field = { key: snap.destination, dist }; }
    const dist = window.__field.dist, s = snap.s; let k = G.idx(s.x, s.z); if (k < 0 || dist[k] < 0) { const n = G.nearest(s.x, s.z); k = G.idx(n.x, n.z); }
    for (let st = 0; st < 10; st++) { let best = k; for (const n of [k - 1, k + 1, k - nx, k + nx]) if (n >= 0 && n < N && dist[n] >= 0 && dist[n] < dist[best]) best = n; if (best === k) break; k = best; }
    const ax = G.x0 + (k % nx + .5) * G.cell, az = G.z0 + (Math.floor(k / nx) + .5) * G.cell; let dx = ax - s.x, dz = az - s.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const Y = snap.yaw; return { h: dx * Math.cos(Y) - dz * Math.sin(Y), v: -dx * Math.sin(Y) - dz * Math.cos(Y), left: Math.hypot(t.x - s.x, t.z - s.z) };
  });
  // the player's own input for `secs` real seconds: touch on the stick (phone) or the arrow keys (pc)
  async function realInput(secs) {
    const a = await p.evaluate(() => FreeWalk.snapshot().s);
    if (DEV === 'phone') {
      const r = await p.evaluate(() => { const b = document.querySelector('.fw-stick').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y, id: 1 }] });
      const end = Date.now() + secs * 1000; let held = false;
      while (Date.now() < end) { const d = await steer(), R = r.w * .34; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + d.h * R, y: r.y - d.v * R, id: 1 }] }); if (!held) { held = true; await wait(250); await shot(p, `walk${cur}-touch`); } await wait(300); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      const end = Date.now() + secs * 1000; let down = new Set();
      const set = async keys => { for (const k of down) if (!keys.has(k)) await p.keyboard.up(k); for (const k of keys) if (!down.has(k)) await p.keyboard.down(k); down = keys; };
      while (Date.now() < end) { const d = await steer(), keys = new Set(); if (d.v > .38) keys.add('ArrowUp'); if (d.v < -.38) keys.add('ArrowDown'); if (d.h > .38) keys.add('ArrowRight'); if (d.h < -.38) keys.add('ArrowLeft'); await set(keys); await wait(300); }
      await set(new Set());
    }
    const z = await p.evaluate(() => FreeWalk.snapshot().s);
    return Math.round(Math.hypot(z.x - a.x, z.z - a.z) * 10) / 10;
  }
  // the rest of the way with the game's own movement (no drawing), until `stop` metres from the target or the walk closes
  const walkOn = stop => p.evaluate(async stop => {
    const town = FreeWalk.qa.town, G = town.grid, nx = G.nx, N = nx * G.nz;
    for (let it = 0; it < 2500 && FreeWalk.playing; it++) {
      const snap = FreeWalk.snapshot(), t = town.targets[snap.destination], s = snap.s; if (Math.hypot(t.x - s.x, t.z - s.z) <= stop) return { left: Math.hypot(t.x - s.x, t.z - s.z) };
      const dist = window.__field.dist; let k = G.idx(s.x, s.z); if (k < 0 || dist[k] < 0) { const n = G.nearest(s.x, s.z); k = G.idx(n.x, n.z); }
      for (let st = 0; st < 8; st++) { let best = k; for (const n of [k - 1, k + 1, k - nx, k + nx]) if (n >= 0 && n < N && dist[n] >= 0 && dist[n] < dist[best]) best = n; if (best === k) break; k = best; }
      const ax = G.x0 + (k % nx + .5) * G.cell, az = G.z0 + (Math.floor(k / nx) + .5) * G.cell; let dx = ax - s.x, dz = az - s.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const Y = snap.yaw; const r = FreeWalk.qa.walk(dx * Math.cos(Y) - dz * Math.sin(Y), -dx * Math.sin(Y) - dz * Math.cos(Y), .2); if (r?.closed) return { closed: true, launched: r.launched };
      if (it % 40 === 39) await new Promise(r => setTimeout(r, 0));
    }
    return { closed: !FreeWalk.playing };
  }, stop);
  let cur = 0;
  async function doWalk(n, expect) {
    cur = n; const w = { n, step: expect };
    await walkOpen(); await wait(1800);
    Object.assign(w, await p.evaluate(() => { const s = FreeWalk.snapshot(); return { walk: s.walk, goal: s.goal, destination: s.destination, distance: s.distance, carry: s.carry, time: s.time, zone: s.zone, ticket: s.ticket, camDist: s.camDist && +s.camDist.toFixed(1), arrow: !document.querySelector('.fw-arrow').hidden, entry: getComputedStyle(document.querySelector('.fw-pad')).display, keys: !document.querySelector('.fw-keys').hidden }; }));
    await shot(p, `walk${n}-start`);
    w.realInputMetres = await realInput(DEV === 'phone' ? 6 : 6);
    await steer();
    if (RESUME && n === 2) { // quit in the middle of the walk (page reload), come back: the walk resumes at the same spot with the same destination
      await p.evaluate(() => FreeWalk.qa.walk(0, 0, .1));
      const before = await p.evaluate(() => FreeWalk.snapshot().s);
      await load(false); await closeAll(); await p.evaluate(() => ringfighterGame.home());
      await walkOpen(); await wait(1500);
      const after = await p.evaluate(() => ({ s: FreeWalk.snapshot().s, walk: FreeWalk.snapshot().walk, destination: FreeWalk.snapshot().destination }));
      w.resume = { before, after, moved: Math.round(Math.hypot(after.s.x - before.x, after.s.z - before.z) * 100) / 100, same: after.walk === expect };
      await shot(p, `walk${n}-resumed`); await p.evaluate(() => { window.__field = null; }); await steer();
    }
    w.near = await walkOn(7); await wait(1600); await shot(p, `walk${n}-near`);
    await p.evaluate(() => { window.__launches = []; const o = AdventureOldTown.start; AdventureOldTown.start = (c, id) => { window.__launches.push(id); return o(c, id); }; });
    w.enter = await walkOn(1.2);
    await p.waitForFunction(() => window.__launches.length > 0, null, { timeout: 60000 }).catch(() => {});
    await p.waitForFunction(() => window.StoryScenes?.playing || window.AdventureOldTown?.run || document.getElementById('sfBeat'), null, { timeout: 120000 }).catch(() => {});
    await wait(3500);
    w.launches = await p.evaluate(() => window.__launches.slice());
    w.after = await p.evaluate(() => ({ playing: window.StoryScenes?.playing || null, run: window.AdventureOldTown?.run?.id || null, beat: !!document.getElementById('sfBeat'), record: localStorage.getItem(FreeWalkCore.walkKey(ringfighterGame.store.current().id)) }));
    await shot(p, `walk${n}-arrived`);
    report.walks.push(w); console.log(JSON.stringify(w));
  }
  const tapSkip = async () => { await p.waitForSelector('dialog.dream-scene .dream-skip', { timeout: 180000 }); await wait(2500); if (DEV === 'phone') await p.tap('dialog.dream-scene .dream-skip'); else await p.click('dialog.dream-scene .dream-skip'); };
  const tapQuest = async () => { await p.evaluate(() => ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') })); await p.waitForSelector('.sf-primary', { timeout: 120000 }); await wait(1200);
    const label = await p.evaluate(() => document.querySelector('.sf-primary').textContent); await shot(p, `walk${cur + 1}-quest-card`);
    await p.evaluate(() => document.querySelector('.sf-primary').scrollIntoView({ block: 'center' })); await wait(400);
    if (DEV === 'phone') await p.tap('.sf-primary'); else await p.click('.sf-primary'); return label; };

  await load(true); await closeAll();
  report.entry = await p.evaluate(() => { const b = document.getElementById('freeWalkBtn'); const r = b?.getBoundingClientRect(); return b && { text: b.textContent, label: b.getAttribute('aria-label'), disabled: b.disabled, hidden: b.hidden, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; });
  await shot(p, 'entry-topbar');
  if (WALKS.includes(1)) { // the arrival film from the start of the story; Skip goes to the end of the (cut) film: the bus stop
    await p.evaluate(cj => AdventureOldTown.start(eval(cj), 'dream_arrival'), ctxJs);
    await tapSkip(); await doWalk(1, 'dream_gym_talk');
  }
  async function fresh() { await load(false); await closeAll(); }
  if (WALKS.includes(2)) {
    await fresh(); report.skip2 = await skipTo('dream_apology');
    await p.evaluate(cj => AdventureOldTown.start(eval(cj), 'dream_apology'), ctxJs); await tapSkip(); await doWalk(2, 'market_robber');
  }
  if (WALKS.includes(3)) { await fresh(); report.skip3 = await skipTo('buy_heavy_bag'); report.quest3 = await tapQuest(); await doWalk(3, 'buy_heavy_bag'); }
  if (WALKS.includes(4)) { // Otto's film started by walk 3 (or here from the card): Buy, then Skip
    if (!WALKS.includes(3)) { await fresh(); await skipTo('buy_heavy_bag'); await p.evaluate(() => FreeWalk.arrive('buy_heavy_bag')); await p.evaluate(cj => AdventureOldTown.start(eval(cj), 'buy_heavy_bag'), ctxJs); }
    await p.waitForSelector('dialog.dream-scene .dream-buy:not([hidden])', { timeout: 240000 }); await wait(800); await shot(p, 'walk4-otto-buy');
    if (DEV === 'phone') await p.tap('dialog.dream-scene .dream-buy'); else await p.click('dialog.dream-scene .dream-buy');
    await tapSkip(); await doWalk(4, 'bag_drill');
  }
  if (WALKS.includes(5)) { await fresh(); report.skip5 = await skipTo('docks_fight'); report.quest5 = await tapQuest(); await doWalk(5, 'docks_fight'); }
  if (WALKS.includes(6)) { await fresh(); report.skip6 = await skipTo('advanced_training'); report.quest6 = await tapQuest(); await doWalk(6, 'advanced_training'); }
  // after the walks: the top-bar entry opens a plain story-led walk (destination from the story, no selector, no Day/Night)
  await fresh(); await shot(p, 'entry-after');
  report.entryAfter = await p.evaluate(() => ({ disabled: document.getElementById('freeWalkBtn')?.disabled, text: document.getElementById('freeWalkBtn')?.textContent }));
  if (DEV === 'phone') await p.tap('#freeWalkBtn'); else await p.click('#freeWalkBtn');
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 }); await wait(1800);
  report.plain = await p.evaluate(() => { const s = FreeWalk.snapshot(); return { walk: s.walk, goal: s.goal, destination: s.destination, time: s.time, selector: !!document.querySelector('.free-walk select'), dayNight: !!document.querySelector('.fw-time') }; });
  await shot(p, 'entry-walk');
  fs.writeFileSync(`${out}/${tag}.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ entry: report.entry, plain: report.plain, errors: errs.slice(0, 5) }));
  await b.close(); s.close();
})();
