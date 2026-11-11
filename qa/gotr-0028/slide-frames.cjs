/* GOTR-0028: list every frame in which a planted foot (not lifted) moves on the floor.
   Usage (repo root): node qa/gotr-0028/slide-frames.cjs <mode fight|spar> <species> [seconds] [threshold_mm] */
const path=require('path');const M=require(path.join(__dirname,'..','gotr-0027','measure.cjs'));
const [mode='fight',species='lion',seconds='6',threshold='3']=process.argv.slice(2);
const r=M.run(mode,species,'steady',+seconds),f=r.frames;console.log('hits',JSON.stringify(r.hitTimes));
for(let i=1;i<f.length;i++)for(const who of Object.keys(f[i].feet))for(let k=0;k<2;k++){
 const a=f[i-1].feet[who][k],b=f[i].feet[who][k];if(a.lift>.002||b.lift>.002)continue;
 const d=Math.hypot(b.p[0]-a.p[0],b.p[2]-a.p[2]);
 if(d*1000>+threshold)console.log(f[i].t.toFixed(3),who,b.side,(d*1000).toFixed(1)+' mm','lift',a.lift.toFixed(4),b.lift.toFixed(4),f[i].move);
}
