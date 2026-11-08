const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;const coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);e.fightOptions={seed:74};arena.setTarget('fight');const v=arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};


const summaries=[];let minOfficial=Infinity;
for(const actor of ['lion','rabbit'])for(const move of ['jab','cross'])for(const situation of ['body','open_head','blocked_head']){
 arena.setTarget('fight');const v=arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};
 for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.tempo=1;f.reaction=null;}
 const receiver=actor==='lion'?'rabbit':'lion';
 if(situation==='open_head')m.fighters[receiver].action={id:900,actor:receiver,move:'guard',guardStyle:'body',start:-1.75,duration:5,attack:false,defend:true};
 const action=m.attack(actor,move,situation==='body'?'body':'head'),c=v.coaches[actor],side=move==='jab'?'L':'R';let peak=0,peakAt=0,span=0,push=0,maxFoot=0;const events=[];
 for(let i=0;i<75;i++){
  v.step();const a=c.point(c.joints['arm'+side]),b=c.point(c.joints['elbow'+side]),d=c.point(c.joints['hand'+side]);
  const angle=THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(d.clone().sub(b)));if(angle>peak){peak=angle;peakAt=m.time;}span=Math.max(span,a.distanceTo(d)/(c.joints['elbow'+side].position.length()+c.joints['hand'+side].position.length()));events.push(...v.contacts);
  for(const model of Object.values(v.coaches)){
   maxFoot=Math.max(maxFoot,...model.metrics.footTargets.map(f=>f.error));
   minOfficial=Math.min(minOfficial,Math.hypot(model.root.position.x-1.13,model.root.position.z+.83));
   for(const s of ['L','R']){const forearm=model.point(model.joints['hand'+s]).sub(model.point(model.joints['elbow'+s])).normalize(),distal=new THREE.Vector3(0,-1,0).applyQuaternion(model.joints['hand'+s].getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(model.root.getWorldQuaternion(new THREE.Quaternion()).invert());assert.ok(forearm.dot(distal)>.99999,'neutral wrist');}
  }
  const offset=v.impactOffset(receiver);assert.ok(offset.length()<=.110001,'bounded impulse');if(m.fighters[receiver].reaction?.pushDirection)push=Math.max(push,offset.dot(new THREE.Vector3(...m.fighters[receiver].reaction.pushDirection)));
 }
 const clean=events.filter(e=>e.legal);assert.ok(maxFoot<.002,'reachable planted feet '+JSON.stringify({actor,move,situation,maxFoot}));assert.ok(peak<178,'no elbow lock');
 if(situation!=='blocked_head'){assert.ok(clean.length===1,'exactly one real clean contact '+JSON.stringify({actor,move,situation,events}));assert.ok(peak>=160&&span>=.98,'clean straight must visibly extend '+JSON.stringify({actor,move,situation,peak,span}));assert.ok(push>.025,'registered clean hit drives receiver back');}
 else assert.ok(events.length===1&&events[0].blocked,'guard must intercept instead of being punched through');
 summaries.push({actor,move,situation,peak,peakAt,contactAt:events[0]?.time,span,push,maxFoot});
}
// Start beside the reserved referee corner; inspect final roots, not merely
// the travel waypoints. This also exercises diagonal impact directions.
for(const actor of ['lion','rabbit'])for(const move of ['jab','cross']){
 arena.setTarget('fight');const corner=arena.fightView,m=corner.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.tempo=1;}
 corner.ringTravel=()=>Object.fromEntries([['lion',new THREE.Vector3(.45,0,-.33)],['rabbit',new THREE.Vector3(-.50,0,.60)]].map(([a,p])=>[a,{from:p,to:p.clone(),phase:.5,ease:.5,weight:1}]));corner.footPlants={};corner.pose();m.attack(actor,move,'body');
 for(let i=0;i<75;i++){corner.step();for(const model of Object.values(corner.coaches)){minOfficial=Math.min(minOfficial,Math.hypot(model.root.position.x-1.13,model.root.position.z+.83));assert.ok(model.metrics.footTargets.every(f=>f.error<.002),'corner foot reach');assert.ok(Math.abs(model.root.position.x)<1.25&&Math.abs(model.root.position.z)<1.25,'inside ropes');}}
}
assert.ok(minOfficial>.74,'posed fighters leave room for referee');
// Boundary capacity is in arena coordinates; offset magnitude may be either
// a unit step direction or the complete displacement (fractional capacity).
const limiter=arena.fightView;assert.ok(Math.abs(limiter.travelCapacity(new THREE.Vector3(0,0,-.8),new THREE.Vector3(0,0,-1))-.08)<1e-9);assert.equal(limiter.travelCapacity(new THREE.Vector3(1.2,0,0),new THREE.Vector3(1,0,0)),0);
arena.setTarget('fight');const miss=arena.fightView;miss.match.phase='round';miss.match.decide=()=>{};for(const f of Object.values(miss.match.fighters)){f.next=Infinity;f.action=null;}miss.target=()=>new THREE.Vector3(-1.4,2.2,1.6);miss.match.attack('lion','jab','head');for(let i=0;i<75;i++)miss.step();assert.equal(miss.match.totals.lion.landed,0);assert.equal(miss.impactOffset('rabbit').length(),0,'miss cannot create impact recoil');
console.log('PASS native straight extension, neutral wrists, clean recoil, blocked stops, planted feet, referee space and misses',{summaries,minOfficial});

if(process.env.STRAIGHT_REPORT)fs.writeFileSync(process.env.STRAIGHT_REPORT,JSON.stringify({summaries,minOfficial},null,2));
