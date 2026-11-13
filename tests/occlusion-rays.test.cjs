// GOTR-0073: nothing between the camera and the Fighter / Coach / target, at every station and in the fight, wherever the
// camera stands. For each station the camera goes round the figures (every 15 degrees: this covers the free orbit, the
// side lock on either side and the rope's front lock) at the distances and heights a tall phone screen produces, the
// room applies its own cutaway, the occlusion guard runs, and then real triangle ray casts (independent of the guard's
// bounding-box logic) go from the camera to the head, chest and feet of every figure and to the target's centre.
// A control run without the guard must find blocked lines (otherwise the test proves nothing).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js','club-world.js','camera-director.js','occlusion-guard.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),c0=new LionCoach(data),e={coach:c0,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.58,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){},speed:1};
e.demoModel=e.activeModel=c0.root;e.scene.add(c0.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);e.world=new ClubWorld(e);const guard=new OcclusionGuard(e);
// every drawn scenery mesh (the figures and the station's own equipment live in the arena group, not in the room)
const scenery=()=>{const list=[];for(const root of [e.world.gym,e.world.arena])root.traverseVisible(n=>{if(n.isMesh&&n.layers.mask!==0)list.push(n);});return list;};
const rc=new THREE.Raycaster();
function blocked(points){const list=scenery(),from=e.camera.getWorldPosition(V()),out=[];
 for(const p of points){const d=p.clone().sub(from),far=d.length();rc.set(from,d.normalize());rc.far=far-.15;rc.near=0;
  for(const h of rc.intersectObjects(list,false)){// an instance the guard removed has a zero matrix and cannot be hit
   if(process.env.DEBUG_OCC){if(!h.object.geometry.boundingBox)h.object.geometry.computeBoundingBox();const bb=h.object.geometry.boundingBox.clone(),m=new THREE.Matrix4();if(h.instanceId!==undefined){h.object.getMatrixAt(h.instanceId,m);bb.applyMatrix4(m);}bb.applyMatrix4(h.object.matrixWorld);console.log('hit',h.object.name,h.instanceId,h.object.userData.wallZone,bb.getSize(V()).toArray().map(v=>+v.toFixed(2)),bb.getCenter(V()).toArray().map(v=>+v.toFixed(2)),'d',+h.distance.toFixed(2),'far',+far.toFixed(2));}
   out.push((h.object.name||h.object.type)+(h.instanceId!==undefined?'#'+h.instanceId:''));}}
 return [...new Set(out)];}
