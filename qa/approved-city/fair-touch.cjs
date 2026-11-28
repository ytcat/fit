const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../../adventure/free-walk/free-walk.js'),'utf8');
  const tail=source.lastIndexOf('})();');
  const probe=`window.fairProbe={state:()=>({s:snapshot().s,analog:run.analog,basis:run.touchAim?.yaw,active:run.pad.classList.contains('active'),yaw:run.camYaw,d:run.camD}),hold(yaw){run.yaw=run.camYaw=yaw;place(true);},tick(n){const frames=[];let ms=performance.now();for(let i=0;i<n;i++){step(1/30,ms+=1000/30,false);frames.push(this.state());}return frames;}};`;
  await page.route('**/free-walk.js?*',route=>route.fulfill({contentType:'text/javascript',body:source.slice(0,tail)+probe+source.slice(tail)}));
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
   window.fairProbe.hold(best.yaw);
   return {position:s.s,...best};
  });
  assert.ok(start.clear>=3,'fairground path available');
  const activeTarget=await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.className,[x,y]);
  assert.equal(activeTarget,'fw-pad');
  await touch('touchStart',[x,y,1]);
  await touch('touchMove',[x+4,y-49,1]);
  const route=await page.evaluate(()=>{
   const probe=window.fairProbe,begin=probe.state();
   return {begin,frames:probe.tick(45),end:probe.state()};
  });
  console.log('forward input',route.begin);
  assert.ok(route.begin.active&&route.begin.analog[0]===0&&route.begin.analog[1]>.9);
  const straight=route.end.s, moved=Math.hypot(straight.x-route.begin.s.x,straight.z-route.begin.s.z);
  const drift=(straight.x-route.begin.s.x)*Math.cos(route.begin.basis)-(straight.z-route.begin.s.z)*Math.sin(route.begin.basis);
  assert.ok(moved>1.5&&Math.abs(drift)<.08,'held forward stays on its initial movement line: '+JSON.stringify({moved,drift}));
  const right=await look.boundingBox();
  const xx=Math.round(right.x+right.width/2),yy=Math.round(right.y+right.height/2);
  await touch('touchStart',[x+4,y-49,1],[xx,yy,2]);
  await touch('touchMove',[x+4,y-49,1],[xx+36,yy,2]);
  const turning=await page.evaluate(()=>{
   const probe=window.fairProbe,begin=probe.state();
   return {begin,frames:probe.tick(22),end:probe.state()};
  });
  const simultaneous=Math.abs(Math.sin((turning.end.yaw-turning.begin.yaw)/2))>.13&&turning.end.basis===route.begin.basis;
  assert.equal(simultaneous,true);
  await touch('touchCancel');
  const stopped=await page.evaluate(()=>{window.fairProbe.tick(3);return window.fairProbe.state();});
  assert.ok(!stopped.active&&!stopped.s.walking);
  await touch('touchStart',[x,y,3]);
  await touch('touchMove',[x-48,y,3]);
  const recovery=await page.evaluate(()=>{
   const probe=window.fairProbe,begin=probe.state();
   return {begin,frames:probe.tick(18),end:probe.state()};
  });
  const recovered=recovery.end.s;
  assert.ok(Math.hypot(recovered.x-recovery.begin.s.x,recovered.z-recovery.begin.s.z)>.35);
  await touch('touchEnd');
  const frames=[...route.frames,...turning.frames,...recovery.frames];
  const gaps=frames.slice(1).map((f,i)=>({yaw:Math.abs(Math.atan2(Math.sin(f.yaw-frames[i].yaw),Math.cos(f.yaw-frames[i].yaw))),boom:Math.abs(f.d-frames[i].d)}));
  const stats={frames:frames.length,maxYaw:Math.max(...gaps.map(f=>f.yaw)),maxBoom:Math.max(...gaps.map(f=>f.boom))};
  assert.ok(stats.maxYaw<1.2,'no hard orbit jump: '+JSON.stringify(stats));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(process.argv[2],JSON.stringify({viewport:[393,852],start,straight,drift,simultaneous,stopped,recovered,stats,errors},null,2));
  await page.screenshot({path:process.argv[2].replace(/\.json$/,'.jpg'),type:'jpeg',quality:85});
  console.log('PASS Fairground touch walk, stable direction, cancellation and restart',JSON.stringify(stats));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
