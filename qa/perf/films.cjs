// Drawing cost of every Chapter 1 film (owner's phone budget ~450k triangles per frame, docs): plays each film in the real app at
// 402x690, samples `samples` moments spread over it, records triangles and draw calls of the rendered frame and the busiest moment.
//   node qa/perf/films.cjs [samples=8] [ids,comma,separated]   (PRE=<js> runs first, e.g. window.__lodShare = .6)
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), N = +(process.argv[2] || 8), only = process.argv[3] ? process.argv[3].split(',') : null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamScenes && window.MarketProps, null, { timeout: 300000 });
  if (process.env.PRE) await p.evaluate(process.env.PRE);
  const ids = only || await p.evaluate(() => DreamScenes.ids.filter(id => /^dream_/.test(id)));
  const rows = [];
  for (const id of ids) {
    await p.evaluate(id => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.BagBreak && (window.BagBreak.force = 'new'); window.__done = false; StoryScenes.play(id, { onDone: () => { window.__done = true; }, onBuy: () => true }); }, id);
    try { await p.waitForFunction(() => DreamScenes.debug?.phase === 'play', null, { timeout: 180000 }); } catch { rows.push({ id, error: 'did not start' }); continue; }
    const dur = await p.evaluate(id => (DreamCore.variant(id) || DreamCore.scenes[id]).duration, id);
    let worst = { tris: 0 }, sum = 0;
    for (let k = 0; k < N; k++) { const t = dur * (k + .5) / N;
      await p.evaluate(t => DreamScenes.seek(t), t); const f0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(f => app.engine.renderer.info.render.frame >= f + 2, f0, { timeout: 60000 });
      const s = await p.evaluate(() => ({ tris: app.engine.renderer.info.render.triangles, calls: app.engine.renderer.info.render.calls }));
      sum += s.tris; if (s.tris > worst.tris) worst = { ...s, t: +t.toFixed(1) }; }
    rows.push({ id, worst, mean: Math.round(sum / N) }); console.log(JSON.stringify(rows[rows.length - 1]));
    await p.evaluate(() => StoryScenes.stop()); await p.waitForTimeout(500);
  }
  fs.writeFileSync(path.join(__dirname, 'films.json'), JSON.stringify({ samples: N, viewport: [402, 690], rows, errors: errs }, null, 1) + '\n');
  console.log('errors', JSON.stringify(errs.slice(0, 3)));
  await b.close(); server.close();
});
