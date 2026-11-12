// GOTR-0065 ringless venues: numbers and screenshots of a fight in the Street, Basement and Dockside Hangar.
// node qa/gotr-0065/browser.cjs <outDir> <tag>   (static server on :8177 from the repo root)
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8177/', [out, tag = 'after'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp] of [['phone', { width: 402, height: 690 }], ['desk', { width: 1366, height: 768 }]]) {
      const p = await b.newPage({ viewport: vp }), errors = []; p.on('pageerror', e => errors.push(e.message));
      const ready = () => p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 300000 });
      await p.goto(URL, { timeout: 300000 }); await ready();
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Ring QA'); });
      await p.reload({ timeout: 300000 }); await ready();
      for (const venue of ['street', 'underground', 'docks', 'championship']) {
        await p.evaluate(v => { ringfighterGame.close(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.engine.career.store.gameAction({ type: 'venue', venueId: v }); ringfighterGame.apply(); ringfighterGame.startFight({ watch: true, roundSeconds: 60 }); }, venue);
        await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 300000 });
        await p.waitForTimeout(6000);
        const r = await p.evaluate(() => { const v = app.engine.arena.fightView, vis = n => { let o = n; while (o) { if (!o.visible) return false; o = o.parent; } return true; }; let ringParts = 0; v.ring.traverse(n => { if (n.isMesh && vis(n) && !n.userData.ground) ringParts++; }); const set = app.engine.world.arena.children.find(c => c.userData.arenaSet); const pos = Object.values(v.coaches).map(c => c.root.getWorldPosition(new THREE.Vector3())); return { ringParts, referee: vis(v.referee.root), ringless: !!v.ringless, feetY: pos.map(q => +q.y.toFixed(3)), apart: +pos[0].distanceTo(pos[1]).toFixed(2), phase: v.match.phase, ceiling: set?.userData.cameraCeiling, radius: set?.userData.cameraRadius, calls: app.engine.renderer?.info.render.calls, tris: app.engine.renderer?.info.render.triangles }; });
        console.log(tag, name, venue, JSON.stringify(r));
        if (tag === 'after') { const ringless = venue !== 'championship'; assert.equal(r.ringless, ringless, venue); assert.equal(r.ringParts === 0, ringless, venue + ' ring hardware'); assert.equal(r.referee, !ringless, venue + ' referee'); assert.ok(r.apart > .5 && r.apart < 3.4, 'fighters stay inside the circle'); }
        if (out && venue !== 'championship') await p.screenshot({ path: `${out}/${tag}-${name}-${venue}.png`, timeout: 300000 });
      }
      console.log(tag, name, 'errors', JSON.stringify(errors)); assert.deepEqual(errors, []);
      await p.close();
    }
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
