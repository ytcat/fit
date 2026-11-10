const {chromium}=require('playwright'),assert=require('node:assert/strict');
const URL=process.env.APP_URL||'http://127.0.0.1:8131',PRE=process.env.PREFIX||'ac2';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const out=[];
for(const [name,vp] of [['phone',{width:393,height:852}],['small',{width:360,height:640}],['desk',{width:1366,height:768}]]){const p=await b.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 for(const lang of ['en','he','ru']){
  const r=await p.evaluate(async lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.quick();await new Promise(r=>setTimeout(r,300));document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('.iq-entry').click();await new Promise(r=>setTimeout(r,1500));
   const d=document.querySelector('dialog[open]'),box=n=>n.getBoundingClientRect(),over=(a,b)=>a.right>b.left+1&&b.right>a.left+1&&a.bottom>b.top+1&&b.bottom>a.top+1;
   const cards=[...d.querySelectorAll('.academy-lesson')],close=box(d.querySelector('.game-close')),hero=box(d.querySelector('.academy-hero'));
   const cp=app.engine.career.store.game().learning.challengeProgress,expected=Object.values(cp).reduce((n,x)=>n+Math.min(3,x.variantIds.length),0);return {expected:expected+' / 18',meterDir:d.querySelector('.academy-meter strong').dir,dir:d.dir,academy:d.classList.contains('game-academy'),cards:cards.length,meter:d.querySelector('.academy-meter strong').textContent,notes:d.querySelectorAll('.academy-notes .iq-note').length,heroUnderClose:over(hero,close),
    cardClip:cards.some(c=>c.scrollWidth>c.clientWidth+1||[...c.querySelectorAll('h4,button')].some(n=>n.scrollWidth>n.clientWidth+1)),btnH:Math.min(...cards.map(c=>box(c.querySelector('.academy-start')).height)),hScroll:d.scrollWidth>d.clientWidth+1,cols:new Set(cards.map(c=>Math.round(box(c).left))).size};},lang);
  assert.ok(r.academy&&r.cards===6&&r.notes===12,JSON.stringify(r));assert.equal(r.meter,r.expected,'meter shows saved progress');assert.equal(r.meterDir,'ltr','count keeps reading order in RTL');if(lang==='en')assert.equal(r.meter,'0 / 18','fresh player starts at zero');assert.ok(!r.heroUnderClose&&!r.cardClip&&!r.hScroll,name+' '+lang+' '+JSON.stringify(r));assert.ok(r.btnH>=40);
  out.push(`${name} ${lang}: cols=${r.cols} dir=${r.dir} meter=${r.meter}`);await p.screenshot({path:`${PRE}-${name}-landing-${lang}.png`});
  if(name!=='small'||lang==='ru'){ // lesson: wrong answer then keep trying until correct; check feedback colour state and progress
   const l=await p.evaluate(async()=>{const d=document.querySelector('dialog[open]');d.querySelector('.academy-lesson .academy-start').click();await new Promise(r=>setTimeout(r,2500));const choices=[...d.querySelectorAll('.iq-choice')],fb=d.querySelector('.iq-feedback');const seen=[];let solved=false;
    for(const c of choices){if(c.disabled)break;c.click();await new Promise(r=>setTimeout(r,250));seen.push(fb.dataset.correct);if(fb.dataset.correct==='true'){solved=true;break;}}
    return {eyebrow:d.querySelector('.academy-eyebrow')?.textContent,choices:choices.length,seen,solved,choiceClip:choices.some(c=>c.scrollWidth>c.clientWidth+1),hasCanvas:!!d.querySelector('.iq-preview canvas, .iq-preview #stageContainer')};});
   assert.equal(l.choices,3);assert.ok(l.solved,'a correct choice exists '+JSON.stringify(l));assert.ok(l.eyebrow.startsWith('1 · '));assert.ok(!l.choiceClip);
   await p.waitForTimeout(600);await p.screenshot({path:`${PRE}-${name}-lesson-${lang}.png`});
   const back=await p.evaluate(async()=>{const d=document.querySelector('dialog[open]');[...d.querySelectorAll('.iq-actions button')][0].click();await new Promise(r=>setTimeout(r,500));const c=d.querySelector('.academy-lesson');return {meter:d.querySelector('.academy-meter strong').textContent,state:c.dataset.state,pips:[...c.querySelectorAll('.academy-pips span')].filter(s=>s.dataset.on==='true').length,width:d.querySelector('.academy-meter-bar span').style.width};});
   out.push(`${name} ${lang} lesson: answers=${l.seen.join(',')} → landing meter=${back.meter} card=${back.state} pips=${back.pips}`);assert.equal(back.pips>=1,true);assert.notEqual(back.meter,'0 / 18');
   if(lang==='en')await p.screenshot({path:`${PRE}-${name}-landing-progress-en.png`});
   // reset progress for the next language by starting a fresh guest
   await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));}
 }
 assert.deepEqual(errors,[]);await p.close();}
console.log(out.join('\n'));console.log('ACADEMY DESIGN ASSERTIONS PASSED');await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
