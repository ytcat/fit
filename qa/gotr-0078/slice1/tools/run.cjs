// GOTR-0078 slice 1 browser runner: node run.cjs <script.js> [width] [height]. Loads the game, closes the welcome dialog,
// then runs module.exports = async (page, shot, util) => {} from the script. shot(name) writes OUT/name.webp.
// Env: APP_URL (default http://127.0.0.1:8471/), OUT (default ../), SPECIES=rabbit to switch the Fighter.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8471/', OUT = process.env.OUT || path.join(__dirname, '..');
(async () => {
  const [script, w = 402, h = 690] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('CONSOLE', m.text().slice(0, 300)); });
  const ready = () => p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 300000 });
  await p.goto(URL, { timeout: 300000 }); await ready();
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  if (process.env.SPECIES) await p.evaluate(s => app.engine.roster.select(s), process.env.SPECIES);
  const shot = async (name, clip) => {
    const png = path.join(OUT, name + '.png'); await p.screenshot({ path: png, timeout: 300000, clip });
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=82)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png);
  };
  try { await require(path.resolve(script))(p, shot, { w: +w, h: +h, OUT }); } catch (e) { console.log('SCRIPT ERROR', e.stack || e); process.exitCode = 1; }
  await b.close();
})();
