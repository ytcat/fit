// Bus door lettering (owner 2026-11-25): film frames and close-ups of the model bus's doors while they open.
// usage: ROOT=<repo dir to serve> W=402 H=690 node qa/bus-door-text/capture.cjs <outdir> <tag>
//   film-<t>.png: the film's own camera at the given times (closed / opening / fully open / closing)
//   close-<view>-<state>.png: a fixed camera on the middle (exit) doors, the front (entry) doors and the whole kerb side,
//   with the door clip at 0 (closed), 0.65 s (opening) and 1.3 s (fully open); the cabin is shown at full detail
//   NOCITY=1: every street GLB request fails, so the film uses the generated fallback bus (dream-sets.js; its front door
//   leaves slide, the middle door is fixed); the close-ups then aim at that bus's doors (x -1.5 and 3.75 along the bus)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'shot';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const W = +(process.env.W || 402), H = +(process.env.H || 690), phone = W < 700;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage(phone ? { viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent } : { viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  if (process.env.NOCITY) await p.route(/\/assets\/street\/.*\.glb/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', 'high'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.CityAssets, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  if (!process.env.NOCITY) console.log('city', JSON.stringify(await p.evaluate(() => CityAssets.ready(120000, Object.keys(CityAssets.FILES)).then(() => CityAssets.status()))));
  await p.evaluate(() => DreamScenes.quality('high'));
  await p.evaluate(() => StoryScenes.play('dream_opening', { onDone: () => { }, onBuy: () => true }));
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(([n0, n]) => app.engine.renderer.info.render.frame >= n0 + n, [n0, n], { timeout: 120000 }); };
  const settle = async t => { for (let u = Math.max(0, t - 1.2); u < t; u += .15) { await p.evaluate(u => DreamScenes.seek(u), u); await frames(1); } await p.evaluate(t => DreamScenes.seek(t), t); await frames(3); };
  const info = { root, viewport: [W, H], errors, film: [], close: [] };
  for (const t of (process.env.TIMES || '6.9,7.3,7.6,8.4,9.9').split(',').map(Number)) {
    await settle(t);
    const file = `${tag}-film-${t.toFixed(2)}.png`; await p.screenshot({ path: path.join(out, file) });
    info.film.push({ t, file, stats: await p.evaluate(() => { const s = DreamScenes.stats() || {}; return { calls: s.calls, triangles: s.triangles, shot: s.shot }; }) });
  }
  // close-ups: the film is frozen at a time with the bus stopped; the door clip is set directly, the frame drawn with a fixed camera
  await settle(8.0);
  const views = process.env.NOCITY ? {
    middle: { pos: [-1.5, 1.35, 3.15 + 3.1], look: [-1.5, 1.25, 3.15] },  // generated bus: middle door at x -1.5, front door 3.75
    front: { pos: [3.75 - .5, 1.45, 3.15 + 3.6], look: [3.75, 1.2, 3.15] },
    oblique: { pos: [4.6, 1.7, 3.15 + 2.2], look: [-.6, 1.2, 3.0] },
    side: { pos: [0, 1.7, 3.15 + 5.6], look: [0, 1.3, 3.15] }
  } : {
    middle: { pos: [.4, 1.35, 3.15 + 3.1], look: [.4, 1.25, 3.15] },     // model x -0.4 (exit doors), relative to the wrapper
    front: { pos: [-4.49 + .5, 1.45, 3.15 + 3.6], look: [-4.49, 1.2, 3.15] }, // model x 4.49 (entry doors)
    oblique: { pos: [-1.2, 1.7, 3.15 + 2.2], look: [.6, 1.2, 3.0] },       // along the kerb side, past the front doors to the middle ones
    side: { pos: [-1.6, 1.7, 3.15 + 5.6], look: [-1.6, 1.3, 3.15] }        // the whole kerb side (the house fronts stand at z 9.4)
  };
  for (const [state, clipT] of [['closed', 0], ['opening', .65], ['open', 1.3]]) {
    for (const [view, v] of Object.entries(views)) {
      const png = await p.evaluate(([clipT, v]) => new Promise(res => requestAnimationFrame(() => {
        const run = DreamScenes.debug, scene = run.scene, r = app.engine.renderer;
        const model = scene.getObjectByName('Gloryland_Bus_12'), wrap = model ? model.parent : scene.getObjectByName('bus');
        if (model) {
          // pose the four door hinges from the asset's own clip (the film's action is overwritten only for this one frame)
          const clip = CityAssets.get('bus').animations.find(a => a.name === 'Doors_open_hold_close');
          const mixer = new THREE.AnimationMixer(model), act = mixer.clipAction(clip); act.play(); act.paused = true; act.time = clipT; mixer.update(0);
        } else for (const d of wrap.children.filter(o => o.name === 'bus door')) d.position.x = d.userData.shut + (d.userData.open - d.userData.shut) * Math.min(1, clipT / 1.3);
        // the Fighter stands in the front door at this time: the rigs (their roots are mirrored) are hidden for this frame
        const holds = o => { for (let q = wrap; q; q = q.parent) if (q === o) return true; return false; };
        const hidden = scene.children.filter(o => o.visible && o.scale.x < 0 && !holds(o));
        for (const o of hidden) o.visible = false;
        if (model) model.traverse(o => { if (o.isMesh && /upholstery|handrails/.test(o.material.name) && /^Body/.test(o.name)) o.visible = true; if (o.name === 'bus cabin distant seat silhouette') o.visible = false; });
        const cam = run.camera.clone(); cam.fov = 40; cam.aspect = r.domElement.width / r.domElement.height; cam.updateProjectionMatrix();
        const x0 = wrap.position.x; cam.position.set(x0 + v.pos[0], v.pos[1], v.pos[2]); cam.lookAt(x0 + v.look[0], v.look[1], v.look[2]); cam.updateMatrixWorld();
        scene.updateMatrixWorld(true);
        if (r.shadowMap.enabled) r.shadowMap.needsUpdate = true;
        r.render(scene, cam);
        const url = r.domElement.toDataURL('image/png'); for (const o of hidden) o.visible = true; res(url);
      })), [clipT, v]);
      const file = `${tag}-close-${view}-${state}.png`; fs.writeFileSync(path.join(out, file), Buffer.from(png.split(',')[1], 'base64'));
      info.close.push({ view, state, clipT, file });
    }
  }
  fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify(info, null, 1));
  if (errors.length) console.log('page errors', errors);
  console.log('done', out, tag);
  await b.close(); server.close();
});
