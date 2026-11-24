// Chapter 1 motion QA (ch1-motion): plays a film frame by frame at a fixed step in Chromium and measures every actor's
// feet, hips, gaze, shoulders and walking direction; optional pictures at given times.
// usage: SCENE=dream_opening T0=6.8 T1=16 DT=0.0333 SHOTS="7.4,8.2" OUT=qa/ch1-motion/x node qa/ch1-motion/measure.cjs
//   ROOT=<dir to serve> (default: this checkout) ; QUALITY=high|low ; WALK=1 adds ?walkPrototype=1 (the native walk handoff at 15.6 s)
//   CAM=x,y,z,lx,ly,lz[,fov] pictures from a QA camera instead of the film's (same frame)
//   prints a summary per actor and writes OUT.json (per-frame rows) and OUT-<t>.png
// Metrics (world metres, per frame at DT):
//   slide      horizontal travel of a foot's lowest contact point (ball or heel) while it stays within 1.5 cm of the ground
//              in two consecutive frames ; slideMax = the largest per-frame move, slideSum = the total over the window
//   hop        largest per-frame rise of the hips while walking or standing (a root or pelvis jump) ; dropMax the largest fall
//   air        frames with both feet more than 3 cm above the ground under them (airborne), air while still = frozen in the air
//   dirs       gaze (head), shoulders (chest), pelvis, feet (mean of both) and travel yaw; agree = max spread between
//              head/chest/feet/travel while walking (radians)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..'));
const SCENE = process.env.SCENE || 'dream_opening', T0 = +(process.env.T0 ?? 6.8), T1 = +(process.env.T1 ?? 16), DT = +(process.env.DT || 1 / 30);
const SHOTS = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number), OUT = path.resolve(process.env.OUT || path.join(__dirname, 'run'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 1 });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.addInitScript(q => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', q); sessionStorage.clear(); } catch { } }, process.env.QUALITY || 'high');
  await p.goto(`http://localhost:${server.address().port}/${process.env.WALK ? '?walkPrototype=1' : ''}`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.CityAssets && window.MarketProps, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  await p.evaluate(() => CityAssets.ready(120000, Object.keys(CityAssets.FILES)));
  await p.evaluate(q => DreamScenes.quality(q), process.env.QUALITY || 'high');
  await p.evaluate(id => StoryScenes.play(id, { onDone: () => { }, onBuy: () => true }), SCENE);
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase && DreamScenes.debug.phase !== 'load' && DreamScenes.debug.frame, null, { timeout: 300000 });
  // take the clock: the engine's own loop stops driving the film, this script steps it
  await p.evaluate(() => { const r = DreamScenes.debug; r.__frame = r.frame; r.frame = () => { }; DreamScenes.seek(0); });
  await p.evaluate(([t0]) => { const r = DreamScenes.debug; DreamScenes.seek(Math.max(0, t0 - 1.5)); for (let i = 0; i < 45; i++) { r.ack = 999; r.__frame(1 / 30); } }, [T0]);
  const rows = [], shots = SHOTS.slice().sort((a, b) => a - b);
  let t = await p.evaluate(() => { const r = DreamScenes.debug; r.__c0 = r.clock - r.t; return r.t; }); // t: film time, or (in the player's walk, where the film clock stops) the film time it would be
  while (t < T1 - 1e-6) {
    const next = shots.length ? Math.min(T1, shots[0]) : T1, n = Math.max(1, Math.round((next - t) / DT));
    const chunk = await p.evaluate(([n, dt]) => {
      const r = DreamScenes.debug, C = window.DreamCore, out = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
      const scene0 = r.scene0 || (r.set?.objects?.city?.bus ? C.withCity(C.variant(r.id)) : C.variant(r.id));
      for (let i = 0; i < n; i++) {
        r.ack = 999; r.__frame(dt); if (r.closed) break; // conversations do not wait for a tap here
        const row = { t: +(r.clock - r.__c0).toFixed(4), film: +r.t.toFixed(4), phase: r.phase, shot: r.shot, a: {} };
        for (const [k, c] of Object.entries(r.rigs)) {
          const R = c.root; if (!R.parent) continue; R.updateMatrixWorld(true); const j = c.joints, hidden = (() => { for (let o = R; o; o = o.parent) if (!o.visible) return true; return false; })();
          const yawOf = o => { const a = o.localToWorld(V(0, 0, 0)), f = o.localToWorld(V(0, 0, 1)); return Math.atan2(f.x - a.x, f.z - a.z); };
          const feet = ["L", "R"].map(s => { const f = j["foot" + s], ball = f.localToWorld(V(0, -.12, .13)), heel = f.localToWorld(V(0, -.12, -.065)); return { ball: ball.toArray().map(v => +v.toFixed(4)), heel: heel.toArray().map(v => +v.toFixed(4)), g: +C.groundAt(scene0, ball.x, ball.z, r.t).toFixed(3), gh: +C.groundAt(scene0, heel.x, heel.z, r.t).toFixed(3), yaw: +Math.atan2(ball.x - heel.x, ball.z - heel.z).toFixed(4) }; });
          const hips = j.hips.getWorldPosition(V()), head = j.head.getWorldPosition(V());
          row.a[k] = { vis: !hidden, x: +R.position.x.toFixed(4), y: +R.position.y.toFixed(4), z: +R.position.z.toFixed(4), ry: +R.rotation.y.toFixed(4), hips: hips.toArray().map(v => +v.toFixed(4)), head: head.toArray().map(v => +v.toFixed(4)), yHead: +yawOf(j.head).toFixed(4), yChest: +yawOf(j.chest).toFixed(4), yHips: +yawOf(j.hips).toFixed(4), feet };
        }
        // the dog walker of the street film (street-life.js): her feet, the dog's paws, the leash
        const life = r.life || null; row.cam = r.camera ? r.camera.position.toArray().map(v => +v.toFixed(3)) : null; if (life?.probe) row.life = life.probe();
        out.push(row);
      }
      return out;
    }, [n, DT]);
    rows.push(...chunk); t = chunk.length ? chunk[chunk.length - 1].t : T1;
    if (shots.length && t >= shots[0] - DT / 2) { const s = shots.shift(); await p.evaluate(cam => { const r = DreamScenes.debug; r.__frame(0); if (cam) { const [x, y, z, lx, ly, lz, fov] = cam.split(',').map(Number); r.camera.position.set(x, y, z); r.camera.lookAt(lx, ly, lz); if (fov) { r.camera.fov = fov; r.camera.updateProjectionMatrix(); } app.engine.renderer.render(r.scene, r.camera); } }, process.env.CAM || ''); /* CAM: a QA close-up of the same frame */ await p.screenshot({ path: `${OUT}-${s.toFixed(2)}.png` }); }
    if (!chunk.length) break;
  }
  fs.writeFileSync(OUT + '.json', JSON.stringify({ scene: SCENE, root, dt: DT, errors, rows }));
  console.log(JSON.stringify(summary(rows), null, 0).replace(/\},"/g, '},\n"'));
  if (errors.length) console.log('page errors', errors.slice(0, 5));
  await b.close(); server.close();
});

const { summary } = require('./metrics.cjs');
