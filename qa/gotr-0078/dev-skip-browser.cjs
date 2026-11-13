// Owner's dev tools at 402x690 EN: "Skip step (dev)" in the quest panel (development build only), locked steps startable from the
// timeline in dev, nothing of that when the channel is not 'dev', and "Reset game" in the Player & backup dialog bringing back the
// welcome. Usage: APP_URL=http://127.0.0.1:8293/ SHOTS=qa/gotr-0078/flow node qa/gotr-0078/dev-skip-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8293/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
const panel = p => p.evaluate(() => ({ kicker: document.querySelector('.sf-kicker')?.textContent, title: document.querySelector('.sf-title')?.textContent, skip: document.querySelector('.sf-dev-skip')?.textContent || null, lockedButtons: [...document.querySelectorAll('.sf-locked button.sf-step-b')].length, locked: document.querySelectorAll('.sf-locked').length }));
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL, { timeout: 300000 }); await ready(p);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); }); await p.reload({ timeout: 300000 }); await ready(p);
    const channel = await p.evaluate(() => APP_VERSION.channel); console.log('channel', channel); assert.equal(channel, 'dev');
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.engine.career.store.create('Dev QA'); localStorage.setItem('gotr.adv.intro.' + app.engine.career.store.current().id, '1'); ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }); });
    await wait(p, () => document.querySelector('.sf-dev-skip')); await p.waitForTimeout(1200);
    const q0 = await panel(p); console.log('dev start', JSON.stringify(q0)); assert.ok(/Step 1 of 13/.test(q0.kicker) && q0.skip === 'Skip step (dev)', JSON.stringify(q0));
    await shot(p, 'dev-skip-1-quest-step1');
    for (let i = 0; i < 3; i++) { const before = await p.evaluate(() => document.querySelector('.sf-kicker').textContent); await p.evaluate(() => document.querySelector('.sf-dev-skip').click()); await wait(p, k => document.querySelector('.sf-kicker')?.textContent !== k && document.querySelector('.sf-dev-skip'), before); }
    await p.waitForTimeout(1000); const q1 = await panel(p); console.log('after 3 skips', JSON.stringify(q1));
    assert.ok(/Step 4 of 13/.test(q1.kicker), JSON.stringify(q1)); assert.equal(await p.evaluate(() => ringfighterGame.store.game().adventure.story.firstBrick), 'lost');
    await shot(p, 'dev-skip-2-quest-step4');
    await p.evaluate(() => document.querySelector('.sf-toggle').click()); await p.waitForTimeout(800);
    const q2 = await panel(p); console.log('timeline', JSON.stringify(q2)); assert.ok(q2.locked > 0 && q2.lockedButtons === q2.locked, 'dev: locked steps are tappable');
    await shot(p, 'dev-skip-3-timeline-locked-tappable');
    await p.evaluate(() => [...document.querySelectorAll('.sf-locked button.sf-step-b')].find(x => /Docks/.test(x.textContent)).click());
    await wait(p, () => /The Docks/.test(document.getElementById('sfBeat')?.innerText || '')); await p.waitForTimeout(800);
    console.log('locked step opened', await p.evaluate(() => document.getElementById('sfBeat').innerText.replace(/\n+/g, ' | ')));
    await shot(p, 'dev-skip-4-locked-docks-opened');
    // Not the development build: no skip button, locked steps are not buttons.
    await p.evaluate(() => { document.getElementById('sfBeat')?.remove(); window.APP_VERSION = { ...APP_VERSION, channel: 'live' }; ringfighterGame.close?.(); ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }); });
    await wait(p, () => document.querySelector('.sf-quest .sf-kicker')); await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelector('.sf-toggle')?.click()); await p.waitForTimeout(800);
    const q3 = await panel(p); console.log('live channel', JSON.stringify(q3)); assert.ok(q3.skip === null && q3.lockedButtons === 0, JSON.stringify(q3));
    await shot(p, 'dev-skip-5-live-no-skip');
    // Reset game: Player & backup dialog -> Reset game -> confirm -> reload -> welcome again (no profile, opening film next).
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.engine.career.profileDialog(); document.querySelector('.career-reset-group').open = true; });
    await p.waitForTimeout(800); console.log('reset dialog', await p.evaluate(() => document.querySelector('.career-reset-group').innerText.replace(/\n+/g, ' | ')));
    await p.evaluate(() => document.querySelector('.career-reset-group').scrollIntoView({ block: 'center' })); await shot(p, 'dev-skip-6-reset-confirm');
    await Promise.all([p.waitForNavigation({ timeout: 300000 }), p.evaluate(() => document.querySelector('.career-reset-go').click())]); await ready(p);
    await wait(p, () => document.querySelector('dialog[open].career-welcome')); await p.waitForTimeout(800);
    const after = await p.evaluate(() => ({ profiles: app.engine.career.store.data.profiles.length, lang: localStorage.getItem('shadowbox-language'), welcome: document.querySelector('dialog[open].career-welcome h2')?.textContent }));
    console.log('after reset', JSON.stringify(after)); assert.ok(after.profiles === 0 && after.lang === 'en' && after.welcome, JSON.stringify(after));
    await shot(p, 'dev-skip-7-after-reset-welcome');
    const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n'));
    console.log('dev skip browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
