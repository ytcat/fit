'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), base = process.env.GOTR_TEST_BASE || root;
const Three = require(path.join(base, 'assets/vendor/three.min.js'));
const Core = require(path.join(root, 'adventure/free-walk/free-walk-core.js'));
const win = { FreeWalkCore: Core };
const context = { window: win, THREE: Three, performance, document: { readyState:'loading', addEventListener() {} } };
vm.runInNewContext(fs.readFileSync(path.join(base,'adventure/story/dream-pose.js'), 'utf8'), context);
const f = fs.readFileSync(path.join(root,'adventure/free-walk/free-walk.js'), 'utf8'), tail = f.lastIndexOf('})();');
vm.runInNewContext(f.slice(0, tail) + 'window.touchTest={touchInput,bindMovement,movementIntent,step,setRun(r){run=r}};' + f.slice(tail), context);
const {touchInput, bindMovement, movementIntent, step, setRun} = win.touchTest;
function surface(rect = {left:0,top:0,width:0,right:500,bottom:600}) {
  const listeners = {}, held = new Set();
  return {
    style:{}, classList:new Set(), getBoundingClientRect:()=>rect,
    addEventListener(type,fn) { listeners[type] = fn; },
    setPointerCapture:id=>held.add(id), hasPointerCapture:id=>held.has(id), releasePointerCapture:id=>held.delete(id),
    event(type, x, y, id = 1, pointerType = 'touch', hud = false) {
      let prevent = false;
      listeners[type]?.({pointerId:id,clientX:x,clientY:y,button:0,pointerType,target:{closest:() => hud}, preventDefault(){prevent=true;}});
      return prevent;
    }
  };
}
function harness(wall = false) {
  const host = surface({left:0,top:0,width:393,right:393,bottom:852}), pad = surface({left:0,top:660,width:185,right:185,bottom:852}), stick = surface({left:16,top:692,width:125}), thumb = surface(), glow = surface();
  const lookPad = surface({left:272,top:716,width:103,right:375,bottom:819}), lookThumb = surface();
  pad.classList.remove = v => pad.classList.delete(v);
  lookPad.classList.remove = v => lookPad.classList.delete(v);
  const cell = .25, n = 80, walk = new Uint8Array(n*n).fill(1), heights = new Float32Array(n*n);
  if (wall) for (let i=0;i<n;i++) { walk[32*n+i]=0; heights[32*n+i]=6; } // z in [-2,-1.75)
  const grid = Core.grid({x0:-10,z0:-10,cell,nx:n,nz:n,heights,walk});
  const actor = {x:0,z:0,ry:Math.PI,walking:false};
  const r = { yaw:0, camYaw:0, keys:new Set(), analog:[0,0], full:0, poseT:0, zoom:1,zoomTarget:1,groundY:0,turn:Math.PI,
    rig:{root:new Three.Group()},blob:{position:new Three.Vector3()},s:actor,last:{hud:1e9,guide:1e9,save:1e9},
    town:{grid,update(){}},center:new Three.Vector3(),camera:new Three.PerspectiveCamera() };
  setRun(r);
  return {r,host,pad,lookPad,lookThumb,release:bindMovement(r,host,pad,stick,thumb,glow,lookPad,lookThumb)};
}
const project = (a, b, yaw) => {
  const [fx, fz] = Core.velocity(0, 1, yaw, 1);
  const [rx, rz] = Core.velocity(1, 0, yaw, 1);
  return {forward:(b.x-a.x)*fx+(b.z-a.z)*fz, right:(b.x-a.x)*rx+(b.z-a.z)*rz};
};
const runStroke = (padOn, dx, dy, end='pointerup') => {
  const {r, host, pad} = harness();
  const yaw=.43, x=padOn?25:196, y=padOn?750:426;
  r.yaw=r.camYaw=yaw;
  const start={...r.s};
  const target=padOn?pad:host;
  assert.equal(target.event('pointerdown',x,y),true);
  target.event('pointermove',x+dx,y+dy);
  for(let i=0;i<36;i++){r.camYaw=yaw+.007*i;step(1/60,2000+17*i,false);}
  const out=project(start,r.s,yaw);
  target.event(end,x+dx,y+dy);
  const released={...r.s};
  for(let i=0;i<36;i++)step(1/60,2700+17*i,false);
  const coast=Math.hypot(r.s.x-released.x,r.s.z-released.z);
  assert.ok(coast<(end==='pointerup'?.75:.0001), 'bounded natural deceleration on lift, hard stop on interruption: '+coast);
  const stopped={...r.s};
  for(let i=0;i<18;i++)step(1/60,3200+17*i,false);
  assert.ok(Math.hypot(r.s.x-stopped.x,r.s.z-stopped.z)<.0001);
  out.coast=coast;
  return out;
};
const up=runStroke(false,0,-42), jitter=runStroke(false,5,-42,'pointercancel'), left=runStroke(false,-42,0), edge=runStroke(true,0,-42,'lostpointercapture');
assert.ok(up.forward>.65&&Math.abs(up.right)<.001);
assert.ok(jitter.forward>.65&&Math.abs(jitter.right)<.025, JSON.stringify(jitter));
assert.ok(left.right< -.45&&Math.abs(left.forward)<.001);
assert.ok(edge.forward>.65&&Math.abs(edge.right)<.001);
assert.ok(Math.abs(up.forward-edge.forward)<.001);
const inactive=harness();
assert.equal(inactive.host.event('pointerdown',362,735,1,'touch',true),false,'zoom overlay is not captured');
assert.equal(inactive.host.hasPointerCapture(1),false);
console.log(JSON.stringify({viewport:[393,852],up,jitter,left,edge,neutralRelease:true,hudBypass:true},null,2));

