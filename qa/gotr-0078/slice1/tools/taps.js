// Controls of the Dream scenes in the browser: a conversation waits for a tap at every line and ends with onDone; Skip in the
// film jumps to the gym door and ends; after each scene the Fighter is back in the boxing kit in the game scene.
const assert = require('node:assert/strict');
module.exports = async (p) => {
  await p.waitForFunction(() => window.StoryScenes && window.DreamScenes && window.StoryCast, null, { timeout: 120000 });
  await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  const frames = n => p.evaluate(() => app.engine.renderer.info.render.frame).then(n0 => p.waitForFunction(a => app.engine.renderer.info.render.frame >= a[0] + a[1], [n0, n], { timeout: 280000 }));
  const kit = () => p.evaluate(() => { const c = app.engine.coach; return { outfit: StoryCast.outfitOf(c), gloves: c.gloveMeshes.L.visible, shorts: c.shorts.visible, parent: !!c.root.parent, demo: !!app.engine.fightIQDemo, stage: !document.querySelector('.dream-scene') }; });
  // conversation
  await p.evaluate(() => { window.__r = null; StoryScenes.play('dream_gym_talk', { onDone: r => { window.__r = r; } }); });
  await p.waitForFunction(() => DreamScenes.debug?.phase === 'play', null, { timeout: 280000 });
  assert.equal(await p.evaluate(() => StoryScenes.playing), 'dream_gym_talk');
  const seen = [];
  for (let i = 0; i < 12 && !(await p.evaluate(() => window.__r)); i++) {
    await p.evaluate(() => { const d = DreamScenes.debug; if (d && !d.waiting) d.t = Math.max(d.t, [4.4, 8.2, 12.2, 16.2, 20.2, 24.2, 28.2, 32.2, 40.2].find(t => t > d.t - .01) ?? d.t); }); // headless is slow: move to the next line
    await p.waitForFunction(() => window.__r || DreamScenes.debug?.waiting, null, { timeout: 280000 }).catch(() => {});
    const st = await p.evaluate(() => window.__r ? null : ({ t: +DreamScenes.debug.t.toFixed(2), line: document.querySelector('.dream-text').textContent, who: document.querySelector('.dream-name').textContent, wait: DreamScenes.debug.waiting }));
    if (!st) break; seen.push(st.who + ': ' + st.line); const t0 = st.t; await frames(4);
    assert.ok(Math.abs(await p.evaluate(() => DreamScenes.debug.t) - t0) < .05, 'the timeline waits for a tap at: ' + st.line);
    await p.mouse.click(200, 300); await frames(2);
    if (st.t > 40) await p.waitForFunction(() => window.__r, null, { timeout: 280000 });
  }
  console.log(seen.join('\n')); assert.equal(seen.length, 9, 'nine lines wait for a tap');
  const r1 = await p.evaluate(() => window.__r); console.log('talk done', JSON.stringify(r1), JSON.stringify(await kit())); assert.deepEqual(r1, { id: 'dream_gym_talk', skipped: false });
  let k = await kit(); assert.ok(k.outfit === 'kit' && k.gloves && k.shorts && k.parent && !k.demo && k.stage, 'kit restored after the talk');
  // film: Skip jumps to the gym door, then ends
  await p.evaluate(() => { window.__r = null; StoryScenes.play('dream_opening', { noMap: true, onDone: r => { window.__r = r; } }); });
  await p.waitForFunction(() => DreamScenes.debug?.phase === 'play', null, { timeout: 280000 }); await frames(3);
  assert.equal(await p.evaluate(() => StoryCast.outfitOf(app.engine.coach)), 'street');
  await p.click('.dream-skip'); await frames(2);
  const at = await p.evaluate(() => window.__r ? null : ({ t: DreamScenes.debug.t, x: app.engine.coach.root.position.x, z: app.engine.coach.root.position.z })); console.log('after Skip', JSON.stringify(at));
  if (at) assert.ok(at.t > 30 && Math.abs(at.x - 26.75) < .6 && Math.abs(at.z + 6.55) < .6, 'Skip jumps to the gym door');
  await p.waitForFunction(() => window.__r, null, { timeout: 280000 });
  const r2 = await p.evaluate(() => window.__r); console.log('film done', JSON.stringify(r2)); assert.equal(r2.skipped, true);
  k = await kit(); assert.ok(k.outfit === 'kit' && k.gloves && k.shorts && !k.demo && k.stage, 'kit restored after the film');
  // job offer: Esc skips, the outcome is reported
  await p.evaluate(() => { window.__r = null; StoryScenes.play('dream_after_brick', { outcome: 'win', onDone: r => { window.__r = r; } }); });
  await p.waitForFunction(() => DreamScenes.debug?.phase === 'play', null, { timeout: 280000 }); await p.keyboard.press('Escape');
  await p.waitForFunction(() => window.__r, null, { timeout: 60000 }); const r3 = await p.evaluate(() => window.__r); console.log('offer done', JSON.stringify(r3)); assert.deepEqual(r3, { id: 'dream_after_brick', skipped: true, outcome: 'win' });
  assert.equal(await p.evaluate(() => StoryScenes.play('nope_scene', {})), false);
  console.log('controls ok');
};
