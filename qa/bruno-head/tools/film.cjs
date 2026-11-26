// node film.cjs <outDir> <scene> <times> [outcome]   env BEFORE=1 (the head GLB answers 404: code head), QUALITY=low|high
// Saves the page (402x690) at each time, a close view of the character's head (WHO, default bruno) from the film camera's side, renderer.info per frame, and
// a frame-time sample (3 s of playback from the first time).
const { open, save } = require('./serve.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const [OUT, SCENE, TIMES, OUTCOME] = process.argv.slice(2), tag = process.env.TAG || (process.env.BEFORE ? 'before' : 'after');
  fs.mkdirSync(OUT, { recursive: true });
  // env HEAD_FILE=<glb> serves that file as the head (an earlier build), EYES='[[x,y,z],[x,y,z]]' its pupils (head-joint frame)
  const { p, close } = await open({ block: process.env.BEFORE ? [(process.env.WHO || 'bruno') + '-head.glb'] : null, alias: process.env.HEAD_FILE ? { [(process.env.WHO || 'bruno') + '-head.glb']: process.env.HEAD_FILE } : null });
  if (process.env.EYES) await p.evaluate(e => { StoryCast.market.heads[window.__who || 'bruno'].cfg.eyes = JSON.parse(e); }, process.env.EYES);
  await p.evaluate(w => { window.__who = w; }, process.env.WHO || 'bruno');
  if (process.env.QUALITY) await p.evaluate(q => DreamScenes.quality(q), process.env.QUALITY);
  await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); const r = app.engine.renderer, render = r.render.bind(r); r.render = (sc, cam) => { if (sc !== app.engine.scene && cam?.isPerspectiveCamera && !r.getRenderTarget()) { window.__filmCam = cam; window.__filmScene = sc; } const out = render(sc, cam); if (!r.getRenderTarget() && sc === window.__filmScene) window.__info = { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, progs: r.info.programs?.length }; return out; }; });
  await p.evaluate(([id, outcome]) => StoryScenes.play(id, { outcome: outcome || undefined, onDone: () => { }, onBuy: () => true }), [SCENE, OUTCOME || '']);
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  await p.evaluate(async () => { const t0 = performance.now(); await new Promise(r => setTimeout(r, 400)); while (window.Paws && Paws._pending() && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 150)); });
  const headState = await p.evaluate(() => { const c = StoryCast.rig(window.__who, app.engine); return { file: StoryCast.market.heads[window.__who].state(), on: !!c?.castHead?.on }; });
  console.log('head', JSON.stringify(headState));
  const list = TIMES.split(',').map(Number), report = { scene: SCENE, tag, quality: process.env.QUALITY || 'auto', head: headState, frames: [] };
  const frame = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 60000 }); };
  for (const [i, t] of list.entries()) {
    for (let u = Math.max(0, t - 1.0); u < t; u += .1) { await p.evaluate(u => DreamScenes.seek(u), u); await frame(); }
    await p.evaluate(t => DreamScenes.seek(t), t); await frame(); await new Promise(r => setTimeout(r, 120)); await p.evaluate(t => DreamScenes.seek(t), t); await frame();
    const name = `${SCENE}-${tag}-${String(i).padStart(2, '0')}-${t}`, file = path.join(OUT, name + '.png'); await p.screenshot({ path: file });
    const info = await p.evaluate(() => window.__info); report.frames.push({ t, ...info });
    const url = await p.evaluate(() => {
      const T = THREE, e = app.engine, r = e.renderer, c = StoryCast.rig(window.__who, e); if (!c?.root.parent || !c.root.visible) return null; const cam0 = window.__filmCam;
      const W = 402, H = 402, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(W * H * 4);
      const h = c.joints.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .05, 0)), dir = cam0.position.clone().sub(h); dir.y = Math.max(dir.y, .1 * dir.length()); dir.normalize();
      const cam = new T.PerspectiveCamera(30, 1, .03, 60); cam.position.copy(h).addScaledVector(dir, 1.9); cam.lookAt(h);
      r.setRenderTarget(rt); r.render(c.root.parent, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
      // the eyes in this picture: the pupil centres (authored head: cfg.eyes in the head-joint frame; code head: its eye parts),
      // projected; mean and max luminance (0..255, display values) of a 9x9 px window round each; facing: the eye looks toward the camera
      const head = c.joints.head, hc = StoryCast.market.heads[window.__who]?.cfg, eyesW = c.castHead?.on && hc?.eyes ? hc.eyes.map(q => new T.Vector3(...q).applyMatrix4(head.matrixWorld)) : (c.facialRest || []).filter(f => f.eye).map(f => f.part.getWorldPosition(new T.Vector3())).slice(0, 2);
      const fwd = new T.Vector3(0, 0, 1).transformDirection(head.matrixWorld);
      const eyes = eyesW.map(q => { const v = q.clone().project(cam), px = Math.round((v.x + 1) / 2 * W), py = Math.round((1 - v.y) / 2 * H), facing = -fwd.dot(q.clone().sub(cam.position).normalize()); let sum = 0, n = 0, mx = 0;
        for (let y = py - 4; y <= py + 4; y++) for (let x = px - 4; x <= px + 4; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const o = ((H - 1 - y) * W + x) * 4, l = .2126 * buf[o] + .7152 * buf[o + 1] + .0722 * buf[o + 2]; sum += l; n++; if (l > mx) mx = l; }
        return { px, py, facing: +facing.toFixed(2), mean: n ? +(sum / n).toFixed(1) : null, max: +mx.toFixed(0) }; });
      window.__eyes = eyes;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H); for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0); rt.dispose(); return cv.toDataURL('image/png');
    });
    if (url) save(path.join(OUT, name + '-close.png'), url);
    const eyes = url ? await p.evaluate(() => window.__eyes) : null; report.frames[report.frames.length - 1].eyes = eyes; if (eyes) console.log(name, 'eyes', JSON.stringify(eyes));
    console.log(name, JSON.stringify(info));
  }
  // frame time: play 3 s from the first time (rAF deltas) after a short warm-up
  report.perf = await p.evaluate(async t => {
    DreamScenes.seek(t); await new Promise(r => setTimeout(r, 500)); const d = []; let last = performance.now(); const t0 = last;
    await new Promise(res => { const f = () => { const n = performance.now(); d.push(n - last); last = n; if (n - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    d.sort((a, b) => a - b); return { frames: d.length, meanMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), medianMs: +d[d.length >> 1].toFixed(1), p90Ms: +d[Math.floor(d.length * .9)].toFixed(1), info: window.__info };
  }, list[0]);
  console.log('perf', JSON.stringify(report.perf));
  fs.writeFileSync(path.join(OUT, `${SCENE}-${tag}-${report.quality}.json`), JSON.stringify(report, null, 1));
  await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
