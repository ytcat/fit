// GOTR-0022: built arena sets stay dressing around an untouched ring, within a phone budget, and restore exactly.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;let canvases=0;
global.document={createElement:()=>{canvases++;return {getContext:()=>new Proxy({measureText:text=>({width:text.length*25}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})})};}};
for(const file of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','gym-details.js','fight-arena.js','club-world.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const sets=require('../arena-sets.js');window.ArenaSets=sets;
const venues=require('../game-venues.js'),D=require('../game-domain.js'),data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data);
const e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=e.activeModel=coach.root;e.scene.add(coach.root);
// Same light rig shape as the app: hemisphere, shadow key, fill and two rims.
const hemi=new THREE.HemisphereLight(0xdbeaff,0x404040,.48),key=new THREE.DirectionalLight(0xfffaed,2.8),fill=new THREE.DirectionalLight(0xa6c9ff,.65),rims=[new THREE.PointLight(0xf4f4f4,2,10),new THREE.PointLight(0xf4f4f4,2,10)];key.castShadow=true;e.scene.add(hemi,key,fill,...rims);
e.arena=new TrainingArena(e,data);e.world=new ClubWorld(e);e.fightOptions={seed:74};e.arena.setTarget('fight');e.world.update(0,'fight');
const built=sets.ids;assert.ok(built.length>=3);
for(const id of built){assert.ok(D.venueIds.includes(id),id+' is a persistent venue id');const entry=venues.catalog.find(v=>v.id===id);assert.ok(entry,id+' is in the gallery catalog');for(const l of ['en','he','ru'])assert.ok(entry.names[l]&&entry.description[l]);}
assert.deepEqual(venues.catalog.map(v=>v.id),D.venueIds);assert.equal(sets.has('default'),false);assert.equal(sets.has('toString'),false);
const lights=()=>{const out=[];e.scene.traverse(n=>{if(n.isLight)out.push([n.uuid,n.type,n.color.getHex(),n.groundColor?.getHex(),n.intensity,n.castShadow,n.position.toArray().join()].join('|'));});return out;};
const snapshot=root=>{const out=[];root.traverse(n=>out.push({node:n,material:n.material,geometry:n.geometry,p:n.position.toArray(),q:n.quaternion.toArray(),s:n.scale.toArray(),visible:n.visible,mask:n.layers.mask,parent:n.parent}));return out;};
const same=(items,masks=true)=>{for(const s of items){assert.equal(s.node.material,s.material);assert.equal(s.node.geometry,s.geometry);assert.deepEqual(s.node.position.toArray(),s.p);assert.deepEqual(s.node.quaternion.toArray(),s.q);assert.deepEqual(s.node.scale.toArray(),s.s);assert.equal(s.node.visible,s.visible);assert.equal(s.node.parent,s.parent);if(masks)assert.equal(s.node.layers.mask,s.mask);}};
const stock=snapshot(e.world.arena),stockLights=lights(),background=e.scene.background.getHex(),fog=[e.scene.fog.near,e.scene.fog.far,e.scene.fog.color.getHex()],camera=snapshot(e.camera);
const frame=()=>{e.world.update(e.animTime,'fight');e.camera.updateMatrixWorld(true);e.scene.onBeforeRender(null,e.scene,e.camera);};
const budget={triangles:60000,meshes:48};
for(const id of built){
 e.arena.fightView.setRing(true); // each venue is compared against the ringed baseline
 const view=e.arena.fightView,match=JSON.stringify(view.match),ring=snapshot(view.ring).map(s=>({...s,material:undefined})),fighters=[coach.root,view.coaches.rabbit.root,view.referee.root].map(snapshot);
 const before=canvases;assert.equal(venues.apply(e,id,'en').changed,true);assert.equal(canvases-before<=2,true,'one atlas canvas plus the canvas print');
 const group=e.world.arena.children.find(n=>n.userData.arenaSet);assert.ok(group,id+' set attached to the arena group');
 // Budget: a few merged meshes, three shared materials, one small atlas, nothing that lights or casts shadows.
 const meshes=[],materials=new Set(),geometries=new Set();let triangles=0;group.traverse(n=>{assert.equal(n.isLight,undefined);if(!n.isMesh)return;meshes.push(n);materials.add(n.material);geometries.add(n.geometry);triangles+=n.geometry.index.count/3;assert.equal(n.castShadow,false);assert.equal(n.receiveShadow,false);assert.equal(n.userData.arenaSet,true);});
 assert.ok(meshes.length<=budget.meshes,`${id} meshes ${meshes.length}`);assert.ok(triangles<=budget.triangles,`${id} triangles ${triangles}`);assert.ok(materials.size<=3);
 const maps=new Set([...materials].map(m=>m.map).filter(Boolean));assert.equal(maps.size,1);const image=[...maps][0].image;assert.ok(image.width*image.height<=1024*512);
 for(const m of materials)assert.equal(m.isMeshBasicMaterial,true,'baked light: no per-pixel lighting cost');
 // The stock hall is masked from the camera, not edited; the ring, fighters, referee, camera and match are untouched.
 same(stock,false);for(const s of stock)assert.equal(s.node.layers.mask,s.node.isLight||s.node===e.world.arena?s.mask:0);
 // GOTR-0065: the Street, the Basement and the Dockside Hangar stage the bout on the floor: ring hardware and referee hidden, nothing moved or rebuilt.
 const ringless=['underground','street','docks'].includes(id);assert.equal(!!view.ringless,ringless,id+' ringless flag');assert.equal(group.parent.children.includes(group)&&venues.catalog.some(v=>v.id===id),true);
 for(const s of ring){assert.equal(s.node.geometry,s.geometry);assert.deepEqual(s.node.position.toArray(),s.p);assert.deepEqual(s.node.scale.toArray(),s.s);if(!ringless||s.node.parent!==view.ring)assert.equal(s.node.visible,s.visible);else assert.equal(s.node.visible,!!s.node.userData.ground,'only the shadow floor shows in a ringless venue');}
 if(ringless){assert.equal(view.referee.root.visible,false,id+' has no referee');view.referee.root.visible=true;}
 fighters.forEach(s=>same(s));if(ringless)view.referee.root.visible=false;same(camera);assert.equal(JSON.stringify(view.match),match);assert.equal(view.audience.root.visible,false,'set crowd replaces the stock audience');
 assert.deepEqual(lights().map(l=>l.split('|').slice(0,2).join()),stockLights.map(l=>l.split('|').slice(0,2).join()),'no light added or removed');
 // First rendered frame applies the mood; spectators between camera and ring are hidden.
 e.camera.position.set(0,1.82,5.1);e.camera.lookAt(0,1.3,0);frame();
 assert.notEqual(e.scene.background.getHex(),background);assert.equal(e.scene.fog.color.getHex(),e.scene.background.getHex());assert.notDeepEqual(lights(),stockLights);
 assert.deepEqual(lights().map(l=>l.split('|').slice(5).join()),stockLights.map(l=>l.split('|').slice(5).join()),'light positions and shadow flags unchanged');
 const yaw=e.world.arena.rotation.y,local=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw),sectors=group.children.filter(n=>n.name.startsWith('Arena set sector'));assert.equal(sectors.length,8);
 sectors.forEach((s,i)=>{const dot=Math.sin(i*Math.PI/4)*local.x+Math.cos(i*Math.PI/4)*local.z;assert.equal(s.visible,dot<.12,`sector ${i} culling`);});
 assert.ok(sectors.some(s=>s.visible)&&sectors.some(s=>!s.visible));
 e.camera.position.set(0,1.82,-5.1);e.camera.lookAt(0,1.3,0);const shown=sectors.map(s=>s.visible);frame();assert.notDeepEqual(sectors.map(s=>s.visible),shown,'culling follows the camera');
 // Idempotent, cheap locale change, and a new fight is dressed before setTarget returns.
 const count=canvases;assert.equal(venues.apply(e,id,'en').changed,false);venues.apply(e,id,'he');assert.equal(e.world.arena.children.find(n=>n.userData.arenaSet),group,'locale repaints the atlas, no rebuild');assert.ok(canvases-count<=1);
 e.arena.setTarget('fight');assert.notEqual(e.arena.fightView,view);assert.equal(e.arena.fightView.audience.root.visible,false);assert.equal(e.world.arena.children.filter(n=>n.userData.arenaSet).length,1);
 // Leaving the fight restores the stock mood; coming back re-applies it.
 e.arena.setTarget('none');e.world.update(0,'none');e.scene.onBeforeRender(null,e.scene,e.camera);assert.deepEqual(lights(),stockLights);assert.deepEqual([e.scene.fog.near,e.scene.fog.far],fog.slice(0,2));assert.notEqual(e.scene.background.getHex(),sets.build(id,'en').mood.background);
 e.arena.setTarget('fight');frame();assert.notDeepEqual(lights(),stockLights);
 // Back to the original hall: exact restore and every set resource released once.
 let disposed=0;for(const r of [...geometries,...materials,...maps])r.addEventListener('dispose',()=>disposed++);
 assert.equal(venues.apply(e,'default','en').changed,true);frame();
 assert.equal(disposed,geometries.size+materials.size+maps.size);assert.equal(group.parent,null);same(stock);assert.deepEqual(lights(),stockLights);assert.equal(e.scene.background.getHex(),background);assert.deepEqual([e.scene.fog.near,e.scene.fog.far,e.scene.fog.color.getHex()],fog);assert.equal(e.arena.fightView.audience.root.visible,true);
 console.log(`PASS ${id}: ${meshes.length} meshes, ${triangles} triangles, ${materials.size} materials, ${image.width}x${image.height} atlas`);
}
// Switching straight between sets and recoloured styles never stacks sets or leaks masks.
for(const id of [...built,'neon_strip',built[0],'harbor_dome',...built]){venues.apply(e,id,'ru');frame();assert.equal(e.world.arena.children.filter(n=>n.userData.arenaSet).length,sets.has(id)?1:0);if(!sets.has(id)){same(stock.map(s=>({...s,material:s.node.material})));assert.deepEqual(lights(),stockLights);assert.equal(e.arena.fightView.audience.root.visible,true);}}
assert.equal(venues.apply(e,'not_a_venue').reason,'unknown_venue');
venues.dispose(e);frame();same(stock);assert.deepEqual(lights(),stockLights);assert.equal(e.scene.background.getHex(),background);assert.equal(Object.hasOwn(e.scene,'onBeforeRender'),false,'scene hook removed');assert.equal(e.arena.fightView.audience.root.visible,true);venues.dispose(e);
// A pre-existing scene callback is chained and handed back intact.
let calls=0;const mine=function(){calls++;};e.scene.onBeforeRender=mine;venues.apply(e,built[0],'en');frame();assert.equal(calls,1);venues.dispose(e);assert.equal(e.scene.onBeforeRender,mine);delete e.scene.onBeforeRender;
// Without the set builder the gallery entry degrades to ring colours on the stock hall.
delete window.ArenaSets;assert.equal(venues.apply(e,built[0],'en').applied,true);assert.equal(e.world.arena.children.some(n=>n.userData.arenaSet),false);venues.dispose(e);same(stock);
console.log('PASS built arena sets: catalog/domain parity, budgets, masked stock hall, untouched ring/fighters/camera/match, camera-side culling, mood on/off, locale repaint, new-fight dressing, exact restore, single disposal, chained scene hook and no-builder fallback');
