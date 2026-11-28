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
const near = (a, b, eps = .00001) => assert.ok(Math.abs(a-b) < eps, `${a} ~= ${b}`);
const vec = (a, x, y) => { near(a[0],x); near(a[1],y); };
vec(touchInput(2, -3, 40), 0, 0);
vec(touchInput(4, -50, 40), 0, 1);
vec(touchInput(-4, -50, 40), 0, 1);
vec(touchInput(45, -45, 40), Math.SQRT1_2, Math.SQRT1_2);
vec(touchInput(-45, -45, 40), -Math.SQRT1_2, Math.SQRT1_2);
assert.ok(touchInput(13, -44, 40)[0] > 0 && touchInput(13, -44, 40)[0] < 13 / 44);
function surface(rect = {left:0,top:0,width:500,right:500,bottom:600}) {
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
  const host = surface(), pad = surface(), stick = surface({left:16,top:480,width:125}), thumb = surface(), glow = surface();
  pad.classList.remove = v => pad.classList.delete(v);
  const cell = .25, n = 80, walk = new Uint8Array(n*n).fill(1), heights = new Float32Array(n*n);
  if (wall) for (let i=0;i<n;i++) { walk[32*n+i]=0; heights[32*n+i]=6; } // z in [-2,-1.75)
  const grid = Core.grid({x0:-10,z0:-10,cell,nx:n,nz:n,heights,walk});
  const actor = {x:0,z:0,ry:Math.PI,walking:false};
  const r = { yaw:0, camYaw:0, keys:new Set(), analog:[0,0], full:0, poseT:0, zoom:1,zoomTarget:1,groundY:0,turn:Math.PI,
    rig:{root:new Three.Group()},blob:{position:new Three.Vector3()},s:actor,last:{hud:1e9,guide:1e9,save:1e9},
    town:{grid,update(){}},center:new Three.Vector3(),camera:new Three.PerspectiveCamera() };
  setRun(r);
  return {r,host,pad,release:bindMovement(r,host,pad,stick,thumb,glow)};
}
{
  const {r,host,pad,release}=harness();
  assert.equal(host.event('pointerdown',280,300,1,'touch',true),false,'HUD actions bypass drag');
  assert.equal(host.hasPointerCapture(1),false);
  assert.equal(host.event('pointerdown',280,300),true,'center begins relative movement');
  assert.equal(host.hasPointerCapture(1),true);
  vec(r.analog,0,0);
  host.event('pointermove',283,246);
  let ms=2000;
  for(let i=0;i<45;i++){r.camYaw=.16+i*.014;step(1/60,ms+=17,false);}
  near(r.s.x,0);
  assert.ok(r.s.z < -1.1);
  assert.equal(r.yaw,0,'automatic camera following not involved during touch');
  host.event('pointermove',281,248,2);
  const aim=r.touchAim;
  assert.equal(aim.yaw,0);
  host.event('pointermove',286,245);
  assert.equal(r.touchAim,aim);
  r.camYaw=.7;
  host.event('pointermove',325,255);
  near(r.touchAim.yaw,.7);
  host.event('pointermove',280,300);
  assert.equal(r.touchAim,null,'neutral re-arms');
  host.event('pointercancel',280,300);
  assert.equal(r.touchPace,null);
  assert.equal(host.hasPointerCapture(1),false);
  pad.event('pointerdown',68,540);
  pad.event('pointermove',68,495);
  vec(r.analog,0,1);
  pad.event('pointerup',68,495);
  assert.equal(pad.hasPointerCapture(1),false);
  vec(r.analog,0,0);
  pad.event('pointerdown',25,600);
  vec(r.analog,0,0);
  pad.event('pointermove',25,557);
  vec(r.analog,0,1);
  pad.event('lostpointercapture',25,557);
  vec(r.analog,0,0);
  host.event('pointerdown',200,200); host.event('pointermove',200,148);
  release(null,true);
  assert.equal(host.hasPointerCapture(1),false); vec(r.analog,0,0); assert.equal(r.touchPace,null);
  host.event('pointerdown',200,200,1,'mouse');
  host.event('pointermove',250,200,1,'mouse');
  near(r.yaw,-.4); assert.equal(r.touchAim,null);
  host.event('pointerup',250,200,1,'mouse');
  assert.equal(host.hasPointerCapture(1),false);
}
{
  const {r,host}=harness(true);
  host.event('pointerdown',230,300);
  host.event('pointermove',230,240);
  for(let i=0;i<74;i++)step(.05,2000+i*50,false);
  assert.ok(r.s.z > -1.75 && r.s.z < -1.60, 'brisk gait does not cross blocked grid row');
  near(r.s.x,0);
}
{
  const { r } = harness();
  for (const [k,h,v] of [['KeyW',0,1],['ArrowUp',0,1],['KeyS',0,-1],['ArrowDown',0,-1],['KeyD',1,0],['ArrowRight',1,0],['KeyA',-1,0],['ArrowLeft',-1,0]]) {
    r.keys = new Set([k]); r.full = 0;
    const i=movementIntent(r,.016); assert.equal(i.keys,true); vec([i.h,i.v],h,v); near(i.speed,3.3966);
  }
  r.keys = new Set(['KeyW','KeyD','ShiftLeft']);
  const i=movementIntent(r,.016); vec([i.h,i.v],1,1); near(i.speed,5.3724); near(Math.hypot(...Core.velocity(i.h,i.v,.9,i.speed)),i.speed);
  r.keys = new Set(['ArrowUp']); r.camYaw=.32;
  for(let i=0;i<30;i++){r.camYaw=.32; step(1/60,2000+i*17,false); }
  assert.ok(r.s.x<0 && r.s.z<-0.35);
}
console.log('Free Walk touch input: center drag, joystick, cardinal/diagonal, yaw lock and re-aim, HUD, release, keyboard/orbit and sprint collision passed.');

