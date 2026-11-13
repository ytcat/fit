const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());else if(m.type()==='warning')warnings.push(m.text())});
 await page.goto('http://127.0.0.1:8142/qa/city-art/bus/viewer.html');await page.waitForFunction(()=>window.asset?.ready,null,{timeout:90000});
 await page.evaluate(async()=>{await asset.setStation(true);asset.render()});
 const report=await page.evaluate(()=>{
  let triangles=0,nodes=0;const materials=new Set(),textures=new Set();
  asset.station.traverse(o=>{if(o.isMesh){nodes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;materials.add(o.material.uuid);for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(o.material[key])textures.add(o.material[key].uuid)}});
  const anchor=asset.station.getObjectByName('Lamp_light_anchor');if(!anchor)throw Error('Lamp anchor missing');const v=new THREE.Vector3();anchor.getWorldPosition(v);
  if(v.distanceTo(asset.scene.children.find(o=>o.isSpotLight).position)>.01)throw Error('Night light is not at its lamp');
  return{three:THREE.REVISION,station:{triangles,meshNodes:nodes,materials:materials.size,textures:textures.size,lightAnchor:v.toArray()},combinedRender:{...asset.renderer.info.render},physicalPhone:'NOT VERIFIED',environment:'Headless Chromium with SwiftShader software rendering; composed bus and station, not complete game'};
 });
 await page.screenshot({path:path.join(__dirname,'station-day.png')});
 await page.evaluate(()=>{asset.setNight(true);asset.render()});await page.screenshot({path:path.join(__dirname,'station-night.png')});
 await page.evaluate(()=>{asset.camera.position.set(12,8,-17);asset.camera.lookAt(0,1.3,-3);asset.renderer.info.reset();asset.renderer.render(asset.scene,asset.camera)});await page.screenshot({path:path.join(__dirname,'station-night-curb.png')});
 await page.evaluate(()=>{asset.setNight(false);asset.setDoors(true);asset.setView('entry');asset.render()});await page.screenshot({path:path.join(__dirname,'station-entry.png')});
 await page.setViewportSize({width:393,height:852});await page.evaluate(async()=>{await asset.setStation(true);asset.camera.position.set(21,12,24);asset.camera.lookAt(0,1.4,-2.8);asset.renderer.info.reset();asset.renderer.render(asset.scene,asset.camera)});
 await page.screenshot({path:path.join(__dirname,'station-portrait.png')});
 report.errors=errors;report.warnings=warnings;fs.writeFileSync(path.join(__dirname,'station-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
