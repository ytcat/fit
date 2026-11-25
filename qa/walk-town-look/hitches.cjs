// Walk town look: hitches while walking (integrator review: "no frame > 150 ms after the walk is visible during a normal walk
// Old Town -> Market Row -> Docks"). Real app, real renderer, real rAF frames. The Fighter is carried along the town's own
// street route (gym -> Hazel's stall -> the Docks quay) STEP metres a frame (default 1.2 m: ~10x a walking pace per frame,
// so every streaming event of the walk - sets coming into range, detailed trees and lamps swapping, new tiles, walkers -
// happens in fewer frames than on a phone: a worst case).
// Per frame: the walk's whole frame on the main thread (step + town update + renderer.render submission; SwiftShader
// rasterises in the GPU process, so a stall waiting for it shows here too), the rAF interval, and new GPU programs /
// textures / geometries (a first-time compile or upload while walking is the hitch this checks for).
// Also: the time from FreeWalk.open to the first visible frame, and the same for a second open in the same session.
//   node qa/walk-town-look/hitches.cjs <out dir> <tag> [phone|pc]   env ROOT=<tree> STEP=<m> DPR=<n> WALKQ=<level>
const { chromium, devices } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'run', size = process.argv[4] || 'phone';
const view = size === 'pc' ? { width: 1366, height: 768 } : { width: 402, height: 690 }, dpr = +(process.env.DPR || (size === 'pc' ? 1 : 3)), STEP = +(process.env.STEP || 1.2);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const result = { tag, size, dpr, step: STEP, errors: [] };
  try {
    const phone = size !== 'pc';
    const p = await b.newPage({ viewport: view, deviceScaleFactor: dpr, isMobile: phone, hasTouch: phone, userAgent: phone ? devices['iPhone 13'].userAgent : undefined });
    p.setDefaultTimeout(900000);
    p.on('pageerror', e => result.errors.push(String(e).slice(0, 300)));
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.freewalk.time.v1', 'day'); } catch { } });
    await p.goto(`http://localhost:${server.address().port}/`, { timeout: 900000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk);
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Walk QA'); });
    await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    // open: from the call to the first frame drawn with the cover gone; then the first 40 frames
    const openOnce = () => p.evaluate(() => new Promise(res => {
      const t0 = performance.now(); let first = null; const frames = [];
      FreeWalk.open({ start: 'oldtown', look: 'morning' });
      const poll = () => {
        const run = app.engine.fightIQDemo, s = FreeWalk.snapshot();
        if (run && run.d && s && !s.busy && run.frame && !run.__wrapped) { // (run.d: the walk itself, not the stub that holds the engine while it loads)
          const orig = run.frame, r = app.engine.renderer.info; run.__wrapped = true;
          run.frame = d => { const a = performance.now(), pr = r.programs?.length || 0, tx = r.memory.textures; orig(d); const ms = performance.now() - a; if (first === null) first = a - t0; frames.push({ ms: +ms.toFixed(1), programs: (r.programs?.length || 0) - pr, textures: r.memory.textures - tx }); if (frames.length >= 40) { run.frame = orig; run.__wrapped = false; res({ openToFirstFrame: Math.round(first), first40: frames, build: s.town?.build || null, buildMs: s.perf.buildMs }); } };
        } else setTimeout(poll, 20);
      };
      poll();
    }));
    result.open1 = await openOnce();
    console.log('open1', JSON.stringify({ ...result.open1, first40: undefined }));
    await p.evaluate(l => FreeWalk.qa.town?.quality?.(l), process.env.WALKQ === undefined ? 3 : +process.env.WALKQ);
    // the walk: gym -> Hazel's stall -> the Docks quay along the town's street route, STEP m a frame
    result.walk = await p.evaluate(STEP => new Promise(res => {
      const town = FreeWalk.qa.town, S = town.S, T = town.targets, route = (a, b) => { const r = town.map.route({ x: a.x / S, z: a.z / S }, { x: b.x / S, z: b.z / S }); return r ? r.map(([x, z]) => ({ x: x * S, z: z * S })) : [a, b]; };
      const start = town.views?.gym || T.bruno, legs = [...route(start, T.market_stall), ...route(T.market_stall, T.docks_quay)], pts = [];
      for (let i = 0; i < legs.length - 1; i++) { const a = legs[i], b2 = legs[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b2.x - a.x, b2.z - a.z) / STEP)); for (let k = 0; k < n; k++) pts.push({ x: a.x + (b2.x - a.x) * k / n, z: a.z + (b2.z - a.z) * k / n }); }
      const run = app.engine.fightIQDemo, orig = run.frame, r = app.engine.renderer.info, frames = []; let i = 0, last = performance.now();
      // the town's own per-frame work (traffic, people, birds, look, sets, trees and lamps) timed apart from the drawing
      let upd = 0; const tu = town.update; town.update = (...a) => { const t0 = performance.now(); tu(...a); upd += performance.now() - t0; };
      run.frame = d => {
        const q = pts[Math.min(i, pts.length - 1)], nx = pts[Math.min(i + 3, pts.length - 1)];
        if (!FreeWalk.qa.teleport(q.x, q.z)) { const n = town.grid.nearest(q.x, q.z); if (n) FreeWalk.qa.teleport(n.x, n.z); }
        if (Math.hypot(nx.x - q.x, nx.z - q.z) > .1) FreeWalk.qa.yaw = Math.atan2(q.x - nx.x, q.z - nx.z);
        const a = performance.now(), pr = r.programs?.length || 0, tx = r.memory.textures, ge = r.memory.geometries;
        orig(d);
        const now = performance.now();
        frames.push({ i, ms: +(now - a).toFixed(1), update: +upd.toFixed(1), gap: +(a - last).toFixed(1), programs: (r.programs?.length || 0) - pr, textures: r.memory.textures - tx, geometries: r.memory.geometries - ge, calls: r.render.calls, tris: r.render.triangles });
        last = now; i++; upd = 0;
        if (i >= pts.length) { run.frame = orig; town.update = tu; res({ points: pts.length, metres: +(pts.length * STEP).toFixed(0), frames }); }
      };
    }), STEP);
    // the same walk opened again in this session (the parked town)
    await p.evaluate(() => FreeWalk.close('quiet'));
    await p.waitForTimeout(1500);
    result.open2 = await openOnce();
    console.log('open2', JSON.stringify({ ...result.open2, first40: undefined }));
    // summary
    const sum = fr => { const ms = fr.map(f => f.ms).sort((a, b) => a - b), med = ms[ms.length >> 1], up = fr.map(f => f.update || 0).sort((a, b) => a - b); return { frames: fr.length, updateMedian: up[up.length >> 1], updateLongest: up[up.length - 1], median: med, p90: ms[Math.floor(ms.length * .9)], longest: ms[ms.length - 1], over50: ms.filter(v => v > 50).length, over100: ms.filter(v => v > 100).length, over150: ms.filter(v => v > 150).length, spikesOverMedian100: ms.filter(v => v > med + 100).length, spikesOverMedian250: ms.filter(v => v > med + 250).length, newPrograms: fr.reduce((n, f) => n + Math.max(0, f.programs), 0), newTextures: fr.reduce((n, f) => n + Math.max(0, f.textures), 0), framesWithNewPrograms: fr.filter(f => f.programs > 0).map(f => f.i ?? -1).slice(0, 20) }; };
    result.summary = { walk: sum(result.walk.frames), open1First40: sum(result.open1.first40), open2First40: sum(result.open2.first40) };
    console.log(JSON.stringify(result.summary));
  } catch (x) { result.errors.push('runner: ' + String(x).slice(0, 400)); console.error(x); }
  fs.writeFileSync(path.join(out, `hitches-${tag}-${size}.json`), JSON.stringify(result));
  console.log('errors', JSON.stringify(result.errors.slice(0, 5)));
  await b.close(); server.close();
});
