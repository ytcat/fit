// GOTR-0069 story mode from a fresh profile: open Adventure -> title card -> arrival scene -> step 1 BEFORE beat on the map ->
// One-two on the mitts -> AFTER beat (Coach reaction, stars, "Unlocked: 2. Brick's bag", Next) -> quest panel "Step 2 of 8" with
// step 1 done, step 2 current, step 3 locked. Screenshots (webp) at 402x690 and 1366x768, EN and HE. APP_URL, SHOTS=dir.
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
// Layout audit: nothing outside the viewport, the map keeps its aspect (canvas buffer vs box), text not clipped in the beat.
const audit = p => p.evaluate(() => {
  const st = document.querySelector('dialog[open] .adv-stage'), cv = st?.querySelector('canvas'), r = st?.getBoundingClientRect();
  const clipped = [...document.querySelectorAll('#sfBeat p, .sf-quest p, .sf-quest h4, .sf-quest button')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis').map(e => e.textContent.slice(0, 40));
  const out = [...document.querySelectorAll('#sfBeat *, .sf-quest *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.className);
  return { docW: document.documentElement.scrollWidth, vw: innerWidth, mapH: Math.round(r?.height || 0), aspectBox: r ? +(r.width / r.height).toFixed(3) : 0, aspectBuf: cv ? +(cv.width / cv.height).toFixed(3) : 0, clipped, out };
});
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [vw, vh] of [[402, 690], [1366, 768]]) for (const lang of ['en', 'he']) {
      const tag = `${vw}x${vh}-${lang}`, p = await b.newPage({ viewport: { width: vw, height: vh } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); });
      await p.reload({ timeout: 300000 }); await ready(p);
      // Adventure is the home screen (GOTR-0063): with a new profile it opens by itself and the story starts.
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(l); localStorage.setItem('shadowbox-language', l); app.engine.career.store.create('Story Mode QA'); }, lang); await p.reload({ timeout: 300000 });
      await wait(p, () => document.getElementById('advTitleCard') || window.StoryScenes?.playing === 'arrival', null, 300000); console.log(tag, 'title card', await p.evaluate(() => document.getElementById('advTitleCard')?.textContent || '(already in the scene)'));
      await wait(p, () => window.StoryScenes?.playing === 'arrival', null, 120000); console.log(tag, 'arrival scene playing');
      await p.waitForTimeout(800); await p.evaluate(() => StoryScenes.stop());
      // step 1 BEFORE beat on the map
      await wait(p, () => document.querySelector('dialog[open] .adv-stage #sfBeat .sf-beat-main'), null, 120000); await p.waitForTimeout(1500);
      const pre = await p.evaluate(() => document.getElementById('sfBeat').innerText.replace(/\n+/g, ' | ')); console.log(tag, 'before', pre);
      assert.ok(/Step 1 of 8|שלב 1 מתוך 8/.test(pre), pre);
      if (lang === 'he') assert.ok(/פרק 1/.test(pre), 'Hebrew text: ' + pre);
      const a1 = await audit(p); console.log(tag, 'audit before', JSON.stringify(a1)); assert.ok(a1.docW <= vw && !a1.clipped.length && !a1.out.length && Math.abs(a1.aspectBox - a1.aspectBuf) < .02, JSON.stringify(a1));
      await shot(p, `${tag}-1-before-step1`);
      await p.evaluate(() => document.querySelector('#sfBeat .sf-beat-main').click());
      await wait(p, () => document.getElementById('advGoal') && app.engine.career.active); console.log(tag, 'mission strip', await p.evaluate(() => document.getElementById('advGoal').innerText.replace(/\n/g, ' ')));
      await p.evaluate(() => { for (let i = 0; i < 14; i++) app.engine.onImpact({ actor: 'lion', receiver: 'pads', kind: 'pad', move: i % 2 ? 'cross' : 'jab', blocked: false, impulse: 20 }); app.engine.career.finish(); });
      // AFTER beat on the map: Coach reaction, stars, what opened, Next
      await wait(p, () => document.querySelector('dialog[open] .adv-stage #sfBeat .sf-beat-unlock'), null, 120000); await p.waitForTimeout(1500);
      const post = await p.evaluate(() => ({ text: document.getElementById('sfBeat').innerText.replace(/\n+/g, ' | '), next: document.querySelector('#sfBeat .sf-beat-main').textContent }));
      console.log(tag, 'after', JSON.stringify(post)); assert.ok(/★★☆/.test(post.text) && /Unlocked: 2\. Brick's bag|נפתח: 2\. השק של בריק/.test(post.text) && /Brick's bag|השק של בריק/.test(post.next), JSON.stringify(post));
      const a2 = await audit(p); console.log(tag, 'audit after', JSON.stringify(a2)); assert.ok(a2.docW <= vw && !a2.clipped.length && !a2.out.length, JSON.stringify(a2));
      await shot(p, `${tag}-2-after-step1`);
      // back to the map: the quest panel shows step 2 as current; step 1 done, step 3 locked
      await p.evaluate(() => [...document.querySelectorAll('#sfBeat button')].pop().click()); await p.waitForTimeout(1200);
      const q = await p.evaluate(() => ({ kicker: document.querySelector('.sf-kicker').textContent, title: document.querySelector('.sf-title').textContent, primary: document.querySelector('.sf-primary').textContent, steps: [...document.querySelectorAll('.sf-step')].map(li => li.className.replace('sf-step ', '') + ':' + li.querySelector('.sf-state').textContent), level: document.querySelector('.sf-level').textContent }));
      console.log(tag, 'quest', JSON.stringify(q)); assert.ok(/Step 2 of 8|שלב 2 מתוך 8/.test(q.kicker) && q.steps[0].startsWith('sf-done') && q.steps[1].startsWith('sf-current') && q.steps[2].startsWith('sf-locked'), JSON.stringify(q));
      const a3 = await audit(p); console.log(tag, 'audit sheet', JSON.stringify(a3)); assert.ok(a3.docW <= vw && !a3.clipped.length && !a3.out.length && a3.mapH >= (vw < 600 ? 250 : 300) && Math.abs(a3.aspectBox - a3.aspectBuf) < .02, JSON.stringify(a3));
      await shot(p, `${tag}-3-quest-step2`);
      await p.evaluate(() => document.querySelector('.sf-toggle').click()); await p.waitForTimeout(700); await shot(p, `${tag}-4-timeline`);
      if (vw === 402 && lang === 'en') { // Continue -> step 2's BEFORE beat is Brick's scene (first time)
        await p.evaluate(() => document.querySelector('.sf-primary').click());
        await wait(p, () => window.StoryScenes?.playing === 'brick', null, 120000); console.log(tag, 'step 2 before: brick scene playing'); await p.evaluate(() => StoryScenes.stop());
        await wait(p, () => window.StoryScenes?.playing === 'carry_bag', null, 120000); console.log(tag, "step 2: Brick's bag trial running"); await p.evaluate(() => StoryScenes.stop());
      }
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('story mode browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
