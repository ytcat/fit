// GOTR-0035 — Fighter pad in the real app: D-pad and punch arc in a fight, sparring and mitt work (touch),
// desktop mouse + keyboard, multi-touch, hold-to-repeat, screen-relative steps after the camera turns,
// no page scroll/zoom, the boxers' bodies never under the pad (side view), and the Fight Academy flow.
// Usage: node qa/gotr-0035/browser.cjs   (env: APP_URL, PARTS=func,desk,academy,shots, SHOTS=<dir> for screenshots)
// Like qa/gotr-0007, while moves play out the WebGL draw call is skipped (render → no-op) so the simulation runs in
// real time on this shared software renderer; every input path is the shipped code, drawing is restored for screenshots.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8156/',SHOTS=process.env.SHOTS||'',PARTS=(process.env.PARTS||'func,desk,academy,shots').split(',');
const SIZES={phone:{width:402,height:690},small:{width:360,height:640},land:{width:852,height:393},desk:{width:1366,height:768}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out=[],say=s=>{out.push(s);console.log(s);};
const fast=(p,on)=>p.evaluate(on=>{const r=app.engine.renderer;if(on&&!window.__draw){window.__draw=r.render;r.render=()=>{};}else if(!on&&window.__draw){r.render=window.__draw;window.__draw=null;app.engine.lastRenderStamp=null;}},on);

// In-page helpers: start a mode, find control points, the fighter's state, and body-vs-pad clearance.
const HELPERS=()=>{
 window.qa={
  start(mode,lang){
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);
   if(mode==='fight')ringfighterGame.quick();else ringfighterGame.startTraining({mode,play:true});
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!app.engine.player.enabled)document.getElementById('playMode').click();
   const e=app.engine,d=e.cameraDirector,m=e.arena?.fightView?.match;
   // QA setup only: a long round so the checks are not cut by the bell.
   if(m){if(m.phase==='intro')m.advance(3.01);m.roundSeconds=900;}
   d.skipIntro?.();if(!d.locked)d.setLock(true,true);const pose=d.follow(0,true);d.place(pose);fighterPad.paint(true);return e.targetMode;
  },
  point(what){
   const pad=document.getElementById('fighterPad');
   if(['up','down','left','right'].includes(what)){const r=pad.querySelector('.fp-dpad').getBoundingClientRect(),v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[what],k=r.width/2*.66;return {x:r.left+r.width/2+v[0]*k,y:r.top+r.height/2+v[1]*k};}
   const n=what.startsWith('#')||what.startsWith('.')?document.querySelector(what):pad.querySelector('[data-pad="'+what+'"]');const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  },
  fighter(){
   const e=app.engine,m=e.arena?.fightView?.match,p=e.player;
   if(m){const f=m.fighters[p.actor()],a=f.action;return {busy:!!(a&&a.start+a.duration>m.time)||m.playerQueue.length>0||!!m.pendingPlayerCombo,move:a?.move,input:a?.input,thrown:m.roundStats[p.actor()].thrown,down:f.down,phase:m.phase};}
   const c=p.current;return {busy:!!c||p.queue.length>0,move:c?.move,input:c?.input,queue:p.queue.map(q=>q.input)};
  },
  // Record which moves the fighter really starts, and how far its hips travel on screen (stage px), for ms.
  track(ms){return new Promise(res=>{const e=app.engine,fv=e.arena?.mode==='fight'?e.arena.fightView:null,me=fv?fv.coaches[e.player.actor()]:e.coach,c=e.camera,cv=e.canvas.getBoundingClientRect(),V=new THREE.Vector3();
   const sx=()=>{me.joints.hips.getWorldPosition(V).project(c);return (V.x+1)/2*cv.width;},x0=sx();let lo=0,hi=0,seen=null;const started=[],t0=performance.now();
   const tick=()=>{const m=e.arena?.fightView?.match,a=m?m.fighters[e.player.actor()].action:e.player.current;if(a&&a.id!==seen){seen=a.id;started.push(a.input||a.move);}const dx=sx()-x0;lo=Math.min(lo,dx);hi=Math.max(hi,dx);if(performance.now()-t0<ms)requestAnimationFrame(tick);else res({started,lo:Math.round(lo),hi:Math.round(hi)});};tick();});},
  // Clearance in px between the boxers (bone capsules projected with the live camera) and every pad control; < 0 = overlap.
  cover(){
   const e=app.engine,a=e.arena,c=e.camera,cv=e.canvas.getBoundingClientRect(),fv=a?.mode==='fight'?a.fightView:null,list=fv?[fv.coaches.lion,fv.coaches.rabbit]:[e.coach,a?.careerDrill?.trainer||(a?.mode==='rabbit'?a.rabbit:null)].filter(Boolean);
   const V=()=>new THREE.Vector3(),right=V().setFromMatrixColumn(c.matrixWorld,0).normalize(),scr=v=>{const q=v.clone().project(c);return {x:cv.left+(q.x+1)/2*cv.width,y:cv.top+(1-q.y)/2*cv.height};};
   const R={hips:.17,spine:.18,chest:.18,neck:.09,head:.15,armL:.075,elbowL:.065,handL:.09,armR:.075,elbowR:.065,handR:.09,scapulaL:.08,scapulaR:.08,thighL:.095,kneeL:.075,footL:.085,thighR:.095,kneeR:.075,footR:.085},samples=[];
   for(const coach of list){const j=coach.joints,names=Object.keys(j),pos={};for(const n of names)pos[n]=j[n].getWorldPosition(V());
    const add=(p,r)=>{const s=scr(p),s2=scr(p.clone().addScaledVector(right,r));samples.push({x:s.x,y:s.y,r:Math.hypot(s2.x-s.x,s2.y-s.y)});};
    for(const n of names){add(pos[n],R[n]||.08);const parent=names.find(k=>j[k]===j[n].parent);if(parent)for(let i=1;i<6;i++)add(pos[parent].clone().lerp(pos[n],i/6),Math.min(R[n]||.08,R[parent]||.08));}
    add(pos.head.clone().add(V().set(0,coach.species==='rabbit'?.32:.16,0)),coach.species==='rabbit'?.07:.12);}
   const shapes=[...document.querySelectorAll('#fighterPad .fp-dpad,#fighterPad .fp-btn,#fighterPad .fp-chip-face,#fighterPad #burstControl,#burstTip,#camLock,.ringside-playback #playBtn')].filter(n=>n.getClientRects().length&&getComputedStyle(n).display!=='none'&&!n.hidden).map(n=>({id:n.dataset?.pad||n.id||n.className.split(' ')[0],r:n.getBoundingClientRect(),round:n.matches('.fp-dpad,.fp-btn,#camLock,#playBtn')}));
   let worst={clear:Infinity};
   for(const s of samples)for(const sh of shapes){let d;if(sh.round){d=Math.hypot(s.x-(sh.r.left+sh.r.width/2),s.y-(sh.r.top+sh.r.height/2))-sh.r.width/2;}else{d=Math.hypot(Math.max(sh.r.left-s.x,0,s.x-sh.r.right),Math.max(sh.r.top-s.y,0,s.y-sh.r.bottom));}const clear=d-s.r;if(clear<worst.clear)worst={clear:Math.round(clear),shape:sh.id};}
   return {...worst,samples:samples.length,shapes:shapes.length,frame:fighterPad.frame};
  },
  layout(){
   const box=n=>n.getBoundingClientRect(),pad=document.getElementById('fighterPad'),stage=box(document.getElementById('stageContainer')),ctl=[...pad.querySelectorAll('.fp-dpad,.fp-btn,.fp-chip,#burstControl')].filter(n=>n.getClientRects().length);
   const all=[...ctl,document.getElementById('camLock'),document.getElementById('playBtn')].filter(n=>n&&n.getClientRects().length),over=(a,b)=>a.right>b.left+.5&&b.right>a.left+.5&&a.bottom>b.top+.5&&b.bottom>a.top+.5;
   const pairs=[];const round=[...pad.querySelectorAll('.fp-btn')];for(let i=0;i<round.length;i++)for(let k=i+1;k<round.length;k++){const a=box(round[i]),b=box(round[k]);if(Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)<(a.width+b.width)/2-.5)pairs.push(round[i].dataset.pad+'/'+round[k].dataset.pad);}
   const sys=[document.getElementById('camLock'),document.getElementById('playBtn')].filter(n=>n?.getClientRects().length).map(box),padRects=[...pad.querySelectorAll('.fp-dpad,.fp-btn,.fp-chip,#burstControl')].filter(n=>n.getClientRects().length).map(box);
   return {shown:fighterPad.shown,dir:pad.dir,rails:[...document.querySelectorAll('#manualControls .manual-rail')].map(n=>getComputedStyle(n).display),pages:getComputedStyle(document.querySelector('.manual-pages')).display,
    outside:all.filter(n=>{const r=box(n);return !(r.left>=stage.left-.5&&r.right<=stage.right+.5&&r.top>=stage.top-.5&&r.bottom<=stage.bottom+.5);}).map(n=>(n.id||n.dataset.pad||n.dataset.dir||n.className)+':'+JSON.stringify(n.getBoundingClientRect())+' stage '+JSON.stringify(stage)),overlapRound:pairs,sysOverPad:sys.some(s=>padRects.some(r=>over(s,r))),
    minTarget:Math.round(Math.min(...[...pad.querySelectorAll('.fp-btn')].map(n=>box(n).width),pad.querySelector('.fp-dpad').getBoundingClientRect().width/2)),chipTarget:Math.round(Math.min(...[...pad.querySelectorAll('.fp-chip')].map(n=>box(n).height),99)),
    clipped:[...pad.querySelectorAll('.fp-label,.fp-cap,.fp-chip-text')].filter(n=>n.getClientRects().length&&(n.scrollWidth>n.clientWidth+1)).map(n=>n.textContent),
    labels:[...pad.querySelectorAll('.fp-btn')].map(n=>n.dataset.pad+'='+n.querySelector('.fp-label').textContent).concat([...pad.querySelectorAll('.fp-arrow')].map(n=>n.dataset.dir+'='+n.querySelector('.fp-cap').textContent)),
    dpadLeft:box(pad.querySelector('.fp-dpad')).right<box(pad.querySelector('[data-pad=straight]')).left,hScroll:document.documentElement.scrollWidth>innerWidth+1,scrollY:scrollY,scale:visualViewport.scale};
  }
 };
};
async function open(b,size,opts={}){
 const touch=size!=='desk',p=await b.newPage({viewport:SIZES[size],hasTouch:touch,isMobile:touch}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy&&window.fighterPad&&window.AcademyStage,null,{timeout:240000});
 await p.evaluate(HELPERS);await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));p.errors=errors;p.touch=touch;return p;
}
const lastLog=(p,n=1)=>p.evaluate(n=>fighterPad.log.slice(-n),n);
const waitFree=p=>p.waitForFunction(()=>!qa.fighter().busy,null,{timeout:30000});
async function tap(p,what){const pt=await p.evaluate(w=>qa.point(w),what);if(p.touch)await p.touchscreen.tap(pt.x,pt.y);else await p.mouse.click(pt.x,pt.y);await sleep(120);}
async function shot(p,name){if(!SHOTS)return;fs.mkdirSync(SHOTS,{recursive:true});await fast(p,false);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,2500)))));const png=path.join(SHOTS,name+'.png');await p.screenshot({path:png,timeout:240000});await fast(p,true);}

