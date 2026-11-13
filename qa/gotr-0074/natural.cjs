/* GOTR-0074: what the app itself draws at phone size (no staging): shadow training, then a quick fight. */
const path=require('path'),{chromium}=require('playwright');const out=path.join(__dirname,'frames');require('fs').mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{const p=await b.newPage({viewport:{width:402,height:690}});p.setDefaultTimeout(300000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.QA_URL||'http://127.0.0.1:8161/');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
await p.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.startTraining({mode:'none',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
await p.waitForTimeout(9000);await p.screenshot({path:path.join(out,'natural-shadow.png')});
await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();});await p.waitForTimeout(16000);await p.screenshot({path:path.join(out,'natural-fight.png')});
console.log('errors',errors.length,errors.slice(0,3).join(' | '));}finally{await b.close();}})();