const fitDistance=CameraDirection.fitDistance,report={};
const STATIONS=['none','heavy','dummy','speed','rabbit','pads','rope','fight'];
let controlHits=0,worst=0;
for(const mode of STATIONS){
 e.targetMode=mode;e.fightOptions={seed:11,rounds:1,roundSeconds:30,restSeconds:2};e.arena.setTarget(mode);e.animTime=.4;e.arena.update(.4,mode==='fight'?'fight':'guard','one_two');e.scene.updateMatrixWorld(true);
 const fig=guard.figures(),pts=guard.points();assert.ok(pts.length>=4,mode+': figure points');if(['rabbit','pads','fight'].includes(mode))assert.equal(fig.coaches.length,2,mode+': two figures');if(['heavy','dummy','speed'].includes(mode))assert.ok(fig.target,mode+': target');
 const centre=pts.reduce((a,p)=>a.add(p),V()).multiplyScalar(1/pts.length);centre.y=1.2;
 // phone portrait (aspect 0.45-0.58) puts the camera 6-12.5 m away; the fight camera also rises with distance
 const distances=[...new Set([fitDistance(2.4,2.65,38,.58),fitDistance(3.2,2.95,38,.45),5.8,9,12.5].map(d=>+Math.min(12.5,d).toFixed(2)))],heights=mode==='fight'?[1.78,3.2,4.6]:[1.78,2.6];
 let views=0,hidden=0,hiddenMax=0,control=0;const names=new Set();
 for(const dist of distances)for(const cy of heights)for(let k=0;k<24;k++){const a=k*Math.PI/12;
  e.camera.position.set(centre.x+Math.sin(a)*dist,cy,centre.z+Math.cos(a)*dist);e.camera.lookAt(centre.x,Math.min(1.25,cy),centre.z);e.camera.updateMatrixWorld(true);
  e.world.update(e.animTime,mode);e.scene.updateMatrixWorld(true);
  guard.release();const before=blocked(pts);control+=before.length?1:0;for(const n of before)names.add(n.replace(/#\d+$/,''));
  const n=guard.update();e.scene.updateMatrixWorld(true);const after=blocked(pts);views++;hidden+=n;hiddenMax=Math.max(hiddenMax,n);
  assert.deepEqual(after,[],`${mode}: scenery between the camera and a figure (angle ${k*15} deg, distance ${dist} m, height ${cy} m)`);
  // never the figures, the target or the ring
  for(const c of fig.coaches){let q=c.root;for(;q;q=q.parent)assert.ok(q.visible,mode+': a figure was hidden');}
  if(fig.target)assert.ok(fig.target.visible,mode+': the active target was hidden');
  for(const child of e.arena.group.children)assert.ok(child.visible||child.userData.audienceSide!==undefined||/audience|crowd|spectator/i.test(child.name||''),mode+': station equipment hidden: '+(child.name||child.type));
 }
 controlHits+=control;worst=Math.max(worst,hiddenMax);report[mode]={views,blockedWithoutGuard:control,blockers:[...names].slice(0,8),hiddenPerView:+(hidden/views).toFixed(2),hiddenMax};
}
assert.ok(controlHits>20,'control: without the guard some views are blocked ('+controlHits+')');
assert.ok(report.dummy.blockedWithoutGuard>0&&report.pads.blockedWithoutGuard>0,'the owner\'s two stations are blocked without the guard');
assert.ok(worst<=40,'the guard hides a handful of props, not the room: '+worst);
// props come back when the line is clear again
{e.targetMode='dummy';e.arena.setTarget('dummy');e.arena.update(.4,'guard','one_two');const pts=guard.points(),centre=pts.reduce((a,p)=>a.add(p),V()).multiplyScalar(1/pts.length);
 let found=null;for(let k=0;k<24&&!found;k++){const a=k*Math.PI/12;e.camera.position.set(centre.x+Math.sin(a)*9,1.78,centre.z+Math.cos(a)*9);e.camera.updateMatrixWorld(true);e.world.update(.4,'dummy');e.scene.updateMatrixWorld(true);guard.release();if(guard.update()>0)found=a;}
 assert.ok(found!==null,'a blocked view exists at the dummy station');const held=[...guard.hidden.values()].map(x=>x.item);
 for(const it of held.filter(i=>i.index<0))assert.equal(it.node.visible,false,'occluder hidden');
 const clear=found+Math.PI;e.camera.position.set(centre.x+Math.sin(clear)*5,1.78,centre.z+Math.cos(clear)*5);e.camera.updateMatrixWorld(true);
 for(let i=0;i<40;i++){e.world.update(.4,'dummy');guard.update();}
 for(const it of held)assert.ok(!guard.hidden.has(it.key),'occluder released after the line is clear');
 // the Shop preview and lesson demos frame the stage themselves: the guard lets go of everything
 e.camera.position.set(centre.x+Math.sin(found)*9,1.78,centre.z+Math.cos(found)*9);e.camera.updateMatrixWorld(true);e.world.update(.4,'dummy');assert.ok(guard.update()>0);e.fightIQDemo={};assert.equal(guard.update(),0);assert.equal(guard.hidden.size,0,'released while suspended');e.fightIQDemo=null;}
console.log(JSON.stringify(report));console.log('PASS clear lines of sight to head, chest and feet at every station and in the fight, from every side and phone distance');
