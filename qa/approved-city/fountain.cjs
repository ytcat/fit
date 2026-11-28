const {chromium}=require('playwright'),{serve,boot}=require('../free-walk-city/serve.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:393,height:852},hasTouch:true,deviceScaleFactor:1}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error'&&m.text().includes('WebGLProgram'))errors.push(m.text());});
 try{
  await boot(p,'http://localhost:'+server.address().port,'en','Fountain QA');
  await p.evaluate(()=>FreeWalk.open({start:'oldtown',look:'day'}));
  await p.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:240000});
  const data=await p.evaluate(()=>{
   const t=FreeWalk.qa.town,r=app.engine.renderer,c=FreeWalk.qa.camera;
   const pool=t.scene.getObjectByName('Old Town park fountain'),spray=t.scene.getObjectByName('Fountain impact spray');
   const pos=pool.getWorldPosition(new THREE.Vector3()),p=t.grid.nearest(pos.x+6,pos.z+5);
   FreeWalk.qa.teleport(p.x,p.z);FreeWalk.qa.walk(0,0,.1);
   c.position.copy(pos).add(new THREE.Vector3(6,5,7));c.lookAt(pos.clone().add(new THREE.Vector3(0,1.7,0)));c.updateMatrixWorld(true);
   r.render(t.scene,c);
   const wide=r.domElement.toDataURL().split(',')[1];
   const impact=spray.localToWorld(new THREE.Vector3().fromBufferAttribute(spray.geometry.attributes.position,0));
   c.position.copy(impact).add(new THREE.Vector3(2.0,1.44,1.55));c.lookAt(impact.clone().add(new THREE.Vector3(-.13,.03,0)));c.updateMatrixWorld(true);
   const frames=[];
   for(const dt of [0,.09,.09,.09,.09,.09,.09,.09]){
    t.map.update(dt,c,r);r.render(t.scene,c);
    frames.push({t:spray.material.uniforms.fountainTime.value,image:r.domElement.toDataURL().split(',')[1]});
   }
   const plaza=[];
   const square=t.map.layout.blocks.find(b=>b.kind==='square'&&b.district==='oldtown');
   const seatRadius=Math.max(2.9,square.w*.27),angle=square.ang;
   const local=(x,y,z)=>pos.clone().add(new THREE.Vector3(Math.cos(angle)*x+Math.sin(angle)*z,y,-Math.sin(angle)*x+Math.cos(angle)*z));
   const view=(eye,goal)=>{
    c.position.copy(local(...eye));c.lookAt(local(...goal));c.updateMatrixWorld(true);
    r.render(t.scene,c);plaza.push(r.domElement.toDataURL().split(',')[1]);
   };
   const oldFov=c.fov;c.fov=63;c.updateProjectionMatrix();
   view([0,33,8],[0,0,0]);
   c.fov=oldFov;c.updateProjectionMatrix();
   for(const side of [-1,1]){
    const x=side*seatRadius*3;
    view([x-side*2.9,3.6,5.6],[x,.75,.95]);
   }
   const seats=[-1,1].map(side=>!t.grid.allowed(pos.x+side*seatRadius*3*Math.cos(angle),pos.z-side*seatRadius*3*Math.sin(angle)));
   const clear=[-1,1].map(side=>t.grid.allowed(pos.x+side*6.4*Math.sin(angle),pos.z+side*6.4*Math.cos(angle)));
   const lookup=name=>pool.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
   return {frames,wide,plaza,seats,clear,transparent:[lookup('Upper surface of basin water').material.transparent,lookup('Water jets and droplets • visual').material.transparent],trees:t.map.layout.inst.trees.list.filter(o=>o.parkArt).length,ringOverlay:!!t.scene.getObjectByName('Moving fountain ripples'),
    bakedRipples:lookup('Contact ripples • visual').visible,spray:spray.geometry.attributes.position.count,
    waterMaterial:pool.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Upper surface of basin water'))?.material.customProgramCacheKey(),collision:!t.grid.allowed(pos.x,pos.z),playerWasStationary:!FreeWalk.snapshot().s.walking};
  });
  const distinctImages=new Set(data.frames.map(f=>f.image)).size;
  fs.writeFileSync(process.argv[2]+'/fountain-wide.png',Buffer.from(data.wide,'base64'));delete data.wide;
  data.frames.forEach((f,i)=>{fs.writeFileSync(process.argv[2]+'/fountain-'+i+'.png',Buffer.from(f.image,'base64'));delete f.image;});
  data.plaza.forEach((png,i)=>fs.writeFileSync(process.argv[2]+'/plaza-'+i+'.png',Buffer.from(png,'base64')));
  delete data.plaza;
  fs.writeFileSync(process.argv[2]+'/fountain.json',JSON.stringify({...data,errors},null,2));
  assert.deepEqual(data.transparent,[true,true],'both falling and basin water are translucent');
  assert.deepEqual(data.seats,[true,true],'both benches block movement');
  assert.deepEqual(data.clear,[true,true],'both main approaches remain open');
  assert.equal(data.trees,4);
  assert.equal(data.ringOverlay,false);assert.equal(data.bakedRipples,false);assert.equal(data.spray,54);assert.equal(data.waterMaterial,'old-town-fountain-water');assert.ok(data.collision&&data.playerWasStationary);
  assert.equal(new Set(data.frames.map(f=>f.t)).size,data.frames.length);
  assert.equal(distinctImages,data.frames.length);
  assert.deepEqual(errors,[]);
  console.log('PASS stationary FreeWalk fountain contact without a ring overlay, solid basin and open approaches');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
