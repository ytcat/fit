const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
for(const [n,vp,lang] of [['phone',{width:393,height:852},'en'],['phone-he',{width:393,height:852},'he'],['desk',{width:1366,height:768},'en']]){const p=await b.newPage({viewport:vp,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8131');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
await p.evaluate(l=>{app.setLanguage(l);document.querySelectorAll('dialog[open]').forEach(d=>d.close());},lang);await p.waitForTimeout(800);
const r=await p.evaluate(()=>{const m=document.querySelector('.club-mark'),img=m.querySelector('img'),b=m.getBoundingClientRect(),t=document.getElementById('appTitle').getBoundingClientRect();return {mark:[Math.round(b.width),Math.round(b.height)],loaded:img.complete&&img.naturalWidth>0,overlapTitle:b.right>t.left+1&&t.right>b.left+1};});
await p.screenshot({path:`hdr-${n}.png`,clip:{x:0,y:0,width:vp.width,height:70}});console.log(n,JSON.stringify(r),errs.length?errs[0]:'');await p.close();}
await b.close();})();
