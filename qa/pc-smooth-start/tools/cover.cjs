// Screenshot of the boot cover alone (game-shell.js blocked so the cover stays), per language
const {chromium}=require('playwright'),path=require('path'),S=require('./serve.cjs');
const ROOT=process.env.ROOT||path.join(__dirname,'../../..'),OUT=process.argv[2]||__dirname;
(async()=>{const srv=await S.start(ROOT);const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 for(const [lang,W,H] of [['en',1366,768],['he',402,690],['ru',1920,1080]]){
  const p=await b.newPage({viewport:{width:W,height:H}});
  await p.addInitScript(l=>{localStorage.setItem('shadowbox-language',l);let g;Object.defineProperty(window,'gotrBoot',{configurable:true,get(){return g;},set(v){const d=v.done;v.done=(...a)=>{window.__doneBy=new Error().stack.slice(0,400);return d(...a);};g=v;}});},lang);
  await p.route(/game-shell\.js|career-interface\.js/,r=>r.abort());
  await p.goto(srv.url,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);
  console.log(lang,await p.evaluate(()=>({boot:document.documentElement.hasAttribute('data-boot'),bg:getComputedStyle(document.documentElement,'::after').backgroundImage.slice(0,80),txt:getComputedStyle(document.documentElement,'::after').content,by:window.__doneBy,welcome:!!document.querySelector('dialog.career-welcome[open]')})));
  await p.screenshot({path:path.join(OUT,'cover-'+lang+'-'+W+'x'+H+'.png'),timeout:120000}).catch(e=>console.log('shot fail'));await p.close();}
 await b.close();srv.close();})();
