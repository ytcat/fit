// GOTR-0002 / GOTR-0003 boots: renders the REAL app (WebGL, shadows, PBR) around the
// player's boxer in guard and mid-punch, for lion and rabbit, from several angles.
// Usage: node qa/gotr-0002/capture.cjs <prefix> [ids,comma] [boots variant] [views] [crop]
//  e.g. node qa/gotr-0002/capture.cjs after champion_belt,headband,armbands default front,three,side,rear full
// Env: APP_URL (default http://127.0.0.1:8153), OUT (folder), SPECIES=lion,rabbit, POSES=[["guard","guard",0],["punch","jab",.47]]
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const URL=process.env.APP_URL||'http://127.0.0.1:8153',OUT=process.env.OUT||path.join(__dirname);
const prefix=process.argv[2]||'shot',ids=(process.argv[3]||'champion_belt,headband,armbands').split(',').filter(Boolean),boots=process.argv[4]||'default';
const views=(process.argv[5]||'front,three,side,rear').split(','),crop=process.argv[6]||'full';
const yaw={front:0,three:.75,side:Math.PI/2,rear:Math.PI,left:-Math.PI/2,threeback:2.4};
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:900,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(URL+'/?v=qa'+Date.now());await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
const shots=[];
for(const species of (process.env.SPECIES||'lion,rabbit').split(','))for(const [pose,move,phase] of (process.env.POSES?JSON.parse(process.env.POSES):[['guard','guard',0],['punch','jab',.47]])){
 const res=await p.evaluate(async({species,ids,boots,move,phase,views,yaw,crop})=>{const e=app.engine;e.isPlaying=false;if(e.coach.species!==species)e.roster.select(species);await new Promise(r=>setTimeout(r,300));
  const c=e.coach;GameAccessories.look(c,ids);GamePresentation.apply(c,{gloves:'gloves_default',shorts:'shorts_default',boots:'boots_'+boots,belt:'belt_default'},GameDomain.catalog);
  e.technique=move;e.animTime=phase*1.22;c.update(e.animTime,move,'one_two');c.root.updateMatrixWorld(true);
  const hide=[];for(const n of e.arena?.group?.children||[])if(n!==c.root&&n.visible){hide.push(n);n.visible=false;}
  const cam=e.camera,old={pos:cam.position.clone(),q:cam.quaternion.clone(),zoom:cam.zoom,aspect:cam.aspect};const root=c.root;root.updateMatrixWorld(true);
  const focus={full:[1.05,2.6],waist:[1.0,.95],head:[c.species==='rabbit'?2.05:1.95,c.species==='rabbit'?1.1:.8],arm:[1.45,1.2],boots:[.15,.6]}[crop];
  const out=[];const renderer=e.renderer;const size=renderer.getSize(new THREE.Vector2());
  for(const v of views){const target=root.localToWorld(new THREE.Vector3(0,focus[0],0)),dist=focus[1]/(2*Math.tan(THREE.MathUtils.degToRad(cam.fov)/2))+.3;
   cam.zoom=1;cam.aspect=size.x/size.y;cam.position.copy(target).add(new THREE.Vector3(Math.sin(yaw[v])*dist,crop==='boots'?.25:.12,Math.cos(yaw[v])*dist).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())));cam.lookAt(target);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
   renderer.render(e.scene,cam);out.push([v,renderer.domElement.toDataURL('image/png')]);}
  const info={triangles:e.renderer.info.render.triangles,calls:e.renderer.info.render.calls};
  for(const n of hide)n.visible=true;cam.position.copy(old.pos);cam.quaternion.copy(old.q);cam.zoom=old.zoom;cam.aspect=old.aspect;cam.updateProjectionMatrix();e.lastRenderStamp=null;
  return {out,...info};},{species,ids,boots,move,phase,views,yaw,crop});
 for(const [v,u] of res.out){const f=path.join(OUT,`${prefix}-${species}-${pose}-${v}.png`);fs.writeFileSync(f,Buffer.from(u.split(',')[1],'base64'));shots.push(f);}
 console.log(species,pose,'last frame triangles',res.triangles,'calls',res.calls);
}
console.log(JSON.stringify({shots:shots.length,errors}));await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
