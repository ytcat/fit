const {chromium}=require('playwright'),assert=require('node:assert/strict');
const T={en:['Shop','Waistbands'],he:['חנות','רצועות מותן'],ru:['Магазин','Пояс']};
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const out=[];
for(const [name,vp] of [['phone',{width:393,height:852}],['small',{width:360,height:640}],['land',{width:852,height:393}],['desk',{width:1366,height:768}]]){
 const p=await b.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8131');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 for(const lang of ['en','he','ru']){
  for(const screen of ['train','fight','world']){
   const r=await p.evaluate(async([lang,screen])=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);
    if(screen==='fight')ringfighterGame.quick();else if(screen==='train')ringfighterGame.startTraining({mode:'heavy'});else ringfighterGame.open('world');
    await new Promise(r=>setTimeout(r,400));if(screen!=='world')document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    const w=document.querySelector('.game-wallet'),r=w.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    const header=[...document.querySelectorAll('.club-head-tools > *')].map(n=>n.getBoundingClientRect());
    const overlaps=header.some((h,i,a)=>a.some((k,j)=>j>i&&h.right>k.left+1&&k.right>h.left+1&&h.bottom>k.top+1&&k.bottom>h.top+1));
    return {text:w.textContent,w:Math.round(r.width),h:Math.round(r.height),inView:r.left>=0&&r.right<=innerWidth&&r.top>=0,clip:w.scrollWidth>w.clientWidth+1,reachable:screen==='world'||w.contains(hit),overlaps,docW:document.documentElement.scrollWidth,vw:innerWidth};},[lang,screen]);
   assert.ok(r.text.includes(T[lang][0])||vp.width<=350,name+lang+screen+JSON.stringify(r));assert.ok(r.inView&&!r.clip&&!r.overlaps&&r.reachable,name+' '+lang+' '+screen+' '+JSON.stringify(r));assert.ok(r.docW<=r.vw,'no horizontal scroll');assert.ok(r.h>=40,'touch target');
   out.push(`${name} ${lang} ${screen}: "${r.text}" ${r.w}x${r.h}`);if(screen==='fight')await p.screenshot({path:`shop-${name}-header-${lang}.png`});}
  // one tap opens the Shop
  const s=await p.evaluate(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();await new Promise(r=>setTimeout(r,300));document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('.game-wallet').click();await new Promise(r=>setTimeout(r,800));const d=document.querySelector('dialog[open]');return {title:d?.querySelector('h2')?.textContent,cats:[...(d?.querySelectorAll('.store-category')||[])].map(b=>b.textContent),products:d?.querySelectorAll('.store-product').length};});
  assert.equal(s.title,T[lang][0]);assert.ok(s.cats.includes(T[lang][1]),JSON.stringify(s));assert.ok(s.products>0);out.push(`${name} ${lang} shop: ${JSON.stringify(s)}`);
  await p.screenshot({path:`shop-${name}-screen-${lang}.png`});}
 // real purchase path: actionable refusal without coins, equip persists
 if(name==='phone'){const r=await p.evaluate(()=>{const st=app.engine.career.store;return {noCoins:st.gameAction({type:'buy',itemId:'gloves_midnight'}),equip:st.gameAction({type:'equip',slot:'gloves',itemId:'gloves_default'})};});
  assert.equal(r.noCoins.ok,false);assert.match(r.noCoins.error,/Not enough coins/);assert.equal(r.equip.ok,true);out.push('purchase path: '+JSON.stringify(r));}
 assert.deepEqual(errors,[]);await p.close();}
console.log(out.join('\n'));console.log('SHOP ASSERTIONS PASSED');await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
