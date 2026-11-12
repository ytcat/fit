const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),coach,animTime:0,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data),winners=new Set();
// Contact timing changes can change a seeded winner; cover both outcomes
// across a bounded deterministic sample rather than requiring two fixed results.
for(const seed of [11,999,42,1,7,91]){
 e.fightOptions={seed,rounds:1,roundSeconds:30,restSeconds:2};arena.setTarget('fight');const view=arena.fightView,m=view.match;let hits=0,head=0,body=0;
 for(let i=0;i<60*65;i++){
  const metrics=arena.update(i/60,'fight','one_two');
  for(const actor of ['hero','partner'])assert.ok(metrics[actor].hands.flat().every(Number.isFinite)&&metrics[actor].handErrors.every(n=>n<.002),'both fighters must retain finite, reachable hands');
  hits+=metrics.contacts.filter(c=>c.legal).length;head+=metrics.contacts.filter(c=>c.part==='head').length;body+=metrics.contacts.filter(c=>c.part==='body').length;
  if(m.phase==='ceremony'&&m.phaseTime>3)break;
 }
 assert.ok(m.result&&hits>0&&head+body===hits,'actual scene contacts must drive the recorded legal hits');
 assert.equal(hits,m.totals.lion.landed+m.totals.rabbit.landed,'cards cannot receive invented hits');winners.add(m.result.winner);
 for(const card of m.result.cards){assert.equal(card.rounds.length,1);assert.deepEqual(card.totals,card.rounds[0].scores);}
 if(m.result.winner){const winner=m.result.winner,loser=winner==='lion'?'rabbit':'lion',/* GOTR-0051: mirrored fighters: the hand beside the referee is the lion's L, the rabbit's R */hand=view.coaches[winner].joints[winner==='lion'?'handL':'handR'],refHand=view.referee.arms[winner==='lion'?-1:1].wrist;
  assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(refHand.getWorldPosition(new THREE.Vector3()))<.035,'referee must actually hold the raised wrist');
  assert.ok(view.coaches[loser].joints.head.rotation.x>.3,'loser must look down');assert.ok(view.coaches[winner].celebrationSmile.visible,'winner must have a celebratory expression');}
 const now=view.tick/60,totals=JSON.stringify(m.totals);assert.equal(arena.update(now,'fight','one_two').contacts.length,0);assert.equal(JSON.stringify(m.totals),totals,'pause must not score another contact');
 console.log('observed bout',seed,{winner:m.result.winner,head,body,cards:m.result.cards.map(c=>c.totals)});
 if(winners.has('lion')&&winners.has('rabbit'))break;
}
assert.ok(winners.has('lion')&&winners.has('rabbit'),'fresh decisions must allow either character to win actual simulated bouts');
function sample(rate){e.fightOptions={seed:190,rounds:1,roundSeconds:8,restSeconds:1};arena.setTarget('fight');for(let i=0;i<=rate*9;i++)arena.update(i/rate,'fight','one_two');return JSON.stringify({totals:arena.fightView.match.totals,phase:arena.fightView.match.phase,actions:arena.fightView.match.actionId});}
assert.equal(sample(30),sample(120),'display frame rate must not change the random decisions or hit totals');
const view=arena.fightView,m=view.match;m.phase='round';for(const a of ['lion','rabbit'])m.fighters[a].action=null;
m.fighters.lion.reaction=null;view.pose();const neutral=coach.joints.head.quaternion.clone(),spine=coach.joints.spine.rotation.x;
m.fighters.lion.reaction={time:m.time-.05,part:'head',severity:1,side:-1};view.pose();assert.ok(neutral.angleTo(coach.joints.head.quaternion)>.15,'head contact must rotate the face away');
m.fighters.lion.reaction={time:m.time-.05,part:'body',severity:1,side:-1};view.pose();assert.ok(coach.joints.spine.rotation.x>spine+.08,'body contact must fold the trunk and knees');
m.fighters.lion.reaction={time:m.time-.05,part:'shoulder',severity:1,side:-1};view.pose();assert.ok(coach.joints.armL.position.y<.23,'shoulder contact must recoil the receiving shoulder');
// Actual posed movement: ring travel remains bounded, repeatable and frozen
// during a committed punch; both guards lead with fists rather than elbows.
m.result=null;m.phase='round';m.decide=()=>{};
for(const f of Object.values(m.fighters)){f.action=null;f.down=0;f.reaction=null;f.next=Infinity;}
const points=[];for(let i=0;i<320;i++){m.time+=.05;view.pose();points.push(coach.root.position.clone());for(const c of Object.values(view.coaches)){assert.ok(Math.abs(c.root.position.x)<1.25&&Math.abs(c.root.position.z)<1.25,'travel stays inside the ropes');assert.ok(c.metrics.footTargets.every(f=>f.error<.002),'moving feet remain reachable');}}
assert.ok(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>.45,'fighters traverse the ring laterally');
for(const c of Object.values(view.coaches))for(const side of ['L','R']){const sign=side==='L'?-1:1,elbow=c.point(c.joints['elbow'+side]),wrist=c.point(c.joints['hand'+side]),shoulder=c.point(c.joints['arm'+side]);assert.ok(sign*(elbow.x-shoulder.x)>-.025,'guard elbow must remain outside the chest instead of folding inward');assert.ok(wrist.y-elbow.y>.20,'guard forearm rises from an elbow below the glove '+side+' '+(wrist.y-elbow.y).toFixed(3));};
const travelled=view.travelTime,position=coach.root.position.clone();view.pose();assert.equal(view.travelTime,travelled);assert.ok(position.distanceTo(coach.root.position)<1e-8,'paused pose does not travel');
m.attack('lion','jab','head');for(let i=0;i<30;i++){m.time+=1/60;view.pose();}const planted=view.walkers.lion.time,opponentTime=view.walkers.rabbit.time;m.time+=.05;view.pose();assert.equal(view.walkers.lion.time,planted,'striker finishes the half-step then plants');assert.ok(view.walkers.rabbit.time>opponentTime,'opponent keeps independent footwork');
arena.setTarget('none');assert.equal(arena.fightView,null);assert.equal(coach.root.parent,e.scene);
console.log('PASS actual randomized wins for both fighters, contact-derived cards, connected referee grip, loser pose, localized reactions, pause, frame invariance and exit');
