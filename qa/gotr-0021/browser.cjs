// GOTR-0021 browser QA: broadcast fight HUD (names, VS badge, centre-draining health bars, round chip).
// Usage: python3 -m http.server 8146 --bind 127.0.0.1 &  then  node qa/gotr-0021/browser.cjs
// Env: PORT (8146), QA_VIEWPORTS ('[[393,852]]'), QA_LANGS ('["en"]'), QA_TAG ('after').
// Real fight: ringfighterGame.quick() + Watch mode until real hits land. The low-health, count and long-name
// states are reached by writing the match state (marked "injected") so every HUD state is checked every run.
// Software WebGL: this proves layout and data binding, not phone frame rate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const port=process.env.PORT||8146,tag=process.env.QA_TAG||'after',out=__dirname;
const viewports=process.env.QA_VIEWPORTS?JSON.parse(process.env.QA_VIEWPORTS):[[393,852],[360,640],[852,393],[1366,768]];
const langs=process.env.QA_LANGS?JSON.parse(process.env.QA_LANGS):['en','he','ru'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Runs in the page: everything the assertions need, measured from the live DOM.
function measure(){
 const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};},shown=n=>!!n&&!n.hidden&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0;
 const view=app.engine.arena.fightView,m=view.match,s=m.snapshot(),health=document.getElementById('fightHealth'),hud=document.getElementById('fightHud'),stage=document.getElementById('stageContainer');
 const corners=[...health.querySelectorAll('.fight-health-player')].map(p=>{const label=p.querySelector('.fight-health-label'),value=p.querySelector('.fight-health-value'),track=p.querySelector('.fight-health-track'),fill=p.querySelector('.fight-health-fill'),trail=p.querySelector('.fight-health-trail');
  return {corner:p.dataset.corner,low:p.dataset.low,out:p.dataset.out,hit:p.dataset.hit||'',rect:rect(p),name:label.textContent,label:rect(label),labelScroll:[label.scrollWidth,label.clientWidth,label.scrollHeight,label.clientHeight],labelOverflow:getComputedStyle(label).textOverflow,number:value.textContent,value:rect(value),valueColor:getComputedStyle(value).color,
   track:rect(track),trackWidth:track.offsetWidth,fillWidth:fill.offsetWidth,fillStyle:fill.getAttribute('style'),fillLeft:fill.offsetLeft,trailWidth:trail.offsetWidth,fillBg:getComputedStyle(fill).backgroundImage+' '+getComputedStyle(fill).backgroundColor,
   aria:{label:track.getAttribute('aria-label'),now:track.getAttribute('aria-valuenow'),text:track.getAttribute('aria-valuetext'),role:track.getAttribute('role')},flash:getComputedStyle(track).animationName,pulse:getComputedStyle(fill).animationName};});
 const vs=health.querySelector('.fight-health-vs'),clock=hud.querySelector('.fight-hud-clock');
 const others={};const add=(key,nodes)=>{others[key]=[...nodes].filter(shown).map(rect);};
 add('tabs',document.querySelectorAll('.manual-pages'));add('tabButtons',document.querySelectorAll('.manual-pages button'));add('moves',document.querySelectorAll('[data-input-move]'));add('rails',document.querySelectorAll('.manual-rail'));add('banner',document.querySelectorAll('.bout-announcement'));add('knockout',document.querySelectorAll('#fightKnockout'));add('manualStatus',document.querySelectorAll('.manual-status'));add('playback',document.querySelectorAll('.ringside-playback'));add('results',document.querySelectorAll('#fightResults'));
 return {dir:document.documentElement.dir,lang:app.lang,phase:s.phase,reported:s.health,landed:{lion:s.totals.lion.landed,rabbit:s.totals.rabbit.landed},labels:window.GameIdentity?.labels(view),player:m.playerActor,viewport:{w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth},
  stage:rect(stage),health:rect(health),healthShown:shown(health),healthAria:health.getAttribute('aria-label'),hud:shown(hud)?rect(hud):null,hudText:hud.textContent,hudPhase:hud.dataset.phase,hudUrgent:hud.classList.contains('fight-clock-urgent'),
  clock:clock?{text:clock.textContent,dir:getComputedStyle(clock).direction,rect:rect(clock)}:null,scores:[...hud.querySelectorAll('.fight-hud-score')].map(n=>({corner:n.dataset.corner,num:n.querySelector('.fight-hud-num').textContent,rect:rect(n)})),
  vs:vs?{text:vs.textContent,rect:rect(vs)}:null,corners,others};
}
const hit=(a,b,pad=0)=>a&&b&&a.x<b.right-pad&&b.x<a.right-pad&&a.y<b.bottom-pad&&b.y<a.bottom-pad;
function check(d,name,opt={}){
 const where=`${name} ${d.viewport.w}x${d.viewport.h} ${d.lang}`,red=d.corners.find(c=>c.corner==='red'),blue=d.corners.find(c=>c.corner==='blue'),rtl=d.dir==='rtl';
 assert.ok(d.healthShown,where+': health HUD visible');assert.equal(d.corners.length,2,where);assert.ok(d.viewport.scrollW<=d.viewport.w,where+': no horizontal page scroll');
 // Bars reflect exactly what the fight reports.
 for(const [c,actor] of [[red,'lion'],[blue,'rabbit']]){const v=Math.max(0,Math.min(100,d.reported[actor]));
  assert.equal(c.fillStyle,'width:'+v+'%',where+': '+actor+' fill is bound to the reported health');assert.equal(c.number,String(Math.ceil(v)),where+': '+actor+' number');
  assert.equal(c.aria.role,'progressbar');assert.equal(c.aria.label,d.labels[actor]+' · '+Math.ceil(v),where+': accessible name carries the number');assert.equal(c.aria.now,String(Math.round(v)));assert.equal(c.aria.text,String(Math.ceil(v)));
  if(opt.settled)assert.ok(Math.abs(c.fillWidth/c.trackWidth-v/100)<=.012,where+': '+actor+' rendered bar '+(c.fillWidth/c.trackWidth).toFixed(3)+' vs reported '+(v/100).toFixed(3));
  assert.equal(c.low,String(v<=25),where+': low-health flag');assert.equal(c.name,d.labels[actor]);
  // Drains toward the centre: the remaining fill stays attached to the inner (VS) end of its track.
  const innerIsRight=(actor==='lion')!==rtl;if(opt.settled&&v<99)assert.ok(innerIsRight?Math.abs(c.fillLeft+c.fillWidth-c.trackWidth)<=1:Math.abs(c.fillLeft)<=1,where+': '+actor+' fill hugs the centre');
  // Names: on their own side, never clipped (unless this is the long-name case, which must ellipsize).
  assert.ok(c.label.x>=c.rect.x-.5&&c.label.right<=c.rect.right+.5,where+': '+actor+' name stays in its column');assert.ok(c.labelScroll[2]<=c.labelScroll[3],where+': '+actor+' name is not cut vertically');
  if(opt.longNames){assert.equal(c.labelOverflow,'ellipsis',where+': an over-long name ends in an ellipsis');c.truncated=c.labelScroll[0]>c.labelScroll[1];}else assert.ok(c.labelScroll[0]<=c.labelScroll[1],where+': '+actor+' name "'+c.name+'" must not be clipped ('+c.labelScroll+')');
  assert.ok(c.value.w>0&&c.value.x>=c.rect.x-.5&&c.value.right<=c.rect.right+.5&&!hit(c.value,c.label,.5),where+': '+actor+' number visible beside the name');assert.ok(c.label.bottom<=c.track.y+2.5,where+': name sits above its bar');
 }
 // Sides: player (red) on the leading side, mirrored for RTL; VS centred between them.
 assert.ok(rtl?red.rect.x>blue.rect.right:red.rect.right<blue.rect.x,where+': corners on the correct sides');
 assert.ok(d.vs&&d.vs.text==='VS',where+': VS present');const mid=d.health.x+d.health.w/2,vsMid=d.vs.rect.x+d.vs.rect.w/2;assert.ok(Math.abs(mid-vsMid)<=1,where+': VS centred ('+(mid-vsMid).toFixed(2)+')');
 assert.ok(d.vs.rect.x>=Math.min(red.rect.right,blue.rect.right)-.5&&d.vs.rect.right<=Math.max(red.rect.x,blue.rect.x)+.5,where+': VS between the corners');assert.ok(!hit(d.vs.rect,red.label)&&!hit(d.vs.rect,blue.label)&&!hit(d.vs.rect,red.track,1)&&!hit(d.vs.rect,blue.track,1),where+': VS clear of names and bars');
 assert.ok(Math.abs((red.rect.w)-(blue.rect.w))<=1,where+': both sides equal width');
 // HUD stays inside the stage and clear of every other overlay.
 const parts=[['health',d.health]];if(d.hud)parts.push(['chip',d.hud]);
 for(const [key,r] of parts){assert.ok(r.x>=d.stage.x-.5&&r.right<=d.stage.right+.5&&r.y>=d.stage.y-.5&&r.bottom<=d.stage.bottom+.5,where+': '+key+' inside the stage');
  for(const other of ['tabs','tabButtons','moves','rails','banner','knockout','manualStatus','playback','results'])for(const o of d.others[other]){if(other==='banner'&&opt.allowBanner)continue;assert.ok(!hit(r,o,.5),where+': '+key+' overlaps '+other+' '+JSON.stringify([r,o].map(q=>[q.x,q.y,q.right,q.bottom].map(Math.round))));}}
 if(d.hud){assert.ok(d.hud.y>=red.track.bottom-1,where+': chip below the bars');assert.ok(Math.abs(d.hud.x+d.hud.w/2-mid)<=1,where+': chip centred');}
 if(d.clock&&d.phase!=='count'){assert.match(d.clock.text,/^\d+:\d\d$/,where+': clock format');assert.equal(d.clock.dir,'ltr',where+': clock reads left-to-right');}
 if(d.phase==='round'){assert.equal(d.scores.length,2);const sr=d.scores.find(x=>x.corner==='red'),sb=d.scores.find(x=>x.corner==='blue');assert.equal(sr.num,String(d.landed.lion));assert.equal(sb.num,String(d.landed.rabbit));assert.ok(rtl?sr.rect.x>sb.rect.x:sr.rect.x<sb.rect.x,where+': landed counts on their own sides');assert.ok(d.hudText.includes(d.labels.lion)&&d.hudText.includes(d.labels.rabbit),where+': status text still names both fighters');}
 return {state:name,phase:d.phase,truncated:opt.longNames?[red.truncated,blue.truncated]:undefined,reported:d.reported,shown:[red.number,blue.number],bars:[red,blue].map(c=>+(c.fillWidth/c.trackWidth*100).toFixed(1)),hud:d.hudText,health:[d.health.y-d.stage.y,d.health.bottom-d.stage.y].map(Math.round),chipBottom:d.hud?Math.round(d.hud.bottom-d.stage.y):null,tabsTop:d.others.tabs[0]?Math.round(d.others.tabs[0].y-d.stage.y):null,movesChecked:d.others.moves.length,bannerShown:d.others.banner.length};
}

