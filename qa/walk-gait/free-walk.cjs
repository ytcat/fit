// Walk-gait QA (agent/walk-gait), browser: the real free walk on a phone (Chromium, 402x690, touch), the Fighter driven by
// a real touch on the stick (CDP touch events -> pointer events), the game's own frame stepped at 30 fps by this script.
// Records gait metrics (gait-metrics.cjs) and pictures from four QA cameras round the Fighter (side, front, 3/4, behind).
// usage: ROOT=<checkout to serve> OUT=<dir> node qa/walk-gait/free-walk.cjs
//   env PLACE=oldtown (start) ; SPEEDS=walk,fast (walk = stick at 90 % ~2.0 m/s, fast = full stick, the brisk pace 3.44 m/s)
//   env FRAMES=12 (frames per cycle in the sequence) ; GIF=1 also writes the side view of every frame for a clip
//   prints a JSON summary; writes OUT/<speed>-<view>-<i>.png, OUT/metrics.json
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { grab, gait } = require('./gait-metrics.cjs');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), OUT = path.resolve(process.env.OUT || path.join(__dirname, 'run'));
const PLACE = process.env.PLACE || 'oldtown', SPEEDS = (process.env.SPEEDS || 'walk,fast').split(','), NF = +(process.env.FRAMES || 12);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
server.listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 402, height: 690 }, hasTouch: true, deviceScaleFactor: 1 }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.freewalk.time.v1', 'day'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk, null, { timeout: 300000 });
  await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]') || ringfighterGame.store.current(), null, { timeout: 120000 });
  await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); if (d) { d.querySelector('input').value = 'Gait QA'; d.querySelector('button[type=submit]').click(); } });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => { if (!d.classList.contains('free-walk')) d.close(); }));
  await p.evaluate(id => FreeWalk.open({ start: id }), PLACE);
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
  await p.waitForTimeout(1000);
  await p.evaluate(() => FreeWalk.qa.view()); // the longest open street from here: walk along it
  // the script steps the walk: the engine's loop no longer calls it
  await p.evaluate(src => {
    const R = app.engine.fightIQDemo; window.__qa = { R, frame: R.frame, grab: eval('(' + src + ')') }; R.frame = () => { };
    const T = THREE; window.__qa.V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    window.__qa.cam = new T.PerspectiveCamera(30, 402 / 690, .1, 200);
  }, grab.toString().replace(/V\(T(, )?/g, 'window.__qa.V('));
  const step = n => p.evaluate(n => { const q = window.__qa, rows = []; for (let i = 0; i < n; i++) { q.frame(1 / 30); q.t = (q.t || 0) + 1 / 30; const r = q.grab(q.R.rig, THREE, +q.t.toFixed(4)), g = q.R.town.grid; for (const f of r.feet) { f.gh = g.height(f.heel[0], f.heel[2]); f.gb = g.height(f.ball[0], f.ball[2]); } rows.push(r); } return rows; }, n);
  // four views round the Fighter, from his facing; the picture as PNG data
  const shoot = (views) => p.evaluate(views => {
    const q = window.__qa, c = q.R.rig, e = app.engine, cv = e.renderer.domElement, out = {};
    const hips = c.joints.hips.getWorldPosition(q.V()), fy = q.R.turn, D = 6.2;
    for (const [name, a] of Object.entries(views)) {
      const yaw = fy + a; q.cam.aspect = cv.width / cv.height; q.cam.updateProjectionMatrix();
      q.cam.position.set(hips.x + Math.sin(yaw) * D, c.root.position.y + 1.15, hips.z + Math.cos(yaw) * D); q.cam.lookAt(hips.x, c.root.position.y + 1.02, hips.z);
      e.renderer.render(q.R.town.scene, q.cam); out[name] = cv.toDataURL('image/png');
    }
    return out;
  }, views);
  const save = (name, url) => fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  const VIEWS = { side: Math.PI / 2, front: 0, q34: Math.PI / 4 + .15, behind: Math.PI };
  const box = await p.$eval('.fw-stick', e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width * .32 }; });
  const cdp = await ctx.newCDPSession(p), touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const res = { root, place: PLACE, speeds: {} }, all = [];
  await step(15);
  for (const sp of SPEEDS) {
    const k = sp === 'walk' ? .9 * .86 + .14 : 1; // stickInput: deadzone 0.14
    await touch('touchStart', box.x, box.y); for (let i = 1; i <= 6; i++) { await touch('touchMove', box.x, box.y - box.r * k * i / 6); }
    const analog = await p.evaluate(() => window.__qa.R.analog.slice());
    const t0 = await p.evaluate(() => window.__qa.t || 0);
    let rows = await step(sp === 'fast' ? 75 : 60); // speed up (and, held full, the brisk pace after 0.8 s)
    const t1 = await p.evaluate(() => window.__qa.t);
    rows = rows.concat(await step(60)); // steady
    const g = gait(rows, { from: t1 + .1, to: t1 + 2, ground: (x, z) => 0 });
    // the sequence: NF frames over one cycle (two steps)
    const cyc = g.strideM / Math.max(.3, g.speed), every = Math.max(1, Math.round(cyc * 30 / NF)), frames = [];
    for (let i = 0; i < NF; i++) { rows = rows.concat(await step(every)); const pics = await shoot(VIEWS); for (const [v, u] of Object.entries(pics)) save(`${sp}-${v}-${String(i).padStart(2, '0')}`, u); frames.push(rows[rows.length - 1].t); }
    if (process.env.GIF) for (let i = 0; i < 45; i++) { rows = rows.concat(await step(1)); const pics = await shoot({ side: VIEWS.side, q34: VIEWS.q34 }); save(`${sp}-clip-side-${String(i).padStart(3, '0')}`, pics.side); save(`${sp}-clip-q34-${String(i).padStart(3, '0')}`, pics.q34); }
    await touch('touchEnd');
    rows = rows.concat(await step(45)); // the stop
    const tEnd = rows[rows.length - 1].t;
    res.speeds[sp] = { analog, steady: g, start: gait(rows, { from: t0, to: t1 + .3 }), stop: gait(rows, { from: tEnd - 1.6, to: tEnd }), whole: gait(rows, {}), cycleS: +cyc.toFixed(3), frameStep: every, frames };
    all.push(...rows.map(r => ({ ...r, speedName: sp })));
    // the standing pose after the stop
    const pics = await shoot(VIEWS); for (const [v, u] of Object.entries(pics)) save(`${sp}-${v}-stand`, u);
  }
  res.errors = errs.slice(0, 8);
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(all));
  console.log(JSON.stringify(res, (k, v) => k === 'frames' ? undefined : v));
  await b.close(); server.close();
});
