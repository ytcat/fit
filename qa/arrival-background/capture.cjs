// Arrival background (owner 2026-11-22): film frames, renderer numbers and a duplicate-prop probe for one scene.
// usage: ROOT=<repo dir to serve> SCENE=dream_opening TIMES="7.3,8.5" QUALITY=high|low node qa/arrival-background/capture.cjs <outdir> [tag]
//   writes <outdir>/<tag>-<quality>-<i>.png and <outdir>/<tag>-<quality>.json (per time: calls, triangles, frame ms, probe)
//   PROBES="name:x,z,r,ymin;..." counts drawn vertices of every mesh inside each world box (a duplicate shows as two sources)
//   NOCITY=1 aborts every street GLB request (the generated fallback street)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'shot';
const quality = process.env.QUALITY || 'high';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
const probes = (process.env.PROBES || 'car:-16,-2.45,2.6,0.05;tree:-6.4,-5.4,2.4,0.3').split(';').filter(Boolean).map(s => { const [name, v] = s.split(':'); const [x, z, r, y] = v.split(',').map(Number); return { name, x, z, r, y }; });
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const iphone = devices['iPhone 13'];
  const p = await b.newPage({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 690) }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: iphone.userAgent });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  if (process.env.NOCITY) await p.route(/\/assets\/street\/.*\.glb/, r => r.abort());
  await p.addInitScript(q => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', q); } catch { } }, quality);
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.CityAssets, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  if (!process.env.NOCITY) console.log('city', JSON.stringify(await p.evaluate(() => CityAssets.ready(120000, Object.keys(CityAssets.FILES)).then(() => CityAssets.status()))));
  await p.evaluate(q => DreamScenes.quality(q), quality);
  await p.evaluate(id => StoryScenes.play(id, { onDone: () => { }, onBuy: () => true }), process.env.SCENE || 'dream_opening');
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(([n0, n]) => app.engine.renderer.info.render.frame >= n0 + n, [n0, n], { timeout: 120000 }); };
  const times = (process.env.TIMES || '7.3,8.5,9.8,11,12.3').split(',').filter(Boolean).map(Number), rows = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (process.env.SETTLE) for (let u = Math.max(0, t - 1.5); u < t; u += .1) { await p.evaluate(u => DreamScenes.seek(u), u); await frames(1); }
    await p.evaluate(t => DreamScenes.seek(t), t); await frames(3);
    const file = path.join(out, `${tag}-${quality}-${String(i).padStart(2, '0')}.png`); await p.screenshot({ path: file });
    const row = await p.evaluate(async ([t, probes]) => {
      const s = DreamScenes.stats() || {}, run = DreamScenes.debug, scene = run.scene;
      // hold the shot and time 24 frames (the film is re-seeked to t every frame)
      const ms = await new Promise(res => { const d = []; let last = 0, n = 0; const step = now => { DreamScenes.seek(t); if (last) d.push(now - last); last = now; if (++n <= 24) requestAnimationFrame(step); else res(d); }; requestAnimationFrame(step); });
      ms.sort((a, b) => a - b);
      const v = new THREE.Vector3(), found = {};
      scene.updateMatrixWorld(true);
      scene.traverse(o => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return; for (let q = o; q; q = q.parent) if (!q.visible) return;
        const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 60000));
        for (const pr of probes) { let n = 0; for (let k = 0; k < pos.count; k += step) { v.fromBufferAttribute(pos, k); if (o.isSkinnedMesh) o.boneTransform?.(k, v); v.applyMatrix4(o.matrixWorld); if (v.y > pr.y && Math.hypot(v.x - pr.x, v.z - pr.z) < pr.r) n += step; } if (n) { const key = pr.name; (found[key] ||= {})[(o.name || '(unnamed)') + (o.parent?.name ? ' < ' + o.parent.name : '')] = n; } }
      });
      return { t, calls: s.calls, triangles: s.triangles, shot: s.shot, quality: s.quality, shadows: s.shadows, city: s.city, msMedian: +ms[ms.length >> 1].toFixed(1), msP90: +ms[Math.floor(ms.length * .9)].toFixed(1), probe: found };
    }, [t, probes]);
    rows.push(row); console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(out, `${tag}-${quality}.json`), JSON.stringify({ root, scene: process.env.SCENE || 'dream_opening', quality, errors, rows }, null, 1));
  if (errors.length) console.log('page errors', errors);
  await b.close(); server.close();
});
