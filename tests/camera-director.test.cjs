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
const points=e=>{const out=[],v=e.arena.fightView,nodes=e.arena.mode==='fight'?[v.coaches.lion.root,v.coaches.rabbit.root]:e.arena.mode==='none'?[e.coach.root]:[e.coach.root,e.arena.models[e.arena.mode]];e.arena.group.updateMatrixWorld(true);for(const n of nodes){const p=n.getWorldPosition(V());out.push(p);}return out;};
// Every subject, from the floor to raised ears, with half a body of slack along the line between them.
function framed(e){const c=e.camera,p=points(e),a=p[0],b=p[1]||p[0],d=b.clone().sub(a);d.y=0;if(d.lengthSq()<1e-6)d.set(1,0,0);d.normalize();c.updateMatrixWorld(true);c.updateProjectionMatrix();c.matrixWorldInverse.copy(c.matrixWorld).invert();let worst=0;
 for(const [base,sign] of [[a,-1],[b,1]])for(const y of [0,2.3])for(const reach of [0,.45]){const n=base.clone().addScaledVector(d,sign*reach).setY(y).project(c);worst=Math.max(worst,Math.abs(n.x),Math.abs(n.y));}return worst;}
function sideError(e){const c=e.camera,p=points(e),mid=p[0].clone().add(p[1]).multiplyScalar(.5),d=p[1].clone().sub(p[0]).setY(0).normalize(),o=c.position.clone().sub(mid).setY(0).normalize();return Math.abs(o.dot(d));}

