// shared harness: static server on the worktree + a playwright page with the game loaded
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..', '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
async function open(o = {}) {
  const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
    if (o.block && o.block.some(b => f.includes(b))) { r.writeHead(404); r.end(); return; }
    if (o.alias) for (const [k, v] of Object.entries(o.alias)) if (f.includes(k)) f = v; // serve another file under this name (QA: an earlier head)
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: o.viewport || { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error' || /\[fth\]/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
  await p.goto(`http://127.0.0.1:${server.address().port}/${o.query || ''}`, { timeout: 300000 });
  await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.market && window.DreamPose, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  return { b, p, port: server.address().port, close: async () => { await b.close(); server.close(); } };
}
const save = (file, url) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); };
module.exports = { open, save, ROOT };
