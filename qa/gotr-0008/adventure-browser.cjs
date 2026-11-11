// GOTR-0008 slice A / GOTR-0044: Adventure tab in the real app. Numbers first, screenshots only with SHOTS=dir.
// node qa/gotr-0008/adventure-browser.cjs   (static server on :8177 from the repo root)
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8177/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a) => p.waitForFunction(f, a, { timeout: 300000 });
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, langs] of [['desk', { width: 1366, height: 768 }, ['en', 'he', 'ru']], ['phone', { width: 402, height: 690 }, ['en', 'he']]]) {
      const p = await b.newPage({ viewport: vp }), errors = [];
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 });
      await wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Adventure QA'); });
      await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy); // the shell nav paints for a profile that exists at boot
      for (const lang of langs) {
        await p.evaluate(l => { ringfighterGame.close(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(l); }, lang);
        await p.waitForTimeout(800);
        const nav = await p.evaluate(() => [...document.querySelectorAll('.game-nav .game-nav-button')].map(x => x.textContent));
        const want = { en: 'Adventure', he: 'הרפתקה', ru: 'Приключение' }[lang];
        assert.ok(nav.includes(want), lang + ' nav ' + nav); assert.ok(!nav.some(t => /^(World|עולם|Мир)$/.test(t)), 'no World tab');
        // open the tab as the player does
        await p.evaluate(w => [...document.querySelectorAll('.game-nav .game-nav-button')].find(x => x.textContent === w).click(), want);
        await wait(p, () => document.querySelectorAll('dialog[open] .adv-pin').length === 11);
        await p.waitForTimeout(1500);
        const map = await p.evaluate(() => {
          const d = document.querySelector('dialog[open]'), st = d.querySelector('.adv-stage').getBoundingClientRect(), pins = [...d.querySelectorAll('.adv-pin')].filter(x => x.style.display !== 'none').map(x => x.querySelector('.adv-tag').getBoundingClientRect());
          let over = 0; for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) { const a = pins[i], c = pins[j]; if (a.right > c.left + 2 && c.right > a.left + 2 && a.bottom > c.top + 2 && c.bottom > a.top + 2) over++; }
          return { title: d.querySelector('h2').textContent, dir: d.dir, stage: [Math.round(st.width), Math.round(st.height)], shown: pins.length, overlaps: over, outside: pins.filter(r => r.left < st.left - 1 || r.right > st.right + 1).length, canvas: !!d.querySelector('canvas.adv-canvas'), hScroll: d.scrollWidth > d.clientWidth + 1 };
        });
        console.log(name, lang, JSON.stringify(map));
        assert.ok(map.canvas && map.stage[1] >= 260 && !map.hScroll && map.outside === 0, JSON.stringify(map));
        if (name === 'desk') assert.ok(map.shown === 11 && map.overlaps === 0);
        // tap Old Town -> card with coach, boss and entry level, and the Train button
        await p.evaluate(() => { const pin = document.querySelector('dialog[open] .adv-pin[data-place="oldtown"]'); pin.style.display = ''; pin.click(); });
        await p.waitForTimeout(2500);
        const card = await p.evaluate(() => { const c = document.querySelector('dialog[open] .adv-card'); return { hidden: c.hidden, h: c.querySelector('h3').textContent, facts: c.querySelector('.adv-facts')?.textContent, buttons: [...c.querySelectorAll('.adv-go')].map(x => x.textContent), minH: Math.min(...[...c.querySelectorAll('button')].map(x => x.getBoundingClientRect().height)) }; });
        console.log(name, lang, 'card', JSON.stringify(card));
        assert.ok(!card.hidden && /5/.test(card.facts) && card.buttons.length === 1 && card.minH >= 36, JSON.stringify(card));
        if (SHOTS && lang !== 'ru') await p.screenshot({ path: `${SHOTS}/adventure-${name}-${lang}-oldtown.png`, timeout: 300000 });
      }
      // Old Town -> Train opens the training with the Home Gym arena; map is disposed
      await p.evaluate(() => document.querySelector('dialog[open] .adv-card .adv-go').click());
      await p.waitForTimeout(1500);
      const train = await p.evaluate(() => ({ dialog: !!document.querySelector('dialog[open]'), canvas: !!document.querySelector('.adv-canvas'), mode: app.engine.targetMode, venue: app.engine.career.store.game().venue }));
      console.log(name, 'train', JSON.stringify(train)); assert.deepEqual(train, { dialog: false, canvas: false, mode: 'pads', venue: 'default' });
      // Market Row -> Fight in the Street arena
      await p.evaluate(() => ringfighterGame.open('adventure'));
      await wait(p, () => document.querySelectorAll('dialog[open] .adv-pin').length === 11);
      await p.evaluate(() => { document.querySelector('dialog[open] .adv-pin[data-place="docks"]').click(); });
      await p.waitForTimeout(800);
      const docks = await p.evaluate(() => [...document.querySelectorAll('dialog[open] .adv-go')].map(x => x.textContent));
      await p.evaluate(() => { document.querySelector('dialog[open] .adv-pin[data-place="market"]').click(); });
      await p.waitForTimeout(800);
      await p.evaluate(() => document.querySelector('dialog[open] .adv-card .adv-go').click());
      await p.waitForTimeout(2500);
      const fight = await p.evaluate(() => ({ dialog: !!document.querySelector('dialog[open]'), canvas: !!document.querySelector('.adv-canvas'), mode: app.engine.targetMode, venue: app.engine.career.store.game().venue, match: !!app.engine.arena?.fightView?.match }));
      console.log(name, 'fight', JSON.stringify(fight), 'docks buttons', JSON.stringify(docks));
      assert.deepEqual(fight, { dialog: false, canvas: false, mode: 'fight', venue: 'street', match: true }); assert.equal(docks.length, 2);
      // GOTR-0044: rivals, cup and events one tap from the Fight tab
      await p.evaluate(() => app.setLanguage('en')); await p.waitForTimeout(1200);
      const circuit = await p.evaluate(() => { const c = document.querySelector('.game-nav-circuit'); if (!c) return null; c.click(); const d = document.querySelector('dialog[open]'); return { label: c.textContent, title: d?.querySelector('h2')?.textContent, rivals: /Rivals/.test(d?.textContent || ''), navCols: getComputedStyle(document.querySelector('.game-nav')).gridTemplateColumns.split(' ').length }; });
      console.log(name, 'circuit', JSON.stringify(circuit)); assert.ok(circuit && circuit.rivals && circuit.navCols === 4, JSON.stringify(circuit));
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/adventure-${name}-en-rivals-cup.png`, timeout: 300000 });
      await p.evaluate(() => ringfighterGame.close());
      console.log(name, 'errors', JSON.stringify(errors)); assert.deepEqual(errors, []);
      await p.close();
    }
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
