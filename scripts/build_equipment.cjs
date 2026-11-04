// Bake the authored sculptures once. Runtime loads this indexed asset instead
// of running marching tetrahedra on a phone when a target is first selected.
const fs=require('node:fs'),vm=require('node:vm');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const file of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','fight-referee.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
const coach=new LionCoach(data),engine={coach,scene:new THREE.Scene()};
new TrainingArena(engine,data).dummy();new RhinoReferee();
function pack(g){
 const position=[],normal=[],uv=[],index=[],seen=new Map();
 const p=g.attributes.position,n=g.attributes.normal,t=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const xyz=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)/1e6),key=xyz.join(',');
  let id=seen.get(key);
  if(id==null){id=position.length/3;seen.set(key,id);position.push(...xyz);normal.push(...[n.getX(i),n.getY(i),n.getZ(i)].map(v=>Math.round(v*1e5)/1e5));uv.push(...[t.getX(i),t.getY(i)].map(v=>Math.round(v*1e5)/1e5));}
  index.push(id);
 }
 return {position,normal,uv,index};
}
const result={revision:76,dummy:pack(TrainingArena.dummySculpt)};
for(const [name,geometry] of RhinoReferee.sculpts)result['referee-'+name]=pack(geometry);
const path='assets/models/equipment-surfaces-r76.json';fs.writeFileSync(path,JSON.stringify(result));
console.log(path,fs.statSync(path).size,'bytes');
for(const [name,g] of Object.entries(result))if(g.position)console.log(name,g.position.length/3,'vertices',g.index.length/3,'triangles');
