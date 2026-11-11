/* GOTR-0027: print one hand's world position per frame in a time window.
   Usage (repo root): node qa/gotr-0027/trace-hand.cjs <mode> <species> <kind> <from> <to> [L|R] */
const path=require('path');const M=require(path.join(__dirname,'measure.cjs'));
const [mode='pads',species='lion',kind='tick120',from='4.98',to='5.16',hand='L']=process.argv.slice(2);
const r=M.run(mode,species,kind,+to+.05),k=hand==='R'?1:0;let last=null;
for(const f of r.frames){if(f.t<+from||f.t>+to){last=f;continue;}const p=f.hands[k],d=last?Math.hypot(...p.map((x,i)=>x-last.hands[k][i])):0;console.log(f.t.toFixed(4),p.map(x=>x.toFixed(3)).join(' '),'step',(d*1000).toFixed(1)+'mm',f.move);last=f;}
