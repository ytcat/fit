const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);e.fightOptions={seed:74};arena.setTarget('fight');const v=arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};
let events=0,body=0,largest=0;
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut'])for(const target of ['head','body']){
 for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;f.stun=0;f.down=0;f.condition=100;}
 m.result=null;m.phase='round';m.attack('lion',move,target);
 for(let i=0;i<95;i++){
  v.step();events+=v.contacts.length;body+=v.contacts.filter(c=>c.part==='body').length;
  for(const actor of ['lion','rabbit'])for(let k=0;k<2;k++){
   const c=v.coaches[actor],hit=v.collision(c.root.localToWorld(new THREE.Vector3(...c.metrics.gloves[k].knuckles)),actor==='lion'?'rabbit':'lion');
   largest=Math.max(largest,hit.penetration);
   assert.ok(hit.penetration<=.021,move+' '+target+' rendered fist must stop in padding through the complete follow-through and recovery '+JSON.stringify({i,actor,k,penetration:hit.penetration,part:hit.part,time:m.time,travel:v.travelTime}));
   assert.ok(c.metrics.hands[k].every(Number.isFinite));
  }
 }
}
assert.ok(events>=8&&body>=4,'geometric constraints must retain genuine body hits and guarded contacts');
const victim=m.fighters.rabbit;victim.action=null;victim.reaction=null;victim.damage={left:0,right:0,body:0};m.phase='round';m.fighters.lion.action=null;
const throw1=m.attack('lion','cross','head');assert.equal(victim.damage.left,0);m.contact({actor:'lion',action:throw1.id,part:'glove',speed:5,side:-1});assert.equal(victim.damage.left,0,'blocks cannot bruise a face');
m.fighters.lion.action=null;const throw2=m.attack('lion','cross','head');m.contact({actor:'lion',action:throw2.id,part:'head',speed:5,side:-1,direction:[0,0,-1]});assert.ok(victim.damage.left>0&&victim.damage.right===0,'damage must accumulate only on the actual contact side');
victim.reaction=null;v.pose();const neutral=v.coaches.rabbit.joints.head.getWorldPosition(new THREE.Vector3());
victim.reaction={time:m.time-.045,part:'head',move:'cross',severity:1,side:-1,direction:[0,0,-1]};v.pose();const displaced=v.coaches.rabbit.joints.head.getWorldPosition(new THREE.Vector3());
const backward=new THREE.Vector3(0,0,-1).applyQuaternion(v.coaches.rabbit.root.getWorldQuaternion(new THREE.Quaternion()));assert.ok(displaced.clone().sub(neutral).dot(backward)>.035,'head shot must visibly recoil away from the attacker in arena space');
console.log('PASS bounded rendered glove intrusion across 12 strikes/targets and recovery, real hits, contact-side damage, and head recoil',{events,body,largest});
