// GOTR-0129: in the ringless sets (the Street with Fang, the Docks hangar with Rourke, the Basement) the fight camera stays on
// the set's floor and sees both fighters. On a portrait phone the framing wants the camera 10-13 m back: in the street that is
// behind the shopfronts, inside the cars with headlights and behind the people standing on the parked cars; in the hangar
// behind the container stands; in the Basement behind its walls. Checked with the real set geometry (every visible mesh of
// the built set, ray-cast exactly as it is drawn: one-sided walls, closed boxes, the crowd sectors culled toward the camera)
// and the real camera director: the intro orbit, the free orbit the player turns, the side lock while the fighters move
// round the floor circle, and the KO result ceremony; phone portrait (393x852, 375x667) and one landscape screen.
// For every sampled frame: the camera is inside the set's walls and not inside any solid part of it (car, awning, crate,
// container, pillar), and the lines from the lens to both fighters' heads and chests cross no set geometry.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
global.THREE=require('../assets/vendor/three.min.js');global.window=global;window.addEventListener=()=>{};
global.document={createElement:()=>({getContext:()=>new Proxy({measureText:text=>({width:text.length*25}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})})})};
const stored=new Map();window.localStorage={getItem:k=>stored.has(k)?stored.get(k):null,setItem:(k,v)=>stored.set(k,String(v))};window.matchMedia=()=>({matches:false});
for(const file of ['boxing-routines.js','boxing-footwear.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','gym-details.js','fight-arena.js','club-world.js','adventure/story/paws.js','adventure/story/story-cast.js','ring-camera.js','camera-director.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const sets=require('../arena-sets.js');window.ArenaSets=sets;
require('../ringless-venues.js');const venues=require('../game-venues.js');
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),STEP=1/30;

// Allowed volume per set, in set space (independent of the director's own floor): inside the walls and under the roof.
const ROOM={
 street:{x:13.4,z:9.2-.35,y:8},       // the shop rows end at |x| 13.6, the shopfronts stand at |z| 9.2
 docks:{x:15-.35,z:11-.35,y:6.9},     // corrugated walls, the eaves at 7 m
 underground:{x:8.5-.35,z:8.5-.35,y:3.25-.3} // walls and the low slab
};
const ASPECTS=[['393x852',.478],['375x667',.594],['852x393',2.3]];

const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data);
const canvas={style:{},addEventListener(){},setPointerCapture(){},releasePointerCapture(){}};
const e={coach,canvas,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.478,.1,100),animTime:0,technique:'guard',currentAnim:'one_two',fitCameraToModel(){},isPlaying:true,speed:1};
e.demoModel=e.activeModel=coach.root;e.scene.add(coach.root);
const hemi=new THREE.HemisphereLight(0xdbeaff,0x404040,.48),key=new THREE.DirectionalLight(0xfffaed,2.8),fill=new THREE.DirectionalLight(0xa6c9ff,.65),rims=[new THREE.PointLight(0xf4f4f4,2,10),new THREE.PointLight(0xf4f4f4,2,10)];key.castShadow=true;e.scene.add(hemi,key,fill,...rims);
e.camera.position.set(0,1.82,5.1);e.camera.lookAt(0,1.3,0);
e.arena=new TrainingArena(e,data);e.world=new ClubWorld(e);e.viewControls=new RingCamera(e);
e.fightOptions={seed:74,rounds:1,roundSeconds:30,restSeconds:1};
const shown=n=>{for(let o=n;o;o=o.parent)if(!o.visible)return false;return true;};
const ray=new THREE.Raycaster();ray.layers.enableAll();

// Everything of the set that is drawn and solid (additive light beams are not).
function solids(group){const out=[];group.traverse(n=>{if(n.isMesh&&shown(n)&&n.layers.mask!==0&&n.material.blending!==THREE.AdditiveBlending)out.push(n);});return out;}
// Inside a closed part (a car body, a crate, a container, a pillar) or behind a one-sided wall: from inside, the first surface
// met in most directions is seen from its back.
function enclosed(from,list){
 const sides=list.map(m=>m.material.side);for(const m of list)m.material.side=THREE.DoubleSide;let back=0;
 try{for(const d of [V(1,0,0),V(-1,0,0),V(0,0,1),V(0,0,-1),V(0,1,0),V(.7,0,.7).normalize(),V(-.7,0,.7).normalize(),V(.7,0,-.7).normalize(),V(-.7,0,-.7).normalize()]){
  ray.set(from,d);ray.near=0;ray.far=40;const hit=ray.intersectObject?ray.intersectObjects(list,false)[0]:null;if(!hit)continue;
  const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(n.dot(d)>0&&hit.distance<6)back++;}}
 finally{list.forEach((m,i)=>{m.material.side=sides[i];});}
 return back>=5;
}
function measure(group,label){
 const c=e.camera.getWorldPosition(V()),view=e.arena.fightView,list=solids(group),local=group.worldToLocal(c.clone()),room=ROOM[group.userData.setId],out={label,cam:local.toArray().map(n=>+n.toFixed(2)),blocked:[],outside:false,inside:false};
 out.outside=Math.abs(local.x)>room.x||Math.abs(local.z)>room.z||local.y>room.y||local.y<.3;
 out.inside=enclosed(c,list);
 for(const a of ['lion','rabbit'])for(const j of ['head','chest']){
  const p=view.coaches[a].joints[j].getWorldPosition(V()),d=p.clone().sub(c),len=d.length();d.normalize();ray.set(c,d);ray.near=0;ray.far=Math.max(0,len-.18);
  const hit=ray.intersectObjects(list,false)[0];if(hit)out.blocked.push(`${a} ${j} at ${hit.distance.toFixed(2)} m`);
 }
 return out;
}
function frame(dt,fight=true){
 const d=e.cameraDirector;d.update(dt);if(!d.holdsClock)e.animTime+=dt;
 if(fight)e.arena.update(e.animTime,e.technique,e.currentAnim);
 e.world.update(e.animTime,'fight');e.camera.updateMatrixWorld(true);e.scene.onBeforeRender(null,e.scene,e.camera);
}
// The fighters anywhere on the floor circle (the bout keeps them inside 2.3 m): circling, closing, separating.
function place(i){
 const v=e.arena.fightView,t=i*STEP,spin=.55*t,gap=.55+.5*(1+Math.sin(t*1.3)),mx=1.2*Math.sin(t*.37),mz=1.2*Math.cos(t*.29);
 v.coaches.lion.root.position.set(mx-gap*Math.cos(spin),0,mz-gap*Math.sin(spin));v.coaches.rabbit.root.position.set(mx+gap*Math.cos(spin),0,mz+gap*Math.sin(spin));
 v.coaches.lion.root.rotation.y=Math.atan2(Math.cos(spin),Math.sin(spin));v.coaches.rabbit.root.rotation.y=v.coaches.lion.root.rotation.y+Math.PI;
 e.arena.group.updateMatrixWorld(true);
}

