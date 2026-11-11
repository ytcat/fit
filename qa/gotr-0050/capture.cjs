/* GOTR-0050 before/after renders (guard: front, side, back, torso close-up) with the GOTR-0037 camera rig.
   Usage: OUT=<dir> node qa/gotr-0050/capture.cjs <label> <url>; then python3 qa/gotr-0050/compose.py <dir> qa/gotr-0050 */
const fs=require('fs'),path=require('path'),{open,shoot}=require('../gotr-0037/rig.cjs');
const [,,label='after',url='http://127.0.0.1:8437/']=process.argv,OUT=process.env.OUT||path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const app=await open(url),p=app.page;
 for(const species of (process.env.SPECIES||'lion,rabbit').split(',')){
  await p.evaluate(s=>{const e=app.engine;if(e.coach.species!==s)e.roster.select(s);e.arena.setTarget('none');},species);await p.waitForTimeout(600);
  for(const view of (process.env.VIEWS||'front,side,back,torso,sideclose,backclose34').split(','))fs.writeFileSync(path.join(OUT,`${label}-${species}-${view}.png`),await shoot(p,{pose:'guard',view}));
 }
 if(app.errors.length)console.error('PAGE ERRORS',app.errors.slice(0,5));await app.close();console.log('captured',label);process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
