/* GOTR-0038: minimum clearance between each character's own hands (coach mitts, fighter gloves) and its own
   head and torso, per mitt drill, at 120 Hz. Uses the game's own body contact volumes (TrainingArena.closest:
   skull, muzzle, chest, abdomen). Negative = the hand is inside the body.
   Usage (repo root): node qa/gotr-0038/measure.cjs [out.json] [seconds]  env SPECIES=lion,rabbit (fighter) MODE=watch|play */
const fs=require('fs'),path=require('path');
const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),r3=x=>Math.round(x*1000)/1000;
const shapes=c=>[[c.joints.head,{centre:[0,.13,.03],radius:[.17,.20,.17]},'skull'],[c.joints.head,{centre:[0,.065,.195],radius:[.135,.105,.125]},'muzzle'],[c.joints.chest,{centre:[0,.13,0],radius:[.315,.25,.27]},'chest'],[c.joints.spine,{centre:[0,.10,.015],radius:[.24,.23,.19]},'abdomen']];
// Mitt: padded body ellipsoid (training-gear.js) sampled on its surface; glove: the coach's own glove spheres.
const mittSamples=[];for(let a=0;a<8;a++)for(const b of [-.6,0,.6]){const c=Math.cos(b);mittSamples.push(V(Math.cos(a*Math.PI/4)*.132*c,-.12+Math.sin(a*Math.PI/4)*.157*c,.02+Math.sin(b)*.065));}
mittSamples.push(V(0,-.12,.085),V(0,-.12,-.05));
const gloveSamples=[[0,.015,0,.077],[0,-.07,0,.089],[0,-.145,0,.099],[0,-.195,0,.068]];
function clearance(arena,coach,points){let best={d:Infinity};for(const {p,r} of points)for(const [bone,shape,name] of shapes(coach)){const c=arena.closest(p,bone,shape,r);const d=c.distance-r;if(d<best.d)best={d,name};}return best;}
function run(species,mode,seconds,dt=1/120){
 const e=engine(species);e.targetMode='pads';e.player.setEnabled(mode==='play');e.arena.setTarget('pads');const d=e.arena.careerDrill,a=e.arena,out={};let t=0;
 const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut','roll'];let k=0,pressAt=0;
 while(t<seconds){t+=dt;e.animTime=t;
  if(mode==='play'&&t>=pressAt){e.player.reset();e.player.press(moves[k++%moves.length]);pressAt=t+1.2;}
  a.update(t);
  const p=d.padPose,drill=p.hook?'roll-'+p.sweepSide:p.move;
  const mitts=d.mitts.map(m=>({side:m.name.slice(-1),pts:mittSamples.map(s=>({p:m.localToWorld(s.clone()),r:0}))}));
  const gloves=['L','R'].map(s=>({side:s,pts:gloveSamples.map(([x,y,z,r])=>({p:e.coach.joints['hand'+s].localToWorld(V(x,y,z)),r}))}));
  const o=out[drill]||(out[drill]={coachMitt:{d:Infinity},fighterGlove:{d:Infinity}});
  for(const m of mitts){const c=clearance(a,d.trainer,m.pts);if(c.d<o.coachMitt.d)o.coachMitt={d:c.d,part:c.name,side:m.side,t:r3(t)};}
  for(const g of gloves){const c=clearance(a,e.coach,g.pts);if(c.d<o.fighterGlove.d)o.fighterGlove={d:c.d,part:c.name,side:g.side,t:r3(t)};}
 }
 for(const o of Object.values(out))for(const k of ['coachMitt','fighterGlove'])o[k].d=r3(o[k].d*100);
 return {fighter:e.coach.species,coach:d.trainer.species,drills:out};
}
if(require.main===module){
 const file=process.argv[2],seconds=+(process.argv[3]||9.6),mode=process.env.MODE||'watch',report={mode,unit:'cm (negative = inside own head/torso)',runs:[]};
 for(const s of (process.env.SPECIES||'lion,rabbit').split(',')){const r=run(s,mode,seconds);report.runs.push(r);console.log('fighter',r.fighter,'coach',r.coach);for(const [k,o] of Object.entries(r.drills))console.log(' ',k.padEnd(14),'coach mitt',String(o.coachMitt.d).padStart(7),o.coachMitt.part,o.coachMitt.side,'| fighter glove',String(o.fighterGlove.d).padStart(7),o.fighterGlove.part,o.fighterGlove.side);}
 if(file)fs.writeFileSync(file,JSON.stringify(report,null,1));
}
module.exports={run};
