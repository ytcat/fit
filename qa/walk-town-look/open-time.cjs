// Walk town look: where the time goes between FreeWalk.open() and the first visible frame (integrator review: 28 s in
// SwiftShader). A timeline of the open: the map script's download, every street model's download and parse, the kit wait,
// the build's own steps (map, sets, walkable, warm-up), the first frame; main-thread long tasks (> 50 ms) in each phase.
// Also the loading cover's text while it waits (it must show progress), and a second open (the parked town).
//   node qa/walk-town-look/open-time.cjs <out dir> <tag> [phone|pc]   env ROOT=<tree> DPR=<n>
const { chromium, devices } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'run', size = process.argv[4] || 'phone';
const view = size === 'pc' ? { width: 1366, height: 768 } : { width: 402, height: 690 }, dpr = +(process.env.DPR || (size === 'pc' ? 1 : 3));
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const result = { tag, size, dpr, load: require('os').loadavg()[0], errors: [] };
  try {
    const phone = size !== 'pc';
    const p = await b.newPage({ viewport: view, deviceScaleFactor: dpr, isMobile: phone, hasTouch: phone, userAgent: phone ? devices['iPhone 13'].userAgent : undefined });
    p.setDefaultTimeout(900000);
    p.on('pageerror', e => result.errors.push(String(e).slice(0, 300)));
    if (process.env.QA_SYNC) await p.addInitScript(() => { window.__QA_SYNC = 1; });
    if (process.env.QA_NOTEXT) await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.free-walk .fw-notice{visibility:hidden!important}'; document.head.append(st); }); });
    if (process.env.QA_WARM) await p.addInitScript(w => { window.__QA_WARM = w; }, process.env.QA_WARM);
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.freewalk.time.v1', 'day'); } catch { } });
    await p.goto(`http://localhost:${server.address().port}/`, { timeout: 900000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk);
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Walk QA'); });
    await p.waitForTimeout(3000); // the page's own start-up settles
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    const openOnce = () => p.evaluate(() => new Promise(res => {
      const t0 = performance.now(), ev = [], at = () => Math.round(performance.now() - t0), mark = (k, extra) => ev.push({ t: at(), k, ...(extra || {}) });
      const longs = []; let po = null; try { po = new PerformanceObserver(l => { for (const e of l.getEntries()) longs.push({ t: Math.round(e.startTime - t0), ms: Math.round(e.duration) }); }); po.observe({ entryTypes: ['longtask'] }); } catch { }
      const wrap = (obj, k, name) => { if (!obj?.[k] || obj[k].__qa) return; const f = obj[k]; obj[k] = function (...a) { mark(name + ' start'); const r = f.apply(this, a); if (r?.then) r.then(() => mark(name + ' end'), () => mark(name + ' fail')); else mark(name + ' end'); return r; }; obj[k].__qa = f; };
      wrap(window.FreeWalkTown, 'prepare', 'prepare'); wrap(window.StorySets, 'ready', 'kit'); wrap(window.FreeWalkTown, 'build', 'build'); wrap(window.StoryCast, 'outfit', 'outfit'); wrap(window.DreamPose, 'reset', 'pose reset');
      const status0 = JSON.stringify(window.CityAssets?.status?.() || {}); let last = status0, lastNote = '';
      const notes = [];
      const timer = setInterval(() => {
        const s = JSON.stringify(window.CityAssets?.status?.() || {}); if (s !== last) { last = s; mark('models', { status: JSON.parse(s) }); }
        const n = document.querySelector('.free-walk .fw-notice'); const txt = n && !n.hidden ? n.textContent : ''; if (txt !== lastNote) { lastNote = txt; notes.push({ t: at(), text: txt }); }
      }, 50);
      let first = null, rafs = 0, anims = null; const tick = () => { rafs++; if (first === null) requestAnimationFrame(tick); }; requestAnimationFrame(tick); setTimeout(() => { try { anims = document.getAnimations().map(a => (a.effect?.target?.className || a.effect?.target?.tagName || '?') + ':' + (a.animationName || a.transitionProperty || a.constructor.name)).slice(0, 20); } catch { } }, 6000);
      // the engine draws the walk's first frame itself as soon as the mode is installed: catch that frame (and time the
      // renderer's part of it); QA_SYNC=1 also waits for the GPU right after the build (how much work the build queued)
      const E = app.engine, rr = E.renderer, rend = rr.render;
      rr.render = function (...a) { const t = performance.now(); const r = rend.apply(this, a); if (!this.__firstDone) { this.__firstDone = true; mark('first render', { ms: Math.round(performance.now() - t) }); } return r; };
      if (window.__QA_SYNC) { const b0 = FreeWalkTown.build; FreeWalkTown.build = function (...a) { const r = b0.apply(this, a); const t = performance.now(), px = new Uint8Array(4), gl = rr.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); mark('gpu sync after build', { ms: Math.round(performance.now() - t) }); FreeWalkTown.build = b0; return r; }; }
      let inst = null; Object.defineProperty(E, 'fightIQDemo', { configurable: true, get: () => inst, set: v => { inst = v; if (v && v.d && v.frame && !v.__early) { v.__early = true; const f = v.frame; v.frame = d => { v.frame = f; mark('engine frame start'); const t = performance.now(); f(d); mark('engine frame end', { ms: Math.round(performance.now() - t) }); }; } } });
      FreeWalk.open({ start: 'oldtown', look: 'morning' });
      const poll = () => {
        const run = app.engine.fightIQDemo, s = run ? FreeWalk.snapshot() : null; // (the snapshot counts the walkable cells: not while waiting)
        if (run && run.d && s && !s.busy && run.frame && !run.__wrapped) { // (run.d: the walk itself, not the stub that holds the engine while it loads)
          const orig = run.frame; run.__wrapped = true; mark('ready');
          run.frame = d => {
            const ri = app.engine.renderer.info, pr = ri.programs?.length || 0, tx = ri.memory.textures, ge = ri.memory.geometries, a = performance.now();
            mark('first frame start'); orig(d); first = at(); mark('first frame end', { ms: Math.round(performance.now() - a), programs: (ri.programs?.length || 0) - pr, textures: ri.memory.textures - tx, geometries: ri.memory.geometries - ge, calls: ri.render.calls }); run.frame = orig; run.__wrapped = false;
            requestAnimationFrame(() => {
              clearInterval(timer); po?.disconnect(); rr.render = rend; delete rr.__firstDone; delete E.fightIQDemo; E.fightIQDemo = inst;
              for (const o of [window.FreeWalkTown, window.StorySets, window.StoryCast, window.DreamPose]) for (const k of ['prepare', 'ready', 'build', 'outfit', 'reset']) if (o?.[k]?.__qa) o[k] = o[k].__qa;
              const res2 = performance.getEntriesByType('resource').filter(e => e.startTime >= t0 - 5 && /\.glb|gloryland-map/.test(e.name)).map(e => ({ name: e.name.split('/').pop().split('?')[0], start: Math.round(e.startTime - t0), end: Math.round(e.responseEnd - t0), kb: Math.round((e.encodedBodySize || e.transferSize || 0) / 1024) }));
              res({ rafs, anims, openToFirstFrame: first, shownAt: at(), events: ev, longTasks: longs, longTotal: longs.reduce((n, l) => n + l.ms, 0), resources: res2, notes, modelsBefore: JSON.parse(status0), build: s.town?.build || null, buildMs: s.perf?.buildMs });
            });
          };
        } else setTimeout(poll, 20);
      };
      poll();
    }));
    result.open1 = await openOnce();
    result.programs = await p.evaluate(() => { const ps = app.engine.renderer.info.programs || []; const by = {}; for (const q of ps) { const k = q.name || '?'; by[k] = (by[k] || 0) + 1; } return { n: ps.length, by, keys: ps.map(q => q.name + ' ' + String(q.cacheKey).replace(/,+/g, ',').slice(0, 600)) }; });
    console.log('programs', JSON.stringify({ ...result.programs, keys: undefined }));
    console.log('open1', JSON.stringify({ rafs: result.open1.rafs, anims: result.open1.anims, first: result.open1.openToFirstFrame, build: result.open1.build, events: result.open1.events.filter(e => e.k !== 'models'), res: result.open1.resources, long: result.open1.longTotal, notes: result.open1.notes }));
    await p.evaluate(() => FreeWalk.close('quiet'));
    await p.waitForTimeout(1500);
    result.open2 = await openOnce();
    console.log('open2', JSON.stringify({ first: result.open2.openToFirstFrame, build: result.open2.build }));
  } catch (x) { result.errors.push('runner: ' + String(x).slice(0, 400)); console.error(x); }
  fs.writeFileSync(path.join(out, `open-${tag}-${size}.json`), JSON.stringify(result, null, 1));
  console.log('errors', JSON.stringify(result.errors.slice(0, 5)));
  await b.close(); server.close();
});
