// Shared browser harness for qa/arm-fixes: serves the repo, opens the app at 402x690 in Chromium (SwiftShader) with the
// chosen Fighter species, and offers helpers for stepping a story film frame by frame with a free QA camera.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.ROOT || path.join(__dirname, '../..'); // ROOT: serve another checkout (before pictures)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.bin': 'application/octet-stream' };
function serve() {
  return new Promise(res => {
    const server = http.createServer((q, r) => {
      let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(server));
  });
}
async function open(species = 'lion', { width = 402, height = 690 } = {}) {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(s => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('shadowbox-coach', s); } catch { } }, species);
  await page.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await page.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.MarketProps, null, { timeout: 300000 });
  await page.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  const got = await page.evaluate(() => app.engine.coach.species);
  if (got !== species) throw Error('species ' + got + ' != ' + species);
  return { page, browser, server, errors, close: async () => { await browser.close(); server.close(); } };
}
/** Plays a dream film, then takes the clock over: no taps, no Buy wait, the engine loop no longer advances it. */
async function film(page, id) {
  await page.evaluate(id => StoryScenes.play(id, { onDone: () => { }, onBuy: () => true }), id);
  await page.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  await page.evaluate(() => { const r = DreamScenes.debug; r.bought = true; r.ack = 999; window.__qaFrame = r.frame; r.frame = () => { }; });
}
module.exports = { open, film, root };
