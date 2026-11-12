// GOTR-0063: Adventure is the home screen; one modes button replaces the Train / Fight / Adventure tab row.
// Per size/language: fresh profile -> Adventure home (first run: chapter title -> arrival scene), modes stack expands, Training and Fight
// start from it, Adventure returns to the chapter sheet, Rivals & Cup closes back home; geometry checks (no overflow, no overlaps).
// Static server :8763 (APP_URL). SHOTS=dir for screenshots. ONLY="402x690-en,..." to limit runs.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8763/', SHOTS = process.env.SHOTS || '';
const RUNS = [[402, 690, 'en'], [402, 690, 'he'], [360, 640, 'en'], [360, 640, 'he'], [1366, 768, 'en']].filter(([w, h, l]) => !process.env.ONLY || process.env.ONLY.split(',').includes(`${w}x${h}-${l}`));
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && window.GameModes && app.engine.coach?.anatomy);
// geometry probe run in the page: rects of the modes button/stack and the things it must not cover
const probe = () => {
  const R = n => { if (!n || !n.isConnected) return null; const r = n.getBoundingClientRect(); return r.width && r.height && getComputedStyle(n).visibility !== 'hidden' ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
  const hit = (a, b) => a && b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
  const header = document.querySelector('header'), hb = [...header.querySelectorAll('button,a')].map(R).filter(Boolean);
  const fab = R(document.querySelector('.gm-fab')), items = [...document.querySelectorAll('.gm-item')].map(R).filter(Boolean);
  const under = !!document.querySelector('dialog.game-home[open]'); // on the home map the stage (pad, HUD) is hidden under the map layer
  const pad = under ? [] : [...document.querySelectorAll('.fp-zone,.fp-btn,.fp-dpad,#camLock,#playBtn,#burstControl,.fp-chip-face')].map(R).filter(Boolean);
  const hud = under ? [] : [...document.querySelectorAll('#fightHealth,.fight-health-player,#advGoal,#advNext,#powerGauge,.academy-hud,.stage-hud-line,.bout-announcement')].map(R).filter(Boolean);
  const bar = [...document.querySelectorAll('.ringside-toolbar > *')].filter(n => n.offsetParent).map(R).filter(Boolean);
  const tools = [...document.querySelectorAll('.gm-tool')].filter(n => n.offsetParent).map(R).filter(Boolean);
  const mine = [fab, ...items, ...tools].filter(Boolean), count = list => mine.reduce((n, m) => n + list.filter(x => hit(m, x)).length, 0);
  // fighters' screen boxes (whole body incl. head): project each fighter's 3D bounding box with the game camera
  const e = app.engine, home0 = document.querySelector('dialog.game-home[open]'), view = e.targetMode === 'fight' ? e.arena?.fightView : null;
  const roots = home0 ? [] : view ? [...new Set(Object.values(view.coaches || {}))].map(c => c.root) : [e.coach?.root];
  const cv = e.renderer.domElement.getBoundingClientRect(), fighters = roots.filter(Boolean).map(o => {
    o.updateWorldMatrix(true, true); const bx = new THREE.Box3().setFromObject(o); if (bx.isEmpty()) return null; let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    for (const x of [bx.min.x, bx.max.x]) for (const y of [bx.min.y, bx.max.y]) for (const z of [bx.min.z, bx.max.z]) { const v = new THREE.Vector3(x, y, z).project(e.camera); const px = cv.left + (v.x + 1) / 2 * cv.width, py = cv.top + (1 - v.y) / 2 * cv.height; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py); }
    return { l: Math.max(l, cv.left), t: Math.max(t, cv.top), r: Math.min(r, cv.right), b: Math.min(b, cv.bottom) }; }).filter(Boolean);
  const clip = () => [...document.querySelectorAll('.ringside-toolbar > *')].filter(n => n.offsetParent && n.scrollWidth > n.clientWidth + 1).map(n => n.textContent.trim().slice(0, 14)).join('|');
  const home = document.querySelector('dialog.game-home[open]'), hr = R(home), H = header.getBoundingClientRect();
  const inView = mine.every(m => m.l >= 0 && m.t >= 0 && m.r <= innerWidth && m.b <= innerHeight);
  const topAt = fab ? document.elementFromPoint((fab.l + fab.r) / 2, (fab.t + fab.b) / 2) : null;
  return { docW: document.documentElement.scrollWidth, vw: innerWidth, headerBottom: Math.round(H.bottom), fab: fab && [fab.l, fab.t, fab.r, fab.b].map(Math.round), items: items.length, inView,
    overHeader: count(hb) + (fab && fab.t < H.bottom - .5 ? 1 : 0), overPad: count(pad), overHud: count(hud), overToolbar: count(bar), toolbarShown: bar.length, overFighter: count(fighters), fighters: fighters.map(f => [f.l, f.t, f.r, f.b].map(Math.round)), tools: tools.length, fabOnTop: !!topAt?.closest('.gm-modes'),
    home: !!home, homeTop: hr && Math.round(hr.t), homeCovers: hr ? !!document.elementFromPoint(innerWidth / 2, (hr.t + hr.b) / 2)?.closest('dialog.game-home') : null,
    mode: app.engine.targetMode, playing: app.engine.isPlaying, current: [...document.querySelectorAll('.gm-item[aria-current="true"]')].map(b => b.dataset.mode).join(),
    tabRow: !!(document.querySelector('.game-nav')?.offsetHeight), stageTop: Math.round(document.getElementById('stageContainer').getBoundingClientRect().top), sheet: document.querySelector('dialog.game-home .adv-card:not([hidden]) h3')?.textContent || null };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const out = [];
  try {
    for (const [W, H, lang] of RUNS) {
      const tag = `${W}x${H}-${lang}`, first = out.length === 0;
      const p = await b.newPage({ viewport: { width: W, height: H } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await p.evaluate(l => { localStorage.clear(); localStorage.setItem('shadowbox-language', l); }, lang);
      await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      // fresh profile: the welcome dialog, then the Adventure home
      await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
      await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Home QA'; d.querySelector('button[type=submit]').click(); });
      await wait(p, () => document.querySelector('dialog.game-home[open]')); await ready(p);
      const r = { tag };
      // GOTR-0060 first run still plays: chapter title -> arrival scene -> home with "Start the story"
      r.titleCard = await (await wait(p, () => document.getElementById('advTitleCard')?.textContent)).jsonValue();
      await wait(p, () => window.StoryScenes?.playing === 'arrival', null, 180000); r.arrival = true;
      await p.evaluate(() => StoryScenes.stop());
      await wait(p, () => document.querySelector('dialog.game-home[open] .adv-primary'), null, 180000); r.startBtn = await p.evaluate(() => document.querySelector('.adv-primary').textContent);
      await p.waitForTimeout(1500);
      r.homeClosed = await p.evaluate(probe);
      await p.evaluate(() => document.querySelector('.gm-fab').click()); await p.waitForTimeout(300);
      r.homeOpen = await p.evaluate(probe); r.labels = await p.evaluate(() => [...document.querySelectorAll('.gm-label')].map(l => getComputedStyle(l).display !== 'none' ? l.textContent : '').join('|'));
      r.labelsInView = await p.evaluate(() => [...document.querySelectorAll('.gm-label')].every(l => { const q = l.getBoundingClientRect(); return q.left >= 0 && q.right <= innerWidth; }));
      if (SHOTS && ['402x690-en', '360x640-he', '1366x768-en'].includes(tag)) await p.screenshot({ path: `${SHOTS}/${tag}-home-open.png`, timeout: 300000 });
      // outside tap collapses
      await p.mouse.click(Math.round(W / 2), Math.round(H * 0.55)); await p.waitForTimeout(200); r.collapsed = await p.evaluate(() => !GameModes.open);
      // Training from the modes stack
      await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="train"]').click(); });
      await wait(p, () => document.getElementById('trainingDrawer')?.open && !document.querySelector('dialog.game-home'), null, 60000); r.trainDrawer = true;
      await p.evaluate(() => { document.querySelector('#trainingDrawer [data-equipment="heavy"]')?.click(); document.getElementById('trainingDrawer').close(); });
      await p.waitForTimeout(1500); r.train = await p.evaluate(probe);
      // the timed session starts from its edge icon (former "Train 15s" toolbar button)
      r.timerLabel = await p.evaluate(() => document.querySelector('.gm-tool-timer:not([hidden])')?.textContent || null);
      await p.evaluate(() => document.querySelector('.gm-tool-timer').click()); await wait(p, () => app.engine.career.active, null, 60000); r.timerStarts = true;
      await p.waitForTimeout(1000); r.trainSession = await p.evaluate(probe);
      if (SHOTS && tag === '402x690-en') await p.screenshot({ path: `${SHOTS}/${tag}-training.png`, timeout: 300000 });
      await p.evaluate(() => GameModes.toggle(true)); await p.waitForTimeout(200); r.trainOpen = await p.evaluate(probe); await p.evaluate(() => GameModes.toggle(false));
      // Fight from the modes stack -> free fight setup -> quick fight
      await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="fight"]').click(); });
      await wait(p, () => document.querySelector('dialog.fight-dialog[open] [data-fight-preset="quick"]'), null, 60000);
      await p.evaluate(() => document.querySelector('dialog.fight-dialog[open] [data-fight-preset="quick"]').click());
      await wait(p, () => app.engine.targetMode === 'fight' && app.engine.arena?.fightView, null, 120000); await p.waitForTimeout(4000);
      r.fight = await p.evaluate(probe);
      if (SHOTS && ['360x640-he', '1366x768-en'].includes(tag)) await p.screenshot({ path: `${SHOTS}/${tag}-fight.png`, timeout: 300000 });
      await p.evaluate(() => GameModes.toggle(true)); await p.waitForTimeout(200); r.fightOpen = await p.evaluate(probe);
      // back to Adventure: home at the chapter sheet
      await p.evaluate(() => document.querySelector('.gm-item[data-mode="adventure"]').click());
      await wait(p, () => document.querySelector('dialog.game-home[open] .adv-card:not([hidden]) h3'), null, 180000); await p.waitForTimeout(800);
      r.back = await p.evaluate(probe);
      // Rivals & Cup opens as a menu; closing it by hand returns home
      await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="world"]').click(); });
      await wait(p, () => document.querySelector('dialog.game-dialog[open][data-tab="world"]'), null, 60000); r.cupCurrent = await p.evaluate(() => document.querySelector('.gm-item[aria-current="true"]')?.dataset.mode);
      await p.evaluate(() => document.querySelector('dialog.game-dialog[open][data-tab="world"] .game-close').click());
      await wait(p, () => document.querySelector('dialog.game-home[open]'), null, 60000); r.cupBackHome = true;
      // Fight Academy moved from the toolbar into the stack
      await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="learn"]').click(); });
      await wait(p, () => document.querySelector('dialog.game-dialog[open][data-tab="learn"]'), null, 60000); r.academy = true;
      await p.evaluate(() => document.querySelector('dialog.game-dialog[open][data-tab="learn"] .game-close').click());
      await wait(p, () => document.querySelector('dialog.game-home[open]'), null, 60000);
      if (first) { // mission: start the story from the sheet, then leave it through the modes button
        await wait(p, () => document.querySelector('dialog.game-home[open] .adv-primary'), null, 180000);
        await p.evaluate(() => document.querySelector('dialog.game-home .adv-primary').click());
        await wait(p, () => document.getElementById('advGoal') && app.engine.career.active, null, 120000); r.mission = await p.evaluate(probe);
        await p.evaluate(() => { GameModes.toggle(true); document.querySelector('.gm-item[data-mode="adventure"]').click(); });
        await wait(p, () => document.querySelector('dialog.game-home[open] .adv-card:not([hidden]) h3'), null, 180000);
        r.missionLeft = await p.evaluate(() => ({ goal: !!document.getElementById('advGoal'), run: !!AdventureOldTown.run, sheet: document.querySelector('dialog.game-home .adv-card h3').textContent }));
      }
      r.errors = errors.filter(e => !/GL Driver|ReadPixels/.test(e));
      console.log(JSON.stringify(r)); out.push(r); await p.close();
    }
  } finally { await b.close(); }
  for (const r of out) {
    const t = r.tag;
    assert.equal(r.homeClosed.home, true, t + ' opens in Adventure'); assert.equal(r.homeClosed.tabRow, false, t + ' no tab row'); assert.equal(r.homeClosed.homeCovers, true, t + ' home on top');
    for (const k of ['homeClosed', 'homeOpen', 'train', 'trainOpen', 'fight', 'fightOpen', 'back']) {
      const s = r[k]; assert.ok(s.docW <= s.vw, `${t} ${k} horizontal overflow ${s.docW}>${s.vw}`); assert.equal(s.overHeader, 0, `${t} ${k} header`); assert.equal(s.overPad, 0, `${t} ${k} pad`); assert.ok(s.inView, `${t} ${k} in view`); assert.ok(s.fabOnTop, `${t} ${k} fab on top`);
    }
    for (const k of ['homeClosed', 'train', 'trainSession', 'fight', 'back']) { assert.equal(r[k].overHud, 0, `${t} ${k} HUD`); assert.equal(r[k].toolbarShown, 0, `${t} ${k} toolbar row gone`); }
    if (r.mission) { assert.equal(r.mission.overFighter, 0, t + ' mission covers a fighter'); assert.equal(r.mission.overHud, 0, t + ' mission HUD'); assert.ok(r.mission.inView); }
    for (const k of ['train', 'trainSession', 'fight']) { assert.ok(r[k].fighters.length >= (k === 'fight' ? 2 : 1), `${t} ${k} fighter boxes`); assert.equal(r[k].overFighter, 0, `${t} ${k} covers a fighter`); assert.ok(r[k].tools >= 2, `${t} ${k} edge tools`); }
    for (const k of ['trainOpen', 'fightOpen']) assert.equal(r[k].overFighter, 0, `${t} ${k} open stack covers a fighter`);
    assert.ok(r.timerStarts && r.academy);
    assert.equal(r.homeOpen.items, 5); assert.ok(r.collapsed); assert.ok(r.labelsInView, t + ' labels in view');
    assert.equal(r.homeClosed.current, 'adventure'); assert.equal(r.train.current, 'train'); assert.equal(r.fight.current, 'fight'); assert.equal(r.cupCurrent, 'world');
    assert.notEqual(r.train.mode, 'fight'); assert.equal(r.fight.mode, 'fight'); assert.equal(r.fight.playing, true, t + ' fight runs');
    assert.equal(r.back.home, true); assert.ok(r.back.sheet, t + ' chapter sheet');
    if (r.missionLeft) assert.deepEqual([r.missionLeft.goal, r.missionLeft.run], [false, false]);
    assert.equal(r.errors.length, 0, r.errors.join('\n'));
  }
  console.log('GOTR-0063 home browser ok', out.length, 'runs');
})().catch(e => { console.error(e); process.exit(1); });
