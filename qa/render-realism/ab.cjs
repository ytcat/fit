// Render realism: paired cost of the new look in ONE page (the shared QA machine's load drifts too much for two runs to be
// compared): the same held frame is drawn with the look on and off, alternately, ROUNDS times; each sample is the median
// of 8 renders finished by a 1-pixel read. Also the rAF interval with CDP CPU throttling 4x, on and off.
// usage: QUALITY=high|low node qa/render-realism/ab.cjs <out.json> [cases]
//   films: on/off = DreamScenes.debug.look.high(); fights: engine.renderLook.handle.high() plus engine.lookOff (contact shadows)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), outFile = path.resolve(process.argv[2] || 'ab.json');
const quality = process.env.QUALITY || 'high', ROUNDS = +(process.env.ROUNDS || 5);
const CASES = { dream_opening: 20.5, dream_market_robbery: 11, dream_otto_shop: 14, dream_gym_talk: 15, ring: { venue: 'default', seed: 78, t: 3 }, street: { venue: 'street', seed: 74, t: 3 } };
const list = (process.argv[3] || Object.keys(CASES).join(',')).split(',').filter(Boolean);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), result = { quality, rounds: ROUNDS, errors: [], cases: {} };
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent });
    p.setDefaultTimeout(600000); const cdp = await p.context().newCDPSession(p);
    p.on('pageerror', e => result.errors.push(String(e).slice(0, 300)));
    await p.addInitScript(q => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', q); } catch { } }, quality);
    await p.goto(`http://localhost:${server.address().port}/`, { timeout: 600000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.CityAssets, null, { timeout: 600000 });
    await p.evaluate(q => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); if (!app.engine.career.store.current()) app.engine.career.store.create('Render QA'); app.engine.qualityLock = q === 'low' ? 0 : 6; app.engine.updateQuality(0); }, quality);
    await p.evaluate(() => CityAssets.ready(240000, Object.keys(CityAssets.FILES)).catch(() => null));
    const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(([n0, n]) => app.engine.renderer.info.render.frame >= n0 + n, [n0, n], { timeout: 300000 }); };
    const sample = (film) => p.evaluate(async film => {
      const r = app.engine.renderer, gl = r.getContext(), px = new Uint8Array(4), scene = film ? DreamScenes.debug.scene : app.engine.scene, cam = film ? DreamScenes.debug.camera : app.engine.camera, rt = [];
      for (let k = 0; k < 10; k++) { const t0 = performance.now(); if (r.shadowMap.enabled) r.shadowMap.needsUpdate = true; r.render(scene, cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (k >= 2) rt.push(performance.now() - t0); }
      rt.sort((a, b) => a - b); const i = r.info; return { ms: rt[rt.length >> 1], calls: i.render.calls, triangles: i.render.triangles, programs: i.programs.length };
    }, film);
    const paced = async () => { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); const d = await p.evaluate(() => new Promise(res => { const d = []; let last = 0, n = 0; const step = now => { if (last) d.push(now - last); last = now; if (++n <= 16) requestAnimationFrame(step); else res(d); }; requestAnimationFrame(step); })); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); d.sort((a, b) => a - b); return d[d.length >> 1]; };
    for (const id of list) {
      const spec = CASES[id], film = typeof spec === 'number';
      if (film) {
        await p.evaluate(q => DreamScenes.quality(q), quality);
        await p.evaluate(id => StoryScenes.play(id, { onDone: () => { }, onBuy: () => true }), id);
        await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play' && DreamScenes.debug.scene, null, { timeout: 600000 });
        await p.evaluate(t => DreamScenes.seek(t), spec); await frames(3);
        await p.evaluate(() => { const d = DreamScenes.debug, t = d.t; d.hold = setInterval(() => DreamScenes.seek(t), 16); });
      } else {
        await p.evaluate(([v, seed]) => { try { ringfighterGame.close?.(); } catch { } const rg = window.ringfighterGame; const r = rg.store.gameAction({ type: 'venue', venueId: v }); if (r.ok) rg.apply?.(); app.engine.fightOptions = { seed }; rg.startFight({ watch: true, rounds: 1, roundSeconds: 60, restSeconds: 0 }); }, [spec.venue, spec.seed]);
        await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 600000 });
        await p.evaluate(async t => { const e = app.engine, r = e.renderer.render; e.renderer.render = () => { }; try { for (let n = 0; n < 6000; n++) { const m = e.arena.fightView.match; if (m.phase === 'round' && m.time > t) break; if (!e.isPlaying || e.cameraDirector?.holdsClock) { e.isPlaying = true; e.cameraDirector?.skipIntro?.(); await new Promise(q => setTimeout(q, 20)); continue; } e.animTime += 1 / 60; e.arena.update(e.animTime); } } finally { e.renderer.render = r; e.isPlaying = false; e.lastRenderStamp = null; } }, spec.t);
        await frames(25);
      }
      const set = on => p.evaluate(([film, on]) => { if (film) DreamScenes.debug.look?.high(on); else { const e = app.engine; e.lookOff = !on; e.renderLook?.handle?.high(on && e.qualityLevel > 0); e.lastRenderStamp = null; } }, [film, on]);
      const on = [], off = [], pOn = [], pOff = []; let info = {};
      for (let k = 0; k < ROUNDS; k++) for (const state of k % 2 ? [false, true] : [true, false]) {
        await set(state); await frames(2); const s = await sample(film); (state ? on : off).push(s.ms); info[state ? 'on' : 'off'] = { calls: s.calls, triangles: s.triangles, programs: s.programs };
      }
      if (film) await p.evaluate(() => { clearInterval(DreamScenes.debug.hold); }); else await p.evaluate(() => { app.engine.isPlaying = true; });
      for (let k = 0; k < 2; k++) for (const state of [true, false]) { await set(state); await frames(2); (state ? pOn : pOff).push(await paced()); }
      await set(true);
      if (film) { await p.evaluate(() => DreamScenes.stop()); await p.waitForFunction(() => !DreamScenes.debug, null, { timeout: 60000 }).catch(() => { }); } else await p.evaluate(() => { app.engine.isPlaying = false; try { ringfighterGame.close?.(); } catch { } });
      const med = a => { const s = [...a].sort((x, y) => x - y); return +s[s.length >> 1].toFixed(1); };
      result.cases[id] = { renderOn: med(on), renderOff: med(off), ratio: +(med(on) / med(off)).toFixed(3), paceOn: med(pOn), paceOff: med(pOff), samplesOn: on.map(x => +x.toFixed(1)), samplesOff: off.map(x => +x.toFixed(1)), info };
      console.log(id, JSON.stringify(result.cases[id]));
    }
  } catch (x) { console.error(x); result.fatal = String(x); }
  fs.writeFileSync(outFile, JSON.stringify(result, null, 1)); if (result.errors.length) console.log('page errors', result.errors);
  await b.close(); server.close();
});
