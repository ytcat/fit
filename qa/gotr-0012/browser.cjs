// GOTR-0012 real-app renders of mitt work at the pad-contact frame.
// Usage: APP_URL=http://127.0.0.1:8141 node qa/gotr-0012/browser.cjs <prefix> [moves]
// Writes <prefix>-<species>-<move>-<view>.png next to this file (convert to .webp afterwards).
// The drill is stepped deterministically at 120 Hz with the Synchronized rhythm so that
// before/after frames are matched; the camera is the app's own camera, orbited to a side view.
const {chromium}=require('playwright'),path=require('path');const URL=process.env.APP_URL||'http://127.0.0.1:8141',prefix=process.argv[2]||'after',moves=(process.argv[3]||'jab,cross').split(','),speciesList=(process.env.SPECIES||'lion').split(','),views=(process.env.VIEWS||'side,default').split(',');
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[],report=[];
 for(const [name,viewport] of Object.entries({desk:{width:1366,height:768},...(process.env.PHONE?{phone:{width:393,height:852}}:{})})){
  const p=await b.newPage({viewport});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  for(const species of speciesList)for(const move of moves){
   const info=await p.evaluate(async({move,species})=>{
    const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    if(e.coach.species!==species)e.roster.select(species);
    ringfighterGame.startTraining({mode:'pads'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    e.player?.setEnabled(false);e.practiceTiming='sync';e.isPlaying=false;e.animTime=0;e.arena.setTarget('pads');
    const V=(...a)=>new THREE.Vector3(...a),rear=['cross','rear_hook','rear_uppercut'].includes(move),side=rear?'R':'L';let found=null,last=null;
    // Second pass of the sequence (t >= 9.6 s) so mitt recoil and guides are warm.
    for(let tick=1;tick<=2400&&!found;tick++){const t=tick/120;e.animTime=t;const f=e.arena.update(t);last=f;
     if(t>=9.6){const hit=(f.contacts||[]).find(h=>h.move===move);if(hit||(move==='roll'&&f.defences))found={t,phase:f.hero.phase};}}
    if(!found)return {move,species,missed:true};
    // Hold one tick after the event so the glove is seated on the pad.
    const j=e.coach.joints,s=j['arm'+side].getWorldPosition(V()),el=j['elbow'+side].getWorldPosition(V()),h=j['hand'+side].getWorldPosition(V());
    const tr=e.arena.careerDrill.trainer;
    return {move,species,t:found.t,phase:+found.phase.toFixed(3),elbow:+(s.clone().sub(el).angleTo(h.clone().sub(el))*180/Math.PI).toFixed(1),ext:+(100*s.distanceTo(h)/(s.distanceTo(el)+el.distanceTo(h))).toFixed(1),separation:+e.coach.root.position.distanceTo(tr.root.position).toFixed(3),groupYaw:e.arena.group.rotation.y};
   },{move,species});
   report.push({viewport:name,...info});if(info.missed)continue;
   for(const view of views){
    await p.evaluate(({view,groupYaw})=>{const e=app.engine,c=e.viewControls;c.yaw=0;c.fit();if(view==='side'){c.yaw=groupYaw-Math.PI/2;c.apply();}else if(view==='side2'){c.yaw=groupYaw+Math.PI/2;c.apply();}else if(view==='top'){c.yaw=groupYaw-Math.PI/2;c.apply();e.camera.position.y+=3.2;e.camera.lookAt(c.target);}e.lastRenderStamp=null;},{view,groupYaw:info.groupYaw});
    await p.waitForTimeout(1500);
    const stage=await p.$('#stage, .stage, canvas');const file=path.join(__dirname,`${prefix}-${species}-${move}-${view}${name==='desk'?'':'-'+name}.png`);
    await (stage||p).screenshot({path:file});
   }
  }
  await p.close();
 }
 console.log(JSON.stringify(report,null,1));if(errors.length){console.error('PAGE ERRORS',errors);process.exitCode=1;}await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
