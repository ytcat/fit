/* GOTR-0051: the owner's view (phone, Train -> Shadowbox, default camera), plus the heavy bag and a quick fight,
   as the app itself draws them (no camera or pose staging). Usage (preview on 127.0.0.1:8161): node qa/gotr-0051/owner-view.cjs */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:402,height:780}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 for(const species of ['lion','rabbit']){
  for(const mode of ['none','heavy']){
   await page.evaluate(([s,m])=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(e.coach.species!==s)e.roster.select(s);ringfighterGame.startTraining({mode:m,play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());},[species,mode]);
   await page.waitForTimeout(6000);await page.locator('#stageContainer').screenshot({path:path.join(out,`owner-${species}-${mode}.png`)});
   if(mode==='none'){
    // Staged views of the same guard: from the side with the fighter facing right on screen, and from above.
    for(const view of ['side','top']){
     await page.evaluate(view=>{const e=app.engine,c=e.coach,cam=e.camera;e.isPlaying=false;if(!window.__draw){window.__draw=e.renderer.render.bind(e.renderer);}e.renderer.render=()=>{};
      document.getElementById('stageContainer').classList.add('qa-bare');if(!document.getElementById('qaBare')){const st=document.createElement('style');st.id='qaBare';st.textContent='.qa-bare>*:not(canvas){visibility:hidden!important}';document.head.append(st);}
      c.root.updateMatrixWorld(true);const o=c.root.localToWorld(new THREE.Vector3(0,view==='top'?1.2:1.15,.12)),p=c.root.localToWorld(view==='top'?new THREE.Vector3(0,5.2,.13):new THREE.Vector3(3.4,1.35,.12));
      cam.zoom=1;cam.up.set(0,1,0);if(view==='top')cam.up.copy(new THREE.Vector3(-1,0,0).transformDirection(c.root.matrixWorld));cam.position.copy(p);cam.lookAt(o);cam.updateProjectionMatrix();window.__draw(e.scene,cam);cam.up.set(0,1,0);},view);
     await page.locator('#boxerCanvas').screenshot({path:path.join(out,`staged-${species}-${view}.png`)});
    }
    await page.evaluate(()=>{const e=app.engine;e.renderer.render=window.__draw;document.getElementById('stageContainer').classList.remove('qa-bare');e.isPlaying=true;});
   }
  }
 }
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();});
 await page.waitForTimeout(14000);
 await page.locator('#stageContainer').screenshot({path:path.join(out,'owner-fight.png')});
 console.log('done, errors',errors.length,errors.slice(0,2).join(' | '));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
