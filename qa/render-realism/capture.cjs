// Render realism (owner 2026-11-22: "improve the graphics ... as realistic as possible"). Real app, real renderer, 402x690.
// usage: ROOT=<repo dir to serve> QUALITY=high|low node qa/render-realism/capture.cjs <outdir> <tag> [cases]
//   cases (comma list, default all): dream_opening, dream_market_robbery, dream_otto_shop, dream_gym_talk, ring, street
//   high = DreamScenes 'high' + engine quality level 6 (2048 shadows); low = DreamScenes 'low' + engine level 0 (no shadow pass)
//   Writes <outdir>/<tag>-<quality>-<case>-<i>.png and <outdir>/<tag>-<quality>.json with, per frame: draw calls, triangles,
//   programs, textures, render ms of the held frame (8 renders each finished by a 1-pixel read: median, min) and, per case,
//   the rAF frame interval with CDP CPU throttling 4x (THROTTLE=0 skips it).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'shot';
const quality = process.env.QUALITY || 'high', throttle = process.env.THROTTLE !== '0';
const CASES = {
  dream_opening: [7.3, 20.5, 29.5],
  dream_market_robbery: [2, 5, 11, 15],
  dream_otto_shop: [4, 14, 26],
  dream_gym_talk: [4, 15, 30],
  ring: { venue: 'default', seed: 78, times: [2, 4.5] },
  street: { venue: 'street', seed: 74, times: [2, 4.5] }
};
const list = (process.argv[4] || Object.keys(CASES).join(',')).split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const result = { root, quality, errors: [], cases: {} };
  try {
    const iphone = devices['iPhone 13'];
    const p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: iphone.userAgent });
    p.setDefaultTimeout(600000);
    const cdp = await p.context().newCDPSession(p);
    p.on('pageerror', e => result.errors.push(String(e).slice(0, 300)));
    p.on('console', m => { if (m.type() === 'error') result.errors.push(m.text().slice(0, 300)); });
    await p.addInitScript(q => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', q); } catch { } }, quality);
    await p.goto(`http://localhost:${server.address().port}/`, { timeout: 600000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.CityAssets, null, { timeout: 600000 });
    await p.evaluate(q => {
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300);
      if (!app.engine.career.store.current()) app.engine.career.store.create('Render QA');
      app.engine.qualityLock = q === 'low' ? 0 : 6; app.engine.updateQuality(0);
    }, quality);
    await p.evaluate(() => CityAssets.ready(240000, Object.keys(CityAssets.FILES)).catch(() => null));
    const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(([n0, n]) => app.engine.renderer.info.render.frame >= n0 + n, [n0, n], { timeout: 300000 }); };
    // held-frame cost of whatever scene/camera is drawn now
    const measure = (getScene) => p.evaluate(async (src) => {
      const get = new Function('return (' + src + ')()');
      const { scene, camera } = get(), r = app.engine.renderer, gl = r.getContext(), px = new Uint8Array(4), rt = [];
      for (let k = 0; k < 8; k++) { const t0 = performance.now(); if (r.shadowMap.enabled) r.shadowMap.needsUpdate = true; r.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); rt.push(performance.now() - t0); }
      rt.sort((a, b) => a - b); const i = r.info;
      return { calls: i.render.calls, triangles: i.render.triangles, programs: i.programs?.length, textures: i.memory.textures, geometries: i.memory.geometries, renderMs: +rt[4].toFixed(1), renderMin: +rt[0].toFixed(1), env: !!scene.environment, exposure: r.toneMappingExposure, shadowMap: r.shadowMap.enabled, look: window.RenderLook?.current?.(scene) || null };
    }, getScene.toString());
    const paced = async () => { // rAF intervals under 4x CPU throttling (a phone proxy: SwiftShader rasterises on the CPU in the GPU process, which CDP does not throttle)
      if (!throttle) return null;
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const d = await p.evaluate(() => new Promise(res => { const d = []; let last = 0, n = 0; const step = now => { if (last) d.push(now - last); last = now; if (++n <= 24) requestAnimationFrame(step); else res(d); }; requestAnimationFrame(step); }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      d.sort((a, b) => a - b); return { median: +d[d.length >> 1].toFixed(1), p90: +d[Math.floor(d.length * .9)].toFixed(1) };
    };
    for (const id of list) {
      const spec = CASES[id], rows = [];
      if (Array.isArray(spec)) {
        await p.evaluate(q => DreamScenes.quality(q), quality);
        await p.evaluate(id => StoryScenes.play(id, { onDone: () => { }, onBuy: () => true }), id);
        await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 600000 });
        for (let i = 0; i < spec.length; i++) {
          const t = spec[i];
          for (let u = Math.max(0, t - 1.2); u < t; u += .2) { await p.evaluate(u => DreamScenes.seek(u), u); await frames(1); }
          await p.evaluate(t => DreamScenes.seek(t), t); await frames(3);
          const file = path.join(out, `${tag}-${quality}-${id}-${i}.png`); await p.screenshot({ path: file });
          const row = await measure(() => ({ scene: DreamScenes.debug.scene, camera: DreamScenes.debug.camera }));
          row.t = t; row.stats = await p.evaluate(() => { const s = DreamScenes.stats() || {}; return { calls: s.calls, triangles: s.triangles, quality: s.quality, shadows: s.shadows }; });
          rows.push(row); console.log(id, JSON.stringify(row));
        }
        const pace = await paced();
        await p.evaluate(() => DreamScenes.stop?.() ?? DreamScenes.debug?.finish?.({ skipped: true }));
        await p.waitForFunction(() => !DreamScenes.debug, null, { timeout: 60000 }).catch(() => { });
        result.cases[id] = { rows, pace }; console.log(id, 'pace', JSON.stringify(pace));
      } else {
        await p.evaluate(([v, seed]) => { try { ringfighterGame.close?.(); } catch { } const rg = window.ringfighterGame; const r = rg.store.gameAction({ type: 'venue', venueId: v }); if (r.ok) rg.apply?.(); app.engine.fightOptions = { seed }; rg.startFight({ watch: true, rounds: 1, roundSeconds: 60, restSeconds: 0 }); }, [spec.venue, spec.seed]);
        await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 600000 });
        for (let i = 0; i < spec.times.length; i++) {
          const t = spec.times[i];
          await p.evaluate(async t => { const e = app.engine, r = e.renderer.render; e.renderer.render = () => { }; try { for (let n = 0; n < 6000; n++) { const m = e.arena.fightView.match; if (m.phase === 'round' && m.time > t) break; if (!e.isPlaying || e.cameraDirector?.holdsClock) { e.isPlaying = true; e.cameraDirector?.skipIntro?.(); await new Promise(q => setTimeout(q, 20)); continue; } e.animTime += 1 / 60; e.arena.update(e.animTime); } } finally { e.renderer.render = r; e.isPlaying = false; e.lastRenderStamp = null; } }, t);
          await frames(3);
          // the canvas alone (the HUD and the pause card would cover the fighters): drawn and read in one task
          const url = await p.evaluate(() => { const e = app.engine; e.world.update(e.animTime, 'fight'); e.arena.fightView.pose?.(); e.renderer.render(e.scene, e.camera); return e.canvas.toDataURL('image/png'); });
          fs.writeFileSync(path.join(out, `${tag}-${quality}-${id}-${i}.png`), Buffer.from(url.split(',')[1], 'base64'));
          const row = await measure(() => ({ scene: app.engine.scene, camera: app.engine.camera })); row.t = t;
          rows.push(row); console.log(id, JSON.stringify(row));
        }
        await p.evaluate(() => { app.engine.isPlaying = true; });
        const pace = await paced();
        await p.evaluate(() => { app.engine.isPlaying = false; try { ringfighterGame.close?.(); } catch { } });
        result.cases[id] = { rows, pace }; console.log(id, 'pace', JSON.stringify(pace));
      }
    }
  } catch (x) { console.error(x); result.fatal = String(x); }
  fs.writeFileSync(path.join(out, `${tag}-${quality}.json`), JSON.stringify(result, null, 1));
  if (result.errors.length) console.log('page errors', result.errors);
  await b.close(); server.close();
});
