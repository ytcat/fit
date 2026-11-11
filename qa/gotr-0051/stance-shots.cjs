/* GOTR-0051 evidence: the fighter's guard, front and side, before/after, both species, in the real app (headless
   Chromium, software GL). "before" serves boxing-coach-v2.js from QA_BASE (default claude/serene-cannon-riwk4l).
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0051/stance-shots.cjs ; python3 -I qa/gotr-0051/compose.py */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/',base=process.env.QA_BASE||'claude/serene-cannon-riwk4l';
const old=execFileSync('git',['show',base+':boxing-coach-v2.js'],{cwd:root,encoding:'utf8',maxBuffer:1<<26});fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 for(const version of ['before','after']){
  const page=await browser.newPage({viewport:{width:420,height:560}});page.setDefaultTimeout(300000);
  if(version==='before')await page.route('**/boxing-coach-v2.js*',r=>r.fulfill({contentType:'text/javascript',body:old}));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
  await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  for(const species of ['lion','rabbit']){
   for(const view of ['front','side']){
    await page.evaluate(([species,view])=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(e.coach.species!==species)e.roster.select(species);e.arena.setTarget('none');e.isPlaying=false;
     const c=e.coach;c.root.position.set(0,0,0);c.root.rotation.set(0,0,0);c.update(0,'guard','one_two',{});c.syncSkin?.();
     const cam=e.camera,p=view==='front'?[0.15,1.45,3.4]:[3.4,1.45,0.25];cam.zoom=1;cam.position.set(...p);cam.lookAt(0,1.12,0.1);cam.updateProjectionMatrix();e.renderer.render(e.scene,cam);},[species,view]);
    await page.locator('#boxerCanvas').screenshot({path:path.join(out,`${version}-${species}-${view}.png`)});
   }
  }
  await page.close();console.log(version,'done');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
