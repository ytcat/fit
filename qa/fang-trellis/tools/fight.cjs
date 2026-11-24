// Ringless fight frames for the paws review (GOTR-0100): node qa/paws/tools/fight.cjs <outDir> [venue=street] [opponent=fang]
// Starts a watched bout in a ringless venue with a story character as the Opponent (as qa/rourke/tools/docks.cjs), waits for a
// guard moment and a punch, and saves the game view (402x690 page) plus a closer render of both fighters from the side, from the
// game's own renderer. Prints the paw shape each fighter shows (fists in a fight).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..', '..'), TAG = process.env.BEFORE ? 'before' : 'after', OUT = process.argv[2], VENUE = process.argv[3] || 'street', OPP = process.argv[4] || 'fang';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  if (process.env.BEFORE && f.includes('fang-head.glb')) { r.writeHead(404); r.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    p.on('pageerror', e => console.log('PAGEERROR', e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.docks && window.StoryCast?.market && window.ringfighterGame?.startFight && window.GameVenues, null, { timeout: 300000 });
    await p.evaluate(([venue, opp]) => {
      setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300);
      const e = app.engine; window.__restore = StoryCast.asOpponent(e, opp);
      try { ringfighterGame.store.gameAction({ type: 'venue', venueId: venue }); ringfighterGame.apply(); } catch { /* the adventure normally does this */ }
      ringfighterGame.startFight({ rounds: 1, roundSeconds: 90, restSeconds: 5, watch: true, seed: 4321 });
      GameVenues.apply(e, venue, 'en'); window.__venue = setInterval(() => { if (!e.arena?.fightView?.ringless) GameVenues.apply(e, venue, 'en'); }, 500);
    }, [VENUE, OPP]);
    await p.waitForFunction(() => app.engine.arena?.fightView?.match?.phase === 'round' && app.engine.arena.fightView.ringless, null, { timeout: 200000 });
    await p.evaluate(async () => { const t0 = performance.now(); await new Promise(r => setTimeout(r, 500)); while (window.Paws && Paws._pending() && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 150)); await StoryCast.market.head.ready(20000); });
    for (const want of ['guard', 'punch']) {
      const shot = await p.evaluate(([want, opp]) => new Promise((resolve, reject) => {
        const e = app.engine, m = e.arena.fightView.match, rk = StoryCast.rig(opp, e), t0 = performance.now();
        const ok = () => { const f = m.fighters.rabbit, a = f.action; if (f.down || m.phase !== 'round') return false; if (want === 'guard') return !a || (!a.attack && a.move !== 'step'); if (!a) return false; const ph = (m.time - a.start) / a.duration; return a.attack && ph > .35 && ph < .6; };
        const tick = () => {
          if (performance.now() - t0 > 200000) { reject(new Error('timeout ' + want)); return; }
          if (!ok()) { requestAnimationFrame(tick); return; }
          const T = THREE, r = e.renderer, W = 402, H = 690, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding;
          const cam = new T.PerspectiveCamera(30, W / H, .05, 80), a = rk.root.getWorldPosition(new T.Vector3()), o = e.coach.root.getWorldPosition(new T.Vector3()), mid = a.clone().add(o).multiplyScalar(.5), toward = o.clone().sub(a).setY(0).normalize(), side = new T.Vector3(-toward.z, 0, toward.x);
          const hd = rk.joints.head.getWorldPosition(new T.Vector3()); cam.position.copy(hd).addScaledVector(side, 1.2).addScaledVector(toward, .7).add(new T.Vector3(0, .1, 0)); cam.lookAt(hd.x, hd.y - .05, hd.z);
          const buf = new Uint8Array(W * H * 4); r.setRenderTarget(rt); r.render(e.scene, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
          const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H); for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0); rt.dispose();
          const shapes = c => ['L', 'R'].map(s => c.joints['hand' + s].children.find(q => q.visible && /Bare hand/.test(q.name))?.userData.shape || (c.gloveMeshes?.[s]?.visible ? 'glove' : '-')).join('/');
          resolve({ url: cv.toDataURL('image/png'), move: m.fighters.rabbit.action?.move || 'none', fighter: shapes(e.coach), opponent: shapes(rk), triangles: r.info.render.triangles });
        };
        requestAnimationFrame(tick);
      }), [want, OPP]);
      fs.writeFileSync(path.join(OUT, `fight-${TAG}-${want}-close.png`), Buffer.from(shot.url.split(',')[1], 'base64'));
      await p.screenshot({ path: path.join(OUT, `fight-${TAG}-${want}-game.png`) });
      const perf = await p.evaluate(async () => { const r = app.engine.renderer, d = []; let last = performance.now(), t0 = last, calls = 0, tris = 0, n = 0; await new Promise(res => { const f = () => { const q = performance.now(); d.push(q - last); last = q; calls += r.info.render.calls; tris += r.info.render.triangles; n++; if (q - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); d.sort((a, b) => a - b); return { frames: d.length, meanMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), medianMs: +d[d.length >> 1].toFixed(1), calls: Math.round(calls / n), tris: Math.round(tris / n), geos: r.info.memory.geometries, tex: r.info.memory.textures, head: !!StoryCast.rig('fang', app.engine).castHead?.on }; });
      console.log('perf', want, JSON.stringify(perf));
      delete shot.url; console.log(want, JSON.stringify(shot));
    }
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
