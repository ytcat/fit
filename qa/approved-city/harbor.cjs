const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1});
 const out=process.argv[2], report={}, errors=[], requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('/harbor-v2/'))requests.push(r.url().split('/').pop());});
 try {
  await boot(page,'http://localhost:'+server.address().port,'en','Harbor QA');
  await page.evaluate(()=>FreeWalk.open({start:'oldtown',look:'evening'}));
  await page.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:300000});
  report.initial=await page.evaluate(()=>{
   const {map,grid}=FreeWalk.qa.town;
   return {tiers:map.harbor?.snapshot(),legs:map.harbor?.colliders.map(([x,z])=>({x,z,blocked:!grid.allowed(x,z)})),
    deckStock: map.layout.inst.containers.list.filter(o=>o.z>53).length,
    quayStock: map.layout.inst.containers.list.filter(o=>o.z<=53).length};
  });
  report.initial.requests=requests.slice();
  assert.deepEqual([...report.initial.requests].sort(),['crane-far.glb','ship-far.glb']);
  assert.equal(report.initial.tiers?.length,3,'all approved anchors mounted');
  assert.equal(report.initial.deckStock,0,'old deck stacks removed');
  assert.equal(report.initial.legs.filter(p=>p.blocked).length,8,'tier-independent leg collision');
  for(const [name,tier,x,z,eye,target] of [
   ['far','far',82,97,[82,4,97],[14,10,160]],
   ['mid','mid',28,111,[-32,5,126],[10,12,155]],
   ['ship','near',-3,151,[-36,5,150],[17,6,170]],
   ['gantry','near',-19,143,[-26,4,130],[-3,14,153]]
  ]){
   await page.evaluate(([x,z])=>{
    const {grid}=FreeWalk.qa.town,p=grid.nearest(x,z,12);
    if(!p||!FreeWalk.qa.teleport(p.x,p.z))throw Error('Unreachable dock QA point');
    FreeWalk.qa.walk(0,0,.15);
   },[x,z]);
   await page.waitForFunction(tier=>{
    FreeWalk.qa.walk(0,0,.07);
    return FreeWalk.qa.town.map.harbor.snapshot().some(e=>e.tier===tier);
   },tier,{timeout:90000});
   const row=await page.evaluate(([eye,target])=>{
    const t=FreeWalk.qa.town,r=app.engine.renderer,c=FreeWalk.qa.camera;
    c.position.set(...eye);c.lookAt(...target);c.updateMatrixWorld(true);
    r.render(t.scene,c);
    return {tiers:t.map.harbor.snapshot(),visible:t.scene.getObjectByName('Approved harbor').children.map(p=>p.children.filter(c=>c.visible).length),
     player:FreeWalk.snapshot().s,calls:r.info.render.calls,triangles:r.info.render.triangles,resources:{...r.info.memory},
     png:r.domElement.toDataURL().split(',')[1]};
   },[eye,target]);
   fs.writeFileSync(out+'/'+name+'.png',Buffer.from(row.png,'base64'));delete row.png;
   report[name]=row;
   assert.deepEqual(row.visible,[1,1,1]);
   console.log(name,JSON.stringify(row));
  }
  report.walk=await page.evaluate(()=>{
   const result=[];
   for(let i=0;i<12;i++){
    FreeWalk.qa.yaw=-Math.PI/2;
    FreeWalk.qa.walk(0,1,.3);
    result.push(FreeWalk.snapshot().s);
   }
   return result;
  });
  report.requests=requests;report.errors=errors;
  fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
  assert.equal(new Set(requests).size,requests.length,'a tier is requested at most once');
  assert.deepEqual(errors,[]);
  console.log('PASS lazy dock tiers, stock deck removal, footprint and single visible tier');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
