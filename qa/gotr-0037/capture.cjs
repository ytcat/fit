/* GOTR-0037 matched before/after renders (gym and championship arena, both species).
   Usage: OUT=<dir> node qa/gotr-0037/capture.cjs <label> <url>
   Writes <OUT>/<label>-<scene>-<rig>-<pose>-<view>.png; compose.py turns pairs into .webp sheets. */
const fs=require('fs'),path=require('path'),{open,shoot}=require('./rig.cjs');
const [,,label='after',url='http://127.0.0.1:8437/']=process.argv,OUT=process.env.OUT||path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const ONLY=(process.env.ONLY||'').split(',').filter(Boolean);
(async()=>{
 const app=await open(url),p=app.page,save=(name,buf)=>fs.writeFileSync(path.join(OUT,`${label}-${name}.png`),buf);
 const want=name=>!ONLY.length||ONLY.some(k=>name.includes(k));
 for(const species of ['lion','rabbit']){
  await p.evaluate(s=>{const e=app.engine;if(e.coach.species!==s)e.roster.select(s);e.arena.setTarget('none');},species);await p.waitForTimeout(600);
  for(const pose of ['guard','jab','hook'])for(const view of ['front','q34','side','back']){const n=`gym-${species}-${pose}-${view}`;if(want(n))save(n,await shoot(p,{pose,view}));}
  for(const [pose,view] of [['guard','torso'],['hook','torso34'],['guard','backclose'],['guard','arm'],['jab','shoulder'],['guard','legs'],['tpose','front'],['tpose','back']]){const n=`gym-${species}-${pose}-${view}`;if(want(n))save(n,await shoot(p,{pose,view}));}
 }
 if(!ONLY.length||ONLY.some(k=>k.includes('arena'))){
  await p.evaluate(()=>{const e=app.engine;if(e.coach.species!=='lion')e.roster.select('lion');ringfighterGame.startFight({seed:20261111,watch:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  await p.waitForTimeout(4000);
  for(const rig of ['lion','rabbit'])for(const pose of ['guard','jab'])for(const view of ['q34','side','back']){const n=`arena-${rig}-${pose}-${view}`;if(want(n))save(n,await shoot(p,{rig,pose,view}));}
 }
 if(app.errors.length)console.error('PAGE ERRORS',app.errors.slice(0,5));await app.close();console.log('captured',label);process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