// D-pad and punches through real taps; returns a line of numbers for the report.
async function drive(p,mode,tag){
 const facing=await p.evaluate(()=>fighterPad.facing);const res=[];
 for(const dir of ['right','left','up','down']){
  await waitFree(p);const tr=p.evaluate(()=>qa.track(1400));await tap(p,dir);const [log]=await lastLog(p);const t=await tr;
  assert.equal(log.control,dir);assert.ok(log.ok,tag+' '+dir+' accepted '+JSON.stringify(log));
  const want=dir==='up'?/^slip_(left|right)$/:dir==='down'?/^roll$/:dir===(facing>0?'right':'left')?/^step_forward$/:/^step_back$/;assert.match(log.id,want,tag+' '+dir+' facing '+facing);
  assert.ok(t.started.includes(log.id),tag+' the fighter starts '+log.id+' '+JSON.stringify(t));
  res.push(`${dir}→${log.id} hips ${t.lo}..${t.hi}px`);
  if(dir==='right'||dir==='left'){const toward=dir==='right'?t.hi:-t.lo;assert.ok(toward>=1,tag+' '+dir+' moves the fighter that way on screen '+JSON.stringify(t));}
 }
 await waitFree(p);const before=await p.evaluate(()=>qa.fighter());const tr=p.evaluate(()=>qa.track(3600));
 for(const id of ['straight','straight','hook'])await tap(p,id);
 const logs=await lastLog(p,3),t=await tr;assert.deepEqual(logs.map(l=>l.id),['jab','cross','hook'],tag+' Straight, Straight, Hook '+JSON.stringify(logs));assert.ok(logs.every(l=>l.ok),tag+' punches accepted');
 for(const id of ['jab','cross','hook'])assert.ok(t.started.includes(id),tag+' threw '+id+' '+JSON.stringify(t.started));
 const after=await p.evaluate(()=>qa.fighter());if(before.thrown!==undefined)assert.ok(after.thrown-before.thrown>=3,tag+' fight counts the punches '+(after.thrown-before.thrown));
 await waitFree(p);const tu=p.evaluate(()=>qa.track(1600));await tap(p,'uppercut');const [up]=await lastLog(p);const tu2=await tu;assert.ok(up.ok&&/uppercut$/.test(up.id)&&tu2.started.includes(up.id),tag+' uppercut '+JSON.stringify([up,tu2.started]));
 await waitFree(p);await tap(p,'guard');const [g]=await lastLog(p);assert.ok(g.ok&&g.id==='guard',tag+' guard');
 res.push(`punches ${logs.map(l=>l.id).join(',')} + ${up.id} started ${t.started.concat(tu2.started).filter(x=>/jab|cross|hook|uppercut/.test(x)).join(',')}`+(before.thrown!==undefined?` · fight thrown +${after.thrown-before.thrown}`:''));
 return {facing,line:res.join(' | ')};
}

