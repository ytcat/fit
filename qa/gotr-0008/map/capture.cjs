// GOTR-0008 Gloryland map renders. Usage:
//   node qa/gotr-0008/map/capture.cjs <outDir> name:view:time:width:height[:pins[:dpr]] ...
// Start `python3 -m http.server 8177 --bind 127.0.0.1` in the repo root first (or set MAP_URL).
// One headless Chromium (SwiftShader); preserveDrawingBuffer is on in the preview page.
const { chromium } = require('playwright');
const URL = process.env.MAP_URL || 'http://127.0.0.1:8177/adventure/map-preview.html';
(async () => {
  const [outDir, ...shots] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = [];
  try {
    for (const spec of shots) {
      const [name, view, time, w, h, pins = '1', dpr = '1'] = spec.split(':');
      const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 300)); });
      const t0 = Date.now();
      await page.goto(`${URL}?view=${view}&time=${time}&ui=0&pins=${pins}&static=1&dpr=${dpr}&shadow=${process.env.SHADOW || 4096}${process.env.EXTRA || ''}`, { timeout: 600000 });
      await page.waitForFunction(() => window.GL_PREVIEW && window.GL_PREVIEW.map, null, { timeout: 600000 });
      const info = await page.evaluate(() => { GL_PREVIEW.render(); return GL_PREVIEW.info(); });
      const ms = await page.evaluate(() => GL_PREVIEW.timeRender(2));
      await page.evaluate(() => GL_PREVIEW.render());
      await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 600000 });
      report.push({ name, view, time, size: `${w}x${h}@${dpr}`, calls: info.calls, triangles: info.triangles, sceneTris: info.scene.triangles, instances: info.scene.instances, meshes: info.scene.meshes, buildMs: Math.round(info.buildMs), swiftshaderFrameMs: Math.round(ms), textures: info.memory.textures, geometries: info.memory.geometries, wallSec: Math.round((Date.now() - t0) / 1000), errors });
      console.log(JSON.stringify(report[report.length - 1]));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
