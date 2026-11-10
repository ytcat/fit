const {chromium}=require('playwright'),assert=require('node:assert/strict');
const panel=p=>p.evaluate(()=>[...document.querySelectorAll('#manualControls .manual-move')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return {id:b.dataset.inputMove,t:b.textContent,meta:!!b.dataset.meta,locked:b.dataset.locked,dis:b.disabled,w:Math.round(r.width),h:Math.round(r.height),clip:b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1,inView:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};}));
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const report=[];
for(const [name,vp] of [['phone',{width:393,height:852}],['desk',{width:1366,height:768}],['land',{width:852,height:393}],['small',{width:360,height:640}]]){
 const p=await b.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8131');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 const fight=async lang=>{await p.evaluate(lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('playMode').click();document.querySelector('[data-input-page="combos"]').click();},lang);await p.waitForTimeout(700);};
 // 1) new player: nothing equipped
 await fight('en');let s=await panel(p);assert.deepEqual(s.map(x=>x.id),['ui_combo_loadout'],'new player shows only loadout');
 await p.screenshot({path:`after-${name}-new-en.png`});
 // grant all six legitimately-shaped unlocks, equip 3 fight / 5 training
 const res=await p.evaluate(()=>{const st=app.engine.career.store,g=st.game();Object.assign(g.activity,{completed:9,rope:9,fights:9,defences:99,hits:999});g.combos.owned=GameDomain.combos.map(c=>c.id);st.save?.(); const out=[];
  for(const [mode,n] of [['fight',3],['training',5]])for(const c of GameDomain.combos.slice(0,n))out.push(st.gameAction({type:'combo',comboId:c.id,mode,enabled:true,species:app.engine.coach.species}).ok);return {out,fight:st.game().combos.fight,training:st.game().combos.training};});
 assert.ok(res.out.every(Boolean),JSON.stringify(res));console.log('LOADOUT',JSON.stringify(res));
 for(const lang of ['en','he','ru']){await fight(lang);s=await panel(p);
  assert.equal(s.filter(x=>!x.meta).length,3,'3 primary in fight');assert.ok(!s.some(x=>x.id==='ui_combo_more'),'no More with 3');assert.ok(s.every(x=>!x.clip&&x.inView&&x.locked!=='true'),lang+' '+JSON.stringify(s));
  report.push([name,'fight',lang,s.map(x=>`${x.t}(${x.w}x${x.h})`).join(' | ')]);await p.screenshot({path:`after-${name}-fight-${lang}.png`});}
 // training (heavy bag) with 5 equipped
 for(const lang of ['en','he','ru']){await p.evaluate(lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.startTraining({mode:'heavy',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('[data-input-page="combos"]').click();},lang);await p.waitForTimeout(700);
  s=await panel(p);assert.equal(s.filter(x=>!x.meta).length,3);assert.ok(s.some(x=>x.id==='ui_combo_more'));assert.ok(s.every(x=>!x.clip&&x.inView),lang+' '+JSON.stringify(s));
  report.push([name,'train p1',lang,s.map(x=>x.t).join(' | ')]);if(lang==='ru')await p.screenshot({path:`after-${name}-train1-ru.png`});
  await p.evaluate(()=>document.querySelector('[data-input-move="ui_combo_more"]').click());await p.waitForTimeout(300);s=await panel(p);
  assert.equal(s.filter(x=>!x.meta).length,2,'page 2 holds remaining 2');assert.ok(s.every(x=>!x.clip&&x.inView));report.push([name,'train p2',lang,s.map(x=>x.t).join(' | ')]);
  await p.evaluate(()=>document.querySelector('[data-input-move="ui_combo_more"]').click());
  const bar=await p.evaluate(async()=>{const hidden=getComputedStyle(document.querySelector('.game-loadout')).display==='none';document.querySelector('[data-input-page="moves"]').click();ringfighterGame.refresh?.();await new Promise(r=>setTimeout(r,400));const l=document.querySelector('.game-loadout');return {hiddenOnCombos:hidden,chips:[...l.children].map(b=>{const r=b.getBoundingClientRect(),lh=parseFloat(getComputedStyle(b).lineHeight)||12;const range=document.createRange();range.selectNodeContents(b);return {t:b.textContent,w:Math.round(r.width),lines:new Set([...range.getClientRects()].map(x=>Math.round(x.top))).size,words:b.textContent.split(/\s+/).length};})};});
  report.push([name,'bar',lang,JSON.stringify(bar)]);assert.ok(bar.hiddenOnCombos,'bar hidden on combos page');assert.ok(bar.chips.length<=3);assert.ok(bar.chips.every(c=>c.lines<=c.words),'no mid-word wrap '+JSON.stringify(bar));
  if(lang==='ru')await p.screenshot({path:`after-${name}-movesbar-ru.png`});
  await p.evaluate(()=>document.querySelector('[data-input-page="combos"]').click());}
 // combo actually executes from the panel
 const ran=await p.evaluate(async()=>{const id=document.querySelector('#manualControls .manual-move:not([data-meta])').dataset.inputMove;document.querySelector(`[data-input-move="${id}"]`).click();await new Promise(r=>setTimeout(r,200));const q=app.engine.player;return {id,seq:q.sequence?.()?.id,cur:q.current?.input||q.current?.move,queue:q.queue.length};});
 report.push([name,'press',JSON.stringify(ran)]);assert.ok(ran.seq===ran.id||ran.queue>0||ran.cur,'combo started');
 // speed bag combos: 3 + More
 await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage('ru');ringfighterGame.startTraining({mode:'speed',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('[data-input-page="combos"]').click();});await p.waitForTimeout(700);
 s=await panel(p);assert.equal(s.filter(x=>!x.meta).length,3);assert.ok(s.some(x=>x.id==='ui_combo_more'));assert.ok(!s.some(x=>x.id==='ui_combo_loadout'));assert.ok(s.every(x=>!x.clip&&x.inView),JSON.stringify(s));report.push([name,'speed','ru',s.map(x=>x.t).join(' | ')]);
 // loadout button opens the combo loadout screen
 await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage('en');ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('playMode').click();document.querySelector('[data-input-page="combos"]').click();});await p.waitForTimeout(500);
 await p.evaluate(()=>document.querySelector('[data-input-move="ui_combo_loadout"]').click());await p.waitForTimeout(500);assert.ok(await p.evaluate(()=>!!document.querySelector('.game-combo-library')),'lab opened');
 assert.deepEqual(errors,[]);await p.close();}
console.log(report.map(r=>r.join(' :: ')).join('\n'));console.log('ALL ASSERTIONS PASSED');await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
