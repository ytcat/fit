// GOTR-0084: the gym conversation (beat 1) and Bruno's deal after the first Brick fight (loss), as the player sees them at
// 402x690, EN and HE: one frame per line, each subtitle checked to be fully on screen and not clipped; RTL in Hebrew.
// Usage: APP_URL=http://127.0.0.1:8293/ SHOTS=qa/gotr-0084 node qa/gotr-0084/talk-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8293/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamCore && window.StoryScenes);
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
// The visible subtitle: the text element of the scene overlay that holds the line, its box and whether it is clipped.
const subtitle = (p, text) => p.evaluate(t => {
  const els = [...document.querySelectorAll('dialog[open] *, body > div *')].filter(e => e.children.length === 0 && e.textContent && e.textContent.includes(t.slice(0, 12)) && e.offsetParent !== null);
  const e = els[0]; if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return { text: e.textContent, dir: cs.direction, box: [r.left, r.top, r.right, r.bottom].map(Math.round), clipped: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
}, text);
async function walk(p, tag, sceneId, outcome, lang, prefix) {
  const scene = await p.evaluate(([id, o]) => { const s = DreamCore.variant(id, o); return s.lines.map(l => ({ t: l.t, who: l.who, text: l.text[app.lang] || l.text.en })); }, [sceneId, outcome]);
  await p.evaluate(([id, o]) => { window.__done = null; StoryScenes.play(id, { outcome: o, onDone: r => { window.__done = r; } }); }, [sceneId, outcome]);
  await wait(p, id => StoryScenes.playing === id, sceneId);
  const out = [];
  for (let i = 0; i < scene.length; i++) {
    const l = scene[i]; await p.evaluate(t => DreamScenes.seek(t + 1.4), l.t); await p.waitForTimeout(2500);
    const s = await subtitle(p, l.text); out.push({ i, who: l.who, ...s }); console.log(tag, sceneId, i, l.who, JSON.stringify(s));
    assert.ok(s && s.inside && !s.clipped, `${sceneId} line ${i} not fully shown: ${JSON.stringify(s)}`);
    if (lang === 'he') assert.equal(s.dir, 'rtl', 'Hebrew subtitle is RTL');
    await shot(p, `${tag}-${prefix}-${String(i + 1).padStart(2, '0')}-${l.who}`);
  }
  await p.evaluate(() => StoryScenes.stop()); await wait(p, () => window.__done); return out;
}
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const tag = `402x690-${lang}`, p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); localStorage.setItem('shadowbox-language', l); }, lang); await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(l); app.engine.career.store.create('Talk QA'); localStorage.setItem('gotr.adv.intro.' + app.engine.career.store.current().id, '1'); }, lang);
      await walk(p, tag, 'dream_gym_talk', undefined, lang, 'talk');
      await walk(p, tag, 'dream_after_brick', 'loss', lang, 'deal-loss');
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('talk browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
