// Owner 2026-11-25 (PC): "the video stuck all the time" and "the game starts with player training and after a second it
// disappears and adventure starts". Static checks of the film warm-up and the boot cover, then a real Chromium run: a returning
// Adventure player and a player whose last mode was Training each reload; the training stage must never be shown to the
// Adventure player, the cover must lift exactly when the mode is on screen, and the Training player must stay in the gym.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), http = require('http');
process.chdir(path.join(__dirname, '..'));
const read = f => fs.readFileSync(f, 'utf8');
const html = read('index.html'), shell = read('game-shell.js'), modes = read('modes-menu.js'), dream = read('adventure/story/dream-scenes.js'), bag = read('adventure/story/bag-break.js');

// ---- boot cover: set in <head> before any other script, every language, left-to-right, never permanent, not in classic mode
{
  const head = html.slice(0, html.indexOf('</head>')), cover = head.indexOf("setAttribute('data-boot'"), firstSrc = head.indexOf('<script src=');
  assert.ok(cover > 0 && cover < firstSrc, 'the cover is set before the first external script');
  assert.match(head, /uiSay\('Loading…','טוען…','Загрузка…'\)/, 'loading line in EN/HE/RU');
  assert.match(head, /html\[data-boot\] body\{visibility:hidden\}/); assert.match(head, /html\[data-boot\] dialog\.career-welcome\{visibility:visible\}/, 'the welcome card stays usable over the cover');
  assert.match(head, /t=setTimeout\(done,30000\)/, 'never a permanent cover'); assert.match(head, /game=classic/);
  assert.ok(!/dir=["']?rtl/.test(head), 'no right-to-left container');
  // the shell decides: Adventure home, or the gym for a Training player; the welcome card keeps the cover until it closes
  assert.match(shell, /if\(current\(\)\)\{if\(window\.gotrBoot\?\.mode\(\)==='train'\)activity=true;else home\(\);window\.GameModes\?\.paint\(\);window\.gotrBoot\?\.done\(\);\}else window\.gotrBoot\?\.welcome\(\);/);
  assert.match(shell, /function home\(\)\{if\(!current\(\)\)\{e\.career\.profileDialog\(\);return;\}window\.gotrBoot\?\.mode\('adventure'\);/);
  assert.match(modes, /g\.activity = true; window\.gotrBoot\?\.mode\('train'\);/, 'Modes > Training is remembered');
  assert.match(modes, /pid = id; window\.gotrBoot\?\.done\(\);/, 'the welcome card lifts the cover when it closes');
}
// ---- films: warm-up before the first frame, robust 'auto' quality, the next film's files fetched while this one loads
{
  const warm = dream.indexOf('run.warm = Math.round(warmUp(e.renderer, scene, camera));'), first = dream.indexOf('run.frame = frame; e.fightIQDemo = run; busy.remove();');
  assert.ok(warm > 0 && warm < first, 'the set is compiled and uploaded before the film is handed to the render loop');
  assert.ok(dream.indexOf('run.warmMap = Math.round(warmUp(e.renderer, mapScene, mapCam))') > 0, 'the map dive too');
  assert.match(dream, /r\.compile\(scene, camera\)/); assert.match(dream, /rt\.texture\.encoding = r\.outputEncoding/);
  assert.match(dream, /if \(o\.isLight\) return;/, 'lights keep their state (same programs as the film)');
  assert.ok(!/perf\.sum \/ 48|lookPerf\.sum \/ 48/.test(dream), 'no mean-based quality drop'); assert.match(dream, /slow\(perf\.dts\)/); assert.match(dream, /slow\(lookPerf\.dts\)/);
  assert.match(dream, /id === 'dream_apology' \? city\.ready\(undefined, MARKET_MODELS\)/);
  assert.match(dream, /fangHead && \(id === 'dream_apology' \|\| hasFang\(scene0\)\) \? fangHead\.ready\(5000\)/);
  assert.match(dream, /window\.StoryCast\?\.market\?\.head\?\.load\(\)/, 'the story panel prefetch starts Fang\'s head');
  assert.match(dream, /ratioWas = r0; e\.renderer\.setPixelRatio\(cap\)/); assert.match(dream, /if \(ratioWas\) \{ e\.renderer\.setPixelRatio\(ratioWas\); ratioWas = null; \}/, 'pixel ratio restored');
  assert.match(bag, /window\.DreamScenes\?\.warm\?\.\(e\.renderer, scene, camera\)/);
  for (const [f, s] of [['dream-scenes.js', dream], ['bag-break.js', bag]]) assert.ok(!/setIndex\(/.test(s), f + ': no index swaps');
  // the median rule itself
  const slow = eval('(' + dream.match(/const slow = (dts => \{[^\n]+\});/)[1] + ')');
  assert.equal(slow([...Array(44).fill(1 / 60), 1.2, 1.2, .9, .7]), false, 'a few compile stalls do not make a PC slow');
  assert.equal(slow(Array(48).fill(1 / 20)), true, 'a steadily slow device drops');
}
console.log('PASS pc-smooth-start static');

let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); }
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }), errors = [];
    let p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); });
    await p.goto(url); await p.waitForFunction(() => window.ringfighterGame?.store, null, { timeout: 180000 });
    assert.equal(await p.evaluate(() => document.documentElement.hasAttribute('data-boot')), true, 'no profile: the cover stays under the welcome card');
    for (let k = 0; k < 120 && !(await p.evaluate(() => !!ringfighterGame.store.game())); k++) {
      if (await p.locator('dialog.career-welcome[open]').count()) { await p.locator('dialog.career-welcome[open] input[name=player]').fill('Boot QA'); await p.locator('dialog.career-welcome[open] button[type=submit]').click(); }
      await p.waitForTimeout(500);
    }
    await p.waitForFunction(() => !document.documentElement.hasAttribute('data-boot') && ringfighterGame.modalTab === 'adventure', null, { timeout: 60000 });
    // reload as a returning Adventure player: the first thing shown after the cover is the Adventure home
    const watch = () => p.addInitScript(() => { new MutationObserver(() => { const d = document.documentElement; if (d && window.__seen && !d.hasAttribute('data-boot') && !window.__lift) window.__lift = { tab: window.ringfighterGame?.modalTab || null, gym: !!window.ringfighterGame && !window.ringfighterGame.modalTab }; if (d?.hasAttribute('data-boot')) window.__seen = true; }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-boot'] }); });
    await p.close(); p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); await watch();
    await p.goto(url); await p.waitForFunction(() => window.__lift, null, { timeout: 180000 });
    assert.deepEqual(await p.evaluate(() => window.__lift), { tab: 'adventure', gym: false }, 'Adventure player: the cover lifts on the Adventure home');
    // choose Training with the modes button, reload: the gym, no switch to Adventure afterwards
    await p.locator('.gm-fab').click(); await p.locator('.gm-item[data-mode=train]').click();
    await p.waitForFunction(() => !ringfighterGame.modalTab && localStorage.getItem('gotr.mode') === 'train', null, { timeout: 30000 });
    await p.close(); p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); await watch();
    await p.goto(url); await p.waitForFunction(() => window.__lift, null, { timeout: 180000 });
    assert.deepEqual(await p.evaluate(() => window.__lift), { tab: null, gym: true }, 'Training player: the cover lifts on the gym');
    await p.waitForTimeout(3000); assert.equal(await p.evaluate(() => ringfighterGame.modalTab), null, 'and stays in the gym');
    // back to Adventure from the modes button: the next start is the Adventure home again
    await p.locator('.gm-fab').click(); await p.locator('.gm-item[data-mode=adventure]').click();
    assert.equal(await p.evaluate(() => localStorage.getItem('gotr.mode')), 'adventure');
    assert.deepEqual(errors, []);
    console.log('PASS pc-smooth-start browser: cover until the mode is decided; Adventure and Training players boot into their own mode');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
