const {chromium}=require('playwright');
const {serve,boot}=require('../free-walk-city/serve.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
 const server=await serve(), browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:402,height:690},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[],report={edges:[]};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await boot(page,'http://localhost:'+server.address().port,'en','Touch QA');
  await page.evaluate(()=>{
   const prototype=window.StreetWalkPrototype;
   const input=prototype.stickInput;
   prototype.stickInput=(...args)=>{const value=input(...args);window.qaTouchValue=value;return value;};
   FreeWalk.open({start:'oldtown',look:'day'});
  });
  await page.waitForFunction(()=>FreeWalk.qa.town&&!FreeWalk.snapshot().busy,null,{timeout:300000});
  const session=await page.context().newCDPSession(page);
  const touch=(type,...points)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id=1])=>({x,y,id}))});
  const pad=page.locator('.fw-pad'), bounds=await pad.boundingBox(), y=Math.round(bounds.y+100);
  const value=()=>page.evaluate(()=>window.qaTouchValue);
  const state=()=>page.evaluate(()=>FreeWalk.snapshot().s);
  const active=()=>pad.evaluate(node=>node.classList.contains('active'));
  const waitValue=(horizontal,vertical)=>page.waitForFunction(([h,v])=>{
   const a=window.qaTouchValue;return a&&Math.abs(a[0]-h)<.025&&Math.abs(a[1]-v)<.08;
  },[horizontal,vertical]);
  for(const x of [Math.round(bounds.x+2),Math.round(bounds.x+bounds.width-2)]){
   await touch('touchStart',[x,y]);
   await waitValue(0,0);
   const ring=await page.locator('.fw-stick').boundingBox();
   assert.ok(ring.x>=bounds.x-1&&ring.x+ring.width<=bounds.x+bounds.width+1);
   assert.ok(ring.y>=bounds.y-1&&ring.y+ring.height<=bounds.y+bounds.height+1);
   await touch('touchMove',[x,y-38]);
   await waitValue(0,.945);
   report.edges.push({x,vector:await value(),ring});
   await touch('touchCancel');
   assert.equal(await active(),false);
  }
  const x=Math.round(bounds.x+bounds.width-4);
  const before=await state();
  await touch('touchStart',[x,y]);
  await touch('touchMove',[x,y-38]);
  await waitValue(0,.945);
  await page.waitForFunction(p=>Math.hypot(FreeWalk.snapshot().s.x-p.x,FreeWalk.snapshot().s.z-p.z)>.6,before);
  const forward=await state();
  await touch('touchMove',[x-35,y-25]);
  await page.waitForFunction(()=>window.qaTouchValue?.[0]<-.5&&window.qaTouchValue?.[1]>.4);
  await page.waitForFunction(p=>{
   const s=FreeWalk.snapshot().s;
   return Math.hypot(s.x-p.x,s.z-p.z)>.5&&Math.abs(Math.atan2(Math.sin(s.ry-p.ry),Math.cos(s.ry-p.ry)))>.22;
  },forward,{timeout:30000});
  const turn=await state();
  await touch('touchEnd');
  assert.equal(await active(),false);
  await page.waitForFunction(()=>!FreeWalk.snapshot().s.walking);
  const stopped=await state();
  await page.waitForTimeout(800);
  const rested=await state();
  assert.deepEqual(rested,stopped,'release stops navigation');
  await touch('touchStart',[x,y]);
  await waitValue(0,0);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await active(),false);
  await touch('touchEnd');
  report.route={before,forward,turn,stopped,rested};
  report.errors=errors;
  assert.deepEqual(errors,[]);
  fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));
  console.log('PASS true touchscreen events at both pad edges, held turn, cancel, release and blur');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
