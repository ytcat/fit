// Persistent Playwright page; POST JS to http://127.0.0.1:8899/eval (body = async fn body), /shot?path=..., /reload
const { chromium } = require('playwright'); const http = require('http');
const URL = process.env.APP_URL || 'http://127.0.0.1:8793/';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  let p;
  const errors = [];
  async function boot() {
    if (p) await p.close();
    p = await b.newPage({ viewport: { width: 402, height: 690 } });
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.ringfighterGame && window.GameModes, null, { timeout: 300000 });
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); });
    await p.reload({ timeout: 300000 }); await p.waitForFunction(() => window.ringfighterGame && window.GameModes, null, { timeout: 300000 });
    await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]'), null, { timeout: 300000 });
    await p.evaluate(() => document.querySelector('dialog.career-welcome[open] button[type=submit]').click());
    await p.waitForFunction(() => app.engine.coach?.anatomy, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  }
  await boot();
  http.createServer(async (req, res) => {
    let body = ''; req.on('data', d => body += d); req.on('end', async () => {
      try {
        const u = new globalThis.URL(req.url, 'http://x');
        let out;
        if (u.pathname === '/eval') out = await p.evaluate(new Function('return (async()=>{' + body + '})()'));
        else if (u.pathname === '/shot') { await p.screenshot({ path: u.searchParams.get('path'), timeout: 180000 }); out = 'ok'; }
        else if (u.pathname === '/reload') { await boot(); out = 'booted'; }
        else if (u.pathname === '/errors') { out = errors.splice(0); }
        res.end(JSON.stringify(out, null, 1));
      } catch (e) { res.end('ERR ' + e.message); }
    });
  }).listen(8899, () => console.log('driver ready'));
})();
