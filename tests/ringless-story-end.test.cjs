// Owner report on v1.97 (screenshot at the end of the street fight with Fang): after the KO the ring, the referee and the boxing
// gloves came back in the street while the result was still on screen. A ringless story bout (street, Docks) keeps its look
// (no ring, no referee, bare hands) in every rendered frame until the next screen (the after-film, or the map after a loss) covers
// it; the gear is handed back in the same task that opens that screen. Part 1: source rule. Part 2: the real app, both outcomes.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
process.chdir(path.join(__dirname, '..'));

// ---- part 1: storyFightDone hands the gear back only inside the deferred step that opens the next screen
{
  const src = fs.readFileSync('adventure/oldtown.js', 'utf8'), a = src.indexOf('function storyFightDone('), b = src.indexOf('\n  }\n', a), body = src.slice(a, b);
  assert.ok(a > 0 && b > a, 'storyFightDone found');
  const calls = body.split('\n').filter(l => /RinglessVenues\?*\.release|handBack\(\)/.test(l) && !/^\s*\/\//.test(l));
  for (const l of calls) assert.ok(/const handBack = \(\) =>/.test(l) || /setTimeout\(\(\) => \{ handBack\(\);/.test(l), 'release only at the start of the deferred step: ' + l.trim());
  assert.equal(calls.filter(l => /setTimeout\(\(\) => \{ handBack\(\);/.test(l)).length, 2, 'both outcomes (film, map) hand the gear back in their own step');
  assert.ok(!/else \{ restoreCast\(r\); setTimeout/.test(body), 'the Opponent stays the story character until the map covers the bout');
  console.log('PASS part 1: storyFightDone keeps the ringless look until the next screen');
}

// ---- part 2: the real app
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = path.resolve('.'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const outcome of ['win', 'loss']) {
      const p = await browser.newPage({ viewport: { width: 393, height: 852 } }), errors = [];
      await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(url, { timeout: 300000 });
      await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.AdventureOldTown && window.ringfighterGame?.startFight, null, { timeout: 300000 });
      await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]') || ringfighterGame.store.current(), null, { timeout: 120000 });
      // setup only (not a tap test): a profile through the welcome form
      await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); if (d) { d.querySelector('input').value = 'Ringless QA'; d.querySelector('button[type=submit]').click(); } });
      await p.waitForTimeout(1500);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); const rg = ringfighterGame;
        window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } };
        AdventureOldTown.storyFightStart(__ctx, 'market_robber'); });
      await p.waitForFunction(() => app.engine.arena?.fightView?.ringless?.id === 'street', null, { timeout: 120000 });
      const staged = await p.evaluate(() => { const v = app.engine.arena.fightView; return { ring: v.ring.visible, ref: v.referee.root.visible }; });
      assert.deepEqual(staged, { ring: false, ref: false }, 'the street bout is ringless');
      // the bout ends; every frame until a dialog covers the stage is sampled
      await p.evaluate(won => { const v = app.engine.arena.fightView, m = v.match, raf = window.requestAnimationFrame.bind(window); window.__s = { frames: 0, covered: false, bad: [] };
        const shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
        const tick = () => { if (document.querySelector('dialog[open]')) { __s.covered = true; return; } __s.frames++;
          const gloves = Object.values(v.coaches || {}).some(c => c?.gloveMeshes && Object.values(c.gloveMeshes).some(shown));
          if (v.ring.visible || v.referee.root.visible || gloves) __s.bad.push({ f: __s.frames, ring: v.ring.visible, ref: v.referee.root.visible, gloves });
          raf(tick); };
        raf(tick); const me = v.careerEntry.species; m.finish(won ? me : me === 'lion' ? 'rabbit' : 'lion', 'KO', true); }, outcome === 'win');
      await p.waitForFunction(() => __s.covered, null, { timeout: 120000 });
      const s = await p.evaluate(() => ({ frames: __s.frames, bad: __s.bad.slice(0, 3), n: __s.bad.length, cover: [...document.querySelectorAll('dialog[open]')].map(d => d.className) }));
      console.log(outcome, 'frames before the next screen', s.frames, 'with ring/referee/gloves', s.n, 'covered by', s.cover.join(','));
      assert.ok(s.frames >= 5, 'the result was on screen for a while (' + s.frames + ' frames)');
      assert.equal(s.n, 0, outcome + ': ring, referee or gloves back in the street before the next screen: ' + JSON.stringify(s.bad));
      if (outcome === 'win') assert.ok(s.cover.some(c => /dream-scene/.test(c)), 'the reward film covers the bout');
      // the gear is back once the next screen is up
      await p.waitForTimeout(500);
      assert.equal(await p.evaluate(() => !!app.engine.arena?.fightView?.ringless), false, 'handed back under the next screen');
      assert.deepEqual(errors, [], 'no page errors');
      await p.close();
    }
    console.log('PASS ringless story end: no ring, referee or gloves in the street until the next screen (win and loss)');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
