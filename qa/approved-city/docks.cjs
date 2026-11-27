const {chromium}=require('playwright'),{serve,boot}=require('../free-walk-city/serve.cjs'),fs=require('node:fs');
(async()=>{
 const server=await serve(), browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1}),errors=[],out=process.argv[2],tag=process.argv[3];
 p.on('pageerror',e=>errors.push(e.message));
 try {
  await boot(p,'http://localhost:'+server.address().port,'en','Docks QA');
  const look=process.env.DOCKS_LOOK||'evening';
  await p.evaluate(look=>FreeWalk.open({start:'oldtown',look}),look);
  await p.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:300000});
  const data=[];
  const traversal=await p.evaluate(()=>{
   const t=FreeWalk.qa.town, slot=t.snapshot().containerDetail?.[0];
   if(!slot)return null;
   const g=t.grid.nearest(slot.x-3,slot.z-7,20);
   FreeWalk.qa.teleport(g.x,g.z);
   const rows=[];
   for(const direction of [0,Math.PI,0,Math.PI]){
    for(let i=0;i<5;i++){
     for(let frame=0;frame<15;frame++){
      FreeWalk.qa.yaw=direction;
      FreeWalk.qa.walk(0,1,.1);
     }
     rows.push({position:FreeWalk.snapshot().s,near:t.snapshot().containerDetail.filter(e=>e.near).map(e=>e.id)});
    }
   }
   return rows;
  });
  if(process.env.DOCKS_WALK_ONLY){
   fs.writeFileSync(out+'/'+tag+'.json',JSON.stringify({viewport:[402,690],renderer:'Chromium SwiftShader',look,traversal,errors},null,2));
   return;
  }
  for(const [label,d] of [['near',7],['far',34],['return',7],['wheel',28]]){
   const row=await p.evaluate(([label,d])=>{
    const t=FreeWalk.qa.town, r=app.engine.renderer, c=FreeWalk.qa.camera,V=(x,y,z)=>new THREE.Vector3(x,y,z);
    const o=t.scene.getObjectByName(label==='wheel'?'Midnight Pier (authored)':'Harborline container')||t.scene.getObjectByName('HARBORLINE / HLFU 402918 8')||t.scene.getObjectByName('ferris wheel');
    if(!o||label!=='wheel'&&o.name==='ferris wheel')return {missing:true};
    const a=o.getWorldPosition(V(0,0,0));
    const goal=label==='wheel'?a.clone().add(V(0,13,0)):a.clone().add(V(0,1,0));
    const eye=label==='wheel'?a.clone().add(V(-9,4,d)):a.clone().add(V(-3,2.9,-d));
    const g=t.grid.nearest(eye.x,eye.z,25);
    if(g)FreeWalk.qa.teleport(g.x,g.z);
    FreeWalk.qa.walk(0,0,.35);
    c.position.copy(eye);c.lookAt(goal);c.updateMatrixWorld(true);
    const times=[],gl=r.getContext(),px=new Uint8Array(4);
    for(let i=0;i<4;i++){const start=performance.now();r.render(t.scene,c);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);times.push(performance.now()-start);}
    return {object:o.name,anchor:a.toArray(),player:g,visible:o.visible,calls:r.info.render.calls,triangles:r.info.render.triangles,memory:{...r.info.memory},times,lod:t.snapshot().containerDetail||null,png:r.domElement.toDataURL().split(',')[1]};
   },[label,d]);if(row.png){fs.writeFileSync(out+'/'+tag+'-'+label+'.png',Buffer.from(row.png,'base64'));delete row.png;}
   data.push({label,...row}); console.log(label,JSON.stringify(row));
  }
  fs.writeFileSync(out+'/'+tag+'.json',JSON.stringify({viewport:[402,690],renderer:'Chromium SwiftShader',look,traversal,data,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
