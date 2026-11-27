const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1});
 const online=await context.newPage(),base='http://localhost:'+server.address().port;
 const out=process.argv[2], errors=[];
 const open=async page=>{
  await page.evaluate(()=>FreeWalk.open({start:'docks',look:'night'}));
  await page.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:180000});
 };
 try{
  await boot(online,base,'en','Docks QA');
  online.on('pageerror',e=>errors.push(e.message));
  await open(online);
  const night=await online.evaluate(()=>{
   const {map,scene}=FreeWalk.qa.town,r=app.engine.renderer,c=FreeWalk.qa.camera;
   const ship=scene.getObjectByName('Portward cargo ship (approved)');
   if(!ship)throw Error('Approved ship missing');
   c.position.set(113,15,250);c.lookAt(15,6,170);c.updateMatrixWorld(true);
   r.render(scene,c);
   return {night:map.night,tiers:map.harbor.snapshot(),png:r.domElement.toDataURL().split(',')[1]};
  });
  assert.equal(night.night,true);
  fs.writeFileSync(out+'/night-ship.png',Buffer.from(night.png,'base64'));
  delete night.png;
  fs.writeFileSync(out+'/night-ship.json',JSON.stringify(night,null,2));
  if(process.env.NIGHT_CAPTURE_ONLY)return;
  await online.evaluate(()=>navigator.serviceWorker.register('./offline-worker.js'));
  await online.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:90000});
  const cold=await online.evaluate(async()=>{
   const street=await caches.open('ringfighter-street-1');
   for(const r of await street.keys())if(r.url.includes('/harbor-v2/'))await street.delete(r);
   const cache=await caches.open('ringfighter-offline-v198-20261125');
   return (await cache.keys()).filter(r=>r.url.includes('/harbor-v2/')).length;
  });
  assert.equal(cold,0);
  await online.close();
  await context.setOffline(true);
  const offline=await context.newPage();
  offline.on('pageerror',e=>errors.push(e.message));
  await boot(offline,base,'en','Docks QA');
  await open(offline);
  const replay=await offline.evaluate(()=>{
   const {map,scene}=FreeWalk.qa.town;
   return {controlled:!!navigator.serviceWorker.controller,online:navigator.onLine,night:map.night,
    position:FreeWalk.snapshot().s,approved:!!scene.getObjectByName('Approved harbor'),
    deck:map.layout.inst.containers.list.filter(o=>o.z>53).length,quay:map.layout.inst.containers.list.filter(o=>o.z<=53).length};
  });
  assert.equal(replay.controlled,true);
  assert.equal(replay.online,false);
  assert.equal(replay.approved,false);
  assert.ok(replay.deck>0&&replay.quay>0);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/offline-docks.json',JSON.stringify({replay,errors},null,2));
  console.log('PASS night ship capture and offline service-worker Docks replay with procedural fallback');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
