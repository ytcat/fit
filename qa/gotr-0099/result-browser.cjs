// GOTR-0099 evidence: the fight result line ("<Name> won" over "Final result") at 402x690 in EN/HE/RU, in the ring (free
// fight, TKO and points) and in the first Brick fight on the gym floor (story path). Measures that the two lines never overlap,
// stay inside the stage and clear of the edge tools, the judges' cards do not touch the line, and the story fight has no
// "New fight" button.   node qa/gotr-0099/result-browser.cjs   (APP_URL default http://127.0.0.1:8731/)
// Writes qa/gotr-0099/result-<case>-<lang>.webp and result.json.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8731/', OUT = __dirname;
const CASES = (process.env.CASES || 'ring-tko,ring-points,gym-story').split(','), LANGS = (process.env.LANGS || 'en,he,ru').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), all = [], log = [];
  for (const lang of LANGS) for (const kase of CASES) {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } });
    p.on('pageerror', e => log.push('PAGEERROR ' + e.message));
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private */ } });
    await p.goto(URL, { timeout: 300000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown && window.StoryCast, null, { timeout: 300000 });
    const r = await p.evaluate(async ([kase, lang]) => {
      document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(lang); window.ringfighterGame.close?.(); // the home map would cover the bout
      const rg = window.ringfighterGame, e = app.engine, sleep = ms => new Promise(q => setTimeout(q, ms));
      if (kase === 'gym-story') { const ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } }; AdventureOldTown.storyFightStart(ctx, 'first_brick'); }
      else rg.startFight({ seed: 9, rounds: 1, roundSeconds: 20, restSeconds: 0 });
      await sleep(4000);
      const v = e.arena.fightView, m = v.match, win = v.careerEntry?.species || 'lion'; e.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5);
      if (kase === 'ring-points') { while (!m.result && m.phase !== 'ceremony') m.advance(.5); } else m.finish(win, 'TKO', true);
      for (let i = 0; i < 400 && !(m.phase === 'ceremony' && m.phaseTime > 1.6); i++) { try { e.arena.update(e.animTime += .05, e.technique, e.currentAnim); } catch (x) { m.advance(.05); } e.cameraDirector?.update?.(.05); if (m.phase !== 'ceremony' && m.result) m.advance(.05); }
      e.isPlaying = false; e.lastRenderStamp = null; window.ringfighterGame.close?.(); document.querySelectorAll("dialog[open]").forEach(d => d.close()); window.fightUI.render(v); await sleep(700);
      const box = n => { const q = n?.getBoundingClientRect(); return q ? { x: +q.left.toFixed(1), y: +q.top.toFixed(1), r: +q.right.toFixed(1), b: +q.bottom.toFixed(1) } : null; };
      const node = document.querySelector('#stageContainer .bout-announcement'), st = box(node?.querySelector('strong')), sp = box(node?.querySelector('span')), stage = box(document.getElementById('stageContainer'));
      const tools = [...document.querySelectorAll('#gameModes button, #stageContainer .stage-tools button, .edge-tools button')].filter(x => x.offsetParent).map(box);
      const cards = box(document.querySelector('#fightResults .fight-card-grid'));
      const hit = (a, c) => !!(a && c && a.x < c.r - .5 && c.x < a.r - .5 && a.y < c.b - .5 && c.y < a.b - .5);
      const buttons = [...document.querySelectorAll('#fightResults button')].filter(x => x.offsetParent).map(x => x.textContent);
      return { kase, lang, phase: m.phase, method: m.result?.method, stoppage: m.result?.stoppage, text: [node?.querySelector('strong')?.textContent, node?.querySelector('span')?.textContent], hidden: node?.hidden, strong: st, sub: sp, overlap: hit(st, sp), inStage: !!(st && stage && st.x >= stage.x && st.r <= stage.r && sp.x >= stage.x && sp.r <= stage.r), toolHit: tools.some(t => hit(t, st) || hit(t, sp)), cards, cardsHit: hit(cards, st) || hit(cards, sp), story: !!(v.storyFight || v.gymFight), buttons };
    }, [kase, lang]);
    const png = path.join(OUT, `.result-${kase}-${lang}.png`); await p.screenshot({ path: png, timeout: 300000 });
    execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=84)', png, path.join(OUT, `result-${kase}-${lang}.webp`)]); fs.unlinkSync(png);
    console.log(JSON.stringify(r)); all.push(r); await p.close();
  }
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ viewport: [402, 690], results: all, log }, null, 1) + '\n');
  console.log('console', log.length ? log.join(' | ') : 'clean'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
