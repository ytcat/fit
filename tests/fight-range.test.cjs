// GOTR-0018: straights must land with an extended arm, not a folded one.
// Measures the striking arm on the exact frame a jab/cross registers contact.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:false,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
const V=()=>new THREE.Vector3(),straight=move=>move==='jab'||move==='cross';
function arm(view,actor,move){
 const coach=view.coaches[actor],side=move==='cross'?'R':'L',j=coach.joints,s=coach.point(j['arm'+side]),b=coach.point(j['elbow'+side]),w=coach.point(j['hand'+side]);
 return {elbow:THREE.MathUtils.radToDeg(s.clone().sub(b).angleTo(w.clone().sub(b))),extension:s.distanceTo(w)/(j['elbow'+side].position.length()+j['hand'+side].position.length())};
}
function fight(options,play){e.player.setEnabled(play);e.targetMode='fight';e.fightOptions=options;e.arena.setTarget('fight');return e.arena.fightView;}

// 1. From the opening stance: every clean or blocked straight lands extended.
const staged=[];
for(const actor of ['lion','rabbit'])for(const move of ['jab','cross'])for(const situation of ['body','open_head','blocked_head']){
 const view=fight({seed:74},false),m=view.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.tempo=1;f.reaction=null;}
 const receiver=actor==='lion'?'rabbit':'lion';if(situation==='open_head')m.fighters[receiver].action={id:900,actor:receiver,move:'guard',guardStyle:'body',start:-1.75,duration:5,attack:false,defend:true};
 const roots=Object.values(view.coaches).map(k=>k.root.position);assert.ok(roots[0].distanceTo(roots[1])>=FightArena.range.near-1e-6,'opening stance is at boxing range, not glove to glove');
 m.attack(actor,move,situation==='body'?'body':'head');let hit=null;
 for(let i=0;i<60&&!hit;i++){view.step();const contact=view.contacts.find(x=>x.actor===actor);if(contact)hit={...arm(view,actor,move),part:contact.part,blocked:contact.blocked,speed:contact.speed};}
 assert.ok(hit,'the straight must reach its target '+JSON.stringify({actor,move,situation}));
 assert.equal(hit.blocked,situation==='blocked_head','a raised guard still stops the glove; an open target is hit clean');
 assert.ok(hit.elbow>=150&&hit.elbow<=175&&hit.extension>=.85,'contact with an extended, unlocked arm '+JSON.stringify({actor,move,situation,...hit}));
 assert.ok(hit.speed>(hit.blocked?.12:2),'an extended straight still carries its drive into the target '+JSON.stringify({actor,move,situation,speed:hit.speed}));
 staged.push({actor,move,situation,elbow:Math.round(hit.elbow),extension:Math.round(hit.extension*100)});
}

// 2. Real seeded 20-second bouts: Watch (AI v AI) and Play (scripted jab/cross presses).
function bout(seed,play,species){
 if(e.coach.species!==species){e.targetMode='none';e.arena.setTarget('none');assert.ok(e.roster.select(species),'character switch outside a fight');}
 const view=fight({preset:'quick',seed},play),m=view.match,player=play?e.player.actor():null,script=['jab','cross','jab','jab','cross'],clean=[],blocked=[];let presses=0,frames=0;
 while(!m.result&&frames++<60*60){
  if(play&&m.phase==='round'&&!m.fighters[player].action&&!m.playerQueue.length&&!m.fighters[player].down&&e.player.press(script[presses%script.length]))presses++;
  view.step();
  for(const contact of view.contacts)if(straight(contact.move))(contact.blocked?blocked:contact.legal?clean:[]).push({...arm(view,contact.actor,contact.move),actor:contact.actor,player:contact.actor===player});
  for(const coach of Object.values(view.coaches))assert.ok(coach.metrics.footTargets.every(f=>f.error<.002)&&Math.abs(coach.root.position.x)<1.25&&Math.abs(coach.root.position.z)<1.25,'feet stay reachable and inside the ropes');
 }
 assert.ok(m.result,'the bout reaches a result');return {clean,blocked};
}
const share=(rows,test)=>rows.filter(test).length/Math.max(1,rows.length),median=xs=>[...xs].sort((a,b)=>a-b)[xs.length>>1];
const summary={};
for(const [name,seed,play,species] of [['watch',11,false,'lion'],['play-lion',42,true,'lion'],['play-rabbit',3,true,'rabbit']]){
 const {clean,blocked}=bout(seed,play,species),all=clean.concat(blocked);
 summary[name]={clean:clean.length,blocked:blocked.length,cleanMedianElbow:Math.round(median(clean.map(r=>r.elbow))),cleanAtLeast150:+share(clean,r=>r.elbow>=150).toFixed(2),cleanExtended85:+share(clean,r=>r.extension>=.85).toFixed(2),allMedianElbow:Math.round(median(all.map(r=>r.elbow)))};
 summary[name].under120=+share(all,r=>r.elbow<120).toFixed(2);
 assert.ok(all.length>=5,'the bout lands real straights '+JSON.stringify(summary[name]));
 // Before the range fix the typical landed straight stopped at 110-115 degrees
 // and 59-72% of them were under 120; clean ones sat near 133.
 assert.ok(median(all.map(r=>r.elbow))>=130&&share(all,r=>r.elbow<120)<=.45,'landed straights are no longer folded at a right angle '+JSON.stringify(summary[name]));
 if(clean.length>=3)assert.ok(median(clean.map(r=>r.elbow))>=140&&share(clean,r=>r.extension>=.85)>=.6,'clean straights land extended '+JSON.stringify(summary[name]));
 assert.ok(all.every(r=>r.elbow<=176),'no locked elbows');
}
console.log('PASS boxing range and extended straights at contact',{staged,summary});
