const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
for(const [name,vp] of [['phone',{width:393,height:852}],['desk',{width:1366,height:768}]]){const p=await b.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8131');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 for(const [lang,title] of [['en','Fight Academy'],['he','אקדמיית הקרב'],['ru','Академия боя']]){
  const r=await p.evaluate(async lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.open('world');await new Promise(r=>setTimeout(r,300));const world=document.body.innerText;ringfighterGame.close?.();document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(r=>setTimeout(r,300));const toolbar=document.querySelector('.iq-entry')?.textContent;document.querySelector('.iq-entry').click();await new Promise(r=>setTimeout(r,1200));return {toolbar,world,academy:document.querySelector('dialog[open]')?.innerText||''};},lang);
  assert.equal(r.toolbar,title);assert.ok(r.world.includes(title),'world shows '+title);assert.ok(r.academy.includes(title),'screen title');
  for(const old of ['Fight IQ','חוכמת הזירה','Боксёрское мышление'])assert.ok(!r.world.includes(old)&&!r.academy.includes(old),'old name visible: '+old);
  await p.screenshot({path:`academy-${name}-${lang}.png`});console.log(name,lang,'toolbar=',r.toolbar);}
 assert.deepEqual(errors,[]);await p.close();}
console.log('ACADEMY ASSERTIONS PASSED');await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
