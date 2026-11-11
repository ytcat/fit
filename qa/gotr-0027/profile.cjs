/* GOTR-0027: CPU cost per displayed frame (steady 60 Hz) for one mode, with a V8 profile.
   Usage (repo root): node --cpu-prof --cpu-prof-dir=<dir> qa/gotr-0027/profile.cjs <mode> [species] [seconds] */
const path=require('path');const M=require(path.join(__dirname,'measure.cjs'));
const [mode='fight',species='lion',seconds='6']=process.argv.slice(2);
const r=M.run(mode,species,'steady',+seconds),c=r.cost,q=(xs,p)=>{const s=[...xs].sort((a,b)=>a-b);return s.length?s[Math.floor((s.length-1)*p)].toFixed(2):'-';};
console.log(mode,species,'idle p50/p95',q(c.idle,.5),q(c.idle,.95),'punch p50/p95',q(c.punch,.5),q(c.punch,.95),'frames',c.idle.length,c.punch.length);
