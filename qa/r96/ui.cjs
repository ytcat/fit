// Actual app captures and upload/shader checks. Software browser != physical phone.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.APP_ROOT||path.resolve(__dirname,'../..'),out=process.env.QA_OUT||'/tmp/r90-browser',kind=process.env.QA_KIND||'motion';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(f===root)f+='/index.html';if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1100,height:950},hasTouch:true,bypassCSP:true});p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));if(process.env.QA_WEBGL1)await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:get.call(this,kind,...args);};});await p.addInitScript({path:path.join(__dirname,'../lion-realism-m0/instrument.js')});await p.addInitScript(()=>M0.paused=true);await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.app?.engine?.coach?.anatomy&&window.ringsideLayout);if(await p.getByRole('button',{name:'Play as guest',exact:true}).count())await p.getByRole('button',{name:'Play as guest',exact:true}).click();await p.evaluate(async()=>{await M0.boot();app.engine.isPlaying=false;});
 const results=[];
 for(const viewport of [{width:320,height:568},{width:393,height:640},{width:393,height:844},{width:844,height:390},{width:1100,height:950}]){
  await p.setViewportSize(viewport);
  for(const lang of ['en','he','ru']){
   await p.evaluate(lang=>{app.lang=lang;app.engine.isPlaying=false;trainingControls.chooseTarget('none');clubInterface.paint();ringsideLayout.paint();},lang);
   await p.locator('#openTrainingDrawer').click();
   for(const panel of ['practice','moves','settings']){
    await p.evaluate(panel=>ringsideLayout.setPanel(panel),panel);
    const row=await p.evaluate(()=>{const d=ringsideLayout.drawer,r=d.getBoundingClientRect(),active=d.querySelector('[data-menu-panel]:not([hidden])');const controls=[...d.querySelectorAll('button,input,select,.career-stat')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));return {dialog:{x:r.x,y:r.y,bottom:r.bottom,right:r.right,scroll:d.scrollHeight,client:d.clientHeight},panelOverflow:active.scrollHeight-active.clientHeight,clipped:controls.filter(n=>{const b=n.getBoundingClientRect();return b.top<r.top-1||b.bottom>r.bottom+1||b.left<r.left-1||b.right>r.right+1}).map(n=>n.textContent||n.id),stats:[...d.querySelectorAll('.career-stat')].filter(n=>n.getClientRects().length).length};});
    results.push({viewport,lang,panel,...row});assert.ok(row.dialog.y>=-1&&row.dialog.bottom<=viewport.height+1,JSON.stringify(results.at(-1)));assert.equal(row.dialog.scroll-row.dialog.client,0,JSON.stringify(results.at(-1)));assert.ok(row.panelOverflow<=1,JSON.stringify(results.at(-1)));assert.deepEqual(row.clipped,[],JSON.stringify(results.at(-1)));if(panel==='moves')assert.equal(row.stats,6);
    if(lang==='en'&&viewport.width===393&&viewport.height===844)await p.screenshot({path:path.join(out,'menu-'+panel+'.png')});
   }
   await p.evaluate(()=>ringsideLayout.setPanel('practice'));await p.locator('#combinationBtn').click();
   const picker=await p.evaluate(()=>{const d=document.querySelector('.routine-picker'),r=d.getBoundingClientRect();return {scroll:d.scrollHeight-d.clientHeight,bottom:r.bottom,cards:[...d.querySelectorAll('.routine-choice')].filter(n=>!n.hidden).length};});assert.equal(picker.scroll,0,JSON.stringify({viewport,lang,picker}));assert.ok(picker.bottom<=viewport.height+1);assert.equal(picker.cards,12);
   if(lang==='en'&&viewport.width===393&&viewport.height===844)await p.screenshot({path:path.join(out,'combinations.png')});
   await p.locator('.routine-picker .routine-pager button').last().click();await p.locator('.routine-picker .routine-choice:not([hidden])').first().click();assert.equal(await p.locator('dialog[open]').count(),0);
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify({results,errors,physicalPhone:false},null,2));console.log('PASS five viewports × three languages: three panels, six skills, 11 techniques, paginated combinations; no scrolling or clipped controls');
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