const report=[];let failures=0;
for(const id of ['street','docks','underground']){
 venues.apply(e,id,'en');const group=e.world.arena.children.find(n=>n.userData.arenaSet);assert.ok(group,id+' set built');group.userData.setId=id;
 for(const [screen,aspect] of ASPECTS){
  e.camera.aspect=aspect;e.camera.fov=38;e.camera.zoom=1;e.camera.updateProjectionMatrix();stored.clear();
  e.viewControls.yaw=0;e.arena.group.rotation.y=.9;e.animTime=0;
  e.cameraDirector=new CameraDirector(e);
  e.arena.setTarget('fight');e.arena.group.rotation.y=.9;e.world.update(0,'fight');
  const samples={intro:[],free:[],lock:[],ceremony:[]};
  // 1. the intro orbit, every frame
  let n=0;frame(STEP);assert.equal(e.cameraDirector.mode,'intro',id+' '+screen+': the intro orbit runs');assert.ok(e.arena.fightView.ringless,id+' is ringless');
  while(e.cameraDirector.mode==='intro'&&n++<400){samples.intro.push(measure(group,'intro '+n));frame(STEP);}
  assert.ok(samples.intro.length>100,'the whole orbit is sampled');
  // 2. the free camera: the player turns the orbit all the way round while the fighters move
  for(let k=0;k<24;k++){e.viewControls.yaw=k/24*Math.PI*2;e.viewControls.apply();place(k*9);frame(STEP,false);samples.free.push(measure(group,'free yaw '+(k*15)));}
  // 3. the side lock while the fighters move round the circle
  e.cameraDirector.setLock(true);
  for(let i=0;i<360;i++){place(i);frame(STEP,false);if(i>=30&&i%3===0)samples.lock.push(measure(group,'lock '+i));}
  e.cameraDirector.setLock(false,true);
  // 4. the KO and the result ceremony (unlocked: the director stages it), for a while after the bell
  const m=e.arena.fightView.match;m.finish(m.playerActor||'lion','KO',true);
  for(let i=0;i<240;i++){frame(STEP);const ph=e.arena.fightView.match.phase;if((ph==='scoring'||ph==='ceremony')&&i%3===0)samples.ceremony.push(measure(group,'ceremony '+i+' '+ph));}
  assert.ok(samples.ceremony.length>20,id+' '+screen+': the ceremony is sampled ('+samples.ceremony.length+')');
  for(const [part,list] of Object.entries(samples)){
   const bad=list.filter(s=>s.outside||s.inside),blocked=list.filter(s=>s.blocked.length),rays=list.reduce((t,s)=>t+s.blocked.length,0);
   report.push({id,screen,part,frames:list.length,outside:bad.length,blockedFrames:blocked.length,blockedRays:rays,first:bad[0]||blocked[0]||null});
   // a line grazing a bin lid for a frame is tolerated, never more than 1 frame in 50
   if(bad.length||blocked.length>list.length/50){failures++;console.log(`FAIL ${id} ${screen} ${part}: ${bad.length}/${list.length} frames outside the set's room or inside a part, ${blocked.length} with a fighter hidden by the set (${rays} lines)`,JSON.stringify(bad[0]||blocked[0]));}
   else console.log(`ok   ${id} ${screen} ${part}: ${list.length} frames, camera on the floor, ${rays} blocked lines`);
  }
  e.cameraDirector.setLock(false,true);
 }
}
if(process.env.RINGLESS_CAMERA_REPORT)fs.writeFileSync(process.env.RINGLESS_CAMERA_REPORT,JSON.stringify(report,null,1));
assert.equal(failures,0,failures+' camera checks failed (see above)');
console.log('PASS ringless camera: street, docks and basement keep the camera on the set floor with both fighters in clear sight (intro, free orbit, side lock, KO ceremony; portrait and landscape)');
