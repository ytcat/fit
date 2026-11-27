const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const fs=require('node:fs');
(async()=>{
 const srv=await serve(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1}),errors=[],out=process.argv[2];
 p.on('pageerror',e=>errors.push(e.message));
 try {
  await boot(p,'http://localhost:'+srv.address().port,'en','City QA');
  await p.evaluate(()=>FreeWalk.open({start:'oldtown',look:'evening'}));
  await p.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:300000});
  const report={};
  for(const key of ['tv','bar','records','florist']){
   const result=await p.evaluate(key=>{
    const t=FreeWalk.qa.town,r=app.engine.renderer,c=FreeWalk.qa.camera,shop=t.scene.getObjectByName('Storefront '+key);
    if(!shop)return {missing:true};
    shop.updateWorldMatrix(true,true);
    const v=(x,y,z)=>new THREE.Vector3(x,y,z), depth={tv:1,bar:1.8,records:1.65,florist:1.65}[key];
    const at=shop.localToWorld(v(0,0,depth+5)), goal=shop.localToWorld(v(-.4,1.45,depth-.18));
    const n=t.grid.nearest(at.x,at.z,15);
    if(n)FreeWalk.qa.teleport(n.x,n.z);
    FreeWalk.qa.walk(0,0,.2);
    c.position.copy(at.add(v(0,1.63,0)).add(shop.localToWorld(v(1.25,0,0)).sub(shop.getWorldPosition(v(0,0,0)))));c.lookAt(goal);c.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(c.position,goal.clone().sub(c.position).normalize(),0,c.position.distanceTo(goal)-.01);
    const hit=ray.intersectObject(t.scene,true).filter(h=>h.object.visible&&h.object.material?.transparent!==true).slice(0,4).map(h=>[h.object.name||h.object.parent.name,+h.distance.toFixed(2)]);
    r.render(t.scene,c);const png=r.domElement.toDataURL('image/png').split(',')[1];
    return {hit,at:c.position.toArray(),goal:goal.toArray(),png};
   },key);
   if(result.png){fs.writeFileSync(out+'/store-'+key+'.png',Buffer.from(result.png,'base64'));delete result.png;}
   report[key]=result;console.log(key,JSON.stringify(result));
  }
  fs.writeFileSync(out+'/fronts.json',JSON.stringify({report,errors},null,2));
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
