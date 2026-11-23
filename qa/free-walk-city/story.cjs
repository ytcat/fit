// Free walk <-> story (GOTR-0118, integrator item 5) with a real save:
//  A. ordinary walk into the current step's place (no story marker): nothing starts, the save is unchanged;
//  B. the Old Town card's "Walk here · <story place>" (a real touch tap): walking into the ring opens that step ONCE through the
//     quest action (AdventureOldTown.start); re-entering the ring in a new walk never starts it again.
//   node qa/free-walk-city/story.cjs <out dir> [lang=en] [step=market_robber]
const { chromium } = require('playwright'), fs = require('fs');
const { serve, boot } = require('./serve.cjs');
const out = process.argv[2] || 'qa/free-walk-city/out', lang = process.argv[3] || 'en', STEP = process.argv[4] || 'market_robber';
fs.mkdirSync(out, { recursive: true });
const walkTo = (p, target) => p.evaluate(target => {
  const town = FreeWalk.qa.town, G = town.grid, t = town.targets[target], nx = G.nx, N = nx * G.nz, dist = new Int32Array(N).fill(-1), q = new Int32Array(N);
  const t0 = G.idx(t.x, t.z); let h = 0, tl = 0; dist[t0] = 0; q[tl++] = t0;
  while (h < tl) { const k = q[h++], i = k % nx; for (const n of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, k - nx, k + nx]) if (n >= 0 && n < N && dist[n] < 0 && G.walk[n]) { dist[n] = dist[k] + 1; q[tl++] = n; } }
  let stuck = 0, bestD = Infinity;
  for (let it = 0; it < 900 && FreeWalk.playing; it++) {
    const s = FreeWalk.snapshot().s; if (Math.hypot(t.x - s.x, t.z - s.z) <= 2) return { reached: true };
    let k = G.idx(s.x, s.z); if (k < 0 || dist[k] < 0) { const n = G.nearest(s.x, s.z); k = G.idx(n.x, n.z); } if (dist[k] < bestD) { bestD = dist[k]; stuck = 0; } else stuck++;
    const look = (it % 10 < 5 && stuck > 6) ? 1 : 8; for (let st = 0; st < look; st++) { let best = k; for (const n of [k - 1, k + 1, k - nx, k + nx]) if (n >= 0 && n < N && dist[n] >= 0 && dist[n] < dist[best]) best = n; if (best === k) break; k = best; }
    const ax = G.x0 + (k % nx + .5) * G.cell, az = G.z0 + (Math.floor(k / nx) + .5) * G.cell; let dx = ax - s.x, dz = az - s.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const Y = FreeWalk.snapshot().yaw; FreeWalk.qa.walk(dx * Math.cos(Y) - dz * Math.sin(Y), -dx * Math.sin(Y) - dz * Math.cos(Y), .2);
  }
  return { reached: false, playing: FreeWalk.playing };
}, target);
(async () => {
  const s = await serve(), base = `http://localhost:${s.address().port}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 402, height: 690 }, hasTouch: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 300)));
  await boot(p, base, lang, 'Story Walk QA');
  // a real save at the step (the game's own dev skip of the earlier steps)
  const skipped = await p.evaluate(step => { const g = ringfighterGame; const ctx = { store: g.store, startFight: g.startFight, startTraining: g.startTraining, change: a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } };
    for (const id of AdventureProgress.dreamSteps) { if (id === step) break; if (AdventureProgress.dreamDone(g.store.game(), id)) continue; if (!AdventureOldTown.devSkip(ctx, id)) return 'skip failed ' + id; if (id === 'first_brick') ctx.store.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 25 } }); }
    document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat(); return StoryFlow.state(g.store.game(), 1).current?.id; }, STEP);
  await p.evaluate(() => { window.__launches = []; const o = AdventureOldTown.start; AdventureOldTown.start = (c, id) => { window.__launches.push(id); return o(c, id); }; });
  const save = () => p.evaluate(() => JSON.stringify(ringfighterGame.store.game().adventure));
  const target = await p.evaluate(() => FreeWalk.storyDestination());
  const result = { step: skipped, target };
  // A. ordinary walking into the place
  const before = await save();
  await p.evaluate(() => FreeWalk.open({ start: 'oldtown' }));
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
  await p.evaluate(t => { const sel = document.querySelector('.fw-select'); sel.value = 'oldtown'; sel.dispatchEvent(new Event('change')); }, target); // a manual marker elsewhere
  result.A = { walk: await walkTo(p, target), launches: await p.evaluate(() => __launches.length), ticket: await p.evaluate(() => FreeWalk.snapshot()?.ticket ?? null) };
  await p.waitForTimeout(800); await p.screenshot({ path: `${out}/story-${lang}-A-ordinary-arrival.png` });
  await p.evaluate(() => FreeWalk.close('quiet'));
  result.A.saveUnchanged = before === await save();
  // B. the card's story walk: open the map at Old Town and tap the walk button for real
  await p.evaluate(() => ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }));
  await p.waitForSelector('.adv-card:not([hidden]) .adv-handle', { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.tap('.adv-card .adv-handle'); await p.waitForTimeout(800);
  const btn = await p.$('.adv-card button[data-walk="oldtown"]'); result.B = { button: btn ? await btn.textContent() : null };
  await p.screenshot({ path: `${out}/story-${lang}-B-card.png` });
  if (btn) { await btn.scrollIntoViewIfNeeded(); await btn.tap(); }
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
  result.B.armed = await p.evaluate(() => FreeWalk.snapshot().ticket);
  await p.waitForTimeout(800); await p.screenshot({ path: `${out}/story-${lang}-B-walk.png` });
  result.B.walk = await walkTo(p, target);
  await p.waitForTimeout(6000);
  result.B.launches = await p.evaluate(() => __launches.slice());
  result.B.playing = await p.evaluate(() => window.StoryScenes?.playing || window.DreamScenes?.playing || document.querySelector('dialog[open]')?.className || null);
  await p.screenshot({ path: `${out}/story-${lang}-B-launched.png` });
  // C. a new walk, into the same ring again: no second launch
  await p.evaluate(() => { window.StoryScenes?.stop?.(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  await p.evaluate(() => FreeWalk.open({ start: 'oldtown' }));
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
  await walkTo(p, target); await p.waitForTimeout(1500);
  result.C = { launches: await p.evaluate(() => __launches.length), ticket: await p.evaluate(() => FreeWalk.snapshot()?.ticket ?? null) };
  console.log(JSON.stringify(result, null, 1)); console.log('errors', JSON.stringify(errs.slice(0, 6)));
  fs.writeFileSync(`${out}/story-${lang}.json`, JSON.stringify({ result, errors: errs.slice(0, 10) }, null, 1));
  await b.close(); s.close();
})();