// A constant diagonal world vector from a cardinal screen gesture approaches a solid at an angle.
// Review 3 let it travel sideways along the obstacle via X/Z fallback. The intended line must hold.
function nearObstacle(kind) {
  const {r,host}=harness(kind==='wall');
  const yaw=.43;
  r.yaw=r.camYaw=yaw;
  r.s.x=.20;
  if(kind==='wall') r.s.z=-1.0;
  if(kind==='car') {
    // the town's parked/stopped-car style expanded oriented rectangle at a turn
    const carYaw=.15, u=[Math.cos(carYaw),Math.sin(carYaw)], v=[-u[1],u[0]];
    r.town.blocked=(x,z)=>Math.abs((x+.9)*u[0]+(z+2.2)*u[1])<2.40&&Math.abs((x+.9)*v[0]+(z+2.2)*v[1])<1.10;
  }
  if(kind==='trunk') {
    // real grid stamping used by FreeWalkTown. Occupies several navigation cells, not just one point.
    const grid=r.town.grid;
    Core.blockDiscs(grid.walk,grid,[[-.57,-1.65,.45]]);
  }
  if(kind==='curb') {
    const grid=r.town.grid;
    for(let j=0;j<40;j++)for(let i=0;i<80;i++)grid.heights[j*80+i]=.17;
  }
  const start={...r.s};
  host.event('pointerdown',196,426);
  host.event('pointermove',203,384);  // 9.46 degree thumb offset
  let maxFrameDy=0;
  for(let i=0;i<87;i++){
    const old=r.groundY;
    r.camYaw=yaw+Math.sin(i*.2)*.43;
    step(1/60,2000+i*17,false);
    maxFrameDy=Math.max(maxFrameDy,Math.abs(r.groundY-old));
    assert.ok(r.town.grid.allowed(r.s.x,r.s.z),'no solid grid penetration');
    assert.ok(!r.town.blocked?.(r.s.x,r.s.z),'no penetration into parked car');
  }
  const contact=project(start,r.s,yaw);
  if(kind==='curb') { assert.ok(contact.forward>4.8); assert.ok(r.groundY>.16&&maxFrameDy<.035); }
  else {
    assert.ok(contact.forward>.35&&contact.forward<2.0, JSON.stringify(contact));
    r.camYaw=yaw; // make the intentional turn relative to a known rendered right vector
    host.event('pointermove',244,426); // deliberate right after blocked forward: leave instead of needing to lift/reset
    for(let i=0;i<27;i++)step(1/60,3600+i*17,false);
    assert.ok(project(start,r.s,yaw).right>.65,kind+' responds sideways after contact without sticking: '+JSON.stringify(project(start,r.s,yaw))+' aim '+JSON.stringify(r.touchAim)+ ' straight '+ r.touchPace.straight);
  }
  return contact;
}
const wallContact=nearObstacle('wall'), carContact=nearObstacle('car'), treeContact=nearObstacle('trunk'), curb=nearObstacle('curb');
assert.ok(Math.abs(wallContact.right)<.001&&Math.abs(carContact.right)<.001&&Math.abs(treeContact.right)<.001&&Math.abs(curb.right)<.001);
assert.ok(up.coast<.26,'short release coast');
assert.ok(jitter.right===0&&up.forward>1.6,'precise cardinal and brisk initial response');
console.log(JSON.stringify({wallContact,carContact,treeContact,curb},null,2));

