// GOTR-0051: the guard is truly orthodox, judged in world space by the fighter's own anatomy, not by joint names.
// Facing f = the direction to the target; the fighter's LEFT is up x f. In the guard the left shoulder, left glove
// and left foot are ahead of the right ones along f, in every mode, both species.
// Measured on real world-space bone positions (no picture mirroring).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','training-gear.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function engine(species){const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);if(species==='rabbit')e.roster.select('rabbit');return e;}
// Lead-minus-rear along the facing, with sides decided anatomically in world space.
function measure(c,target,shown=false){
 c.root.updateMatrixWorld(true);const flip=v=>{if(shown)v.x=-v.x;return v;},W=n=>flip(c.joints[n].getWorldPosition(V())),head=W('head');if(target)target=flip(target.clone());
 const f=target?target.clone().sub(head).setY(0).normalize():flip(V(0,0,1).transformDirection(c.root.matrixWorld)).setY(0).normalize(),left=V(0,1,0).cross(f);
 const pair=(a,b)=>{const A=W(a),B=W(b),mid=W('hips'),la=A.clone().sub(mid).dot(left),lb=B.clone().sub(mid).dot(left);const [L,R]=la>lb?[A,B]:[B,A];return L.clone().sub(R).dot(f);};
 // Elbow angle (180 = straight) and how far each elbow is from the ribs (chest joint, horizontally).
 const elbow=s=>{const a=W('arm'+s),b=W('elbow'+s),h=W('hand'+s);return THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(h.clone().sub(b)));},ribs=s=>Math.abs(W('elbow'+s).sub(W('chest')).dot(left)),drop=s=>W('hand'+s).y-W('elbow'+s).y;
 return {shoulders:pair('armL','armR'),gloves:pair('handL','handR'),feet:pair('footL','footR'),elbowLead:elbow('L'),elbowRear:elbow('R'),ribsLead:ribs('L'),ribsRear:ribs('R'),dropLead:drop('L'),dropRear:drop('R')};
}
const check=(label,m)=>{assert.ok(m.shoulders>=.12,label+': left shoulder ahead of the right by '+m.shoulders.toFixed(3)+' m (>= 0.12)');assert.ok(m.gloves>=.15,label+': left glove ahead of the right by '+m.gloves.toFixed(3)+' m (>= 0.15)');assert.ok(m.feet>=.30,label+': left foot ahead of the right by '+m.feet.toFixed(3)+' m (>= 0.30)');// Compact guard: both arms bent (not reaching), forearms rising to the gloves, elbows in at the sides of the ribs.
 // Fights still use the wider v1.39 guard (their range and blocked-straight geometry are tuned to it): the compact
 // limits are asserted in training only; in fights the arms must merely stay bent. Known gap, see qa/gotr-0051.
 if(label.includes('fight')){for(const k of ['Lead','Rear'])assert.ok(m['elbow'+k]<=150,label+': '+k+' elbow bent '+m['elbow'+k].toFixed(0));}
 else for(const k of ['Lead','Rear']){assert.ok(m['elbow'+k]>=60&&m['elbow'+k]<=110,label+': '+k+' elbow bent '+m['elbow'+k].toFixed(0)+' deg (60-110)');assert.ok(m['drop'+k]>=.15,label+': '+k+' forearm rises to the glove '+m['drop'+k].toFixed(2));assert.ok(m['ribs'+k]<=.43,label+': '+k+' elbow tucked, '+m['ribs'+k].toFixed(2)+' m from the centre line (<= 0.43)');}
 return label+' '+[m.shoulders,m.gloves,m.feet].map(x=>x.toFixed(2)).join('/')+' elbows '+Math.round(m.elbowLead)+'/'+Math.round(m.elbowRear)+' elbow-to-centre '+m.ribsLead.toFixed(2)+'/'+m.ribsRear.toFixed(2);};
const out=[];
for(const species of ['lion','rabbit']){
 for(const mode of ['none','heavy','pads','rabbit']){
  const e=engine(species);e.targetMode=mode;e.player.setEnabled(true);e.arena.setTarget(mode);let t=0;for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t,'combo','one_two');}
  const target=mode==='heavy'?e.arena.models.heavy.getWorldPosition(V()):mode==='pads'?e.arena.careerDrill.trainer.root.getWorldPosition(V()):mode==='rabbit'?e.arena.rabbit.root.getWorldPosition(V()):null;
  out.push(check(species+' '+mode,measure(e.coach,target)));
 }
 const e=engine(species);e.targetMode='fight';e.fightOptions={preset:'quick',seed:5};e.arena.setTarget('fight');const v=e.arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;}for(let i=0;i<30;i++)v.step();
 for(const actor of ['lion','rabbit'])out.push(check(species+' fight '+actor,measure(v.coaches[actor],v.coaches[actor==='lion'?'rabbit':'lion'].root.getWorldPosition(V()))));
}
console.log('PASS orthodox guard (left shoulder/glove/foot ahead, m): '+out.join('; '));
