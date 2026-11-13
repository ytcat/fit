// GOTR-0073 browser evidence: every station and the fight at 402x690 (tall phone), side lock off and on.
// For the default view and 12 orbit steps it counts the scenery meshes that real ray casts (camera -> head, chest, hips, hands, knees, feet
// of each figure, target centre) hit, with the occlusion guard switched off ("before") and on ("after"), and saves a
// before/after picture of the most blocked view per station. Static server at APP_URL (default :8931). SHOTS=dir.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8931/', SHOTS = process.env.SHOTS || __dirname, ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const probe = () => { const e = app.engine, g = e.occlusionGuard || window.__guard, list = []; e.scene.updateMatrixWorld(true);
  for (const root of [e.world.gym, e.world.arena]) root.traverseVisible(n => { if (n.isMesh && n.layers.mask !== 0) list.push(n); });
  const rc = new THREE.Raycaster(), from = e.camera.getWorldPosition(new THREE.Vector3()), names = new Set();
  for (const pt of g.points()) { const d = pt.clone().sub(from), far = d.length(); rc.set(from, d.normalize()); rc.far = far - .32; for (const h of rc.intersectObjects(list, false)) names.add((h.object.name || h.object.type) + (h.instanceId !== undefined ? '#' + h.instanceId : '')); }
  return { blocked: [...names], hidden: g.hidden.size, points: g.points().length, lock: e.cameraDirector.mode, yaw: +e.viewControls.yaw.toFixed(2) }; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), report = {};
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', x => errors.push(x.message));
    await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); }); await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
    await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Sight QA'; d.querySelector('button[type=submit]').click(); });
    await wait(p, () => document.querySelector('dialog.game-home[open]') && app.engine.coach?.anatomy && app.engine.occlusionGuard);
    await wait(p, () => window.StoryScenes?.playing === 'arrival', null, 180000).catch(() => {}); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(1500);
    await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="train"]').click(); }); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.getElementById('trainingDrawer')?.close?.(); window.__guard = app.engine.occlusionGuard; });
    const guardOn = on => p.evaluate(on => { const e = app.engine; if (on) e.occlusionGuard = window.__guard; else { window.__guard.release(); e.occlusionGuard = null; } e.lastRenderStamp = null; }, on);
    const settle = async (ms = 900) => { await p.evaluate(() => { app.engine.lastRenderStamp = null; }); await p.waitForTimeout(ms); };
    for (const mode of ['none', 'heavy', 'dummy', 'pads', 'speed', 'rope', 'rabbit', 'fight'].filter(m => !ONLY.length || ONLY.includes(m))) {
      if (mode === 'fight') { await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="fight"]').click(); }); await wait(p, () => document.querySelector('dialog.fight-dialog[open] [data-fight-preset="quick"]'), null, 60000); await p.evaluate(() => document.querySelector('dialog.fight-dialog[open] [data-fight-preset="quick"]').click()); await wait(p, () => app.engine.arena?.fightView, null, 120000); await p.waitForTimeout(1500); await p.evaluate(() => app.engine.cameraDirector.skipIntro()); await p.waitForTimeout(1500); }
      else await p.evaluate(m => { trainingControls.chooseTarget(m); const e = app.engine; if (m !== 'rope') e.player?.setEnabled(true); e.isPlaying = true; }, mode);
      await p.waitForTimeout(2500);
      for (const lock of [false, true]) {
        await p.evaluate(l => { const e = app.engine; e.cameraDirector.setLock(l, true); e.viewControls.yaw = 0; e.viewControls.fit(); e.isPlaying = true; }, lock); await p.waitForTimeout(2500);
        await p.evaluate(() => { app.engine.isPlaying = false; }); // hold the pose: before and after compare the same frame
        const key = mode + (lock ? ' lock' : ' free'), row = report[key] = { views: 0, blockedBefore: 0, blockedAfter: 0, defaultBefore: null, defaultAfter: null, blockers: [] }; let worst = null;
        const steps = lock ? 1 : 12; // the side lock owns the camera: one view; the free camera goes round in 30 degree steps
        for (let k = 0; k < steps; k++) {
          if (k) await p.evaluate(() => { app.engine.viewControls.rotate(Math.PI / 6 / .01 * .01); });
          await guardOn(false); await settle(700); const before = await p.evaluate(probe);
          await guardOn(true); await settle(700); const after = await p.evaluate(probe);
          row.views++; if (before.blocked.length) row.blockedBefore++; if (after.blocked.length) row.blockedAfter++; for (const n of before.blocked) { const s = n.replace(/#\d+$/, ''); if (!row.blockers.includes(s)) row.blockers.push(s); }
          if (!k) { row.defaultBefore = before.blocked.length; row.defaultAfter = after.blocked.length; row.defaultHidden = after.hidden; }
          assert.deepEqual(after.blocked, [], `${key} view ${k}: still blocked with the guard on`);
          if (before.blocked.length && (!worst || before.blocked.length > worst.n)) worst = { n: before.blocked.length, k, yaw: before.yaw };
        }
        if (worst && SHOTS) { // picture of the most blocked view, guard off and on
          await p.evaluate(y => { const v = app.engine.viewControls; v.yaw = y; v.apply(); }, worst.yaw);
          await guardOn(false); await settle(900); await p.screenshot({ path: `${SHOTS}/before-402x690-${key.replace(' ', '-')}.png`, timeout: 300000 });
          await guardOn(true); await settle(900); await p.screenshot({ path: `${SHOTS}/after-402x690-${key.replace(' ', '-')}.png`, timeout: 300000 }); row.picture = `view ${worst.k}`;
        } else if (SHOTS && !lock) { await guardOn(true); await settle(600); await p.screenshot({ path: `${SHOTS}/after-402x690-${key.replace(' ', '-')}.png`, timeout: 300000 }); }
        await p.evaluate(() => { const v = app.engine.viewControls; v.yaw = 0; v.apply(); app.engine.isPlaying = true; });
        console.log(key, JSON.stringify(row));
      }
      await p.evaluate(() => app.engine.cameraDirector.setLock(false, true));
    }
    assert.equal(errors.filter(x => !/GL Driver|ReadPixels/.test(x)).length, 0, errors.join('\n'));
    console.log(JSON.stringify(report)); console.log('PASS no scenery between the camera and the figures with the guard on');
  } finally { await b.close(); }
})().catch(x => { console.error(x); process.exit(1); });
