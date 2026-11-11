// GOTR-0030: close head renders of the tied head ribbon and the side-knot bandana on the real app
// (WebGL, PBR), framed on the head bone, for lion and rabbit, in guard, mid-jab and a slip.
// Usage: APP_URL=http://127.0.0.1:8171 node qa/gotr-0030/headband-renders.cjs <prefix> [ids] [views]
// Writes <prefix>-<species>-<pose>-<id>-<view>.png into OUT (default this folder).
// BEFORE_FILE=<path> serves that copy of game-accessories.js (e.g. `git show b8426a2:game-accessories.js`) for "before" renders.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const URL=process.env.APP_URL||'http://127.0.0.1:8171',OUT=process.env.OUT||__dirname,prefix=process.argv[2]||'band';
const ids=(process.argv[3]||'headband,bandana').split(','),views=(process.argv[4]||'front,three,side,rear').split(',');
const yaw={front:0,three:.75,side:Math.PI/2,rear:Math.PI,threeback:2.35};
const poses=process.env.POSES?JSON.parse(process.env.POSES):[['guard','guard',0],['jab','jab',.47],['slip','slip',.45]];
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:520,height:520}});const errors=[];p.on('pageerror',x=>errors.push(x.message));
 if(process.env.BEFORE_FILE){const old=fs.readFileSync(process.env.BEFORE_FILE,'utf8');await p.route(/game-accessories\.js/,r=>r.fulfill({body:old,contentType:'application/javascript'}));}
 await p.goto(URL+'/?v=qa'+Date.now());await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 for(const species of (process.env.SPECIES||'lion,rabbit').split(','))for(const id of ids)for(const [pose,move,phase] of poses){
  const shots=await p.evaluate(async({species,id,move,phase,views,yaw})=>{const e=app.engine;e.isPlaying=false;if(e.coach.species!==species)e.roster.select(species);await new Promise(r=>setTimeout(r,300));
   const c=e.coach;GameAccessories.look(c,id==='none'?[]:[id]);e.technique=move;e.animTime=phase*1.22;c.update(e.animTime,move,'one_two');c.root.updateMatrixWorld(true);
   const cam=e.camera,r=e.renderer,size=r.getSize(new THREE.Vector2()),old={pos:cam.position.clone(),q:cam.quaternion.clone(),zoom:cam.zoom,aspect:cam.aspect},head=c.joints.head;
   const target=head.localToWorld(new THREE.Vector3(0,.2,0)),q=c.root.getWorldQuaternion(new THREE.Quaternion()),dist=(species==='rabbit'?.62:.72)/(2*Math.tan(THREE.MathUtils.degToRad(cam.fov)/2));const out=[];
   for(const v of views){cam.zoom=1;cam.aspect=size.x/size.y;cam.position.copy(target).add(new THREE.Vector3(Math.sin(yaw[v])*dist,.06,Math.cos(yaw[v])*dist).applyQuaternion(q));cam.lookAt(target);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);r.render(e.scene,cam);out.push([v,r.domElement.toDataURL('image/png')]);}
   cam.position.copy(old.pos);cam.quaternion.copy(old.q);cam.zoom=old.zoom;cam.aspect=old.aspect;cam.updateProjectionMatrix();e.lastRenderStamp=null;return out;},{species,id,move,phase,views,yaw});
  for(const [v,u] of shots)fs.writeFileSync(path.join(OUT,`${prefix}-${species}-${pose}-${id}-${v}.png`),Buffer.from(u.split(',')[1],'base64'));
  console.log(species,id,pose,'ok');}
 console.log(JSON.stringify({errors}));await b.close();})().catch(x=>{console.error('FAIL',x.message);process.exit(1);});