{
  const {r,host,pad}=harness();
  const y=426;
  assert.equal(host.event('pointerdown',340,y,4),true,'right third captured for orbit');
  host.event('pointermove',300,y+20,4);
  assert.ok(Math.abs(r.yaw-.32)<1e-8,'left drag rotates camera only');
  host.event('pointermove',360,y,4);
  assert.ok(Math.abs(r.yaw-(-.16))<1e-8,'right drag reverses orbit');
  assert.ok(Math.hypot(...r.analog)===0);
  step(1/60,performance.now(),false);
  assert.ok(r.s.x===0&&r.s.z===0,'orbit has no movement');
  pad.event('pointerdown',50,747,5); pad.event('pointermove',50,700,5);
  assert.ok(r.analog[0]===0&&r.analog[1]===1,'second finger can move');
  const before={...r.s}, basis=r.touchAim.yaw;
  host.event('pointermove',288,y,4);
  assert.equal(r.touchAim.yaw,basis,'concurrent orbit does not rotate held movement');
  host.event('pointerup',288,y,4);
  assert.equal(host.hasPointerCapture(4),false);
  assert.equal(pad.hasPointerCapture(5),true,'look release does not cancel movement');
  for(let i=0;i<30;i++)step(1/60,performance.now()+i*17,false);
  const during=project(before,r.s,basis);
  assert.ok(during.forward>1.0&&Math.abs(during.right)<.001);
  pad.event('pointercancel',50,700,5);
  assert.ok(r.s.x!==0||r.s.z!==0);
  assert.ok(!r.touchPace&&Math.hypot(...r.analog)===0);
  assert.ok(Core.text('en','lookDrag')!==Core.text('he','lookDrag')&&Core.text('en','lookDrag')!==Core.text('ru','lookDrag'));
}
console.log('Right-side look: both directions, no avatar motion, simultaneous steering, separate cleanup, translated hint passed.');

