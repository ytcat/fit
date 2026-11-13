// GOTR-0072: the Shop preview must draw the Fighter's BODY (the skinned meshes), not only the rigid gear.
// Real browser test (Chromium + SwiftShader): the skin is placed on the GPU, so only pixels prove it is drawn.
// Flow that broke it on the owner's phone: mitts station -> Adventure map (game paused) -> a story trial borrows the
// Fighter's rig -> the trial ends -> Shop. Measured in every Shop category, with an item selected, with "Full view", and for both species:
//   body  = share of preview pixels that change when the skinned meshes are hidden (0 = body not drawn)
//   skin  = distance between the pelvis bone and where the skin shader puts the pelvis (0 = skin sits on the rig)
// Skips (exit 0, with a notice) when Playwright is not installed. PORT / APP_URL / SHOTS are optional.
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP shop-preview-body: Playwright is not installed'); process.exit(0); } }
const ROOT = path.join(__dirname, '..'), SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
const server = http.createServer((q, s) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { s.writeHead(403); s.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(data); }); });
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
// Runs in the page.
const measure = () => { const e = app.engine, r = e.renderer, c = e.coach, sz = r.getSize(new THREE.Vector2()), w = 120, h = Math.max(8, Math.round(120 * sz.y / sz.x)), rt = new THREE.WebGLRenderTarget(w, h);
  const shot = () => { r.setRenderTarget(rt); r.render(e.scene, e.camera); const b = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, b); r.setRenderTarget(null); return b; };
  const body = []; c.root.traverse(o => { if (o.isSkinnedMesh && o.visible) body.push(o); });
  const a = shot(); body.forEach(o => { o.visible = false; }); const b = shot(); body.forEach(o => { o.visible = true; }); rt.dispose(); e.lastRenderStamp = null;
  let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 12) n++;
  c.root.updateMatrixWorld(true); const hb = c.bones.indexOf(c.joints.hips), m = new THREE.Matrix4().multiplyMatrices(c.joints.hips.matrixWorld, c.skeleton.boneInverses[hb]);
  const dq = c.dqReal[hb], dd = c.dqDual[hb], t = new THREE.Quaternion(dd.x * 2, dd.y * 2, dd.z * 2, dd.w * 2).multiply(new THREE.Quaternion(dq.x, dq.y, dq.z, dq.w).conjugate());
  const fwd = c.root.getWorldDirection(new THREE.Vector3()), head = c.joints.head.getWorldPosition(new THREE.Vector3()).sub(c.joints.hips.getWorldPosition(new THREE.Vector3()));
  const nose = c.joints.head.localToWorld(new THREE.Vector3(0, 0, 1)).sub(c.joints.head.getWorldPosition(new THREE.Vector3())); nose.y = 0; nose.normalize();
  return { body: +(n / (w * h)).toFixed(4), meshes: body.length, skin: +Math.hypot(t.x - m.elements[12], t.y - m.elements[13], t.z - m.elements[14]).toFixed(3), faces: +nose.dot(fwd).toFixed(2), upright: +(head.y / head.length()).toFixed(2), species: c.species, mode: e.targetMode }; };
(async () => {
  let url = process.env.APP_URL; if (!url) { await new Promise(r => server.listen(+process.env.PORT || 0, '127.0.0.1', r)); url = `http://127.0.0.1:${server.address().port}/`; }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), rows = [];
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', x => errors.push(x.message));
    await p.goto(url, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); }); await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
    await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Shop QA'; d.querySelector('button[type=submit]').click(); });
    await wait(p, () => document.querySelector('dialog.game-home[open]') && app.engine.coach?.anatomy);
    await wait(p, () => window.StoryScenes?.playing === 'arrival', null, 180000).catch(() => {}); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(1500);
    const check = async (tag, min = .03) => { const m = await p.evaluate(measure); rows.push({ tag, ...m }); console.log(tag, JSON.stringify(m));
      assert.ok(m.meshes >= 2, `${tag}: skinned body meshes are hidden`); assert.ok(m.skin < .02, `${tag}: the skin is ${m.skin} m away from the rig`); assert.ok(m.body >= min, `${tag}: the body covers only ${m.body} of the preview (not drawn)`); };
    const shopTour = async tag => {
      await p.evaluate(() => document.querySelector('.game-wallet').click()); await wait(p, () => document.querySelector('.store-preview canvas')); await p.waitForTimeout(2500);
      await check(`${tag} open`); const m = rows[rows.length - 1]; assert.ok(m.faces > .7 && m.upright > .9, `${tag}: the fighter does not stand facing the preview camera ${JSON.stringify(m)}`);
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}.png`, timeout: 300000 });
      const n = await p.evaluate(() => document.querySelectorAll('.store-categories button').length); assert.ok(n >= 5, 'shop categories');
      for (let i = 0; i < n; i++) { const name = await p.evaluate(i => { const b = document.querySelectorAll('.store-categories button')[i]; b.click(); return b.textContent.trim(); }, i); await p.waitForTimeout(600);
        await p.evaluate(() => document.querySelector('.store-products button')?.click()); await p.waitForTimeout(900); await check(`${tag} ${name} item`, .02);
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-${name.toLowerCase()}.png`, timeout: 300000 });
        await p.evaluate(() => document.querySelector('.store-view-reset').click()); await p.waitForTimeout(600); await check(`${tag} ${name} full view`); }
      await p.evaluate(() => ringfighterGame.close()); await p.waitForTimeout(700); };
    for (const species of ['lion', 'rabbit']) {
      await p.evaluate(() => { if (document.querySelector('dialog.game-home')) { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="train"]').click(); } }); await p.waitForTimeout(1200);
      await p.evaluate(s => { document.getElementById('trainingDrawer')?.close?.(); if (app.engine.coach.species !== s) document.querySelector(`button[data-character="${s}"]`).click(); }, species); await wait(p, s => app.engine.coach?.species === s && app.engine.coach.anatomy, species); await p.waitForTimeout(1500);
      await p.evaluate(() => { trainingControls.chooseTarget('pads'); app.engine.player?.setEnabled(true); app.engine.isPlaying = true; }); await p.waitForTimeout(2500);
      // back on the Adventure map the game is paused; a story trial borrows the Fighter's rig and gives it back
      await p.evaluate(() => ringfighterGame.home()); await wait(p, () => document.querySelector('dialog.game-home[open]')); await p.waitForTimeout(1200);
      await p.evaluate(() => StoryScenes.play('carry_bag', { onDone: () => {} })); await wait(p, () => StoryScenes.playing === 'carry_bag' && StoryScenes.stats?.(), null, 180000); await p.waitForTimeout(3500);
      await p.evaluate(() => StoryScenes.stop()); await p.waitForTimeout(1500);
      await shopTour(`${species}-after-trial`);
    }
    assert.equal(errors.filter(x => !/GL Driver|ReadPixels/.test(x)).length, 0, errors.join('\n'));
    console.log(`shop-preview-body: ${rows.length} measurements, body drawn in every one`);
  } finally { await browser.close(); server.close(); }
})().catch(x => { console.error(x); process.exit(1); });
