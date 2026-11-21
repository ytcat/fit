const { chromium } = require('playwright'), fs=require('node:fs'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:402,height:690},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(/shader error/i.test(m.text()))errors.push(m.text());});
  await page.goto(process.env.APP_URL,{timeout:90000,waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.app?.engine?.world?.gymWallGroups?.front&&window.trainingControls);
  await page.evaluate(()=>{ for(const d of document.querySelectorAll('dialog[open]'))d.close(); trainingControls.chooseTarget('none'); app.engine.isPlaying=false; app.engine.renderer.shadowMap.enabled=false; });
  await page.locator('#camBack').tap({timeout:20000});
  await page.waitForFunction(()=>app.engine.camera.position.z<0 && app.engine.world.gymWallGroups.front.visible,null,{timeout:30000});
  const details=await page.evaluate(()=>{const e=app.engine,n=[];e.world.gymWallGroups.front.traverse(m=>{if(m.name==='Door glass')n.push({alpha:m.material.opacity,depthWrite:m.material.depthWrite});});return {n,cameraZ:e.camera.position.z,front:e.world.gymWallGroups.front.visible};});
  assert.deepEqual(errors,[]);
  const side=process.argv[2]; await page.screenshot({path:process.env.OUT_DIR+'/'+side+'-foundry.png'});
  fs.writeFileSync(process.env.OUT_DIR+'/'+side+'-foundry.json',JSON.stringify(details));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
