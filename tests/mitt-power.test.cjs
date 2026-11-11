// GOTR-0032: mitt punches read as power shots. The glove still has speed when it
// meets the mitt (hooks no longer ease to a stop on the pad), the mitt pops back
// by type and speed, the glove does not chase the retreating pad, and the
// straights still land at full extension (GOTR-0012).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','training-gear.js','career-drills.js','character-roster.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),rear=m=>['cross','rear_hook','rear_uppercut'].includes(m),dt=1/120;
function engine(){const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'pads',animTime:0,isPlaying:true,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);e.player.setEnabled(true);e.arena.setTarget('pads');return e;}
// A second "ghost" station runs the same punches with the mitt contact suppressed: the
// difference between the two is the reaction to the hit alone.
const e=engine(),g=engine(),drill=e.arena.careerDrill,P=CareerDrill.prototype,contact=P.contactWithMitt;
P.contactWithMitt=function(...a){const hit=contact.apply(this,a);return this===g.arena.careerDrill?false:hit;};
let t=0;const step=()=>{t+=dt;for(const x of [e,g])x.animTime=t;const f=e.arena.update(t);g.arena.update(t);return f;},run=s=>{for(const end=t+s;t<end;)step();};run(1.2);
const minimum={jab:3,cross:3,hook:2,rear_hook:2,uppercut:3.5,rear_uppercut:3.5};
for(const move of Object.keys(minimum)){
 for(const x of [e,g])x.player.reset();assert.ok(e.player.press(move)&&g.player.press(move),move+' accepted');
 const side=rear(move)?1:0,pad=drill.mitts[side],knuckle=x=>x.coach.root.localToWorld(V(...x.coach.metrics.gloves[side].strikePoint));
 const speeds=[];let last=knuckle(e),hit=null,pop=0,chase=0;
 for(let i=0;i<Math.round(1.2/dt);i++){
  const f=step(),k=knuckle(e);speeds.push(k.distanceTo(last)/dt);last=k;
  const h=(f.contacts||[]).find(c=>c.receiver==='pads');if(h&&!hit){hit={i,closing:h.closingSpeed};
   if(move==='jab'||move==='cross'){const j=e.coach.joints,s=side?'R':'L',sh=j['arm'+s].getWorldPosition(V()),el=j['elbow'+s].getWorldPosition(V()),ha=j['hand'+s].getWorldPosition(V());
    const angle=180-THREE.MathUtils.radToDeg(el.clone().sub(sh).angleTo(ha.clone().sub(el))),ext=ha.distanceTo(sh)/(el.distanceTo(sh)+ha.distanceTo(el));
    assert.ok(angle>=158&&ext>=.975,move+' still lands extended (GOTR-0012): '+angle.toFixed(0)+' deg, '+ext.toFixed(3));}}
  // The mitt pops; the striking glove keeps its own path instead of following the retreating pad.
  if(hit&&i-hit.i<=Math.round(.12/dt)){pop=Math.max(pop,pad.userData.recoil||0);chase=Math.max(chase,k.distanceTo(knuckle(g)));}
 }
 assert.ok(hit,move+' meets the mitt');
 // Drive phase only: the last 0.125 s before contact (mitt uppercuts still have a chamber jump, see qa/gotr-0027).
 const peak=Math.max(...speeds.slice(Math.max(0,hit.i-15),hit.i+1)),approach=speeds[hit.i-1];
 assert.ok(hit.closing>=minimum[move],move+' closes on the mitt at '+hit.closing.toFixed(2)+' m/s (>= '+minimum[move]+')');
 assert.ok(approach>=.4*peak,move+' keeps speed into the mitt: '+approach.toFixed(2)+' of peak '+peak.toFixed(2)+' m/s');
 assert.ok(pop>=.045,move+' pops the mitt back '+(pop*100).toFixed(1)+' cm');
 assert.ok(chase<(move.includes('uppercut')?.04:.01),move+' glove does not chase the retreating mitt ('+(chase*100).toFixed(1)+' cm)');
 run(.6);
}
console.log('PASS mitt punches keep speed into the pad, pop the mitt and drive through it; straights still land extended');
