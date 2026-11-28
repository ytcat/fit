const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await boot(page,'http://localhost:'+server.address().port,'en','Fairground touch QA');
  await page.evaluate(()=>FreeWalk.open({start:'fair',look:'day'}));
  await page.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:240000});
  const cdp=await page.context().newCDPSession(page);
  const touch=(type,...points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id}))});
  const pad=page.locator('.fw-pad'),look=page.locator('.fw-look-pad');
  const box=await pad.boundingBox(), x=Math.round(box.x+34), y=Math.round(box.y+box.height*.60);
  const start=await page.evaluate(()=>{
   const s=FreeWalk.snapshot(),g=FreeWalk.qa.town.grid;
   let best=null;
   for(let i=0;i<64;i++){
    const a=i*Math.PI/32;
    let d=0;
    while(d<18&&g.allowed(s.s.x-Math.sin(a)*(d+.25),s.s.z-Math.cos(a)*(d+.25)))d+=.25;
    if(!best||d>best.clear)best={yaw:a,clear:d};
   }
   FreeWalk.qa.yaw=best.yaw;
   const frames=[],r=app.engine.renderer,render=r.render;
   window.fairFrames=frames;
   r.render=function(scene,camera){
    if(scene===FreeWalk.qa.town?.scene&&camera===FreeWalk.qa.camera&&frames.length<1600){
     const a=FreeWalk.snapshot();
     frames.push({t:performance.now(),s:a.s,yaw:a.yaw,d:a.camDist,eye:camera.position.toArray()});
    }
    return render.call(this,scene,camera);
   };
   return {position:s.s,...best};
  });
  assert.ok(start.clear>=3,'fairground path available');
  await touch('touchStart',[x,y,1]);
  await touch('touchMove',[x+4,y-49,1]);
  await page.waitForFunction(p=>Math.hypot(FreeWalk.snapshot().s.x-p.x,FreeWalk.snapshot().s.z-p.z)>1.5,start.position,{timeout:60000});
  const straight=await page.evaluate(()=>FreeWalk.snapshot().s);
  const drift=(straight.x-start.position.x)*Math.cos(start.yaw)-(straight.z-start.position.z)*Math.sin(start.yaw);
  assert.ok(Math.abs(drift)<.08,'held forward stays on its initial movement line: '+drift);
  const right=await look.boundingBox().catch(()=>null);
  let simultaneous=false;
  if(right){
   const xx=Math.round(right.x+right.width/2),yy=Math.round(right.y+right.height/2);
   await touch('touchStart',[x+4,y-49,1],[xx,yy,2]);
   await touch('touchMove',[x+4,y-49,1],[xx+36,yy,2]);
   const a=await page.evaluate(()=>FreeWalk.snapshot().yaw);
   await page.waitForFunction(a=>Math.abs(Math.sin((FreeWalk.snapshot().yaw-a)/2))>.13,a,{timeout:60000});
   simultaneous=true;
  }
  await touch('touchCancel');
  await page.waitForFunction(()=>!document.querySelector('.fw-pad.active')&&!FreeWalk.snapshot().s.walking,null,{timeout:30000});
  const stopped=await page.evaluate(()=>FreeWalk.snapshot().s);
  await touch('touchStart',[x,y,3]);
  await touch('touchMove',[x-48,y,3]);
  await page.waitForFunction(p=>Math.hypot(FreeWalk.snapshot().s.x-p.x,FreeWalk.snapshot().s.z-p.z)>.35,stopped,{timeout:45000});
  const recovered=await page.evaluate(()=>FreeWalk.snapshot().s);
  await touch('touchEnd');
  const frames=await page.evaluate(()=>window.fairFrames);
  const gaps=frames.slice(1).map((f,i)=>({yaw:Math.abs(Math.atan2(Math.sin(f.yaw-frames[i].yaw),Math.cos(f.yaw-frames[i].yaw))),boom:Math.abs(f.d-frames[i].d)}));
  const stats={frames:frames.length,maxYaw:Math.max(...gaps.map(f=>f.yaw)),maxBoom:Math.max(...gaps.map(f=>f.boom))};
  assert.ok(stats.frames>8&&stats.maxYaw<1.2,'no hard orbit jump: '+JSON.stringify(stats));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(process.argv[2],JSON.stringify({viewport:[393,852],start,straight,drift,simultaneous,stopped,recovered,stats,errors},null,2));
  await page.screenshot({path:process.argv[2].replace(/\.json$/,'.jpg'),type:'jpeg',quality:85});
  console.log('PASS Fairground touch walk, stable direction, cancellation and restart',JSON.stringify(stats));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
