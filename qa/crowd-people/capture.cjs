// Crowd people evidence (owner 2026-11-21: "the crowd is just geometric figures"). Real app, real renderer, 402x690.
//   python3 -m http.server <port>   (repo root), then:  node qa/crowd-people/capture.cjs <port> <tag> [cases]
// cases (comma list, default all): street,underground,docks,boxing_club,championship,regional + the fixed VIEWS
//   venue cases: a watched fight in that venue (crowd as the fight camera shows it);
//   close: the Docks circle from inside, camera 1.65 m high about 2.5 m from the front row (every sector shown);
//   close_street, club_crowd, seated_championship, seated_regional: the same kind of fixed view in other venues (VIEWS below).
// Writes qa/crowd-people/<tag>-<case>.webp and prints draw calls / triangles of the frame.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [port = '18761', tag = 'after', list = 'street,underground,docks,boxing_club,championship,regional,close,close_street,club_crowd,seated_championship,seated_regional'] = process.argv.slice(2);
// Fixed views (arena-set coordinates, every sector shown): camera at angle a / radius r / height h, looking at angle la / radius lr / height lh.
const VIEWS = { close: { venue: 'docks', a: 1.9, r: .6, h: 1.65, la: 2.02, lr: 3.1, lh: 1.35 }, close_street: { venue: 'street', a: 4.4, r: .5, h: 1.65, la: 4.5, lr: 3.0, lh: 1.3 },
  club_crowd: { venue: 'boxing_club', hide: true, a: 2.3, r: .3, h: 1.65, la: 2.4, lr: 3.2, lh: 1.2 }, seated_championship: { venue: 'championship', hide: true, a: -1.3, r: .3, h: 2.3, la: -1.2, lr: 4.4, lh: .4 }, seated_regional: { venue: 'regional', hide: true, a: 3.5, r: .5, h: 1.85, la: 3.44, lr: 4.3, lh: .45 } };
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
      const view = VIEWS[c], venue = view ? view.venue : c;
      await p.evaluate(id => { try { ringfighterGame.close?.(); } catch { } const rg = window.ringfighterGame; const r = rg.store.gameAction({ type: 'venue', venueId: id }); if (r.ok) rg.apply?.(); app.engine.fightOptions = { seed: 74 }; rg.startFight({ watch: true, rounds: 1, roundSeconds: 60, restSeconds: 0 }); }, venue);
      await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 600000 });
      // advance the fight clock without drawing until the round runs (software WebGL is slow)
      await p.evaluate(async () => { const e = app.engine, r = e.renderer.render; e.renderer.render = () => { }; try { for (let n = 0; n < 4000; n++) { const m = e.arena.fightView.match; if (m.phase === 'round' && m.time > 2) break; if (!e.isPlaying || e.cameraDirector?.holdsClock) { e.isPlaying = true; e.cameraDirector?.skipIntro?.(); await new Promise(q => setTimeout(q, 20)); continue; } e.animTime += 1 / 60; e.arena.update(e.animTime); } } finally { e.renderer.render = r; e.isPlaying = false; } });
      let info;
      if (view) {
        info = await p.evaluate(v => { // e.g. close: inside the Docks circle at r = 0.6, eye level 1.65 m, about 2.5 m from the front row (r = 3.1)
          const e = app.engine, set = e.world.arena.children.find(n => n.userData.arenaSet), g = set, cam = e.camera; set.updateMatrixWorld(true);
          const at = g.localToWorld(new THREE.Vector3(Math.sin(v.a) * v.r, v.h, Math.cos(v.a) * v.r)), look = g.localToWorld(new THREE.Vector3(Math.sin(v.la) * v.lr, v.lh, Math.cos(v.la) * v.lr));
          e.world.update(e.animTime, 'fight'); const hook = e.scene.onBeforeRender; e.scene.onBeforeRender = function (...q) { hook?.apply(this, q); set.traverse(n => { if (n.name.startsWith('Arena set sector')) n.visible = true; }); }; // the venue hook culls the sectors facing the camera
          const fv = e.arena.fightView, actors = [...Object.values(fv.coaches).map(x => x.root), fv.referee?.root].filter(Boolean), shown = actors.map(x => x.visible); if (v.hide) actors.forEach(x => { x.visible = false; });
          cam.position.copy(at); cam.lookAt(look); cam.updateMatrixWorld(true); e.renderer.render(e.scene, cam); e.scene.onBeforeRender = hook; actors.forEach((x, i) => { x.visible = shown[i]; });
          const i = e.renderer.info.render; return { calls: i.calls, triangles: i.triangles, url: e.canvas.toDataURL('image/png') };
        }, view);
        const png = path.join(OUT, `${tag}-${c}.png`); fs.writeFileSync(png, Buffer.from(info.url.split(',')[1], 'base64')); toWebp(png); delete info.url;
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
