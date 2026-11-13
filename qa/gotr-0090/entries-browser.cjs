// GOTR-0090 exploration: open the Shop from many places, measure the drawn Fighter in the preview, take pictures.
const { chromium } = require('playwright');
const S = process.env.SHOTS || 'qa/gotr-0090/';
const URL = process.env.APP_URL || 'http://127.0.0.1:8931/';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const frameBox = () => { const e = app.engine, r = e.renderer, sz = r.getSize(new THREE.Vector2()), w = Math.round(sz.x), h = Math.round(sz.y), rt = new THREE.WebGLRenderTarget(w, h);
  const shot = () => { r.setRenderTarget(rt); r.render(e.scene, e.camera); const b = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, b); r.setRenderTarget(null); return b; };
  const kids = e.coach.root.children.map(k => [k, k.visible]), a = shot(); kids.forEach(([k]) => { k.visible = false; }); const b = shot(); kids.forEach(([k, v]) => { k.visible = v; }); rt.dispose(); e.lastRenderStamp = null;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 12) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); const yy = h - 1 - y; y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); } }
  return { w, h, n, box: n ? [x0, y0, x1, y1] : null, cx: n ? +(((x0 + x1) / 2) / w).toFixed(3) : null, hf: n ? +((y1 - y0 + 1) / h).toFixed(3) : 0, scene: e.scene.name, demo: !!e.fightIQDemo, mode: e.targetMode };
};
const state = () => { const e = app.engine; let top = e.coach.root; while (top.parent) top = top.parent; return { mode: e.targetMode, playing: e.isPlaying, scene: e.scene.name || e.scene.uuid.slice(0, 8), cam: e.camera.name || 'game', rootInGame: top === e.scene, rootParent: e.coach.root.parent?.name || e.coach.root.parent?.type, demo: !!e.fightIQDemo, stageParent: document.getElementById('stageContainer').parentElement.className, story: window.StoryScenes?.playing || null }; };
const ENTRIES = (process.env.ENTRIES || 'film,home,shadowbox,heavy,mitts,fight,story').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  for (const entry of ENTRIES) {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } }); p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(URL); await wait(p, () => window.ringfighterGame && window.GameModes);
    await p.evaluate(f => { localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); if (!f) localStorage.setItem('gotr.adv.nointro', '1'); }, entry === 'film'); await p.reload(); await wait(p, () => window.ringfighterGame && window.GameModes);
    await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Shop QA'; d.querySelector('button[type=submit]').click(); });
    if (entry === 'film') { await wait(p, () => window.StoryScenes?.playing); await p.waitForTimeout(6000); }
    else { await wait(p, () => document.querySelector('dialog.game-home[open]') && app.engine.coach?.anatomy); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(1500); }
    if (['shadowbox', 'heavy', 'mitts'].includes(entry)) { await p.evaluate(m => ringfighterGame.startTraining({ mode: m }), { shadowbox: 'none', heavy: 'heavy', mitts: 'pads' }[entry]); await p.waitForTimeout(4000); }
    if (entry === 'fight') { await p.evaluate(() => ringfighterGame.startFight()); await wait(p, () => app.engine.arena?.fightView?.match); await p.waitForTimeout(6000); }
    if (entry === 'story') { await p.evaluate(() => StoryScenes.play('carry_bag', { onDone: () => {} })); await wait(p, () => StoryScenes.playing === 'carry_bag' && StoryScenes.stats?.(), null, 180000); await p.waitForTimeout(3000); await p.evaluate(() => StoryScenes.stop()); await p.waitForTimeout(1500); }
    const before = await p.evaluate(state); await p.screenshot({ path: `${S}${entry}-before.png` });
    await p.evaluate(() => document.querySelector('.game-wallet').click()); await wait(p, () => document.querySelector('.store-preview canvas')); await p.waitForTimeout(2500);
    const m = await p.evaluate(frameBox); console.log(entry, 'shop', JSON.stringify(m));
    if (process.env.DBG) console.log(await p.evaluate(() => { const e = app.engine, c = e.camera, root = e.coach.root, out = []; const q = new THREE.Vector3(), gb = new THREE.Box3();
      root.traverse(o => { if (!o.isMesh) return; let vis = true; for (let k = o; k && k !== root.parent; k = k.parent) if (!k.visible) vis = false; if (!vis) return; const pos = o.geometry.attributes.position; let x0 = 9, x1 = -9;
        const add = v => { q.copy(v).project(c); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); };
        if (o.isSkinnedMesh) { o.skeleton.update(); for (let i = 0; i < pos.count; i += 7) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld); add(v); } }
        else { o.geometry.computeBoundingBox(); gb.copy(o.geometry.boundingBox); for (const x of [gb.min.x, gb.max.x]) for (const y of [gb.min.y, gb.max.y]) for (const z of [gb.min.z, gb.max.z]) add(new THREE.Vector3(x, y, z).applyMatrix4(o.matrixWorld)); }
        const m = [].concat(o.material)[0]; out.push({ n: o.name || o.parent?.name, s: o.isSkinnedMesh, x0: +x0.toFixed(2), x1: +x1.toFixed(2), tr: m?.transparent, op: m?.opacity, cw: m?.colorWrite, type: m?.type, cnt: pos.count }); });
      out.sort((a, b) => b.x1 - a.x1); return JSON.stringify(out.slice(0, 6)) + '\n' + JSON.stringify(out.sort((a, b) => a.x0 - b.x0).slice(0, 4)); }));
    console.log(await p.evaluate(() => { const e = app.engine, c = e.camera, pts = GamePresentation.posedPoints(e.coach.root); let x0=1,x1=-1,y0=1,y1=-1; const q = new THREE.Vector3(); for (const p of pts) { q.copy(p).project(c); x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);y0=Math.min(y0,q.y);y1=Math.max(y1,q.y);} return JSON.stringify({n:pts.length, ndc:[x0,x1,y0,y1].map(v=>+v.toFixed(2)), cam:c.name, pos:c.position.toArray().map(v=>+v.toFixed(2)), aspect:+c.aspect.toFixed(3), fov:c.fov}); }));
    await p.screenshot({ path: `${S}402x690-en-shop-from-${entry}.png` });
    await p.evaluate(() => ringfighterGame.close()); await p.waitForTimeout(1500);
    const after = await p.evaluate(state); console.log(entry, 'before', JSON.stringify(before)); console.log(entry, 'after ', JSON.stringify(after));
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
