// node tests/bruno-head-eyes.test.cjs — Coach Bruno's eyes read in a film (main review 2026-11-26: "eyes vanish in the game ... the
// sockets render black: he looks eyeless and grim"). The gym talk at 13 s ("That's me", he faces the Fighter, a close shot) in the real
// page (Chromium, SwiftShader, 402x690): the head is drawn from the film camera's side at 402x402 (as qa/bruno-head/tools/film.cjs);
// each pupil (HEADS.bruno.eyes, head-joint frame) is projected and a 9x9 px window round it measured. Each eye: facing the camera,
// mean luminance >= 25 (the reviewed build, v2026112601: 2.7 and 10.6; this build ~40) and a catch-light (max >= 110;
// the reviewed build: 16 and 54). Env BRUNO_GLB=<file> EYES=<json> runs it on another build (the reviewed one fails).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const ROOT = path.join(__dirname, '..');
let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('SKIP: Playwright is not installed'); process.exit(0); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  if (process.env.BRUNO_GLB && f.endsWith('bruno-head.glb')) f = process.env.BRUNO_GLB;
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.market?.heads?.bruno && window.DreamScenes && window.StoryScenes, null, { timeout: 300000 });
    if (process.env.EYES) await p.evaluate(e => { StoryCast.market.heads.bruno.cfg.eyes = JSON.parse(e); }, process.env.EYES);
    await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); const r = app.engine.renderer, render = r.render.bind(r); r.render = (sc, cam) => { if (sc !== app.engine.scene && cam?.isPerspectiveCamera && !r.getRenderTarget()) window.__filmCam = cam; return render(sc, cam); }; });
    await p.evaluate(() => StoryScenes.play('dream_gym_talk', { onDone: () => {}, onBuy: () => true }));
    await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
    assert.equal(await p.evaluate(() => StoryCast.market.heads.bruno.ready(30000)), 'ready');
    const frame = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 60000 }); };
    for (let u = 12; u <= 13; u += .1) { await p.evaluate(u => DreamScenes.seek(u), u); await frame(); }
    const eyes = await p.evaluate(() => {
      const T = THREE, e = app.engine, r = e.renderer, c = StoryCast.rig('bruno', e), cam0 = window.__filmCam, W = 402, H = 402;
      if (!c.castHead?.on) return { off: true };
      const rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(W * H * 4);
      const h = c.joints.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .05, 0)), dir = cam0.position.clone().sub(h); dir.y = Math.max(dir.y, .1 * dir.length()); dir.normalize();
      const cam = new T.PerspectiveCamera(30, 1, .03, 60); cam.position.copy(h).addScaledVector(dir, 1.9); cam.lookAt(h);
      r.setRenderTarget(rt); r.render(c.root.parent, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null); rt.dispose();
      const head = c.joints.head, fwd = new T.Vector3(0, 0, 1).transformDirection(head.matrixWorld);
      return StoryCast.market.heads.bruno.cfg.eyes.map(q0 => { const q = new T.Vector3(...q0).applyMatrix4(head.matrixWorld), v = q.clone().project(cam), px = Math.round((v.x + 1) / 2 * W), py = Math.round((1 - v.y) / 2 * H); let sum = 0, n = 0, mx = 0;
        for (let y = py - 4; y <= py + 4; y++) for (let x = px - 4; x <= px + 4; x++) { const o = ((H - 1 - y) * W + x) * 4, l = .2126 * buf[o] + .7152 * buf[o + 1] + .0722 * buf[o + 2]; sum += l; n++; mx = Math.max(mx, l); }
        return { px, py, facing: +(-fwd.dot(q.clone().sub(cam.position).normalize())).toFixed(2), mean: +(sum / n).toFixed(1), max: Math.round(mx) }; });
    });
    assert.ok(!eyes.off && eyes.length === 2, 'the model is on in the film');
    for (const [i, e] of eyes.entries()) {
      assert.ok(e.facing > .5, 'eye ' + i + ' faces the camera at 13 s: ' + e.facing);
      assert.ok(e.mean >= 25, 'eye ' + i + ' reads (mean luminance ' + e.mean + ' >= 25)');
      assert.ok(e.max >= 110, 'eye ' + i + ' has a catch-light (max ' + e.max + ' >= 110)');
    }
    assert.deepEqual(errors, [], 'no page errors');
    console.log('bruno head eyes ok', JSON.stringify(eyes));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
