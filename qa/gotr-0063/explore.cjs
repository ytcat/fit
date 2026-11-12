const { chromium } = require('playwright');
const W = +(process.env.W || 402), H = +(process.env.H || 690), OUT = process.env.OUT || '';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://127.0.0.1:8763/', { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 300000 });
  if (process.env.PROFILE) { await p.evaluate(() => { localStorage.clear(); app.engine.career.store.create('QA'); }); await p.reload({ timeout: 300000 }); await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 300000 }); }
  if (process.env.EVAL) await p.evaluate(process.env.EVAL);
  await p.waitForTimeout(+(process.env.WAIT || 1500));
  const r = await p.evaluate(() => {
    const box = n => { const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    const R = s => { const n = document.querySelector(s); return n ? box(n).concat(getComputedStyle(n).display) : null; };
    return {
      dialogs: [...document.querySelectorAll('dialog[open]')].map(d => d.className + '|' + d.textContent.slice(0, 60)), profile: !!app.engine.career.store.current(),
      header: R('header'), nav: R('.game-nav'), tools: R('.club-head-tools'),
      buttons: [...document.querySelector('header').querySelectorAll('button,a')].filter(b => b.offsetParent).map(b => (b.className || b.id) + ':' + b.textContent.trim().slice(0, 18) + ':' + box(b)),
      stage: R('#stageContainer'), toolbar: R('.ringside-toolbar'),
      toolbarKids: [...(document.querySelector('.ringside-toolbar')?.children || [])].filter(b => b.offsetParent).map(b => (b.className || b.id).slice(0, 30) + ':' + b.textContent.trim().slice(0, 18) + ':' + box(b)),
      stageKids: [...document.querySelectorAll('#stageContainer *')].filter(n => n.offsetParent && n.children.length < 6 && getComputedStyle(n).position !== 'static' && n.tagName !== 'CANVAS').map(n => (n.id || n.className || n.tagName).toString().slice(0, 28) + ':' + box(n)).slice(0, 60)
    };
  });
  console.log(JSON.stringify(r, null, 1));
  if (OUT) await p.screenshot({ path: OUT });
  await b.close();
})();
