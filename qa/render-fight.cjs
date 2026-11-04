// CPU diagnostics of real fight contacts and the actual ceremony, without PBR.
const fs=require('fs'),vm=require('vm');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,560/700,.1,100),coach,animTime:0,technique:'guard',currentAnim:'one_two',fitCameraToModel(){},fightOptions:{seed:Number(process.argv[3]||11),rounds:1,roundSeconds:24,restSeconds:2}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);arena.setTarget('fight');const frames=[];let capture=null,head=false,body=false,cards=false,ceremony=false;
function snapshot(name){
 const meshes=[];arena.group.updateMatrixWorld(true);arena.fitCamera(e.camera);e.camera.updateMatrixWorld(true);
 arena.group.traverse(m=>{if(!m.visible||!m.isMesh||m.material.map||!m.geometry.attributes.position)return;const p=m.geometry.attributes.position,col=m.geometry.attributes.color,positions=[],colors=[],c=m.isSkinnedMesh?[coach,arena.rabbit].find(c=>c.skeleton===m.skeleton):null;
 for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);if(c)c.skinPoint(m,i,v);v.applyMatrix4(m.matrixWorld);positions.push(...v.toArray().map(n=>Math.round(n*1e5)/1e5));const color=m.material.color.clone();if(col)color.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));colors.push(...[color.r,color.g,color.b].map(n=>Math.round(n*1e4)/1e4));}
 meshes.push({positions,colors,index:m.geometry.index?Array.from(m.geometry.index.array):Array.from({length:p.count},(_,i)=>i)});
 });frames.push({name,meshes,camera:new THREE.Matrix4().multiplyMatrices(e.camera.projectionMatrix,e.camera.matrixWorldInverse).toArray()});
}
for(let i=0;i<60*50;i++){
 const metrics=arena.update(i/60,'fight','one_two'),m=arena.fightView.match;
 for(const hit of metrics.contacts)if(!capture&&((hit.part==='head'&&!head)||(hit.part==='body'&&!body))){capture={at:i+5,part:hit.part,actor:hit.receiver};if(hit.part==='head')head=true;else body=true;}
 if(capture&&i===capture.at){snapshot(capture.actor+' reacts to '+capture.part+' contact');capture=null;}
 if(m.phase==='scoring'&&m.phaseTime>7&&!cards){snapshot('Three actual judge cards before the announcement');cards=true;}
 if(m.phase==='ceremony'&&m.phaseTime>3&&!ceremony){snapshot((m.result.winner||'Draw')+' · referee holds the raised wrist');ceremony=true;break;}
}
fs.writeFileSync(process.argv[2],JSON.stringify(frames));console.log(JSON.stringify({frames:frames.map(f=>f.name),result:arena.fightView.match.result},null,2).slice(0,1200));
