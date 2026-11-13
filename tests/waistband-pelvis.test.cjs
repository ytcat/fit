// GOTR-0079: the trunk waistband must sit on the pelvis for both species, wherever the Fighter stands when the band is
// first built. It was built with SkinnedMesh.bindMatrixInverse, which three.js overwrites every frame with the inverse of
// the mesh's CURRENT world matrix: a band first built while the Fighter stood at a station (the rabbit after a species
// switch, or any Fighter whose equipment is first applied in the gym) was baked half a metre away and followed the rig.
// Measured after CPU skinning (same dual-quaternion blend as the shader; skinPoint answers in the rig's own frame):
//   centre  = horizontal distance from the band's centre to the pelvis bone (m)
//   shorts  = largest distance from a band vertex to the shorts vertex it is weighted from (m)
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const A=require('../game-accessories.js');global.GameAccessories=A;const P=require('../game-presentation.js'),D=require('../game-domain.js'),V=()=>new THREE.Vector3();
function engine(species){const c0=new LionCoach(data,{species}),e={coach:c0,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c0.root;e.scene.add(c0.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);return e;}
// Band against the pelvis and the shorts, in the rig's own frame (root-local), for the pose the rig is in now.
function measure(c){c.root.updateMatrixWorld(true);const trunk=c.trunkWaistband,src=trunk.geometry.userData.source,inv=new THREE.Matrix4().copy(c.root.matrixWorld).invert(),hips=c.joints.hips.getWorldPosition(V()).applyMatrix4(inv),a=V(),b=V(),centre=V();let shorts=0,n=0,top=-Infinity,bottom=Infinity;
 for(let i=0;i<src.length;i+=2){c.skinPoint(trunk,i,a);c.skinPoint(c.shorts,src[i],b);assert.ok(Number.isFinite(a.x+a.y+a.z),'finite waistband vertex');shorts=Math.max(shorts,a.distanceTo(b));centre.add(a);top=Math.max(top,a.y);bottom=Math.min(bottom,a.y);n++;}
 centre.multiplyScalar(1/n);return {centre:+Math.hypot(centre.x-hips.x,centre.z-hips.z).toFixed(4),height:+(centre.y-hips.y).toFixed(4),shorts:+shorts.toFixed(4),tall:+(top-bottom).toFixed(4)};}
const ok=(m,label)=>{assert.ok(m.centre<.06,label+': waistband centre is '+m.centre+' m from the pelvis');assert.ok(Math.abs(m.height)<.2,label+': waistband is '+m.height+' m above the pelvis');assert.ok(m.shorts<.05,label+': waistband is '+m.shorts+' m off the shorts');};
const report={},equipment=belt=>({gloves:'gloves_default',shorts:'shorts_default',boots:'boots_default',belt});
const poses=[['guard',.3],['jab',.43],['cross',.43],['hook',.43],['roll',.5]];
for(const species of ['lion','rabbit']){
 // 1) reference: equipment first applied in shadowboxing, the Fighter at the scene origin
 const e0=engine(species);P.apply(e0.coach,equipment('belt_default'),D.catalog);e0.coach.update(.3,'guard','one_two');const ref=measure(e0.coach);ok(ref,species+' built at the origin');report[species+' origin']=ref;
 // 2) equipment first applied at each station: the Fighter stands off-centre in a turned group
 for(const mode of ['heavy','dummy','speed','rabbit','pads','rope']){const e=engine(species);e.targetMode=mode;e.arena.setTarget(mode);e.arena.update(.1,'guard','one_two');e.coach.root.updateMatrixWorld(true);
  assert.ok(mode==='rope'||e.coach.root.getWorldPosition(V()).length()>.3,mode+': the Fighter stands away from the origin');
  P.apply(e.coach,equipment('belt_default'),D.catalog);
  for(const belt of ['belt_default','belt_midnight','belt_jade','belt_sunrise']){P.apply(e.coach,equipment(belt),D.catalog);assert.ok(e.coach.trunkWaistband.visible,belt+' shown');
   for(const [move,phase] of poses){if(e.arena.careerDrill)e.arena.update(phase,move,'one_two');else e.coach.update(phase*1.22,move,'one_two');const m=measure(e.coach);ok(m,[species,mode,belt,move].join(' '));if(belt==='belt_default'&&move==='guard')report[species+' '+mode]=m;}}
  // same band as the one built at the origin (geometry in the shorts' bind space)
  const p0=e0.coach.trunkWaistband.geometry.attributes.position,p1=e.coach.trunkWaistband.geometry.attributes.position;let diff=0;assert.equal(p0.count,p1.count);for(let i=0;i<p0.array.length;i++)diff=Math.max(diff,Math.abs(p0.array[i]-p1.array[i]));assert.ok(diff<1e-4,species+' '+mode+': band geometry differs from the origin build by '+diff.toFixed(4)+' m');}
}
// 3) species switch at a station: the second rig gets its band while standing at the heavy bag (the owner's case)
for(const [first,second] of [['lion','rabbit'],['rabbit','lion']]){const e=engine(first);e.targetMode='heavy';e.arena.setTarget('heavy');P.apply(e.coach,equipment('belt_default'),D.catalog);ok(measure(e.coach),first+' at the heavy bag');
 assert.ok(e.roster.select(second),'switch to '+second);assert.equal(e.coach.species,second);e.arena.update(.2,'guard','one_two');P.apply(e.coach,equipment('belt_default'),D.catalog);const m=measure(e.coach);ok(m,second+' after switching from '+first+' at the heavy bag');report[first+' -> '+second+' at heavy']=m;
 e.roster.select(first);e.arena.update(.2,'guard','one_two');ok(measure(e.coach),first+' after switching back');}
console.log(JSON.stringify(report,null,1));console.log('PASS waistband on the pelvis: both species, every station, four designs, after a species switch');
