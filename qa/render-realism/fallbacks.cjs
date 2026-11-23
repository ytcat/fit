// Render realism: the look on a WebGL 1 context (no WebGL 2, so no float/half-float render targets or ES3 features), and with
// the environment step failing outright (PMREMGenerator throws): the game and a film must keep working, the light level must
// stay the set's own (no anti light without an environment).  usage: node qa/render-realism/fallbacks.cjs [out.json]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), outFile = path.resolve(process.argv[2] || 'fallbacks.json');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const out = {};
  for (const mode of ['webgl1', 'no-pmrem']) {
    const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', ...(mode === 'webgl1' ? ['--disable-webgl2'] : [])] }), errors = [];
    try {
      const p = await b.newPage({ viewport: { width: 402, height: 690 }, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent }); p.setDefaultTimeout(600000);
      p.on('pageerror', e => errors.push(String(e).slice(0, 200)));
      await p.addInitScript(m => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('gotr.film.quality', 'high'); } catch { }
        if (m === 'no-pmrem') { let T; const Fail = class { constructor() { throw Error('no PMREM here'); } }; Object.defineProperty(window, 'THREE', { configurable: true, get() { return T; }, set(v) { T = v; Object.defineProperty(v, 'PMREMGenerator', { configurable: true, get() { return Fail; }, set() { } }); } }); } }, mode);
      await p.goto(`http://localhost:${server.address().port}/`, { timeout: 600000 });
      await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamScenes && window.StoryCast?.market, null, { timeout: 600000 });
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
      const count = () => p.evaluate(() => app.engine.renderer.info.render.frame);
      const n0 = await count(); await p.waitForFunction(n => app.engine.renderer.info.render.frame > n + 5, n0);
      const engine = await p.evaluate(() => { const e = app.engine, gl = e.renderer.getContext(); let anti = 0; e.scene.traverse(o => { if (o.userData.renderLookAnti && o.visible) anti++; });
        return { webgl2: e.renderer.capabilities.isWebGL2, glVersion: gl.getParameter(gl.VERSION), look: RenderLook.current(e.scene), antiVisible: anti, frames: e.renderer.info.render.frame }; });
      await p.evaluate(() => StoryScenes.play('dream_gym_talk', { onDone: r => { window.__done = r; } }));
      await p.waitForFunction(() => DreamScenes.debug?.phase === 'play' && DreamScenes.debug.scene, null, { timeout: 600000 });
      const f0 = await count(); await p.waitForFunction(n => app.engine.renderer.info.render.frame > n + 5, f0);
      const film = await p.evaluate(() => { const d = DreamScenes.debug; let anti = 0, lamps = 0; d.scene.traverse(o => { if (o.userData.renderLookAnti && o.visible) anti++; if (o.name === 'RenderLook practical lamp' && o.visible) lamps++; }); return { look: RenderLook.current(d.scene), antiVisible: anti, lamps, stats: DreamScenes.stats() && { calls: DreamScenes.stats().calls } }; });
      await p.evaluate(() => DreamScenes.stop()); await p.waitForFunction(() => window.__done, null, { timeout: 60000 });
      const after = await p.evaluate(() => { let left = 0; app.engine.scene.traverse(o => { if (o.name === 'RenderLook practical lamp') left++; }); return { done: window.__done, strayLamps: left, look: RenderLook.current(app.engine.scene) }; });
      out[mode] = { engine, film, after, errors }; console.log(mode, JSON.stringify(out[mode]));
    } catch (x) { out[mode] = { fatal: String(x), errors }; console.log(mode, 'FATAL', x); }
    await b.close();
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); server.close();
});
