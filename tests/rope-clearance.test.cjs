const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
const V=(...v)=>new THREE.Vector3(...v);

for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);
 for(const exercise of Object.keys(CareerDrill.ropeDrills)){
  e.animTime=0;e.ropeDrill=exercise;e.arena.setTarget('rope');const d=e.arena.careerDrill,cadence=CareerDrill.ropeDrills[exercise].cadence;let worst=Infinity,worstPart='',maxCorrection=0;
  for(let tick=0;tick<=120;tick++){
   const t=tick/60/cadence,f=e.arena.update(t);maxCorrection=Math.max(maxCorrection,d.ropeClearance.maxCorrection);
   for(let k=0;k<96;k++)for(const u of [0,.25,.5,.75,1]){const p=d.ropePoints[k].clone().lerp(d.ropePoints[k+1],u),hit=d.ropeClearance.clearance(p);if(hit.minimum<worst){worst=hit.minimum;worstPart=hit.part;}assert.ok(hit.minimum>=-1e-5,JSON.stringify({species,exercise,tick,k,u,hit,point:p.toArray()}));}
  }
  console.log(species,exercise,{worst,worstPart,maxCorrection});
 }
}
console.log('PASS full-cycle rope segments clear the posed body, limbs, equipment, ears/mane and tail with a protected gap');
