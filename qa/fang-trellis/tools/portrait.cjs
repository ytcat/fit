// node portrait.cjs <outDir> : Fang's story portrait with the code head and with the authored head (StoryPortraits.render),
// plus the portrait element itself on a cold start (the portrait waits for the download)
const { open, save } = require('./serve.cjs'), path = require('path');
(async () => {
  const out = process.argv[2], { p, close } = await open();
  const cold = await p.evaluate(async () => { const el = StoryPortraits.el('fang', { name: 'Fang' }); document.body.append(el); const t0 = performance.now(); while (el.dataset.kind === 'pending' && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200)); const first = el.querySelector('img')?.src || null, t1 = performance.now(), st0 = StoryCast.market.head.state(); await StoryCast.market.head.ready(60000); const t2 = performance.now(); while (el.querySelector('img')?.src === first && performance.now() - t2 < 20000) await new Promise(r => setTimeout(r, 200)); return { kind: el.dataset.kind, first, src: el.querySelector('img')?.src || null, on: !!StoryCast.rig('fang', app.engine).castHead?.on, state0: st0, state: StoryCast.market.head.state(), loadMs: Math.round(t2 - t0) }; });
  console.log('cold', cold.kind, cold.on, cold.state0, cold.state, cold.loadMs, cold.first === cold.src ? 'same' : 'refreshed'); if (cold.first) save(path.join(out, 'portrait-cold-first.png'), cold.first); if (cold.src) save(path.join(out, 'portrait-cold.png'), cold.src);
  const r = await p.evaluate(() => { const e = app.engine, c = StoryCast.rig('fang', e), H = StoryCast.market.head; H.on(c, false); const a = StoryPortraits.render(c, e); H.on(c, true); const b = StoryPortraits.render(c, e); return [a, b]; });
  save(path.join(out, 'portrait-before.png'), r[0]); save(path.join(out, 'portrait-after.png'), r[1]);
  await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
