const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;let canvases=0;
global.document={createElement:()=>{canvases++;return {getContext:()=>new Proxy({measureText:text=>({width:text.length*25}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})})};}};
for(const file of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','gym-details.js','fight-arena.js','club-world.js','game-world-art.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const venues=require('../game-venues.js'),data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data);
const e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=e.activeModel=coach.root;e.scene.add(coach.root);e.arena=new TrainingArena(e,data);e.world=new ClubWorld(e);e.fightOptions={seed:74};e.arena.setTarget('fight');
const snapshot=root=>{const out=[];root.traverse(n=>out.push({node:n,material:n.material,geometry:n.geometry,p:n.position.toArray(),q:n.quaternion.toArray(),s:n.scale.toArray(),visible:n.visible,intensity:n.intensity}));return out;};
const unchanged=(items,materials=true)=>{for(const s of items){if(materials)assert.equal(s.node.material,s.material);assert.equal(s.node.geometry,s.geometry);assert.deepEqual(s.node.position.toArray(),s.p);assert.deepEqual(s.node.quaternion.toArray(),s.q);assert.deepEqual(s.node.scale.toArray(),s.s);assert.equal(s.node.visible,s.visible);assert.equal(s.node.intensity,s.intensity);}};
const originals=snapshot(e.world.arena),ringOriginals=snapshot(e.arena.fightView.ring),protectedRoots=[e.world.gym,coach.root,e.arena.fightView.coaches.rabbit.root,e.arena.fightView.referee.root,e.arena.fightView.audience.root],protectedSnapshots=protectedRoots.map(snapshot),camera=snapshot(e.camera),fight=JSON.stringify(e.arena.fightView.match);
const allOriginalMaterials=new Set([...originals,...ringOriginals,...protectedSnapshots.flat()].map(n=>n.material).filter(Boolean));
const originalColors=new Map([...allOriginalMaterials].map(m=>[m,m.color?.toArray()]));
assert.equal(venues.catalog.length,3);for(const v of venues.catalog)for(const l of ['en','he','ru'])assert.ok(v.names[l]&&v.description[l]);
assert.equal(venues.apply({},'neon_strip').reason,'arena_not_ready');assert.equal(venues.apply(e,'bad').reason,'unknown_venue');
const ownedMaterials=new Set(),ownedTextures=new Set();
function collect(){for(const root of [e.world.arena,e.arena.fightView.ring])root.traverse(n=>{if(n.material&&!allOriginalMaterials.has(n.material)){ownedMaterials.add(n.material);if(n.material.map&&!Array.from(allOriginalMaterials).some(m=>m.map===n.material.map))ownedTextures.add(n.material.map);}});}
for(const id of ['neon_strip','harbor_dome']){
 assert.equal(venues.apply(e,id).changed,true);collect();unchanged(originals,false);unchanged(ringOriginals,false);protectedSnapshots.forEach(s=>unchanged(s));unchanged(camera);assert.equal(JSON.stringify(e.arena.fightView.match),fight);
 for(const [m,color]of originalColors)assert.deepEqual(m.color?.toArray(),color,'shared original material never recolored');
 const count=canvases,active=[...originals,...ringOriginals].map(s=>s.node.material);assert.equal(venues.apply(e,id).changed,false);assert.equal(canvases,count);assert.deepEqual([...originals,...ringOriginals].map(s=>s.node.material),active);
}
const cachedCanvasCount=canvases;venues.apply(e,'neon_strip');venues.apply(e,'harbor_dome');assert.equal(canvases,cachedCanvasCount,'theme switch reuses cached texture');
let oldLocaleDisposed=0;for(const t of ownedTextures)t.addEventListener('dispose',()=>oldLocaleDisposed++);
venues.apply(e,'harbor_dome','he');assert.ok(oldLocaleDisposed>0);const hebrewCount=canvases;venues.apply(e,'harbor_dome','he');assert.equal(canvases,hebrewCount);
venues.apply(e,'default');unchanged(originals);unchanged(ringOriginals);protectedSnapshots.forEach(s=>unchanged(s));
let materialDisposals=0;for(const m of ownedMaterials)m.addEventListener('dispose',()=>materialDisposals++);
venues.dispose(e);assert.equal(materialDisposals,ownedMaterials.size,'all cached clones released exactly once');unchanged(originals);unchanged(ringOriginals);venues.dispose(e);assert.equal(materialDisposals,ownedMaterials.size);
// Arena's own disposer must see original ring materials, not theme clones or borrowed theme textures.
venues.apply(e,'neon_strip');const oldView=e.arena.fightView,wrapped=oldView.dispose;let cloneDisposed=0,originalDisposed=0;
const canvas=oldView.ring.getObjectByName('Woven boxing canvas'),original=ringOriginals.find(s=>s.node===canvas).material;
canvas.material.addEventListener('dispose',()=>cloneDisposed++);original.addEventListener('dispose',()=>originalDisposed++);
e.arena.setTarget('none');assert.equal(cloneDisposed,1);assert.equal(originalDisposed,1);assert.notEqual(oldView.dispose,wrapped);
venues.apply(e,'harbor_dome');e.arena.setTarget('fight');const newRing=e.arena.fightView.ring;const themedCanvas=newRing.getObjectByName('Woven boxing canvas').material;venues.apply(e,'default');const newDefaults=snapshot(newRing);assert.notEqual(themedCanvas,newRing.getObjectByName('Woven boxing canvas').material,'new fight is themed before setTarget returns');venues.apply(e,'harbor_dome','ru');assert.notEqual(newRing.getObjectByName('Woven boxing canvas').material,newDefaults.find(s=>s.node.name==='Woven boxing canvas').material);venues.apply(e,'default');unchanged(newDefaults);venues.dispose(e);
// School identity is owned by GameWorldArt in the gym; changing profiles or locale
// while an arena theme is active must not borrow, restore or dispose school maps.
const school={school:{name:'Corner one',crest:'paw'},world:{facilities:['recovery_corner']}};
GameWorldArt.apply(e,school,'en');
const schoolSign=e.world.gym.getObjectByName('Foundry gym identity'),poster=e.world.gym.getObjectByName('Studio mobility poster');
for(const lang of ['he','ru','en']){
 venues.apply(e,'neon_strip',lang);school.school.name='Corner '+lang;GameWorldArt.apply(e,school,lang);
 const maps=[schoolSign.material.map,poster.material.map];let disposed=0;maps.forEach(t=>t.addEventListener('dispose',()=>disposed++));
 venues.apply(e,'harbor_dome',lang);venues.apply(e,'default',lang);venues.dispose(e);
 assert.equal(schoolSign.material.map,maps[0]);assert.equal(poster.material.map,maps[1]);assert.equal(disposed,0);
}
// Observe every cloned material and every generated texture, including superseded
// locales. Each theme resource must be disposed exactly once over full fight cycles.
const observed=new Map();
const track=resource=>{if(resource&&!observed.has(resource)){observed.set(resource,0);resource.addEventListener('dispose',()=>observed.set(resource,observed.get(resource)+1));}};
for(let cycle=0;cycle<3;cycle++){
 if(!e.arena.fightView)e.arena.setTarget('fight');
 const defaults=snapshot(e.arena.fightView.ring),shared=new Set([...snapshot(e.world.arena),...defaults].map(s=>s.material).filter(Boolean)),maps=new Set([...shared].map(m=>m.map).filter(Boolean));
 const match=e.arena.fightView.match,cameraBefore=snapshot(e.camera);e.isPlaying=cycle%2===0;const playing=e.isPlaying;
 for(const id of ['neon_strip','harbor_dome','neon_strip'])for(const lang of ['en','he','ru']){
  venues.apply(e,id,lang);
  for(const root of [e.world.arena,e.arena.fightView.ring])root.traverse(n=>{if(n.material&&!shared.has(n.material)){track(n.material);if(n.material.map&&!maps.has(n.material.map))track(n.material.map);}});
  assert.equal(e.arena.fightView.match,match);assert.equal(e.isPlaying,playing);unchanged(cameraBefore);
 }
 e.arena.setTarget('none');venues.dispose(e);
 for(const [resource,count]of observed)assert.equal(count,1,resource.type+' released exactly once after cycle '+cycle);
}
// Preserve legacy extensions, return values and exceptions; do not stack wrappers.
const nativeTarget=e.arena.setTarget,targetResult={},failure=new Error('legacy target failure');
const extension=function(mode,...args){assert.equal(this,e.arena);if(mode==='throw')throw failure;nativeTarget.call(this,mode,...args);return targetResult;};
e.arena.setTarget=extension;
const targetDescriptor=Object.getOwnPropertyDescriptor(e.arena,'setTarget');
venues.apply(e,'neon_strip','he');const targetWrapper=e.arena.setTarget;
venues.apply(e,'harbor_dome','ru');assert.equal(e.arena.setTarget,targetWrapper);
assert.throws(()=>e.arena.setTarget('throw'),error=>error===failure);
for(let i=0;i<2;i++){
 assert.equal(e.arena.setTarget('fight'),targetResult);
 const ring=e.arena.fightView.ring,themed=ring.getObjectByName('Woven boxing canvas').material;
 assert.equal(venues.apply(e,'harbor_dome','ru').changed,false,'legacy new fight already themed synchronously');
 venues.apply(e,'default');assert.notEqual(ring.getObjectByName('Woven boxing canvas').material,themed);
 venues.apply(e,'harbor_dome','ru');
}
assert.equal(e.arena.setTarget('none'),targetResult);venues.dispose(e);
assert.deepEqual(Object.getOwnPropertyDescriptor(e.arena,'setTarget'),targetDescriptor);
// An outer wrapper that retained ours after disposal must not reactivate themes.
const outer=function(...args){return targetWrapper.apply(this,args);};e.arena.setTarget=outer;
assert.equal(e.arena.setTarget('fight'),targetResult);const fresh=snapshot(e.arena.fightView.ring);
venues.dispose(e);unchanged(fresh);assert.equal(e.arena.setTarget,outer);
e.arena.setTarget('none');delete e.arena.setTarget;
assert.equal(e.arena.setTarget,nativeTarget);venues.apply(e,'default');venues.dispose(e);assert.equal(Object.hasOwn(e.arena,'setTarget'),false,'inherited target method restored without own property');
console.log('PASS synchronous legacy fight replacement, exact lifecycle unhook, preserved target return/errors, school-art ownership, profile/locale changes, three repeated fight cycles, all theme resources disposed once; venue originals, three localized themes, shared-material isolation, unchanged geometry/lights/camera/match, cached textures, locale disposal, fight lifecycle and exact default restore');
