// GOTR-0078 "The Dream", beats 0 -> 2 from a fresh profile (agent/dream-flow): open Adventure -> opening film (beat 0) ->
// gym conversation with Bruno (beat 1) -> first fight vs Brick (beat 2), FORCED LOSS -> Bruno's job offer -> quest panel with
// step 4 (Night Shadowboxing) current and side job A open. Works alone (portrait-conversation fallback) and lights up with the
// agent/dream-1 scenes (dream_opening / dream_gym_talk / dream_after_brick, StoryCast Brick) when they are merged.
// Also checks the post-fight Next row (no box over the fighters). Screenshots (webp) at 402x690, EN and HE.
// Usage: APP_URL=http://127.0.0.1:8293/ SHOTS=qa/gotr-0078/flow node qa/gotr-0078/flow-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8293/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
const beatText = p => p.evaluate(() => document.getElementById('sfBeat')?.innerText.replace(/\n+/g, ' | ') || '');
const clickMain = p => p.evaluate(() => document.querySelector('#sfBeat .sf-beat-main').click());
// Fighter boxes on screen (projected bounding spheres of both fight rigs) vs every visible UI element over the stage.
const overlap = p => p.evaluate(() => {
  const e = app.engine, cam = e.camera, canvas = e.renderer.domElement.getBoundingClientRect(), V = new THREE.Vector3(), boxes = [];
  for (const rig of [e.coach, e.arena?.rabbit].filter(Boolean)) {
    const b = new THREE.Box3().setFromObject(rig.root || rig.group || rig.model || rig); if (b.isEmpty()) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { V.set(x, y, z).project(cam); const sx = canvas.left + (V.x + 1) / 2 * canvas.width, sy = canvas.top + (1 - V.y) / 2 * canvas.height; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    boxes.push([x0, y0, x1, y1].map(Math.round));
  }
  const next = document.getElementById('advNext'), r = next?.getBoundingClientRect();
  const hits = r ? boxes.filter(([x0, y0, x1, y1]) => r.left < x1 && r.right > x0 && r.top < y1 && r.bottom > y0) : [];
  return { boxes, next: r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null, inStage: !!next?.closest('#stageContainer'), hits: hits.length, bg: next ? getComputedStyle(next).backgroundColor : '' };
});
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const tag = `402x690-${lang}`, p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); });
      await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(l); localStorage.setItem('shadowbox-language', l); app.engine.career.store.create('Dream QA'); }, lang); await p.reload({ timeout: 300000 });
      const dream1 = await p.evaluate(() => (window.StoryScenes?.sceneIds || []).includes('dream_opening'));
      console.log(tag, 'agent/dream-1 scenes present:', dream1);
      // Beat 0: the opening film (or its portrait fallback). Never a text panel first.
      await wait(p, () => window.StoryScenes?.playing === 'dream_opening' || document.querySelector('#sfBeat .sf-beat-line'), null, 300000);
      const first = await p.evaluate(() => ({ film: window.StoryScenes?.playing || null, beat: document.getElementById('sfBeat')?.innerText.replace(/\n+/g, ' | ') || '', quest: !!document.querySelector('dialog[open] .sf-quest:not([hidden])') && !document.getElementById('sfBeat') }));
      console.log(tag, 'beat 0', JSON.stringify(first)); assert.ok(first.film === 'dream_opening' || /Big city|עיר גדולה/.test(first.beat), JSON.stringify(first));
      if (first.film) { await p.waitForTimeout(2500); await shot(p, `${tag}-0-opening-film`); await p.evaluate(() => StoryScenes.stop()); }
      else { await p.waitForTimeout(1200); await shot(p, `${tag}-0-arrival`); await clickMain(p); }
      // Beat 1: the gym conversation, chained without a stop.
      await wait(p, () => window.StoryScenes?.playing === 'dream_gym_talk' || /Bruno|ברונו/.test(document.querySelector('#sfBeat .sf-beat-line')?.innerText || ''), null, 300000);
      if (await p.evaluate(() => window.StoryScenes?.playing === 'dream_gym_talk')) { await p.waitForTimeout(3000); await shot(p, `${tag}-1-gym-talk`); await p.evaluate(() => StoryScenes.stop()); }
      else { await p.waitForTimeout(1000); console.log(tag, 'beat 1', await beatText(p)); await shot(p, `${tag}-1-gym-talk`); await clickMain(p); await p.waitForTimeout(600); console.log(tag, 'beat 1 page 2', await beatText(p)); await shot(p, `${tag}-1b-gym-talk`); await clickMain(p); }
      // Beat 2: the fight vs Brick starts by itself. Force a loss.
      await wait(p, () => app.engine.arena?.fightView && AdventureOldTown.run?.id === 'first_brick', null, 300000);
      const fight = await p.evaluate(() => { const v = app.engine.arena.fightView, sp = v.careerEntry.species, foe = v.match.fighters[sp === 'lion' ? 'rabbit' : 'lion'], me = v.match.fighters[sp]; return { name: v.careerEntry.opponentName, foe: { power: +foe.power.toFixed(2), tempo: +foe.tempo.toFixed(2), skill: +foe.skill.toFixed(2) }, me: { power: +me.power.toFixed(2), tempo: +me.tempo.toFixed(2), skill: +me.skill.toFixed(2) }, brickRig: app.engine.arena?.rabbit?.character || null, strip: document.getElementById('advGoal')?.innerText }; });
      console.log(tag, 'beat 2 fight', JSON.stringify(fight)); assert.ok(/Brick|בריק/.test(fight.name) && fight.foe.power > fight.me.power * 1.1, JSON.stringify(fight));
      await p.waitForTimeout(4000); await shot(p, `${tag}-2-fight-brick`);
      await p.evaluate(() => { const v = app.engine.arena.fightView, sp = v.careerEntry.species; v.match.finish(sp === 'lion' ? 'rabbit' : 'lion', 'KO'); });
      // After: dream_after_brick (loss variant) or Bruno's lines on the map; job + side job unlocked; step 4 next.
      await wait(p, () => window.StoryScenes?.playing === 'dream_after_brick' || document.querySelector('dialog[open] #sfBeat .sf-beat-unlock'), null, 300000);
      if (await p.evaluate(() => window.StoryScenes?.playing === 'dream_after_brick')) { await p.waitForTimeout(3000); await shot(p, `${tag}-3a-after-brick-scene`); await p.evaluate(() => StoryScenes.stop()); await wait(p, () => document.querySelector('dialog[open] #sfBeat .sf-beat-unlock'), null, 300000); }
      await p.waitForTimeout(1500);
      const after = await beatText(p); console.log(tag, 'after brick', after);
      assert.ok(/You got up|קמתם/.test(after) && /lost to Brick|הפסדתם לבריק/.test(after) && /Clean the gym|לנקות את האולם/.test(after) && /Night Shadowboxing|Shadowboxing/.test(after), after);
      const save = await p.evaluate(() => ringfighterGame.store.game().adventure.story); console.log(tag, 'save', JSON.stringify(save)); assert.equal(save.firstBrick, 'lost'); assert.deepEqual(save.done, ['dream_arrival', 'dream_gym_talk', 'first_brick']);
      await shot(p, `${tag}-3-job-offer`);
      // Back to the map: the quest panel leads with the picture, step 4 current, side job open.
      await p.evaluate(() => [...document.querySelectorAll('#sfBeat button')].pop().click()); await p.waitForTimeout(1200);
      const q = await p.evaluate(() => ({ pic: !!document.querySelector('.sf-quest .sf-pic .adv-bust'), first: document.querySelector('.sf-quest')?.firstElementChild?.className, kicker: document.querySelector('.sf-kicker')?.textContent, title: document.querySelector('.sf-title')?.textContent, why: document.querySelector('.sf-why')?.textContent, steps: [...document.querySelectorAll('.sf-step')].map(e => e.className + ' ' + e.textContent.slice(0, 30)) }));
      console.log(tag, 'quest', JSON.stringify(q)); assert.ok(q.pic && q.first === 'sf-pic' && /Step 4 of 13|שלב 4 מתוך 13/.test(q.kicker), JSON.stringify(q));
      assert.ok(q.steps[2].startsWith('sf-step sf-done') && q.steps[3].includes('sf-side') && q.steps[4].startsWith('sf-step sf-current'), JSON.stringify(q.steps));
      await shot(p, `${tag}-4-quest-step4`);
      await p.evaluate(() => document.querySelector('.sf-toggle').click()); await p.waitForTimeout(700); await shot(p, `${tag}-5-timeline`);
      // GOTR-0078 item 7: after a free fight the Next row sits in the bottom action area, never over a fighter.
      if (lang === LANGS[0]) {
        await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); ringfighterGame.startFight({ preset: 'quick', rounds: 1, roundSeconds: 30, restSeconds: 0 }); });
        await wait(p, () => app.engine.arena?.fightView?.match); await p.waitForTimeout(2500);
        await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'KO'); });
        await wait(p, () => document.getElementById('advNext'), null, 300000); await p.waitForTimeout(2500);
        const o = await overlap(p); console.log(tag, 'next row', JSON.stringify(o)); await shot(p, `${tag}-6-next-row-after-fight`);
        assert.equal(o.hits, 0, 'the Next row covers a fighter: ' + JSON.stringify(o)); assert.ok(!o.inStage, 'the Next row is outside the stage');
      }
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('dream flow browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
