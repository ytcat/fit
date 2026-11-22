// Paw close-ups from the game's own renderer (GOTR-0100): node qa/paws/tools/closeup.cjs <outDir> [ids]
// ids: comma list of fighter, rabbit, pip, bruno, fang, hazel, otto, rourke (default: everyone with bare hands) and the suffix
// :wraps for the docks outfit (e.g. fighter:wraps). For each character: the rig in a plain studio scene, arms forward (palm up),
// and per hand three views (back, palm, thumb side), for the relaxed hand and the fist (rig.pawOverride; the old hands have one
// shape), plus body shots (hang, fist/point, carry/strap, hips/wave). Writes <outDir>/<id>.png (a sheet) and prints the
// triangle counts of the visible hand meshes as JSON.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..', '..'), OUT = process.argv[2] || path.join(__dirname, '..', 'frames');
const IDS = (process.argv[3] || 'fighter,fighter:wraps,pip,bruno,fang,hazel,otto,rourke').split(',');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
    await p.goto(url, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.docks && window.StoryCast?.market && window.DreamPose, null, { timeout: 300000 });
    await p.evaluate(([tile, dist, shapes]) => { setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300); window.__tile = tile; window.__dist = dist; window.__shapes = shapes; }, [+(process.env.TILE || 300), +(process.env.DIST || .62), process.env.SHAPES || 'relaxed,fist']);
    for (const spec of IDS) {
      const res = await p.evaluate(async spec => {
        const [id, mode] = spec.split(':'), T = THREE, e = app.engine, r = e.renderer, V = (x, y, z) => new T.Vector3(x, y, z);
        const c = id === 'fighter' ? e.coach : StoryCast.rig(id, e);
        if (!c) return { error: 'no rig ' + id };
        if (!c.cast) StoryCast.outfit(c, mode === 'wraps' ? 'track_wraps' : 'street');
        if (window.Paws) { for (const s of ['L', 'R']) for (const o of c.joints['hand' + s].children) if (o.userData.paw) for (const sh of Paws.shapes) Paws.request(o.userData.paw.species, sh, o.userData.paw.wraps); const t0 = performance.now(); while (Paws._pending() && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 100)); } // every shape ready (the worker builds them)
        const scene = new T.Scene(); scene.background = new T.Color(0x5b6168);
        scene.add(new T.HemisphereLight(0xdfe6ee, 0x3a332c, .75)); const key = new T.DirectionalLight(0xfff1df, 1.35); scene.add(key); scene.add(key.target); const fill = new T.DirectionalLight(0xbcd0ff, .35); scene.add(fill); scene.add(fill.target);
        const parent = c.root.parent, was = { p: c.root.position.clone(), q: c.root.quaternion.clone(), s: c.root.scale.clone() };
        scene.add(c.root); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); c.root.visible = true; DreamPose.reset(c);
        const W = window.__tile || 300, H = W, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(W * H * 4);
        const sheet = document.createElement('canvas'), cols = 6, shapes = (window.__shapes || 'relaxed,fist').split(','), rows = shapes.length + 1; sheet.width = cols * W; sheet.height = rows * H; const sx = sheet.getContext('2d'); sx.fillStyle = '#20252b'; sx.fillRect(0, 0, sheet.width, sheet.height);
        const shoot = (cam, x, y, label) => { r.setRenderTarget(rt); r.render(scene, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null); const img = sx.createImageData(W, H); for (let j = 0; j < H; j++) img.data.set(buf.subarray((H - 1 - j) * W * 4, (H - j) * W * 4), j * W * 4); sx.putImageData(img, x, y); sx.fillStyle = '#fff'; sx.font = '14px sans-serif'; sx.fillText(label, x + 6, y + 18); };
        const tris = {};
        for (const [row, shape] of shapes.entries()) {
          c.pawOverride = { L: shape, R: shape };
          for (let k = 0; k < 4; k++) DreamPose.civil(c, { t: 2 + k * .05, dt: .05, arms: { L: 'open', R: 'open' }, look: { yaw: 0, pitch: -.3 } });
          c.root.updateMatrixWorld(true); scene.updateMatrixWorld(true);
          for (const [hi, side] of ['L', 'R'].entries()) {
            const hand = c.joints['hand' + side], m = hand.matrixWorld, ex = V(), ey = V(), ez = V(); m.extractBasis(ex, ey, ez); ex.normalize(); ey.normalize(); ez.normalize();
            const centre = hand.localToWorld(V(0, -.085, 0)), distal = ey.clone().negate(), palm = ez.clone(), thumb = ex.clone().multiplyScalar(side === 'L' ? -1 : 1);
            const views = [['back', palm.clone().negate()], ['palm', palm.clone()], ['3/4', thumb.clone().multiplyScalar(.75).add(palm.clone().multiplyScalar(-.55)).add(distal.clone().multiplyScalar(-.35)).normalize()]];
            for (const [vi, [name, dir]] of views.entries()) {
              const cam = new T.PerspectiveCamera(30, 1, .02, 20); cam.position.copy(centre).addScaledVector(dir, +(window.__dist || .62)); cam.up.copy(distal.clone().negate()); cam.lookAt(centre);
              cam.updateMatrixWorld(); const cr = V().setFromMatrixColumn(cam.matrixWorld, 0), cu = V().setFromMatrixColumn(cam.matrixWorld, 1); key.position.copy(cam.position).addScaledVector(cr, -.35).addScaledVector(cu, .45); key.target.position.copy(centre); fill.position.copy(cam.position).addScaledVector(cr, .6).addScaledVector(cu, -.2); fill.target.position.copy(centre);
              shoot(cam, (hi * 3 + vi) * W, row * H, `${spec} ${side} ${shape} ${name}`);
            }
            const seen = []; hand.traverse(o => { if (o.isMesh) { let v = true, q = o; while (q && q !== hand) { v = v && q.visible; q = q.parent; } if (v) seen.push(o); } });
            tris[shape + side] = seen.map(o => ({ name: o.name, tris: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 }));
          }
        }
        // body shots: relaxed hang (walk pose), fist/point, carry/strap, hips/wave (shapes from the gestures)
        for (const [k, arms] of [{ L: 'hang', R: 'hang' }, { L: 'fist', R: 'point' }, { L: 'carry', R: 'strap' }, { L: 'hips', R: 'wave' }, { L: 'pound', R: 'pound' }, { L: 'cross', R: 'cross2' }].entries()) {
          c.pawOverride = window.Paws ? { L: Paws.shapeFor(arms.L), R: Paws.shapeFor(arms.R) } : null; // the game loop also updates the live Fighter between frames here; in films DreamPose stamps the shape every frame
          for (let q = 0; q < 8; q++) DreamPose.civil(c, { t: 3 + q * .05, dt: .05, arms, look: { yaw: 0, pitch: 0 } }); c.root.updateMatrixWorld(true);
          const cam = new T.PerspectiveCamera(26, 1, .05, 30), at = V(0, 1.2, 0); cam.position.set(k % 2 ? -1.3 : 1.3, 1.45, 3.4); cam.lookAt(at); key.position.set(1.5, 3, 3); key.target.position.copy(at); fill.position.set(-2, 1, -1); fill.target.position.copy(at);
          r.render(scene, cam); await new Promise(res => setTimeout(res, 90)); for (let q = 0; q < 2; q++) DreamPose.civil(c, { t: 3.5 + q * .05, dt: .05, arms, look: { yaw: 0, pitch: 0 } }); shoot(cam, k * W, shapes.length * H, `${spec} ${Object.values(arms).join("/")}`);
        }
        c.pawOverride = null; scene.remove(c.root); if (parent) parent.add(c.root); c.root.position.copy(was.p); c.root.quaternion.copy(was.q); c.root.scale.copy(was.s); DreamPose.reset(c); if (!c.cast) StoryCast.outfit(c, 'kit');
        return { url: sheet.toDataURL('image/png'), tris };
      }, spec);
      if (res.error) { console.log(spec, res.error); continue; }
      fs.writeFileSync(path.join(OUT, spec.replace(':', '-') + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
      console.log(spec, JSON.stringify(res.tris));
    }
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
