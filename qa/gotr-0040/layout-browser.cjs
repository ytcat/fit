/* GOTR-0040 layout check of the power meter in the real app (headless Chromium, software WebGL).
   For each viewport: mitt training in Play (gauge) and a quick fight (meters under the health bars), after one
   contact sent through the engine's own impact hook. Reports overlaps of the meter with buttons, the game pad,
   Burst, the health bars and the cue, and saves stage screenshots (EN at every size, HE and RU at phone size).
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0040/layout-browser.cjs */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const url=process.env.QA_URL||'http://127.0.0.1:8161/',out=path.join(__dirname,'shots');fs.mkdirSync(out,{recursive:true});
const sizes=[['phone',402,690],['small',360,640],['land',852,393],['desk',1366,768]];
const overlaps=()=>{
 const hit=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).visibility!=='hidden'?r:null;};
 const meters=[...document.querySelectorAll('#powerGauge:not([hidden]),#fightHealth:not([hidden]) .gr-power-row')].map(n=>({n,r:hit(n)})).filter(m=>m.r);
 const others=[...document.querySelectorAll('#stageContainer button,#fighterPad,#burstControl,#burstTip,#fightHealth .fight-health-track,#fightHealth .fight-health-head,[class*=cue]')].filter(n=>!n.hidden&&!n.closest('[hidden]')).map(n=>({n,r:hit(n)})).filter(o=>o.r);
 const list=[];for(const m of meters)for(const o of others){if(m.n.contains(o.n)||o.n.contains(m.n))continue;const a=m.r,b=o.r,w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(w>1&&h>1)list.push((m.n.id||m.n.className)+' x '+(o.n.id||o.n.className||o.n.tagName)+' '+Math.round(w)+'x'+Math.round(h));}
 return {meters:meters.map(m=>({id:m.n.id||m.n.className,rect:[m.r.left,m.r.top,m.r.width,m.r.height].map(Math.round),text:m.n.textContent})),overlaps:list};
};
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const [name,width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy&&app.engine.powerMeter,null,{timeout:300000});
  await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  for(const lang of name==='phone'?['en','he','ru']:['en']){
   await page.evaluate(lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.startTraining({mode:'pads',play:true});},lang);
   await page.waitForTimeout(2500);
   await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.engine.onImpact({actor:'lion',receiver:'pads',kind:'pad',move:'cross',impulse:29,closingSpeed:4.6});app.engine.onImpact({actor:'lion',receiver:'pads',kind:'pad',move:'jab',impulse:18,closingSpeed:3.1});app.engine.powerMeter.paint();});
   await page.waitForTimeout(600);
   const train=await page.evaluate(overlaps);await page.locator('#stageContainer').screenshot({path:path.join(out,`train-${name}-${lang}.png`)});
   results.push({name,lang,view:'mitts-play',...train});console.log(name,lang,'mitts',JSON.stringify(train));
  }
  for(const lang of name==='phone'?['en','he','ru']:['en']){
   await page.evaluate(lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.quick();},lang);
   await page.waitForFunction(()=>app.engine.arena?.fightView&&!document.getElementById('fightHealth').hidden,null,{timeout:300000});
   await page.waitForTimeout(2000);
   await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.engine.powerMeter.paint();app.engine.onImpact({actor:'lion',receiver:'rabbit',kind:'head',move:'cross',legal:true,blocked:false,impulse:1.35,closingSpeed:6});app.engine.onImpact({actor:'rabbit',receiver:'lion',kind:'body',move:'jab',legal:true,blocked:false,impulse:.5,closingSpeed:4});});
   await page.waitForTimeout(600);
   const fight=await page.evaluate(overlaps);await page.locator('#stageContainer').screenshot({path:path.join(out,`fight-${name}-${lang}.png`)});
   results.push({name,lang,view:'fight',...fight});console.log(name,lang,'fight',JSON.stringify(fight));
  }
  results.push({name,errors});await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'layout-results.json'),JSON.stringify({browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
