// node qa/paws/tools/probe.cjs <file.js> : loads the game headless (402x690) and prints the JSON result of the async function
// body in <file.js> (evaluated in the page once StoryCast, its cast and DreamPose are ready). A QA helper for measurements.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..', '..'), SRC = fs.readFileSync(process.argv[2], 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error' || /^paws/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 400)); });
    await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.docks && window.StoryCast?.market && window.DreamPose, null, { timeout: 300000 });
    const out = await p.evaluate(`(async () => { ${SRC} })()`);
    console.log(JSON.stringify(out, null, 1));
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
