const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), out = process.argv[2] || path.join(__dirname, 'frames'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1,4).join(' | '))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 300) + ' @' + JSON.stringify(m.location())); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown && window.StoryGymFight, null, { timeout: 300000 });
  // the real path: a profile, the save advanced to the rematch step, the step opened, the Fight Night film skipped -> the story starts the bout
  await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]') || window.ringfighterGame?.store?.current?.(), null, { timeout: 120000 });
  await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); if (d) { d.querySelector('input').value = 'Rematch QA'; d.querySelector('button[type=submit]').click(); } });
  await p.waitForTimeout(1500);
  const started = await p.evaluate(() => { const g = ringfighterGame; const ctx = { store: g.store, startFight: g.startFight, startTraining: g.startTraining, change: a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } };
    for (const id of AdventureProgress.dreamSteps) { if (id === 'brick') break; if (!AdventureOldTown.devSkip(ctx, id)) return 'skip failed ' + id; if (id === 'first_brick') ctx.store.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 25 } }); }
    document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat();
    return AdventureOldTown.before(ctx, 'brick', { force: true }) ? 'opened' : 'cannot open'; });
  console.log('step', started);
  await p.waitForFunction(() => DreamScenes.playing === 'dream_fight_night' || document.querySelector('.adv-beat button, dialog[open] .sf-go'), null, { timeout: 120000 }).catch(() => {});
  await p.evaluate(() => { if (DreamScenes.playing) StoryScenes.stop(); else document.querySelector('dialog[open] button')?.click(); });
  await p.waitForTimeout(800); await p.evaluate(() => { if (DreamScenes.playing) StoryScenes.stop(); });
  await p.waitForFunction(() => app.engine.arena?.fightView?.gymFight, null, { timeout: 120000 }).catch(() => console.log('no gym fight'));
  console.log('started', JSON.stringify(started), 'place', await p.evaluate(() => app.engine.fightOptions?.place));
  await p.waitForTimeout(1500); console.log('dialogs', await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className).join(',')));
  await p.waitForFunction(() => app.engine.arena?.fightView?.gymFight?.set, null, { timeout: 120000 }).catch(() => console.log('no gym set'));
  console.log('scene', JSON.stringify(await p.evaluate(() => { const v = app.engine.arena.fightView, out = { ring: [], arena: [], cameraRadius: v.arena?.group?.userData?.cameraRadius }; for (const c of v.ring.children) out.ring.push((c.name || c.type) + (c.visible ? '' : '(h)')); out.top = app.engine.scene.children.map(c => (c.name || c.type) + (c.visible ? '' : '(h)')); out.world = Object.keys(app.engine.world || {}).filter(k => app.engine.world[k]?.isObject3D).map(k => k + (app.engine.world[k].visible ? '' : '(h)')); for (const c of v.arena.group.children) out.arena.push((c.name || c.type) + (c.visible ? '' : '(h)') + (c.userData.venueSet ? '[venue]' : '')); out.ring = out.ring.slice(0, 12).concat(['... ' + v.ring.children.length]); return out; })));
  if (process.env.ONLYSCENE) { await b.close(); server.close(); return; }
  for (let i = 0; i < (process.env.SHOTS ? +process.env.SHOTS : 6); i++) { await p.waitForTimeout(i ? (i > 3 ? 40000 : 9000) : 6000); if (i === 4) await p.evaluate(() => { try { app.engine.arena.fightView.skipIntro?.(); } catch { } }); await p.screenshot({ path: `${out}/rm-${i}.png` });
    console.log(i, JSON.stringify(await p.evaluate(() => { const v = app.engine.arena.fightView, st = v?.gymFight; return { phase: v?.match?.phase, t: +(v?.match?.time || 0).toFixed(1), ring: v?.ring?.visible, gym: !!st?.set, ringMode: st?.ring, crowd: st?.crowd?.triangles, tris: app.engine.renderer.info.render.triangles, calls: app.engine.renderer.info.render.calls, ref: v?.referee?.isBruno, corner: v?.corner?.ringless }; }))); }
  console.log('coaches', JSON.stringify(await p.evaluate(() => { const v = app.engine.arena.fightView; return Object.entries(v.coaches).map(([k, c]) => [k, c.root.name, !!c.root.parent, c === StoryCast.rig('pip', app.engine), c === StoryCast.rig('hazel', app.engine), c === StoryCast.rig('otto', app.engine), c.species]); })));
  console.log('errors', JSON.stringify(errs.filter(e => !/GPU stall/.test(e)).slice(0, 3)));
  await b.close(); server.close();
});
