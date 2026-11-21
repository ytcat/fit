// Rourke evidence renderer: node qa/rourke/tools/docks.cjs [outDir]
// Serves the repo, loads the game at 402x690 in headless Chromium, makes Rourke the Opponent (StoryCast.asOpponent), stages the
// fight in the Docks (ringless venue), and captures, from the game's own renderer: the game view (page screenshot) and a closer
// full-body render of the live fight scene, once with Rourke in guard and once mid-punch. Writes PNGs and prints a JSON summary
// (kit visibility, hand parts, triangles). Convert to .webp with qa/rourke/tools/webp.py.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..', '..'), OUT = process.argv[2] || path.join(__dirname, '..', 'frames');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    p.on('pageerror', e => console.log('PAGEERROR', e.message));
    await p.goto(url, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.docks && window.ringfighterGame?.startFight && window.GameVenues, null, { timeout: 300000 });
    await p.evaluate(() => {
      setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300);
      const e = app.engine; window.__restore = StoryCast.asOpponent(e, 'rourke');
      try { ringfighterGame.store.gameAction({ type: 'venue', venueId: 'docks' }); ringfighterGame.apply(); } catch { /* the adventure normally does this */ }
      ringfighterGame.startFight({ rounds: 1, roundSeconds: 90, restSeconds: 5, watch: true, seed: 1234 });
      GameVenues.apply(e, 'docks', 'en'); window.__venue = setInterval(() => { if (!e.arena?.fightView?.ringless) GameVenues.apply(e, 'docks', 'en'); }, 500);
    });
    try { await p.waitForFunction(() => app.engine.arena?.fightView?.match?.phase === 'round' && app.engine.arena.fightView.ringless, null, { timeout: 200000 }); }
    catch (x) { console.log('STATE', JSON.stringify(await p.evaluate(() => { const v = app.engine.arena?.fightView; return { mode: app.engine.targetMode, phase: v?.match?.phase, ringless: v?.ringless?.id || null, set: app.engine.world?.arena?.children?.find(n => n.userData.arenaSet)?.userData?.arenaSet || null }; }))); throw x; }
    const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 20, n0, { timeout: 280000 });
    const summary = {};
    for (const [name, want] of [['guard', 'guard'], ['punch', 'punch']]) {
      // wait for the moment in the live bout, then render it twice from the same frame state
      const shot = await p.evaluate(want => new Promise((resolve, reject) => {
        const e = app.engine, view = e.arena.fightView, m = view.match, rk = StoryCast.rig('rourke', e), t0 = performance.now();
        const ok = () => { const f = m.fighters.rabbit, a = f.action; if (f.down || m.phase !== 'round') return false; if (want === 'guard') return !a || (!a.attack && a.move !== 'step'); if (!a) return false; const ph = (m.time - a.start) / a.duration; return a.attack && ['jab', 'cross', 'hook', 'rear_hook', 'uppercut', 'rear_uppercut'].includes(a.move) && ph > .3 && ph < .6; };
        const tick = () => {
          if (performance.now() - t0 > 240000) { reject(new Error('timeout waiting for ' + want)); return; }
          if (!ok()) { requestAnimationFrame(tick); return; }
          const T = THREE, r = e.renderer, W = 402, H = 690, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding;
          const cam = new T.PerspectiveCamera(34, W / H, .05, 80), at = rk.root.getWorldPosition(new T.Vector3()), opp = e.coach.root.getWorldPosition(new T.Vector3());
          const toward = opp.clone().sub(at).setY(0).normalize(), side = new T.Vector3(-toward.z, 0, toward.x);
          cam.position.copy(at).addScaledVector(toward, 2.6).addScaledVector(side, 2.2).setY(1.45); cam.lookAt(at.x, 1.0, at.z);
          const kit = []; rk.root.traverse(o => { let v = o.visible, q = o; while (v && q.parent && q !== rk.root) { q = q.parent; v = q.visible; } if (v && o.isMesh && !o.userData.storyPart && o !== rk.skin) kit.push(o.name || o.geometry?.type || 'mesh'); });
          const parts = n => ['L', 'R'].map(s => rk.joints['hand' + s].children.some(o => o.visible && o.name === n));
          const buf = new Uint8Array(W * H * 4); r.setRenderTarget(rt); r.render(e.scene, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
          const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
          for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0);
          const a = m.fighters.rabbit.action;
          resolve({ url: cv.toDataURL('image/png'), move: a?.move || 'none', phase: a ? +((m.time - a.start) / a.duration).toFixed(2) : 0, opponent: e.arena.rabbit === rk, ringless: !!view.ringless, venue: view.ringless?.id,
            gloves: [rk.gloveMeshes.L.visible, rk.gloveMeshes.R.visible], shorts: rk.shorts.visible, visibleNonStoryMeshes: kit, bareHands: parts('Bare hand'), wraps: parts('Hand wraps'), triangles: r.info.render.triangles });
        };
        requestAnimationFrame(tick);
      }), want);
      fs.writeFileSync(path.join(OUT, `docks-${name}-close.png`), Buffer.from(shot.url.split(',')[1], 'base64'));
      await p.screenshot({ path: path.join(OUT, `docks-${name}-game.png`) });
      delete shot.url; summary[name] = shot; console.log(name, JSON.stringify(shot));
    }
    console.log('SUMMARY', JSON.stringify(summary));
    await p.evaluate(() => window.__restore?.());
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
