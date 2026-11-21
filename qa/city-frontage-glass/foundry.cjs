const { chromium } = require('playwright'), fs=require('node:fs'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:402,height:690},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(/shader error/i.test(m.text()))errors.push(m.text());});
  await page.goto(process.env.APP_URL,{timeout:90000,waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.app?.engine?.world?.gymWallGroups?.front&&window.trainingControls);
  await page.evaluate(()=>{ for(const d of document.querySelectorAll('dialog[open]'))d.close(); trainingControls.chooseTarget('none'); app.engine.isPlaying=false; app.engine.renderer.shadowMap.enabled=false; });
  // Render the actual loaded Foundry world from a controlled Back angle in the
  // application page. This validates the material and cutaway, not touch navigation.
  const details=await page.evaluate(()=>{
    const e=app.engine, cam=e.camera, pos=cam.position.clone(), rot=cam.quaternion.clone(), aspect=cam.aspect, n=[];
    cam.position.set(-2.0,1.75,-5.20);cam.lookAt(0,1.50,4.8);cam.aspect=402/690;cam.updateProjectionMatrix();
    e.world.update(e.animTime,'none');
    const gl=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    gl.setPixelRatio(1);gl.setSize(402,690);gl.outputEncoding=THREE.sRGBEncoding;gl.toneMapping=THREE.ACESFilmicToneMapping;
    gl.render(e.scene,cam);
    const url=gl.domElement.toDataURL();gl.dispose();
    e.world.gymWallGroups.front.traverse(m=>{if(m.name==='Door glass')n.push({alpha:m.material.opacity,depthWrite:m.material.depthWrite});});
    const result={n,cameraZ:cam.position.z,front:e.world.gymWallGroups.front.visible,url};
    cam.position.copy(pos);cam.quaternion.copy(rot);cam.aspect=aspect;cam.updateProjectionMatrix();return result;
  });
  assert.ok(details.front&&details.cameraZ<0);
  assert.deepEqual(errors,[]);
  const side=process.argv[2]; fs.writeFileSync(process.env.OUT_DIR+'/'+side+'-foundry.png',Buffer.from(details.url.split(',')[1],'base64'));delete details.url;
  fs.writeFileSync(process.env.OUT_DIR+'/'+side+'-foundry.json',JSON.stringify(details));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
