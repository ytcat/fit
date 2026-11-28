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
   const pool=t.scene.getObjectByName('Old Town park fountain'),rings=t.scene.getObjectByName('Moving fountain ripples');
   const pos=pool.getWorldPosition(new THREE.Vector3()),p=t.grid.nearest(pos.x+6,pos.z+5);
   FreeWalk.qa.teleport(p.x,p.z);FreeWalk.qa.walk(0,0,.1);
   c.position.copy(pos).add(new THREE.Vector3(6,5,7));c.lookAt(pos.clone().add(new THREE.Vector3(0,1.7,0)));c.updateMatrixWorld(true);
   const frames=[];
   for(const dt of [0,.24,.24]){
    t.map.update(dt,c,r);r.render(t.scene,c);
    const m=new THREE.Matrix4();rings.getMatrixAt(0,m);
    frames.push({t:rings.userData.time,scale:m.elements[0],image:r.domElement.toDataURL().split(',')[1]});
   }
   return {frames,count:rings.count,collision:!t.grid.allowed(pos.x,pos.z),playerWasStationary:!FreeWalk.snapshot().s.walking};
  });
  assert.equal(data.count,12);assert.ok(data.collision&&data.playerWasStationary);
  assert.equal(new Set(data.frames.map(f=>f.scale)).size,3);
  assert.equal(new Set(data.frames.map(f=>f.image)).size,3);
  assert.deepEqual(errors,[]);
  data.frames.forEach((f,i)=>{fs.writeFileSync(process.argv[2]+'/fountain-'+i+'.png',Buffer.from(f.image,'base64'));delete f.image;});
  fs.writeFileSync(process.argv[2]+'/fountain.json',JSON.stringify({...data,errors},null,2));
  console.log('PASS stationary FreeWalk fountain motion and preserved solid basin');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
