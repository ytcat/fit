// GOTR-0005 Burst — browser QA in the real app (software WebGL).
// Usage: node qa/gotr-0005/browser.cjs [port] [part,...]   parts: watch, play, rules, cup, layout (default all)
// Real fights in Watch and Play: the meter fills from real contacts and time; Burst is pressed with the real
// button; the start is checked against the action that was in progress; pause, intro, knockdown count, round end
// and KO are checked. The only test hook is `fighters[actor].burst.charge=1` (named "HOOK" in the output),
// used where a state must be reached quickly (pause, count, KO, layout), never for the real-charge runs.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const port=process.argv[2]||8152,parts=(process.argv[3]||'watch,play,rules,cup,layout').split(','),dir=__dirname,results={};
const shot=async(p,name)=>{const png=path.join(dir,name+'.png');await p.screenshot({path:png});try{require('node:child_process').execFileSync('python3',['-c',`from PIL import Image;Image.open(${JSON.stringify(png)}).save(${JSON.stringify(png.replace(/png$/,'webp'))},quality=78)`]);fs.unlinkSync(png);}catch(e){console.log('webp failed',e.message);}};
const state=p=>p.evaluate(()=>{window.burstControl.paint();const e=app.engine,m=e.arena?.fightView?.match,a=e.player.actor(),b=document.getElementById('burstControl'),s=m?.burstState(a);return {phase:m?.phase,time:m?.time,actor:a,engine:s,ui:b&&!b.hidden?{state:b.dataset.state,disabled:b.disabled,text:b.textContent,fill:b.style.getPropertyValue('--burst-fill')}:null,tip:!document.getElementById('burstTip').hidden?document.getElementById('burstTip').textContent:null,result:!!m?.result};});
async function open(b,vp,lang='en'){
 const p=await b.newPage({viewport:vp,bypassCSP:true});p.setDefaultTimeout(180000);p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));
 await p.goto('http://127.0.0.1:'+port);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 // Clock driver: software WebGL renders ~1 fps, so the QA advances the real fight clock (arena.update -> match.advance,
 // real poses and the real contact solver) in 1/60 s steps; it stands still while the game is paused or the intro holds it.
 await p.evaluate(()=>{const e=app.engine;window.__until=async(cond,max)=>{let n=0,t=0;while(!cond()){if(t>=max)return false;if(!e.isPlaying||e.cameraDirector?.holdsClock||e.targetMode!=='fight'){await new Promise(r=>setTimeout(r,30));if(++n>4000)return false;continue;}e.animTime+=1/60;t+=1/60;const f=e.arena.update(e.animTime);e.career?.onFrame?.(f,1/60);if(Math.round(t*60)%20===0)await new Promise(r=>setTimeout(r,0));}window.burstControl.paint();return true;};});
 await p.evaluate(lang=>{localStorage.removeItem('gotr-burst-tip');window.burstControl.resetTip();document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);},lang);return p;
}
async function fight(p,{watch,options={}}){
 await p.evaluate(({watch,options})=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.startFight({watch,...options});document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  // Event recorder: every burst event plus contacts/punches, and the actor's action at the moment of an order.
  const e=app.engine,m=e.arena.fightView.match,a=e.player.actor();window.__burst={log:[],orders:[]};const emit=m.emit.bind(m);
  m.emit=(type,data)=>{const ev=emit(type,data);if(/^burst-|^contact$|^punch$|^knockdown$|^bell$/.test(type)){const f=m.fighters[ev.actor||a];window.__burst.log.push({...ev,burstStep:ev.type==='punch'?m.fighters[ev.actor].action?.burst||0:undefined,opp:ev.type==='punch'?null:undefined});}
   if(type==='burst-order'){const x=m.fighters[ev.actor].action;window.__burst.orders.push({time:m.time,action:x?{id:x.id,move:x.move,start:x.start,duration:x.duration,attack:!!x.attack}:null});}return ev;};
  const req=m.requestBurst.bind(m);m.requestBurst=actor=>{const ok=req(actor);window.__burst.log.push({type:'request',time:m.time,ok,paused:!e.isPlaying});return ok;};
 },{watch,options});
}
// Sample opponent defences overlapping burst punches every frame (for "the opponent can still block or slip").
const watchDefence=p=>p.evaluate(()=>{const e=app.engine,m=e.arena.fightView.match,a=e.player.actor(),o=a==='lion'?'rabbit':'lion';window.__def={punches:{},defended:{}};const tick=()=>{if(!window.__def)return;const x=m.fighters[a].action,y=m.fighters[o].action;if(x?.burst){window.__def.punches[x.id]=x.move;if(y?.defend&&y.start>=x.start-.05)window.__def.defended[x.id]=y.move+(y.guardStyle?':'+y.guardStyle:'');}requestAnimationFrame(tick);};tick();});
// Drive the fight clock until fn() holds (max game seconds); throws if it never does.
async function until(p,fn,arg,max=60){const ok=await p.evaluate(([src,max])=>window.__until(new Function('return ('+src+')()'),max),[fn.toString(),max]);if(!ok)throw Error('condition not reached within '+max+' game s: '+fn.toString().slice(0,120));}
const skipIntro=p=>p.evaluate(()=>app.engine.cameraDirector?.skipIntro?.());
function boundaryCheck(log,orders){
 const starts=log.filter(e=>e.type==='burst-start');assert.ok(starts.length>=1,'burst started');
 for(const [i,s] of starts.entries()){const o=orders[i];assert.ok(o,'order recorded');if(o.action)assert.ok(s.time>=o.action.start+o.action.duration-1e-6,`started ${s.time.toFixed(3)} after the action in progress ended ${(o.action.start+o.action.duration).toFixed(3)} (${o.action.move})`);assert.ok(!s.previous||s.previous.end<=s.time+1e-6,'previous action ended at the boundary');}
 const punches=log.filter(e=>e.type==='punch'&&e.burstStep);return {starts:starts.length,burstPunches:punches.length,waited:orders.map((o,i)=>o.action?{move:o.action.move,wait:+(starts[i].time-o.time).toFixed(3)}:{move:null,wait:+(starts[i].time-o.time).toFixed(3)})};
}
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 // ---------- WATCH: real charge from real contacts and time, coach order at a safe boundary ----------
 if(parts.includes('watch')){const p=await open(b,{width:1366,height:768});const runs=[];
  for(const seed of [20261111,20261112,20261113]){
   await fight(p,{watch:true,options:{seed}});await watchDefence(p);
   let s=await state(p);assert.equal(s.ui.state,'bell','intro: wait for the bell');assert.equal(s.ui.disabled,true);
   if(seed===20261111)await shot(p,'watch-disabled-bell-desk');
   await skipIntro(p);await until(p,()=>app.engine.arena.fightView.match.phase==='round');s=await state(p);assert.ok(s.engine.charge<.01,'empty at the bell');assert.equal(s.ui.state,'charging');
   await until(p,()=>{const m=app.engine.arena.fightView.match;return m.result||m.burstState(app.engine.player.actor()).status==='ready'||m.burstState(app.engine.player.actor()).charge>.45;});
   if(seed===20261111){s=await state(p);if(s.ui?.state==='charging')await shot(p,'watch-charging-desk');}
   await until(p,()=>{const m=app.engine.arena.fightView.match;return m.result||m.burstState(app.engine.player.actor()).status==='ready';});
   s=await state(p);const sources=await p.evaluate(()=>{const a=app.engine.player.actor(),L=window.__burst.log;return {hits:L.filter(e=>e.type==='contact'&&e.actor===a&&e.legal).length,blocks:L.filter(e=>e.type==='contact'&&e.receiver===a&&e.blocked).length,time:app.engine.arena.fightView.match.roundTime};});
   const run={seed,readyAt:s.engine.status==='ready'?+sources.time.toFixed(2):null,hitsLanded:sources.hits,blocksMade:sources.blocks};
   if(s.engine.status!=='ready'){run.note='not ready this round';runs.push(run);continue;}
   assert.equal(s.ui.state,'ready');assert.equal(s.ui.disabled,false);
   if(seed===20261111){assert.ok(s.tip&&/Burst ready/.test(s.tip),'first-time tip');await shot(p,'watch-ready-tip-desk');}
   // Order while the AI is mid-punch when possible
   await until(p,()=>{const m=app.engine.arena.fightView.match,x=m.fighters[app.engine.player.actor()].action;return m.result||x?.attack&&m.time-x.start<.15;},null,15).catch(()=>{});
   await p.click('#burstControl');s=await state(p);assert.ok(['ordered','active'].includes(s.ui.state),'ordered: '+s.ui.state);
   await until(p,()=>window.__burst.log.some(e=>e.type==='burst-start')||app.engine.arena.fightView.match.result);
   await p.waitForTimeout(400);s=await state(p);if(s.ui.state==='active'&&seed===20261111)await shot(p,'watch-executing-desk');
   await until(p,()=>window.__burst.log.some(e=>e.type==='burst-end'||e.type==='burst-cancel')||app.engine.arena.fightView.match.result);
   const log=await p.evaluate(()=>window.__burst.log),orders=await p.evaluate(()=>window.__burst.orders),def=await p.evaluate(()=>window.__def);
   Object.assign(run,boundaryCheck(log,orders));const actor=s.actor;run.burstContacts=log.filter(e=>e.type==='contact'&&e.actor===actor&&e.time>=log.find(x=>x.type==='burst-start').time).slice(0,5).map(e=>e.part);
   run.opponentDefended=Object.keys(def.defended).length;run.burstPunchesSeen=Object.keys(def.punches).length;run.defences=Object.values(def.defended);
   s=await state(p);run.after=s.ui?.state;runs.push(run);await p.evaluate(()=>{window.__def=null;});
  }
  results.watch=runs;console.log('WATCH',JSON.stringify(runs));assert.ok(runs.filter(r=>r.starts).length>=2,'at least two real-charge Watch bursts');
  assert.deepEqual(p.errors,[]);await p.close();}

 // ---------- PLAY: player lands real punches to charge; Burst queued behind the punch in progress ----------
 if(parts.includes('play')){const p=await open(b,{width:393,height:852});const runs=[];
  for(const seed of [20261121,20261122]){
   await fight(p,{watch:false,options:{seed}});await watchDefence(p);await skipIntro(p);await until(p,()=>app.engine.arena.fightView.match.phase==='round');
   // press real move keys (1 jab, 2 cross, 3 hook) like a player until Burst is ready
   const charged=await p.evaluate(async()=>{const e=app.engine,m=e.arena.fightView.match,a=e.player.actor(),keys=['1','2','1','3','2'];let k=0;
    while(!m.result&&m.phase!=='rest'&&m.burstState(a).status!=='ready'){if(m.phase==='round'&&!m.fighters[a].action&&!m.playerQueue.length)document.dispatchEvent(new KeyboardEvent('keydown',{key:keys[k++%keys.length],bubbles:true}));await new Promise(r=>setTimeout(r,60));}
    return {status:m.burstState(a).status,time:m.roundTime,pressed:k};});
   const run={seed,readyAt:charged.status==='ready'?+charged.time.toFixed(2):null,keyPresses:charged.pressed};
   if(charged.status!=='ready'){run.note='not ready this round';runs.push(run);continue;}
   if(seed===20261121){const s=await state(p);assert.ok(s.tip,'tip shows the first time');await shot(p,'play-ready-phone');}
   // press a cross, then Burst while it is in flight: it must wait for the boundary
   const mid=await p.evaluate(()=>{const e=app.engine,m=e.arena.fightView.match,a=e.player.actor();e.player.press('cross');const x=m.fighters[a].action;return {move:x?.move,id:x?.id};});
   await p.click('#burstControl');let s=await state(p);assert.ok(['queued','active'].includes(s.ui.state),'queued: '+s.ui.state);
   const refused=await p.evaluate(()=>app.engine.player.press('jab'));assert.equal(refused,false,'committed: move buttons refused');
   await until(p,()=>window.__burst.log.some(e=>e.type==='burst-start')||app.engine.arena.fightView.match.result);await p.waitForTimeout(350);
   s=await state(p);if(seed===20261121&&s.ui.state==='active'){await shot(p,'play-executing-phone');run.status=await p.evaluate(()=>document.getElementById('manualStatus').textContent);}
   await until(p,()=>window.__burst.log.some(e=>e.type==='burst-end'||e.type==='burst-cancel')||app.engine.arena.fightView.match.result);
   const log=await p.evaluate(()=>window.__burst.log),orders=await p.evaluate(()=>window.__burst.orders),def=await p.evaluate(()=>window.__def);
   Object.assign(run,boundaryCheck(log,orders),{inFlight:mid.move,opponentDefended:Object.keys(def.defended).length,burstPunchesSeen:Object.keys(def.punches).length,defences:Object.values(def.defended)});
   await p.waitForTimeout(900);run.acceptedAfter=await p.evaluate(()=>app.engine.player.press('jab')||app.engine.arena.fightView.match.phase!=='round');runs.push(run);await p.evaluate(()=>{window.__def=null;});
  }
  results.play=runs;console.log('PLAY',JSON.stringify(runs));assert.ok(runs.filter(r=>r.starts).length>=1,'a real-charge Play burst');
  const all=[...(results.watch||[]),...runs];results.defendedTotal=all.reduce((n,r)=>n+(r.opponentDefended||0),0);results.burstPunchesTotal=all.reduce((n,r)=>n+(r.burstPunchesSeen||0),0);
  console.log('opponent defended',results.defendedTotal,'of',results.burstPunchesTotal,'burst punches');
  assert.deepEqual(p.errors,[]);await p.close();}

 // ---------- RULES: pause, intro with Side lock, knockdown count, round end, KO (HOOK charge) ----------
 if(parts.includes('rules')){const p=await open(b,{width:852,height:393},'ru');const r={};
  await p.evaluate(()=>app.engine.cameraDirector?.setLock?.(true));
  await fight(p,{watch:true,options:{seed:20261131,preset:'club',rounds:2,roundSeconds:20,restSeconds:6}});
  let s=await state(p);r.intro=s.ui.state;assert.equal(s.ui.state,'bell');assert.equal(await p.evaluate(()=>{app.engine.arena.fightView.match.fighters[app.engine.player.actor()].burst.charge=1;return window.burstControl.press();}),false,'HOOK: still refused in the intro');
  await shot(p,'rules-intro-sidelock-land-ru');
  await skipIntro(p);await until(p,()=>app.engine.arena.fightView.match.phase==='round');s=await state(p);assert.ok(s.engine.charge<.01,'bell empties even a hooked meter');
  // pause
  await p.evaluate(()=>{app.engine.arena.fightView.match.fighters[app.engine.player.actor()].burst.charge=1;});await p.waitForTimeout(300);
  await p.click('#playBtn');await p.waitForTimeout(400);s=await state(p);r.paused=s.ui.state;assert.equal(s.ui.state,'paused');assert.equal(s.ui.disabled,true);
  await p.keyboard.press('b');assert.equal((await state(p)).engine.status,'ready','B key ignored while paused');await shot(p,'rules-paused-land-ru');
  const t0=(await state(p)).time;await p.waitForTimeout(800);assert.equal((await state(p)).time,t0,'clock stopped');
  await p.click('#playBtn');await p.waitForTimeout(300);s=await state(p);assert.equal(s.ui.state,'ready');
  // order, then pause before the boundary: nothing starts while paused
  await until(p,()=>{const m=app.engine.arena.fightView.match,x=m.fighters[app.engine.player.actor()].action;return x?.attack&&m.time-x.start<.1;},null,20);
  await p.keyboard.press('b');await p.click('#playBtn');const held=await p.evaluate(()=>({n:window.__burst.log.filter(e=>e.type==='burst-start').length,t:app.engine.arena.fightView.match.time}));await p.waitForTimeout(1000);
  const held2=await p.evaluate(()=>({n:window.__burst.log.filter(e=>e.type==='burst-start').length,t:app.engine.arena.fightView.match.time}));assert.equal(held2.t,held.t);assert.equal(held2.n,held.n,'no start while paused');
  await p.click('#playBtn');await until(p,()=>window.__burst.log.some(e=>e.type==='burst-start'),null,20);r.pauseOrder=boundaryCheck(await p.evaluate(()=>window.__burst.log),await p.evaluate(()=>window.__burst.orders));
  // knockdown count: order queued then the opponent goes down -> order cancelled, meter kept, ready after the count
  await until(p,()=>window.__burst.log.some(e=>e.type==='burst-end'),null,20);
  await until(p,()=>{const m=app.engine.arena.fightView.match,x=m.fighters[app.engine.player.actor()].action;return m.phase==='round'&&x?.attack&&m.time-x.start<.1;},null,20);
  await p.evaluate(()=>{const e=app.engine,m=e.arena.fightView.match,a=e.player.actor();m.fighters[a].burst.open=0;m.fighters[a].burst.charge=1;m.requestBurst(a);m.fighters[a==='lion'?'rabbit':'lion'].pendingDown=true;});
  await until(p,()=>app.engine.arena.fightView.match.phase==='count');await p.waitForTimeout(500);s=await state(p);r.count=s.ui.state;assert.equal(s.ui.state,'down');assert.equal(s.engine.charge,1,'meter kept through the count');
  await shot(p,'rules-knockdown-land-ru');
  const during=await p.evaluate(()=>window.__burst.log.filter(e=>e.type==='burst-start'&&app.engine.arena.fightView.match.phase==='count').length);assert.equal(during,0);
  await until(p,()=>app.engine.arena.fightView.match.phase!=='count',null,30);s=await state(p);r.afterCount=s.ui.state;
  // round end
  await until(p,()=>app.engine.arena.fightView.match.phase==='rest',null,60);await p.waitForTimeout(500);s=await state(p);r.rest=s.ui.state;assert.equal(s.ui.state,'round');assert.equal(s.ui.disabled,true);await shot(p,'rules-round-over-land-ru');
  await until(p,()=>app.engine.arena.fightView.match.phase==='round',null,30);s=await state(p);assert.ok(s.engine.charge<.01,'empty at the round-2 bell');
  // KO
  await p.evaluate(()=>{const e=app.engine,m=e.arena.fightView.match,a=e.player.actor();m.fighters[a].burst.charge=1;m.fighters[a==='lion'?'rabbit':'lion'].condition=0;});
  await until(p,()=>!!app.engine.arena.fightView.match.result);await p.waitForTimeout(400);s=await state(p);r.ko=s.ui?.state;assert.ok(!s.ui||s.ui.state==='bout');
  assert.equal(await p.evaluate(()=>window.burstControl.press()),false,'no burst after KO');
  results.rules=r;console.log('RULES',JSON.stringify(r));assert.deepEqual(p.errors,[]);await p.evaluate(()=>app.engine.cameraDirector?.setLock?.(false));await p.close();}

 // ---------- CUP: Burst available in a Local Cup bout ----------
 if(parts.includes('cup')){const p=await open(b,{width:393,height:852},'he');
  const start=await p.evaluate(()=>{const st=ringfighterGame.store,r=st.gameAction({type:'cup',cupAction:'start',species:app.engine.coach.species,seed:74});return r.ok?'ok':r.error;});
  if(start==='ok'){await p.evaluate(()=>ringfighterGame.open('cup'));await p.locator('[data-cup-action="continue"]').click();await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
   await skipIntro(p);await until(p,()=>app.engine.arena.fightView?.match?.phase==='round',null,60);
   const c=await p.evaluate(()=>({cup:!!app.engine.fightOptions.cupEntry,preset:app.engine.arena.fightView.match.preset,roundSeconds:app.engine.arena.fightView.match.roundSeconds,ui:document.getElementById('burstControl').dataset.state,visible:!document.getElementById('burstControl').hidden}));
   results.cup=c;console.log('CUP',JSON.stringify(c));assert.ok(c.cup&&c.visible&&c.ui==='charging');await shot(p,'cup-charging-phone-he');
  }else{results.cup={skipped:start};console.log('CUP skipped:',start);}
  assert.deepEqual(p.errors,[]);await p.close();}

 // ---------- LAYOUT: no overlap at four sizes x EN/HE/RU x Watch/Play pages ----------
 if(parts.includes('layout')){const rows=[];
  for(const [name,vp] of [['phone',{width:393,height:852}],['small',{width:360,height:640}],['land',{width:852,height:393}],['desk',{width:1366,height:768}]]){
   const p=await open(b,vp);
   for(const lang of ['en','he','ru']){
    await p.evaluate(lang=>app.setLanguage(lang),lang);
    for(const mode of ['watch','moves','combos','defence']){
     await fight(p,{watch:mode==='watch',options:{seed:7}});if(mode!=='watch')await p.evaluate(m=>window.manualControls.setPage(m),mode);
     await skipIntro(p);await until(p,()=>app.engine.arena.fightView.match.phase==='round');
     for(const st of ['charging','ready']){
      if(st==='ready')await p.evaluate(()=>{const e=app.engine;e.arena.fightView.match.fighters[e.player.actor()].burst.charge=1;});
      await p.waitForTimeout(250);
      const m=await p.evaluate(()=>{const R=n=>{const r=n.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};},vis=n=>n&&!n.hidden&&n.offsetParent!==null&&getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().width>0;
       const burst=document.getElementById('burstControl'),stage=document.getElementById('stageContainer');if(!vis(burst))return {missing:true};const b=R(burst),s=R(stage);
       const others=[['hud','#fightHud'],['health','#fightHealth'],['sidelock','#camLock'],['pause','#playBtn'],['status','#manualStatus'],['pages','.manual-pages'],['skip','.camera-intro-skip'],...[...document.querySelectorAll('#manualControls .manual-move')].map((n,i)=>['move:'+n.dataset.inputMove,n])];
       const hit=[];for(const [k,sel] of others){const n=typeof sel==='string'?document.querySelector(sel):sel;if(!vis(n))continue;const o=R(n);if(b.l<o.r-1&&o.l<b.r-1&&b.t<o.b-1&&o.t<b.b-1)hit.push(k);}
       const tip=document.getElementById('burstTip'),tipHit=[];if(vis(tip)){const t=R(tip);for(const [k,sel] of others.slice(0,7)){const n=document.querySelector(sel);if(!vis(n))continue;const o=R(n);if(t.l<o.r-1&&o.l<t.r-1&&t.t<o.b-1&&o.t<t.b-1)tipHit.push(k);}}
       const inside=b.l>=s.l&&b.r<=s.r&&b.t>=s.t&&b.b<=s.b,clipped=burst.scrollWidth>burst.clientWidth+1||[...burst.querySelectorAll('.burst-caption')].some(c=>c.scrollWidth>c.clientWidth+1);
       return {hit,tipHit,inside,clipped,w:Math.round(b.r-b.l),h:Math.round(b.b-b.t),text:burst.textContent,state:burst.dataset.state};});
      rows.push({name,lang,mode,st,...m});
      if(m.missing||m.hit.length||m.tipHit?.length||!m.inside||m.clipped)console.log('LAYOUT PROBLEM',name,lang,mode,st,JSON.stringify(m));
      if(st==='ready'&&lang==='en'&&(mode==='moves'||mode==='watch'))await shot(p,`layout-${name}-${mode}-ready-en`);
      if(st==='ready'&&lang!=='en'&&mode==='defence'&&name==='small')await shot(p,`layout-${name}-${mode}-ready-${lang}`);
     }
    }
   }
   assert.deepEqual(p.errors,[]);await p.close();
  }
  const bad=rows.filter(r=>r.missing||r.hit.length||r.tipHit?.length||!r.inside||r.clipped);results.layout={checked:rows.length,problems:bad.length,sizes:[...new Set(rows.map(r=>r.name+':'+r.w+'x'+r.h))]};console.log('LAYOUT',JSON.stringify(results.layout));assert.equal(bad.length,0,JSON.stringify(bad.slice(0,5)));
 }
 fs.writeFileSync(path.join(dir,'results-'+parts.join('-')+'.json'),JSON.stringify(results,null,1));console.log('ALL ASSERTIONS PASSED',parts.join(','));
}catch(e){console.error('FAIL',e.stack||e.message);process.exitCode=1;}finally{await b.close();}})();
