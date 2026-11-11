// GOTR-0024 / GOTR-0025: punches must land as hits (speed into the target, a
// snapping target that recovers, a jolted guard) and combinations must flow.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const V=()=>new THREE.Vector3(),deg=THREE.MathUtils.radToDeg,R=BOXING_ROUTINES;

// 1. Punch clock: faster into the target, same total duration, linked end.
let last=-1;for(let i=0;i<=200;i++){const p=R.punchPhase(i/200);assert.ok(p>=last-1e-12,'punch clock is monotonic');last=p;}
assert.equal(R.punchPhase(0),0);assert.ok(Math.abs(R.punchPhase(1)-1)<1e-9,'a single punch keeps its authored duration');
const contactRaw=(()=>{let r=0;while(R.punchPhase(r)<.41)r+=.001;return r;})();
assert.ok(contactRaw<=.41*.82,'contact phase .41 is reached at least 18% sooner '+contactRaw);
assert.ok(Math.abs(R.punchPhase(R.punchSpan())-R.punchTempo.link)<1e-9&&R.punchSpan()<.8,'linked punches end early, at the guard');

const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:false,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
function staged(move,guard){
 e.player.setEnabled(false);e.targetMode='fight';e.fightOptions={seed:74,preset:'quick'};e.arena.setTarget('fight');
 const view=e.arena.fightView,m=view.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.tempo=1;f.reaction=null;}
 m.fighters.rabbit.action={id:900,actor:'rabbit',move:'guard',guardStyle:guard?'high':'body',start:-1.75,duration:5,attack:false,defend:true,brace:guard?1:0};
 for(let i=0;i<20;i++)view.step();
 const rc=view.coaches.rabbit,side=move==='cross'?'R':'L',headQ=()=>rc.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rc.joints.head.getWorldQuaternion(new THREE.Quaternion()));
 m.attack('lion',move,'head');const start=m.time;let prev=view.previous['lion'+side].clone(),approach=0,hit=null,q0,hand0,rot=[],jolt=0;
 for(let i=0;i<60;i++){
  view.step();const p=view.previous['lion'+side].clone();const contact=view.contacts.find(x=>x.actor==='lion');
  if(contact&&!hit){hit={...contact,toContact:m.time-start,approach};q0=headQ();hand0=rc.root.worldToLocal(rc.joints['hand'+(contact.side<0?'L':'R')].getWorldPosition(V()));}
  else if(!hit)approach=p.distanceTo(prev)*60;
  else{rot.push({age:m.time-start-hit.toContact,angle:deg(headQ().angleTo(q0))});jolt=Math.max(jolt,rc.root.worldToLocal(rc.joints['hand'+(hit.side<0?'L':'R')].getWorldPosition(V())).distanceTo(hand0));}
  prev=p;
 }
 assert.ok(hit,'the '+move+' lands');return {...hit,rot,jolt};
}
// 2. Clean straights carry speed into the head and snap it, then it recovers.
for(const move of ['jab','cross']){
 const h=staged(move,false);
 assert.equal(h.part,'head');assert.equal(h.blocked,false);
 assert.ok(h.toContact<=.30,move+' reaches the target faster (was 0.35 s) '+h.toContact);
 assert.ok(h.approach>=6,move+' glove is still fast in the frame before contact (was ~1-5 m/s staged) '+h.approach.toFixed(2));
 assert.ok(h.speed>=4.5,move+' scored contact speed '+h.speed.toFixed(2));
 const peak=Math.max(...h.rot.filter(r=>r.age<=.15).map(r=>r.angle)),late=h.rot.find(r=>r.age>=.45)?.angle??0;
 assert.ok(peak>=15,move+' snaps the head (degrees) '+peak.toFixed(1));
 assert.ok(late<=peak*.5,move+' head recovers instead of holding the pose '+JSON.stringify({peak,late}));
}
// 3. A blocked straight visibly jolts the guard.
{const h=staged('jab',true);assert.equal(h.blocked,true);assert.ok(h.jolt>=.02,'guard glove driven back on a block (m) '+h.jolt.toFixed(3));}
// 4. Combinations: linked punches end at the guard, so the whole combo is shorter.
{
 const t0={a:0},p=e.player;e.targetMode='none';e.arena.setTarget('none');e.arena.previousTime=0;p.setEnabled(true);
 const frame=t=>{e.arena.previousTime=t;return p.frame(t);};frame(0);assert.ok(p.press('combo_three'));
 let t=0,moves=[];while(t<4){t+=1/120;const f=frame(t);if(f.rest)break;if(moves.at(-1)!==f.index)moves.push(f.index);}
 const old=.54+.64+.78;assert.equal(moves.length,3);assert.ok(t<old*.9,'combo_three in training is clearly shorter than the old '+old+' s: '+t.toFixed(3));
 t0.a=t;
}
{
 e.player.setEnabled(true);e.targetMode='fight';e.fightOptions={seed:74,preset:'quick'};e.arena.setTarget('fight');
 const view=e.arena.fightView,m=view.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.tempo=1;f.stamina=1;f.reaction=null;}m.setPlayer('lion');
 assert.ok(e.player.press('combo_one_two'));const start=m.time;let starts=[],bases=[],seen=null;
 for(let i=0;i<120;i++){view.step();const a=m.fighters.lion.action;if(a?.attack&&a.id!==seen){seen=a.id;starts.push(m.time-start);bases.push(a.baseDuration);}if(!a&&!m.playerQueue.length&&starts.length===2)break;}
 // Old behaviour: each punch ran its full authored duration (+45 ms contact hold).
 const total=m.time-start,old=bases[0]+bases[1]+.09;assert.equal(starts.length,2);
 assert.ok(total<=old-.10,'fight one-two is shorter than the old '+old.toFixed(3)+' s: '+total.toFixed(3));
 assert.ok(starts[1]<=(bases[0]+.045)*.85,'the cross starts from the jab\'s return, not after a guard reset '+starts[1].toFixed(3));
}
console.log('punch feel ok');
