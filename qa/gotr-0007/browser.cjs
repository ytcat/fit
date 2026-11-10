// GOTR-0007 — Fight Academy lessons in the real app: landing → watch → repeat with the real move buttons →
// reward and unlock → try it in a fight → reload. EN/HE/RU at phone, small phone, landscape and desktop.
// Usage: node qa/gotr-0007/browser.cjs   (env: APP_URL, SIZES=phone,small,land,desk, SHOTS=<dir> to also write PNG screenshots)
// Note: the shared headless software renderer draws well under 1 frame/s, and the game advances 0.05 s per drawn
// frame. While waiting for moves to play out this script skips the WebGL draw call (render → no-op) so the
// simulation runs in real time; all input, lesson, save and DOM code is the shipped code, and drawing is restored
// for every screenshot.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const URL=process.env.APP_URL||'http://127.0.0.1:8143/',SHOTS=process.env.SHOTS||'',ONLY=(process.env.SIZES||'phone,small,land,desk').split(',');
const SIZES={phone:{width:393,height:852},small:{width:360,height:640},land:{width:852,height:393},desk:{width:1366,height:768}},LANGS=['en','he','ru'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out=[];
const fast=(p,on)=>p.evaluate(on=>{const r=app.engine.renderer;if(on&&!window.__draw){window.__draw=r.render;r.render=()=>{};}else if(!on&&window.__draw){r.render=window.__draw;window.__draw=null;app.engine.lastRenderStamp=null;}},on);
const WANT=new Set(['phone-en-landing','phone-en-watch','phone-en-wrong','phone-en-repeat','phone-en-pass','phone-en-fight','phone-en-landing-passed','small-he-landing','small-he-repeat','small-he-pass','small-ru-six','land-ru-watch','land-en-repeat','land-he-six','desk-ru-landing','desk-en-repeat','desk-he-pass']);
async function shot(p,name){if(!SHOTS||!WANT.has(name))return;fs.mkdirSync(SHOTS,{recursive:true});await fast(p,false);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,2500)))));await p.screenshot({path:path.join(SHOTS,name+'.png'),timeout:240000});await fast(p,true);}
const state=p=>p.evaluate(()=>AcademyStage.state);
const save=p=>p.evaluate(()=>{const s=app.engine.career.store,g=s.game();return {coins:s.wallet().coins,xp:s.wallet().xp,combos:g.combos,lessons:g.ledger.filter(t=>t.rule==='academy-lesson-v1').map(t=>t.id),points:JSON.stringify(s.current().boxers),sessions:g.activity.completed};});
// HUD geometry: inside the stage, never over a move button, nothing clipped.
const hud=p=>p.evaluate(()=>{const h=document.querySelector('.academy-hud'),box=n=>n.getBoundingClientRect(),stage=box(document.getElementById('stageContainer')),r=box(h),shown=n=>{const b=box(n),s=getComputedStyle(n);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none';},over=(a,b)=>a.right>b.left+.5&&b.right>a.left+.5&&a.bottom>b.top+.5&&b.bottom>a.top+.5;
 const moves=[...document.querySelectorAll('#manualControls .manual-move')].filter(shown),parts=[...h.querySelectorAll('.academy-box,.academy-btn,.academy-pips,.academy-msg,.academy-name')].filter(shown),buttons=[...h.querySelectorAll('.academy-btn')].filter(shown);
 return {phase:h.dataset.phase,dir:h.dir,wide:h.dataset.wide,height:Math.round(r.height),inside:r.left>=stage.left-.5&&r.right<=stage.right+.5&&r.top>=stage.top-.5&&r.bottom<=stage.bottom+.5,covers:moves.filter(b=>over(r,box(b))).map(b=>b.dataset.inputMove),moves:moves.length,
  movesInView:moves.every(b=>{const m=box(b);return m.left>=0&&m.top>=0&&m.right<=innerWidth+.5&&m.bottom<=innerHeight+.5;}),outside:parts.filter(n=>{const b=box(n);return b.left<r.left-.5||b.right>r.right+.5||b.top<r.top-.5||b.bottom>r.bottom+.5;}).map(n=>n.className),
  scroll:h.scrollHeight>h.clientHeight+1||h.scrollWidth>h.clientWidth+1,boxClip:[...h.querySelectorAll('.academy-box')].filter(b=>b.scrollWidth>b.clientWidth+1||b.scrollHeight>b.clientHeight+1).map(b=>b.textContent),rows:new Set([...h.querySelectorAll('.academy-box')].map(b=>Math.round(box(b).top))).size,
  minButton:Math.min(...buttons.map(b=>Math.min(box(b).width,box(b).height))),buttons:buttons.map(b=>b.dataset.act),boxes:[...h.querySelectorAll('.academy-box')].map(b=>({text:b.textContent,state:b.dataset.state})),labels:[...h.querySelectorAll('.academy-box')].length,
  real:[...document.querySelectorAll('#manualControls .manual-move')].map(b=>b.dataset.inputMove+'='+b.textContent),glow:[...document.querySelectorAll('#manualControls .academy-next')].map(b=>b.dataset.inputMove),pips:[...h.querySelectorAll('.academy-pips i')].map(i=>i.dataset.on==='true'?1:0).join(''),msg:h.querySelector('.academy-msg').textContent,tone:h.querySelector('.academy-msg').dataset.tone,flash:h.querySelector('.academy-row').dataset.flash,
  tabs:getComputedStyle(document.querySelector('.manual-pages')).visibility,locked:getComputedStyle(moves[0]).pointerEvents,hScroll:document.documentElement.scrollWidth>innerWidth+1};});
function checkHud(g,label,count){assert.ok(g.inside,label+' HUD inside the stage '+JSON.stringify(g));assert.deepEqual(g.covers,[],label+' HUD never covers a move button');assert.equal(g.moves,12,label+' all twelve Moves buttons shown');assert.ok(g.movesInView,label+' move buttons fully on screen');assert.deepEqual(g.outside,[],label+' nothing sticks out of the HUD');assert.ok(!g.scroll,label+' HUD not clipped '+g.height);assert.deepEqual(g.boxClip,[],label+' box text fits');assert.equal(g.rows,1,label+' boxes in one row');assert.equal(g.labels,count);assert.ok(g.minButton>=32,label+' HUD buttons are tappable: '+g.minButton);assert.equal(g.tabs,'hidden');assert.ok(!g.hScroll,label+' no horizontal scroll');}
// One human-like tap on a real move button; a tap may wait for the fighter to have room, so wait until the lesson judged it.
async function tap(p,id){const key=()=>p.evaluate(()=>{const s=AcademyStage.state;return s?[s.phase,s.reps,s.step,s.strikes,s.graceUntil].join('|'):'none';}),before=await key();await p.click('#manualControls [data-input-move="'+id+'"]',{timeout:15000});await p.waitForFunction(b=>{const s=AcademyStage.state;return (s?[s.phase,s.reps,s.step,s.strikes,s.graceUntil].join('|'):'none')!==b;},before,{timeout:15000});await sleep(180);}
const settled=p=>p.waitForFunction(()=>document.querySelector('.academy-row')?.dataset.flash!=='miss',null,{timeout:20000});
async function openAcademy(p){await p.evaluate(()=>{ringfighterGame.close();document.querySelectorAll('dialog[open]').forEach(d=>d.close());});await p.click('.iq-entry');await p.waitForSelector('dialog.game-academy .academy-course',{timeout:20000});}
const landing=p=>p.evaluate(()=>{const d=document.querySelector('dialog.game-academy'),box=n=>n.getBoundingClientRect(),cards=[...d.querySelectorAll('.academy-course')],over=(a,b)=>a.right>b.left+1&&b.right>a.left+1&&a.bottom>b.top+1&&b.bottom>a.top+1,g=app.engine.career.store.game();
 return {dir:d.dir,view:d.dataset.view,title:d.querySelector('h2').textContent,steps:[...d.querySelectorAll('.academy-step-t')].map(n=>n.textContent),purpose:d.querySelector('.academy-purpose').textContent,count:d.querySelector('.academy-courses-head .academy-count').textContent,
  cards:cards.map(c=>({id:c.dataset.lesson,state:c.dataset.state,next:c.dataset.next,name:c.querySelector('h4').textContent,tags:[...c.querySelectorAll('.academy-tag')].map(t=>t.textContent),moves:[...c.querySelectorAll('.academy-move')].map(m=>m.textContent),reward:c.querySelector('.academy-reward').textContent,button:c.querySelector('.academy-go').textContent,buttonH:Math.round(box(c.querySelector('.academy-go')).height)})),
  expected:GameDomain.combos.map(c=>({id:c.id,name:ringfighterGame.comboName(c.id),moves:c.sequence.map(m=>ringfighterGame.moveName(m)),passed:GameDomain.lessonPassed(g,c.id)})),
  clip:cards.filter(c=>c.scrollWidth>c.clientWidth+1||[...c.querySelectorAll('h4,button,.academy-move,.academy-tag')].some(n=>n.scrollWidth>n.clientWidth+1)).map(c=>c.dataset.lesson),stepClip:[...d.querySelectorAll('.academy-step')].some(n=>n.scrollWidth>n.clientWidth+1),hScroll:d.scrollWidth>d.clientWidth+1,underClose:over(box(d.querySelector('.academy-guide')),box(d.querySelector('.game-close'))),
  groups:[...d.querySelectorAll('.academy-group')].map(x=>({open:x.open,title:x.querySelector('.academy-group-title').textContent,quizzes:x.querySelectorAll('.academy-lesson').length,notes:x.querySelectorAll('.iq-note').length,visible:[...x.querySelectorAll('.academy-lesson,.iq-note')].filter(n=>n.checkVisibility()).length})),words:d.querySelector('.iq-body').innerText.split(/\s+/).filter(Boolean).length};});
const sequenceOf=(p,id)=>p.evaluate(id=>GameDomain.combos.find(c=>c.id===id).sequence,id);
async function startLesson(p,id){await p.click('.academy-course[data-lesson="'+id+'"] .academy-go');await p.waitForFunction(id=>AcademyStage.state?.comboId===id&&!ringfighterGame.isModalOpen,id,{timeout:20000});}
async function runThroughs(p,sequence,from=0){for(let run=from;run<3;run++){for(const [i,move] of sequence.entries()){await tap(p,move);const s=await state(p);if(run===2&&i===sequence.length-1)break;assert.equal(s.strikes,0,'no mistake on a correct press '+move);assert.equal(s.reps,i===sequence.length-1?run+1:run);assert.equal(s.step,i===sequence.length-1?0:i+1);}}}

async function lessonOne(p,size,lang,full){
 const tag=size+' '+lang,t=await p.evaluate(()=>AcademyStage.copy[app.lang]),sequence=await sequenceOf(p,'first_rhythm'),before=await save(p);
 assert.deepEqual(before.lessons,[]);assert.equal(before.coins,0);
 await startLesson(p,'first_rhythm');
 // WATCH: real speed, boxes and real buttons light with each move, move buttons locked.
 let g=await hud(p);checkHud(g,tag+' watch',2);assert.equal(g.phase,'watch');assert.equal(g.dir,lang==='he'?'rtl':'ltr');assert.deepEqual(g.buttons,['replay','slow','turn','leave']);assert.equal(g.locked,'none','move buttons are locked while watching');
 for(const [i,b] of g.boxes.entries())assert.ok(g.real.includes(sequence[i]+'='+b.text),tag+' box says what the real button says: '+b.text);
 if(full){
  const watched=await p.evaluate(async()=>{const e=app.engine,samples=[],t0=performance.now();let sim0=null,sim1=null;while(!AcademyStage.state?.demo?.finished&&performance.now()-t0<30000){const cur=e.player.current?.input||null,boxes=[...document.querySelectorAll('.academy-box')].map(b=>b.dataset.state);if(cur&&sim0===null)sim0=e.animTime;if(cur)sim1=e.animTime;samples.push({cur,live:boxes.indexOf('live'),glow:document.querySelector('#manualControls .academy-next')?.dataset.inputMove||null,speed:e.speed,run:AcademyStage.state.demo.run});await new Promise(r=>setTimeout(r,25));}
   return {samples,sim:sim1-sim0,wall:performance.now()-t0,durations:window.BoxingInput.durations,state:AcademyStage.state};});
  const s=watched.samples.filter(x=>x.cur),agree=s.filter(x=>x.live===sequence.indexOf(x.cur)&&x.glow===x.cur).length;
  assert.equal(watched.state.demo.finished,true);assert.equal(watched.state.demo.runs,2);assert.ok(s.every(x=>x.speed===1),'demonstration plays at 1× speed');
  for(const move of sequence)assert.ok(s.some(x=>x.cur===move&&x.live===sequence.indexOf(move)&&x.glow===move),tag+' box and real button light for '+move);
  assert.ok(agree/s.length>.8,tag+' boxes follow the moves: '+agree+'/'+s.length);
  const once=sequence.reduce((n,m)=>n+watched.durations[m],0);assert.ok(watched.wall<9000,'short watch: '+Math.round(watched.wall)+' ms');
  out.push(`${tag} watch: 2 demonstrations in ${(watched.wall/1000).toFixed(1)} s at 1× (one run-through ${once.toFixed(2)} s of fight time), boxes in sync ${agree}/${s.length} samples`);
  if(size==='phone'||size==='desk'){await p.click('.academy-hud [data-act="slow"]');await p.waitForFunction(()=>app.engine.player.current,null,{timeout:10000});assert.equal(await p.evaluate(()=>app.engine.speed),.5,'slow motion is an option');await shot(p,size+'-'+lang+'-watch');await p.waitForFunction(()=>AcademyStage.state.demo.finished,null,{timeout:20000});assert.equal(await p.evaluate(()=>app.engine.speed),1);}
 }else{await p.waitForFunction(()=>app.engine.player.current,null,{timeout:10000});await shot(p,size+'-'+lang+'-watch');}
 // My turn works at any moment, also in the middle of the demonstration.
 await p.click('.academy-hud [data-act="turn"]');g=await hud(p);checkHud(g,tag+' repeat',2);assert.equal(g.phase,'repeat');assert.deepEqual(g.buttons,['replay','leave']);assert.equal(g.locked,'auto');assert.deepEqual(g.glow,[sequence[0]]);assert.deepEqual(g.boxes.map(b=>b.state),['next','idle']);assert.equal(g.pips,'000');
 assert.equal(await p.evaluate(()=>app.engine.player.queue.length+(app.engine.player.current?1:0)),0,'the demonstration stops when the player takes over');
 const names=Object.fromEntries(g.real.map(x=>x.split('=')));assert.equal(g.msg,t.tap.replace('{move}',names.jab));
 // Wrong move: named, row cleared, nothing earned.
 await tap(p,'jab');g=await hud(p);assert.deepEqual(g.boxes.map(b=>b.state),['done','next']);assert.deepEqual(g.glow,['cross']);
 await tap(p,'hook');g=await hud(p);assert.equal(g.msg,t.wrong.replace('{pressed}',names.hook).replace('{wanted}',names.cross),tag+' wrong-move message');assert.equal(g.tone,'miss');assert.equal(g.flash,'miss');assert.deepEqual(g.boxes.map(b=>b.state),['next','idle'],'the row is cleared');assert.equal(g.pips,'000');assert.deepEqual(g.glow,['jab']);
 await shot(p,size+'-'+lang+'-wrong');await settled(p);
 if(full){ // too slow: the run-through is cleared by the clock
  await tap(p,'jab');await p.waitForFunction(()=>AcademyStage.state.strikes===2,null,{timeout:8000});g=await hud(p);assert.equal(g.msg,t.late);assert.deepEqual(g.boxes.map(b=>b.state),['next','idle']);assert.equal(g.pips,'000');await settled(p);
  // a combo button never counts
  assert.equal(await p.evaluate(()=>app.engine.player.pressCombo('combo_one_two')),false);assert.equal((await hud(p)).msg,t.single);
 }
 // Three clean run-throughs: boxes fill in turn, pips count up, the earlier successes survive a mistake.
 for(const move of sequence)await tap(p,move);g=await hud(p);assert.equal(g.pips,'100');
 await tap(p,'cross');g=await hud(p);assert.equal(g.pips,'100','a mistake keeps earlier successes');assert.equal(g.flash,'miss');await settled(p);
 await tap(p,'jab');await shot(p,size+'-'+lang+'-repeat');g=await hud(p);checkHud(g,tag+' mid run',2);assert.deepEqual(g.boxes.map(b=>b.state),['done','next']);await tap(p,'cross');assert.equal((await hud(p)).pips,'110');
 assert.deepEqual((await save(p)).lessons,[],'nothing is paid before the third run-through');
 for(const move of sequence)await tap(p,move);
 // PASS: reward once, combo unlocked and equipped, clear next steps.
 await p.waitForSelector('dialog.game-academy .academy-result',{timeout:15000});const after=await save(p),copy=await p.evaluate(()=>FightIQUI.copy[app.lang]),name=await p.evaluate(()=>ringfighterGame.comboName('first_rhythm'));
 const panel=await p.evaluate(()=>{const d=document.querySelector('dialog.game-academy'),r=d.querySelector('.academy-result'),box=n=>n.getBoundingClientRect(),buttons=[...r.querySelectorAll('button')];return {view:d.dataset.view,text:r.innerText,coins:r.querySelector('.academy-coins')?.textContent,acts:buttons.map(b=>b.dataset.act),labels:buttons.map(b=>b.textContent),clip:buttons.some(b=>b.scrollWidth>b.clientWidth+1),minH:Math.min(...buttons.map(b=>box(b).height)),hScroll:d.scrollWidth>d.clientWidth+1,fits:box(d).top>=0&&box(d).bottom<=innerHeight+.5,allVisible:buttons.every(b=>{const x=box(b);return x.top>=0&&x.bottom<=innerHeight+.5;}),
  clean:!document.querySelector('.academy-hud')&&!document.body.classList.contains('academy-lesson')&&!document.body.classList.contains('academy-watching')&&!document.querySelector('.academy-next')&&!Object.prototype.hasOwnProperty.call(app.engine.player,'press')&&!Object.prototype.hasOwnProperty.call(app.engine.player,'pressCombo'),state:AcademyStage.state};});
 assert.equal(after.coins,15);assert.equal(after.xp,before.xp,'no XP');assert.equal(after.points,before.points,'no combat stats');assert.equal(after.sessions,before.sessions);assert.deepEqual(after.lessons,['lesson:first_rhythm']);assert.deepEqual(after.combos,{owned:['first_rhythm'],training:['first_rhythm'],fight:['first_rhythm']});
 assert.equal(panel.view,'result');assert.equal(panel.coins,'+15 ◈');assert.ok(panel.text.includes(copy.passTitle)&&panel.text.includes(copy.unlocked.replace('{name}',name))&&panel.text.includes(copy.ready),tag+' result text '+panel.text);assert.deepEqual(panel.acts,['fight','next','academy']);assert.equal(panel.labels[0],copy.tryFight);
 assert.ok(!panel.clip&&!panel.hScroll&&panel.fits&&panel.allVisible&&panel.minH>=34,tag+' result panel fits '+JSON.stringify(panel));assert.ok(panel.clean,'lesson left nothing behind');assert.equal(panel.state,null);
 await shot(p,size+'-'+lang+'-pass');
 // TRY IT IN A FIGHT: quick fight, Play mode, Combos page, the unlocked combo is there and works.
 await p.click('.academy-result [data-act="fight"]');await p.waitForFunction(()=>app.engine.targetMode==='fight'&&!ringfighterGame.isModalOpen,null,{timeout:20000});
 const fight=await p.evaluate(()=>{const b=document.querySelector('#manualControls [data-input-move="combo_one_two"]');return {enabled:app.engine.player.enabled,page:document.querySelector('.manual-pages [aria-pressed="true"]').dataset.inputPage,button:!!b,locked:b?.dataset.locked,state:AcademyStage.state};});
 assert.deepEqual(fight,{enabled:true,page:'combos',button:true,locked:'false',state:{comboId:'first_rhythm',phase:'fight',used:false}});
 await p.waitForFunction(()=>{const h=document.querySelector('.academy-hint');return h&&!h.hidden&&document.querySelector('#manualControls [data-input-move="combo_one_two"]')?.classList.contains('academy-next');},null,{timeout:40000});
 const cue=await p.evaluate(()=>{const h=document.querySelector('.academy-hint'),box=n=>n.getBoundingClientRect(),r=box(h),stage=box(document.getElementById('stageContainer')),over=(a,b)=>a.right>b.left+.5&&b.right>a.left+.5&&a.bottom>b.top+.5&&b.bottom>a.top+.5,b=document.querySelector('#manualControls [data-input-move="combo_one_two"]');
  return {text:h.textContent,label:b.textContent,inside:r.left>=stage.left&&r.right<=stage.right&&r.top>=stage.top&&r.bottom<=stage.bottom,covers:[...document.querySelectorAll('#manualControls .manual-move,.manual-pages button')].filter(n=>box(n).width&&over(r,box(n))).map(n=>n.textContent),phase:app.engine.arena.fightView.match.phase};});
 assert.equal(cue.text,t.use.replace('{label}',cue.label));assert.ok(cue.inside,'fight cue inside the stage');assert.deepEqual(cue.covers,[],'fight cue covers no button');assert.equal(cue.phase,'round');
 await shot(p,size+'-'+lang+'-fight');
  // Record what the cue says and which combo the fight throws, independent of how slowly this machine polls.
 await p.evaluate(()=>{const h=document.querySelector('.academy-hint'),m=app.engine.arena.fightView.match;window.__cue={texts:[],combos:[]};new MutationObserver(()=>{window.__cue.texts.push(h.textContent);window.__cue.combos.push(m.playerCombo?.id||m.pendingPlayerCombo?.id||null);}).observe(h,{childList:true,characterData:true,subtree:true});});
 for(let i=0;i<12;i++){if(await p.evaluate(()=>window.__cue.texts.length>0||!AcademyStage.state))break;await p.click('#manualControls [data-input-move="combo_one_two"]',{timeout:4000}).catch(()=>{});await sleep(400);} // a tap can be refused while the fighter is busy, like any fight input
 const used=await p.evaluate(()=>window.__cue);assert.ok(used.texts.includes(t.used.replace('{name}',name)),tag+' fight cue confirms the combo: '+JSON.stringify(used));assert.ok(used.combos.includes('combo_one_two'),'the fight is really throwing the unlocked combo');
 await p.waitForFunction(()=>!AcademyStage.state&&!document.querySelector('.academy-hint')&&!document.querySelector('.academy-next')&&!Object.prototype.hasOwnProperty.call(app.engine.player,'pressCombo'),null,{timeout:15000});
 out.push(`${tag} lesson 1: wrong move named, ${full?'too-slow and combo-button rejected, ':''}3 run-throughs → +15 coins, combo unlocked and equipped, used in a fight (HUD ${g.height}px ${g.wide==='true'?'wide':'stacked'})`);
}
// The longest combo (six boxes) must still fit in one row, in every language and size; leaving restores normal training.
async function longLesson(p,size,lang){
 const tag=size+' '+lang+' six-move';await openAcademy(p);const prior=await p.evaluate(()=>{window.manualControls.setPage('combos');app.engine.speed=.75;return 1;});
 await startLesson(p,'school_signature');let g=await hud(p);checkHud(g,tag+' watch',6);assert.equal((await state(p)).demo.runs,1,'long combos are shown once');
 await p.click('.academy-hud [data-act="turn"]');g=await hud(p);checkHud(g,tag+' repeat',6);const sequence=await sequenceOf(p,'school_signature');for(const [i,b] of g.boxes.entries())assert.ok(g.real.includes(sequence[i]+'='+b.text));
 await tap(p,'jab');await tap(p,'cross');g=await hud(p);checkHud(g,tag+' mid',6);assert.deepEqual(g.boxes.map(b=>b.state),['done','done','next','idle','idle','idle']);assert.deepEqual(g.glow,['hook']);
 await shot(p,size+'-'+lang+'-six');
 await p.click('.academy-hud [data-act="leave"]');
 const left=await p.evaluate(()=>({hud:!!document.querySelector('.academy-hud'),cls:[...document.body.classList].filter(c=>c.startsWith('academy')),glow:document.querySelectorAll('.academy-next').length,own:['press','pressCombo'].filter(k=>Object.prototype.hasOwnProperty.call(app.engine.player,k)),state:AcademyStage.state,tabs:getComputedStyle(document.querySelector('.manual-pages')).visibility,page:document.querySelector('.manual-pages [aria-pressed="true"]').dataset.inputPage,speed:app.engine.speed,mode:app.engine.targetMode,enabled:app.engine.player.enabled,session:!!app.engine.career.active,queue:app.engine.player.queue.length,jab:app.engine.player.press('jab')}));
 assert.deepEqual(left,{hud:false,cls:[],glow:0,own:[],state:null,tabs:'visible',page:'combos',speed:.75,mode:'heavy',enabled:true,session:false,queue:0,jab:true},tag+' leaving restores normal training');await p.evaluate(()=>{app.engine.speed=1;});
 assert.deepEqual((await save(p)).lessons.includes('lesson:school_signature'),false);out.push(`${tag}: six boxes in one row (HUD ${g.height}px), leave restores training`);
}
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
for(const size of ONLY){const p=await b.newPage({viewport:SIZES[size]}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&window.AcademyStage&&app.engine.coach?.anatomy,null,{timeout:180000});await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await sleep(500);await fast(p,true);
 for(const [index,lang] of LANGS.entries()){
  await p.evaluate(([name,lang])=>{app.engine.career.store.create(name);app.setLanguage(lang);},['QA '+size+' '+lang,lang]);await sleep(500);
  await openAcademy(p);let l=await landing(p);const copy=await p.evaluate(()=>FightIQUI.copy[app.lang]);
  assert.equal(l.dir,lang==='he'?'rtl':'ltr');assert.equal(l.title,copy.title);assert.deepEqual(l.steps,copy.steps);assert.equal(l.steps.length,3);assert.equal(l.purpose,copy.purpose);assert.equal(l.count,'0 / 6');
  assert.deepEqual(l.cards.map(c=>c.id),['first_rhythm','corner_turn','counter_chain','thunder_arc','rolling_return','school_signature']);
  for(const [i,c] of l.cards.entries()){assert.equal(c.name,l.expected[i].name);assert.deepEqual(c.moves,l.expected[i].moves);assert.equal(c.state,'new');assert.equal(c.next,String(i===0));assert.deepEqual(c.tags,i?[copy.stateNew]:[copy.stateNext,copy.stateNew]);assert.ok(c.reward.includes(copy.rewardCombo)&&c.reward.includes('+15 ◈'));assert.equal(c.button,copy.begin);assert.ok(c.buttonH>=40);}
  assert.deepEqual(l.clip,[],size+' '+lang+' lesson cards not clipped');assert.ok(!l.stepClip&&!l.hScroll&&!l.underClose,size+' '+lang+' landing layout '+JSON.stringify({stepClip:l.stepClip,hScroll:l.hScroll,underClose:l.underClose}));
  assert.deepEqual(l.groups.map(x=>[x.open,x.quizzes,x.notes,x.visible]),[[false,6,0,0],[false,0,12,0]],'quizzes and coach notes are closed, optional groups');assert.ok(l.words<170,size+' '+lang+' landing stays short: '+l.words+' words');
  await shot(p,size+'-'+lang+'-landing');
  out.push(`${size} ${lang} landing: 6 lessons, ${l.words} visible words, quizzes+notes closed`);
  await lessonOne(p,size,lang,index===0);
  await longLesson(p,size,lang);
  // Landing now shows the lesson as passed and points at the next one.
  await openAcademy(p);l=await landing(p);assert.equal(l.count,'1 / 6');assert.equal(l.cards[0].state,'passed');assert.equal(l.cards[0].button,copy.again);assert.ok(l.cards[0].tags[0].includes(copy.statePassed));assert.equal(l.cards[0].reward,copy.rewardDone);assert.equal(l.cards[1].next,'true');assert.deepEqual(l.clip,[]);
  await shot(p,size+'-'+lang+'-landing-passed');
 }
 if(size==='phone'){ // every remaining lesson passes with the real buttons; a second pass pays nothing
  await p.evaluate(()=>{const s=app.engine.career.store;s.select(s.data.profiles.find(x=>x.name==='QA phone en').id);app.setLanguage('en');});await sleep(400);await openAcademy(p);
  for(const id of ['corner_turn','counter_chain','thunder_arc','rolling_return','school_signature']){const sequence=await sequenceOf(p,id);if(id==='corner_turn')await startLesson(p,id);else{await p.click('.academy-result [data-act="next"]');await p.waitForFunction(id=>AcademyStage.state?.comboId===id,id,{timeout:20000});}
   await p.click('.academy-hud [data-act="turn"]');checkHud(await hud(p),'phone en '+id,sequence.length);await runThroughs(p,sequence);await p.waitForSelector('dialog.game-academy .academy-result',{timeout:15000});const s=await save(p);assert.ok(s.lessons.includes('lesson:'+id)&&s.combos.owned.includes(id),id+' unlocked');out.push(`phone en ${id}: ${sequence.join(' → ')} ×3 with the real buttons → unlocked, wallet ${s.coins}`);}
  let s=await save(p);assert.equal(s.coins,90);assert.equal(s.lessons.length,6);assert.equal(s.combos.owned.length,6);assert.deepEqual(s.combos.fight,['first_rhythm','corner_turn','counter_chain']);assert.equal(s.combos.training.length,5);
  const last=await p.evaluate(()=>({acts:[...document.querySelectorAll('.academy-result button')].map(b=>b.dataset.act),text:document.querySelector('.academy-result').innerText,copy:FightIQUI.copy.en}));assert.deepEqual(last.acts,['loadout','fight','academy'],'full loadout: choose combos first, no next lesson');assert.ok(last.text.includes(last.copy.notReady)&&last.text.includes(last.copy.allDone));
  await p.click('.academy-result [data-act="academy"]');let l=await landing(p);assert.equal(l.count,'6 / 6');assert.ok(l.cards.every(c=>c.state==='passed'&&c.next==='false'));
  await startLesson(p,'first_rhythm');await p.click('.academy-hud [data-act="turn"]');await runThroughs(p,['jab','cross']);await p.waitForSelector('dialog.game-academy .academy-result',{timeout:15000});s=await save(p);assert.equal(s.coins,90,'practising again pays nothing');assert.equal(s.lessons.length,6);
  const again=await p.evaluate(()=>({text:document.querySelector('.academy-result').innerText,coins:!!document.querySelector('.academy-result .academy-coins'),copy:FightIQUI.copy.en}));assert.ok(again.text.includes(again.copy.practiced)&&!again.coins);out.push('phone en: all six lessons passed (90 coins once); practice again pays 0');
  // random tapping on the real buttons never passes and is sent back to Watch
  await p.click('.academy-result [data-act="academy"]');await p.evaluate(()=>{app.engine.career.store.create('QA random');});await sleep(400);await openAcademy(p);await startLesson(p,'first_rhythm');await p.click('.academy-hud [data-act="turn"]');
  const moves=await p.evaluate(()=>[...document.querySelectorAll('#manualControls .manual-move')].map(b=>b.dataset.inputMove));let seed=77,taps=0,watchAgain=0;const rnd=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  for(let i=0;i<60;i++){const st=await state(p);if(!st)break;if(st.phase==='watch'){watchAgain++;await p.click('.academy-hud [data-act="turn"]');continue;}await p.click('#manualControls [data-input-move="'+moves[Math.floor(rnd()*moves.length)]+'"]',{timeout:3000}).catch(()=>{});taps++;await sleep(120);}
  s=await save(p);assert.deepEqual(s.lessons,[],'random tapping earned nothing');assert.equal(s.coins,0);assert.ok(watchAgain>=1,'misses in a row return to Watch');out.push(`phone en random tapping: ${taps} taps, sent back to Watch ${watchAgain}×, nothing earned`);await p.evaluate(()=>AcademyStage.stop());
 }
 // Reload keeps lessons, coins and combos.
 const kept=await save(p),who=await p.evaluate(()=>app.engine.career.store.current().name);await p.reload();await p.waitForFunction(()=>window.ringfighterGame&&window.AcademyStage&&app.engine.coach?.anatomy,null,{timeout:180000});await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await sleep(500);await fast(p,true);
 if(size==='phone')await p.evaluate(()=>{const s=app.engine.career.store;s.select(s.data.profiles.find(x=>x.name==='QA phone en').id);});
 const again=await save(p);if(size!=='phone'){assert.equal(await p.evaluate(()=>app.engine.career.store.current().name),who);assert.deepEqual(again,kept,size+' reload keeps the save');}
 assert.ok(again.lessons.includes('lesson:first_rhythm')&&again.combos.owned.includes('first_rhythm')&&again.coins>=15);await openAcademy(p);const l=await landing(p);assert.equal(l.cards[0].state,'passed');assert.equal(l.count,size==='phone'?'6 / 6':'1 / 6');
 out.push(`${size} reload: lesson, coins (${again.coins}) and combos kept`);
 assert.deepEqual(errors,[],size+' page errors');await p.close();}
console.log(out.join('\n'));console.log('GOTR-0007 ACADEMY LESSON ASSERTIONS PASSED');await b.close();})().catch(e=>{console.log(out.join('\n'));console.error('FAIL',e.stack||e.message);process.exit(1);});
