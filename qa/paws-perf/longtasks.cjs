// Main-thread long tasks while paws are being built (GOTR-0100 follow-up: paws on phones).
// node qa/paws-perf/longtasks.cjs <siteRoot> <out.json> [scenarios=opening,market,fight] [rate=4]
// Headless Chromium (SwiftShader) at 402x690, CPU throttled `rate` x through CDP (Emulation.setCPUThrottlingRate) from the first
// byte, a fresh page per scenario (empty paw cache, as on a first visit). A PerformanceObserver('longtask') records every task
// over 50 ms. Each scenario starts as soon as the game is ready + 1 s (the worst case: the background warm-up has barely
// started) and plays in real time (timeScale 1) for up to WINDOW seconds (default 30):
//   opening: StoryScenes.play('dream_opening')   (the Fighter in street clothes, bare paws)
//   market:  dream_market_robbery, dream_market_reward, dream_otto_shop one after the other (Fang, Mrs. Hazel, Otto)
//   fight:   a watched street bout vs Fang (as qa/paws/tools/fight.cjs; bare fists)
// Reports per window: long-task count, total ms, max ms, tasks >= 250 ms, and (after the fix) Paws.debug counters.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..')), OUT = process.argv[3], LIST = (process.argv[4] || 'opening,market,fight').split(','), RATE = +(process.argv[5] || 4);
const WINDOW = +(process.env.WINDOW || 30) * 1000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const sum = (lt, a, b) => { const w = lt.filter(([s, d]) => s + d > a && s < b), ds = w.map(x => x[1]); return { count: ds.length, totalMs: Math.round(ds.reduce((x, y) => x + y, 0)), maxMs: Math.round(Math.max(0, ...ds)), over250: ds.filter(d => d >= 250).length, over1000: ds.filter(d => d >= 1000).length, top: ds.sort((x, y) => y - x).slice(0, 5).map(Math.round), seconds: +((b - a) / 1000).toFixed(1) }; };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const URL = `http://127.0.0.1:${server.address().port}/`, b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), result = { root: ROOT, rate: RATE, scenarios: {} };
  try {
    for (const name of LIST) {
      const ctx = await b.newContext({ viewport: { width: 402, height: 690 } }), p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
      await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch { /* no longtask */ } });
      p.on('pageerror', e => console.log('PAGEERROR', e.message));
      await p.goto(URL, { timeout: 600000 });
      await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.StoryCast?.docks && window.DreamScenes && window.GameVenues, null, { timeout: 600000, polling: 500 });
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__closer = setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
      await p.waitForTimeout(1000);
      const windows = [];
      const film = async id => {
        const t0 = await p.evaluate(id => { const t = performance.now(); StoryScenes.play(id, { onDone: () => { window.__done = id; }, onBuy: () => true }); window.__done = null; return t; }, id);
        // conversations wait for a tap at each held line: tap when waiting; the shop waits for Buy
        const end = Date.now() + WINDOW;
        while (Date.now() < end) {
          const st = await p.evaluate(() => ({ done: !!window.__done || !DreamScenes.playing, w: DreamScenes.debug?.waiting, buy: !!document.querySelector('.dream-buy:not([hidden])') }));
          if (st.done) break;
          if (st.buy) await p.evaluate(() => document.querySelector('.dream-buy:not([hidden])')?.click());
          else if (st.w) await p.keyboard.press('Space');
          await p.waitForTimeout(400);
        }
        const t1 = await p.evaluate(() => performance.now()); await p.evaluate(() => { try { DreamScenes.stop?.(); } catch { /* gone */ } });
        await p.waitForTimeout(500); windows.push([id, t0, t1]);
      };
      if (name === 'opening') await film('dream_opening');
      else if (name === 'market') { for (const id of ['dream_market_robbery', 'dream_market_reward', 'dream_otto_shop']) await film(id); }
      else if (name === 'fight') {
        const t0 = await p.evaluate(() => {
          const t = performance.now(), e = app.engine; window.__restore = StoryCast.asOpponent(e, 'fang');
          try { ringfighterGame.store.gameAction({ type: 'venue', venueId: 'street' }); ringfighterGame.apply(); } catch { /* the adventure normally does this */ }
          ringfighterGame.startFight({ rounds: 1, roundSeconds: 90, restSeconds: 5, watch: true, seed: 4321 });
          GameVenues.apply(e, 'street', 'en'); window.__venue = setInterval(() => { if (!e.arena?.fightView?.ringless) GameVenues.apply(e, 'street', 'en'); }, 500); return t;
        });
        await p.waitForTimeout(WINDOW); windows.push(['fight-street-fang', t0, await p.evaluate(() => performance.now())]);
      }
      const lt = await p.evaluate(() => window.__lt), dbg = await p.evaluate(() => window.Paws?.debug ? JSON.parse(JSON.stringify(window.Paws.debug)) : null), main = await p.evaluate(() => window.__pawMain || null); // __pawMain: [start, ms, key] of each paw built on the main thread (the 'before' copy is instrumented for this)
      const tris = await p.evaluate(() => app.engine.renderer.info.render.triangles);
      result.scenarios[name] = { windows: Object.fromEntries(windows.map(([id, a, z]) => [id, sum(lt, a, z)])), whole: sum(lt, 0, 1e12), paws: dbg, pawMainBuilds: main && Object.fromEntries(windows.map(([id, a, z]) => [id, main.filter(([s]) => s >= a && s < z).map(([, ms, k]) => k + ' ' + ms + 'ms')])), lastFrameTriangles: tris };
      console.log(name, JSON.stringify(result.scenarios[name]));
      await ctx.close();
    }
  } finally { await b.close(); server.close(); }
  if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(result, null, 1)); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