// Sprint pace only: get up to steady speed on held full touch, cross neither the closed grid row nor
// a parked-car blocker at max speed; normal stick and keyboard pace were checked above.
{
  const {r,host}=harness();
  host.event('pointerdown',240,300); host.event('pointermove',240,248);
  for(let i=0;i<80;i++)step(.017,2000+i*17,false);
  near(r.touchPace.v,5.3724);
  assert.ok(r.s.dist>5.2);
  const last={...r.s};
  for(let i=0;i<8;i++)step(.017,3400+i*17,false);
  near(Math.hypot(r.s.x-last.x,r.s.z-last.z),5.3724*.017*8);
  assert.ok(win.DreamPose.params(r.touchPace.v).S>1.5,'stride remains in run profile; the gait follows actual ground displacement');
}
{
  const {r,host}=harness(true);
  r.town.blocked=(x,z)=>Math.abs(x)<.45&&z< -1.2&&z> -1.6;
  host.event('pointerdown',230,300); host.event('pointermove',230,245);
  for(let i=0;i<58;i++)step(.05,2000+i*50,false);
  assert.ok(r.s.z>=-1.2&&r.s.z< -1.17,'sprint stops at car');
  r.town.blocked=undefined;
  for(let i=0;i<58;i++)step(.05,4900+i*50,false);
  assert.ok(r.s.z>=-1.75&&r.s.z< -1.71,'sprint stops at blocked grid row');
}
assert.ok(!/fw-ticks|fw-look-mark/.test(f), 'neither stick emits direction glyphs');
assert.ok(f.includes("el('span', 'fw-arrow', '➤')"), 'story navigation arrow retained');
const css=fs.readFileSync(path.join(root,'adventure/free-walk/free-walk.css'),'utf8');
assert.ok(!/fw-ticks|fw-look-mark|fw-stick::/.test(css), 'no stick directional pseudo-elements remain');
console.log('Faster sprint, solid collision, distance-based run profile and no joystick direction glyphs passed.');
