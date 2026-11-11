// GOTR-0047: result ceremony framed from the front (locked and unlocked camera); rope jumping with the lock = front view.
const {chromium}=require('playwright');const fs=require('fs');
const url=process.argv[2]||'http://127.0.0.1:8131/',out=__dirname;
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const results=[];
 for(const [name,locked,vp] of [['ceremony-locked-phone',true,{width:402,height:690}],['ceremony-free-desktop',false,{width:1366,height:768}]]){
  const p=await b.newPage({viewport:vp});await p.goto(url);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  const r=await p.evaluate(async locked=>{const e=app.engine,wait=ms=>new Promise(r=>setTimeout(r,ms));document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   e.cameraDirector.setLock(locked,true);ringfighterGame.startFight({watch:true,seed:7});document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   for(let i=0;i<400&&!e.arena?.fightView?.match;i++)await wait(50);const m=e.arena.fightView.match,render=e.renderer.render.bind(e.renderer);e.renderer.render=()=>{};
   let t=0,n=0;while(!(m.phase==='ceremony'&&m.phaseTime>3)&&t<60){if(e.cameraDirector.holdsClock){e.cameraDirector.skipIntro();await wait(20);if(++n>3000)break;continue;}e.animTime+=1/60;t+=1/60;const f=e.arena.update(e.animTime);e.career?.onFrame?.(f,1/60);e.cameraDirector.update(1/60);if(Math.round(t*60)%30===0)await wait(0);}
   for(let i=0;i<240;i++)e.cameraDirector.update(1/60);e.renderer.render=render;window.__dialogs=[...document.querySelectorAll('dialog[open]')].map(d=>d.className);document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.lastRenderStamp=null;await wait(3000);
   const c=e.camera.position,v=e.arena.fightView.coaches,f=[v.lion.root,v.rabbit.root].map(n=>n.getWorldDirection(new THREE.Vector3()));const fx=f[0].x+f[1].x,fz=f[0].z+f[1].z,mid=[v.lion.root,v.rabbit.root].map(n=>n.getWorldPosition(new THREE.Vector3())).reduce((a,b)=>a.add(b.multiplyScalar(.5)),new THREE.Vector3());
   const o=new THREE.Vector3(c.x-mid.x,0,c.z-mid.z).normalize(),fr=new THREE.Vector3(fx,0,fz).normalize();
   return {dialogsOverCeremony:window.__dialogs,phase:m.phase,mode:e.cameraDirector.mode,frontDot:+o.dot(fr).toFixed(4),winner:m.result?.winner||'draw'};},locked);
  await p.screenshot({path:out+'/'+name+'.png'});results.push({name,...r});console.log(name,JSON.stringify(r));await p.close();}
 {const p=await b.newPage({viewport:{width:402,height:690}});await p.goto(url);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  const r=await p.evaluate(async()=>{const e=app.engine,wait=ms=>new Promise(r=>setTimeout(r,ms));document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.startTraining({mode:'rope',play:false});await wait(1500);document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.cameraDirector.setLock(true,true);for(let i=0;i<400;i++)e.cameraDirector.update(1/60);document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.lastRenderStamp=null;await wait(3000);
   const c=e.camera.position,r=e.coach.root,f=r.getWorldDirection(new THREE.Vector3()),p=r.getWorldPosition(new THREE.Vector3()),o=new THREE.Vector3(c.x-p.x,0,c.z-p.z).normalize();f.y=0;f.normalize();return {mode:e.arena.mode,dir:e.cameraDirector.mode,frontDot:+o.dot(f).toFixed(4),caption:document.querySelector('#camLock')?.textContent.trim()};});
  await p.screenshot({path:out+'/rope-front-lock-phone.png'});results.push({name:'rope-front-lock-phone',...r});console.log('rope',JSON.stringify(r));await p.close();}
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,1));await b.close();})();
