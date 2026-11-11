/* GOTR-0051: the owner's view (phone, Train -> Shadowbox, default camera), plus the heavy bag and a quick fight,
   as the app itself draws them (no camera or pose staging). Usage (preview on 127.0.0.1:8161): node qa/gotr-0051/owner-view.cjs */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:402,height:780}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy&&app.engine.orthodoxView,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 for(const species of ['lion','rabbit']){
  for(const mode of ['none','heavy']){
   await page.evaluate(([s,m])=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(e.coach.species!==s)e.roster.select(s);ringfighterGame.startTraining({mode:m,play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());},[species,mode]);
   await page.waitForTimeout(6000);await page.locator('#stageContainer').screenshot({path:path.join(out,`owner-${species}-${mode}.png`)});
  }
 }
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();});
 await page.waitForFunction(()=>app.engine.arena?.fightView?.match?.phase==='round',null,{timeout:300000});await page.waitForTimeout(1500);
 await page.locator('#stageContainer').screenshot({path:path.join(out,'owner-fight.png')});
 console.log('done, errors',errors.length,errors.slice(0,2).join(' | '));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
