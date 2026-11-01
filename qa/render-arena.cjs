// CPU pose diagnostics for actual arena geometry; omits PBR, textures and shadows.
const fs=require('fs'),vm=require('vm');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json'));
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,560/700,.1,100),coach:new LionCoach(data),animTime:0,technique:'jab',currentAnim:'sparring_flow',fitCameraToModel(){}};e.demoModel=e.coach.root;e.scene.add(e.demoModel);
const arena=e.arena=new TrainingArena(e,data),frames=[];
const requested=process.argv[3];
const poses=requested==='power'?[['heavy','cross',.18],['heavy','cross',.34],['heavy','cross',.43],['heavy','cross',.56],['heavy','cross',.82],['dummy','cross',.43]]:requested?[['rabbit','guard',0],['rabbit',requested,.4],['rabbit',requested,.48]]:[['rabbit','hook',.40],['rabbit','cross',1.48],['rabbit','random',3.3],['dummy','uppercut',.43],['heavy','cross',.43],['speed','speedbag',.25]];
for(const [mode,move,phase] of poses){
 arena.setTarget(mode);e.randomSeed=42;if(process.argv[4])arena.group.rotation.y=Number(process.argv[4]);for(let t=0;t<phase*1.22;t+=1/90)arena.update(t,move,'sparring_flow');arena.update(phase*1.22,move,'sparring_flow');arena.group.updateMatrixWorld(true);arena.fitCamera(e.camera);e.camera.updateMatrixWorld(true);const meshes=[];
 arena.group.traverse(m=>{if(!m.isMesh||m.material.map||!m.geometry.attributes.position)return;const g=m.geometry,p=g.attributes.position,w=g.attributes.skinWeight,ids=g.attributes.skinIndex,col=g.attributes.color,positions=[],colors=[];
 const coach=m.isSkinnedMesh?[e.coach,arena.rabbit].find(c=>c?.skeleton===m.skeleton):null;
 for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);
 if(m.isSkinnedMesh)coach.skinPoint(m,i,v);
 v.applyMatrix4(m.matrixWorld);positions.push(...v.toArray().map(n=>Math.round(n*1e5)/1e5));const color=m.material.color.clone();if(col)color.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));colors.push(...[color.r,color.g,color.b].map(n=>Math.round(n*1e4)/1e4));}
 meshes.push({positions,colors,index:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i)});
 });frames.push({name:mode+' '+move+' '+phase,meshes,camera:new THREE.Matrix4().multiplyMatrices(e.camera.projectionMatrix,e.camera.matrixWorldInverse).toArray()});
}
fs.writeFileSync(process.argv[2],JSON.stringify(frames));
