const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};vm.runInThisContext(fs.readFileSync('club-world.js','utf8'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),engine={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),activeModel:new THREE.Group(),arena:{group:new THREE.Group()}};engine.camera.position.set(0,1.78,5.8);const world=new ClubWorld(engine);
for(const mode of ['none','fight'])for(let i=0;i<8;i++){
 const angle=i*Math.PI/4;engine.camera.position.set(Math.sin(angle)*5.8,1.78,Math.cos(angle)*5.8);world.update(0,mode);engine.scene.updateMatrixWorld(true);
 const root=mode==='fight'?world.arena:world.gym,meshes=[];root.traverseVisible(n=>{if(n.isMesh)meshes.push(n);});const target=V(0,1.4,0),delta=target.clone().sub(engine.camera.position),distance=delta.length();const ray=new THREE.Raycaster(engine.camera.position,delta.normalize()),hits=ray.intersectObjects(meshes,false).filter(h=>h.distance<distance-.2);
 assert.deepEqual(hits.map(h=>h.object.name),[],mode+' scenery must not block the boxer from camera angle '+angle);assert.equal(root.rotation.y,0,'camera orbit must not rotate the room or fighter roots');
}
console.log('PASS unobstructed gym/arena cutaways around eight camera directions without rotating scene roots');
