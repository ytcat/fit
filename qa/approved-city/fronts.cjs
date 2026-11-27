const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');

async function capture(page, key, reach, offset) {
 return page.evaluate(({key,reach,offset})=>{
  const town=FreeWalk.qa.town, renderer=app.engine.renderer, camera=FreeWalk.qa.camera;
  const shop=town.scene.getObjectByName('Storefront '+key);
  const sign=shop.getObjectByName('Localized shop sign '+key);
  const glass=shop.getObjectByName('Show window glass '+key);
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  shop.updateWorldMatrix(true,true);
  const desired=shop.localToWorld(v(offset,0,glass.position.z+reach));
  const point=town.grid.nearest(desired.x,desired.z,2);
  if(!point||!FreeWalk.qa.teleport(point.x,point.z))throw Error('Unreachable '+key);
  FreeWalk.qa.walk(0,0,.2);
  camera.position.set(point.x,town.grid.height(point.x,point.z)+1.63,point.z);
  camera.lookAt(shop.localToWorld(v(glass.position.x,1.53,glass.position.z)));
  camera.updateMatrixWorld(true);
  // Inspect from the player's eye position without looking through the player's own mesh.
  const player=app.engine.coach.root, wasVisible=player.visible;
  player.visible=false;
  const target=shop.getObjectByName('12 lively televisions / 12 channels');
  let visibleScreens=null;
  if(target){
   const positions=target.geometry.attributes.position;
   const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
   visibleScreens=Array.from({length:12},(_,i)=>{
    const centre=v().fromBufferAttribute(positions,i*6).add(v().fromBufferAttribute(positions,i*6+2)).multiplyScalar(.5);
    target.localToWorld(centre);
    const ray=new THREE.Raycaster(camera.position,centre.clone().sub(camera.position).normalize(),0,camera.position.distanceTo(centre)-.025);
    return !ray.intersectObject(town.scene,true).some(h=>visible(h.object)&&h.object.material?.transparent!==true);
   }).filter(Boolean).length;
  }
  renderer.render(town.scene,camera);
  const png=renderer.domElement.toDataURL().split(',')[1];
  player.visible=wasVisible;
  return {point,visibleScreens,sign:sign.material.map.image.width,lang:document.documentElement.lang,png};
 },{key,reach,offset});
}

(async()=>{
 const server=await serve(), browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1});
 const errors=[], report={}, out=process.argv[2];
 page.on('pageerror',e=>errors.push(e.message));
 try {
  await boot(page,'http://localhost:'+server.address().port,'en','City QA');
  for(const lang of ['en','he','ru']){
   await page.evaluate(lang=>{app.setLanguage(lang);FreeWalk.open({start:'oldtown',look:'evening'});},lang);
   await page.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:300000});
   const shots=lang==='en'?[['tv-west','tv',4.2,-2.8],['tv-route','tv',6.5,-1.2],['bar','bar',5,1.25],['records','records',5,1.25],['florist','florist',5,1.25]]:[['tv-route','tv',6.5,-1.2]];
   for(const [label,key,reach,offset] of shots){
    const row=await capture(page,key,reach,offset);
    const file=lang+'-'+label;
    fs.writeFileSync(out+'/'+file+'.png',Buffer.from(row.png,'base64'));
    delete row.png;
    report[file]=row;
    console.log(file,JSON.stringify(row));
   }
   await page.evaluate(()=>FreeWalk.close());
   await page.waitForFunction(()=>!FreeWalk.playing);
  }
  fs.writeFileSync(out+'/frontage-report.json',JSON.stringify({report,errors},null,2));
  for(const [key,row] of Object.entries(report)) {
   assert.equal(row.lang,key.split('-')[0],key+' locale');
   if(key.includes('-tv-')) assert.ok(row.visibleScreens>=10,key+' unobstructed screen centres');
  }
  assert.notDeepEqual(report['en-tv-west'].point,report['en-tv-route'].point);
  assert.deepEqual(errors,[]);
  console.log('PASS reachable TV views, EN/HE/RU, and storefront captures');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
