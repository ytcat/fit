// GOTR-0031 R1 browser QA: new player from an empty browser at four sizes and three languages.
// First screen (EN/HE/RU) → choose Lion or Rabbit → Train 15s in control → 20-second fight in control,
// plus rivals, Academy and an older save without a saved fighter.
// Usage: node qa/gotr-0031/r1/r1-browser.cjs [port]   (serve the repo root on that port first)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const port=process.argv[2]||'8146',url='http://127.0.0.1:'+port+'/',out=__dirname,raw=process.env.QA_RAW||path.join(require('os').tmpdir(),'gotr-0031-r1-raw');fs.mkdirSync(raw,{recursive:true});
const results=[],fail=[];const check=(ok,label)=>{results.push((ok?'PASS ':'FAIL ')+label);if(!ok)fail.push(label);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(p,name){const png=path.join(raw,name+'.png');await p.screenshot({path:png,timeout:180000});return png;}
async function open(b,vp,init){const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:1,hasTouch:!!vp.touch,isMobile:!!vp.touch});if(init)await ctx.addInitScript(init.fn,init.arg);const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url,{timeout:180000});await p.waitForFunction(()=>window.ringfighterGame&&window.app&&app.engine.coach?.anatomy,null,{timeout:240000,polling:500});await wait(1500);return {ctx,p,errors};}
// Re-show the first screen in another language without creating a player (removing the dialog skips its close handler).
const firstScreen=(p,lang)=>p.evaluate(async lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.remove());app.setLanguage(lang);app.engine.career.profileDialog();await new Promise(r=>setTimeout(r,400));const d=document.querySelector('dialog[open]');const box=d.getBoundingClientRect();return {title:d.querySelector('h2').textContent,cards:[...d.querySelectorAll('.career-fighter')].map(b=>b.textContent),start:d.querySelector('.career-create .club-primary').textContent,dir:d.dir,fits:box.top>=0&&box.bottom<=innerHeight+1,scroll:d.scrollHeight>d.clientHeight+1,profiles:app.engine.career.store.data.profiles.length};},lang);
const sizes=[{id:'402x690',w:402,h:690,touch:true,lang:'en',species:'lion'},{id:'360x640',w:360,h:640,touch:true,lang:'he',species:'rabbit'},{id:'852x393',w:852,h:393,touch:true,lang:'ru',species:'rabbit'},{id:'1366x768',w:1366,h:768,lang:'en',species:'lion'}];
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
 for(const vp of sizes){const t0=Date.now();const {ctx,p,errors}=await open(b,vp);const tag=vp.id;
  check(await p.evaluate(()=>!!document.querySelector('dialog.career-welcome[open]')),tag+' empty browser opens the first screen');
  check(await p.evaluate(()=>app.engine.player.enabled),tag+' player in control from the start');
  for(const lang of ['en','he','ru']){const s=await firstScreen(p,lang);check(s.cards.length===2&&s.profiles===0,`${tag} ${lang} first screen offers Lion and Rabbit (${s.title} | ${s.start})`);check(lang!=='he'||s.dir==='rtl',`${tag} ${lang} direction`);await shot(p,`first-${tag}-${lang}`);}
  // The path in this size's language.
  const path1=await p.evaluate(async({lang,species})=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.remove());app.setLanguage(lang);e.career.profileDialog();await new Promise(r=>setTimeout(r,300));document.querySelector(`[data-fighter=${species}]`).click();await new Promise(r=>setTimeout(r,2500));document.querySelector('.career-welcome .career-create .club-primary').click();await new Promise(r=>setTimeout(r,1200));
   const s=e.career.store;document.getElementById('compactControlMode').click();await new Promise(r=>setTimeout(r,300));const auto={enabled:e.player.enabled,label:document.getElementById('compactControlMode').textContent};
   document.getElementById('startTraining').click();await new Promise(r=>setTimeout(r,1500));document.querySelector('[data-input-page=moves]')?.click();await new Promise(r=>setTimeout(r,300));for(let i=0;i<4&&!(e.career.active?.attempts>0);i++){document.querySelector('[data-input-move=jab]')?.click();for(let k=0;k<12&&!(e.career.active?.attempts>0);k++)await new Promise(r=>setTimeout(r,500));}
   return {profile:s.current()?.name,species:s.current()?.species,coach:e.coach.species,auto,enabled:e.player.enabled,session:e.career.active&&{control:e.career.active.control,attempts:e.career.active.attempts},start:document.getElementById('startTraining').textContent,toggle:document.getElementById('compactControlMode').textContent,dialogs:document.querySelectorAll('dialog[open]').length};},{lang:vp.lang,species:vp.species});
  check(path1.species===vp.species&&path1.coach===vp.species,`${tag} chosen ${vp.species} saved and on screen (${path1.profile})`);
  check(path1.auto.enabled===false,`${tag} Auto hands control to the fighter (${path1.auto.label})`);
  check(path1.enabled&&path1.session?.control==='play',`${tag} Train 15s starts with the player in control after Auto (${path1.start} · toggle ${path1.toggle})`);
  check(path1.session?.attempts>=1,`${tag} a tapped Jab counts in the session (${path1.session?.attempts})`);
  await shot(p,`train-${tag}-${vp.lang}`);
  const fight=await p.evaluate(async()=>{const e=app.engine;document.getElementById('compactControlMode').click();await new Promise(r=>setTimeout(r,300));const before=e.player.enabled;
   [...document.querySelectorAll('.game-nav-button')][1].click();await new Promise(r=>setTimeout(r,800));document.querySelector('dialog[open] [data-fight-preset=quick]').click();await new Promise(r=>setTimeout(r,2500));
   const v=e.arena.fightView,m=v.match;document.querySelector('.camera-intro-skip')?.click();
   // Software rendering in this headless browser is slow; the bout clock is stepped to the first bell like GOTR-0031's evidence run.
   let n=0;while(m.phase!=='round'&&n<2400){v.step();n++;}document.querySelector('[data-input-page=moves]')?.click();await new Promise(r=>setTimeout(r,400));const thrown0=m.totals[m.playerActor]?.thrown||0;document.querySelector('[data-input-move=jab]')?.click();for(let i=0;i<60;i++)v.step();await new Promise(r=>setTimeout(r,800));
   return {before,enabled:e.player.enabled,playerActor:m.playerActor,species:e.coach.species,watch:v.careerEntry?.watchSeen,phase:m.phase,steps:n,thrown:(m.totals[m.playerActor]?.thrown||0)-thrown0,toggle:document.getElementById('compactControlMode').textContent};});
  check(fight.before===false&&fight.enabled&&fight.playerActor===vp.species&&fight.watch===false,`${tag} a new bout starts with the player in control after Auto (actor ${fight.playerActor}, toggle ${fight.toggle})`);
  check(fight.thrown>=1,`${tag} the player's Jab is thrown in the fight (${fight.thrown})`);
  await shot(p,`fight-${tag}-${vp.lang}`);
  if(vp.id==='402x690'){
   const hub=await p.evaluate(async()=>{ringfighterGame.open('world');await new Promise(r=>setTimeout(r,800));const m=document.querySelector('dialog[open]');m.querySelector('.world-tab[data-panel=rivals]').click();await new Promise(r=>setTimeout(r,400));return {hero:m.querySelector('.game-world-hero h3')?.textContent,rivals:[...m.querySelectorAll('[data-rival-id]')].map(c=>c.dataset.rivalId),note:m.querySelector('.game-rival-elsewhere')?.textContent,text:m.textContent};});
   check(hub.rivals.join()==='shadow,circuit'&&/Ember/.test(hub.note||''),`${tag} a Lion fighter is offered Shadow and Circuit; Ember is named for rabbit fighters (${hub.note})`);
   check(!/simulated practice|adaptive|Play as|Build your corner|Go to Club|School\b/.test(hub.text),`${tag} hub has no developer notes, species switching or old place names (hero: ${hub.hero})`);
   await p.evaluate(()=>document.querySelector('dialog[open] [data-rival-id=shadow]').scrollIntoView());await shot(p,`rivals-${tag}-en`);
   const rival=await p.evaluate(async()=>{document.querySelector('dialog[open] [data-rival-id=shadow] button').click();await new Promise(r=>setTimeout(r,2500));const v=app.engine.arena.fightView;return {species:app.engine.coach.species,enabled:app.engine.player.enabled,rival:v.careerEntry?.activityEvidence?.rivalId,opp:v.careerEntry?.opponentName};});
   check(rival.species==='lion'&&rival.enabled&&rival.rival==='shadow',`${tag} Fight Shadow keeps the Lion and records the rival (${rival.opp})`);
   const academy=await p.evaluate(async()=>{ringfighterGame.open('learn');await new Promise(r=>setTimeout(r,2500));const m=document.querySelector('dialog[open]');return [...m.querySelectorAll('.academy-course')].map(c=>c.querySelectorAll('.academy-go').length+':'+c.querySelectorAll('button').length);});
   check(academy[0]==='1:1'&&academy.slice(1).every(x=>x==='0:0'),`${tag} Academy shows one Start, for the next lesson only (${academy.join(' ')})`);await shot(p,`academy-${tag}-en`);
   const lesson=await p.evaluate(async()=>{document.querySelector('dialog[open] .academy-go').click();await new Promise(r=>setTimeout(r,3000));const vis=sel=>{const n=document.querySelector(sel);return !!n&&getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().height>0;};return {phase:window.AcademyStage.state?.phase,toolbar:vis('.ringside-toolbar'),train:vis('#startTraining'),pages:vis('.manual-pages'),moves:document.querySelectorAll('#manualControls .manual-move').length};});
   check(lesson.phase==='watch'&&!lesson.toolbar&&!lesson.train&&!lesson.pages&&lesson.moves>0,`${tag} lesson hides Train 15s, the toolbar and the page tabs; move buttons stay (${lesson.moves})`);await shot(p,`lesson-${tag}-en`);
  }
  check(!errors.length,`${tag} no page errors ${errors.slice(0,2).join(' | ')}`);results.push(`     ${tag} took ${Math.round((Date.now()-t0)/1000)} s`);await ctx.close();}
 // An older save with no saved fighter: the fighter used most (Rabbit here) is restored, even if the browser last showed a Lion.
 const {CareerStore}=require('../../../career-progress.js');const mem=new Map(),store=new CareerStore({getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)});const old=store.create('Veteran');for(let i=0;i<2;i++)store.award({id:'old-'+i,profileId:old.id,species:'rabbit',mode:'heavy',control:'play',seconds:15,hits:3,attempts:5});const data=JSON.parse(store.export()).data;delete data.profiles[0].species;
 const {ctx,p,errors}=await open(b,{w:1366,h:768},{fn:([d])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('ringfighter-career-v1',d);localStorage.setItem('shadowbox-coach','lion');sessionStorage.setItem('seeded','1');}},arg:[JSON.stringify(data)]});
 const legacy=await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,2500));const s=app.engine.career.store;return {name:s.current()?.name,species:app.engine.coach.species,saved:s.species(),dialog:!!document.querySelector('dialog[open]'),enabled:app.engine.player.enabled};});
 check(legacy.name==='Veteran'&&legacy.species==='rabbit'&&legacy.saved==='rabbit'&&!legacy.dialog,`older save without a fighter loads as its most-used fighter (${JSON.stringify(legacy)})`);check(!errors.length,'older save: no page errors');await shot(p,'old-save-1366x768-en');await ctx.close();
 }finally{await b.close();}
 // Small .webp copies for the evidence folder.
 const {execFileSync}=require('child_process');for(const f of fs.readdirSync(raw).filter(f=>f.endsWith('.png'))){execFileSync('python3',['-c','import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],quality=72)',path.join(raw,f),path.join(out,f.replace(/\.png$/,'.webp'))]);}
 fs.writeFileSync(path.join(out,'results.txt'),results.join('\n')+'\n');console.log(results.join('\n'));console.log(fail.length?'FAILED '+fail.length:'ALL PASS');process.exit(fail.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
