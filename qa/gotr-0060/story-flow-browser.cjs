// GOTR-0060 story flow from a fresh profile: open Adventure -> title card -> arrival scene -> sheet with "Start the story" -> mission ->
// Next/Continue chain -> chapter end (title card, route dots, Chapter 2 sheet). Static server :8191. SHOTS=dir.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of ['en', 'he']) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); });
      await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(() => { app.engine.career.store.create('Story Flow QA'); }); await p.reload({ timeout: 300000 }); await ready(p); await p.evaluate(l => app.setLanguage(l), lang);
      await p.evaluate(() => ringfighterGame.open('adventure'));
      await wait(p, () => document.getElementById('advTitleCard'));
      const title = await p.evaluate(() => document.getElementById('advTitleCard').textContent); console.log(lang, 'title card', title);
      assert.ok(/Chapter 1 · Nobody|פרק 1 · אף אחד/.test(title));
      if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/flow-title.png`, timeout: 300000 });
      await wait(p, () => window.StoryScenes?.playing === 'arrival', null, 120000); console.log(lang, 'arrival scene playing');
      await p.waitForTimeout(1500); if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/flow-arrival.png`, timeout: 300000 });
      await p.evaluate(() => StoryScenes.stop());
      await wait(p, () => document.querySelector('dialog[open] .adv-primary'), null, 120000); await wait(p, () => { const c = document.querySelector('.adv-card'); return c && Math.abs(c.offsetHeight - parseFloat(c.style.getPropertyValue('--peek'))) < 3; }, null, 60000);
      const s = await p.evaluate(() => { const c = document.querySelector('.adv-card'), cr = c.getBoundingClientRect(), tl = document.querySelector('.adv-tiles').getBoundingClientRect(), st = document.querySelector('.adv-stage').getBoundingClientRect(); return { primary: c.querySelector('.adv-primary').textContent, goal: c.querySelector('.adv-goal-line').textContent, mapPct: Math.round(100 * st.height / innerHeight), tilesInside: tl.bottom <= cr.bottom + 1, tb: Math.round(tl.bottom), cb: Math.round(cr.bottom), peek: c.style.getPropertyValue('--peek'), kids: [...c.children].map(k => k.className.slice(0, 14) + ':' + Math.round(k.offsetTop) + '+' + Math.round(k.offsetHeight)).join(' '), st: c.scrollTop, docW: document.documentElement.scrollWidth }; });
      console.log(lang, 'sheet', JSON.stringify(s)); assert.ok(/Start the story|להתחיל את הסיפור/.test(s.primary) && /Step 1 of 5|שלב 1 מתוך 5/.test(s.goal) && s.tilesInside && s.docW <= 402 && s.mapPct >= 58, JSON.stringify(s));
      if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/flow-start.png`, timeout: 300000 });
      await p.evaluate(() => document.querySelector('.adv-primary').click());
      await wait(p, () => document.getElementById('advGoal') && app.engine.career.active); console.log(lang, 'mission strip', await p.evaluate(() => document.getElementById('advGoal').innerText.replace(/\n/g, ' ')));
      if (lang === 'he') { assert.ok(!(await p.evaluate(() => window.StoryScenes?.playing))); await p.close(); continue; }
      await p.evaluate(() => { for (let i = 0; i < 20; i++) app.engine.onImpact({ actor: 'lion', receiver: 'pads', kind: 'pad', move: i % 2 ? 'cross' : 'jab', blocked: false, impulse: 20 }); });
      await wait(p, () => document.getElementById('advNext')); console.log(lang, 'next bar', await p.evaluate(() => document.querySelector('#advNext .adv-next-main').textContent));
      await p.evaluate(() => [...document.querySelectorAll('#advNext button')].pop().click()); await wait(p, () => document.querySelector('dialog[open] .adv-primary'), null, 120000); await p.waitForTimeout(1200);
      const c = await p.evaluate(() => ({ primary: document.querySelector('.adv-primary').textContent, recap: document.querySelector('.adv-recap')?.textContent || null })); console.log(lang, 'continue', JSON.stringify(c)); assert.ok(/Continue story ▶ New bag/.test(c.primary));
      // chapter end: beat Brick -> "Chapter 1 complete" -> route dots -> "Chapter 2 · The Street" -> Market Row sheet
      await p.evaluate(() => { const rg = ringfighterGame, ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } }; rg.close(); AdventureOldTown.bossStart(ctx, 'brick'); });
      await wait(p, () => app.engine.arena?.fightView && document.getElementById('advGoal'));
      await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'ko'); });
      await wait(p, () => /Chapter 1 complete/.test(document.getElementById('advTitleCard')?.textContent || ''), null, 120000); console.log(lang, 'title: Chapter 1 complete');
      await wait(p, () => document.querySelector('dialog[open]')?.dataset.routeDots, null, 180000); console.log(lang, 'route dots', await p.evaluate(() => document.querySelector('dialog[open]').dataset.routeDots));
      await wait(p, () => /Chapter 2 · The Street/.test(document.getElementById('advTitleCard')?.textContent || ''), null, 60000); console.log(lang, 'title: Chapter 2');
      await wait(p, () => document.querySelector('.adv-card h3')?.textContent === 'Market Row' && document.querySelector('.adv-primary'), null, 60000); await p.waitForTimeout(800);
      const m = await p.evaluate(() => ({ primary: document.querySelector('.adv-primary').textContent, goal: document.querySelector('.adv-goal-line').textContent, story: AdventureStory.seen().includes('chapter_2.intro.0') ? 'Welcome to Market Row (shown)' : null })); console.log(lang, 'market', JSON.stringify(m)); assert.ok(/Start ▶/.test(m.primary) && /King Hyena/.test(m.goal) && /Welcome to Market Row/.test(m.story || ''));
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/flow-market.png`, timeout: 300000 });
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('story flow browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
