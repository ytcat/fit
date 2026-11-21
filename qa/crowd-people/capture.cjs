// Crowd people evidence (owner 2026-11-21: "the crowd is just geometric figures"). Real app, real renderer, 402x690.
//   python3 -m http.server <port>   (repo root), then:  node qa/crowd-people/capture.cjs <port> <tag> [cases]
// cases (comma list, default all): street,underground,docks,boxing_club,championship,regional,close
//   venue cases: a watched fight in that venue (crowd as the fight camera shows it);
//   close: the Docks circle from inside, camera 1.65 m high about 2.5 m from the front row (every sector shown).
// Writes qa/crowd-people/<tag>-<case>.webp and prints draw calls / triangles of the frame.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [port = '18761', tag = 'after', list = 'street,underground,docks,boxing_club,championship,regional,close'] = process.argv.slice(2);
const OUT = __dirname, toWebp = png => { execFileSync('python3', ['-c', `from PIL import Image;Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(png.replace(/png$/, 'webp'))},quality=84)`]); fs.unlinkSync(png); };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.setDefaultTimeout(600000);
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private */ } });
    await p.goto('http://127.0.0.1:' + port + '/', { timeout: 600000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 600000 });
    await p.evaluate(() => {
      document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Crowd QA');
      setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 400);
    });
    for (const c of list.split(',')) {
      const venue = c === 'close' ? 'docks' : c;
      await p.evaluate(id => { try { ringfighterGame.close?.(); } catch { } const rg = window.ringfighterGame; const r = rg.store.gameAction({ type: 'venue', venueId: id }); if (r.ok) rg.apply?.(); app.engine.fightOptions = { seed: 74 }; rg.startFight({ watch: true, rounds: 1, roundSeconds: 60, restSeconds: 0 }); }, venue);
      await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 600000 });
      // advance the fight clock without drawing until the round runs (software WebGL is slow)
      await p.evaluate(async () => { const e = app.engine, r = e.renderer.render; e.renderer.render = () => { }; try { for (let n = 0; n < 4000; n++) { const m = e.arena.fightView.match; if (m.phase === 'round' && m.time > 2) break; if (!e.isPlaying || e.cameraDirector?.holdsClock) { e.isPlaying = true; e.cameraDirector?.skipIntro?.(); await new Promise(q => setTimeout(q, 20)); continue; } e.animTime += 1 / 60; e.arena.update(e.animTime); } } finally { e.renderer.render = r; e.isPlaying = false; } });
      let info;
      if (c === 'close') {
        info = await p.evaluate(() => { // inside the circle at r = 0.6, looking out at the front row (r = 3.1) towards +x of the arena
          const e = app.engine, set = e.world.arena.children.find(n => n.userData.arenaSet), g = set, cam = e.camera, a = 1.9; set.updateMatrixWorld(true);
          const at = g.localToWorld(new THREE.Vector3(Math.sin(a) * .6, 1.65, Math.cos(a) * .6)), look = g.localToWorld(new THREE.Vector3(Math.sin(a + .12) * 3.1, 1.35, Math.cos(a + .12) * 3.1));
          e.world.update(e.animTime, 'fight'); const hook = e.scene.onBeforeRender; e.scene.onBeforeRender = function (...q) { hook?.apply(this, q); set.traverse(n => { if (n.name.startsWith('Arena set sector')) n.visible = true; }); }; // the venue hook culls the sectors facing the camera
          cam.position.copy(at); cam.lookAt(look); cam.updateMatrixWorld(true); e.renderer.render(e.scene, cam); e.scene.onBeforeRender = hook;
          const i = e.renderer.info.render; return { calls: i.calls, triangles: i.triangles, url: e.canvas.toDataURL('image/png') };
        });
        const png = path.join(OUT, `${tag}-close.png`); fs.writeFileSync(png, Buffer.from(info.url.split(',')[1], 'base64')); toWebp(png); delete info.url;
      } else {
        info = await p.evaluate(() => { const e = app.engine; e.world.update(e.animTime, 'fight'); e.arena.fightView.pose?.(); e.renderer.render(e.scene, e.camera); const i = e.renderer.info.render; return { calls: i.calls, triangles: i.triangles }; });
        const png = path.join(OUT, `${tag}-${c}.png`); await p.screenshot({ path: png, timeout: 600000 }); toWebp(png);
      }
      const set = await p.evaluate(() => { const s = app.engine.world.arena.children.find(n => n.userData.arenaSet); let t = 0; s?.traverse(n => { if (n.isMesh) t += n.geometry.index.count / 3; }); return t; });
      console.log(c, JSON.stringify({ ...info, setTriangles: set }));
    }
    console.log('errors', JSON.stringify(errors));
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
