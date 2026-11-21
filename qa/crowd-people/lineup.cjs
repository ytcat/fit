// Spectator lineup pictures (qa/crowd-people/lineup.html): node qa/crowd-people/lineup.cjs <port> <out-name> <query> [width] [height]
const { chromium } = require('playwright'), path = require('path'), { execFileSync } = require('child_process'), fs = require('fs');
const [port = '18761', name = 'lineup', query = 'tier=2&set=species', w = '1200', h = '700'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: +w, height: +h } }), errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://127.0.0.1:${port}/qa/crowd-people/lineup.html?${query}`); await p.waitForFunction(() => window.__lineup, null, { timeout: 120000 });
  const info = await p.evaluate(() => window.__lineup), png = path.join(__dirname, name + '.png'); await p.screenshot({ path: png });
  execFileSync('python3', ['-c', `from PIL import Image;Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(png.replace(/png$/, 'webp'))},quality=86)`]); fs.unlinkSync(png);
  console.log(name, JSON.stringify(info), errors.length ? errors : 'clean'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
