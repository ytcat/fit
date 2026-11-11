// Persistent Playwright driver: POST /new {w,h,dpr,touch}, /eval {js}, /shot {path,full}, /click {sel}, /vp {w,h}, /errs, /quit
const {chromium}=require('/opt/node-tools/node_modules/playwright');const http=require('http');
let b,ctx,p,errs=[];
async function newPage(o){if(ctx)await ctx.close().catch(()=>{});ctx=await b.newContext({viewport:{width:o.w||402,height:o.h||690},deviceScaleFactor:o.dpr||2,hasTouch:!!o.touch,isMobile:!!o.touch,locale:o.locale||'en-US'});p=await ctx.newPage();errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text())});await p.goto(o.url||'http://127.0.0.1:8172/',{timeout:120000});if(o.wait!==false)await p.waitForFunction(()=>window.ringfighterGame&&window.app&&app.engine&&app.engine.coach?.anatomy,null,{timeout:180000});return 'ok'}
(async()=>{b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
http.createServer((req,res)=>{let d='';req.on('data',c=>d+=c);req.on('end',async()=>{try{const o=d?JSON.parse(d):{};let r;
if(req.url==='/new')r=await newPage(o);
else if(req.url==='/do'){r=await p.evaluate(src2=>{return (new Function('return (async()=>{'+src2+'})()'))()},o.js);}
else if(req.url==='/run'){const src=require('fs').readFileSync(o.file,'utf8');r=await p.evaluate(src2=>{return (new Function('return (async()=>{'+src2+'})()'))()},src);}
else if(req.url==='/shot'){await p.screenshot({path:o.path,fullPage:!!o.full,timeout:180000});r='shot'}
else if(req.url==='/click'){await p.click(o.sel,{timeout:15000});r='clicked'}
else if(req.url==='/tap'){await p.mouse.click(o.x,o.y);r='tapped'}
else if(req.url==='/vp'){await p.setViewportSize({width:o.w,height:o.h});r='vp'}
else if(req.url==='/errs'){r=errs.splice(0)}
else if(req.url==='/quit'){res.end('bye');await b.close();process.exit(0)}
res.end(JSON.stringify(r===undefined?null:r,null,1))}catch(e){res.statusCode=500;res.end('ERR '+e.message)}})}).listen(9172,'127.0.0.1',()=>console.log('driver up'))})();
