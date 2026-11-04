// Variable practice must change pacing without inventing contacts or breaking IK.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r75.json'));
for(const file of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const {PracticeTimeline,RandomSparring}=BOXING_ROUTINES;
const a=new PracticeTimeline(74),b=new PracticeTimeline(74),other=new PracticeTimeline(75);
let rests=0;
for(let i=0;i<1200;i++){
 const t=i/30,f=a.frame(t,'combo','inside_work');assert.deepEqual(f,b.frame(t,'combo','inside_work'));
 assert.ok(f.phase>=0&&f.phase<1);if(f.rest){rests++;assert.equal(f.move,'guard');}else assert.equal(f.move,BOXING_ROUTINES.sequences.inside_work[f.slot]);
}
assert.ok(rests>50);assert.ok(new Set(a.events.map(e=>e.duration.toFixed(2))).size>8);
assert.ok(a.events.some(e=>e.gap===0)&&a.events.some(e=>e.gap>.7),'mix bursts with genuine guard pauses');
const first=a.frame(.3,'combo','inside_work');assert.deepEqual(first,new PracticeTimeline(74).frame(.3,'combo','inside_work'),'seeking must replay the same choreography');
assert.notDeepEqual(first,other.frame(.3,'combo','inside_work'));
const spar=new RandomSparring(16,'random');spar.frame(100);
const packets=spar.timeline.filter((e,i)=>e.move!=='guard'&&(i===0||spar.timeline[i-1].move==='guard'));
assert.ok(packets.some((e,i)=>i&&e.attacker===packets[i-1].attacker),'read/defend exchanges need not alternate attack ownership');
const pendulum=new SpeedBagPendulum();
assert.equal(pendulum.impact(new THREE.Vector3(0,-.17,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,-5)).impulse,0,'separating fist cannot add energy');
pendulum.impulse(new THREE.Vector3(22,0,0));let bounce=0;
for(let i=0;i<240;i++){pendulum.step(1/240);bounce+=pendulum.takeBounces().length;assert.ok(Math.hypot(pendulum.position.x,pendulum.position.z)<=pendulum.limit+1e-6);}
assert.ok(bounce>0,'strong impulse must hit and rebound from platform');
pendulum.position.set(pendulum.limit-.001,0,0);pendulum.velocity.set(5,0,0);pendulum.step(.001);
assert.ok(pendulum.velocity.x<0&&Math.abs(pendulum.velocity.x)<5,'platform reverses the outgoing bag and dissipates energy');
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data);
const e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),animTime:0,practiceTiming:'random',practiceSeed:74,fitCameraToModel(){}};
e.demoModel=coach.root;const arena=new TrainingArena(e,data);
for(const mode of ['none','heavy','dummy','speed','rabbit']){
 arena.setTarget(mode);let contacts=0,guards=0,swings=0;
 for(let i=0;i<=600;i++){
  const m=arena.update(i/60,mode==='speed'?'speedbag':'combo','uppercut_flow');
  assert.ok(m.hero.handErrors.every(n=>n<.002),mode+' variable tempo must preserve reachable wrists');
  assert.ok(m.hero.hands.flat().every(Number.isFinite));
  if(m.practice?.rest)guards++;
  contacts+=m.contacts.length;swings+=(m.swings||[]).length;
 }
 assert.ok(guards>0,mode+' must permit read/reset pauses');
 if(['heavy','dummy','speed'].includes(mode))assert.ok(contacts>0,mode+' needs actual contact while varying tempo');
 if(mode==='none')assert.equal(contacts,0);
 if(mode!=='speed')assert.ok(swings>0,mode+' air sound event must follow active strikes');
 console.log('practice',mode,{contacts,guards,swings});
}
const neutral=coach.update(0,'guard','one_two'),up=coach.update(0,'guard','one_two',{hitReaction:{amount:1,part:'head',move:'uppercut',side:1,direction:[0,.8,-1]}});
assert.ok(up.head[1]>neutral.head[1]+.02,'uppercut must lift the actual head joint');
assert.ok(up.head[2]<neutral.head[2]-.1,'uppercut must send the torso/head backward');
assert.ok(up.handErrors.every(n=>n<.002));
for(const foot of up.footTargets)assert.ok(coach.point(coach.joints['foot'+foot.side]).distanceTo(new THREE.Vector3(...foot.ankle))<.002,'recoiling actor must retain support');
assert.deepEqual(coach.update(0,'guard','one_two').head,neutral.head,'reaction must clear fully without accumulating neck offset');
for(const amount of [.25,.5,1,1.4]){
 const pose=coach.update(0,'guard','one_two',{hitReaction:{amount,part:'head',move:'uppercut',direction:[0,.8,-1]}});
 assert.ok(pose.head[1]>neutral.head[1]&&pose.head[2]<neutral.head[2], 'rising contact must lift/recoil across supported reaction strengths');
}
const bout=new BoxingFight({seed:7});bout.phase='round';
const action=bout.attack('lion','uppercut','head'),direction=[.02,.8,-.6];
assert.equal(bout.fighters.rabbit.reaction,null,'throwing alone must not move the victim');
const event=bout.contact({actor:'lion',action:action.id,part:'head',speed:4,side:1,direction});
assert.deepEqual(event.direction,direction);assert.deepEqual(bout.fighters.rabbit.reaction.direction,direction);
assert.equal(bout.contact({actor:'lion',action:action.id,part:'head',speed:4,direction}),null,'a single uppercut cannot add duplicate reactions/scores');
for(const [name,g] of Object.entries(EQUIPMENT_SURFACES))if(g.position){
 assert.ok(g.position.length>10000&&g.position.every(Number.isFinite));
 assert.equal(g.normal.length,g.position.length);assert.equal(g.uv.length,g.position.length/3*2);
 assert.ok(g.index.every(i=>Number.isInteger(i)&&i>=0&&i<g.position.length/3),name+' valid baked triangles');
}
console.log('PASS seeded variable practice, independent exchanges, contact-driven platform rebound, reachable wrists, uppercut lift/recoil and baked sculpture integrity');
