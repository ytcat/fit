// Free roam <-> story: the map button suggests the current step's destination; returning with #chapter1-story opens the Old Town
// quest card and changes nothing in the save.
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = require('path').join(__dirname, '../..'), out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 402, height: 690 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 300)));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(base + '/', { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown, null, { timeout: 300000 });
  await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]') || ringfighterGame.store.current(), null, { timeout: 120000 });
  await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); if (d) { d.querySelector('input').value = 'Roam QA'; d.querySelector('button[type=submit]').click(); } });
  await p.waitForTimeout(1500);
  const results = {};
  for (const step of ['market_robber', 'buy_heavy_bag', 'docks_fight']) {
    const before = await p.evaluate(step => { const g = ringfighterGame; const ctx = { store: g.store, startFight: g.startFight, startTraining: g.startTraining, change: a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } };
      for (const id of AdventureProgress.dreamSteps) { if (id === step) break; if (AdventureProgress.dreamDone(g.store.game(), id)) continue; if (!AdventureOldTown.devSkip(ctx, id)) return 'skip failed ' + id; if (id === 'first_brick') ctx.store.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 25 } }); }
      document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat(); return JSON.stringify(g.store.game().adventure); }, step);
    // open the map at Old Town and press the free-walk button; capture where it navigates
    await p.evaluate(() => { window.__nav = null; const orig = window.location.assign.bind(window.location); try { Object.defineProperty(window, '__assign', { value: orig }); } catch { } });
    await p.evaluate(() => ringfighterGame.open ? ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }) : null).catch(() => { });
    await p.waitForTimeout(2500);
    const btn = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Free walk/.test(x.textContent)); return b ? b.textContent : null; });
    let url = null;
    if (btn) { const nav = p.waitForNavigation({ timeout: 60000 }).catch(() => null); await p.evaluate(() => [...document.querySelectorAll('button')].find(x => /Free walk/.test(x.textContent)).click()); await nav; url = p.url().replace(base, ''); }
    // come back with the return link
    await p.goto(base + '/index.html#chapter1-story', { timeout: 300000 });
    await p.waitForFunction(() => window.ringfighterGame && window.AdventureOldTown && document.querySelector('dialog[open]'), null, { timeout: 300000 });
    await p.waitForTimeout(3000);
    const after = await p.evaluate(() => JSON.stringify(ringfighterGame.store.game().adventure));
    const view = await p.evaluate(() => ({ hash: location.hash, dialogs: [...document.querySelectorAll('dialog[open]')].map(d => d.className).join(','), selected: document.querySelector('[aria-pressed=true], .selected, [data-selected=true]')?.textContent?.trim().slice(0, 40) || null }));
    await p.screenshot({ path: `${out}/return-${step}.png`, timeout: 180000 }).catch(() => {});
    results[step] = { button: btn, url, saveUnchanged: before === after, view };
  }
  console.log(JSON.stringify(results, null, 1)); console.log('errors', JSON.stringify(errs.slice(0, 6)));
  await b.close(); server.close();
});
