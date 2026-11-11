/* GOTR-0028: trace the receiver's root and both soles after hits (sparring or fight).
   Usage (repo root): node qa/gotr-0028/step-trace.cjs <spar|fight> [species] [seconds] [every_n_frames] */
const path=require('path');const M=require(path.join(__dirname,'..','gotr-0027','measure.cjs'));
const [mode='spar',species='lion',seconds='3',every='3']=process.argv.slice(2);
const r=M.run(mode,species,'steady',+seconds),f=r.frames,hits=r.hitTimes.partner;console.log('partner hits',hits.map(h=>h.toFixed(3)).join(' '));
for(let i=0;i<f.length;i++){const t=f[i].t;if(!hits.some(h=>t>=h-.05&&t<=h+1.0)||i%+every)continue;
 const feet=f[i].feet.partner.map(x=>x.side+' z '+x.p[2].toFixed(3)+' x '+x.p[0].toFixed(3)+' lift '+(x.lift*1000).toFixed(0)+'mm').join(' | ');console.log(t.toFixed(3),feet);}
