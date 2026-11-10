const {chromium}=require('playwright');
const out=process.argv[2]||'before';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
for(const [name,vp] of [['phone',{width:393,height:852}],['desk',{width:1366,height:768}],['land',{width:852,height:393}]]){
 const p=await b.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8131');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 for(const lang of ['en','he','ru']){
  await p.evaluate(async lang=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.close?.();ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('playMode').click();},lang);
  await p.waitForTimeout(1500);
  await p.evaluate(()=>document.querySelector('[data-input-page="combos"]')?.click());await p.waitForTimeout(500);
  await p.screenshot({path:`${out}-${name}-${lang}.png`});
 }
 const info=await p.evaluate(()=>[...document.querySelectorAll('#manualControls .manual-move')].map(b=>({t:b.textContent,locked:b.dataset.locked,w:Math.round(b.getBoundingClientRect().width),h:Math.round(b.getBoundingClientRect().height),wrap:b.scrollHeight>b.clientHeight+1})));
 console.log(name,JSON.stringify(info),errors.slice(0,3));await p.close();}
await b.close();})();
