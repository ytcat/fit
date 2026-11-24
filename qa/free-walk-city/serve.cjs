// A tiny static server for the QA scripts (the repo root), and the game boot used by them: a profile, the language.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
function serve() {
  return new Promise(res => { const s = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, () => res(s)); });
}
async function boot(p, base, lang = 'en', name = 'Walk QA') {
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(base + '/', { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk, null, { timeout: 300000 });
  await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]') || ringfighterGame.store.current(), null, { timeout: 120000 });
  // QA setup only (not a tap test): name the profile through the welcome form
  await p.evaluate(n => { const d = document.querySelector('dialog.career-welcome[open]'); if (d) { d.querySelector('input').value = n; d.querySelector('button[type=submit]').click(); } }, name);
  await p.waitForTimeout(1500);
  await p.evaluate(l => app.setLanguage(l), lang);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => { if (!d.classList.contains('free-walk')) d.close(); }));
}
module.exports = { serve, boot, root };
