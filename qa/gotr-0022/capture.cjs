// GOTR-0022 evidence: real app, real renderer. Usage:
//   node qa/gotr-0022/capture.cjs [ids=all] [what=fight,wide,thumb,cost]
// Writes PNGs to OUT (default qa/gotr-0022/raw, not committed) and cost.json next to this file.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8147',OUT=process.env.OUT||path.join(__dirname,'raw');fs.mkdirSync(OUT,{recursive:true});
const want=(process.argv[3]||'fight,wide,thumb,cost').split(',');
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1});p.setDefaultTimeout(180000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 const all=await p.evaluate(()=>{const s=app.engine.career.store;if(!s.current())s.create('QA');return GameVenues.catalog.map(v=>v.id);});
 const ids=process.argv[2]&&process.argv[2]!=='all'?process.argv[2].split(','):all,cost={};
 const settle=ms=>p.waitForTimeout(ms);
 const start=async id=>{await p.evaluate(id=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.career.store.gameAction({type:'venue',venueId:id});e.fightOptions={seed:74};ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());GameVenues.apply(e,id,app.lang);},id);await settle(1000);await p.evaluate(()=>{app.engine.isPlaying=true;});await settle(3200);await p.evaluate(()=>{app.engine.isPlaying=false;});await settle(500);};
 const render=()=>p.evaluate(()=>{const e=app.engine;e.world.update(e.animTime,'fight');e.arena.fightView.pose?.();e.renderer.render(e.scene,e.camera);return {calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,geometries:e.renderer.info.memory.geometries,textures:e.renderer.info.memory.textures,programs:e.renderer.info.programs.length};});
 for(const size of [{name:'desktop',width:1366,height:768},{name:'phone',width:393,height:852}]){
  if(!want.includes('fight')&&!want.includes('cost')&&!(size.name==='desktop'&&want.includes('wide')))continue;
  await p.setViewportSize(size);await settle(800);
  for(const id of ids){
   await start(id);const info=await render();(cost[id]||(cost[id]={}))[size.name]=info;console.log(size.name,id,JSON.stringify(info));
   if(want.includes('fight'))await p.screenshot({path:path.join(OUT,`fight-${size.name}-${id}.png`)});
   if(size.name==='desktop'&&want.includes('wide')){
    const saved=await p.evaluate(id=>{const e=app.engine,c=e.camera,s={p:c.position.toArray(),q:c.quaternion.toArray(),zoom:c.zoom},yaw=e.arena.group.rotation.y,a=yaw+.35,low=['underground','boxing_club'].includes(id),d=low?7.4:11.5;c.position.set(Math.sin(a)*d,low?2.7:4.6,Math.cos(a)*d);c.lookAt(0,low?1.5:1.9,0);c.zoom=low?.7:.82;c.updateProjectionMatrix();c.updateMatrixWorld(true);return s;},id);
    const wide=await render();cost[id].wide=wide;fs.writeFileSync(path.join(OUT,`wide-${id}.png`),Buffer.from((await p.evaluate(()=>{const e=app.engine;e.renderer.render(e.scene,e.camera);return e.canvas.toDataURL('image/png');})).split(',')[1],'base64'));
    await p.evaluate(s=>{const c=app.engine.camera;c.position.fromArray(s.p);c.quaternion.fromArray(s.q);c.zoom=s.zoom;c.updateProjectionMatrix();c.updateMatrixWorld(true);},saved);
   }
  }
 }
 if(want.includes('thumb')){
  // Gallery cards: 640x380 renders of the shipped scene with fighters and referee hidden.
  await p.setViewportSize({width:1366,height:768});await settle(500);
  for(const id of ids){
   await start(id);
   const data=await p.evaluate(id=>{const e=app.engine,v=e.arena.fightView,c=e.camera,r=e.renderer,size=r.getSize(new THREE.Vector2()),ratio=r.getPixelRatio(),s={p:c.position.toArray(),q:c.quaternion.toArray(),zoom:c.zoom,aspect:c.aspect};
    const actors=[...new Set([...Object.values(v.coaches).map(x=>x.root),v.referee.root])],shown=actors.map(a=>a.visible);
    const low=['underground','boxing_club'].includes(id),yaw=e.arena.group.rotation.y,a=yaw+.42,d=low?7.4:9.6;r.setPixelRatio(1);r.setSize(640,380,false);c.aspect=640/380;c.zoom=1;c.position.set(Math.sin(a)*d,low?2.35:3.9,Math.cos(a)*d);c.lookAt(0,low?1.35:1.9,0);c.updateProjectionMatrix();c.updateMatrixWorld(true);
    e.world.update(e.animTime,'fight');v.pose?.();actors.forEach(a=>a.visible=false);r.render(e.scene,c);const url=e.canvas.toDataURL('image/png');
    actors.forEach((a,i)=>a.visible=shown[i]);r.setPixelRatio(ratio);r.setSize(size.x,size.y,false);c.aspect=s.aspect;c.zoom=s.zoom;c.position.fromArray(s.p);c.quaternion.fromArray(s.q);c.updateProjectionMatrix();return url.split(',')[1];},id);
   fs.writeFileSync(path.join(OUT,`thumb-${id}.png`),Buffer.from(data,'base64'));console.log('thumb',id);
  }
 }
 if(want.includes('cost')&&ids.length===all.length)fs.writeFileSync(path.join(__dirname,'cost.json'),JSON.stringify(cost,null,1));
 console.log('errors',JSON.stringify(errors));await b.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
