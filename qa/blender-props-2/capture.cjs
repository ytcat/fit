// Blender props round 2 (2026-11-24): film frames, close-ups and renderer numbers for one scene, before/after (qa/blender-props/capture.cjs
// with CAM entries aligned to TIMES: an empty entry is the film camera). Also waits for every *Props file the served tree knows.
// usage: ROOT=<repo dir to serve> SCENE=dream_opening TIMES="7.3,8.5" QUALITY=high|low node qa/blender-props/capture.cjs <outdir> [tag]
//   WALK="right:2500,right:2500,up:2600" (dream_opening with ?walkPrototype=1): skips the intro, holds the arrow keys for each step
//   and captures after each; TIMES is ignored then.  CAM="px,py,pz|lx,ly,lz|fov;..." with TIMES of the same length: close-ups
//   (the film camera is replaced for the picture; the renderer numbers are of that view).
//   writes <outdir>/<tag>-<quality>-<i>.png and <outdir>/<tag>-<quality>.json (per shot: calls, triangles, set meshes)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'shot';
const quality = process.env.QUALITY || 'high', scene = process.env.SCENE || 'dream_opening';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const iphone = devices['iPhone 13'];
  const p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: iphone.userAgent });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  if (process.env.NOCITY) await p.route(/\/assets\/street\/.*\.glb/, r => r.abort());
  await p.addInitScript(q => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', q); } catch { } }, quality);
  const walk = (process.env.WALK || '').split(',').filter(Boolean).map(s => { const [k, ms] = s.split(':'); return { k, ms: +ms }; });
  await p.goto(`http://localhost:${server.address().port}/${walk.length ? '?walkPrototype=1' : ''}`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.CityAssets, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  if (!process.env.NOCITY) console.log('city', JSON.stringify(await p.evaluate(() => CityAssets.ready(120000, Object.keys(CityAssets.FILES)).then(() => CityAssets.status()))));
  await p.evaluate(q => DreamScenes.quality(q), quality);
  await p.evaluate(id => StoryScenes.play(id, { onDone: () => { }, onBuy: () => true }), scene);
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(([n0, n]) => app.engine.renderer.info.render.frame >= n0 + n, [n0, n], { timeout: 120000 }); };
  const cams = (process.env.CAM || '').split(';').map(v => { if (!v) return null; const [a, l, f] = v.split('|'); return { pos: a.split(',').map(Number), look: l.split(',').map(Number), fov: +(f || 40) }; });
  const shot = async i => {
    const cam = cams[i];
    const row = await p.evaluate(cam => new Promise(res => {
      const run = DreamScenes.debug, c = run.camera, r = app.engine.renderer;
      const grab = () => { const s = DreamScenes.stats() || {}; return { calls: s.calls, triangles: s.triangles, phase: s.phase, quality: s.quality, shadows: s.shadows, set: s.set, city: s.city }; };
      if (!cam) { requestAnimationFrame(() => requestAnimationFrame(() => res(grab()))); return; }
      // a fixed close-up: render that view ourselves on top of the film (same scene, same renderer state)
      const k = new THREE.PerspectiveCamera(cam.fov, c.aspect, .05, 400); k.position.fromArray(cam.pos); k.lookAt(new THREE.Vector3(...cam.look));
      window.__qaCam = k; const orig = r.render.bind(r);
      r.render = (sc, _c) => orig(sc, window.__qaCam || _c);
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { const info = r.info.render; res({ calls: info.calls, triangles: info.triangles, closeup: cam }); })));
    }), cam);
    const file = path.join(out, `${tag}-${quality}-${String(i).padStart(2, '0')}.png`); await p.screenshot({ path: file });
    if (cam) await p.evaluate(() => { window.__qaCam = null; });
    return row;
  };
  const rows = [];
  if (walk.length) {
    await p.click('.dream-skip'); await p.waitForFunction(() => DreamScenes.stats()?.phase === 'walk', null, { timeout: 120000 }); await frames(20);
    rows.push({ i: 0, step: 'start', ...(await shot(0)) }); console.log(JSON.stringify(rows.at(-1)));
    for (let i = 0; i < walk.length; i++) {
      const keys = { right: 'ArrowRight', up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown' }[walk[i].k];
      await p.keyboard.down(keys); await p.waitForTimeout(walk[i].ms); await p.keyboard.up(keys); await frames(8);
      rows.push({ i: i + 1, step: walk[i], ...(await shot(i + 1)) }); console.log(JSON.stringify(rows.at(-1)));
    }
  } else {
    const times = (process.env.TIMES || '7.3,8.5,9.8,11,12.3').split(',').filter(Boolean).map(Number);
    for (let i = 0; i < times.length; i++) {
      await p.evaluate(t => DreamScenes.seek(t), times[i]); await frames(4);
      rows.push({ t: times[i], ...(await shot(i)) }); console.log(JSON.stringify(rows.at(-1)));
    }
  }
  fs.writeFileSync(path.join(out, `${tag}-${quality}.json`), JSON.stringify({ root, scene, quality, errors, rows }, null, 1));
  if (errors.length) console.log('page errors', errors);
  await b.close(); server.close();
});
