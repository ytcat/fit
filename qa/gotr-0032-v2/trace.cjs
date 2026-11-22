/* Per-tick trace of one punch: speed and per-tick velocity change of both knuckles and elbows, hip/shoulder yaw.
   Usage (repo root): node qa/gotr-0032-v2/trace.cjs pads cross [lion] */
const path=require('path'),M=require(path.join(__dirname,'measure.cjs'));
const [target='pads',move='cross',species='lion']=process.argv.slice(2),dt=1/120;
const s=M.single(target,species,move,true),F=s.frames,deg=x=>Math.round(x*180/Math.PI);
console.log(JSON.stringify({...s,frames:undefined}));
const sp=(i,k,h)=>i>0?F[i][k][h].distanceTo(F[i-1][k][h])/dt:0;
const dv=(i,k,h)=>{if(i<2)return 0;const v=j=>F[j][k][h].clone().sub(F[j-1][k][h]).multiplyScalar(1/dt);return v(i).distanceTo(v(i-1));};
console.log('ms   move      knL  dv   | knR  dv   | elL dv | elR dv | hipYaw shYaw  c');
for(let i=1;i<F.length;i++){const f=F[i];console.log(String(Math.round((f.t-F[0].t)*1000)).padStart(4),f.move.padEnd(9),
 ...[['kn',0],['kn',1],['el',0],['el',1]].map(([k,h])=>sp(i,k,h).toFixed(1).padStart(5)+dv(i,k,h).toFixed(1).padStart(5)+' |'),
 String(deg(f.hipYaw)).padStart(5),String(deg(f.shYaw)).padStart(5),f.contacts.length?'C':'');}
