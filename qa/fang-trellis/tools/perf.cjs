// node perf.cjs film|fight [low] : the same frame rendered with the code head and with the authored head, interleaved in one page
// (so the shared machine's load hits both alike): ms per render (synced with a 1-pixel read), draw calls, triangles, GPU memory.
const { open } = require('./serve.cjs');
(async () => {
  const [what, q] = process.argv.slice(2), { p, close } = await open();
  await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); const r = app.engine.renderer, render = r.render.bind(r); r.render = (sc, cam) => { if (cam?.isPerspectiveCamera && !r.getRenderTarget() && !window.__hold) { window.__cam = cam; window.__sc = sc; } return render(sc, cam); }; });
  if (what === 'film') {
    if (q) await p.evaluate(q => DreamScenes.quality(q), q);
    await p.evaluate(() => StoryScenes.play('dream_market_robbery', { onDone: () => { }, onBuy: () => true }));
    await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
    await p.evaluate(() => StoryCast.market.head.ready(20000)); await p.evaluate(() => DreamScenes.seek(11.5)); await p.waitForTimeout(3000); await p.evaluate(() => DreamScenes.seek(11.5)); await p.waitForTimeout(1500);
  } else {
    await p.evaluate(() => { const e = app.engine; window.__restore = StoryCast.asOpponent(e, 'fang'); try { ringfighterGame.store.gameAction({ type: 'venue', venueId: 'street' }); ringfighterGame.apply(); } catch { } ringfighterGame.startFight({ rounds: 1, roundSeconds: 90, restSeconds: 5, watch: true, seed: 4321 }); GameVenues.apply(e, 'street', 'en'); setInterval(() => { if (!e.arena?.fightView?.ringless) GameVenues.apply(e, 'street', 'en'); }, 500); });
    await p.waitForFunction(() => app.engine.arena?.fightView?.match?.phase === 'round' && app.engine.arena.fightView.ringless, null, { timeout: 300000 });
    await p.evaluate(() => StoryCast.market.head.ready(20000)); await p.waitForTimeout(3000);
  }
  await p.evaluate(n => { window.__rounds = n; }, +process.env.ROUNDS || 6);
  const res = await p.evaluate(async () => {
    window.__hold = true; const r = app.engine.renderer, sc = window.__sc, cam = window.__cam, c = StoryCast.rig('fang', app.engine), H = StoryCast.market.head, px = new Uint8Array(4), out = { off: [], on: [] }, info = {};
    const once = () => { const t = performance.now(); r.render(sc, cam); r.getContext().readPixels(0, 0, 1, 1, 6408, 5121, px); return performance.now() - t; };
    for (const m of ['off', 'on']) { H.on(c, m === 'on'); once(); once(); r.info.reset(); once(); info[m] = { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures }; }
    out.bare = []; const grp = c.joints.head.getObjectByName('Fang: authored head');
    for (let k = 0; k < (+window.__rounds || 6); k++) for (const m of ['off', 'on', 'bare']) { H.on(c, m !== 'off'); grp.visible = m !== 'bare'; once(); for (let j = 0; j < 3; j++) out[m].push(once()); }
    grp.visible = true; info.bare = {};
    H.on(c, true); window.__hold = false;
    const st = a => { a.sort((x, y) => x - y); return { medianMs: +a[a.length >> 1].toFixed(1), meanMs: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) }; };
    return { size: [r.domElement.width, r.domElement.height], off: { ...info.off, ...st(out.off) }, on: { ...info.on, ...st(out.on) }, bare: st(out.bare) };
  });
  console.log(what, q || 'auto', JSON.stringify(res));
  await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
