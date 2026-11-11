// GOTR-0037: data-driven muscle definition on the real skinned surface of both species.
// Relief stays bounded and anatomical, fur inherits it, the CPU skin matches, poses drive it
// (biceps bunch in a flexed guard, triceps/deltoid with extension, lats stretch), and it is built once.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const D=AvatarAnatomy.definition,R=.03/32767,report={};
const required=['pectoralis','rectus','obliques','serratus','trapezius','infraspinatus','teres','latissimus','erector','deltoid front','deltoid side','deltoid rear','biceps','brachialis','triceps lateral','triceps long','forearm extensors','forearm flexors','vastus medialis','gastrocnemius','soleus','tibialis'];
for(const species of ['lion','rabbit']){
 const c=new LionCoach(data,{species}),g=c.skin.geometry,d=g.attributes.avatarDefinition,n=g.attributes.avatarDefinitionNormal,info=c.definitionData;
 assert.ok(d&&n&&d.normalized&&n.normalized,'definition attributes on the body');assert.equal(c.shoulderData?.restFNV32!==undefined,true,'rest surface unchanged: the baked shoulder correctives still validate');
 // Every atlas group exists on both sides with real coverage.
 for(const name of required)for(const side of ['L','R']){const k=info.groups.indexOf(name+' '+side);assert.ok(k>=0,name+' '+side+' missing');let count=0;for(let i=0;i<info.count;i++)if(info.group[i]===k)count++;assert.ok(count>=60,name+' '+side+' covers '+count+' vertices');}
 // Bounded relief (mm-scale, carving and raising), finite normals.
 let out=0,inward=0,moved=0;const P=g.attributes.position,N=g.attributes.normal;
 for(let i=0;i<d.count;i++){const x=d.array[i*4]*R,y=d.array[i*4+1]*R,z=d.array[i*4+2]*R,len=Math.hypot(x,y,z),s=Math.sign(x*N.getX(i)+y*N.getY(i)+z*N.getZ(i));assert.ok(len<.02,'relief stays under 2 cm');if(len>.001)moved++;if(s>0)out=Math.max(out,len);else inward=Math.max(inward,len);}
 assert.ok(moved>15000,'relief covers torso, back, arms and legs: '+moved);assert.ok(out>.006&&inward>.002,'muscles rise and their borders carve: '+out+' '+inward);
 // Head, hands-in-gloves and the groin under the shorts are untouched.
 for(let i=0;i<d.count;i+=7){const y=P.getY(i),x=Math.abs(P.getX(i));if(y>1.95||x>.93||(y>.80&&y<1.0&&x<.12))assert.ok(Math.hypot(d.array[i*4],d.array[i*4+1],d.array[i*4+2])*R<.0005,'no relief outside the muscles at '+[P.getX(i),y,P.getZ(i)].map(v=>v.toFixed(2)));}
 // GOTR-0050 volume: static mass on chest and arms, none at the belt line, hands or legs.
 const mass=g.attributes.avatarMass,MR=D.massRange/32767,massAt=(test)=>{let m=0;for(let i=0;i<mass.count;i++)if(test(P.getX(i),P.getY(i),P.getZ(i)))m=Math.max(m,mass.array[i]*MR);return m;};
 assert.ok(mass&&massAt((x,y,z)=>Math.abs(x)<.25&&y>1.5&&y<1.62&&z>.1)>.015,'pectorals gain real volume');assert.ok(massAt((x,y)=>Math.abs(x)>.45&&Math.abs(x)<.6&&y>1.5)>.012,'upper arms gain real volume');
 assert.equal(massAt((x,y)=>y>.9&&y<1.18),0,'belt line untouched');assert.equal(massAt((x,y)=>Math.abs(x)>.9||y<.8),0,'hands in gloves and legs untouched');
 // Fur strands inherit the relief of their root vertex (root and tip identical).
 const f=c.bodyFur.geometry.attributes.avatarDefinition;assert.ok(f,'fur carries the definition');for(let i=0;i<f.count;i+=3)for(let k=1;k<3;k++)for(let j=0;j<4;j++)assert.equal(f.array[(i+k)*4+j],f.array[i*4+j]);
 // Pose response on the real surface.
 c.update(0,'guard','one_two',{simulationTime:0});const guard=Array.from(c.definition.values);
 c.update(.525,'jab','one_two',{simulationTime:.525});const jab=Array.from(c.definition.values);
 const ch=name=>D.channels.indexOf(name);
 assert.ok(guard[ch('bicepsL')]>jab[ch('bicepsL')]+.12,'lead biceps bunches in the flexed guard, lengthens in the jab');
 assert.ok(jab[ch('tricepsL')]>guard[ch('tricepsL')]+.12,'lead triceps contracts at full extension');
 assert.ok(jab[ch('deltL')]>guard[ch('deltL')]+.06,'lead deltoid rounds as the arm rises');
 assert.ok(jab[ch('latL')]<guard[ch('latL')]-.06,'lead lat stretches on extension');
 let vertex=-1;for(let i=0;i<d.count;i++)if(Math.round(d.array[i*4+3]/32767*32)===ch('bicepsL')&&Math.hypot(d.array[i*4],d.array[i*4+1],d.array[i*4+2])*R>.004){vertex=i;break;}
 assert.ok(vertex>=0,'a biceps vertex with visible relief');
 c.update(0,'guard','one_two',{simulationTime:0});const flexed=c.skinPoint(c.skin,vertex);c.definition.strength=0;c.update(0,'guard','one_two',{simulationTime:0});const flat=c.skinPoint(c.skin,vertex);c.definition.strength=1;
 assert.ok(flexed.distanceTo(flat)>.003,'the CPU skin (contacts, gear tests) includes the relief: '+flexed.distanceTo(flat));
 // Built once per body: a second rig of the same species reuses the arrays.
 const t=Date.now(),again=new LionCoach(data,{species});assert.equal(again.definitionData,info,'cached definition reused');
 report[species]={moved,outMm:+(out*1000).toFixed(1),inMm:+(inward*1000).toFixed(1),guardBiceps:+guard[ch('bicepsL')].toFixed(2),jabBiceps:+jab[ch('bicepsL')].toFixed(2),jabTriceps:+jab[ch('tricepsL')].toFixed(2),jabLat:+jab[ch('latL')].toFixed(2)};
}
// Adaptive quality floor drops the per-pixel detail for every rig at once.
D.setQuality(0);assert.equal(D.quality.value,0);D.setQuality(3);assert.equal(D.quality.value,1);
// Shader wiring: colour pass gets relief, normal detail and crease; shadow passes get the same relief.
const c=new LionCoach(data,{species:'lion'});
for(const m of [c.skin.material,c.skin.customDepthMaterial,c.skin.customDistanceMaterial]){const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>'};m.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('transformed+=avatarDefinition.xyz*'),'colour and shadow positions match');assert.ok(shader.uniforms.avatarDefScale);if(m===c.skin.material)assert.ok(shader.fragmentShader.includes('avatarDefCavity'));}
console.log(JSON.stringify(report));
console.log('PASS muscle definition: atlas groups on both sides, bounded relief, fur follows roots, CPU skin matches, pose-driven contraction/stretch, cached build, quality floor, shader wiring');
