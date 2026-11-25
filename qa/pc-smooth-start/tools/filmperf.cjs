// Per-frame times of Chapter 1 films in the real app (SwiftShader: times are relative).
// usage: ROOT=<tree> node filmperf.cjs <W> <H> <label> [ids,comma] ; writes <label>-<W>x<H>.json next to this file
// Each film plays from StoryScenes.play like the story does (no seek); conversation lines are tapped as soon as they wait,
// the Buy button is pressed when it shows. Per frame: wall dt, film phase/time, new GL programs/textures/geometries.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), S = require('./serve.cjs');
const ROOT = process.env.ROOT || path.join(__dirname, '../../..'), W = +process.argv[2] || 1366, H = +process.argv[3] || 768, label = process.argv[4] || 'run';
const only = process.argv[5] ? process.argv[5].split(',') : null, LIMIT = +(process.env.LIMIT || 400) * 1000, TS = +(process.env.TS || 1);
(async () => {
  const srv = await S.start(ROOT); const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1) }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await p.addInitScript(() => { try { localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(srv.url, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame?.store, null, { timeout: 300000 });
  for (let k = 0; k < 120 && !(await p.evaluate(() => !!ringfighterGame.store.game())); k++) { if (await p.locator('dialog.career-welcome[open]').count()) { await p.locator('dialog.career-welcome[open] input[name=player]').fill('Perf QA', { timeout: 180000 }); await p.locator('dialog.career-welcome[open] button[type=submit]').click({ timeout: 180000 }); } await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.DreamScenes && window.StoryScenes, null, { timeout: 300000 });
  await p.waitForTimeout(3000);
  const ids = only || await p.evaluate(() => DreamScenes.ids);
  const rows = [];
  for (const id of ids) {
    await p.evaluate(() => { StoryScenes.stop(); ringfighterGame.close(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
    await p.waitForTimeout(1500);
    const res = await p.evaluate(async ({ id, LIMIT, TS }) => {
      const e = app.engine, info = e.renderer.info, out = { id, frames: [], load: 0 }, t0 = performance.now(); let last = t0, done = false, started = 0;
      window.BagBreak && (window.BagBreak.force = 'new');
      const ok = StoryScenes.play(id, { onDone: r => { done = true; out.result = r; }, onBuy: () => true, outcome: id === 'dream_after_brick' ? 'loss' : undefined, timeScale: TS }); let js = 0, wrapped = null;
      out.ok = ok;
      await new Promise(res => {
        const tick = now => {
          const run = DreamScenes.debug || BagBreak?.debug, dt = now - last; last = now; if (run && run.frame && wrapped !== run) { wrapped = run; const f = run.frame; run.frame = d => { const a = performance.now(); f(d); js = performance.now() - a; }; }
          const phase = run?.phase || (done ? 'done' : '?');
          if (!started && run && run.phase && run.phase !== 'load') { started = now; out.load = Math.round(now - t0); out.warm = run.warm; out.warmMap = run.warmMap; }
          if (started) out.frames.push([Math.round(dt * 10) / 10, phase, +(run?.t ?? 0).toFixed(2), info.programs?.length || 0, info.memory.textures, info.memory.geometries, run?.shot ?? -1, Math.round(js * 10) / 10]); js = 0;
          // auto-advance: tap a waiting line, buy at the counter
          const d = document.querySelector('dialog.story-scene[open]');
          if (run?.waiting && d) d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          const buy = d?.querySelector('.dream-buy'); if (buy && !buy.hidden) buy.click();
          if (done || now - t0 > LIMIT) { out.timedOut = !done; StoryScenes.stop(); res(); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      out.T = window.__T; out.quality = DreamScenes.quality?.(); out.stats = DreamScenes.stats?.() ? { quality: DreamScenes.stats().quality, shadows: DreamScenes.stats().shadows } : null;
      return out;
    }, { id, LIMIT, TS });
    const dts = res.frames.slice(1).map(f => f[0]).sort((a, b) => a - b), n = dts.length;
    const js = res.frames.slice(1).map(f => f[7]).sort((a, b) => a - b); const sum = { id, W, H, T: res.T, warm: res.warm, warmMap: res.warmMap, js_over50: js.filter(x => x > 50).length, js_over100: js.filter(x => x > 100).length, js_max: js[js.length - 1], js_p95: js[Math.floor(js.length * .95)], js_median: js[Math.floor(js.length / 2)], load_ms: res.load, frames: n, film_s: +(dts.reduce((a, c) => a + c, 0) / 1000).toFixed(1), over50: dts.filter(x => x > 50).length, over100: dts.filter(x => x > 100).length, over250: dts.filter(x => x > 250).length, max: dts[n - 1], p95: dts[Math.floor(n * .95)], median: dts[Math.floor(n / 2)], timedOut: res.timedOut, result: res.result, stats: res.stats };
    // the long frames with what changed in them
    const longs = []; for (let i = 1; i < res.frames.length; i++) { const f = res.frames[i], q = res.frames[i - 1]; if (f[7] > 50) longs.push({ i, dt: f[0], js: f[7], phase: f[1], t: f[2], shot: f[6], newPrograms: f[3] - q[3], newTex: f[4] - q[4], newGeo: f[5] - q[5] }); }
    sum.long = longs.slice(0, 40);
    rows.push({ ...sum, frames_raw: res.frames });
    console.log(JSON.stringify({ ...sum, long: longs.slice(0, 12) }));
  }
  fs.writeFileSync(path.join(process.env.OUT || __dirname, `${label}-${W}x${H}.json`), JSON.stringify({ rows, errs: errs.slice(0, 40) }) + '\n');
  console.log('errors', JSON.stringify(errs.slice(0, 10)));
  await b.close(); srv.close();
})();
