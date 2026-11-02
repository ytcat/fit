// CPU pose diagnostics for actual arena geometry; omits PBR, textures and shadows.
const fs=require('fs'),vm=require('vm');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={readyState:'loading',addEventListener(){},createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','fight-session.js','training-arena.js','fight-experience.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json'));
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,560/700,.1,100),coach:new LionCoach(data),animTime:0,technique:'fight',randomSeed:42,fightConfig:{rounds:3,roundSeconds:7,restSeconds:2},currentAnim:'sparring_flow',fitCameraToModel(){}};e.demoModel=e.coach.root;e.scene.add(e.demoModel);
const arena=e.arena=new TrainingArena(e,data),frames=[];
arena.setTarget('rabbit');arena.fightVisual=new FightVisual(arena);let tick=0;
for(const time of [6.5,29.5,39]){
 while(tick/60<time){arena.update(tick/60,'fight','one_two');tick++;}
arena.group.updateMatrixWorld(true);arena.fitCamera(e.camera);e.camera.updateMatrixWorld(true);const meshes=[];
 arena.group.traverseVisible(m=>{if(!m.isMesh||m.material.map||!m.geometry.attributes.position)return;const g=m.geometry,p=g.attributes.position,w=g.attributes.skinWeight,ids=g.attributes.skinIndex,col=g.attributes.color,positions=[],colors=[];
 const coach=m.isSkinnedMesh?[e.coach,arena.rabbit].find(c=>c?.skeleton===m.skeleton):null;
 for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);
 if(m.isSkinnedMesh)coach.skinPoint(m,i,v);
 v.applyMatrix4(m.matrixWorld);positions.push(...v.toArray().map(n=>Math.round(n*1e5)/1e5));const color=m.material.color.clone();if(col)color.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));colors.push(...[color.r,color.g,color.b].map(n=>Math.round(n*1e4)/1e4));}
 meshes.push({positions,colors,index:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i)});
 });frames.push({name:'Fight '+arena.fightSession.phase+' '+time,meshes,camera:new THREE.Matrix4().multiplyMatrices(e.camera.projectionMatrix,e.camera.matrixWorldInverse).toArray()});
}
fs.writeFileSync(process.argv[2],JSON.stringify(frames));

