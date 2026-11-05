const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;const coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);e.fightOptions={seed:74};arena.setTarget('fight');const v=arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};

let maximum=0,worst=null,failures=0,largestTurn=0,worstTurn=null;const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
for(const offset of [0,.08,-.08])for(const lead of moves)for(const rear of moves){
 for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;f.stun=0;f.down=0;f.condition=100;f.stamina=1;f.tempo=1;}m.result=null;m.phase='round';
 m.attack('lion',lead,offset<0?'head':'body');const trade=m.attack('rabbit',rear,'head');trade.start+=offset;
 let previousArms=null;for(let frame=0;frame<90;frame++){
  v.step();
  const arms=['lion','rabbit'].flatMap(actor=>['L','R'].map(side=>v.coaches[actor].joints['arm'+side].quaternion.clone()));
  if(previousArms)arms.forEach((q,index)=>{const turn=q.angleTo(previousArms[index]);if(turn>largestTurn){largestTurn=turn;worstTurn={offset,lead,rear,frame,index};}});previousArms=arms;
  for(const actor of ['lion','rabbit'])for(const side of ['L','R']){
   const c=v.coaches[actor],elbow=c.joints['elbow'+side].getWorldPosition(new THREE.Vector3()),wrist=c.joints['hand'+side].getWorldPosition(new THREE.Vector3()),i=side==='R'?1:0;
   const samples=[{p:c.root.localToWorld(new THREE.Vector3(...c.metrics.gloves[i].knuckles)),r:.078},... [.35,.65,1].map(t=>({p:elbow.clone().lerp(wrist,t),r:t===1?.05:.052}))];
   for(const s of samples){const hit=v.collision(s.p,actor==='lion'?'rabbit':'lion',{bodyOnly:true,radius:s.r});if(hit.penetration>maximum){maximum=hit.penetration;worst={offset,lead,rear,actor,side,frame,part:hit.part};}if(hit.penetration>.027)failures++;}
  }
 }
}
console.log({maximum,worst,failures,largestTurn,worstTurn});assert.ok(maximum<.027,'simultaneous hands and forearms must stay out of torso and head');
// Engineering continuity gate, not a medical joint limit: allow a fast strike
// plus bounded contact deflection, but reject the former ~180° frame reversal.
assert.ok(largestTurn<Math.PI/3,'simultaneous contacts must not reverse an upper arm between adjacent 60 Hz frames');
