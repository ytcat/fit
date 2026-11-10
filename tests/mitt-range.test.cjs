// GOTR-0012: mitt partners stand at jab range. A straight punch must reach the mitt with a
// long, unlocked arm; bent-arm punches and the roll close the distance with real steps.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
const V=(...v)=>new THREE.Vector3(...v),deg=r=>r*180/Math.PI,rear=m=>['cross','rear_hook','rear_uppercut'].includes(m);
// Arm shape of the striking arm, measured on the posed bones.
const arm=(coach,side)=>{const j=coach.joints,s=j['arm'+side].getWorldPosition(V()),el=j['elbow'+side].getWorldPosition(V()),h=j['hand'+side].getWorldPosition(V());return {extension:100*s.distanceTo(h)/(s.distanceTo(el)+el.distanceTo(h)),elbow:deg(s.clone().sub(el).angleTo(h.clone().sub(el)))};};
// Accepted arm shape at the moment the glove meets the mitt.
const shape={jab:[150,175],cross:[150,175],hook:[70,115],rear_hook:[70,115],uppercut:[60,112],rear_uppercut:[60,112]};
function checkContact(species,mode,hit){
 const a=arm(e.coach,hit.hand),[low,high]=shape[hit.move],label=`${species} ${mode} ${hit.move} elbow ${a.elbow.toFixed(1)} extension ${a.extension.toFixed(1)}%`;
 assert.ok(a.elbow>=low&&a.elbow<=high,label+' must stay inside '+low+'-'+high+' degrees');
 if(hit.move==='jab'||hit.move==='cross')assert.ok(a.extension>=85,label+': a straight meets the mitt with a long arm, not a folded one');
 else assert.ok(a.extension<=90,label+': hooks and uppercuts stay bent-arm punches');
 return a;
}
// Roots stay put, soles that are down stay exactly where they were planted, and every limb stays inside its reach.
function grounding(drill){
 const state={feet:{},lifted:{},roots:null};
 return {state,sample(frame,label){
  const roots=[e.coach.root.position.toArray(),drill.trainer.root.position.toArray()];if(!state.roots)state.roots=roots;assert.deepEqual(roots,state.roots,label+': partner roots never glide');
  for(const [who,coach,metrics] of [['boxer',e.coach,frame.hero],['coach',drill.trainer,frame.partner]]){
   for(const foot of metrics.footTargets){
    const key=who+foot.side,now=coach.root.localToWorld(V(...foot.contact)),before=state.feet[key];
    if(before&&before.lift<1e-6&&foot.lift<1e-6)assert.ok(Math.hypot(now.x-before.p.x,now.z-before.p.z)<1e-6,`${label}: ${key} sole slid while planted`);
    if(foot.lift>1e-6)state.lifted[key]=Math.max(state.lifted[key]||0,foot.lift);
    assert.ok(foot.error<.012,`${label}: ${key} leg asked to reach ${foot.error.toFixed(3)} past its bones`);
    state.feet[key]={p:now,lift:foot.lift};
   }
   assert.ok(Math.max(...metrics.handErrors)<.03,`${label}: ${who} arm stays inside real reach`);
  }
 }};
}
for(const species of ['lion','rabbit']){
 // ---- Watch mode: one full pass of the coach sequence at the authoritative 120 Hz tick.
 e.targetMode='none';e.roster.select(species);e.player.setEnabled(false);e.animTime=0;e.arena.setTarget('pads');let drill=e.arena.careerDrill,ground=grounding(drill);const landed=[],angles={};let defences=0,minHeads=Infinity;
 assert.ok(CareerDrill.padRange>=1.60,'jab range is clearly longer than the old 1.20 chest-to-chest spacing');
 assert.equal(e.coach.root.position.distanceTo(drill.trainer.root.position),CareerDrill.padRange);
 for(let tick=1;tick<=1152;tick++){
  const frame=e.arena.update(tick/120);ground.sample(frame,species+' watch');defences+=frame.defences;
  minHeads=Math.min(minHeads,e.coach.joints.head.getWorldPosition(V()).distanceTo(drill.trainer.joints.head.getWorldPosition(V())));
  for(const hit of frame.contacts){landed.push(hit.move);angles[hit.move]=checkContact(species,'watch',hit);assert.ok(hit.closingSpeed>.5,species+' '+hit.move+' arrives with real closing speed, not a graze');}
 }
 assert.deepEqual(landed,['jab','cross','uppercut','rear_hook','rear_uppercut','hook'],species+': every punch of the coach sequence meets its mitt exactly once');
 assert.equal(defences,2,species+': both rolls pass under the coach hook');
 assert.ok(minHeads>.70,species+': heads never crowd each other, even while both step in');
 for(const key of ['boxerL','boxerR','coachL','coachR'])assert.ok(ground.state.lifted[key]>.03,species+' '+key+' closes distance with a lifted step, never a slide');
 // ---- Manual Play: any single command, pressed from the resting guard, still reaches its mitt.
 e.player.setEnabled(true);
 for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut','roll']){
  e.animTime=0;e.arena.setTarget('pads');e.player.reset();drill=e.arena.careerDrill;ground=grounding(drill);let t=0,hits=0,ducks=0;
  for(;t<.75;t+=1/120){e.animTime=t;ground.sample(e.arena.update(t),species+' idle');}
  assert.ok(e.player.press(move));
  for(let i=0;i<126;i++){t+=1/120;e.animTime=t;const frame=e.arena.update(t);ground.sample(frame,species+' manual '+move);ducks+=frame.defences;for(const hit of frame.contacts){hits++;assert.equal(hit.move,move);angles['manual '+move]=checkContact(species,'manual',hit);}}
  if(move==='roll'){assert.equal(ducks,1,species+' manual roll ducks the coach hook');assert.equal(hits,0);}else assert.equal(hits,1,species+' manual '+move+' lands once');
 }
 // ---- A fast mixed chain: long and short punches in any order, each queued the moment the last one ends.
 {e.animTime=0;e.arena.setTarget('pads');e.player.reset();drill=e.arena.careerDrill;ground=grounding(drill);const order=['hook','jab','rear_uppercut','cross','roll','jab','uppercut','cross','rear_hook','jab'],chain=[];let t=0,next=0,ducks=0;
  for(let i=0;i<1500&&(next<order.length||e.player.current);i++){if(next<order.length&&!e.player.current&&!e.player.queue.length&&e.player.press(order[next]))next++;t+=1/120;e.animTime=t;const frame=e.arena.update(t);ground.sample(frame,species+' chain');ducks+=frame.defences;for(const hit of frame.contacts){chain.push(hit.move);checkContact(species,'chain',hit);}}
  assert.deepEqual(chain,order.filter(m=>m!=='roll'),species+': every punch of a mixed manual chain lands');assert.equal(ducks,1);}
 e.player.setEnabled(false);
 console.log(species,Object.fromEntries(Object.entries(angles).map(([k,a])=>[k,a.elbow.toFixed(0)+'deg/'+a.extension.toFixed(0)+'%'])),{minHeads:+minHeads.toFixed(2),lifted:ground.state.lifted});
}
console.log('PASS mitt range: straights land long and unlocked, bent-arm punches stay bent, rolls duck, feet step and never slide, in Watch and manual Play for both species');
