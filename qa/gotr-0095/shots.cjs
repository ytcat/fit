// GOTR-0095 evidence: node qa/gotr-0095/shots.cjs <url> ; writes png next to this file (convert to webp after)
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2], out = n => path.join(__dirname, n);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  for (const lang of (process.env.LANGS || 'en,he').split(',')) {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const ready = async () => { await p.waitForFunction(() => window.ringfighterGame && window.GameModes, null, { timeout: 300000 }); };
    await p.goto(URL, { timeout: 300000 }); await ready();
    await p.evaluate(l => { localStorage.clear(); localStorage.setItem('shadowbox-language', l); localStorage.setItem('gotr.adv.nointro', '1'); }, lang);
    await p.reload({ timeout: 300000 }); await ready();
    await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]'), null, { timeout: 300000 });
    await p.evaluate(() => document.querySelector('dialog.career-welcome[open] button[type=submit]').click());
    await p.waitForFunction(() => app.engine.coach?.anatomy, null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.evaluate(() => { for (const k in app.audio) if (typeof app.audio[k] === 'function') app.audio[k] = () => {}; });
    const PTS = !!process.env.POINTS; const finish = (win) => p.evaluate(async ([win, PTS]) => {
      const e = app.engine, m = e.arena.fightView.match; e.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5);
      m.phase = 'round'; if (PTS) { const a = m.attack('rabbit', 'cross', 'head'); try { m.contact({ actor: 'rabbit', action: a.id, part: 'head', speed: 3 }); } catch (x) { console.warn(x.message); } m.finish(null, 'points'); } else m.finish(win, 'KO'); for (let i = 0; i < 40 && m.phase !== 'ceremony'; i++) { m.advance(.5); e.arena.update(e.animTime += .05, e.technique, e.currentAnim); }
      for (let i = 0; i < 30; i++) e.arena.update(e.animTime += .05, e.technique, e.currentAnim);
      e.isPlaying = false; return [m.phase, m.result.winner];
    }, [win, PTS]);
    const buttons = () => p.evaluate(() => [...document.querySelectorAll('#fightResults .fight-result-actions button')].map(x => x.textContent));
    // story fight (first Brick fight)
    await p.evaluate(() => { const g = ringfighterGame; AdventureOldTown.storyFightStart({ store: g.store, startTraining: g.startTraining, startFight: g.startFight, change: a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } }, 'first_brick'); });
    await p.waitForTimeout(3000); console.log(lang, 'storyFight flag', await p.evaluate(() => app.engine.arena.fightView.storyFight)); await p.evaluate(() => { window.__st = window.setTimeout; window.setTimeout = (f, ms, ...a) => (ms === 1500 || ms === 150 ? 0 : window.__st(f, ms, ...a)); }); /* hold the story hook so the result stays on screen for the picture */ console.log(lang, 'story', await finish('rabbit')); await p.waitForTimeout(800); console.log('skip', await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => x.offsetParent && /Skip|דילוג|Пропустить/.test(x.textContent)); b.forEach(x => x.click()); return b.length; })); await p.waitForTimeout(2500);
    console.log(lang, 'story buttons', await buttons());
    await p.screenshot({ path: out(`story-result-${lang}.png`), timeout: 240000 });
    if (process.env.STORY_ONLY) { await p.close(); continue; }
    // free fight
    await p.reload({ timeout: 300000 }); await ready();
    await p.waitForFunction(() => app.engine.coach?.anatomy, null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.evaluate(async () => { document.querySelector('.gm-fab').click(); await new Promise(r => setTimeout(r, 500)); [...document.querySelectorAll('.gm-item')].find(x => /^(Fight|קרב)/.test(x.textContent.trim())).click(); await new Promise(r => setTimeout(r, 800)); document.querySelector('[data-fight-preset=club]').click(); await new Promise(r => setTimeout(r, 3000)); });
    console.log(lang, 'break', await p.evaluate(async () => {
      const e = app.engine, m = e.arena.fightView.match, up = () => e.arena.update(e.animTime += .05, e.technique, e.currentAnim);
      e.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5); m.roundTime = m.roundSeconds - .3; for (let i = 0; i < 10; i++) up();
      for (let i = 0; i < 20 && m.phase !== 'rest'; i++) { m.advance(.1); up(); } for (let i = 0; i < 12; i++) { m.advance(.5); up(); }
      e.isPlaying = false; return [m.phase, Math.ceil(m.snapshot().restRemaining)];
    }));
    await p.waitForTimeout(800); await p.screenshot({ path: out(`corner-break-${lang}.png`), timeout: 240000 });
    console.log(lang, 'announcement hidden', await p.evaluate(() => document.querySelector('.bout-announcement')?.hidden));
    await p.evaluate(async () => { const e = app.engine, m = e.arena.fightView.match, up = () => e.arena.update(e.animTime += .05, e.technique, e.currentAnim); e.isPlaying = true; m.phase = 'round'; m.finish('lion', 'KO'); for (let i = 0; i < 40 && m.phase !== 'ceremony'; i++) { m.advance(.5); up(); } for (let i = 0; i < 30; i++) up(); e.isPlaying = false; });
    await p.waitForTimeout(800);
    console.log(lang, 'free buttons', await buttons());
    await p.screenshot({ path: out(`free-result-${lang}.png`), timeout: 240000 });
    console.log(lang, 'errors', errs.slice(0, 3)); await p.close();
  }
  await b.close();
})();
