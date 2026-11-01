// Actual glove geometry, palm/back/side/impact views. No PBR or canvas textures.
const fs=require('fs'),vm=require('vm');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
vm.runInThisContext(fs.readFileSync('boxing-coach.js','utf8'));
const c=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json'))),frames=[];
for(const [name,side,eye,up,pressure] of [
 ['Left · palm','L',[0,-.09,.53],[0,-1,0],0],['Left · back','L',[0,-.09,-.53],[0,-1,0],0],
 ['Left · thumb side','L',[-.53,-.09,.07],[0,-1,0],0],['Right · palm','R',[0,-.09,.53],[0,-1,0],0],
 ['Knuckle face','L',[0,-.61,-.026],[0,0,-1],0],['Compressed pad','L',[-.38,-.34,.23],[0,-1,0],1]
]){
 c.deformGlove(side,pressure);const hand=c.joints['hand'+side];hand.position.set(0,0,0);hand.quaternion.identity();const group=new THREE.Group();
 // Detach this hand for a canonical inspection of the actual attached meshes.
 group.add(hand);group.updateMatrixWorld(true);const meshes=[];
 hand.traverse(m=>{if(!m.isMesh||m.material.map)return;const p=m.geometry.attributes.position,col=m.geometry.attributes.color,positions=[],colors=[];
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);positions.push(...v.toArray().map(n=>Math.round(n*1e5)/1e5));const color=m.material.color.clone();if(col)color.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));colors.push(...[color.r,color.g,color.b].map(n=>Math.round(n*1e4)/1e4));}
  meshes.push({positions,colors,index:m.geometry.index?Array.from(m.geometry.index.array):Array.from({length:p.count},(_,i)=>i)});
 });
 const camera=new THREE.PerspectiveCamera(36,560/700,.01,10);camera.position.set(...eye);camera.up.set(...up);camera.lookAt(0,-.08,0);camera.updateMatrixWorld(true);
 frames.push({name,meshes,camera:new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray()});
}
fs.writeFileSync(process.argv[2],JSON.stringify(frames));
