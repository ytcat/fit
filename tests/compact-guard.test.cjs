// GOTR-0051 compact guard: in the idle guard of every mode and both species both arms are bent (elbow <= 105 deg),
// each glove is close to the face (its padding <= 12 cm from the skull/muzzle surface), the forearm rises to the glove,
// no glove pad is inside the head, and the lead glove is ahead of the rear one.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','training-gear.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function engine(species){const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);if(species==='rabbit')e.roster.select('rabbit');return e;}
// Gap between the glove padding (centre 12 cm past the wrist, radius 9 cm) and the nearest face volume (skull, muzzle).
const faceGap=p=>Math.min(...[[0,.13,.03,.17,.20,.17],[0,.065,.195,.135,.105,.125]].map(([cx,cy,cz,rx,ry,rz])=>(Math.hypot((p.x-cx)/rx,(p.y-cy)/ry,(p.z-cz)/rz)-1)*Math.min(rx,ry,rz)))-.09;
function measure(c){
 c.root.updateMatrixWorld(true);const W=n=>c.joints[n].getWorldPosition(V()),out={};
 for(const [side,sign] of [['L',-1],['R',1]]){
  const a=W('arm'+side),b=W('elbow'+side),h=W('hand'+side),glove=c.joints['hand'+side].localToWorld(V(0,-.12,0));
  // Deepest glove pad sample inside the skull or muzzle volume (same volumes as the game's own face clearance).
  let inside=0;const toHead=new THREE.Matrix4().copy(c.joints.head.matrixWorld).invert();
  for(const [x,y,z,r] of [[0,.015,0,.077],[0,-.07,0,.089],[0,-.145,0,.099],[0,-.195,0,.068]]){const p=c.joints['hand'+side].localToWorld(V(x,y,z)).applyMatrix4(toHead);for(const [cx,cy,cz,rx,ry,rz] of [[0,.13,.03,.17,.20,.17],[0,.065,.195,.135,.105,.125]]){const k=Math.hypot((p.x-cx)/(rx+r),(p.y-cy)/(ry+r),(p.z-cz)/(rz+r));inside=Math.max(inside,(1-k)*Math.min(rx,ry,rz));}}
  out[side]={elbow:THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(h.clone().sub(b))),cheek:faceGap(glove.clone().applyMatrix4(toHead)),rise:h.y-b.y,inside};
 }
 out.lead=c.point(c.joints.handL).z-c.point(c.joints.handR).z;return out;
}
const lines=[];
function check(label,c){
 const m=measure(c);
 for(const side of ['L','R']){const s=m[side];
  assert.ok(s.elbow<=105&&s.elbow>=25,label+' '+side+': elbow bent '+s.elbow.toFixed(0)+' deg (25-105)');
  assert.ok(s.cheek<=.12,label+' '+side+': glove padding '+(s.cheek*100).toFixed(1)+' cm from the face (<= 12)');
  assert.ok(s.rise>=.12,label+' '+side+': forearm rises to the glove '+s.rise.toFixed(2));
  assert.ok(s.inside<=.03,label+' '+side+': glove not inside the head ('+(s.inside*100).toFixed(1)+' cm)');}
 assert.ok(m.lead>=.06,label+': lead glove ahead of the rear by '+(m.lead*100).toFixed(1)+' cm (>= 6)');
 lines.push(label+' elbows '+m.L.elbow.toFixed(0)+'/'+m.R.elbow.toFixed(0)+' face gap cm '+(m.L.cheek*100).toFixed(1)+'/'+(m.R.cheek*100).toFixed(1)+' lead '+(m.lead*100).toFixed(0));
}
for(const species of ['lion','rabbit']){
 for(const mode of ['none','heavy','pads','rabbit']){
  const e=engine(species);e.targetMode=mode;e.player.setEnabled(true);e.arena.setTarget(mode);let t=0;for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t,'combo','one_two');}
  check(species+' '+mode,e.coach);
  // The opponent's idle guard (a braced block uses the blocking cover, which is allowed to differ).
  if(mode==='rabbit'){e.player.setEnabled(false);const p=e.arena.rabbit;p.update(0,'guard','one_two',{stance:1,keepFaceClear:true,simulationTime:99});p.update(0,'guard','one_two',{stance:1,keepFaceClear:true,simulationTime:99.01});check(species+' sparring opponent',p);}
 }
 const e=engine(species);e.targetMode='fight';e.fightOptions={preset:'quick',seed:5};e.arena.setTarget('fight');const v=e.arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;}for(let i=0;i<30;i++)v.step();
 for(const actor of ['lion','rabbit'])check(species+' fight '+actor,v.coaches[actor]);
}
console.log('PASS compact guard in every mode: '+lines.join('; '));
