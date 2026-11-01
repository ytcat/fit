const fs=require('fs'),vm=require('vm');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};vm.runInThisContext(fs.readFileSync('boxing-coach.js','utf8'));
const c=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json')));
// CPU diagnostic: actual scene geometry and dual-quaternion skinning.
// Canvas textures, shadows and physically-based shading are not reproduced.
const frames=[];
const requested=process.argv[3];
const poses=requested==='tailoring'?[['hook',.47,0],['hook',.47,Math.PI/2],['hook',.47,Math.PI],['uppercut',.46,0],['step',.45,0],['step',.45,Math.PI]]:requested?[0,.22,.47].map(p=>[requested,p,.65]): [['jab',0,0],['jab',0,Math.PI],['uppercut',.22,.65],['uppercut',.47,.65]];
for(const [move,phase,view] of poses){
c.root.rotation.y=view;c.update(phase*1.22,move,'one_two');const meshes=[];
c.root.traverse(m=>{if(!m.isMesh||m.material.map)return;const g=m.geometry,p=g.attributes.position,w=g.attributes.skinWeight,ids=g.attributes.skinIndex,col=g.attributes.color,positions=[],colors=[];
for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);
if(m.isSkinnedMesh)c.skinPoint(m,i,v);
v.applyMatrix4(m.matrixWorld);positions.push(...v.toArray().map(n=>Math.round(n*1e5)/1e5));const color=m.material.color.clone();if(col)color.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));colors.push(...[color.r,color.g,color.b].map(n=>Math.round(n*1e4)/1e4));}
meshes.push({positions,colors,index:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i)});});const frame={name:move+' '+phase+' '+view,meshes};
if(requested==='tailoring'){const camera=new THREE.PerspectiveCamera(32,560/700,.1,100);camera.position.set(0,1.30,2.85);camera.lookAt(0,1.30,0);camera.updateMatrixWorld(true);frame.camera=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray();}
frames.push(frame);}
fs.writeFileSync(process.argv[2],JSON.stringify(frames));
