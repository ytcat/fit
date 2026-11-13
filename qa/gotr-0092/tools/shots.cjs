// GOTR-0092 evidence renderer: node qa/gotr-0092/tools/shots.cjs <plan.json> [outDir]
// Loads the game (APP_URL, default http://127.0.0.1:8613/), builds the cast with StoryCast.rig, and renders each frame of the plan
// offscreen with the game's own renderer (neutral backdrop, studio light). Frames are written as PNG; sheet.py composes them.
// plan: { size: [w, h], frames: [{ name, who: ['lion' | 'fang' | ...], at?: [[x, z, ry], ...], pose: 'stand' | 'talk' | 'walk' | 'guard' |
//         { move, ph }, t?, cam: { yaw, look: [x, y, z], dist, fov?, lift? } }] }
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const URL = process.env.APP_URL || 'http://127.0.0.1:8613/';
(async () => {
  const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), out = process.argv[3] || path.join(__dirname, '..', 'frames');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (['error'].includes(m.type())) console.log('CONSOLE', m.text().slice(0, 300)); });
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast && window.DreamPose, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.engine.fightIQDemo = { frame() {} }; });
  const stats = await p.evaluate(async plan => {
    const e = app.engine, T = THREE, r = e.renderer, [W, H] = plan.size, scene = new T.Scene(), res = {};
    scene.background = new T.Color('#9fabb9').convertSRGBToLinear();
    scene.add(new T.HemisphereLight(0xe4ecff, 0x7a6450, .8)); const sun = new T.DirectionalLight(0xfff1de, 1.9); sun.position.set(2.2, 4, 4.5); scene.add(sun); const rim = new T.DirectionalLight(0xc6d8ff, .7); rim.position.set(-3, 3, -4); scene.add(rim);
    const floor = new T.Mesh(new T.CircleGeometry(5, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x858c96, roughness: .95 })); scene.add(floor);
    const rigOf = id => { if (id === 'lion' || id === 'rabbit') { const c = e.coach.species === id ? e.coach : e.roster.get(id); window.StoryCast.outfit(c, 'kit'); return c; } const t0 = performance.now(), c = StoryCast.rig(id, e); res['build_' + id] = res['build_' + id] || Math.round(performance.now() - t0); return c; };
    const count = c => { let m = 0, n = 0; c.root.traverse(o => { let v = o.visible, q = o; while (v && q.parent && q !== c.root) { q = q.parent; v = q.visible; } if (o.isMesh && v) { m++; const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { meshes: m, triangles: Math.round(n) }; };
    const rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const cam = new T.PerspectiveCamera(30, W / H, .05, 50), buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
    const frames = [];
    for (const f of plan.frames) {
      for (const o of [...scene.children]) if (o.userData.rigRoot) scene.remove(o);
      const rigs = f.who.map((id, i) => { const c = rigOf(id); c.root.parent?.remove(c.root); scene.add(c.root); c.root.userData.rigRoot = true; c.root.visible = true; c.root.scale.set(-1, 1, 1); const at = f.at?.[i] || [(i - (f.who.length - 1) / 2) * 1.0, 0, 0]; c.root.position.set(at[0], 0, at[1]); c.root.rotation.set(0, at[2] || 0, 0); window.DreamPose.reset(c); return c; });
      for (const c of rigs) c.root.traverse(o => { if (o.isMesh && o.userData.qaHidden) { o.visible = true; delete o.userData.qaHidden; } if (o.isMesh && f.hide?.some(h => (o.name || '').includes(h)) && o.visible) { o.visible = false; o.userData.qaHidden = true; } });
      const pose = f.pose || 'stand', t1 = f.t ?? 2;
      for (let k = 0; k <= 40; k++) { const t = t1 - (40 - k) / 30; rigs.forEach((c, i) => {
        const P = Array.isArray(pose) ? pose[i] : pose;
        if (P && typeof P === 'object') { if (P.move === 'guard') c.update(t, 'guard', 'one_two', { simulationTime: t, keepFaceClear: true, guardCover: 1 }); else c.update(P.ph * 1.22, P.move, 'one_two', { simulationTime: t, keepFaceClear: true, guardCover: 1, power: 1.15, recoil: 0, advance: 0, contactDrive: 0 }); window.DreamPose.reset(c); }
        else window.DreamPose.civil(c, { t, dt: 1 / 30, dist: P === 'walk' ? t * 1.25 : 0, walk: P === 'walk' ? 1 : 0, talk: P === 'talk' ? (f.talkAmount ?? 1) : 0, arms: f.arms || (P === 'talk' ? { R: 'open' } : {}), look: f.look || { yaw: 0, pitch: 0 } });
        if (P === 'talk' && f.talkAmount != null) window.StoryCast.talk(c, f.talkAmount);
        if (P === 'walk') { c.root.position.z = (f.at?.[i]?.[1] || 0); }
      }); }
      const C = f.cam, look = new T.Vector3(...C.look), d = C.dist; cam.fov = C.fov || 30; cam.aspect = W / H; cam.updateProjectionMatrix();
      cam.position.set(look.x + Math.sin(C.yaw) * d, look.y + (C.lift ?? d * .06), look.z + Math.cos(C.yaw) * d); cam.lookAt(look);
      r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(); r.render(scene, cam); const info = { calls: r.info.render.calls, triangles: r.info.render.triangles }; r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0);
      frames.push({ name: f.name, url: cv.toDataURL('image/png'), info, rigs: rigs.map(count) });
    }
    res.frames = frames; return res;
  }, plan);
  for (const f of stats.frames) { fs.writeFileSync(path.join(out, f.name + '.png'), Buffer.from(f.url.split(',')[1], 'base64')); console.log(f.name, JSON.stringify(f.info), JSON.stringify(f.rigs)); }
  for (const [k, v] of Object.entries(stats)) if (k !== 'frames') console.log(k, v);
  await b.close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
