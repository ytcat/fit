// GOTR-0002: modelled belts and headbands fit both rigs in every pose family
// (guard, punches, slips/rolls, footwork, jump rope) without poking through.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const c0=new LionCoach(data),e={coach:c0,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c0.root;e.scene.add(c0.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
const A=require('../game-accessories.js'),V=()=>new THREE.Vector3();
const poses=[];for(const move of ['guard','jab','cross','hook','rear_hook','uppercut','rear_uppercut','slip','roll','step'])for(const phase of [.25,.43,.65])poses.push(['none',move,phase]);for(const t of [.1,.35,.6,.85])poses.push(['rope','guard',t]);
const report={};
for(const species of ['lion','rabbit']){e.targetMode='none';e.roster.select(species);const c=e.coach;
 // Drawn geometry stays cheap: one draw call per material, a few thousand triangles.
 for(const id of ['champion_belt','heritage_belt']){A.look(c,[id]);const g=c.root.getObjectByName('Cosmetic '+id);assert.ok(g?.visible,id+' visible');let tris=0,meshes=0;g.traverse(n=>{if(n.isMesh){meshes++;tris+=n.geometry.attributes.position.count/3;}});assert.ok(meshes<=3,'belt draws in at most three calls');assert.ok(tris<9000,id+' triangle budget '+tris);report[species+' '+id]={meshes,tris};assert.equal(g.parent,c.joints.hips,'belt rides the pelvis bone');}
 for(const id of ['headband','bandana']){A.look(c,[id,'armbands']);const g=c.root.getObjectByName('Cosmetic '+id);let tris=0,meshes=0;g.traverse(n=>{if(n.isMesh){meshes++;tris+=n.geometry.attributes.position.count/3;}});assert.equal(g.parent,c.joints.head,'headband rides the head bone');assert.ok(meshes<=2&&tris<4000,id+' cheap: '+meshes+' calls '+tris+' tris');report[species+' '+id]={meshes,tris};
  // The cloth band clears the bind-pose head surface everywhere (convex hull + clearance).
  const P=c.skin.geometry.attributes.position,inv=c.skeleton.boneInverses[c.bones.indexOf(c.joints.head)],v=V();let inside=0;const band=g.children[0].children[0].geometry.attributes.position;for(let i=0;i<band.count;i++){v.fromBufferAttribute(band,i);if(Math.hypot(v.x,v.z)<.06)inside++;}assert.equal(inside,0,'band has no collapsed vertices');
  // GOTR-0030: the band rests on the forehead: its lowest point in front of the face stays above the eyes,
  // lids and brows (with their facial acting) and no band vertex enters an ear, in guard, punches, slip and roll.
  const head=c.joints.head,box=n=>{n.geometry.computeBoundingBox();n.updateMatrix();return n.geometry.boundingBox.clone().applyMatrix4(n.matrix).getCenter(V());};
  const feats=head.children.filter(n=>{if(!n.isMesh||!n.geometry)return false;const m=box(n);return m.z>.1&&Math.abs(m.x)<.16&&m.y>.12&&m.y<.25;}),ears=[];
  assert.ok(feats.filter(n=>n.userData.eye).length>=2,'eyes found on the '+species);
  head.traverse(n=>{if(!n.isMesh||n.geometry?.type!=='SphereGeometry')return;const m=new THREE.Matrix4();for(let p=n;p&&p!==head;p=p.parent){p.updateMatrix();m.premultiply(p.matrix);}const o=V().setFromMatrixPosition(m);if(Math.abs(o.x)>.06&&o.y>.2&&o.z<.06&&o.z>-.08)ears.push(m.invert());});
  assert.ok(ears.length>=2,'ears found on the '+species);
  let low=9,top=-9,earHits=0;const hi=new THREE.Matrix4(),m=new THREE.Matrix4();
  for(const [move,phase] of [['guard',.25],['jab',.45],['cross',.45],['hook',.45],['uppercut',.45],['slip',.45],['roll',.45]]){c.update(phase*1.22,move,'one_two');c.root.updateMatrixWorld(true);hi.copy(head.matrixWorld).invert();
   for(const f of feats){const P=f.geometry.attributes.position;m.multiplyMatrices(hi,f.matrixWorld);for(let i=0;i<P.count;i++)top=Math.max(top,v.fromBufferAttribute(P,i).applyMatrix4(m).y);}
   g.traverse(n=>{if(!n.isMesh)return;const P=n.geometry.attributes.position;m.multiplyMatrices(hi,n.matrixWorld);for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m);if(v.z>.08&&Math.abs(v.x)<.12)low=Math.min(low,v.y);for(const ear of ears)if(v.clone().applyMatrix4(ear).length()<1)earHits++;}});}
  report[species+' '+id].browClearance=+(low-top).toFixed(4);
  assert.ok(low-top>=.008,id+' must sit above the eyes and brows on the '+species+': clearance '+(low-top).toFixed(4)+' m');
  assert.equal(earHits,0,id+' must pass under the ears on the '+species);}
 for(const side of ['L','R'])assert.ok(c.joints['arm'+side].children.some(n=>n.name==='Arm ribbon knot '+side&&n.visible),'arm ribbon knot on the upper-arm bone '+side);
 A.look(c,['champion_belt','heritage_belt']);for(const side of ['L','R'])assert.equal(c.joints['arm'+side].getObjectByName('Arm ribbon knot '+side).visible,false,'knots hide with their ribbons');assert.equal(c.root.getObjectByName('Cosmetic champion_belt').visible,false,'only one belt is worn at a time');
 const B=A.fit.belt(c),[yb,,yt]=B.ys,T=A.fit.strapThickness;
 // Body samples around the waist: skin and shorts, bind-space window near the pelvis.
 const samples=[];for(const mesh of [c.skin,c.shorts]){const P=mesh.geometry.attributes.position;for(let i=0;i<P.count;i+=mesh===c.shorts?5:2){const y=P.getY(i)-.99;if(y>-.06&&y<.32)samples.push([mesh,i]);}}
 // Back surface of the rigid front plate (min z per 1 cm cell of its footprint), for both belts.
 const plates={};for(const id of ['champion_belt','heritage_belt']){A.look(c,[id]);const cells=new Map();c.root.getObjectByName('Cosmetic '+id).traverse(n=>{if(!n.isMesh)return;const P=n.geometry.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i);if(z<.12||Math.abs(x)>.135)continue;const k=Math.round(x*100)+','+Math.round(y*100);const o=cells.get(k)||[9,-9];cells.set(k,[Math.min(o[0],z),Math.max(o[1],z)]);}});plates[id]=cells;}
 const gloves=[c.gloveMeshes.L,c.gloveMeshes.R].filter(Boolean);let plateWorst=-1,plateWhere='';
 let worst=-1,where='';const dbg={};const v=V(),inv=new THREE.Matrix4();
 for(const [mode,move,phase] of poses){if(e.arena.mode!==mode)e.arena.setTarget(mode);const t=phase*1.22;if(mode==='rope')e.arena.update(t*4,move,'one_two');else c.update(t,move,'one_two');c.root.updateMatrixWorld(true);inv.copy(c.joints.hips.matrixWorld).invert();
  for(const [mesh,i] of samples){c.skinPoint(mesh,i,v);v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);for(const [id,cells] of Object.entries(plates)){const z=cells.get(Math.round(v.x*100)+','+Math.round(v.y*100));if(z!==undefined&&v.z-z[0]>plateWorst){plateWorst=v.z-z[0];plateWhere=[species,id,mesh===c.skin?'skin':'shorts',move,phase,v.toArray().map(n=>n.toFixed(3))].join(' ');}}if(v.y<yb+.004||v.y>yt-.004)continue;const th=Math.atan2(v.x,v.z),pen=Math.hypot(v.x,v.z)-(B.radius(th,v.y)+T);if(process.env.DEBUG_FIT&&pen>0){const k=move+' y'+(Math.floor(v.y*100)/100)+' '+(mesh===c.skin?'skin':'shorts');dbg[k]=Math.max(dbg[k]||0,pen);}if(pen>worst){worst=pen;where=[species,mode,move,phase,mesh===c.skin?'skin':'shorts',v.toArray().map(n=>n.toFixed(3))].join(' ');}}for(const glove of gloves){const P=glove.geometry.attributes.position;for(let i=0;i<P.count;i+=7){v.fromBufferAttribute(P,i).applyMatrix4(glove.matrixWorld).applyMatrix4(inv);for(const [id,cells] of Object.entries(plates)){const z=cells.get(Math.round(v.x*100)+','+Math.round(v.y*100)),depth=z?Math.min(v.z-z[0],z[1]-v.z):-1;if(depth>plateWorst){plateWorst=depth;plateWhere=[species,id,'glove',move,phase,v.toArray().map(n=>n.toFixed(3))].join(' ');}}}}}
 // GOTR-0030: the trunk waistband (belt-slot items) rides the shorts: each band vertex carries the skin weights of its
 // nearest shorts vertex, so in every pose it keeps its bind-pose offset from the shorts (no shorts pushing through).
 {global.GameAccessories=A;const P=require('../game-presentation.js');P.materials(c);const trunk=c.trunkWaistband,src=trunk.geometry.userData.source,a=V(),b=V(),rest=[];assert.ok(trunk.isSkinnedMesh,'waistband is skinned with the shorts');
  for(let i=0;i<src.length;i+=3){a.fromBufferAttribute(trunk.geometry.attributes.position,i);b.fromBufferAttribute(c.shorts.geometry.attributes.position,src[i]);rest.push([i,a.distanceTo(b)]);}
  let drift=0,at='';for(const [mode,move,phase] of poses){if(e.arena.mode!==mode)e.arena.setTarget(mode);const t=phase*1.22;if(mode==='rope')e.arena.update(t*4,move,'one_two');else c.update(t,move,'one_two');c.root.updateMatrixWorld(true);
   for(const [i,d0] of rest){const d=c.skinPoint(trunk,i,a).distanceTo(c.skinPoint(c.shorts,src[i],b));if(Math.abs(d-d0)>drift){drift=Math.abs(d-d0);at=[species,move,phase].join(' ');}}}
  report[species+' waistband offset drift from the shorts (m)']=+drift.toFixed(4)+' at '+at;assert.ok(drift<.004,'waistband stays on the shorts in every pose: '+drift.toFixed(4)+' '+at);}
 if(process.env.DEBUG_FIT)console.log(species,JSON.stringify(Object.fromEntries(Object.entries(dbg).map(([k,v])=>[k,+v.toFixed(3)]))));report[species+' strap worst body penetration (m)']=+worst.toFixed(4)+' at '+where;
 report[species+' front plate worst intrusion (m)']=+plateWorst.toFixed(4)+' at '+plateWhere;assert.ok(plateWorst<.004,'body and gloves stay behind the front plate: '+plateWorst.toFixed(4)+' '+plateWhere);
 assert.ok(worst<.004,'body must stay under the strap leather in every pose: '+worst.toFixed(4)+' '+where);
 e.arena.setTarget('none');
}
console.log(JSON.stringify(report,null,1));
console.log('PASS head bands above the eyes and brows and under the ears; trunk waistband over the shorts in every pose; modelled belts: one per wearer, ≤3 draw calls, triangle budget, strap clears skin and shorts in guard, punches, slips, rolls, steps and jump rope for lion and rabbit');