for(const aspect of [.54,2.21,2.9]){
 const e=world(aspect),d=e.cameraDirector,c=e.camera,v=e.viewControls,lion=e.arena.fightView.coaches.lion.root,rabbit=e.arena.fightView.coaches.rabbit.root,free=c.position.clone();
 assert.equal(d.update(STEP),false,'an unlocked camera is left alone');assert.ok(c.position.distanceTo(free)<1e-9);
 d.setLock(true);assert.equal(stored.get('gotr-side-camera'),'1','the lock is remembered');
 // A whole exchange: the fighters circle, close, separate and bob at sub-centimetre scale.
 let worst=0,jerk=0,height=0,low=9;const trail=[];
 for(let i=0;i<900;i++){
  const t=i*STEP,spin=.35*t,gap=.6+.4*Math.sin(t*.9),noise=.004*Math.sin(i*2.7);
  lion.position.set(-gap*Math.cos(spin)+noise,0,-gap*Math.sin(spin));rabbit.position.set(gap*Math.cos(spin),0,gap*Math.sin(spin)-noise);
  d.update(STEP);trail.push(c.position.clone());
  if(i>=90){worst=Math.max(worst,framed(e));height=Math.max(height,Math.abs(c.position.y-1.82));low=Math.min(low,c.position.y);assert.ok(sideError(e)<.2,'stays side-on while the fighters circle (aspect '+aspect+', frame '+i+')');}
  if(i>=92)jerk=Math.max(jerk,trail[i].clone().sub(trail[i-1]).sub(trail[i-1].clone().sub(trail[i-2])).length());
 }
 assert.ok(worst<.97,'both fighters stay fully framed at aspect '+aspect+': worst edge '+worst.toFixed(3));
 // On a wide screen the camera keeps the fight camera's height. On a narrow one it stands further back,
 // behind the grandstand, so it rises with distance to see over it - never lower, and below the lighting truss.
 if(aspect>1)assert.ok(height<1e-6,'camera height (tilt) is locked');else{assert.ok(low>=1.82&&height<2.1,'portrait camera rises over the grandstand: '+low.toFixed(2)+'..'+(1.82+height).toFixed(2));
  const far=Math.hypot(c.position.x,c.position.z);assert.ok(c.position.y*(6.16-1.74)/(far-1.74)>1.83||far<6.2,'the sight line to the near ring edge clears the last grandstand row');}assert.ok(jerk<.0025,'no judder: frame-to-frame change of camera velocity '+(jerk*1000).toFixed(2)+' mm');
 // Standing still, the view settles to a true side view and then does not move at all.
 for(let i=0;i<400;i++)d.update(STEP);assert.ok(sideError(e)<.002,'perpendicular to the line between the fighters');const still=c.position.clone();assert.equal(d.update(STEP),false,'a settled lock requests no redraw');assert.ok(c.position.distanceTo(still)<1e-9);
 // Orbit and tilt gestures do nothing; zoom still works, within limits.
 const yaw=v.yaw;v.rotate(.4);assert.equal(v.yaw,yaw,'orbit drag is ignored while locked');d.update(STEP);assert.ok(c.position.distanceTo(still)<1e-9);
 v.zoom(1.3);assert.ok(Math.abs(c.zoom-1.3)<1e-9,'zoom still works while locked');d.update(STEP);assert.ok(Math.abs(c.zoom-1.3)<1e-9,'the lock does not fight a manual zoom');v.zoom(.001);assert.equal(c.zoom,.55);v.zoom(100);assert.equal(c.zoom,1.85);v.zoom(1/1.85);
 // Station changes keep the lock: fighter and bag, then a solo drill.
 const bag=new THREE.Group();e.arena.mode='heavy';e.arena.models.heavy=bag;e.arena.group.remove(rabbit);e.arena.group.add(bag);e.arena.group.rotation.y=1.88;lion.position.set(0,0,-.675);bag.position.set(0,0,.82);
 for(let i=0;i<500;i++)d.update(STEP);assert.equal(d.mode,'lock');assert.ok(sideError(e)<.002,'side-on to fighter and bag');assert.ok(framed(e)<.97,'fighter and bag framed at aspect '+aspect);
 e.arena.mode='rope';for(let i=0;i<500;i++)d.update(STEP);const facing=V(Math.sin(1.88),0,Math.cos(1.88)),off=c.position.clone().sub(lion.getWorldPosition(V())).setY(0).normalize();assert.ok(off.dot(facing)>.98,'rope jumping is seen from the front of the boxer (GOTR-0047; was side-on)');
 // Unlocking eases back to exactly the free camera the player had.
 d.setLock(false);assert.equal(stored.get('gotr-side-camera'),'0');let frames=0;while(d.mode!=='free'&&frames++<240)d.update(STEP);assert.equal(d.mode,'free');
 const o=v.offset.clone().applyAxisAngle(V(0,1,0),v.yaw);assert.ok(c.position.distanceTo(v.target.clone().add(o))<1e-9,'free camera restored');assert.equal(c.zoom,1,'free zoom restored');assert.ok(frames<120);
 v.rotate(.2);assert.ok(Math.abs(v.yaw-yaw+.2)<1e-9,'orbit works again');
}

