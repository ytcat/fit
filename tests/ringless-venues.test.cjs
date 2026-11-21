// GOTR-0065: the Street, the Basement and the Dockside Hangar have no ring. Ring hardware and referee hidden there (shown in
// every ring venue), a close circle of standing people, both fighters bare-handed in the place's clothes, the fighters kept
// inside the floor circle by the bout's own limits, the mirrored cast intact, and everything restored on the way out.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({measureText:text=>({width:text.length*25}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})})})};
for(const file of ['boxing-routines.js','boxing-footwear.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','gym-details.js','fight-arena.js','club-world.js','adventure/story/story-cast.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const sets=require('../arena-sets.js');window.ArenaSets=sets;
const R=require('../ringless-venues.js'),venues=require('../game-venues.js');
assert.equal(window.RinglessVenues,R);
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data);
const e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=coach.root;e.scene.add(coach.root);
const hemi=new THREE.HemisphereLight(0xdbeaff,0x404040,.48),key=new THREE.DirectionalLight(0xfffaed,2.8),fill=new THREE.DirectionalLight(0xa6c9ff,.65),rims=[new THREE.PointLight(0xf4f4f4,2,10),new THREE.PointLight(0xf4f4f4,2,10)];key.castShadow=true;e.scene.add(hemi,key,fill,...rims);
e.arena=new TrainingArena(e,data);e.world=new ClubWorld(e);e.fightOptions={seed:74,rounds:1,roundSeconds:20,restSeconds:1};e.arena.setTarget('fight');e.world.update(0,'fight');
e.camera.position.set(0,1.82,5.1);e.camera.lookAt(0,1.3,0);
const frame=()=>{e.world.update(e.animTime,'fight');e.camera.updateMatrixWorld(true);e.scene.onBeforeRender(null,e.scene,e.camera);};
const shown=n=>{for(let o=n;o;o=o.parent)if(!o.visible)return false;return true;};
const RINGLESS=['underground','street','docks'];
assert.deepEqual([...R.ids].sort(),[...RINGLESS].sort());
for(const id of sets.ids)assert.equal(sets.build(id,'en').ring,!RINGLESS.includes(id),id+' set says whether it has a ring');
// The story fights of Chapter 1 (beat 6 market robbery, beat 10 the docks) and Chapter 2 (Market Row) take place in ringless venues.
const town=fs.readFileSync('adventure/oldtown.js','utf8');
for(const [step,venue] of [['market_robber','street'],['docks_fight','docks']]){assert.match(town,new RegExp(step+": \\{ kind: 'story_fight', venue: '"+venue+"'"),step+' is fought in '+venue);assert.equal(R.isRingless(venue),true);}
assert.match(town,/2: \{ venue: 'street'/,'Chapter 2 missions are fought in the Street');
assert.equal(R.outfitFor('street'),'street');assert.equal(R.outfitFor('docks'),'track_wraps');assert.equal(R.outfitFor('championship'),'kit');
const gloves=c=>[c.gloveMeshes.L,c.gloveMeshes.R];
const bare=c=>['L','R'].map(s=>c.joints['hand'+s].children.find(o=>o.userData.storyPart&&/Bare hand/.test(o.name)&&o.visible));
for(const id of [...sets.ids,'default','neon_strip']){
 venues.apply(e,id,'en');e.arena.setTarget('fight');frame();
 const view=e.arena.fightView,ringless=RINGLESS.includes(id),fighters=Object.values(view.coaches);
 assert.equal(!!view.ringless,ringless,id+' ringless');
 // Ring hardware: canvas, apron, posts, ropes, corner pads, steps all live in view.ring.
 assert.ok(view.ring.children.length>=20);for(const part of view.ring.children)assert.equal(shown(part),!ringless,id+' ring part '+(part.name||part.type));
 assert.equal(shown(view.referee.root),!ringless,id+' referee');
 // GOTR-0074 mirror kept: the cast is mirrored at its root, fighters at scale 1 inside it.
 assert.equal(view.cast.scale.x,-1);for(const c of fighters){assert.equal(c.root.parent,view.cast);assert.equal(c.root.scale.x,1);}
 for(const c of fighters){
  assert.equal(window.StoryCast.outfitOf(c),ringless?R.outfitFor(id):'kit',id+' '+c.species+' outfit');
  for(const g of gloves(c))assert.equal(shown(g),!ringless,id+' '+c.species+' gloves');
  if(ringless)for(const h of bare(c))assert.ok(h&&shown(h),id+' '+c.species+' bare hands');
 }
 if(ringless){
  // A loose circle of standing people close round the fighters: crowd meshes with many vertices 2.6-4.4 m from the centre, all round.
  const set=e.world.arena.children.find(n=>n.userData.arenaSet),angles=new Set();let close=0;const v=new THREE.Vector3();
  set.traverse(n=>{if(!n.isMesh||!/^Arena set [ab]\d$/.test(n.name))return;const p=n.geometry.attributes.position;for(let i=0;i<p.count;i+=9){v.fromBufferAttribute(p,i);const r=Math.hypot(v.x,v.z);if(r>2.6&&r<4.4&&v.y>.3){close++;angles.add(Math.floor((Math.atan2(v.x,v.z)+Math.PI)/(Math.PI/6)));}}});
  assert.ok(close>500,id+' close crowd '+close);assert.equal(angles.size,12,id+' crowd all the way round');
  // The bout runs with its own limits: both fighters stay inside the floor circle (radius 2.3), the HUD count works.
  let far=0,t=0;const m=view.match;
  for(let i=0;i<60*24;i++){t=i/60;e.animTime=t;e.arena.update(t,'fight','one_two');if(i%6===0)frame();for(const c of fighters){const p=c.root.position;far=Math.max(far,Math.hypot(p.x,p.z));}if(m.phase==='ceremony')break;}
  assert.ok(far>.3&&far<2.0,id+' fighters inside the circle: '+far.toFixed(2));
  for(const part of view.ring.children)assert.equal(shown(part),false,id+' ring stays hidden through the bout');assert.equal(shown(view.referee.root),false);
  for(const c of fighters)for(const g of gloves(c))assert.equal(shown(g),false,id+' no gloves through the bout');
  console.log(`PASS ${id}: no ring, no referee, bare hands (${R.outfitFor(id)}), ${close} crowd points close round, fighters within ${far.toFixed(2)} m`);
 }else console.log(`PASS ${id}: ring, ropes, posts and referee shown; gloves on`);
}
// Leaving a ringless venue mid-fight puts the ring, the referee and the kit back; a new fight in a ringless venue is dressed again.
venues.apply(e,'street','en');e.arena.setTarget('fight');frame();let view=e.arena.fightView;assert.ok(view.ringless);
venues.apply(e,'championship','en');frame();assert.equal(view.ringless,null);assert.equal(shown(view.ring),true);assert.equal(shown(view.referee.root),true);for(const c of Object.values(view.coaches)){assert.equal(window.StoryCast.outfitOf(c),'kit');for(const g of gloves(c))assert.equal(shown(g),true);}
venues.apply(e,'docks','en');frame();assert.ok(view.ringless);e.arena.setTarget('none');assert.equal(view.ringless,null,'disposing the fight view undoes the staging');assert.equal(window.StoryCast.outfitOf(coach),'kit');for(const g of gloves(coach))assert.equal(g.visible,true);
e.arena.setTarget('fight');frame();assert.ok(e.arena.fightView.ringless);venues.dispose(e);assert.equal(e.arena.fightView.ringless,null);assert.equal(window.StoryCast.outfitOf(coach),'kit');
console.log('PASS ringless venues: ring/referee per venue, crowd circle, bare hands, boundary, mirror, restore');
