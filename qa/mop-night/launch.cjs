// Shared QA helpers for the night mop shift (agent/mop-night): serve the repo, open the app at 402x690 with touch,
// walk the story to the required gym shift (dream_arrival, dream_gym_talk, first_brick lost) and launch 'clean_gym'
// through AdventureOldTown.launch (the map's own path).
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.woff2': 'font/woff2' };
function serve() {
  return new Promise(res => { const s = http.createServer((q, r) => {
    let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1', () => res(s)); });
}
async function open({ lang = 'en', width = 402, height = 690 } = {}) {
  const server = await serve(), browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(l => { try { localStorage.setItem('shadowbox-language', l); localStorage.setItem('gotr.adv.nointro', '1'); } catch { } }, lang);
  await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame?.store && window.StoryScenes?.games?.clean_gym && window.AdventureOldTown, null, { timeout: 300000 });
  for (let k = 0; k < 120 && !(await p.evaluate(() => !!ringfighterGame.store.game())); k++) { // the welcome card: a name, Start
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'), i = d?.querySelector('input[name=player]'); if (!i) return; i.value = 'Mop QA'; i.dispatchEvent(new Event('input', { bubbles: true })); d.querySelector('form')?.requestSubmit(); });
    await p.waitForTimeout(1000);
  }
  await p.waitForFunction(() => app.engine.coach?.anatomy && ringfighterGame.store.game(), null, { timeout: 300000 });
  await p.evaluate(() => { StoryScenes?.stop(); ringfighterGame.close(); });
  const CDP = await p.context().newCDPSession(p);
  const touch = (type, pts = []) => CDP.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(({ x, y }) => ({ x, y, id: 1 })) });
  return { p, browser, server, errors, touch, close: async () => { await browser.close(); server.close(); } };
}
/** Walks the story to the required shift and launches it. */
async function launchShift(p) {
  await p.evaluate(() => {
    const rg = ringfighterGame, st = rg.store; rg.close(); for (const d of document.querySelectorAll('dialog[open]')) d.close();
    const change = a => { const r = st.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; };
    for (const step of ['dream_arrival', 'dream_gym_talk', 'first_brick']) { const s = StoryFlow.find(step); if (!StoryFlow.doneOf(st.game(), s)) change({ type: 'adventure', adventure: 'story', step, outcome: step === 'first_brick' ? 'lost' : undefined }); }
    const ctx = { store: st, startTraining: rg.startTraining, startFight: rg.startFight, change };
    AdventureOldTown.launch(ctx, 'clean_gym');
  });
  await p.waitForFunction(() => StoryScenes.debug?.sim && StoryScenes.debug.projectFloor && app.engine.fightIQDemo === StoryScenes.debug && StoryScenes.stats()?.calls, null, { timeout: 120000 });
}
const frames = async (p, n = 3) => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(k => app.engine.renderer.info.render.frame >= k, n0 + n, { timeout: 120000 }); };
module.exports = { open, launchShift, frames, root };