{
  const {r,host,pad}=harness();
  const lookDir = () => { r.camera.updateMatrixWorld(true); return r.camera.getWorldDirection(new Three.Vector3()); };
  const actorOnScreen = () => { const p = new Three.Vector3(r.s.x,r.groundY+1.45,r.s.z).project(r.camera); return Math.abs(p.x)<1&&Math.abs(p.y)<1; };
  const advance=(n)=>{for(let i=0;i<n;i++)step(1/60,performance.now()+i*17,false);};
  const from = { ...r.s };
  host.event('pointerdown',340,426,3);
  host.event('pointermove',324,216,3); // look up + left
  advance(135);
  assert.ok(Math.abs(r.yaw-.128)<1e-8&&Math.abs(r.pitchTarget-(-.22))<1e-8);
  assert.ok(lookDir().y>.20, 'upward endpoint shows sky as well as street');
  assert.ok(r.camera.position.y>1.25 && actorOnScreen(), 'upward look is above the pavement and keeps the avatar visible');
  host.event('pointerup',324,216,3);
  advance(20);
  assert.ok(lookDir().y>.20, 'persistent after finger lift');
  host.event('pointerdown',320,300,4);
  host.event('pointermove',320,478,4);
  assert.ok(Math.abs(r.pitchTarget-1.02)<1e-8,'downward pitch limit');
  assert.ok(r.camP<.08,'camera does not jump to requested target');
  advance(125);
  assert.ok(lookDir().y<-.82 && actorOnScreen(), 'downward endpoint shows ground around player');
  assert.ok(Math.hypot(r.s.x-from.x,r.s.z-from.z)===0);
  pad.event('pointerdown',50,747,5); pad.event('pointermove',50,700,5);
  const basis=r.touchAim.yaw;
  host.event('pointermove',300,339,4);
  assert.ok(r.pitchTarget<.1&&Math.abs(r.yaw-.288)<1e-8);
  assert.equal(r.touchAim.yaw,basis);
  host.event('pointercancel',300,339,4);
  assert.ok(pad.hasPointerCapture(5));
  assert.ok(Core.text('en','lookDrag').includes('↕')&&Core.text('he','lookDrag').includes('↕')&&Core.text('ru','lookDrag').includes('↕'));
}
console.log('Vertical look: joint yaw/pitch, smooth limits, above ground, avatar visible, lift persistence, concurrent walking passed.');

{
  const {r,host,pad,lookPad,lookThumb,release}=harness();
  const ticks=n=>{ const start=performance.now(); for(let i=0;i<n;i++)step(1/60,start + i*17,false); };
  assert.equal(lookPad.event('pointerdown',320,765,5),true);
  ticks(5);
  assert.equal(r.yaw,0,'neutral touch keeps camera steady');
  lookPad.event('pointermove',360,725,5);
  ticks(24);
  assert.ok(r.yaw<-.6&&r.pitchTarget<.3,'right-up applies both axes with no further events');
  assert.ok(lookThumb.style.transform.includes('translate'));
  host.event('pointerdown',355,480,6);
  host.event('pointermove',281,428,6);
  assert.equal(host.hasPointerCapture(6),false,'second look pointer does not fight the stick');
  assert.ok(r.s.x===0&&r.s.z===0,'no movement from camera stick');
  pad.event('pointerdown',50,747,2); pad.event('pointermove',50,700,2);
  const basis=r.touchAim.yaw;
  lookPad.event('pointermove',285,805,5);
  ticks(24);
  assert.ok(Math.abs(r.yaw)<.1&&r.pitchTarget>.57,'left-down reverses the stick');
  assert.equal(r.touchAim.yaw,basis,'camera joystick does not rotate held movement');
  assert.ok(project({x:0,z:0},r.s,basis).forward>.9);
  lookPad.event('pointerup',285,805,5);
  assert.equal(lookPad.hasPointerCapture(5),false);
  assert.equal(pad.hasPointerCapture(2),true);
  const y=r.yaw,p=r.pitchTarget;
  ticks(18);
  assert.ok(r.yaw===y&&r.pitchTarget===p&&lookThumb.style.transform==='');
  release(null,true);
  assert.ok(!pad.hasPointerCapture(2)&&!r.lookStick);
  lookPad.event('pointerdown',320,765,7); lookPad.event('pointermove',350,735,7);
  lookPad.event('lostpointercapture',350,735,7);
  assert.equal(r.lookStick,null);
  for(const l of ['en','he','ru']) assert.notEqual(Core.text(l,'lookStick'),'lookStick');
}
console.log('Camera-only right stick: full four directions, stationary hold, diagonals, concurrent movement, separate cancellation and localized labels passed.');
