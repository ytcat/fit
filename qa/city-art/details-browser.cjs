const{chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1100,height:800}});const errors=[],warnings=[];
 p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());else if(m.type()==='warning')warnings.push(m.text())});
 await p.goto('http://127.0.0.1:8142/qa/city-art/bus/viewer.html');await p.waitForFunction(()=>window.asset?.detailsReady,null,{timeout:90000});
 await p.evaluate(async()=>{await asset.setDetails(true);asset.sampleWind(0)});
 const report=await p.evaluate(()=>{
  function stats(root){let triangles=0,meshes=0,skinned=0;const materials=new Set();root.traverse(o=>{if(o.isMesh){meshes++;if(o.isSkinnedMesh)skinned++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m.uuid)}});return{triangles,meshes,skinned,materials:materials.size}}
  function meshlist(root,word){const r=[];root.traverse(o=>{if(o.isMesh&&o.material.name.includes(word))r.push(o)});return r}
  asset.car.updateMatrixWorld(true);
  function carRay(origin,direction,objects,far){const ro=new THREE.Vector3(...origin);asset.car.localToWorld(ro);const rd=new THREE.Vector3(...direction).transformDirection(asset.car.matrixWorld);return new THREE.Raycaster(ro,rd,0,far).intersectObjects(objects)[0]?.distance??null}
  const paint=meshlist(asset.car,'petrol blue'),rubber=meshlist(asset.car,'tires seals'),glass=meshlist(asset.car,'recessed window');
  const arch=carRay([1.25,.298,-2],[0,0,1],paint,1.55),tire=carRay([1.48,.298,-2],[0,0,1],rubber,1.55),above=carRay([1.25,.76,-2],[0,0,1],paint,1.55);
  if(arch!==null||tire===null||above===null)throw Error('Wheel aperture is filled or tire/fender missing: '+JSON.stringify({arch,tire,above}));
  const windowPaint=carRay([0,1.17,-2],[0,0,1],paint,1.6),windowGlass=carRay([0,1.17,-2],[0,0,1],glass,1.6);
  if(windowPaint!==null||windowGlass===null)throw Error('Side glazing is not a real opening: '+JSON.stringify({windowPaint,windowGlass}));
  const skin=[];asset.treeInstances[0].traverse(o=>{if(o.isSkinnedMesh)skin.push(o)});if(!skin.length)throw Error('No skinned tree');
  const samples=[];for(const m of skin){const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i+=Math.max(1,Math.floor(pos.count/400))){const height=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld).y;samples.push({m,i,low:height<.3,high:height>3.3})}}
  function sample(t){asset.sampleWind(t);return samples.map(({m,i})=>{const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.boneTransform(i,v);return v.toArray()})}
  const start=sample(0),middle=sample(1),end=sample(asset.treeTemplates[0].animations[0].duration);let rootError=0,crownMotion=0,loopError=0;
  samples.forEach((s,i)=>{const d=(a,b)=>Math.hypot(...a.map((v,j)=>v-b[j]));if(s.low)rootError=Math.max(rootError,d(start[i],middle[i]));if(s.high)crownMotion=Math.max(crownMotion,d(start[i],middle[i]));loopError=Math.max(loopError,d(start[i],end[i]))});
  if(rootError>.001||crownMotion<.003||loopError>.002)throw Error('Breeze failed fixed root, crown motion or loop: '+JSON.stringify({rootError,crownMotion,loopError}));
  if(asset.treeInstances[0].children===asset.treeInstances[1].children)throw Error('Tree instances share node hierarchy');
  const firstBones=new Set(skin[0].skeleton.bones);let shared=false;asset.treeInstances[1].traverse(o=>{if(o.isSkinnedMesh&&o.skeleton.bones.some(b=>firstBones.has(b)))shared=true});if(shared)throw Error('Tree clone skeleton aliases first tree');
  asset.setWindTime(0);asset.draw();
  return{three:THREE.REVISION,car:stats(asset.car),heroTree:stats(asset.treeInstances[0]),carOpenings:{arch,tire,above,windowPaint,windowGlass},wind:{rootError,crownMotion,loopError,samples:samples.length,clipSeconds:asset.treeTemplates[0].animations[0].duration},combinedRender:{...asset.renderer.info.render},physicalPhone:'NOT VERIFIED',environment:'Headless Chromium / SwiftShader software renderer; street composition and isolated details'};
 });
 const shot=async n=>p.screenshot({path:path.join(__dirname,n+'.png'),timeout:90000});
 async function camera(pos,target){await p.evaluate(({pos,target})=>{asset.camera.position.set(...pos);asset.camera.lookAt(...target);asset.draw()},{pos,target})}
 await shot('details-street-day');await p.evaluate(()=>asset.setNight(true));await shot('details-street-night');await p.evaluate(()=>asset.setNight(false));
 await camera([-11,1.7,6],[-6.2,.65,2.35]);await shot('car-front');await camera([-1.2,1.7,-.8],[-6.2,.65,2.35]);await shot('car-rear');
 await camera([-6.2,1.0,8.5],[-6.2,.70,2.35]);await shot('car-side');await camera([-8.2,1.7,4.6],[-6.3,.85,2.35]);await shot('car-cabin');
 await camera([-12,3.8,-.7],[-8.6,3.1,-5.9]);await shot('tree-hero');await p.evaluate(()=>asset.setWindTime(1));await shot('tree-breeze');await p.evaluate(()=>{asset.setTreeLOD(true);asset.setWindTime(0)});await shot('tree-low');
 report.lowTree=await p.evaluate(()=>{let triangles=0;asset.treeInstances[0].traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3});return{triangles}});
 if(report.lowTree.triangles>=report.heroTree.triangles)throw Error('Lower-detail tree is not simpler');
 await p.evaluate(()=>{asset.setTreeLOD(false);asset.setView('town');asset.render()});await p.setViewportSize({width:393,height:852});await p.evaluate(()=>{asset.setView('town');asset.render()});await shot('details-portrait');
 report.errors=errors;report.warnings=warnings;fs.writeFileSync(path.join(__dirname,'details-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