(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 if(PARTS.includes('func')){
  const p=await open(b,'phone');await fast(p,true);
  for(const mode of ['fight','rabbit','pads']){
   assert.equal(await p.evaluate(m=>qa.start(m,'en'),mode),mode);await sleep(800);
   const l=await p.evaluate(()=>qa.layout());assert.ok(l.shown,'pad shown in '+mode);assert.deepEqual(l.rails,['none','none'],'old move rails hidden');assert.equal(l.pages,'none','no Moves/Combos/Defence pages');assert.ok(l.dpadLeft&&l.dir==='ltr');
   const r=await drive(p,mode,'phone '+mode);say(`phone ${mode} (touch, facing ${r.facing>0?'right':'left'}): ${r.line}`);
  }
  // Bag, dummy, speed bag and shadow boxing take the same pad; on the speed bag the three buttons are taps, doubles and triples.
  for(const mode of ['heavy','dummy','speed','none']){
   assert.equal(await p.evaluate(m=>qa.start(m,'en'),mode),mode);await sleep(500);await waitFree(p);assert.ok((await p.evaluate(()=>qa.layout())).shown,'pad shown in '+mode);
   const tr=p.evaluate(()=>qa.track(3000));await tap(p,'straight');await tap(p,'straight');await waitFree(p);await tap(p,'hook');const logs=await lastLog(p,3),t=await tr;
   const want=mode==='speed'?[/^tap_lead$/,/^tap_rear$/,/^double_(lead|rear)$/]:[/^jab$/,/^cross$/,/^(rear_)?hook$/];
   logs.forEach((l,i)=>{assert.ok(l.ok,mode+' '+JSON.stringify(l));assert.match(l.id,want[i]);assert.ok(t.started.includes(l.id),mode+' started '+l.id+' '+JSON.stringify(t.started));});
   const label=await p.evaluate(()=>document.querySelector('[data-pad=straight] .fp-label').textContent);assert.equal(label,mode==='speed'?'Tap':'Straight');
   await waitFree(p);await tap(p,'down');const [d]=await lastLog(p);assert.ok(d.ok&&d.id==='roll',mode+' duck');
   say(`phone ${mode}: Straight, Straight, ${label==='Tap'?'Double':'Hook'} → ${logs.map(l=>l.id).join(', ')} (started ${t.started.join(',')}); ↓ → roll`);
  }
  // Multi-touch: move and punch at the same moment.
  await p.evaluate(()=>qa.start('fight','en'));await sleep(500);await waitFree(p);
  const cdp=await p.context().newCDPSession(p),a=await p.evaluate(()=>qa.point('left')),s=await p.evaluate(()=>qa.point('straight')),n0=await p.evaluate(()=>fighterPad.log.length);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1},{x:s.x,y:s.y,id:2}]});await sleep(250);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const both=(await p.evaluate(n=>fighterPad.log.slice(n),n0)).filter(l=>l.source==='pad');assert.deepEqual(both.map(l=>l.control).sort(),['left','straight'],'two fingers, two orders '+JSON.stringify(both));assert.ok(both.every(l=>l.ok));
  say(`phone multi-touch: ${both.map(l=>l.control+'→'+l.id).join(' + ')} in ${Math.abs(both[1].t-both[0].t)} ms`);
  // Hold → : steps repeat while the thumb stays down.
  await waitFree(p);const r0=await p.evaluate(()=>fighterPad.log.length),rp=await p.evaluate(()=>qa.point('right'));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rp.x,y:rp.y,id:3}]});await sleep(3500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const held=(await p.evaluate(n=>fighterPad.log.slice(n),r0)).filter(l=>l.control==='right');assert.ok(held.length>=3&&held.every(l=>l.ok),'held arrow repeats '+JSON.stringify(held));
  say(`phone hold → 3.5 s: ${held.length} accepted steps (${held.map(l=>l.id+'/'+l.source).join(', ')})`);
  // Guard held 2.5 s keeps covering.
  await waitFree(p);const g0=await p.evaluate(()=>fighterPad.log.length),gp=await p.evaluate(()=>qa.point('guard'));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gp.x,y:gp.y,id:4}]});await sleep(2500);const covering=await p.evaluate(()=>qa.fighter().move);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const guards=(await p.evaluate(n=>fighterPad.log.slice(n),g0)).filter(l=>l.control==='guard');assert.ok(guards.length>=3&&covering==='guard','held guard '+guards.length+' '+covering);
  say(`phone hold Guard 2.5 s: ${guards.length} guard orders, still covering at release`);
  // No page scroll or zoom from all those touches.
  const l=await p.evaluate(()=>qa.layout());assert.equal(l.scrollY,0);assert.equal(l.scale,1);assert.ok(!l.hScroll);
  // The camera turns to the other side: → still moves right on screen (now a step out). Mitt work shows the clearest step travel.
  await p.evaluate(()=>qa.start('pads','en'));await sleep(500);await waitFree(p);const flip=await p.evaluate(async()=>{const e=app.engine;e.cameraDirector.setLock(false,true);e.viewControls.rotate(Math.PI);await new Promise(r=>setTimeout(r,600));fighterPad.paint(true);return {facing:fighterPad.facing,cap:document.querySelector('.fp-arrow[data-dir=right] .fp-cap').textContent};});
  assert.equal(flip.facing,-1,'after a half turn the fighter faces left on screen');assert.equal(flip.cap,'Out');
  const tf=p.evaluate(()=>qa.track(1400));await tap(p,'right');const [fl]=await lastLog(p);const tfr=await tf;assert.equal(fl.id,'step_back');assert.ok(tfr.hi>=1,'→ still moves right on screen '+JSON.stringify(tfr));
  await waitFree(p);const tl=p.evaluate(()=>qa.track(1400));await tap(p,'left');const [fl2]=await lastLog(p);const tlr=await tl;assert.equal(fl2.id,'step_forward');assert.ok(tlr.lo<=-1,'← moves left on screen '+JSON.stringify(tlr));
  say(`phone mitts, camera half-turn: facing left, → = ${fl.id} (hips ${tfr.lo}..${tfr.hi}px), ← = ${fl2.id} (hips ${tlr.lo}..${tlr.hi}px)`);
  await p.evaluate(()=>{app.engine.viewControls.rotate(-Math.PI);app.engine.cameraDirector.setLock(true,true);});
  // Watch mode and rope bring the old buttons back.
  const back=await p.evaluate(async()=>{document.getElementById('watchMode').click();await new Promise(r=>setTimeout(r,300));const w={shown:fighterPad.shown,burstHome:document.getElementById('burstControl').parentNode.id};ringfighterGame.startTraining({mode:'rope',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!app.engine.player.enabled)document.getElementById('playMode').click();await new Promise(r=>setTimeout(r,400));return {watch:w,rope:{shown:fighterPad.shown,rope:!!document.querySelector('#manualControls [data-input-move="rope_boost"]')&&getComputedStyle(document.querySelector('#manualControls .manual-rail')).display}};});
  assert.deepEqual(back,{watch:{shown:false,burstHome:'stageContainer'},rope:{shown:false,rope:'grid'}},JSON.stringify(back));say('phone Watch mode / rope: pad hidden, Burst back on the stage, rope keeps its own button');
  assert.deepEqual(p.errors,[]);await p.close();
 }
 if(PARTS.includes('desk')){
  const p=await open(b,'desk');await fast(p,true);
  // Equip three fight combos the legitimate way the shop/academy record them, so the chips show.
  const eq=await p.evaluate(()=>{const st=app.engine.career.store;if(!st.current())st.create('QA desk');const g=st.game();Object.assign(g.activity,{completed:9,rope:9,fights:9,defences:99,hits:999});g.combos.owned=GameDomain.combos.map(c=>c.id);st.save?.();return GameDomain.combos.slice(0,3).map(c=>st.gameAction({type:'combo',comboId:c.id,mode:'fight',enabled:true,species:app.engine.coach.species}).ok);});
  assert.deepEqual(eq,[true,true,true]);
  await p.evaluate(()=>qa.start('fight','en'));await sleep(800);
  const r=await drive(p,'fight','desk mouse');say(`desk fight (mouse, facing ${r.facing>0?'right':'left'}): ${r.line}`);
  await waitFree(p);await sleep(900);const tr=p.evaluate(()=>qa.track(3600));
  for(const k of ['j','j','k'])await p.keyboard.press(k);
  const keys=await lastLog(p,3),t=await tr;assert.deepEqual(keys.map(l=>[l.source,l.id]),[['keyboard','jab'],['keyboard','cross'],['keyboard','hook']]);for(const id of ['jab','cross','hook'])assert.ok(t.started.includes(id));
  await waitFree(p);await p.keyboard.press('ArrowUp');await sleep(200);assert.equal((await p.evaluate(()=>qa.fighter())).move,'guard','old ArrowUp = guard still works');
  await waitFree(p);await p.keyboard.press('w');await sleep(200);assert.equal((await p.evaluate(()=>qa.fighter())).input,'step_forward','old W = step in still works');
  const chips=await p.evaluate(()=>[...document.querySelectorAll('#fighterPad .fp-chip')].map(c=>({id:c.dataset.inputMove,text:c.querySelector('.fp-chip-text').textContent,key:c.querySelector('.fp-key')?.textContent})));
  assert.deepEqual(chips.map(c=>c.id),['combo_one_two','combo_three','combo_counter']);
  await waitFree(p);await p.keyboard.press('1');await sleep(250);const k1=await p.evaluate(()=>{const m=app.engine.arena.fightView.match;return m.playerCombo?.id||m.pendingPlayerCombo?.id;});assert.equal(k1,'combo_one_two','old digit 1 = first combo chip');
  await waitFree(p);await p.mouse.click(...Object.values(await p.evaluate(()=>qa.point('.fp-chip[data-input-move="combo_three"]'))));await sleep(250);const c3=await p.evaluate(()=>{const m=app.engine.arena.fightView.match;return m.playerCombo?.id||m.pendingPlayerCombo?.id;});assert.equal(c3,'combo_three','chip click throws the combo');
  say(`desk keyboard: J,J,K → ${keys.map(l=>l.id).join(',')} (thrown), ↑ guard and W step in unchanged, 1 → combo_one_two; chips ${chips.map(c=>c.key+':'+c.text).join(' / ')}; click chip → combo_three`);
  assert.deepEqual(p.errors,[]);await p.close();
 }
 if(PARTS.includes('academy')){
  const p=await open(b,'phone');await fast(p,true);
  await p.evaluate(()=>{app.engine.career.store.create('QA pad');app.setLanguage('en');});await sleep(400);
  const go=await p.evaluate(()=>AcademyStage.start('first_rhythm'));assert.ok(go.ok);await p.waitForFunction(()=>AcademyStage.state?.phase==='watch',null,{timeout:20000});
  const during=await p.evaluate(()=>({pad:fighterPad.shown,moves:[...document.querySelectorAll('#manualControls .manual-move')].filter(b=>b.getClientRects().length).length,lesson:document.body.classList.contains('academy-lesson')}));
  assert.deepEqual(during,{pad:false,moves:12,lesson:true},'a lesson keeps its own exact move buttons');
  await p.click('.academy-hud [data-act="turn"]');
  for(let run=0;run<3;run++)for(const move of ['jab','cross']){const k=await p.evaluate(()=>JSON.stringify(AcademyStage.state));await p.click('#manualControls [data-input-move="'+move+'"]');await p.waitForFunction(k=>JSON.stringify(AcademyStage.state)!==k||!AcademyStage.state,k,{timeout:20000});}
  await p.waitForSelector('dialog.game-academy .academy-result',{timeout:20000});
  const paid=await p.evaluate(()=>{const s=app.engine.career.store,g=s.game();return {coins:s.wallet().coins,lessons:g.ledger.filter(t=>t.rule==='academy-lesson-v1').map(t=>t.id),fight:g.combos.fight};});
  assert.deepEqual(paid,{coins:15,lessons:['lesson:first_rhythm'],fight:['first_rhythm']},'lesson evidence accepted by the game rules');
  await p.click('.academy-result [data-act="fight"]');await p.waitForFunction(()=>app.engine.targetMode==='fight'&&!ringfighterGame.isModalOpen&&fighterPad.shown,null,{timeout:30000});
  await p.evaluate(()=>{const m=app.engine.arena.fightView.match;if(m.phase==='intro')m.advance(3.01);m.roundSeconds=900;});
  await p.waitForFunction(()=>document.querySelector('#fighterPad .fp-chip[data-input-move="combo_one_two"]')?.classList.contains('academy-next')&&!document.querySelector('.academy-hint')?.hidden,null,{timeout:40000});
  await p.evaluate(()=>{const h=document.querySelector('.academy-hint');window.__cue=[];new MutationObserver(()=>window.__cue.push(h.textContent)).observe(h,{childList:true,characterData:true,subtree:true});});
  for(let i=0;i<10&&!(await p.evaluate(()=>window.__cue.length));i++){await tap(p,'.fp-chip[data-input-move="combo_one_two"]');await sleep(400);}
  const cue=await p.evaluate(()=>window.__cue);assert.ok(cue.some(t=>t.includes('✓')),'the fight cue confirms the combo thrown from the pad chip '+JSON.stringify(cue));
  say(`phone Academy: lesson keeps its 12 exact move buttons (pad hidden), jab-cross ×3 → +15 coins, evidence accepted; in the fight the pad chip glows and its tap is confirmed ("${cue.find(t=>t.includes('✓'))}")`);
  assert.deepEqual(p.errors,[]);await p.close();
 }
 if(PARTS.includes('shots')){
  for(const size of (process.env.SIZES||'phone,small,land,desk').split(',')){
   const p=await open(b,size);await fast(p,true);
   for(const [mode,lang] of [['fight','en'],['fight','he']].concat(size==='phone'?[['pads','en'],['rabbit','he'],['combos','ru']]:size==='land'?[['pads','ru']]:size==='small'?[['speed','ru'],['combos','en']]:[])){
    // 'combos': a fight with three equipped combos, the tallest punch cluster (Burst + three chips).
    if(mode==='combos')await p.evaluate(()=>{const st=app.engine.career.store;if(!st.current())st.create('QA combos');const g=st.game();Object.assign(g.activity,{completed:9,rope:9,fights:9,defences:99,hits:999});g.combos.owned=GameDomain.combos.map(c=>c.id);st.save?.();for(const c of GameDomain.combos.slice(0,3))st.gameAction({type:'combo',comboId:c.id,mode:'fight',enabled:true,species:app.engine.coach.species});});
    await p.evaluate(([m,l])=>qa.start(m,l),[mode==='combos'?'fight':mode,lang]);if(mode==='combos')assert.equal(await p.evaluate(()=>document.querySelectorAll('#fighterPad .fp-chip:not([data-meta])').length),3);
    // let the lens settle (it eases), then measure with the frame that is drawn
    for(let i=0;i<14;i++){await p.evaluate(()=>fighterPad.paint());await sleep(120);}
    const l=await p.evaluate(()=>qa.layout()),c=await p.evaluate(()=>qa.cover());
    assert.ok(l.shown&&!l.outside.length&&!l.hScroll&&!l.sysOverPad,size+' '+mode+' '+lang+' layout '+JSON.stringify(l));assert.deepEqual(l.overlapRound,[]);assert.deepEqual(l.clipped,[],size+' '+lang+' labels fit');
    assert.ok(l.minTarget>=48,size+' thumb-sized targets '+l.minTarget);assert.ok(c.clear>=0,size+' '+mode+' boxers never under the pad '+JSON.stringify(c));
    say(`${size} ${mode} ${lang}: targets ≥${l.minTarget}px (chips ${l.chipTarget}px), body clearance ${c.clear}px (closest ${c.shape}), lens k=${c.frame.k.toFixed(3)} d=${Math.round(c.frame.d)}px, labels ${l.labels.join(' ')}`);
    await shot(p,`${size}-${mode}-${lang}`);
    if((size==='phone'||size==='desk')&&mode==='fight'&&lang==='en'){await p.evaluate(()=>{const e=app.engine;e.arena.fightView.match.fighters[e.player.actor()].burst.charge=1;window.burstControl?.resetTip?.();});await sleep(600);
     const tip=await p.evaluate(()=>{const t=document.getElementById('burstTip'),r=t.getBoundingClientRect(),s=document.getElementById('stageContainer').getBoundingClientRect();return {state:document.getElementById('burstControl').dataset.state,tip:getComputedStyle(t).display!=='none'&&!t.hidden,inside:r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom,inPad:!!document.querySelector('#fighterPad #burstControl'),clear:qa.cover().clear};});
     // Phones hide the first-time tip (no corner free of boxers and HUD); wide screens show it above the punch arc.
     assert.deepEqual({...tip,clear:tip.clear>=0},{state:'ready',tip:size!=='phone',inside:size!=='phone'?true:tip.inside,inPad:true,clear:true},JSON.stringify(tip));await shot(p,size+'-fight-burst-en');say(`${size} Burst ready inside the pad${size==='phone'?' (first-time tip hidden on phones)':', tip above the punch arc'}, body clearance ${tip.clear}px`);
     if(size==='phone'){// Pressed look: thumb on → and on Straight at the same time.
     const cdp=await p.context().newCDPSession(p),r=await p.evaluate(()=>qa.point('right')),st=await p.evaluate(()=>qa.point('straight'));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y,id:7},{x:st.x,y:st.y,id:8}]});await sleep(200);
     const pressed=await p.evaluate(()=>({dpad:document.querySelector('.fp-dpad').dataset.dir,arrow:document.querySelector('.fp-arrow[data-dir=right]').dataset.pressed,straight:document.querySelector('[data-pad=straight]').dataset.pressed}));assert.deepEqual(pressed,{dpad:'right',arrow:'true',straight:'true'});
     await shot(p,'phone-fight-pressed-en');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}
    const after=await p.evaluate(()=>qa.cover());assert.ok(after.clear>=0,size+' '+mode+' at the screenshot '+JSON.stringify(after));
   }
   assert.deepEqual(p.errors,[]);await p.close();
  }
 }
 console.log('\n'+out.join('\n'));console.log('ALL ASSERTIONS PASSED');
}catch(err){console.log('\n'+out.join('\n'));console.error('FAIL',err.message);process.exitCode=1;}
await b.close();})();
