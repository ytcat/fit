// Read-only browser QA for the currently live v1.70 application.
// Use: APP_URL=https://ytcat.github.io/fit/ node qa/live-v170/smoke.cjs
// This never changes server state and runs each persona in isolated browser storage.
'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const URL = process.env.APP_URL || 'https://ytcat.github.io/fit/';
const OUTPUT = path.resolve(process.env.QA_OUTPUT || 'qa/live-v170/output');
if (!/^https:\/\/ytcat\.github\.io\/fit\/?$/.test(URL))
  throw Error('APP_URL must be the approved live Glory of the Ring site');
fs.mkdirSync(OUTPUT, { recursive: true });
const cases = [
  {name:'iphone-en',width:402,height:690,lang:'en',button:'langEN'},
  {name:'small-iphone-he',width:360,height:640,lang:'he',button:'langHE'},
  {name:'desktop-ru',width:1280,height:800,lang:'ru',button:'langRU'}
];
const report = {url: URL, expectedVersion:'1.70', capturedAt:new Date().toISOString(), cases:[], outcome:'pending'};
const browserArgs = ['--no-sandbox','--enable-unsafe-swiftshader'];
function assert(condition,message){ if(!condition) throw Error(message); }
async function check(obj,label,fn){
 try { const info=await fn();obj.checks.push({label,result:'pass',info:info||undefined}); }
 catch(e){obj.checks.push({label,result:'fail',error:String(e.message||e)});}
}
(async()=>{
 let browser;
 try {
  browser=await chromium.launch({headless:true,args:browserArgs});
  for (const c of cases){
   const record={name:c.name,viewport:[c.width,c.height],checks:[],pageErrors:[],consoleErrors:[],screenshots:[]};
   report.cases.push(record);
   const ctx=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:1,permissions:[]});
   const page=await ctx.newPage();page.on('pageerror',e=>record.pageErrors.push(String(e.message).slice(0,300)));
   page.on('console',m=>{if(m.type()==='error')record.consoleErrors.push(m.text().slice(0,300));});
   await check(record,'page loads',async()=>{const r=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});assert(r?.ok(),'HTTP '+r?.status());});
   await check(record,'live version is 1.70',async()=>{
    await page.waitForFunction(()=>typeof window.APP_VERSION?.number==='string',{timeout:50000});
    const v=await page.evaluate(()=>window.APP_VERSION.number);
    record.detectedVersion=v;assert(v==='1.70','Live version is '+v+', not v1.70; report does not characterize this as a v1.70 bug');
   });
   if (record.detectedVersion!=='1.70'){await ctx.close();break;}
   await check(record,'game initializes',async()=>{
    const welcome=page.locator('dialog.career-welcome[open]');
    await page.waitForFunction(()=>!!window.ringfighterGame?.store||!!document.querySelector('dialog.career-welcome[open]'),{timeout:60000});
    if(await welcome.count()){
     await welcome.locator('input').first().fill('Automated QA');
     await welcome.locator('button[type=submit]').first().click();
    }
    await page.waitForFunction(()=>!!window.ringfighterGame && !!window.app?.engine,{timeout:60000});
   });
   await check(record,'3D canvas exists',async()=>{
    const x=await page.locator('#boxerCanvas').evaluate(n=>{let b=n.getBoundingClientRect();return {width:b.width,height:b.height,viewport:[innerWidth,innerHeight]};});
    assert(x.width>150&&x.height>150,'Canvas missing or not measurable');
    return x;
   });
   await check(record,'language button responds',async()=>{
    const button=page.locator('#'+c.button);
    assert(await button.isVisible(),'Language button missing');
    await button.click({timeout:12000});
    const lang=await page.evaluate(()=>window.app?.lang);
    assert(lang===c.lang,'Language set to '+lang+' instead of '+c.lang);
   });
   await check(record,'basic controls remain in viewport',async()=>{
    const buttons=await page.locator('#langEN,#langHE,#langRU,#soundBtn,#speedBtn').evaluateAll(nodes=>nodes.map(n=>{
     const b=n.getBoundingClientRect();return {id:n.id,visible:b.width>0&&b.height>0,inside:b.left>=-1&&b.top>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1};
    }));
    assert(buttons.every(b=>b.visible&&b.inside),JSON.stringify(buttons.filter(b=>!b.visible||!b.inside)));return buttons;
   });
   await check(record,'safe user controls respond to taps',async()=>{
    const speed=page.locator('#speedBtn'),sound=page.locator('#soundBtn');
    assert(await speed.isVisible()&&await sound.isVisible(),'One or more controls missing');
    const before=await speed.innerText();await speed.click({timeout:12000});
    const after=await speed.innerText();assert(before!==after,'Speed label unchanged after click');
    await sound.click({timeout:12000});
    return {speedBefore:before,speedAfter:after};
   });
   await check(record,'capture stage screenshot',async()=>{
    const name=c.name+'.png';
    await page.screenshot({path:path.join(OUTPUT,name),fullPage:true,timeout:30000});
    record.screenshots.push(name);
   });
   await check(record,'runtime errors',async()=>{
    assert(record.pageErrors.length===0,record.pageErrors.join(' | '));
    // Console errors are included in report, but not always actionable (external browser/asset warnings).
   });
   await ctx.close();
  }
 }catch(e){report.fatal=String(e.stack||e);}
 finally {
  if(browser)await browser.close();
  report.finishedAt=new Date().toISOString();
  const problems=report.cases.flatMap(c=>c.checks.filter(x=>x.result==='fail').map(x=>c.name+': '+x.label+': '+x.error));
  report.outcome=report.fatal?'error':report.cases.some(c=>c.detectedVersion&&c.detectedVersion!=='1.70')?'wrong-version':problems.length?'fail':'pass';
  report.problems=problems;
  fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({outcome:report.outcome,cases:report.cases.length,problems,fatal:report.fatal}));
  if(report.outcome!=='pass')process.exitCode=1;
 }
})();
