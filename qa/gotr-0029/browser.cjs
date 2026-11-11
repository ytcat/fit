const {chromium}=require('playwright'),assert=require('node:assert/strict');const URL=process.env.APP_URL||'http://127.0.0.1:8131';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const out=[];
for(const [n,vp] of [['phone',{width:402,height:690}],['small',{width:360,height:640}],['land',{width:852,height:393}],['desk',{width:1366,height:768}]]){const p=await b.newPage({viewport:vp,deviceScaleFactor:n==='phone'?2:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
for(const lang of ['en','he','ru']){
 const r=await p.evaluate(async lang=>{app.setLanguage(lang);document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(r=>setTimeout(r,400));document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('lab');await new Promise(r=>setTimeout(r,600));const d=document.querySelector('dialog.game-loadouts[open]'),box=x=>x.getBoundingClientRect(),dr=box(d);
  const cards=[...d.querySelectorAll('.loadout-card')],clip=[...d.querySelectorAll('.loadout-card *, .loadouts-top *')].filter(x=>x.offsetParent&&(x.scrollWidth>x.clientWidth+1)&&getComputedStyle(x).overflow!=='visible').length,hscroll=d.scrollWidth>d.clientWidth+1;
  return {title:d.querySelector('h2').textContent,cards:cards.length,states:cards.map(c=>c.dataset.state[0]).join(''),lockedWords:(d.innerText.match(/Locked|נעול|Закрыто/g)||[]).length,slots:d.querySelectorAll('.loadout-slot').length,clip,hscroll,overflowRight:cards.some(c=>box(c).right>dr.right+1)};},lang);
 out.push(n+' '+lang+' new: '+JSON.stringify(r));assert.equal(r.cards,6);assert.equal(r.slots,8);assert.ok(!r.hscroll&&!r.overflowRight,JSON.stringify(r));assert.ok(r.lockedWords<=6,'one Locked per card at most');
 if(lang==='en')await p.screenshot({path:`lab-${n}-new.png`});}
// earn + buy + equip flow
const f=await p.evaluate(async()=>{app.setLanguage('en');const st=app.engine.career.store,pid=st.current().id;for(let i=0;i<3;i++)st.award({id:'qa-lab-'+i+'-'+Date.now(),profileId:pid,species:'lion',mode:'heavy',seconds:60,hits:30,attempts:40});document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('lab');await new Promise(r=>setTimeout(r,500));let d=document.querySelector('dialog.game-loadouts[open]');const card=id=>d.querySelector(`.loadout-card[data-combo="${id}"]`);
 card('corner_turn').querySelector('.combo-buy').click();await new Promise(r=>setTimeout(r,200));card('corner_turn').querySelector('.combo-confirm .combo-buy').click();await new Promise(r=>setTimeout(r,500));d=document.querySelector('dialog.game-loadouts[open]');
 const fightBtn=[...card('corner_turn').querySelectorAll('.loadout-toggle')][0];fightBtn.click();await new Promise(r=>setTimeout(r,500));d=document.querySelector('dialog.game-loadouts[open]');
 return {owned:st.game().combos.owned,fight:st.game().combos.fight,state:card('corner_turn').dataset.state,slot:[...d.querySelectorAll('.loadout-row[data-mode=fight] .loadout-slot')].map(s=>s.textContent).join('|'),coins:st.wallet().coins};});
out.push(n+' flow: '+JSON.stringify(f));assert.ok(f.fight.includes('corner_turn'));assert.equal(f.state,'equipped');
await p.screenshot({path:`lab-${n}-after.png`});assert.deepEqual(errs,[]);await p.close();}
console.log(out.join('\n'));console.log('LOADOUTS ASSERTIONS PASSED');await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
