// GOTR-0056: story lines on the scene (plain text, portrait, tap to skip), journal, recommended beat. Static server on :8191.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a) => p.waitForFunction(f, a, { timeout: 300000 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of ['en', 'he']) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.removeItem('gotr.adv.story'); if (!app.engine.career.store.current()) app.engine.career.store.create('Story QA'); });
      await p.reload({ timeout: 300000 }); await ready(p); await p.evaluate(l => app.setLanguage(l), lang);
      await p.evaluate(() => ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') })); await p.waitForSelector('.adv-tile', { timeout: 300000 }); await p.waitForTimeout(1500);
      const tiles = await p.evaluate(() => ({ next: document.querySelector('.adv-tile-next')?.dataset.mission, beats: [...document.querySelectorAll('.adv-tile[data-mission]')].map(t => t.dataset.beat).join(''), journal: !!document.querySelector('.adv-tile-journal') }));
      console.log(lang, 'tiles', JSON.stringify(tiles)); assert.equal(tiles.next, 'one_two_mitts'); assert.ok(tiles.journal && /^1/.test(tiles.beats));
      await p.evaluate(() => document.querySelector('.adv-tile[data-mission=one_two_mitts]').click()); await p.waitForTimeout(400);
      await p.evaluate(() => { window.__snap = null; new MutationObserver(() => { const e = document.getElementById('advStory'); if (e && !window.__snap && e.innerText) { const cs = getComputedStyle(e); window.__snap = { text: e.innerText, bg: cs.backgroundColor, border: cs.borderTopWidth, portrait: !!e.querySelector('svg.adv-bust'), emoji: /\p{Extended_Pictographic}/u.test(e.innerText) }; } }).observe(document.body, { childList: true, subtree: true }); document.querySelector('.adv-detail .adv-go').click(); });
      await wait(p, () => window.__snap);
      const st = await p.evaluate(() => window.__snap);
      console.log(lang, 'intro', JSON.stringify(st)); assert.ok(st.portrait && !st.emoji && /rgba\(0, 0, 0, 0\)|transparent/.test(st.bg) && st.border === '0px');
      // tap skips: a two-line scene (Dash then Pip) needs two taps
      const skip = await p.evaluate(() => { AdventureStory.show('roll_under_hook', 'intro'); const e = document.getElementById('advStory'), first = e.innerText; e.dispatchEvent(new PointerEvent('pointerdown')); const second = document.getElementById('advStory').innerText; document.getElementById('advStory').dispatchEvent(new PointerEvent('pointerdown')); return { first, second, gone: !document.getElementById('advStory') }; });
      console.log(lang, 'skip', JSON.stringify(skip)); assert.ok(skip.gone && skip.first !== skip.second);
      await p.evaluate(() => { for (let i = 0; i < 20; i++) app.engine.onImpact({ actor: 'lion', receiver: 'pads', kind: 'pad', move: i % 2 ? 'cross' : 'jab', blocked: false, impulse: 20 }); });
      await wait(p, () => document.getElementById('advNext'));
      const out = await p.evaluate(() => ({ story: document.getElementById('advStory')?.innerText || 'shown and finished', next: document.querySelector('#advNext .adv-next-main').textContent }));
      console.log(lang, 'outro + next', JSON.stringify(out)); assert.ok(/Bag power|מבחן כוח/.test(out.next));
      if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/story-outro.png`, timeout: 300000 });
      await p.evaluate(() => [...document.querySelectorAll('#advNext button')].pop().click()); await p.waitForSelector('.adv-tile-journal', { timeout: 300000 }); await p.waitForTimeout(1200);
      await p.evaluate(() => document.querySelector('.adv-tile-journal').click()); await p.waitForTimeout(300);
      const j = await p.evaluate(() => ({ lines: document.querySelectorAll('.adv-journal-line').length, text: document.querySelector('.adv-detail').innerText.replace(/\n+/g, ' | '), docW: document.documentElement.scrollWidth }));
      console.log(lang, 'journal', JSON.stringify(j)); assert.ok(j.lines >= 2 && j.docW <= 402);
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('story browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
