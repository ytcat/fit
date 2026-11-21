// Otto's Corner street front: capture consecutive frames at small time steps and measure pixel changes inside the
// display windows versus the rest of the picture. Z-fighting shows as large frame-to-frame changes on still surfaces.
// usage: node qa/gotr-0101/otto-flicker.cjs <outdir>   (TIMES="4.5,4.6,..." picks other scene times; BUY=21.9 presses the in-scene Buy first)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.MarketProps, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  await p.evaluate(() => StoryScenes.play('dream_otto_shop', { onDone: () => { }, onBuy: () => true }));
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  const wait = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 3, n0, { timeout: 120000 }); };
  // window rectangles in screen space: project the two display windows (shop front z -4.4)
  const shots = [];
  const times = (process.env.TIMES || '').split(',').filter(Boolean).map(Number);
  const list = times.length ? times : Array.from({ length: 12 }, (_, i) => 1.0 + i * 0.25);
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (process.env.BUY && t >= +process.env.BUY && !p.__bought) { await p.evaluate(t => DreamScenes.seek(t), +process.env.BUY); await wait(); await p.evaluate(() => document.querySelector('.dream-buy')?.click()); await wait(); p.__bought = true; }
    await p.evaluate(t => DreamScenes.seek(t), t); await wait();
    if (process.env.PROBE) console.log('probe', t, JSON.stringify(await p.evaluate(process.env.PROBE)));
    const file = path.join(out, `f${String(i).padStart(2, '0')}.png`);
    await p.screenshot({ path: file }); shots.push(file);
  }
  const rects = await p.evaluate(() => {
    const cam = DreamScenes.debug?.camera || null; return cam ? 'camera' : 'none';
  });
  console.log('frames', shots.length, rects);
  await b.close(); server.close();
});
