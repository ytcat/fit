const {chromium}=require('playwright'),{serve,boot}=require('../free-walk-city/serve.cjs'),fs=require('node:fs');
(async()=>{
 const srv=await serve(),b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1}),out=process.argv[2],tag=process.argv[3],errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await boot(p,'http://localhost:'+srv.address().port,'en','Old Town QA');
  await p.evaluate(()=>FreeWalk.open({start:'oldtown',look:'night'}));
  await p.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:240000});
  const report=await p.evaluate(isolate=>{
   const t=FreeWalk.qa.town,r=app.engine.renderer,c=FreeWalk.qa.camera,shots={},meta={};
   const shop=t.scene.getObjectByName('walk set gym'),v=(x,y,z)=>new THREE.Vector3(x,y,z);
   const nodes=[];t.scene.traverse(o=>{if(['light pools','street lamp ground decals','glows','light beams','glow'].includes(o.name)&&o.visible)nodes.push(o);});
   function frame(key,eye,goal,hide=[]){
    c.position.copy(eye);c.lookAt(goal);c.updateMatrixWorld(true);
    for(const o of hide)o.visible=false;
    r.render(t.scene,c);
    shots[key]=r.domElement.toDataURL().split(',')[1];
    meta[key]={eye:eye.toArray(),goal:goal.toArray(),draws:r.info.render.calls,triangles:r.info.render.triangles};
    for(const o of hide)o.visible=true;
   }
   for(const [range,x,z] of [['11m',-9,17],['48m',-39,35]]){
    const spot=shop.localToWorld(v(x,0,z)),p=t.grid.nearest(spot.x,spot.z,6);
    if(p)FreeWalk.qa.teleport(p.x,p.z);
    FreeWalk.qa.walk(0,0,.12);
    const eye=shop.localToWorld(v(x,2.9,z)),goal=shop.localToWorld(v(-4,1.2,10));
    frame(range,eye,goal);
    if(isolate) {
     for(const [key,names] of [['no-decals',['street lamp ground decals']],['no-sprites',['glows','light beams']],['no-set-pools',['light pools']]])frame(range+'-'+key,eye,goal,nodes.filter(o=>names.includes(o.name)));
    }
   }
   const glob=t.scene.getObjectByName('glows');
   if(glob){
    const eye=shop.localToWorld(v(-39,2.9,35)),goal=shop.localToWorld(v(-4,1.2,10)),delta=goal.clone().sub(eye).normalize(),coords=glob.geometry.attributes.position;
    const aligned=[];
    for(let i=0;i<coords.count;i++){
     const local=v().fromBufferAttribute(coords,i), offset=glob.localToWorld(local.clone()).sub(eye), along=offset.dot(delta);
     if(along>0&&along<85&&offset.addScaledVector(delta,-along).length()<10)
      aligned.push([local.toArray(),glob.geometry.attributes.size.getX(i),along]);
    }
    meta.aligned=aligned.sort((a,b)=>a[2]-b[2]).slice(0,20);
   }
   const cars=t.snapshot().cars;
   const anchor=shop.localToWorld(v(-39,0,35));
   const car=cars.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)).sort((a,b)=>Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z))[0];
   if(car){
    const p=t.grid.nearest(car.x+4,car.z,5);
    if(p)FreeWalk.qa.teleport(p.x,p.z);
    const before=FreeWalk.qa.town.snapshot().cars;
    FreeWalk.qa.walk(0,0,.14);
    const after=FreeWalk.qa.town.snapshot().cars;
    const q=after.reduce((best,o)=>Math.hypot(o.x-car.x,o.z-car.z)<Math.hypot(best.x-car.x,best.z-car.z)?o:best);
    const y=t.grid.height(q.x,q.z);
    frame('car',v(q.x+4.4,y+2,q.z+5.6),v(q.x,y+.7,q.z));
    meta.car.moved=Math.hypot(q.x-car.x,q.z-car.z);meta.car.stockCount=before.length;meta.car.detail=t.scene.getObjectByName('detailed moving traffic')?.children.map(o=>o.count);
   }
   return {shots,meta,nodes:nodes.map(o=>[o.name,o.parent.name]),pointLights:t.scene.children.filter(o=>o.isPointLight).length};
  },!!process.env.ISOLATE_LIGHTS);
  for(const [key,base64] of Object.entries(report.shots))fs.writeFileSync(out+'/'+tag+'-'+key+'.png',Buffer.from(base64,'base64'));
  delete report.shots;report.errors=errors;
  fs.writeFileSync(out+'/'+tag+'.json',JSON.stringify(report,null,2));
 }finally{await b.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
