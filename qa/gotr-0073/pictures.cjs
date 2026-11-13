// GOTR-0073 pictures at 402x690: for each station the free camera goes round in 15 degree steps; the view in which the
// occlusion guard hides the most scenery is saved twice: guard off ("before") and on ("after"). ONLY=dummy,pads limits.
const { chromium } = require('playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8931/', SHOTS = process.env.SHOTS || __dirname, ONLY = (process.env.ONLY || 'dummy,pads,heavy,rabbit').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } });
    await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); }); await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
    await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Sight QA'; d.querySelector('button[type=submit]').click(); });
    await wait(p, () => document.querySelector('dialog.game-home[open]') && app.engine.coach?.anatomy && app.engine.occlusionGuard);
    await wait(p, () => window.StoryScenes?.playing === 'arrival', null, 180000).catch(() => {}); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(1500);
    await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="train"]').click(); }); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.getElementById('trainingDrawer')?.close?.(); window.__guard = app.engine.occlusionGuard; });
    for (const mode of ONLY) {
      await p.evaluate(m => { trainingControls.chooseTarget(m); const e = app.engine; e.cameraDirector.setLock(false, true); e.player?.setEnabled(true); e.isPlaying = true; e.viewControls.yaw = 0; e.viewControls.fit(); }, mode); await p.waitForTimeout(3000);
      await p.evaluate(() => { app.engine.isPlaying = false; });
      // which view hides the most? (computed directly: place the camera, run the guard)
      const best = await p.evaluate(() => { const e = app.engine, v = e.viewControls, g = window.__guard; let best = { n: -1, yaw: 0 }; const rows = [];
        for (let k = 0; k < 24; k++) { v.yaw = -k * Math.PI / 12; v.apply(); e.world.update(e.animTime, e.arena.mode); e.scene.updateMatrixWorld(true); g.release(); const n = g.update(); const names = [...g.hidden.values()].map(x => x.item.node.name || x.item.node.type); rows.push(k * 15 + ':' + n); const score = n + (names.some(x => /hanging/i.test(x)) ? 100 : 0); if (score > best.n) best = { n: score, yaw: v.yaw, names: [...new Set(names)] }; }
        g.release(); v.yaw = best.yaw; v.apply(); e.lastRenderStamp = null; return { ...best, rows: rows.join(' ') }; });
      console.log(mode, JSON.stringify(best));
      await p.evaluate(() => { const e = app.engine; window.__guard.release(); e.occlusionGuard = null; e.lastRenderStamp = null; }); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${SHOTS}/before-402x690-${mode}-orbit.png`, timeout: 300000 });
      await p.evaluate(() => { const e = app.engine; e.occlusionGuard = window.__guard; e.lastRenderStamp = null; }); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${SHOTS}/after-402x690-${mode}-orbit.png`, timeout: 300000 });
      await p.evaluate(() => { const v = app.engine.viewControls; v.yaw = 0; v.apply(); });
    }
  } finally { await b.close(); }
})().catch(x => { console.error(x); process.exit(1); });
