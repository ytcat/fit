// The night shift's start (Bruno's note, HUD, Rinse) in one language. usage: node qa/mop-night/lang.cjs <outdir> <en|he|ru>
const { open, launchShift, frames } = require('./launch.cjs'), path = require('path');
(async () => {
  const [out, lang] = [process.argv[2] || __dirname, process.argv[3] || 'he']; const { p, close, errors } = await open({ lang });
  try {
    await launchShift(p); await frames(p, 6);
    await p.screenshot({ path: path.join(out, `after-lang-${lang}.png`) });
    const fit = await p.evaluate(() => [...document.querySelectorAll('.story-mop-hud, .mop-night-note, .mop-night-rinse, .story-mop-footer')].map(n => { const r = n.getBoundingClientRect(); return { c: n.className, l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), over: n.scrollWidth > n.clientWidth + 1 }; }));
    console.log(lang, JSON.stringify(fit), 'errors', JSON.stringify(errors));
  } finally { await close(); }
})().catch(e => { console.error(e); process.exit(1); });
