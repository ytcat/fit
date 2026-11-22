// Free-roam QA: load chapter1-roam.html at iPhone size, walk with the keyboard, take the district gates, report state and errors.
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = require('path').join(__dirname, '../..'), out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 } }), errs = [];
  p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url().slice(-80)); });
  await p.goto(`http://localhost:${server.address().port}/chapter1-roam.html`, { timeout: 300000 });
  await p.waitForFunction(() => window.Chapter1Review && !window.Chapter1Review.snapshot().busy, null, { timeout: 600000 });
  const snap = () => p.evaluate(() => window.Chapter1Review.snapshot());
  console.log('start', JSON.stringify(await snap()));
  await p.screenshot({ path: `${out}/0-start.png` });
  const walk = async (code, ms) => { await p.keyboard.down(code); await p.waitForTimeout(ms); await p.keyboard.up(code); };
  for (const [i, code] of [['1', 'ArrowUp'], ['2', 'ArrowLeft'], ['3', 'ArrowDown'], ['4', 'ArrowRight']]) { await walk(code, 6000); console.log('walk', code, JSON.stringify(await snap())); await p.screenshot({ path: `${out}/${i}-${code}.png` }); }
  // visit every district through the gates when one is nearby
  for (let k = 0; k < 4; k++) { const g = (await snap()).gate; if (g) { await p.click('#door', { force: true }).catch(() => { }); await p.waitForFunction(() => !window.Chapter1Review.snapshot().busy, null, { timeout: 300000 }); await p.waitForTimeout(3000); console.log('gate', g, JSON.stringify(await snap())); await p.screenshot({ path: `${out}/gate-${k}.png` }); } else { await walk('ArrowUp', 8000); } }
  console.log('errors', JSON.stringify(errs.slice(0, 8)));
  await b.close(); server.close();
});