(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[],errors=[];
 try{for(const [width,height] of viewports){
  const p=await b.newPage({viewport:{width,height},hasTouch:width<900});p.setDefaultTimeout(180000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html`);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  await p.evaluate(()=>{app.engine.renderer.setPixelRatio(.5);app.engine.renderer.shadowMap.enabled=false;});
  const shot=async name=>{const file=path.join(out,`${tag}-${width}x${height}-${name}.png`);await p.screenshot({path:file});return file;};
  const render=()=>p.evaluate(()=>fightUI.render(app.engine.arena.fightView));
  // Transitions follow the page's frame clock, which stalls under software WebGL: wait for them instead of sleeping a fixed time.
  const settle=async()=>{await sleep(300);await p.waitForFunction(()=>!document.getAnimations().some(a=>a.transitionProperty&&a.effect?.target?.closest?.('#fightHealth')&&a.playState!=='finished'),null,{timeout:60000});};
  const pages=async(name,opt)=>{const rows=[];for(const page of ['moves','combos','defence']){const ok=await p.evaluate(page=>{const n=document.querySelector(`[data-input-page="${page}"]`);if(!n||n.closest('[hidden]'))return false;n.click();return true;},page);if(!ok)continue;await sleep(250);rows.push(check(await p.evaluate(measure),name+'/'+page,opt));}return rows;};
  for(const lang of langs){const row={viewport:width+'x'+height,lang,states:[]};results.push(row);
   await p.evaluate(lang=>{app.setLanguage(lang);document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());},lang);
   await p.waitForFunction(()=>app.engine.arena?.fightView?.match&&!document.getElementById('fightHealth').hidden);await sleep(1500);
   // 1. Full health, Play mode: every input page, tabs and intro banner present.
   let d=await p.evaluate(measure);assert.deepEqual(d.reported,{lion:100,rabbit:100});assert.equal(d.player,'lion');row.labels=d.labels;row.dir=d.dir;
   // The intro banner is another agent's element; it is reported, and asserted only where it has room (see report).
   const bannerClash=d.others.banner.some(o=>hit(d.health,o,.5)||(d.hud&&hit(d.hud,o,.5)));row.introBannerOverlapsHud=bannerClash;
   row.states.push(...await pages('full-play',{settled:true}));if(lang==='en'||width<400)await shot(lang+'-1-full');
   // 2. Mid fight: Watch mode, real exchanges until both the HUD and the match report damage.
   if(lang==='en'){
    // An in-page observer records, for every real health change, the transitions the browser actually started (frame-rate independent).
    await p.evaluate(()=>{const log=window.__hudLog=[];new MutationObserver(list=>{for(const rec of list){const fill=rec.target;if(!fill.classList?.contains('fight-health-fill'))continue;const player=fill.closest('.fight-health-player'),trail=player.querySelector('.fight-health-trail');getComputedStyle(trail).width;const timing=n=>n.getAnimations().map(a=>{const t=a.effect.getComputedTiming();return [a.transitionProperty||a.animationName,t.delay,t.duration];});log.push({corner:player.dataset.corner,hit:player.dataset.hit||'',style:fill.getAttribute('style'),fill:timing(fill),trail:timing(trail),flash:timing(player.querySelector('.fight-health-track'))});}}).observe(document.getElementById('fightHealth'),{subtree:true,attributes:true,attributeFilter:['style']});document.getElementById('watchMode').click();});
    // The software renderer runs the bout ~10x slower than real time and clean hits are rare, so the Watch-mode bout is advanced
    // with the engine's own fixed step (fightView.step, 1/60 s) until a real contact lowers the reported health.
    const t0=Date.now(),last=await p.evaluate(async()=>{app.engine.isPlaying=false;let ticks=0,bouts=1;
     for(;;){const view=app.engine.arena.fightView,m=view.match;
      while(!m.result&&ticks<40000){view.step();ticks++;const s=m.snapshot();if(s.health.lion<100||s.health.rabbit<100){fightUI.render(view);await new Promise(r=>setTimeout(r,0));return {phase:s.phase,health:s.health,ticks,bouts,landed:{lion:s.totals.lion.landed,rabbit:s.totals.rabbit.landed},log:window.__hudLog.filter(x=>x.hit)};}if(ticks%20===0)fightUI.render(view);}
      if(bouts>=8||ticks>=40000)return {phase:m.phase,health:m.snapshot().health,ticks,bouts,log:[]};
      bouts++;window.trainingControls.chooseTarget('none');ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(r=>setTimeout(r,600));document.getElementById('watchMode').click();app.engine.isPlaying=false;window.__hudLog.length=0;}});
    const first=last.log[0];row.realFight={waitedMs:Date.now()-t0,ticks:last.ticks,bouts:last.bouts,phase:last.phase,health:last.health,landed:last.landed,hitsLogged:last.log.length,first};assert.ok(last.health.lion<100||last.health.rabbit<100,'real hits must land in Watch mode: '+JSON.stringify(last));assert.ok(first&&first.hit,'a real hit must trigger the flash state');
    assert.ok(first.fill.some(t=>t[0]==='width'&&t[2]===140),'bar moves quickly: '+JSON.stringify(first));assert.ok(first.trail.some(t=>t[0]==='width'&&t[1]===380&&t[2]===620),'damage trail waits, then catches up: '+JSON.stringify(first));assert.ok(first.flash.some(t=>/^fight-health-hit-/.test(t[0])&&t[2]===340),'hit flash runs once: '+JSON.stringify(first));
    await p.evaluate(()=>{app.engine.isPlaying=false;});await render();await settle();d=await p.evaluate(measure);row.states.push(check(d,'mid-watch-real',{settled:true}));await shot(lang+'-2-mid');
   }else await p.evaluate(()=>{document.getElementById('watchMode').click();app.engine.isPlaying=false;});
   // 3. Low health (injected values, real HUD path).
   // Hebrew and Russian runs also use ordinary names in their own script (the game's default names are Latin).
   if(lang!=='en')await p.evaluate(()=>{const g=window.GameIdentity,old=g.labels;window.__baseLabels=old;g.labels=v=>({...old.call(g,v),...(app.lang==='he'?{lion:'אריאל כהן',rabbit:'הצל'}:{lion:'Александр',rabbit:'Тень'})});});
   await p.evaluate(()=>{const m=app.engine.arena.fightView.match;m.phase='round';m.fighters.lion.condition=57.4;m.fighters.rabbit.condition=18.2;app.engine.isPlaying=false;});await render();await settle();d=await p.evaluate(measure);
   row.states.push(check(d,'low-injected',{settled:true}));const blue=d.corners.find(c=>c.corner==='blue'),red=d.corners.find(c=>c.corner==='red');assert.equal(blue.pulse,'fight-health-low');assert.notEqual(blue.valueColor,red.valueColor,'low-health number changes colour');row.low={pulse:blue.pulse,valueColor:blue.valueColor};await shot(lang+'-3-low');
   if(lang==='en'){await p.evaluate(()=>{const v=app.engine.arena.fightView,m=v.match;m.fighters.lion.condition=38.6;fightUI.render(v);const pl=document.querySelector('#fightHealth [data-corner=red]');getComputedStyle(pl.querySelector('.fight-health-trail')).width;for(const a of pl.querySelector('.fight-health-trail').getAnimations().concat(pl.querySelector('.fight-health-fill').getAnimations())){a.pause();a.currentTime=300;}for(const a of pl.querySelector('.fight-health-track').getAnimations()){a.pause();a.currentTime=60;}});await sleep(300);
    const frozen=await p.evaluate(()=>{const pl=document.querySelector('#fightHealth [data-corner=red]'),w=n=>pl.querySelector(n).offsetWidth;return {track:w('.fight-health-track'),fill:w('.fight-health-fill'),trail:w('.fight-health-trail')};});row.hitFrame=frozen;assert.ok(Math.abs(frozen.fill/frozen.track-.386)<.012&&Math.abs(frozen.trail/frozen.track-.574)<.012,'300 ms after a hit the bar is at the new value and the trail still at the old one: '+JSON.stringify(frozen));await shot(lang+'-3a-hit');
    await p.evaluate(()=>{for(const n of document.querySelectorAll('#fightHealth [data-corner=red] *'))for(const a of n.getAnimations())a.finish();});}
   // 3c. Final seconds: the urgent clock style and the countdown box must not touch the HUD.
   await p.evaluate(()=>{const m=app.engine.arena.fightView.match;m.roundTime=m.roundSeconds-4.2;});await render();await settle();d=await p.evaluate(measure);assert.ok(d.hudUrgent,'clock turns urgent in the final seconds');assert.equal(d.others.banner.length,1,'countdown box is shown');assert.equal(d.clock.text,'0:05');
   row.states.push(check(d,'final-seconds',{settled:true}));if(lang==='en')await shot(lang+'-3c-final-seconds');
   // 3b. Long names must ellipsize, stay on their side and keep VS and numbers visible.
   await p.evaluate(()=>{const g=window.GameIdentity,old=g.labels;window.__oldLabels=old;g.labels=v=>({...old.call(g,v),lion:app.lang==='he'?'אלכסנדר הגדול ממוקדון השלישי':app.lang==='ru'?'Александр Константинопольский':'Maximilian Featherstonehaugh III',rabbit:app.lang==='he'?'הצל הארוך מאוד של הזירה':app.lang==='ru'?'Тень Преображенского-Задунайского':'Bartholomew Wolfeschlegelstein'});});await render();await settle();
   d=await p.evaluate(measure);row.states.push(check(d,'long-names-injected',{settled:true,longNames:true}));if(lang!=='ru'||width<400)await shot(lang+'-3b-long');await p.evaluate(()=>{window.GameIdentity.labels=window.__oldLabels;});
   // 4. Knockdown count (injected phase): chip shows the count, Play-mode controls are checked again.
   await p.evaluate(()=>{const m=app.engine.arena.fightView.match;m.phase='count';m.downActor='rabbit';m.phaseTime=m.knockdownSeconds*.55;document.getElementById('playMode').click();app.engine.isPlaying=false;});await render();await settle();
   d=await p.evaluate(measure);assert.equal(d.phase,'count');assert.ok(d.hud&&d.clock&&/^\d$/.test(d.clock.text),'count chip shows the referee count');row.states.push(...await pages('count-injected',{settled:true}));if(lang==='en')await shot(lang+'-4-count');
   // 5. Result: the real match is finished by knockout and the ceremony runs.
   await p.evaluate(()=>{const m=app.engine.arena.fightView.match;document.getElementById('watchMode').click();m.phase='round';m.fighters.rabbit.condition=0;app.engine.isPlaying=true;});
   await p.waitForFunction(()=>!!app.engine.arena.fightView.match.result,null,{timeout:120000});await sleep(2500);await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await settle();d=await p.evaluate(measure);
   const res=check(d,'result',{settled:true});res.resultBannerOverlapsHud=d.others.banner.some(o=>hit(d.health,o,.5));assert.equal(d.corners.find(c=>c.corner==='blue').out,'true');assert.equal(d.corners.find(c=>c.corner==='blue').pulse,'none','no pulse once the fighter is out');row.states.push(res);if(lang==='en')await shot(lang+'-5-result');
   await p.evaluate(()=>{if(window.__baseLabels){window.GameIdentity.labels=window.__baseLabels;window.__baseLabels=null;}window.trainingControls.chooseTarget('none');});await sleep(300);assert.ok(await p.evaluate(()=>document.getElementById('fightHealth').hidden&&getComputedStyle(document.getElementById('fightHealth')).display==='none'),'HUD hides when the fight is left');
   await p.evaluate(()=>{app.engine.isPlaying=true;});
  }
  // Reduced motion: no flash, no pulse, no transitions.
  const rm=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});await rm.goto(`http://127.0.0.1:${port}/index.html`);await rm.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  const reduced=await rm.evaluate(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();await new Promise(r=>setTimeout(r,800));const v=app.engine.arena.fightView,m=v.match;app.engine.isPlaying=false;m.phase='round';fightUI.render(v);m.fighters.rabbit.condition=60;fightUI.render(v);m.fighters.rabbit.condition=20;fightUI.render(v);const pl=document.querySelector('#fightHealth [data-corner=blue]'),cs=n=>getComputedStyle(pl.querySelector(n));return {hit:pl.dataset.hit,low:pl.dataset.low,flash:cs('.fight-health-track').animationName,pulse:cs('.fight-health-fill').animationName,fillTransition:cs('.fight-health-fill').transitionDuration,trailTransition:cs('.fight-health-trail').transitionDuration,fill:pl.querySelector('.fight-health-fill').offsetWidth/pl.querySelector('.fight-health-track').offsetWidth};});
  assert.ok(reduced.hit&&reduced.low==='true');assert.equal(reduced.flash,'none');assert.equal(reduced.pulse,'none');assert.equal(reduced.fillTransition,'0s');assert.equal(reduced.trailTransition,'0s');assert.ok(Math.abs(reduced.fill-.2)<.012);results.push({viewport:width+'x'+height,reducedMotion:reduced});await rm.close();
  await p.close();
 }
 assert.deepEqual(errors,[],'no page errors');
 }finally{fs.writeFileSync(path.join(out,`results-${tag}.json`),JSON.stringify({errors,results},null,1));await b.close();}
 console.log('PASS GOTR-0021 HUD',results.filter(r=>r.states).map(r=>r.viewport+' '+r.lang+':'+r.states.length).join(', '));
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
