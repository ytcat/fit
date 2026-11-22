// Film frames for the paws review (GOTR-0100): node qa/paws/tools/film.cjs <outDir> <scene> [times] [outcome]
// Plays a story film (StoryScenes.play) in headless Chromium at 402x690 and saves the page at the given scene times (comma list
// of seconds; default 8 evenly spaced moments), playing 1.2 s into each moment so gestures and hand shapes settle as in the game.
// With CLOSE=<actor> it also renders a 402x690 close view of that actor's hands from the film's camera direction (same frame).
// Prints, per frame, the shape each visible paw shows.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..', '..'), [OUT, SCENE, TIMES, OUTCOME] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
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
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.StoryCast?.docks && window.DreamScenes, null, { timeout: 300000 });
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
    await p.addInitScript(() => {}); await p.evaluate(() => { window.filmRigs = () => { const e = app.engine, sc = e.coach?.root.parent, out = []; if (!sc?.isScene) return out; for (const o of sc.children) { const hL = o.getObjectByName?.('handL'), hR = o.getObjectByName?.('handR'); if (o.visible && hL && hR) out.push([o === e.coach.root ? 'fighter' : o.name.replace('Story character ', ''), { root: o, joints: { handL: hL, handR: hR } }]); } return out; }; }); // the rigs in the film's scene
    await p.evaluate(([id, outcome]) => StoryScenes.play(id, { outcome: outcome || undefined, onDone: () => { }, onBuy: () => true }), [SCENE, OUTCOME || '']);
    await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
    // every paw shape ready before the pictures (the worker builds them in the background)
    await p.evaluate(async () => { const t0 = performance.now(); await new Promise(r => setTimeout(r, 400)); while (window.Paws && Paws._pending() && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 150)); });
    const dur = await p.evaluate(() => DreamScenes.debug?.duration || window.DreamCore?.scenes?.[DreamScenes.debug?.id]?.duration || 20);
    const list = TIMES ? TIMES.split(',').map(Number) : Array.from({ length: 8 }, (_, i) => +(dur * (i + .5) / 8).toFixed(2));
    const frame = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 60000 }); };
    for (const [i, t] of list.entries()) {
      for (let u = Math.max(0, t - 1.2); u < t; u += .1) { await p.evaluate(u => DreamScenes.seek(u), u); await frame(); }
      await p.evaluate(t => DreamScenes.seek(t), t); await frame(); await new Promise(r => setTimeout(r, 120)); await p.evaluate(t => DreamScenes.seek(t), t); await frame();
      const info = await p.evaluate(() => { const out = []; for (const [k, c] of filmRigs()) { const sh = ['L', 'R'].map(s => c.joints['hand' + s].children.find(o => o.userData.paw && o.visible)?.userData.shape || '-'); out.push(k + ':' + sh.join('/')); } return out.join(' '); });
      const file = path.join(OUT, `${SCENE}-${String(i).padStart(2, '0')}-${t}.png`); await p.screenshot({ path: file }); console.log(file, info);
      if (process.env.CLOSE) {
        const url = await p.evaluate(([who, dist]) => {
          const T = THREE, e = app.engine, r = e.renderer, c = new Map(filmRigs()).get(who); if (!c) return null; const fwd = new T.Vector3(0, 0, 1).transformDirection(c.root.matrixWorld).setY(0).normalize(), side = new T.Vector3(-fwd.z, 0, fwd.x), cam0 = { position: c.root.getWorldPosition(new T.Vector3()).addScaledVector(fwd, 3).addScaledVector(side, +(window.__side || .8)).setY(1.5) };
          const W = 402, H = 690, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(W * H * 4);
          const a = c.joints.handL.getWorldPosition(new T.Vector3()), bb = c.joints.handR.getWorldPosition(new T.Vector3()), mid = a.clone().add(bb).multiplyScalar(.5), span = Math.max(.35, a.distanceTo(bb));
          const dir = cam0.position.clone().sub(mid).normalize(), cam = new T.PerspectiveCamera(30, W / H, .03, 60); cam.position.copy(mid).addScaledVector(dir, span * (+dist || 1.6) + .5); cam.lookAt(mid);
          r.setRenderTarget(rt); r.render(c.root.parent, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
          const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H); for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0); rt.dispose(); return cv.toDataURL('image/png');
        }, [process.env.CLOSE, process.env.DIST]);
        if (url) fs.writeFileSync(file.replace('.png', '-close.png'), Buffer.from(url.split(',')[1], 'base64'));
      }
    }
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
