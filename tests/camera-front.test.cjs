const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;window.addEventListener=()=>{};
const stored=new Map();window.localStorage={getItem:k=>stored.has(k)?stored.get(k):null,setItem:(k,v)=>stored.set(k,String(v))};let reduced=false;window.matchMedia=()=>({matches:reduced});
vm.runInThisContext(fs.readFileSync('ring-camera.js','utf8'));vm.runInThisContext(fs.readFileSync('camera-director.js','utf8'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),STEP=1/60,{INTRO}=window.CameraDirection;
function world(aspect){
 const canvas={style:{},addEventListener(){},setPointerCapture(){}},camera=new THREE.PerspectiveCamera(38,aspect,.1,100),group=new THREE.Group(),lion={root:new THREE.Group()},rabbit={root:new THREE.Group()};
 const engine={canvas,camera,activeModel:lion.root,coach:lion,arena:{mode:'fight',group,models:{},fightView:{coaches:{lion,rabbit},match:{phase:'round',time:9}}}};
 group.rotation.y=.9;group.add(lion.root,rabbit.root);lion.root.position.set(-.7,0,.1);rabbit.root.position.set(.75,0,-.1);group.updateMatrixWorld(true);
 // The fight framing from fight-arena.js.
 const fov=THREE.MathUtils.degToRad(38),distance=Math.max(3.15/(2*Math.tan(fov/2)),3.15/(2*Math.tan(fov/2)*Math.max(.2,aspect)))+.55;camera.position.set(0,1.82,distance);camera.lookAt(0,1.3,0);
 engine.viewControls=new RingCamera(engine);engine.viewControls.refit(V(0,1.3,0));engine.cameraDirector=new CameraDirector(engine);return engine;
}
// GOTR-0047: the result ceremony (scoring + referee raising the hand) is always framed from the FRONT of the
// lined-up fighters, locked or not; rope jumping under the lock is framed from the front.
const frontError=(e,nodes)=>{const c=e.camera;let fx=0,fz=0,mx=0,mz=0;for(const n of nodes){const d=n.getWorldDirection(V()),p=n.getWorldPosition(V());fx+=d.x;fz+=d.z;mx+=p.x/nodes.length;mz+=p.z/nodes.length;}
 const f=V(fx,0,fz).normalize(),o=c.position.clone().sub(V(mx,0,mz)).setY(0).normalize();return 1-o.dot(f);};
function lineUp(e){const g=e.arena.group,{lion,rabbit}=e.arena.fightView.coaches;g.rotation.y=.9;lion.root.position.set(-.72,0,.05);rabbit.root.position.set(.72,0,.05);lion.root.rotation.y=0;rabbit.root.rotation.y=0;g.updateMatrixWorld(true);}
for(const aspect of [.54,2.21]){
 for(const locked of [true,false]){
  const e=world(aspect),d=e.cameraDirector,c=e.camera,m=e.arena.fightView.match,{lion,rabbit}=e.arena.fightView.coaches;
  d.setLock(locked,true);for(let i=0;i<120;i++)d.update(STEP);
  m.phase='ceremony';lineUp(e);for(let i=0;i<600;i++)d.update(STEP);
  assert.ok(frontError(e,[lion.root,rabbit.root])<.002,'ceremony is framed from the front (locked='+locked+', aspect '+aspect+'): '+frontError(e,[lion.root,rabbit.root]).toFixed(4));
  assert.ok(d.blocksOrbit,'no orbiting away during the ceremony');
  // Both fighters and the space above them (raised hands) stay in the frame.
  c.updateMatrixWorld(true);c.matrixWorldInverse.copy(c.matrixWorld).invert();let worst=0;for(const n of [lion.root,rabbit.root]){const p=n.getWorldPosition(V());for(const y of [0,2.3]){const q=p.clone().setY(y).project(c);worst=Math.max(worst,Math.abs(q.x),Math.abs(q.y));}}
  assert.ok(worst<.97,'both fighters framed in the ceremony at aspect '+aspect+': '+worst.toFixed(3));
  // After the fight the camera returns to what the player chose.
  m.phase='finished';e.arena.fightView=null;e.arena.mode='none';for(let i=0;i<400;i++)d.update(STEP);
  assert.equal(d.mode,locked?'lock':'free','the player\'s own camera choice returns after the ceremony (locked='+locked+')');
 }
 // An explicit unlock during the ceremony is respected for that fight.
 {const e=world(aspect),d=e.cameraDirector,m=e.arena.fightView.match;d.setLock(false,true);m.phase='ceremony';lineUp(e);for(let i=0;i<200;i++)d.update(STEP);assert.equal(d.mode,'lock');
  d.setLock(true);d.setLock(false);for(let i=0;i<400;i++)d.update(STEP);assert.equal(d.mode,'free','the player can still take the camera back during the ceremony');}
 // Rope jumping under the lock: front view; the lock button says so.
 {const e=world(aspect),d=e.cameraDirector,c=e.camera,lion=e.coach.root;e.arena.mode='rope';e.arena.fightView=null;e.arena.group.remove(e.arena.group.children[1]);lion.position.set(0,0,0);lion.rotation.y=0;e.arena.group.rotation.y=1.3;e.arena.group.updateMatrixWorld(true);
  d.setLock(true);for(let i=0;i<600;i++)d.update(STEP);assert.ok(frontError(e,[lion])<.002,'locked rope jumping is framed from the front: '+frontError(e,[lion]).toFixed(4));}
}
console.log('PASS camera front: ceremony framed from the front locked or not, player camera choice restored, rope front lock');
