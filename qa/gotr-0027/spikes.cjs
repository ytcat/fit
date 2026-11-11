/* GOTR-0027: per-frame CPU timeline at 60 Hz; prints frames above a threshold with the move in flight.
   Usage (repo root): node qa/gotr-0027/spikes.cjs <mode> [species] [seconds] [threshold_ms] */
const path=require('path');const M=require(path.join(__dirname,'measure.cjs'));
const [mode='heavy',species='lion',seconds='6',threshold='6']=process.argv.slice(2);
const r=M.run(mode,species,'steady',+seconds);let n=0;
for(const f of r.frames)if(f.cpu>+threshold){n++;console.log(f.t.toFixed(3),f.cpu.toFixed(1)+' ms',f.move,f.contacts?'contact':'');}
const c=r.frames.map(f=>f.cpu).sort((a,b)=>a-b);console.log('frames',c.length,'over',threshold,'ms:',n,'p50',c[c.length>>1].toFixed(2),'p90',c[Math.floor(c.length*.9)].toFixed(2),'max',c[c.length-1].toFixed(2));
