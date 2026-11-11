/* GOTR-0027: the largest frame-to-frame glove velocity changes for one mode and schedule.
   Usage (repo root): node qa/gotr-0027/jumps.cjs <mode> [species] [kind steady|phone|tick120|dense] [seconds] [n] */
const path=require('path');const M=require(path.join(__dirname,'measure.cjs'));
const [mode='pads',species='lion',kind='tick120',seconds='8',n='12']=process.argv.slice(2);
const a=M.analyse(M.run(mode,species,kind,+seconds),kind);
console.log(JSON.stringify({gloveSpeed:a.gloveSpeed,velocityJump:{p50:a.velocityJump.p50,p99:a.velocityJump.p99,max:a.velocityJump.max}}));
// analyse keeps only the top five; recompute a longer list here.
const r=M.run(mode,species,kind,+seconds),f=r.frames,list=[];
for(let i=2;i<f.length;i++)for(let k=0;k<2;k++){const v=j=>f[j].hands[k].map((x,c)=>(x-f[j-1].hands[k][c])/f[j].dt),a1=v(i-1),a2=v(i);const dv=Math.hypot(...a2.map((x,c)=>x-a1[c]));list.push({t:+f[i].t.toFixed(4),hand:k?'R':'L',dv:+dv.toFixed(2),speedBefore:+Math.hypot(...a1).toFixed(2),speedAfter:+Math.hypot(...a2).toFixed(2),move:f[i].move,contact:f[i].contacts});}
list.sort((x,y)=>y.dv-x.dv);for(const j of list.slice(0,+n))console.log(JSON.stringify(j));
