// Walk town look (owner 2026-11-25: "the graphics are terrible ... blurry ... make everything more realistic").
// Real app, real renderer. Opens the free walk at each story spot, turns the camera to the spot's front and saves a
// screenshot, plus the renderer numbers of the held frame (draw calls, triangles, textures, geometries, render ms) and
// the walk's build time.
//   node qa/walk-town-look/shots.cjs <out dir> <tag> [size=phone|pc] [time=morning|evening|night] [spots=bruno,busstop,...]
//   env DPR=<device scale factor> (default 3 on phone, 1 on pc), GFX=low (the light path), ROOT=<repo dir to serve>
const { chromium, devices } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..'));
const out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'shot', size = process.argv[4] || 'phone', time = process.argv[5] || 'morning';
const spots = (process.argv[6] || 'gym,busstop,market,otto,docks').split(',');
// the walk's own views of the story places (town.views); a tree without them (the baseline) stands at the story targets
const TARGET = { gym: 'bruno', busstop: 'oldtown', market: 'market_stall', otto: 'otto', docks: 'docks_quay' };
// the same camera side for a tree without views: the street side of each front (the blocks' turns on the map)
const YAW = { gym: -.02, busstop: .23, market: -.06, otto: 3.08, docks: 0 };
const LEVEL = process.env.WALKQ === undefined ? (process.env.GFX === 'low' ? 1 : 3) : +process.env.WALKQ;
const view = size === 'pc' ? { width: 1366, height: 768 } : { width: 402, height: 690 }, dpr = +(process.env.DPR || (size === 'pc' ? 1 : 3));
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const result = { tag, size, dpr, time, gfx: process.env.GFX || 'high', errors: [], spots: {} };
  try {
    const phone = size !== 'pc', iphone = devices['iPhone 13'];
    const p = await b.newPage({ viewport: view, deviceScaleFactor: dpr, isMobile: phone, hasTouch: phone, userAgent: phone ? iphone.userAgent : undefined });
    p.setDefaultTimeout(600000);
    p.on('pageerror', e => result.errors.push(String(e).slice(0, 300)));
    p.on('console', m => { if (m.type() === 'error' || /free walk|walk town/.test(m.text())) result.errors.push(m.text().slice(0, 300)); });
    await p.addInitScript(t => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.freewalk.time.v1', t === 'night' ? 'night' : 'day'); } catch { } }, time);
    const t0 = Date.now();
    await p.goto(`http://localhost:${server.address().port}/${process.env.GFX === 'low' ? '?gfx=low' : ''}`, { timeout: 600000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk, null, { timeout: 600000 });
    result.bootMs = Date.now() - t0;
    await p.evaluate(() => {
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      if (!app.engine.career.store.current()) app.engine.career.store.create('Walk QA');
    });
    await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    const o0 = Date.now();
    const look = time === 'night' ? 'night' : time;
    await p.evaluate(look => FreeWalk.open({ start: 'oldtown', look }), look);
    await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy && FreeWalk.qa.town, null, { timeout: 600000 });
    result.openMs = Date.now() - o0;
    await p.evaluate(l => FreeWalk.qa.town.quality?.(l), LEVEL); // SwiftShader is slow: pin the look's level (real devices adapt)
    // detail that streams in (film sets, props): give it the time it needs on a cold load
    await p.evaluate(() => FreeWalk.qa.town?.settled?.(120000)).catch(() => null);
    for (const id of spots) {
      const spot = await p.evaluate(([id, tid, yaw]) => {
        const town = FreeWalk.qa.town, v = town.views?.[id] || null, t = v || town.targets[tid || id];
        if (!t) return null;
        if (!FreeWalk.qa.teleport(t.x, t.z)) { const n = town.grid.nearest(t.x, t.z); if (!n || !FreeWalk.qa.teleport(n.x, n.z)) return null; }
        if (v && Number.isFinite(v.yaw)) FreeWalk.qa.yaw = v.yaw; else if (Number.isFinite(yaw)) FreeWalk.qa.yaw = yaw; else FreeWalk.qa.view();
        FreeWalk.qa.walk(0, 0, .2);
        return { x: t.x, z: t.z, yaw: v?.yaw ?? null };
      }, [id, TARGET[id], YAW[id]]);
      if (!spot) { result.spots[id] = { missing: true }; continue; }
      await p.evaluate(() => FreeWalk.qa.town?.settled?.(60000)).catch(() => null);
      await p.waitForTimeout(1500);
      const file = path.join(out, `${tag}-${size}-${time}-${id}.png`);
      await p.screenshot({ path: file });
      const row = await p.evaluate(() => {
        const town = FreeWalk.qa.town, e = app.engine, r = e.renderer, cam = FreeWalk.qa.camera, gl = r.getContext(), px = new Uint8Array(4), rt = [];
        for (let k = 0; cam && k < 6; k++) { const t0 = performance.now(); if (r.shadowMap.enabled) r.shadowMap.needsUpdate = true; r.render(town.scene, cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); rt.push(performance.now() - t0); }
        rt.sort((a, b) => a - b); const i = r.info, s = FreeWalk.snapshot(); if (!cam) { rt.push(NaN, NaN, NaN, NaN); }
        return { calls: cam ? i.render.calls : s.perf.calls, triangles: cam ? i.render.triangles : s.perf.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs?.length, renderMs: +rt[3].toFixed(1), renderMin: +rt[0].toFixed(1), pixelRatio: r.getPixelRatio(), drawingBuffer: [r.domElement.width, r.domElement.height], shadow: r.shadowMap.enabled, env: !!town.scene.environment, buildMs: s.perf.buildMs, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, town: town.look?.() || null };
      });
      row.spot = spot; result.spots[id] = row; console.log(id, JSON.stringify(row));
    }
  } catch (x) { result.errors.push('runner: ' + String(x).slice(0, 400)); console.error(x); }
  fs.writeFileSync(path.join(out, `${tag}-${size}-${time}.json`), JSON.stringify(result, null, 1));
  console.log('errors', JSON.stringify(result.errors.slice(0, 8)));
  await b.close(); server.close();
});
