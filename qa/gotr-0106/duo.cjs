// GOTR-0106 evidence: the two-sided drill (StoryScenes 'bag_duo') played in the real app at 402x690 by a timing bot that presses
// the game's own keys (J/K/L = Straight/Hook/Uppercut) at the top of each swing; pictures at given moments and the result.
//   node qa/gotr-0106/duo.cjs <outdir>   (MISS=1: the bot misses every 4th swing; TIMES=a,b,c picture times; NORESULT=1 stops after them)
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), out = process.argv[2] || path.join(__dirname, 'frames'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes && window.StoryTrials?.DuoTrial && window.BagBreak, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.BagBreak.force = 'new'; window.__res = null; StoryScenes.play('bag_duo', { noIntro: true, onDone: r => { window.__res = r; } }); });
  await p.waitForFunction(() => app.engine.fightIQDemo?.sim, null, { timeout: 300000 });
  // the bot: presses the called punch through the real key path when the bag reaches the Fighter (game time, not wall time)
  await p.evaluate(miss => { let n = 0; const key = { straight: 'j', hook: 'k', uppercut: 'l' }; const tick = () => { const run = app.engine.fightIQDemo, s = run?.sim; if (!s || s.done) return; const c = s.c;
      if (c.state === 'toward' && c.hits < c.need && Math.abs(s.t - s.due) < .03 && c.pressedFor !== s.due) { c.pressedFor = s.due; const k = miss && (++n % 4 === 0) ? 'h' : key[c.type]; for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key: k === 'h' ? (c.type === 'hook' ? 'j' : 'k') : k, bubbles: true })); }
      requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, !!process.env.MISS);
  const shots = [];
  for (const at of (process.env.TIMES || '1.3,4.6,9.2,15.5,22.4,31.0').split(',').map(Number)) {
    // pause the game on the first frame at or after `at` (the last rendered frame stays on screen), take the picture, resume
    await p.evaluate(at => { const run = app.engine.fightIQDemo; window.__paused = false; if (!run.__frame) run.__frame = run.frame; run.frame = d => { if (run.sim && run.sim.t >= at) { window.__paused = true; return; } run.__frame(d); }; }, at);
    await p.waitForFunction(() => window.__paused || window.__res, null, { timeout: 600000 });
    const f = path.join(out, `duo-${String(at).replace('.', '_')}.png`); await p.screenshot({ path: f }); shots.push(f);
    await p.evaluate(() => { const run = app.engine.fightIQDemo; if (run.__frame) run.frame = run.__frame; });
    console.log('shot', at, JSON.stringify(await p.evaluate(() => { const s = app.engine.fightIQDemo?.sim, v = s?.view(); return v && { t: +v.t.toFixed(2), phase: v.phase, type: v.type, need: v.need, landed: v.landed, misses: v.misses, swing: +v.swing.toFixed(2), prompt: document.querySelector('.story-game-prompt, [class*=prompt]')?.textContent || '' }; })));
  }
  if (process.env.NORESULT) { await b.close(); server.close(); return; }
  await p.waitForFunction(() => window.__res || app.engine.fightIQDemo?.sim?.done, null, { timeout: 600000 });
  await p.waitForTimeout(1500); const fin = path.join(out, 'duo-result.png'); await p.screenshot({ path: fin }); shots.push(fin);
  console.log('result', JSON.stringify(await p.evaluate(() => { const s = app.engine.fightIQDemo?.sim; return s ? s.result(window.AdventureProgress?.starsFor) : window.__res; })), 'errors', JSON.stringify(errs));
  await b.close(); server.close();
});