// Fight intro: one full turn that closes in and ends exactly on the fight framing, then the bell.
for(const [aspect,locked] of [[.54,false],[2.21,false],[2.21,true],[.54,true]]){
 const e=world(aspect),d=e.cameraDirector,c=e.camera,v=e.viewControls;d.setLock(locked,true);if(locked)for(let i=0;i<600;i++)d.update(STEP);
 const end=c.position.clone(),view=e.arena.fightView;e.arena.fightView={coaches:view.coaches,match:{phase:'intro',time:0}};
 let turned=0,held=0,previous=null,last=null,maxStep=0,frames=0;
 while(frames++<1000){
  d.update(STEP);if(d.mode!=='intro')break;if(d.holdsClock)held+=STEP;
  const angle=Math.atan2(c.position.x,c.position.z),radius=Math.hypot(c.position.x,c.position.z);
  if(previous!==null){let step=angle-previous;step-=Math.round(step/(2*Math.PI))*2*Math.PI;turned+=step;}previous=angle;
  if(last)maxStep=Math.max(maxStep,c.position.distanceTo(last));last=c.position.clone();
  assert.ok(radius>3,'the orbit stays outside the ring');assert.ok(radius<13.5,'the orbit stays near the arena');
  assert.ok(c.position.y<3.9||radius>6.9,'the camera passes below the lighting truss (y '+c.position.y.toFixed(2)+' at radius '+radius.toFixed(2)+')');assert.ok(c.position.y>=1.8,'never below the fight camera height');
 }
 const seconds=(frames-1)*STEP;assert.ok(Math.abs(seconds-INTRO.seconds)<.05,'intro lasts about five seconds: '+seconds.toFixed(2));
 assert.ok(Math.abs(Math.abs(turned)-2*Math.PI)<.2,'a full 360 degree turn: '+(Math.abs(turned)*180/Math.PI).toFixed(0)+' degrees');
 assert.ok(Math.abs(held-(INTRO.seconds-3))<.05,'the clock is held until only the three-second countdown is left');assert.equal(d.holdsClock,false);
 assert.ok(c.position.distanceTo(end)<(locked?.02:1e-9),'ends on the '+(locked?'locked side view':'normal fight framing')+' without a jump: '+c.position.distanceTo(end));
 assert.ok(c.position.distanceTo(last)<.01,'the last intro frame already sits on the final view');assert.ok(maxStep<.45,'no jump during the orbit');assert.equal(d.mode,locked?'lock':'free');
 // A tap skips: the clock is released at once and the camera takes the short way home.
 e.arena.fightView={coaches:view.coaches,match:{phase:'intro',time:0}};for(let i=0;i<60;i++)d.update(STEP);assert.equal(d.mode,'intro');const before=c.position.clone();
 assert.equal(d.skipIntro(),true);assert.equal(d.holdsClock,false);d.update(STEP);assert.ok(c.position.distanceTo(before)<.6,'skipping does not cut the camera');
 let wait=0;while((locked?c.position.distanceTo(end)>.02:d.mode!=='free')&&wait++<400)d.update(STEP);assert.ok(wait<300,'skip settles quickly');assert.ok(c.position.distanceTo(end)<.021);assert.equal(d.skipIntro(),false);
 // No intro for a bout that is already under way, or for reduced motion.
 e.arena.fightView={coaches:view.coaches,match:{phase:'round',time:6}};d.update(STEP);assert.notEqual(d.mode,'intro');
 reduced=true;e.arena.fightView={coaches:view.coaches,match:{phase:'intro',time:0}};d.update(STEP);assert.notEqual(d.mode,'intro','reduced motion skips the orbit');assert.equal(d.holdsClock,false);reduced=false;
}

// A remembered lock starts locked; a preset view button releases it.
stored.set('gotr-side-camera','1');{const e=world(1.6),d=e.cameraDirector;assert.equal(d.locked,true);d.update(STEP);assert.equal(d.mode,'lock');e.viewControls.preset(Math.PI/2,1.15);assert.equal(d.locked,false);assert.equal(d.mode,'free');}

// The engine loop holds simulation time while the intro asks it to.
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('      animate() {'),body=html.slice(start+'      animate() {'.length).split('\n      }')[0],animate=new Function(body);
global.requestAnimationFrame=()=>{};global.document={hidden:false};let updates=0;
const loop={animate(){},clock:{getDelta:()=>.016},isPlaying:true,animTime:0,speed:1,activeModel:{uuid:'lion',rotation:{y:0}},coach:{},arena:{mode:'fight',group:{rotation:{y:0}},update(){return {contacts:[]};}},camera:{aspect:.6,zoom:1},viewControls:{yaw:0},technique:'fight',currentAnim:'',world:{update(){}},renderer:{render(){}},updateQuality(){},cameraDirector:{holdsClock:true,update(){updates++;}}};loop.demoModel=loop.activeModel;
animate.call(loop);animate.call(loop);assert.equal(loop.animTime,0,'the fight clock does not run during the intro hold');assert.equal(updates,2);loop.cameraDirector.holdsClock=false;animate.call(loop);assert.ok(loop.animTime>0);
for(const lang of ['en','he','ru'])for(const key of ['lock','label','skip'])assert.ok(window.CameraDirection.WORDS[lang][key].length>2,lang+' '+key);
console.log('PASS side-view lock (framing, perpendicular, tilt and orbit locked, zoom, stations, restore) and fight intro (360 turn, clock hold, exact end, skip, reduced motion)');
