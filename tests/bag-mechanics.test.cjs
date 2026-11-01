const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const bag=new HangingBag(),inertia=30*(.94*.94+1.15*1.15/12+.235*.235/4);near(bag.inertia.x,inertia);near(bag.frequency,Math.sqrt(30*9.81*.94/inertia));
const point=new THREE.Vector3(0,-.94,-.235),normal=new THREE.Vector3(0,0,-1),velocity=new THREE.Vector3(0,0,2),dt=1/240;
const load=bag.contact(point,normal,velocity,.02,dt);near(load.normalForce,4800*.02+45*2);near(bag.velocity.x,-.94*load.impulse/inertia);near(bag.velocity.y,0);near(bag.velocity.z,0);near(load.gloveDepth+load.bagDepth,.02);
bag.step(.05);assert.ok(bag.position.x<0,'a front strike must swing the hanging bag away from the fist');
const heavier=new HangingBag({mass:60});heavier.contact(point,normal,velocity,.02,dt);near(heavier.velocity.x*2,-.94*load.impulse/inertia);
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json')),coach=new LionCoach(data);
const glove=coach.gloveMeshes.L.geometry.attributes.position;let front=0;
for(let i=0;i<glove.count;i++)if(glove.getY(i)<-.198){front++;assert.ok(glove.getZ(i)<.035,'curled finger roll must remain behind the leading knuckle pad');}
assert.ok(front>50,'the knuckle pad needs a broad striking face');
for(const [move,index] of [['jab',0],['cross',1],['hook',0],['rear_hook',1],['uppercut',0]]){const m=coach.update(.48*1.22,move,'one_two'),g=m.gloves[index];assert.ok(new THREE.Vector3(...g.strikePoint).sub(new THREE.Vector3(...g.knuckles)).normalize().dot(new THREE.Vector3(...g.distal))>.99999,'knuckle face must align with a straight wrist');}
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),coach,animTime:0,technique:'cross',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);arena.setTarget('heavy');
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 arena.resetResponse(0);arena.context=null;let count=0,heightMin=10,heightMax=-10,peakForce=0,maxSwing=0,alignment=1;
 for(let t=0;t<1.18;t+=1/90){const m=arena.update(t,move,'one_two');peakForce=Math.max(peakForce,...m.loads.map(l=>l.normalForce),0);maxSwing=Math.max(maxSwing,arena.springs.heavy.position.length());
  if(m.loads.length){const i=['cross','rear_hook','rear_uppercut'].includes(move)?1:0,g=m.hero.gloves[i],face=coach.root.localToWorld(new THREE.Vector3(...g.strikePoint));heightMin=Math.min(heightMin,face.y);heightMax=Math.max(heightMax,face.y);count++;const c=arena.collision(coach.root.localToWorld(new THREE.Vector3(...g.knuckles)),'heavy');if(m.hero.phase>.4&&m.hero.phase<.51&&!move.includes('uppercut'))alignment=Math.min(alignment,new THREE.Vector3(...g.distal).transformDirection(coach.root.matrixWorld).dot(c.normal.clone().negate()));}
  assert.ok(m.hero.footTargets.every(f=>f.error<.001)&&m.hero.handErrors.every(n=>n<.001),'bag targets must stay reachable');
 }
 console.log(move,{count,heightMin:heightMin.toFixed(3),heightMax:heightMax.toFixed(3),peakForce:peakForce.toFixed(1),maxSwing:maxSwing.toFixed(3),alignment:alignment.toFixed(3)});
 assert.ok(count>1&&peakForce>10&&maxSwing>.005,'contact must drive the bag throughout the strike');assert.ok(heightMin>1.30&&heightMax<1.72,'strikes must hit the bag body rather than its top');if(!move.includes('uppercut'))assert.ok(alignment>.70,'knuckles must lead into the bag, not the curled fingers');
}
function sample(rate){arena.setTarget('heavy');for(let i=0;i<=rate;i++)arena.update(i/rate,'cross','one_two');return arena.springs.heavy.position.clone();}
const slow=sample(30),normalRate=sample(60),fine=sample(120);console.log('frame-rate difference',slow.distanceTo(normalRate),normalRate.distanceTo(fine));assert.ok(slow.distanceTo(normalRate)<.001&&normalRate.distanceTo(fine)<.02,'contact dynamics must converge across playback frame rates');
arena.setTarget('heavy');for(let i=0;i<=60;i++){const m=arena.update(i/60,'guard','one_two');assert.equal(m.loads.length,0);}assert.ok(arena.springs.heavy.position.length()<1e-12,'the bag must not move without a contact force');
console.log('PASS knuckle-first contact, lower moving targets, mass/inertia, sustained force and frame-rate convergence');

arena.setTarget('heavy');let follow=0,events=0;
for(let t=0;t<4.5;t+=1/60){const m=arena.update(t,'combo','one_two_hook');follow=Math.max(follow,arena.followAdvance);events+=m.contacts.length;assert.ok(m.hero.footTargets.every(f=>f.error<.001)&&m.hero.handErrors.every(n=>n<.001),'following a swinging bag must keep the limbs reachable');}
assert.ok(follow>.02&&events>=2,'the boxer must step into range as the bag swings away');
